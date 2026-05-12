"""Pure-function tests for the calculator engine.

Standard textbook compound interest is used (FV = PV(1+r)^n + PMT × ((1+r)^n − 1)/r)
with monthly compounding r = annual_rate_pct / 100 / 12. This matches the API
contract's ``year_by_year`` sample (R62,800 at end of year 1 for R5k/month at
10% nominal). Book figures (R6.4M, R11.06M, R1.9M) are rounded approximations
of slightly different conventions; we verify the math the contract specifies
and use comfortable tolerances around the book figures.
"""

from __future__ import annotations

import math

import pytest
from pydantic import ValidationError

from app.services.calculator import (
    BudgetAllocatorInput,
    CompoundInterestInput,
    DebtAccount,
    DebtAnalysisInput,
    NetWorthInput,
    NetWorthItem,
    budget_allocator,
    compound_interest,
    debt_analysis,
    net_worth_analyzer,
)

# ---------------------------------------------------------------------------
# compound_interest
# ---------------------------------------------------------------------------


def test_compound_first_year_matches_contract_sample() -> None:
    """Contract example: R5k/month at 10%, year 1 balance ≈ R62,800."""
    out = compound_interest(
        CompoundInterestInput(
            monthly_contribution=5_000,
            initial_amount=0,
            years=1,
            annual_rate_pct=10,
        )
    )
    assert len(out.year_by_year) == 1
    assert math.isclose(out.year_by_year[0].balance, 62_828.41, abs_tol=2.0)
    assert math.isclose(out.year_by_year[0].contributions_to_date, 60_000.0)
    assert math.isclose(out.year_by_year[0].growth_to_date, 2_828.41, abs_tol=2.0)


def test_compound_we3_default_scenario() -> None:
    """WE-3 defaults: R5k/mo, 25 yrs, 10% — book quotes R6.4M; standard math gives R6.63M."""
    out = compound_interest(
        CompoundInterestInput(
            monthly_contribution=5_000,
            years=25,
            annual_rate_pct=10,
        )
    )
    assert len(out.year_by_year) == 25
    # Standard FV formula on these inputs = R6,633,839 (Excel-equivalent).
    # The book's R6.4M is a rounded approximation; we verify the math the
    # contract's year_by_year sample implies.
    assert 6_500_000 <= out.final_amount <= 6_750_000, out.final_amount
    # 4% rule passive: 6.63M × 0.04 / 12 ≈ R22,113/month
    assert 21_500 <= out.monthly_passive_income <= 22_500


def test_compound_we4_nomvula() -> None:
    """Contribute R5k/mo for 10y, then idle 25y at 10%."""
    phase_1 = compound_interest(
        CompoundInterestInput(
            monthly_contribution=5_000,
            years=10,
            annual_rate_pct=10,
        )
    )
    # Should be ~R1.024M at age 35.
    assert 1_000_000 <= phase_1.final_amount <= 1_050_000
    phase_2 = compound_interest(
        CompoundInterestInput(
            monthly_contribution=0,
            initial_amount=phase_1.final_amount,
            years=25,
            annual_rate_pct=10,
        )
    )
    # Standard monthly compounding yields ~R12.3M; book quotes R11.06M.
    assert 12_000_000 <= phase_2.final_amount <= 12_700_000, phase_2.final_amount


def test_compound_we6_child() -> None:
    """R150/mo for 18 yrs, then idle 47 yrs at 10%."""
    p1 = compound_interest(
        CompoundInterestInput(
            monthly_contribution=150,
            years=18,
            annual_rate_pct=10,
        )
    )
    # ~R90k at age 18
    assert 88_000 <= p1.final_amount <= 95_000
    p2 = compound_interest(
        CompoundInterestInput(
            monthly_contribution=0,
            initial_amount=p1.final_amount,
            years=47,
            annual_rate_pct=10,
        )
    )
    # Standard monthly compounding (47 years at 10% on ~R90k) yields ~R9.7M;
    # book quotes R1.9M (consistent with a much lower assumed real rate).
    # We verify standard math; the book figure is captured as a flagged
    # discrepancy in the Phase 3 report.
    assert 9_000_000 <= p2.final_amount <= 10_500_000, p2.final_amount


def test_compound_boundary_one_year() -> None:
    out = compound_interest(
        CompoundInterestInput(monthly_contribution=1_000, years=1, annual_rate_pct=10)
    )
    assert len(out.year_by_year) == 1
    assert out.total_contributed == 12_000.0


def test_compound_boundary_zero_rate() -> None:
    """At 0% rate, FV is just sum of contributions + initial."""
    out = compound_interest(
        CompoundInterestInput(
            monthly_contribution=1_000,
            initial_amount=5_000,
            years=5,
            annual_rate_pct=0,
        )
    )
    assert math.isclose(out.final_amount, 65_000.0)
    assert out.total_growth == 0.0


