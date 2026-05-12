"""Integration tests for Phase 5 endpoints + the recommendations cascade
exercised against a real DB."""

from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import AsyncClient

from tests.conftest import (
    authed_session,
    bearer,
    seed_phase3_content,
    seed_phase4_worksheets,
)


def _five_q(letter: str) -> dict:
    return {"q1": letter, "q2": letter, "q3": letter, "q4": letter, "q5": letter}


def _gap(values: list[str]) -> dict:
    return {f"q{i + 1}": values[i] for i in range(12)}


def _budget_response() -> dict:
    """Reproduces the WE-7 scenario (45/32/3.5/9.5)."""
    return {
        "income": {"salary_1": 45_000},
        "needs": {
            "bond": 11_000,
            "utilities": 2_800,
            "groceries": 6_500,
            "transport": 3_900,
            "medical": 3_500,
            "insurance": 1_600,
            "school": 0,
            "family": 0,
            "debt_minimums": 2_700,
        },
        "wants": {
            "dining": 1_500,
            "entertainment": 1_000,
            "travel": 0,
            "personal": 500,
            "gifts": 500,
            "other_wants": 0,
        },
        "invest": {
            "emergency_fund": 1_500,
            "ra": 4_000,
            "tfsa": 3_000,
            "discretionary": 1_000,
            "bucket_3": 0,
            "extra_debt": 0,
        },
    }


@pytest_asyncio.fixture(autouse=True)
async def _seed(db_engine):
    await seed_phase3_content()
    await seed_phase4_worksheets()


# ---------- /users/profile (extension) ---------------------------------------


@pytest.mark.asyncio
async def test_profile_includes_is_business_owner_default_false(
    client: AsyncClient,
) -> None:
    access, _ = await authed_session(client, "profile-bo@example.com")
    r = await client.get("/users/profile", headers=bearer(access))
    body = r.json()
    assert body["is_business_owner"] is False
    assert body["primary_language"] == "en"
    assert body["timezone"] == "SAST"


