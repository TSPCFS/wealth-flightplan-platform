"""Phase 8a — /admin/* endpoints.

The cross-user / self-targeting guards are the most important assertions —
this is destructive admin surface, so accidental wins (an admin demoting
themselves, a delete with a typo in the email) need test coverage.
"""

from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select

from app.db.database import get_session_factory
from app.db.models import AuditLog, ChatbotLead, User
from tests.conftest import VALID_PASSWORD, authed_session, bearer


@pytest_asyncio.fixture
async def admin_session(client: AsyncClient) -> tuple[str, str]:
    """Register a user and flip their is_admin flag directly in the DB —
    the bootstrap UPDATE in migration 0007 only runs for wouter@attooh.co.za,
    not the synthetic test users."""
    access, user_id = await authed_session(client, "admin@example.com")
    factory = get_session_factory()
    async with factory() as s:
        user = (await s.execute(select(User).where(User.email == "admin@example.com"))).scalar_one()
        user.is_admin = True
        await s.commit()
    return access, user_id


async def _make_user(client: AsyncClient, email: str) -> tuple[str, str]:
    return await authed_session(client, email)


# ---------- Guard rails — non-admin / unauthenticated ------------------------


_NON_DESTRUCTIVE_GET_PATHS = (
    "/admin/users",
    "/admin/stats",
    "/admin/audit",
    "/admin/leads",
)


@pytest.mark.asyncio
async def test_non_admin_gets_403_on_every_get_path(client: AsyncClient) -> None:
    """Regular users get FORBIDDEN_NOT_ADMIN on every admin GET."""
    access, _ = await _make_user(client, "regular@example.com")
    for path in _NON_DESTRUCTIVE_GET_PATHS:
        r = await client.get(path, headers=bearer(access))
        assert r.status_code == 403, path
        assert r.json()["error"]["code"] == "FORBIDDEN_NOT_ADMIN", path


@pytest.mark.asyncio
async def test_unauthenticated_gets_401(client: AsyncClient) -> None:
    for path in _NON_DESTRUCTIVE_GET_PATHS:
        r = await client.get(path)
        assert r.status_code == 401, path


@pytest.mark.asyncio
async def test_non_admin_gets_403_on_state_changing_endpoints(
    client: AsyncClient, admin_session
) -> None:
    """Non-admins are blocked on suspend / promote / delete just like GETs."""
    _, admin_id = admin_session
    regular_access, _ = await _make_user(client, "blocked@example.com")
    # Target the admin's own ID so we don't accidentally hit a 404 first.
    paths = [
        ("POST", f"/admin/users/{admin_id}/suspend"),
        ("POST", f"/admin/users/{admin_id}/unsuspend"),
        ("POST", f"/admin/users/{admin_id}/promote"),
        ("POST", f"/admin/users/{admin_id}/demote"),
        ("POST", f"/admin/users/{admin_id}/reset-password"),
        ("DELETE", f"/admin/users/{admin_id}"),
    ]
    for method, path in paths:
        r = await client.request(
            method, path, headers=bearer(regular_access), json={"confirm_email": "x@x.x"}
        )
        assert r.status_code == 403, (method, path)
        assert r.json()["error"]["code"] == "FORBIDDEN_NOT_ADMIN", path


# ---------- /admin/users list + detail --------------------------------------


@pytest.mark.asyncio
async def test_admin_user_list_returns_all_users_with_filters(
    client: AsyncClient, admin_session
) -> None:
    admin_access, _ = admin_session
    await _make_user(client, "u1@example.com")
    await _make_user(client, "u2@example.com")
    r = await client.get("/admin/users", headers=bearer(admin_access))
    assert r.status_code == 200
    body = r.json()
    assert body["total"] >= 3  # admin + 2 + maybe wouter (if seeded)
    emails = [u["email"] for u in body["users"]]
    assert "u1@example.com" in emails
    assert "u2@example.com" in emails

    # Search by email substring.
    r2 = await client.get("/admin/users?q=u1", headers=bearer(admin_access))
    body2 = r2.json()
    assert body2["total"] == 1
    assert body2["users"][0]["email"] == "u1@example.com"

    # is_admin filter.
    r3 = await client.get("/admin/users?is_admin=true", headers=bearer(admin_access))
    body3 = r3.json()
    assert all(u["is_admin"] for u in body3["users"])
    assert body3["total"] >= 1


@pytest.mark.asyncio
async def test_admin_user_detail_includes_counts(client: AsyncClient, admin_session) -> None:
    admin_access, _ = admin_session
    _, target_id = await _make_user(client, "detail@example.com")
    r = await client.get(f"/admin/users/{target_id}", headers=bearer(admin_access))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["email"] == "detail@example.com"
    assert body["is_admin"] is False
    assert "counts" in body
    counts = body["counts"]
    assert all(
        k in counts
        for k in (
            "assessments",
            "worksheet_submissions",
            "worksheet_drafts",
            "example_interactions",
            "chatbot_conversations",
            "chatbot_leads",
            "framework_steps_completed",
        )
    )