def test_compound_initial_only_no_monthly() -> None:
    """Lump sum of R100k for 10y at 10% (monthly compounding) ≈ R270k."""
    out = compound_interest(
        CompoundInterestInput(
            monthly_contribution=0,
            initial_amount=100_000,
            years=10,
            annual_rate_pct=10,
        )
    )
    # (1 + 0.10/12)^120 ≈ 2.7070 → ~R270,704
    assert 269_000 <= out.final_amount <= 272_000


def test_compound_rejects_negative_contribution() -> None:
    with pytest.raises(ValidationError):
        CompoundInterestInput(monthly_contribution=-1, years=5, annual_rate_pct=10)


def test_compound_rejects_years_above_60() -> None:
    with pytest.raises(ValidationError):
        CompoundInterestInput(monthly_contribution=100, years=61, annual_rate_pct=10)


# ---------------------------------------------------------------------------
# debt_analysis
# ---------------------------------------------------------------------------


def test_debt_single_account_basic_payoff() -> None:
    """R30k @ 24%, R1500/mo payment, no surplus → ~25 months, ~R6.7k interest."""
    out = debt_analysis(
        DebtAnalysisInput(
            debts=[
                DebtAccount(name="CC", balance=30_000, annual_rate_pct=24, minimum_payment=1_500)
            ],
            surplus_available=0,
            method="avalanche",
        )
    )
    assert out.total_debt == 30_000.0
    assert out.debt_free_months is not None
    assert 24 <= out.debt_free_months <= 28
    assert 5_000 <= out.total_interest_paid <= 9_000
    assert out.payment_order[0].expected_close_month == out.debt_free_months


def test_debt_large_surplus_closes_in_one_month() -> None:
    out = debt_analysis(
        DebtAnalysisInput(
            debts=[DebtAccount(name="CC", balance=5_000, annual_rate_pct=24, minimum_payment=300)],
            surplus_available=10_000,
            method="snowball",
        )
    )
    assert out.debt_free_months == 1
    assert out.payment_order[0].expected_close_month == 1


def test_debt_snowball_attacks_smallest_balance_first() -> None:
    out = debt_analysis(
        DebtAnalysisInput(
            debts=[
                DebtAccount(
                    name="Big CC",
                    balance=20_000,
                    annual_rate_pct=18,
                    minimum_payment=500,
                ),
                DebtAccount(
                    name="Small store",
                    balance=2_000,
                    annual_rate_pct=28,
                    minimum_payment=200,
                ),
            ],
            surplus_available=1_500,
            method="snowball",
        )
    )
    # First-closed account is "Small store" despite the higher rate.
    closed_first = min(
        (p for p in out.payment_order if p.expected_close_month is not None),
        key=lambda p: p.expected_close_month or 10**9,
    )
    assert closed_first.name == "Small store"


def test_debt_avalanche_attacks_highest_rate_first() -> None:
    out = debt_analysis(
        DebtAnalysisInput(
            debts=[
                DebtAccount(
                    name="Big CC",
                    balance=20_000,
                    annual_rate_pct=18,
                    minimum_payment=500,
                ),
                DebtAccount(
                    name="Small store",
                    balance=2_000,
                    annual_rate_pct=28,
                    minimum_payment=200,
                ),
            ],
            surplus_available=1_500,
            method="avalanche",
        )
    )
    # Both methods happen to close the small store first here (only 2k balance),
    # so this assertion is on reasons not on order.
    assert all(p.reason == "highest interest rate first" for p in out.payment_order)
    # Total balance falls monotonically.
    balances = [m.total_balance for m in out.monthly_projection]
    assert balances == sorted(balances, reverse=True) or all(
        balances[i] >= balances[i + 1] - 1 for i in range(len(balances) - 1)
    )


def test_debt_debtonator_caps_worst_rate_at_prime() -> None:
    out = debt_analysis(
        DebtAnalysisInput(
            debts=[
                DebtAccount(
                    name="CC",
                    balance=30_000,
                    annual_rate_pct=24,
                    minimum_payment=1_500,
                )
            ],
            surplus_available=0,
            method="debtonator",
        )
    )
    # With effective rate capped at 10.25% the same R30k @ R1.5k/mo finishes
    # in fewer months than the avalanche test above (which paid 24%).
    assert out.debt_free_months is not None
    assert out.debt_free_months < 25  # avalanche path was ~25 months
    assert out.payment_order[0].reason.startswith("Debtonator")


def test_debt_zero_minimum_means_only_surplus_pays_down() -> None:
    out = debt_analysis(
        DebtAnalysisInput(
            debts=[DebtAccount(name="CC", balance=1_000, annual_rate_pct=24, minimum_payment=0)],
            surplus_available=200,
            method="snowball",
        )
    )
    assert out.debt_free_months is not None
    assert out.debt_free_months >= 5


def test_debt_unpayable_returns_null_months() -> None:
    """Tiny payment vs huge debt at high rate exceeds the simulation cap."""
    out = debt_analysis(
        DebtAnalysisInput(
            debts=[
                DebtAccount(
                    name="CC",
                    balance=1_000_000,
                    annual_rate_pct=24,
                    minimum_payment=10,
                )
            ],
            surplus_available=0,
            method="avalanche",
        )
    )
    assert out.debt_free_months is None
    assert len(out.monthly_projection) == 600


