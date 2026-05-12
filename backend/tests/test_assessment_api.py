"""Integration tests for /assessments/* endpoints + /users/profile fields."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.conftest import authed_session, bearer


def _five_q(letter: str) -> dict:
    return {"q1": letter, "q2": letter, "q3": letter, "q4": letter, "q5": letter}


def _ten_q(letter: str) -> dict:
    return {f"q{i}": letter for i in range(1, 11)}


def _gap(values: list[str]) -> dict:
    assert len(values) == 12
    return {f"q{i + 1}": values[i] for i in range(12)}


# ---------- Submit 5Q ----------


@pytest.mark.asyncio
async def test_submit_5q_happy_path(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "five-q@example.com")
    r = await client.post(
        "/assessments/5q",
        json={"responses": _five_q("c"), "completion_time_seconds": 95},
        headers=bearer(access),
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["assessment_type"] == "5q"
    assert body["total_score"] == 15
    assert body["calculated_stage"] == "Freedom"
    assert body["previous_stage"] is None
    assert body["stage_details"]["name"] == "Freedom"
    assert "income_runway" in body["stage_details"]
    assert 3 <= len(body["recommendations"]) <= 5
    assert body["created_at"].endswith("Z"), body["created_at"]


@pytest.mark.asyncio
async def test_submit_5q_records_previous_stage_on_second_submission(
    client: AsyncClient,
) -> None:
    access, _ = await authed_session(client, "five-q-prev@example.com")
    # First: all a's → Foundation
    r1 = await client.post(
        "/assessments/5q", json={"responses": _five_q("a")}, headers=bearer(access)
    )
    assert r1.json()["calculated_stage"] == "Foundation"
    # Second: all c's → Freedom; previous_stage must reflect Foundation
    r2 = await client.post(
        "/assessments/5q", json={"responses": _five_q("c")}, headers=bearer(access)
    )
    body = r2.json()
    assert body["calculated_stage"] == "Freedom"
    assert body["previous_stage"] == "Foundation"


@pytest.mark.asyncio
async def test_submit_5q_invalid_letter_returns_400(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "five-q-bad@example.com")
    r = await client.post(
        "/assessments/5q",
        json={"responses": {"q1": "z", "q2": "a", "q3": "a", "q4": "a", "q5": "a"}},
        headers=bearer(access),
    )
    assert r.status_code == 400
    body = r.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_submit_5q_missing_key_returns_400(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "five-q-miss@example.com")
    r = await client.post(
        "/assessments/5q",
        json={"responses": {"q1": "a", "q2": "a", "q3": "a", "q4": "a"}},  # q5 missing
        headers=bearer(access),
    )
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_submit_5q_requires_auth(client: AsyncClient) -> None:
    r = await client.post("/assessments/5q", json={"responses": _five_q("a")})
    assert r.status_code == 401


# ---------- Submit 10Q ----------


@pytest.mark.asyncio
async def test_submit_10q_happy_path(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "ten-q@example.com")
    r = await client.post(
        "/assessments/10q",
        json={"responses": _ten_q("c"), "completion_time_seconds": 240},
        headers=bearer(access),
    )
    assert r.status_code == 201
    body = r.json()
    assert body["assessment_type"] == "10q"
    assert body["total_score"] == 30
    assert body["calculated_stage"] == "Freedom"
    assert body["created_at"].endswith("Z")


# ---------- Submit GAP ----------


@pytest.mark.asyncio
async def test_submit_gap_happy_path_sorts_and_classifies(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "gap-1@example.com")
    responses = _gap(
        [
            "yes",
            "partially",
            "no",
            "no",
            "yes",
            "yes",
            "partially",
            "no",
            "no",
            "yes",
            "yes",
            "partially",
        ]
    )
    r = await client.post(
        "/assessments/gap-test",
        json={"responses": responses, "completion_time_seconds": 300},
        headers=bearer(access),
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["assessment_type"] == "gap_test"
    assert body["total_score"] == 13
    assert body["band"] == "meaningful_gaps"
    assert body["gap_plan_eligible"] is True
    assert body["advisor_recommendation"] == "Book a GAP Plan(TM) conversation"
    codes = [g["question_code"] for g in body["gaps_identified"]]
    # no's first (q3, q4, q8, q9), then partially's (q2, q7, q12)
    assert codes == ["q3", "q4", "q8", "q9", "q2", "q7", "q12"]


@pytest.mark.asyncio
async def test_submit_gap_all_yes_not_eligible(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "gap-solid@example.com")
    r = await client.post(
        "/assessments/gap-test",
        json={"responses": _gap(["yes"] * 12)},
        headers=bearer(access),
    )
    body = r.json()
    assert body["total_score"] == 24
    assert body["band"] == "solid_plan"
    assert body["gap_plan_eligible"] is False
    assert body["advisor_recommendation"] is None
    assert body["gaps_identified"] == []


@pytest.mark.asyncio
async def test_submit_gap_invalid_value_returns_400(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "gap-bad@example.com")
    bad = _gap(["yes"] * 11 + ["maybe"])
    r = await client.post("/assessments/gap-test", json={"responses": bad}, headers=bearer(access))
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"


# ---------- History ----------


@pytest.mark.asyncio
async def test_history_returns_newest_first_with_progression(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "hist@example.com")
    await client.post("/assessments/5q", json={"responses": _five_q("a")}, headers=bearer(access))
    await client.post("/assessments/10q", json={"responses": _ten_q("c")}, headers=bearer(access))
    await client.post(
        "/assessments/gap-test",
        json={"responses": _gap(["yes"] * 12)},
        headers=bearer(access),
    )

    r = await client.get("/assessments/history", headers=bearer(access))
    assert r.status_code == 200
    body = r.json()
    # Newest first: gap_test, 10q, 5q
    types = [a["assessment_type"] for a in body["assessments"]]
    assert types == ["gap_test", "10q", "5q"]
    # current_stage is from most-recent 5Q/10Q (the 10Q result)
    assert body["current_stage"] == "Freedom"
    # stage_progression oldest first: Foundation then Freedom
    stages = [p["stage"] for p in body["stage_progression"]]
    assert stages == ["Foundation", "Freedom"]
    # gap_test history entry: band populated, calculated_stage null
    gap_entry = body["assessments"][0]
    assert gap_entry["band"] == "solid_plan"
    assert gap_entry["calculated_stage"] is None
    # All dates Z-suffixed
    assert all(p["date"].endswith("Z") for p in body["stage_progression"])
    assert all(a["created_at"].endswith("Z") for a in body["assessments"])


@pytest.mark.asyncio
async def test_history_empty_when_no_submissions(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "hist-empty@example.com")
    r = await client.get("/assessments/history", headers=bearer(access))
    assert r.status_code == 200
    body = r.json()
    assert body["assessments"] == []
    assert body["current_stage"] is None
    assert body["stage_progression"] == []


# ---------- GET /assessments/{id} ----------


@pytest.mark.asyncio
async def test_get_one_returns_full_record_for_stage_test(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "getone-stage@example.com")
    submit = await client.post(
        "/assessments/5q",
        json={"responses": _five_q("c"), "completion_time_seconds": 42},
        headers=bearer(access),
    )
    aid = submit.json()["assessment_id"]
    r = await client.get(f"/assessments/{aid}", headers=bearer(access))
    assert r.status_code == 200
    body = r.json()
    assert body["assessment_id"] == aid
    assert body["assessment_type"] == "5q"
    assert body["responses"]["q1"] == "c"
    assert body["calculated_stage"] == "Freedom"
    assert body["completion_time_seconds"] == 42
    assert body["created_at"].endswith("Z")


@pytest.mark.asyncio
async def test_get_one_returns_full_record_for_gap_test(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "getone-gap@example.com")
    submit = await client.post(
        "/assessments/gap-test",
        json={"responses": _gap(["yes"] * 12)},
        headers=bearer(access),
    )
    aid = submit.json()["assessment_id"]
    r = await client.get(f"/assessments/{aid}", headers=bearer(access))
    assert r.status_code == 200
    body = r.json()
    assert body["assessment_type"] == "gap_test"
    assert body["band"] == "solid_plan"
    assert body["gaps_identified"] == []
    assert body["gap_plan_eligible"] is False


@pytest.mark.asyncio
async def test_get_one_owner_only_returns_404_for_other_user(client: AsyncClient) -> None:
    access_a, _ = await authed_session(client, "owner@example.com")
    submit = await client.post(
        "/assessments/5q", json={"responses": _five_q("a")}, headers=bearer(access_a)
    )
    aid = submit.json()["assessment_id"]

    # Different user
    access_b, _ = await authed_session(client, "intruder@example.com")
    r = await client.get(f"/assessments/{aid}", headers=bearer(access_b))
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_get_one_unknown_id_returns_404(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "noassess@example.com")
    r = await client.get(
        "/assessments/00000000-0000-0000-0000-000000000000",
        headers=bearer(access),
    )
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_get_one_requires_auth(client: AsyncClient) -> None:
    r = await client.get("/assessments/00000000-0000-0000-0000-000000000000")
    assert r.status_code == 401


# ---------- /users/profile current_stage + latest_assessment_id ----------


@pytest.mark.asyncio
async def test_profile_current_stage_null_when_no_submissions(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "profile-empty@example.com")
    r = await client.get("/users/profile", headers=bearer(access))
    assert r.status_code == 200
    body = r.json()
    assert body["current_stage"] is None
    assert body["latest_assessment_id"] is None


@pytest.mark.asyncio
async def test_profile_current_stage_tracks_latest_5q_10q(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "profile-stage@example.com")
    # 5Q → Foundation (all a)
    r1 = await client.post(
        "/assessments/5q", json={"responses": _five_q("a")}, headers=bearer(access)
    )
    aid1 = r1.json()["assessment_id"]
    p1 = await client.get("/users/profile", headers=bearer(access))
    assert p1.json()["current_stage"] == "Foundation"
    assert p1.json()["latest_assessment_id"] == aid1

    # GAP test does NOT change current_stage but DOES change latest_assessment_id
    r2 = await client.post(
        "/assessments/gap-test",
        json={"responses": _gap(["yes"] * 12)},
        headers=bearer(access),
    )
    aid2 = r2.json()["assessment_id"]
    p2 = await client.get("/users/profile", headers=bearer(access))
    assert p2.json()["current_stage"] == "Foundation"  # gap doesn't update
    assert p2.json()["latest_assessment_id"] == aid2

    # 10Q → Freedom
    r3 = await client.post(
        "/assessments/10q", json={"responses": _ten_q("c")}, headers=bearer(access)
    )
    aid3 = r3.json()["assessment_id"]
    p3 = await client.get("/users/profile", headers=bearer(access))
    body = p3.json()
    assert body["current_stage"] == "Freedom"
    assert body["latest_assessment_id"] == aid3


# ---------- Datetime regression ----------


@pytest.mark.asyncio
async def test_profile_created_at_has_z_suffix(client: AsyncClient) -> None:
    """Regression for Task 0 — every timestamp must be ISO 8601 UTC with Z."""
    access, _ = await authed_session(client, "z-suffix@example.com")
    r = await client.get("/users/profile", headers=bearer(access))
    assert r.status_code == 200
    ts = r.json()["created_at"]
    assert ts.endswith("Z"), ts
    # No naive trailing microseconds without tz
    assert "+00:00" not in ts
