"""Phase 6b — POST /users/me/reset-progress.

Destructive endpoint. The cross-user isolation test is the most important
one: anything that bleeds across user_ids in production lights real users'
data on fire.
"""

from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import func, select

from app.db.database import get_session_factory
from app.db.models import (
    Assessment,
    AuditLog,
    ExampleInteraction,
    User,
    UserProgress,
    WorksheetResponse,
)
from tests.conftest import (
    authed_session,
    bearer,
    seed_phase3_content,
    seed_phase4_worksheets,
)


def _five_q(letter: str) -> dict:
    return {"q1": letter, "q2": letter, "q3": letter, "q4": letter, "q5": letter}


def _budget_response() -> dict:
    return {
        "income": {"salary_1": 45_000},
        "needs": {"bond": 11_000},
        "wants": {"dining": 1_000},
        "invest": {"tfsa": 3_000},
    }


@pytest_asyncio.fixture(autouse=True)
async def _seed(db_engine):
    await seed_phase3_content()
    await seed_phase4_worksheets()


async def _seed_user_state(client: AsyncClient, access: str) -> None:
    """Load up the standard payload: 2 assessments, 1 worksheet submission,
    1 example calculator run, 1 user_progress row."""
    # 2 assessments (5Q + GAP).
    await client.post("/assessments/5q", json={"responses": _five_q("c")}, headers=bearer(access))
    await client.post(
        "/assessments/gap-test",
        json={"responses": {f"q{i}": "yes" for i in range(1, 13)}},
        headers=bearer(access),
    )
    # 1 worksheet submission.
    await client.post(
        "/worksheets/APP-A/submit",
        json={"response_data": _budget_response()},
        headers=bearer(access),
    )
    # 1 example_interactions row via the calculate endpoint.
    await client.post(
        "/content/examples/WE-3/calculate",
        json={"monthly_contribution": 5000, "years": 25, "annual_rate_pct": 10},
        headers=bearer(access),
    )
    # 1 user_progress row via complete-step.
    await client.post("/users/progress/steps/1/complete", headers=bearer(access))


# ---------- Happy path -------------------------------------------------------


