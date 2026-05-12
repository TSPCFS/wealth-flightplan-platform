"""Pure-function tests for the scoring + banding helpers.

These don't hit the DB so they run instantly and exhaustively cover the
band edges called out in docs/API_CONTRACT.md.
"""

from __future__ import annotations

import pytest

from app.core.errors import APIError
from app.services import assessment as svc

# ---------- score_5q / stage_5q ----------


@pytest.mark.parametrize(
    "responses,expected_score,expected_stage",
    [
        # All a's = 5 (lower bound, Foundation)
        ({"q1": "a", "q2": "a", "q3": "a", "q4": "a", "q5": "a"}, 5, "Foundation"),
        # 8 = top of Foundation
        ({"q1": "a", "q2": "b", "q3": "b", "q4": "b", "q5": "a"}, 8, "Foundation"),
        # 9 = bottom of Momentum
        ({"q1": "a", "q2": "b", "q3": "b", "q4": "b", "q5": "b"}, 9, "Momentum"),
        # 12 = top of Momentum
        ({"q1": "b", "q2": "b", "q3": "c", "q4": "b", "q5": "c"}, 12, "Momentum"),
        # 13 = bottom of Freedom
        ({"q1": "b", "q2": "b", "q3": "c", "q4": "c", "q5": "c"}, 13, "Freedom"),
        # 16 = top of Freedom
        ({"q1": "c", "q2": "c", "q3": "c", "q4": "d", "q5": "c"}, 16, "Freedom"),
        # 17 = bottom of Independence
        ({"q1": "c", "q2": "c", "q3": "c", "q4": "d", "q5": "d"}, 17, "Independence"),
        # All d's = 20 (Independence max for 5Q)
        ({"q1": "d", "q2": "d", "q3": "d", "q4": "d", "q5": "d"}, 20, "Independence"),
    ],
)
def test_score_5q_band_edges(responses, expected_score, expected_stage):
    score = svc.score_5q(responses)
    assert score == expected_score
    assert svc.stage_5q(score) == expected_stage


# ---------- score_10q / stage_10q ----------


def _ten(*letters: str) -> dict:
    assert len(letters) == 10
    return {f"q{i + 1}": letters[i] for i in range(10)}


@pytest.mark.parametrize(
    "responses,expected_score,expected_stage",
    [
        (_ten(*("a" * 10)), 10, "Foundation"),
        (_ten(*("a" * 4 + "b" * 6)), 16, "Foundation"),  # top of Foundation
        (_ten(*("a" * 3 + "b" * 7)), 17, "Momentum"),  # bottom of Momentum
        (_ten(*("b" * 7 + "c" * 3)), 23, "Momentum"),  # top of Momentum
        (_ten(*("b" * 6 + "c" * 4)), 24, "Freedom"),  # bottom of Freedom
        (_ten(*("c" * 10)), 30, "Freedom"),  # top of Freedom
        (_ten(*("c" * 9 + "d" * 1)), 31, "Independence"),  # bottom of Independence
        (_ten(*("c" * 4 + "d" * 6)), 36, "Independence"),  # top of Independence
        (_ten(*("c" * 3 + "d" * 7)), 37, "Abundance"),  # bottom of Abundance
        (_ten(*("d" * 10)), 40, "Abundance"),  # top of Abundance
    ],
)
def test_score_10q_band_edges(responses, expected_score, expected_stage):
    score = svc.score_10q(responses)
    assert score == expected_score
    assert svc.stage_10q(score) == expected_stage


# ---------- score_gap / gap_band ----------


def _gap(*values: str) -> dict:
    assert len(values) == 12
    return {f"q{i + 1}": values[i] for i in range(12)}


@pytest.mark.parametrize(
    "responses,expected_score,expected_band",
    [
        # All no = 0 (wide_gaps)
        (_gap(*(["no"] * 12)), 0, "wide_gaps"),
        # 12 = top of wide_gaps
        (_gap(*(["partially"] * 12)), 12, "wide_gaps"),
        # 13 = bottom of meaningful_gaps
        (_gap("yes", *(["partially"] * 11)), 13, "meaningful_gaps"),
        # 19 = top of meaningful_gaps
        (_gap(*(["yes"] * 7 + ["partially"] * 5)), 19, "meaningful_gaps"),
        # 20 = bottom of solid_plan
        (_gap(*(["yes"] * 8 + ["partially"] * 4)), 20, "solid_plan"),
        # All yes = 24 (top of solid_plan)
        (_gap(*(["yes"] * 12)), 24, "solid_plan"),
    ],
)
def test_score_gap_band_edges(responses, expected_score, expected_band):
    score = svc.score_gap(responses)
    assert score == expected_score
    assert svc.gap_band(score) == expected_band