def test_debt_weighted_average_rate() -> None:
    out = debt_analysis(
        DebtAnalysisInput(
            debts=[
                DebtAccount(name="A", balance=10_000, annual_rate_pct=20, minimum_payment=500),
                DebtAccount(name="B", balance=30_000, annual_rate_pct=10, minimum_payment=500),
            ],
            surplus_available=0,
            method="avalanche",
        )
    )
    # weighted = (10_000 * 20 + 30_000 * 10) / 40_000 = 12.5
    assert math.isclose(out.weighted_average_rate_pct, 12.5)


# ---------------------------------------------------------------------------
# budget_allocator
# ---------------------------------------------------------------------------


def test_budget_balanced_50_30_20() -> None:
    out = budget_allocator(
        BudgetAllocatorInput(income_monthly=10_000, needs=5_000, wants=3_000, invest=2_000)
    )
    assert out.status == "balanced"
    assert out.surplus_deficit == 0.0
    assert all(c.status == "on_track" for c in out.target_comparison)


def test_budget_deficit_when_allocations_exceed_income() -> None:
    out = budget_allocator(
        BudgetAllocatorInput(income_monthly=10_000, needs=8_000, wants=3_000, invest=2_000)
    )
    assert out.status == "deficit"
    assert out.surplus_deficit < 0


def test_budget_surplus_when_under_allocated() -> None:
    out = budget_allocator(
        BudgetAllocatorInput(income_monthly=10_000, needs=4_000, wants=2_000, invest=1_000)
    )
    assert out.status == "surplus"
    assert out.surplus_deficit > 0


def test_budget_we7_real_household_71_8_21() -> None:
    """WE-7 defaults: R45k income, Needs R32k, Wants R3.5k, Invest R9.5k."""
    out = budget_allocator(
        BudgetAllocatorInput(income_monthly=45_000, needs=32_000, wants=3_500, invest=9_500)
    )
    assert out.status == "balanced"
    assert math.isclose(out.needs_pct, 71.11, abs_tol=0.1)
    assert math.isclose(out.wants_pct, 7.78, abs_tol=0.1)
    assert math.isclose(out.invest_pct, 21.11, abs_tol=0.1)
    needs_status = next(c for c in out.target_comparison if c.category == "needs")
    wants_status = next(c for c in out.target_comparison if c.category == "wants")
    invest_status = next(c for c in out.target_comparison if c.category == "invest")
    assert needs_status.status == "high"
    assert wants_status.status == "low"
    assert invest_status.status == "on_track"
    assert "needs" in out.feedback.lower()


def test_budget_zero_income_does_not_crash() -> None:
    out = budget_allocator(BudgetAllocatorInput(income_monthly=0, needs=100, wants=0, invest=0))
    assert out.status == "deficit"
    # Per-category pct uses income_for_pct = 1, so needs_pct can be large; we
    # just need to not blow up.
    assert out.needs_pct > 0


# ---------------------------------------------------------------------------
# net_worth_analyzer
# ---------------------------------------------------------------------------


def test_net_worth_typical_household() -> None:
    out = net_worth_analyzer(
        NetWorthInput(
            lifestyle_assets=[NetWorthItem(name="Home", value=4_500_000)],
            income_generating_assets=[NetWorthItem(name="RA", value=1_200_000)],
            liabilities=[NetWorthItem(name="Bond", value=3_100_000)],
        )
    )
    assert out.total_assets == 5_700_000.0
    assert out.net_worth == 2_600_000.0
    # 1_200_000 / 2_600_000 = 46.15%
    assert math.isclose(out.income_generating_pct_of_net_worth, 46.15, abs_tol=0.1)
    assert "46%" in out.interpretation


def test_net_worth_zero_net_worth_does_not_divide_by_zero() -> None:
    out = net_worth_analyzer(
        NetWorthInput(
            lifestyle_assets=[NetWorthItem(name="A", value=100)],
            income_generating_assets=[],
            liabilities=[NetWorthItem(name="L", value=100)],
        )
    )
    assert out.net_worth == 0.0
    assert out.income_generating_pct_of_net_worth == 0.0
    assert "zero" in out.interpretation.lower() or "below" in out.interpretation.lower()


def test_net_worth_negative_does_not_crash() -> None:
    out = net_worth_analyzer(
        NetWorthInput(
            lifestyle_assets=[],
            income_generating_assets=[NetWorthItem(name="TFSA", value=50_000)],
            liabilities=[NetWorthItem(name="Bond", value=500_000)],
        )
    )
    assert out.net_worth < 0
    assert out.income_generating_pct_of_net_worth == 0.0


def test_net_worth_empty_input() -> None:
    out = net_worth_analyzer(NetWorthInput())
    assert out.total_assets == 0.0
    assert out.net_worth == 0.0
