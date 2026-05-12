"""Unit tests for the worksheet service: validation, calculation, feedback.

These tests don't hit the DB — they operate on the schema dicts directly so
they're fast and exhaustively cover the validation + calc paths.
"""

from __future__ import annotations

import pytest

from app.core.errors import APIError
from app.db.seeds.phase4_worksheets import WORKSHEETS
from app.services import worksheet as svc

# ---------- Schema fixtures derived from the seed -----------------------------

SEED_BY_CODE = {w["content_code"]: w for w in WORKSHEETS}


def _schema(code: str) -> dict:
    w = SEED_BY_CODE[code]
    return {
        "worksheet_code": code,
        "title": w["title"],
        "sections": w["detail"]["sections"],
        "summary_keys": w["detail"].get("summary_keys", []),
    }


# ---------- validate_response ------------------------------------------------


def test_validate_scalar_section_coerces_numbers_and_clamps_min() -> None:
    schema = _schema("APP-A")
    result = svc.validate_response(
        schema,
        {"income": {"salary_1": "45000", "salary_2": -5}, "needs": {"bond": 11000}},
    )
    assert result.cleaned["income"]["salary_1"] == 45000.0
    # negative input fails the min=0 check
    assert any("≥" in m for m in result.errors.get("income.salary_2", []))
    # missing field fell back to default 0
    assert result.cleaned["needs"]["utilities"] == 0


def test_validate_select_rejects_unknown_option() -> None:
    schema = _schema("APP-C")
    result = svc.validate_response(schema, {"life_cover": {"policy_active": "maybe"}})
    assert "life_cover.policy_active" in result.errors


def test_validate_array_enforces_min_items() -> None:
    schema = _schema("APP-D")
    # APP-D has min_items=0 so empty list is fine.
    result = svc.validate_response(schema, {"debts": []})
    assert "debts" not in result.errors


def test_validate_array_enforces_max_items() -> None:
    schema = _schema("APP-D")
    debts = [
        {
            "creditor": f"acc {i}",
            "balance": 100,
            "minimum_payment": 10,
            "annual_rate_pct": 5,
            "account_type": "other",
        }
        for i in range(40)
    ]
    result = svc.validate_response(schema, {"debts": debts})
    assert any("At most 30" in m for m in result.errors.get("debts", []))


def test_validate_array_row_field_errors_propagate_with_index() -> None:
    schema = _schema("APP-D")
    debts = [
        {
            "creditor": "CC",
            "balance": -1,  # min=0 violated
            "minimum_payment": 0,
            "annual_rate_pct": 99,  # max=50 violated
            "account_type": "credit_card",
        }
    ]
    result = svc.validate_response(schema, {"debts": debts})
    assert "debts[0].balance" in result.errors
    assert "debts[0].annual_rate_pct" in result.errors


# ---------- calculate_budget -------------------------------------------------