# ---------- Validation failures ----------


def test_score_5q_rejects_invalid_letter():
    with pytest.raises(APIError) as exc:
        svc.score_5q({"q1": "z", "q2": "a", "q3": "a", "q4": "a", "q5": "a"})
    assert exc.value.code == "VALIDATION_ERROR"
    assert exc.value.status_code == 400


def test_score_5q_rejects_missing_key():
    with pytest.raises(APIError) as exc:
        svc.score_5q({"q1": "a", "q2": "a", "q3": "a", "q4": "a"})  # no q5
    assert exc.value.code == "VALIDATION_ERROR"


def test_score_5q_rejects_extra_keys():
    with pytest.raises(APIError) as exc:
        svc.score_5q({"q1": "a", "q2": "a", "q3": "a", "q4": "a", "q5": "a", "q6": "a"})
    assert exc.value.code == "VALIDATION_ERROR"


def test_score_gap_rejects_invalid_value():
    bad = _gap(*(["yes"] * 11 + ["maybe"]))
    with pytest.raises(APIError) as exc:
        svc.score_gap(bad)
    assert exc.value.code == "VALIDATION_ERROR"


def test_score_5q_rejects_non_string_value():
    with pytest.raises(APIError) as exc:
        svc.score_5q({"q1": 1, "q2": "a", "q3": "a", "q4": "a", "q5": "a"})
    assert exc.value.code == "VALIDATION_ERROR"


def test_score_5q_rejects_non_dict():
    with pytest.raises(APIError):
        svc.score_5q(["a", "b", "c", "d", "a"])  # type: ignore[arg-type]


# ---------- Gap helpers ----------


def test_gaps_identified_orders_no_before_partially_then_ascending():
    responses = _gap(
        # q1=yes, q2=partially, q3=no, q4=no, q5=yes, q6=yes, q7=partially,
        # q8=no, q9=no, q10=yes, q11=yes, q12=partially
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
    )
    gaps = svc.gaps_identified(responses)
    codes = [g["question_code"] for g in gaps]
    # All no's first (q3, q4, q8, q9), then partially's (q2, q7, q12), each group
    # ascending.
    assert codes == ["q3", "q4", "q8", "q9", "q2", "q7", "q12"]
    # 'yes' answers excluded entirely
    assert all(g["current_status"] != "yes" for g in gaps)
    # Priority mapping
    no_priorities = {g["priority"] for g in gaps if g["current_status"] == "no"}
    part_priorities = {g["priority"] for g in gaps if g["current_status"] == "partially"}
    assert no_priorities == {"high"}
    assert part_priorities == {"medium"}


def test_gap_plan_eligible_true_when_total_below_20():
    score = svc.score_gap(_gap(*(["partially"] * 12)))  # 12
    assert svc.is_gap_plan_eligible(score, _gap(*(["partially"] * 12))) is True


def test_gap_plan_eligible_true_when_any_no_even_if_total_geq_20():
    # 8 yes + 3 partially + 1 no = 16+3+0 = 19 — still <20 anyway; pick a >=20 case
    responses = _gap(
        "yes", "yes", "yes", "yes", "yes", "yes", "yes", "yes", "yes", "yes", "no", "no"
    )
    score = svc.score_gap(responses)
    assert score == 20
    assert svc.is_gap_plan_eligible(score, responses) is True


def test_gap_plan_eligible_false_when_no_no_and_total_geq_20():
    responses = _gap(*(["yes"] * 12))  # 24
    score = svc.score_gap(responses)
    assert svc.is_gap_plan_eligible(score, responses) is False


# ---------- Stage details / recommendations smoke ----------


def test_stage_details_round_trip_for_every_stage():
    for stage in ("Foundation", "Momentum", "Freedom", "Independence", "Abundance"):
        d = svc.stage_details(stage)
        assert d["name"] == stage
        assert isinstance(d["description"], str) and d["description"]
        assert isinstance(d["income_runway"], str) and d["income_runway"]


def test_stage_recommendations_have_3_to_5_bullets():
    for stage in ("Foundation", "Momentum", "Freedom", "Independence", "Abundance"):
        recs = svc.stage_recommendations(stage)
        assert 3 <= len(recs) <= 5, (stage, recs)
        assert all(isinstance(r, str) and r for r in recs)
