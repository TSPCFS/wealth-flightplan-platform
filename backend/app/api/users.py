"""User profile endpoints (GET + PATCH + reset-progress).

Phase 5 additions:
- ``is_business_owner`` exposed in profile responses
- ``PATCH /users/profile`` for partial updates

Phase 6b additions:
- ``POST /users/me/reset-progress`` — wipes the user's testing data
  (assessments, worksheet_responses, example_interactions, user_progress)
  while preserving the account itself + the audit trail.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy import delete, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_request_context
from app.core.errors import APIError
from app.db.database import get_db
from app.db.models import (
    Assessment,
    ExampleInteraction,
    User,
    UserProgress,
    WorksheetResponse,
)
from app.schemas.auth import (
    ProfileUpdateRequest,
    ResetProgressRequest,
    ResetProgressResponse,
    UserProfile,
)
from app.services import audit
from app.services.auth import RequestContext

router = APIRouter(prefix="/users", tags=["users"])


async def _profile_view(session: AsyncSession, user: User) -> UserProfile:
    """Shared serializer — one extra round-trip to pick up latest assessment fields."""
    res = await session.execute(
        select(
            Assessment.assessment_id,
            Assessment.assessment_type,
            Assessment.calculated_stage,
            Assessment.created_at,
        )
        .where(Assessment.user_id == user.user_id)
        .order_by(desc(Assessment.created_at))
    )
    rows = res.all()
    latest_assessment_id = rows[0].assessment_id if rows else None
    current_stage = next(
        (r.calculated_stage for r in rows if r.assessment_type in ("5q", "10q")),
        None,
    )
    return UserProfile(
        user_id=user.user_id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        email_verified=user.email_verified,
        household_income_monthly_after_tax=user.household_income_monthly_after_tax,
        household_size=user.household_size,
        number_of_dependants=user.number_of_dependants,
        is_business_owner=user.is_business_owner,
        primary_language=user.primary_language,
        timezone=user.timezone,
        subscription_tier=user.subscription_tier,
        current_stage=current_stage,
        latest_assessment_id=latest_assessment_id,
        created_at=user.created_at,
    )


@router.get(
    "/profile",
    response_model=UserProfile,
    status_code=status.HTTP_200_OK,
)
async def get_profile(
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_db),
) -> UserProfile:
    return await _profile_view(session, current_user)


@router.patch(
    "/profile",
    response_model=UserProfile,
    status_code=status.HTTP_200_OK,
)
async def update_profile(
    payload: ProfileUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_db),
) -> UserProfile:
    update = payload.model_dump(exclude_unset=True)
    for attr, value in update.items():
        setattr(current_user, attr, value)
    await session.commit()
    await session.refresh(current_user)
    return await _profile_view(session, current_user)


@router.post(
    "/me/reset-progress",
    response_model=ResetProgressResponse,
    status_code=status.HTTP_200_OK,
)
async def reset_progress(
    payload: ResetProgressRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_db),
    ctx: RequestContext = Depends(get_request_context),
) -> ResetProgressResponse:
    """Wipe the calling user's testing data.

    Guardrails:
    - Requires ``confirm == "RESET"`` — any other value is treated as missing.
    - Per-user only: queries / deletes filter on ``user_id == current_user.user_id``.
    - Single transaction: counts are captured, then the four DELETEs run, then
      the audit row is inserted, then commit. If anything raises mid-way the
      session rolls back automatically via the ``get_db`` dependency.
    """
    if payload.confirm != "RESET":
        raise APIError(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="MISSING_CONFIRM",
            message='Request body must include {"confirm": "RESET"} to proceed.',
        )

    user_id = current_user.user_id

    # 1) Capture counts BEFORE deletion.
    async def _count(model) -> int:  # type: ignore[no-untyped-def]
        res = await session.execute(
            select(func.count()).select_from(model).where(model.user_id == user_id)
        )
        return int(res.scalar_one())

    counts = {
        "assessments": await _count(Assessment),
        "worksheet_responses": await _count(WorksheetResponse),
        "example_interactions": await _count(ExampleInteraction),
        "user_progress_rows": await _count(UserProgress),
    }

    # 2) Delete user-owned rows in the four tables. ``audit_logs`` and the
    #    ``users`` row itself are intentionally untouched.
    await session.execute(delete(Assessment).where(Assessment.user_id == user_id))
    await session.execute(delete(WorksheetResponse).where(WorksheetResponse.user_id == user_id))
    await session.execute(delete(ExampleInteraction).where(ExampleInteraction.user_id == user_id))
    await session.execute(delete(UserProgress).where(UserProgress.user_id == user_id))

    # 3) Compliance trail. ``audit.record`` flushes via the same session so the
    #    DELETEs and the INSERT either both land or both roll back.
    await audit.record(
        session,
        action="reset_progress",
        user_id=user_id,
        entity_type="user",
        entity_id=user_id,
        status="success",
        ip_address=ctx.ip_address,
        user_agent=ctx.user_agent,
        new_values={"deleted": counts},
    )
    await session.commit()

    return ResetProgressResponse(
        deleted=counts,
        preserved=["user_account", "audit_logs"],
        message="Progress reset. Reload to see the empty-state dashboard.",
    )