@pytest.mark.asyncio
async def test_admin_user_detail_404_for_unknown_id(client: AsyncClient, admin_session) -> None:
    admin_access, _ = admin_session
    r = await client.get(
        "/admin/users/00000000-0000-0000-0000-000000000000",
        headers=bearer(admin_access),
    )
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "USER_NOT_FOUND"


# ---------- Suspend / unsuspend ---------------------------------------------


@pytest.mark.asyncio
async def test_admin_suspend_then_unsuspend(client: AsyncClient, admin_session) -> None:
    admin_access, _ = admin_session
    target_access, target_id = await _make_user(client, "suspendme@example.com")

    # Suspend
    r = await client.post(f"/admin/users/{target_id}/suspend", headers=bearer(admin_access))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["user"]["suspended_at"] is not None
    assert body["user"]["account_status"] == "suspended"
    assert "suspended" in body["message"].lower()

    # Existing access token should now be rejected.
    me = await client.get("/users/profile", headers=bearer(target_access))
    assert me.status_code == 403
    assert me.json()["error"]["code"] == "FORBIDDEN_USER_SUSPENDED"

    # Login attempt → 403 with the new code.
    login = await client.post(
        "/auth/login",
        json={"email": "suspendme@example.com", "password": VALID_PASSWORD},
    )
    assert login.status_code == 403
    assert login.json()["error"]["code"] == "FORBIDDEN_USER_SUSPENDED"

    # Unsuspend
    r2 = await client.post(f"/admin/users/{target_id}/unsuspend", headers=bearer(admin_access))
    assert r2.status_code == 200
    assert r2.json()["user"]["suspended_at"] is None
    assert r2.json()["user"]["account_status"] == "active"

    # Login works again — new tokens issued, old one is gone (token_version bumped).
    login2 = await client.post(
        "/auth/login",
        json={"email": "suspendme@example.com", "password": VALID_PASSWORD},
    )
    assert login2.status_code == 200


# ---------- Promote / demote ------------------------------------------------


@pytest.mark.asyncio
async def test_admin_promote_then_demote_other_user(client: AsyncClient, admin_session) -> None:
    admin_access, _ = admin_session
    _, target_id = await _make_user(client, "promoteme@example.com")

    promote = await client.post(f"/admin/users/{target_id}/promote", headers=bearer(admin_access))
    assert promote.status_code == 200
    assert promote.json()["user"]["is_admin"] is True

    demote = await client.post(f"/admin/users/{target_id}/demote", headers=bearer(admin_access))
    assert demote.status_code == 200
    assert demote.json()["user"]["is_admin"] is False


@pytest.mark.asyncio
async def test_admin_cannot_demote_self(client: AsyncClient, admin_session) -> None:
    admin_access, admin_id = admin_session
    r = await client.post(f"/admin/users/{admin_id}/demote", headers=bearer(admin_access))
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "SELF_DEMOTION"


# ---------- Reset password --------------------------------------------------


@pytest.mark.asyncio
async def test_admin_reset_password_writes_audit_and_returns_user(
    client: AsyncClient, admin_session
) -> None:
    admin_access, admin_id = admin_session
    _, target_id = await _make_user(client, "needs-reset@example.com")
    r = await client.post(
        f"/admin/users/{target_id}/reset-password",
        headers=bearer(admin_access),
    )
    assert r.status_code == 200
    assert r.json()["user"]["email"] == "needs-reset@example.com"

    factory = get_session_factory()
    async with factory() as s:
        rows = (
            (
                await s.execute(
                    select(AuditLog).where(AuditLog.action == "admin.user.reset_password")
                )
            )
            .scalars()
            .all()
        )
    assert len(rows) == 1
    assert str(rows[0].user_id) == admin_id  # acting user logged
    assert str(rows[0].entity_id) == target_id  # subject logged


# ---------- Hard delete -----------------------------------------------------


@pytest.mark.asyncio
async def test_admin_delete_requires_confirm_email_match(
    client: AsyncClient, admin_session
) -> None:
    admin_access, _ = admin_session
    _, target_id = await _make_user(client, "deleteme@example.com")
    r = await client.request(
        "DELETE",
        f"/admin/users/{target_id}",
        headers=bearer(admin_access),
        json={"confirm_email": "wrong@example.com"},
    )
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "CONFIRM_EMAIL_MISMATCH"