@pytest.mark.asyncio
async def test_reset_progress_happy_path(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "reset-happy@example.com")
    await _seed_user_state(client, access)

    r = await client.post(
        "/users/me/reset-progress",
        json={"confirm": "RESET"},
        headers=bearer(access),
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["deleted"]["assessments"] == 2
    assert body["deleted"]["worksheet_responses"] == 1
    assert body["deleted"]["example_interactions"] == 1
    assert body["deleted"]["user_progress_rows"] == 1
    assert body["preserved"] == ["user_account", "audit_logs"]
    assert "reset" in body["message"].lower()

    # Subsequent GETs report an empty state.
    assert (await client.get("/assessments/history", headers=bearer(access))).json()[
        "assessments"
    ] == []
    # Progress endpoint re-creates the row on demand.
    progress = await client.get("/users/progress", headers=bearer(access))
    assert progress.status_code == 200
    assert progress.json()["overall_completion_pct"] == 0
    assert all(s["is_completed"] is False for s in progress.json()["steps"])


# ---------- Confirm guardrail ------------------------------------------------


@pytest.mark.asyncio
async def test_reset_progress_missing_confirm_returns_400(
    client: AsyncClient,
) -> None:
    access, _ = await authed_session(client, "reset-missing@example.com")
    r = await client.post("/users/me/reset-progress", json={}, headers=bearer(access))
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "MISSING_CONFIRM"


@pytest.mark.asyncio
async def test_reset_progress_wrong_confirm_value_returns_400(
    client: AsyncClient,
) -> None:
    access, _ = await authed_session(client, "reset-wrong@example.com")
    for bad in ("reset", "RESET-now", "yes", "true", ""):
        r = await client.post(
            "/users/me/reset-progress",
            json={"confirm": bad},
            headers=bearer(access),
        )
        assert r.status_code == 400, bad
        assert r.json()["error"]["code"] == "MISSING_CONFIRM"


@pytest.mark.asyncio
async def test_reset_progress_requires_auth(client: AsyncClient) -> None:
    r = await client.post("/users/me/reset-progress", json={"confirm": "RESET"})
    assert r.status_code == 401


# ---------- Audit trail ------------------------------------------------------


@pytest.mark.asyncio
async def test_reset_progress_writes_audit_row(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "reset-audit@example.com")
    await _seed_user_state(client, access)
    r = await client.post(
        "/users/me/reset-progress",
        json={"confirm": "RESET"},
        headers=bearer(access),
    )
    assert r.status_code == 200

    factory = get_session_factory()
    async with factory() as s:
        res = await s.execute(select(AuditLog).where(AuditLog.action == "reset_progress"))
        rows = list(res.scalars())
    assert len(rows) == 1
    row = rows[0]
    assert row.status == "success"
    assert row.entity_type == "user"
    assert row.user_id == row.entity_id  # subject == actor
    # Counts captured in new_values
    assert row.new_values is not None
    assert row.new_values["deleted"]["assessments"] == 2


# ---------- Cross-user isolation --------------------------------------------


@pytest.mark.asyncio
async def test_reset_progress_does_not_touch_other_users_data(
    client: AsyncClient,
) -> None:
    access_a, _ = await authed_session(client, "reset-A@example.com")
    access_b, _ = await authed_session(client, "reset-B@example.com")

    # Seed BOTH users.
    await _seed_user_state(client, access_a)
    await _seed_user_state(client, access_b)

    # Reset A only.
    r = await client.post(
        "/users/me/reset-progress",
        json={"confirm": "RESET"},
        headers=bearer(access_a),
    )
    assert r.status_code == 200

    # B's data must be untouched.
    factory = get_session_factory()
    async with factory() as s:
        b_user_id = (
            (await s.execute(select(User).where(User.email == "reset-b@example.com")))
            .scalar_one()
            .user_id
        )

        assessments_b = (
            await s.execute(
                select(func.count()).select_from(Assessment).where(Assessment.user_id == b_user_id)
            )
        ).scalar_one()
        worksheets_b = (
            await s.execute(
                select(func.count())
                .select_from(WorksheetResponse)
                .where(WorksheetResponse.user_id == b_user_id)
            )
        ).scalar_one()
        examples_b = (
            await s.execute(
                select(func.count())
                .select_from(ExampleInteraction)
                .where(ExampleInteraction.user_id == b_user_id)
            )
        ).scalar_one()
        progress_b = (
            await s.execute(
                select(func.count())
                .select_from(UserProgress)
                .where(UserProgress.user_id == b_user_id)
            )
        ).scalar_one()

    assert assessments_b == 2
    assert worksheets_b == 1
    assert examples_b == 1
    assert progress_b == 1

    # And confirm B's history endpoint still returns the data.
    hist = await client.get("/assessments/history", headers=bearer(access_b))
    assert len(hist.json()["assessments"]) == 2


# ---------- Idempotence -----------------------------------------------------


@pytest.mark.asyncio
async def test_reset_progress_safe_to_call_twice(client: AsyncClient) -> None:
    """Second reset returns all-zero counts and succeeds."""
    access, _ = await authed_session(client, "reset-twice@example.com")
    await _seed_user_state(client, access)

    first = await client.post(
        "/users/me/reset-progress",
        json={"confirm": "RESET"},
        headers=bearer(access),
    )
    assert first.json()["deleted"]["assessments"] == 2

    second = await client.post(
        "/users/me/reset-progress",
        json={"confirm": "RESET"},
        headers=bearer(access),
    )
    assert second.status_code == 200
    counts = second.json()["deleted"]
    assert counts == {
        "assessments": 0,
        "worksheet_responses": 0,
        "example_interactions": 0,
        "user_progress_rows": 0,
    }
