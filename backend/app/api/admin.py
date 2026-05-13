"""Admin endpoints — Phase 8a.

Every endpoint:

- Gated by ``require_admin`` (which itself depends on ``get_current_user``
  so the suspension + token-version checks still apply).
- Writes to ``audit_logs`` for every state-changing action, even the soft
  ones (suspend / unsuspend / promote / demote) — the audit trail is the
  single source of truth for "who did what".
- Refuses self-targeting on demote / delete to prevent an admin from
  locking themselves out.

The router lives under ``/admin`` and gets mounted in ``app.main``.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Body, Depends, Query, status
from sqlalchemy import (
    and_,
    delete,
    desc,
    func,
    or_,
    select,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_request_context, require_admin
from app.core.config import get_settings
from app.core.datetimes import utcnow
from app.core.errors import APIError
from app.core.security import TokenType, encode_token
from app.db.database import get_db
from app.db.models import (
    Assessment,
    AuditLog,
    ChatbotConversation,
    ChatbotLead,
    ExampleInteraction,
    User,
    UserProgress,
    WorksheetResponse,
)
from app.schemas.admin import (
    AdminAckResponse,
    AdminAuditLogItem,
    AdminAuditLogResponse,
    AdminDeleteAck,
    AdminDeleteUserPayload,
    AdminLeadItem,
    AdminLeadResponse,
    AdminLeadStatusUpdate,
    AdminStats,
    AdminUserCounts,
    AdminUserDetail,
    AdminUserListItem,
    AdminUserListResponse,
)
from app.services import audit
from app.services import email as email_service
from app.services.auth import RequestContext

router = APIRouter(prefix="/admin", tags=["admin"])

# Sentinel: a "locked until ~forever" timestamp so suspended users stay locked
# until an admin explicitly unsuspends. 100 years from boot is well beyond any
# realistic JWT lifetime.
_LOCKED_FOREVER_DELTA = timedelta(days=365 * 100)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _get_target_user(session: AsyncSession, user_id: UUID) -> User:
    res = await session.execute(select(User).where(User.user_id == user_id))
    target = res.scalar_one_or_none()
    if target is None:
        raise APIError(
            status_code=status.HTTP_404_NOT_FOUND,
            code="USER_NOT_FOUND",
            message="No user exists with that id.",
        )
    return target


async def _user_counts(session: AsyncSession, user_id: UUID) -> AdminUserCounts:
    async def _count(model, *, draft: bool | None = None) -> int:
        stmt = select(func.count()).select_from(model).where(model.user_id == user_id)
        if draft is not None and model is WorksheetResponse:
            stmt = stmt.where(WorksheetResponse.is_draft.is_(draft))
        return int((await session.execute(stmt)).scalar_one())

    progress_row = await session.execute(
        select(UserProgress).where(UserProgress.user_id == user_id)
    )
    progress = progress_row.scalar_one_or_none()
    steps_completed = 0
    if progress is not None:
        for step in ("1", "2", "3", "4a", "4b", "5", "6"):
            if getattr(progress, f"step_{step}_completed"):
                steps_completed += 1

    return AdminUserCounts(
        assessments=await _count(Assessment),
        worksheet_submissions=await _count(WorksheetResponse, draft=False),
        worksheet_drafts=await _count(WorksheetResponse, draft=True),
        example_interactions=await _count(ExampleInteraction),
        chatbot_conversations=await _count(ChatbotConversation),
        chatbot_leads=await _count(ChatbotLead),
        framework_steps_completed=steps_completed,
    )


async def _user_detail(session: AsyncSession, target: User) -> AdminUserDetail:
    # latest assessment for current_stage / latest_assessment_id
    res = await session.execute(
        select(
            Assessment.assessment_id,
            Assessment.assessment_type,
            Assessment.calculated_stage,
        )
        .where(Assessment.user_id == target.user_id)
        .order_by(desc(Assessment.created_at))
    )
    rows = res.all()
    latest_assessment_id = rows[0].assessment_id if rows else None
    current_stage = next(
        (r.calculated_stage for r in rows if r.assessment_type in ("5q", "10q")),
        None,
    )
    counts = await _user_counts(session, target.user_id)
    return AdminUserDetail(
        user_id=target.user_id,
        email=target.email,
        first_name=target.first_name,
        last_name=target.last_name,
        is_admin=target.is_admin,
        is_business_owner=target.is_business_owner,
        email_verified=target.email_verified,
        email_verified_at=target.email_verified_at,
        account_status=target.account_status,
        suspended_at=target.suspended_at,
        locked_until=target.locked_until,
        subscription_tier=target.subscription_tier,
        household_income_monthly_after_tax=target.household_income_monthly_after_tax,
        household_size=target.household_size,
        number_of_dependants=target.number_of_dependants,
        primary_language=target.primary_language,
        timezone=target.timezone,
        current_stage=current_stage,
        latest_assessment_id=latest_assessment_id,
        created_at=target.created_at,
        updated_at=target.updated_at,
        last_login=target.last_login,
        counts=counts,
    )


def _list_item(target: User) -> AdminUserListItem:
    return AdminUserListItem(
        user_id=target.user_id,
        email=target.email,
        first_name=target.first_name,
        last_name=target.last_name,
        is_admin=target.is_admin,
        is_business_owner=target.is_business_owner,
        email_verified=target.email_verified,
        account_status=target.account_status,
        suspended_at=target.suspended_at,
        locked_until=target.locked_until,
        subscription_tier=target.subscription_tier,
        created_at=target.created_at,
        last_login=target.last_login,
    )


def _ensure_not_self(actor: User, target: User, *, code: str, message: str) -> None:
    if actor.user_id == target.user_id:
        raise APIError(
            status_code=status.HTTP_400_BAD_REQUEST,
            code=code,
            message=message,
        )


# ---------------------------------------------------------------------------
# /admin/users — list + detail
# ---------------------------------------------------------------------------


@router.get("/users", response_model=AdminUserListResponse)
async def list_users(
    admin: Annotated[User, Depends(require_admin)],
    session: AsyncSession = Depends(get_db),
    q: str | None = Query(default=None, description="Substring on email / name"),
    is_admin: bool | None = Query(default=None),
    verified: bool | None = Query(default=None),
    suspended: bool | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
) -> AdminUserListResponse:
    stmt = select(User)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(User.email).like(like),
                func.lower(User.first_name).like(like),
                func.lower(User.last_name).like(like),
            )
        )
    if is_admin is not None:
        stmt = stmt.where(User.is_admin.is_(is_admin))
    if verified is not None:
        stmt = stmt.where(User.email_verified.is_(verified))
    if suspended is not None:
        if suspended:
            stmt = stmt.where(User.suspended_at.is_not(None))
        else:
            stmt = stmt.where(User.suspended_at.is_(None))

    total_stmt = select(func.count()).select_from(stmt.subquery())
    total = int((await session.execute(total_stmt)).scalar_one())

    offset = (page - 1) * page_size
    res = await session.execute(
        stmt.order_by(desc(User.created_at)).offset(offset).limit(page_size)
    )
    rows = list(res.scalars())
    return AdminUserListResponse(
        users=[_list_item(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
        has_more=offset + len(rows) < total,
    )


@router.get("/users/{user_id}", response_model=AdminUserDetail)
async def get_user(
    user_id: UUID,
    admin: Annotated[User, Depends(require_admin)],
    session: AsyncSession = Depends(get_db),
) -> AdminUserDetail:
    target = await _get_target_user(session, user_id)
    return await _user_detail(session, target)


# ---------------------------------------------------------------------------
# Suspend / unsuspend
# ---------------------------------------------------------------------------


async def _audit_admin_action(
    session: AsyncSession,
    *,
    admin: User,
    action: str,
    target: User,
    ctx: RequestContext,
    new_values: dict | None = None,
    old_values: dict | None = None,
) -> None:
    await audit.record(
        session,
        action=action,
        user_id=admin.user_id,
        entity_type="user",
        entity_id=target.user_id,
        status="success",
        ip_address=ctx.ip_address,
        user_agent=ctx.user_agent,
        new_values=new_values,
        old_values=old_values,
    )


@router.post("/users/{user_id}/suspend", response_model=AdminAckResponse)
async def suspend_user(
    user_id: UUID,
    admin: Annotated[User, Depends(require_admin)],
    session: AsyncSession = Depends(get_db),
    ctx: RequestContext = Depends(get_request_context),
) -> AdminAckResponse:
    target = await _get_target_user(session, user_id)
    now = utcnow()
    target.suspended_at = now
    target.locked_until = now + _LOCKED_FOREVER_DELTA
    target.account_status = "suspended"
    # Bump token_version so any in-flight access tokens stop working.
    target.token_version = int(target.token_version) + 1
    await _audit_admin_action(
        session,
        admin=admin,
        action="admin.user.suspend",
        target=target,
        ctx=ctx,
        new_values={
            "suspended_at": now.isoformat(),
            "locked_until": target.locked_until.isoformat(),
        },
    )
    await session.commit()
    await session.refresh(target)
    return AdminAckResponse(
        user=await _user_detail(session, target),
        message="User suspended. They cannot log in until unsuspended.",
    )


@router.post("/users/{user_id}/unsuspend", response_model=AdminAckResponse)
async def unsuspend_user(
    user_id: UUID,
    admin: Annotated[User, Depends(require_admin)],
    session: AsyncSession = Depends(get_db),
    ctx: RequestContext = Depends(get_request_context),
) -> AdminAckResponse:
    target = await _get_target_user(session, user_id)
    old = {
        "suspended_at": target.suspended_at.isoformat() if target.suspended_at else None,
        "locked_until": target.locked_until.isoformat() if target.locked_until else None,
    }
    target.suspended_at = None
    target.locked_until = None
    target.account_status = "active"
    await _audit_admin_action(
        session,
        admin=admin,
        action="admin.user.unsuspend",
        target=target,
        ctx=ctx,
        old_values=old,
    )
    await session.commit()
    await session.refresh(target)
    return AdminAckResponse(
        user=await _user_detail(session, target),
        message="User unsuspended and can log in again.",
    )


# ---------------------------------------------------------------------------
# Reset password (admin-initiated — issues a fresh reset token + emails it)
# ---------------------------------------------------------------------------


@router.post("/users/{user_id}/reset-password", response_model=AdminAckResponse)
async def admin_reset_password(
    user_id: UUID,
    admin: Annotated[User, Depends(require_admin)],
    session: AsyncSession = Depends(get_db),
    ctx: RequestContext = Depends(get_request_context),
) -> AdminAckResponse:
    target = await _get_target_user(session, user_id)
    settings = get_settings()
    reset_token, _ = encode_token(
        subject=str(target.user_id),
        token_type=TokenType.RESET,
        expires_in=settings.jwt_reset_token_expire_seconds,
        extra_claims={"tv": target.token_version},
        settings=settings,
    )
    await _audit_admin_action(
        session,
        admin=admin,
        action="admin.user.reset_password",
        target=target,
        ctx=ctx,
        new_values={"reset_email_sent": True},
    )
    await session.commit()
    # Send email AFTER commit so a delivery failure can't roll back the audit row.
    await email_service.send_password_reset_email(
        to_email=target.email,
        first_name=target.first_name,
        token=reset_token,
        settings=settings,
    )
    return AdminAckResponse(
        user=await _user_detail(session, target),
        message="Password-reset email sent to the user.",
    )


# ---------------------------------------------------------------------------
# Promote / demote
# ---------------------------------------------------------------------------


@router.post("/users/{user_id}/promote", response_model=AdminAckResponse)
async def promote_user(
    user_id: UUID,
    admin: Annotated[User, Depends(require_admin)],
    session: AsyncSession = Depends(get_db),
    ctx: RequestContext = Depends(get_request_context),
) -> AdminAckResponse:
    target = await _get_target_user(session, user_id)
    if target.is_admin:
        return AdminAckResponse(
            user=await _user_detail(session, target),
            message="User already had admin role; no change made.",
        )
    target.is_admin = True
    await _audit_admin_action(
        session,
        admin=admin,
        action="admin.user.promote",
        target=target,
        ctx=ctx,
        new_values={"is_admin": True},
    )
    await session.commit()
    await session.refresh(target)
    return AdminAckResponse(
        user=await _user_detail(session, target),
        message="User promoted to admin.",
    )


@router.post("/users/{user_id}/demote", response_model=AdminAckResponse)
async def demote_user(
    user_id: UUID,
    admin: Annotated[User, Depends(require_admin)],
    session: AsyncSession = Depends(get_db),
    ctx: RequestContext = Depends(get_request_context),
) -> AdminAckResponse:
    target = await _get_target_user(session, user_id)
    _ensure_not_self(
        admin,
        target,
        code="SELF_DEMOTION",
        message="You can't demote yourself. Ask another admin to do it.",
    )
    if not target.is_admin:
        return AdminAckResponse(
            user=await _user_detail(session, target),
            message="User was not an admin; no change made.",
        )
    target.is_admin = False
    await _audit_admin_action(
        session,
        admin=admin,
        action="admin.user.demote",
        target=target,
        ctx=ctx,
        new_values={"is_admin": False},
    )
    await session.commit()
    await session.refresh(target)
    return AdminAckResponse(
        user=await _user_detail(session, target),
        message="User demoted to regular role.",
    )


# ---------------------------------------------------------------------------
# Hard delete
# ---------------------------------------------------------------------------


@router.delete("/users/{user_id}", response_model=AdminDeleteAck)
async def delete_user(
    user_id: UUID,
    admin: Annotated[User, Depends(require_admin)],
    payload: AdminDeleteUserPayload = Body(...),
    session: AsyncSession = Depends(get_db),
    ctx: RequestContext = Depends(get_request_context),
) -> AdminDeleteAck:
    target = await _get_target_user(session, user_id)
    _ensure_not_self(
        admin,
        target,
        code="SELF_DELETION",
        message="You can't delete your own account.",
    )
    if payload.confirm_email.strip().lower() != target.email.lower():
        raise APIError(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="CONFIRM_EMAIL_MISMATCH",
            message="confirm_email must exactly match the target user's email.",
        )

    deleted_email = target.email
    # Audit BEFORE delete — the FK on audit_logs.user_id is ON DELETE SET NULL
    # so the row survives, but we'd lose the entity_id pointer otherwise.
    await _audit_admin_action(
        session,
        admin=admin,
        action="admin.user.delete",
        target=target,
        ctx=ctx,
        old_values={"email": deleted_email},
    )
    await session.execute(delete(User).where(User.user_id == user_id))
    await session.commit()

    return AdminDeleteAck(
        deleted_user_id=user_id,
        message=f"User {deleted_email} permanently deleted.",
    )


# ---------------------------------------------------------------------------
# /admin/stats
# ---------------------------------------------------------------------------


@router.get("/stats", response_model=AdminStats)
async def admin_stats(
    admin: Annotated[User, Depends(require_admin)],
    session: AsyncSession = Depends(get_db),
) -> AdminStats:
    now = datetime.now(UTC)
    seven_days_ago = now - timedelta(days=7)
    thirty_days_ago = now - timedelta(days=30)

    async def _scalar(stmt) -> int:  # type: ignore[no-untyped-def]
        return int((await session.execute(stmt)).scalar_one())

    total = await _scalar(select(func.count()).select_from(User))
    verified = await _scalar(
        select(func.count()).select_from(User).where(User.email_verified.is_(True))
    )
    suspended = await _scalar(
        select(func.count()).select_from(User).where(User.suspended_at.is_not(None))
    )
    admins = await _scalar(select(func.count()).select_from(User).where(User.is_admin.is_(True)))
    new_7d = await _scalar(
        select(func.count()).select_from(User).where(User.created_at >= seven_days_ago)
    )
    new_30d = await _scalar(
        select(func.count()).select_from(User).where(User.created_at >= thirty_days_ago)
    )

    return AdminStats(
        total_users=total,
        verified_users=verified,
        suspended_users=suspended,
        admins=admins,
        new_signups_7d=new_7d,
        new_signups_30d=new_30d,
    )


# ---------------------------------------------------------------------------
# /admin/audit
# ---------------------------------------------------------------------------


def _audit_view(row: AuditLog) -> AdminAuditLogItem:
    return AdminAuditLogItem(
        log_id=row.log_id,
        user_id=row.user_id,
        action=row.action,
        entity_type=row.entity_type,
        entity_id=row.entity_id,
        status=row.status,
        ip_address=row.ip_address,
        user_agent=row.user_agent,
        new_values=row.new_values,
        old_values=row.old_values,
        error_message=row.error_message,
        created_at=row.created_at,
    )


@router.get("/audit", response_model=AdminAuditLogResponse)
async def list_audit(
    admin: Annotated[User, Depends(require_admin)],
    session: AsyncSession = Depends(get_db),
    acting_user_id: UUID | None = Query(default=None),
    action: str | None = Query(default=None),
    since: datetime | None = Query(default=None),
    until: datetime | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
) -> AdminAuditLogResponse:
    stmt = select(AuditLog)
    if acting_user_id is not None:
        stmt = stmt.where(AuditLog.user_id == acting_user_id)
    if action is not None:
        stmt = stmt.where(AuditLog.action == action)
    if since is not None:
        stmt = stmt.where(AuditLog.created_at >= since)
    if until is not None:
        stmt = stmt.where(AuditLog.created_at <= until)

    total = int(
        (await session.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    )

    offset = (page - 1) * page_size
    res = await session.execute(
        stmt.order_by(desc(AuditLog.created_at)).offset(offset).limit(page_size)
    )
    rows = list(res.scalars())

    return AdminAuditLogResponse(
        entries=[_audit_view(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
        has_more=offset + len(rows) < total,
    )


# ---------------------------------------------------------------------------
# /admin/leads
# ---------------------------------------------------------------------------


async def _lead_view(session: AsyncSession, row: ChatbotLead) -> AdminLeadItem:
    # Fetch the lead's user inline so the dashboard table can show a name +
    # email column without a second round-trip per row. List endpoint joins
    # below; this helper is only used for the PATCH response.
    res = await session.execute(select(User).where(User.user_id == row.user_id))
    user = res.scalar_one()
    return AdminLeadItem(
        lead_id=row.lead_id,
        user_id=row.user_id,
        user_email=user.email,
        user_name=f"{user.first_name} {user.last_name}".strip(),
        conversation_id=row.conversation_id,
        trigger_event=row.trigger_event,
        topic=row.topic,
        message=row.message,
        advisor_email=row.advisor_email,
        status=row.status,
        created_at=row.created_at,
        contacted_at=row.contacted_at,
    )


@router.get("/leads", response_model=AdminLeadResponse)
async def list_leads(
    admin: Annotated[User, Depends(require_admin)],
    session: AsyncSession = Depends(get_db),
    lead_status: Literal["new", "contacted", "qualified", "closed"] | None = Query(
        default=None, alias="status"
    ),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
) -> AdminLeadResponse:
    # Defensive: if the chatbot tables haven't been migrated yet, return empty.
    try:
        stmt = select(ChatbotLead, User).join(User, User.user_id == ChatbotLead.user_id)
        if lead_status is not None:
            stmt = stmt.where(ChatbotLead.status == lead_status)

        total = int(
            (
                await session.execute(
                    select(func.count())
                    .select_from(ChatbotLead)
                    .where(
                        and_(
                            ChatbotLead.status == lead_status
                            if lead_status is not None
                            else ChatbotLead.lead_id.is_not(None)
                        )
                    )
                )
            ).scalar_one()
        )

        offset = (page - 1) * page_size
        rows = (
            await session.execute(
                stmt.order_by(desc(ChatbotLead.created_at)).offset(offset).limit(page_size)
            )
        ).all()
    except Exception:
        return AdminLeadResponse(leads=[], total=0, page=page, page_size=page_size, has_more=False)

    leads: list[AdminLeadItem] = []
    for lead, user in rows:
        leads.append(
            AdminLeadItem(
                lead_id=lead.lead_id,
                user_id=lead.user_id,
                user_email=user.email,
                user_name=f"{user.first_name} {user.last_name}".strip(),
                conversation_id=lead.conversation_id,
                trigger_event=lead.trigger_event,
                topic=lead.topic,
                message=lead.message,
                advisor_email=lead.advisor_email,
                status=lead.status,
                created_at=lead.created_at,
                contacted_at=lead.contacted_at,
            )
        )
    return AdminLeadResponse(
        leads=leads,
        total=total,
        page=page,
        page_size=page_size,
        has_more=offset + len(leads) < total,
    )


@router.patch("/leads/{lead_id}", response_model=AdminLeadItem)
async def update_lead_status(
    lead_id: UUID,
    payload: AdminLeadStatusUpdate,
    admin: Annotated[User, Depends(require_admin)],
    session: AsyncSession = Depends(get_db),
    ctx: RequestContext = Depends(get_request_context),
) -> AdminLeadItem:
    res = await session.execute(select(ChatbotLead).where(ChatbotLead.lead_id == lead_id))
    lead = res.scalar_one_or_none()
    if lead is None:
        raise APIError(
            status_code=status.HTTP_404_NOT_FOUND,
            code="LEAD_NOT_FOUND",
            message="No lead exists with that id.",
        )

    old_status = lead.status
    lead.status = payload.status
    # First move off "new" stamps the contacted_at clock; subsequent moves leave
    # the existing timestamp in place so it always reads "first contact".
    if old_status == "new" and payload.status != "new" and lead.contacted_at is None:
        lead.contacted_at = utcnow()

    await audit.record(
        session,
        action="admin.lead.status",
        user_id=admin.user_id,
        entity_type="lead",
        entity_id=lead_id,
        status="success",
        ip_address=ctx.ip_address,
        user_agent=ctx.user_agent,
        new_values={"status": payload.status},
        old_values={"status": old_status},
    )
    await session.commit()
    await session.refresh(lead)
    return await _lead_view(session, lead)