@pytest.mark.asyncio
async def test_admin_cannot_delete_self(client: AsyncClient, admin_session) -> None:
    admin_access, admin_id = admin_session
    r = await client.request(
        "DELETE",
        f"/admin/users/{admin_id}",
        headers=bearer(admin_access),
        json={"confirm_email": "admin@example.com"},
    )
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "SELF_DELETION"


@pytest.mark.asyncio
async def test_admin_delete_happy_path(client: AsyncClient, admin_session) -> None:
    admin_access, _ = admin_session
    _, target_id = await _make_user(client, "byebye@example.com")
    r = await client.request(
        "DELETE",
        f"/admin/users/{target_id}",
        headers=bearer(admin_access),
        json={"confirm_email": "byebye@example.com"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["deleted_user_id"] == target_id

    # Verify the user is gone.
    factory = get_session_factory()
    async with factory() as s:
        exists = (
            await s.execute(select(User).where(User.user_id == target_id))
        ).scalar_one_or_none()
    assert exists is None


# ---------- Stats ------------------------------------------------------------


@pytest.mark.asyncio
async def test_admin_stats_shape(client: AsyncClient, admin_session) -> None:
    admin_access, _ = admin_session
    await _make_user(client, "stat1@example.com")
    r = await client.get("/admin/stats", headers=bearer(admin_access))
    assert r.status_code == 200
    body = r.json()
    for key in (
        "total_users",
        "verified_users",
        "suspended_users",
        "admins",
        "new_signups_7d",
        "new_signups_30d",
    ):
        assert key in body
        assert isinstance(body[key], int)
    assert body["total_users"] >= 2  # admin + stat1
    assert body["admins"] >= 1


# ---------- Audit endpoint --------------------------------------------------


@pytest.mark.asyncio
async def test_admin_audit_endpoint_lists_recent_state_changes(
    client: AsyncClient, admin_session
) -> None:
    admin_access, _ = admin_session
    _, target_id = await _make_user(client, "audit-target@example.com")
    # Generate a couple of admin actions to populate the log.
    await client.post(f"/admin/users/{target_id}/promote", headers=bearer(admin_access))
    await client.post(f"/admin/users/{target_id}/demote", headers=bearer(admin_access))

    r = await client.get("/admin/audit?action=admin.user.promote", headers=bearer(admin_access))
    assert r.status_code == 200
    body = r.json()
    assert body["total"] >= 1
    assert all(e["action"] == "admin.user.promote" for e in body["entries"])


# ---------- Leads ------------------------------------------------------------


@pytest.mark.asyncio
async def test_admin_leads_list_empty_when_no_leads(client: AsyncClient, admin_session) -> None:
    admin_access, _ = admin_session
    r = await client.get("/admin/leads", headers=bearer(admin_access))
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 0
    assert body["leads"] == []


@pytest.mark.asyncio
async def test_admin_leads_status_patch_stamps_contacted_at(
    client: AsyncClient, admin_session
) -> None:
    """Insert a lead directly so we don't depend on the chatbot HTTP surface."""
    admin_access, _ = admin_session
    _, target_id = await _make_user(client, "lead-user@example.com")

    factory = get_session_factory()
    async with factory() as s:
        lead = ChatbotLead(
            user_id=target_id,
            trigger_event="user_request",
            topic="cover review",
            message="Please call me about life cover.",
            advisor_email="wouter@attooh.co.za",
            status="new",
        )
        s.add(lead)
        await s.commit()
        lead_id = str(lead.lead_id)

    r = await client.patch(
        f"/admin/leads/{lead_id}",
        headers=bearer(admin_access),
        json={"status": "contacted"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "contacted"
    assert body["contacted_at"] is not None

    # Audit row exists.
    async with factory() as s:
        audit_row = (
            await s.execute(select(AuditLog).where(AuditLog.action == "admin.lead.status"))
        ).scalar_one()
    assert audit_row.new_values == {"status": "contacted"}
    assert audit_row.old_values == {"status": "new"}


@pytest.mark.asyncio
async def test_admin_leads_unknown_lead_returns_404(client: AsyncClient, admin_session) -> None:
    admin_access, _ = admin_session
    r = await client.patch(
        "/admin/leads/00000000-0000-0000-0000-000000000000",
        headers=bearer(admin_access),
        json={"status": "contacted"},
    )
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "LEAD_NOT_FOUND"


# ---------- /users/profile exposes is_admin ---------------------------------


@pytest.mark.asyncio
async def test_profile_exposes_is_admin(client: AsyncClient, admin_session) -> None:
    admin_access, _ = admin_session
    r = await client.get("/users/profile", headers=bearer(admin_access))
    assert r.status_code == 200
    assert r.json()["is_admin"] is True

    regular_access, _ = await _make_user(client, "regular-flag@example.com")
    r2 = await client.get("/users/profile", headers=bearer(regular_access))
    assert r2.status_code == 200
    assert r2.json()["is_admin"] is False