def test_budget_we7_numbers_match_phase3_calculator() -> None:
    """WE-7 scenario via the worksheet path must equal the Phase 3 calculator."""
    response = {
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
    out = svc.calculate_budget(response)
    assert out["total_income"] == 45_000
    assert out["total_needs"] == 32_000
    assert out["total_wants"] == 3_500
    assert out["total_invest"] == 9_500
    assert out["status"] == "balanced"
    # 32000 / 45000 ≈ 71.11
    assert 70.9 <= out["needs_pct"] <= 71.3
    assert 7.7 <= out["wants_pct"] <= 7.9
    assert 21.0 <= out["invest_pct"] <= 21.2


# ---------- calculate_net_worth ----------------------------------------------


def test_net_worth_hennie_breakdown() -> None:
    response = {
        "lifestyle_assets": [
            {"name": "Primary home", "value": 4_500_000},
            {"name": "Vehicles", "value": 850_000},
            {"name": "Household contents", "value": 150_000},
        ],
        "income_generating_assets": [
            {"name": "Retirement annuity", "value": 1_200_000},
            {"name": "TFSA", "value": 500_000},
            {"name": "Cash", "value": 300_000},
        ],
        "liabilities": [{"name": "Bond", "value": 3_100_000}],
    }
    out = svc.calculate_net_worth(response)
    assert out["total_assets"] == 7_500_000.0
    assert out["total_liabilities"] == 3_100_000.0
    assert out["net_worth"] == 4_400_000.0
    # 2_000_000 / 4_400_000 = 45.45%
    assert 45.0 <= out["income_generating_pct_of_net_worth"] <= 46.0


# ---------- calculate_debt_disclosure ----------------------------------------


def test_debt_disclosure_we1_scenario() -> None:
    response = {
        "debts": [
            {
                "creditor": "Bank credit card",
                "balance": 30_000,
                "minimum_payment": 1_500,
                "annual_rate_pct": 24,
                "account_type": "credit_card",
            }
        ]
    }
    out = svc.calculate_debt_disclosure(response)
    assert out["total_debt"] == 30_000.0
    assert out["total_monthly_minimums"] == 1_500.0
    assert out["weighted_average_rate_pct"] == 24.0
    assert out["account_count"] == 1
    cc_bucket = [b for b in out["breakdown_by_category"] if b["category"] == "credit_card"][0]
    assert cc_bucket["count"] == 1


def test_debt_disclosure_weighted_average_across_categories() -> None:
    response = {
        "debts": [
            {
                "creditor": "Bond",
                "balance": 2_000_000,
                "minimum_payment": 18_500,
                "annual_rate_pct": 10.25,
                "account_type": "bond",
            },
            {
                "creditor": "Credit card",
                "balance": 50_000,
                "minimum_payment": 2_500,
                "annual_rate_pct": 24,
                "account_type": "credit_card",
            },
        ]
    }
    out = svc.calculate_debt_disclosure(response)
    assert out["total_debt"] == 2_050_000.0
    # weighted = (2_000_000 × 10.25 + 50_000 × 24) / 2_050_000 ≈ 10.585
    assert 10.5 <= out["weighted_average_rate_pct"] <= 10.7


def test_debt_disclosure_empty_input() -> None:
    out = svc.calculate_debt_disclosure({"debts": []})
    assert out["total_debt"] == 0.0
    assert out["weighted_average_rate_pct"] == 0.0
    assert out["breakdown_by_category"] == []


# ---------- completion_percentage --------------------------------------------


def test_completion_zero_on_empty_budget() -> None:
    schema = _schema("APP-A")
    assert svc.derive_completion_percentage(schema, {}) == 0


def test_completion_partial_budget() -> None:
    schema = _schema("APP-A")
    pct = svc.derive_completion_percentage(
        schema,
        {
            "income": {"salary_1": 45_000},
            "needs": {"bond": 11_000, "utilities": 2_800},
        },
    )
    # 3 filled out of 27 total fields → ~11%
    assert 5 <= pct <= 20


# ---------- generate_feedback ------------------------------------------------


def test_feedback_budget_high_needs_is_needs_attention() -> None:
    calc = svc.calculate_budget(
        {
            "income": {"salary_1": 45_000},
            "needs": {"bond": 11_000, "utilities": 2_800, "groceries": 18_200},
            "wants": {},
            "invest": {"tfsa": 13_000},
        }
    )
    _, feedback = svc.generate_feedback("APP-A", _schema("APP-A"), {}, calc, 100)
    assert feedback["status"] in ("needs_attention", "critical")
    assert "Needs" in feedback["message"] or "Allocations" in feedback["message"]


def test_feedback_budget_balanced() -> None:
    calc = svc.calculate_budget(
        {
            "income": {"salary_1": 10_000},
            "needs": {"bond": 5_000},
            "wants": {"dining": 3_000},
            "invest": {"tfsa": 2_000},
        }
    )
    _, feedback = svc.generate_feedback("APP-A", _schema("APP-A"), {}, calc, 100)
    assert feedback["status"] == "on_track"


def test_feedback_net_worth_low_pct_is_critical() -> None:
    calc = svc.calculate_net_worth(
        {
            "lifestyle_assets": [{"name": "Home", "value": 5_000_000}],
            "income_generating_assets": [{"name": "TFSA", "value": 100_000}],
            "liabilities": [{"name": "Bond", "value": 3_000_000}],
        }
    )
    _, feedback = svc.generate_feedback("APP-B", _schema("APP-B"), {}, calc, 100)
    assert feedback["status"] == "critical"


def test_feedback_net_worth_high_pct_is_on_track() -> None:
    calc = svc.calculate_net_worth(
        {
            "lifestyle_assets": [{"name": "Home", "value": 1_000_000}],
            "income_generating_assets": [{"name": "Portfolio", "value": 5_000_000}],
            "liabilities": [],
        }
    )
    _, feedback = svc.generate_feedback("APP-B", _schema("APP-B"), {}, calc, 100)
    assert feedback["status"] == "on_track"


def test_feedback_risk_cover_critical_when_critical_item_missing() -> None:
    schema = _schema("APP-C")
    response = {
        "life_cover": {"policy_active": "no"},
        "will_estate": {"will_valid": "yes"},
    }
    calc, feedback = svc.generate_feedback("APP-C", schema, response, None, 50)
    assert feedback["status"] == "critical"
    assert calc["critical_gaps"] >= 1


def test_feedback_risk_cover_on_track_when_no_gaps() -> None:
    schema = _schema("APP-C")
    response = {
        "life_cover": {
            "policy_active": "yes",
            "sum_assured_meets_target": "yes",
            "debt_clearance_covered": "yes",
            "beneficiaries_current": "yes",
        }
    }
    calc, feedback = svc.generate_feedback("APP-C", schema, response, None, 90)
    assert feedback["status"] == "on_track"
    assert calc["gaps_total"] == 0


def test_feedback_debt_critical_when_rate_above_20pct() -> None:
    calc = svc.calculate_debt_disclosure(
        {
            "debts": [
                {
                    "creditor": "CC",
                    "balance": 30_000,
                    "minimum_payment": 1_500,
                    "annual_rate_pct": 24,
                    "account_type": "credit_card",
                }
            ]
        }
    )
    _, feedback = svc.generate_feedback("APP-D", _schema("APP-D"), {}, calc, 100)
    assert feedback["status"] == "critical"


def test_feedback_debt_on_track_for_well_priced_debt() -> None:
    calc = svc.calculate_debt_disclosure(
        {
            "debts": [
                {
                    "creditor": "Bond",
                    "balance": 2_000_000,
                    "minimum_payment": 18_500,
                    "annual_rate_pct": 10.25,
                    "account_type": "bond",
                }
            ]
        }
    )
    _, feedback = svc.generate_feedback("APP-D", _schema("APP-D"), {}, calc, 100)
    assert feedback["status"] == "on_track"


def test_feedback_app_e_completion_only() -> None:
    schema = _schema("APP-E")
    _, fb_low = svc.generate_feedback("APP-E", schema, {}, None, 10)
    _, fb_mid = svc.generate_feedback("APP-E", schema, {}, None, 60)
    _, fb_high = svc.generate_feedback("APP-E", schema, {}, None, 100)
    assert fb_low["status"] == "critical"
    assert fb_mid["status"] == "needs_attention"
    assert fb_high["status"] == "on_track"


def test_calculate_dispatch_returns_none_for_assessment_10q() -> None:
    assert svc.calculate("assessment_10q", {}) is None


def test_calculate_dispatch_unknown_calculator_raises() -> None:
    with pytest.raises(APIError):
        svc.calculate("not_a_real_calculator", {})