@pytest.mark.asyncio
async def test_patch_profile_partial_update(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "patch@example.com")
    r = await client.patch(
        "/users/profile",
        json={"is_business_owner": True, "household_size": 5},
        headers=bearer(access),
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["is_business_owner"] is True
    assert body["household_size"] == 5
    # First name untouched
    assert body["first_name"] == "Alice"


@pytest.mark.asyncio
async def test_patch_profile_validation_error_on_zero_income(
    client: AsyncClient,
) -> None:
    access, _ = await authed_session(client, "patch-bad@example.com")
    r = await client.patch(
        "/users/profile",
        json={"household_income_monthly_after_tax": 0},
        headers=bearer(access),
    )
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_patch_profile_rejects_unknown_field(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "patch-extra@example.com")
    r = await client.patch(
        "/users/profile",
        json={"email": "nope@example.com"},
        headers=bearer(access),
    )
    assert r.status_code == 400  # extra="forbid" → VALIDATION_ERROR
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"


# ---------- /users/progress --------------------------------------------------


@pytest.mark.asyncio
async def test_progress_first_call_lazy_creates_row(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "prog@example.com")
    r = await client.get("/users/progress", headers=bearer(access))
    assert r.status_code == 200
    body = r.json()
    assert body["overall_completion_pct"] == 0
    assert body["steps_total"] == 6  # 4b filtered out for non-business-owner
    assert body["current_focus_step"] is None
    step_numbers = [s["step_number"] for s in body["steps"]]
    assert step_numbers == ["1", "2", "3", "4a", "5", "6"]


@pytest.mark.asyncio
async def test_progress_includes_4b_for_business_owner(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "prog-bo@example.com")
    await client.patch("/users/profile", json={"is_business_owner": True}, headers=bearer(access))
    r = await client.get("/users/progress", headers=bearer(access))
    body = r.json()
    assert body["steps_total"] == 7
    assert "4b" in [s["step_number"] for s in body["steps"]]


@pytest.mark.asyncio
async def test_progress_complete_step_updates_percentage(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "prog-complete@example.com")
    r = await client.post("/users/progress/steps/1/complete", headers=bearer(access))
    assert r.status_code == 200
    body = r.json()
    assert body["steps_completed"] == 1
    # 1/6 = 16.67 → 17 (round-half-up)
    assert body["overall_completion_pct"] == 17
    completed_step = next(s for s in body["steps"] if s["step_number"] == "1")
    assert completed_step["is_completed"] is True
    assert completed_step["completed_at"] is not None
    # current_focus_step jumps to the next incomplete step
    assert body["current_focus_step"] == "2"


@pytest.mark.asyncio
async def test_progress_incomplete_undoes_a_step(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "prog-undo@example.com")
    await client.post("/users/progress/steps/1/complete", headers=bearer(access))
    r = await client.post("/users/progress/steps/1/incomplete", headers=bearer(access))
    body = r.json()
    assert body["steps_completed"] == 0
    completed_step = next(s for s in body["steps"] if s["step_number"] == "1")
    assert completed_step["is_completed"] is False
    assert completed_step["completed_at"] is None


@pytest.mark.asyncio
async def test_progress_invalid_step_number_returns_400(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "prog-bad@example.com")
    r = await client.post("/users/progress/steps/99/complete", headers=bearer(access))
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"


# ---------- /users/recommendations -------------------------------------------


@pytest.mark.asyncio
async def test_recommendations_first_step_when_no_assessment(
    client: AsyncClient,
) -> None:
    access, _ = await authed_session(client, "rec-first@example.com")
    r = await client.get("/users/recommendations", headers=bearer(access))
    assert r.status_code == 200
    body = r.json()
    assert body["current_stage"] is None
    assert len(body["immediate_actions"]) == 1
    assert body["immediate_actions"][0]["source"] == "first_step"
    # Reading path still has 6 entries (steps 1, 2, 3, 4a, 5, 6).
    assert len(body["reading_path"]) == 6


@pytest.mark.asyncio
async def test_recommendations_shifts_after_submitting_5q(
    client: AsyncClient,
) -> None:
    access, _ = await authed_session(client, "rec-shift@example.com")
    # Submit 5Q at Momentum (all b → 10).
    await client.post(
        "/assessments/5q",
        json={"responses": _five_q("b")},
        headers=bearer(access),
    )
    r = await client.get("/users/recommendations", headers=bearer(access))
    body = r.json()
    assert body["current_stage"] == "Momentum"
    sources = {a["source"] for a in body["immediate_actions"]}
    # No more first_step; missing_worksheet (APP-D, APP-C) should appear.
    assert "first_step" not in sources
    assert "missing_worksheet" in sources


# ---------- /users/activity --------------------------------------------------


@pytest.mark.asyncio
async def test_activity_aggregates_across_sources(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "act@example.com")
    await client.post(
        "/assessments/5q",
        json={"responses": _five_q("a")},
        headers=bearer(access),
    )
    await client.post(
        "/worksheets/APP-A/submit",
        json={"response_data": _budget_response()},
        headers=bearer(access),
    )
    await client.post("/users/progress/steps/1/complete", headers=bearer(access))

    r = await client.get("/users/activity", headers=bearer(access))
    body = r.json()
    types = [e["event_type"] for e in body["events"]]
    assert "assessment_submitted" in types
    assert "worksheet_submitted" in types
    assert "step_completed" in types
    # Newest first — step_completed (latest action) appears before the 5Q.
    timestamps = [e["timestamp"] for e in body["events"]]
    assert timestamps == sorted(timestamps, reverse=True)
    assert all(t.endswith("Z") for t in timestamps)


@pytest.mark.asyncio
async def test_activity_derives_stage_changed(client: AsyncClient) -> None:
    """Submitting 5Q at two different stages produces a stage_changed event."""
    access, _ = await authed_session(client, "act-stage@example.com")
    await client.post(
        "/assessments/5q", json={"responses": _five_q("a")}, headers=bearer(access)
    )  # Foundation
    await client.post(
        "/assessments/5q", json={"responses": _five_q("c")}, headers=bearer(access)
    )  # Freedom
    r = await client.get("/users/activity", headers=bearer(access))
    body = r.json()
    stage_changes = [e for e in body["events"] if e["event_type"] == "stage_changed"]
    assert len(stage_changes) == 1
    assert "Foundation" in stage_changes[0]["title"]
    assert "Freedom" in stage_changes[0]["title"]


@pytest.mark.asyncio
async def test_activity_cursor_pagination_round_trip(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "act-cursor@example.com")
    # Generate enough events to paginate (3 assessments + 1 worksheet → at least 4 events).
    for letter in ["a", "b", "c"]:
        await client.post(
            "/assessments/5q",
            json={"responses": _five_q(letter)},
            headers=bearer(access),
        )
    r1 = await client.get("/users/activity?limit=2", headers=bearer(access))
    body1 = r1.json()
    assert len(body1["events"]) == 2
    assert body1["has_more"] is True
    assert body1["next_cursor"] is not None

    r2 = await client.get(
        f"/users/activity?limit=10&cursor={body1['next_cursor']}",
        headers=bearer(access),
    )
    body2 = r2.json()
    first_ts1 = {e["timestamp"] for e in body1["events"]}
    first_ts2 = {e["timestamp"] for e in body2["events"]}
    assert first_ts1.isdisjoint(first_ts2)


# ---------- /users/milestones ------------------------------------------------


@pytest.mark.asyncio
async def test_milestones_upcoming_includes_monthly_money_conversation(
    client: AsyncClient,
) -> None:
    access, _ = await authed_session(client, "ms@example.com")
    r = await client.get("/users/milestones", headers=bearer(access))
    body = r.json()
    codes = [m["code"] for m in body["upcoming"]]
    assert "monthly_money_conversation" in codes
    # No APP-C ever → annual_cover_review due today+30 (upcoming category=review).
    assert "annual_cover_review" in codes
    cover = next(m for m in body["upcoming"] if m["code"] == "annual_cover_review")
    assert cover["urgency"] in ("upcoming", "soon", "overdue")


@pytest.mark.asyncio
async def test_milestones_achieved_records_first_assessment(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "ms-first@example.com")
    await client.post(
        "/assessments/5q",
        json={"responses": _five_q("a")},
        headers=bearer(access),
    )
    r = await client.get("/users/milestones", headers=bearer(access))
    body = r.json()
    codes = [m["code"] for m in body["achieved"]]
    assert "first_assessment" in codes


# ---------- /users/dashboard -------------------------------------------------


@pytest.mark.asyncio
async def test_dashboard_no_assessment_yet(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "dash-empty@example.com")
    r = await client.get("/users/dashboard", headers=bearer(access))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["current_stage"] is None
    assert body["current_stage_details"] is None
    # Quick stats all null
    qs = body["quick_stats"]
    assert qs == {
        "net_worth": None,
        "monthly_surplus": None,
        "total_consumer_debt": None,
        "income_generating_pct": None,
    }
    # First action = first_step
    assert body["recommended_actions"][0]["source"] == "first_step"
    # Progress is empty but shape correct
    assert body["overall_progress"]["framework_completion_pct"] == 0
    assert body["overall_progress"]["steps_total"] == 6


@pytest.mark.asyncio
async def test_dashboard_evolves_through_phases(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "dash-evolve@example.com")

    # Phase 1: submit 5Q → Momentum (all b = 10 → Momentum band).
    await client.post(
        "/assessments/5q",
        json={"responses": _five_q("b")},
        headers=bearer(access),
    )
    body = (await client.get("/users/dashboard", headers=bearer(access))).json()
    assert body["current_stage"] == "Momentum"
    assert body["current_stage_details"]["progress_to_next_stage_pct"] is not None
    # Top action shifts away from first_step.
    sources = {a["source"] for a in body["recommended_actions"]}
    assert "first_step" not in sources

    # Phase 2: submit APP-A → quick_stats.monthly_surplus is populated.
    await client.post(
        "/worksheets/APP-A/submit",
        json={"response_data": _budget_response()},
        headers=bearer(access),
    )
    body = (await client.get("/users/dashboard", headers=bearer(access))).json()
    assert body["quick_stats"]["monthly_surplus"] == 0.0
    # APP-A submission means APP-A is no longer the recommended missing baseline;
    # Momentum's baseline is APP-D first → it should now appear.
    next_baselines = [a for a in body["recommended_actions"] if a["source"] == "missing_worksheet"]
    urls = [a["action_url"] for a in next_baselines]
    assert "/worksheets/APP-D" in urls


@pytest.mark.asyncio
async def test_dashboard_quick_stats_populated_for_all_three_worksheets(
    client: AsyncClient,
) -> None:
    """APP-A → monthly_surplus, APP-B → net_worth + income_generating_pct,
    APP-D → total_consumer_debt (sum of consumer-bucket balances)."""
    access, _ = await authed_session(client, "dash-stats@example.com")

    # APP-A: WE-7 scenario yields surplus 0.
    await client.post(
        "/worksheets/APP-A/submit",
        json={"response_data": _budget_response()},
        headers=bearer(access),
    )
    # APP-B: simple net worth = 2.6M, 46.15% income-generating.
    await client.post(
        "/worksheets/APP-B/submit",
        json={
            "response_data": {
                "lifestyle_assets": [{"name": "Home", "value": 4_500_000}],
                "income_generating_assets": [{"name": "RA", "value": 1_200_000}],
                "liabilities": [{"name": "Bond", "value": 3_100_000}],
            }
        },
        headers=bearer(access),
    )
    # APP-D: two debts — one consumer (cc, R30k) and one bond (R2M, excluded).
    await client.post(
        "/worksheets/APP-D/submit",
        json={
            "response_data": {
                "debts": [
                    {
                        "creditor": "CC",
                        "balance": 30_000,
                        "minimum_payment": 1_500,
                        "annual_rate_pct": 24,
                        "account_type": "credit_card",
                    },
                    {
                        "creditor": "Bond",
                        "balance": 2_000_000,
                        "minimum_payment": 18_500,
                        "annual_rate_pct": 10.25,
                        "account_type": "bond",
                    },
                ]
            }
        },
        headers=bearer(access),
    )

    body = (await client.get("/users/dashboard", headers=bearer(access))).json()
    qs = body["quick_stats"]
    assert qs["monthly_surplus"] == 0
    assert qs["net_worth"] == 2_600_000
    assert qs["income_generating_pct"] is not None
    assert 45 <= qs["income_generating_pct"] <= 47
    # Bond is filtered out; consumer debt = R30,000.
    assert qs["total_consumer_debt"] == 30_000


@pytest.mark.asyncio
async def test_progress_to_next_stage_pct_band_math() -> None:
    """5Q score 11 in Momentum band [9, 12] → (11-9)/(12-9)·100 = 67%."""
    from app.services.dashboard import progress_to_next_stage_pct

    assert progress_to_next_stage_pct(assessment_type="5q", score=11, stage="Momentum") == 67
    # 10Q score 27 in Freedom band [24, 30] → 50%
    assert progress_to_next_stage_pct(assessment_type="10q", score=27, stage="Freedom") == 50
    # Abundance → null
    assert progress_to_next_stage_pct(assessment_type="10q", score=40, stage="Abundance") is None


# ---------- Auth -------------------------------------------------------------


@pytest.mark.asyncio
async def test_dashboard_endpoints_require_auth(client: AsyncClient) -> None:
    for path in (
        "/users/dashboard",
        "/users/recommendations",
        "/users/progress",
        "/users/activity",
        "/users/milestones",
    ):
        r = await client.get(path)
        assert r.status_code == 401, path
