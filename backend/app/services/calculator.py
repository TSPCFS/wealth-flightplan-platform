"""Pure-function calculator engine for Phase 3 content.

Four calculator types, each with typed Pydantic input/output models. No DB
access — these are unit-testable in isolation.

Notation:
    r = monthly interest rate (annual_rate_pct / 100 / 12)
    n = total months (years * 12)
    PMT = monthly contribution
    PV = initial lump sum
    FV = PV(1+r)^n + PMT × [((1+r)^n - 1) / r]
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

PRIME_RATE_PCT = 10.25  # April 2026 (wealth_index.md Section 8)
DEBT_SIMULATION_CAP_MONTHS = 600


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _round2(x: float) -> float:
    """Round to 2 decimal places, banker's rounding off."""
    return round(x + 1e-9, 2)


# ---------------------------------------------------------------------------
# compound_interest
# ---------------------------------------------------------------------------


class CompoundInterestInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    monthly_contribution: float = Field(ge=0)
    initial_amount: float = Field(default=0, ge=0)
    years: int = Field(ge=1, le=60)
    annual_rate_pct: float = Field(ge=0, le=25)
    withdrawal_rate_pct: float = Field(default=4, ge=0, le=10)


class CompoundYearPoint(BaseModel):
    year: int
    balance: float
    contributions_to_date: float
    growth_to_date: float


class CompoundInterestOutput(BaseModel):
    final_amount: float
    total_contributed: float
    total_growth: float
    monthly_passive_income: float
    year_by_year: list[CompoundYearPoint]


def compound_interest(inp: CompoundInterestInput) -> CompoundInterestOutput:
    r = inp.annual_rate_pct / 100.0 / 12.0
    pv = inp.initial_amount
    pmt = inp.monthly_contribution

    balance = pv
    year_by_year: list[CompoundYearPoint] = []
    for year_idx in range(1, inp.years + 1):
        for _ in range(12):
            balance = balance * (1 + r) + pmt
        contributions_to_date = pv + pmt * 12 * year_idx
        growth_to_date = balance - contributions_to_date
        year_by_year.append(
            CompoundYearPoint(
                year=year_idx,
                balance=_round2(balance),
                contributions_to_date=_round2(contributions_to_date),
                growth_to_date=_round2(growth_to_date),
            )
        )

    final_amount = _round2(balance)
    total_contributed = _round2(pv + pmt * 12 * inp.years)
    total_growth = _round2(final_amount - total_contributed)
    monthly_passive_income = _round2(final_amount * (inp.withdrawal_rate_pct / 100.0) / 12.0)

    return CompoundInterestOutput(
        final_amount=final_amount,
        total_contributed=total_contributed,
        total_growth=total_growth,
        monthly_passive_income=monthly_passive_income,
        year_by_year=year_by_year,
    )


# ---------------------------------------------------------------------------
# debt_analysis
# ---------------------------------------------------------------------------


DebtMethod = Literal["snowball", "avalanche", "debtonator"]


class DebtAccount(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    balance: float = Field(ge=0)
    annual_rate_pct: float = Field(ge=0, le=50)
    minimum_payment: float = Field(ge=0)


class DebtAnalysisInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    debts: list[DebtAccount] = Field(min_length=1, max_length=20)
    surplus_available: float = Field(ge=0)
    method: DebtMethod


class DebtPaymentOrder(BaseModel):
    name: str
    balance: float
    annual_rate_pct: float
    expected_close_month: int | None
    reason: str


class DebtMonthlyPoint(BaseModel):
    month: int
    total_balance: float
    interest_charged: float
    accounts_remaining: int


class DebtAnalysisOutput(BaseModel):
    total_debt: float
    weighted_average_rate_pct: float
    total_monthly_minimums: float
    debt_free_months: int | None
    total_interest_paid: float
    payment_order: list[DebtPaymentOrder]
    monthly_projection: list[DebtMonthlyPoint]


def _target_index(
    balances: list[float],
    rates: list[float],
    method: DebtMethod,
) -> int | None:
    """Pick the index of the debt to attack with surplus this month."""
    candidates = [i for i, b in enumerate(balances) if b > 0]
    if not candidates:
        return None
    if method == "snowball":
        return min(candidates, key=lambda i: (balances[i], rates[i] * -1))
    # avalanche + debtonator both target highest rate after adjustment.
    return max(candidates, key=lambda i: (rates[i], -balances[i]))


def debt_analysis(inp: DebtAnalysisInput) -> DebtAnalysisOutput:
    n_debts = len(inp.debts)
    names = [d.name for d in inp.debts]
    balances = [d.balance for d in inp.debts]
    minimums = [d.minimum_payment for d in inp.debts]
    original_balances = list(balances)
    annual_rates_orig = [d.annual_rate_pct for d in inp.debts]

    # Debtonator™: cap the highest-rate debt's effective rate at prime.
    annual_rates = list(annual_rates_orig)
    if inp.method == "debtonator":
        worst = max(range(n_debts), key=lambda i: annual_rates[i])
        if annual_rates[worst] > PRIME_RATE_PCT:
            annual_rates[worst] = PRIME_RATE_PCT
    monthly_rates = [r / 100.0 / 12.0 for r in annual_rates]

    total_debt = sum(balances)
    weighted_avg = (
        sum(b * r for b, r in zip(balances, annual_rates_orig, strict=True)) / total_debt
        if total_debt > 0
        else 0.0
    )
    total_min = sum(minimums)

    close_month: list[int | None] = [None] * n_debts
    projection: list[DebtMonthlyPoint] = []
    total_interest = 0.0

    month = 0
    while month < DEBT_SIMULATION_CAP_MONTHS:
        if all(b <= 0 for b in balances):
            break
        month += 1

        # 1) Accrue this month's interest on each non-zero debt.
        interest_this_month = 0.0
        for i in range(n_debts):
            if balances[i] > 0:
                interest = balances[i] * monthly_rates[i]
                balances[i] += interest
                interest_this_month += interest
        total_interest += interest_this_month

        # 2) Pay minimums (capped at remaining balance).
        for i in range(n_debts):
            if balances[i] <= 0:
                continue
            payment = min(minimums[i], balances[i])
            balances[i] -= payment

        # 3) Allocate any surplus (+ minimums freed by closed accounts) to the target.
        freed_minimum = sum(
            minimums[i] for i in range(n_debts) if balances[i] <= 0 and close_month[i] is not None
        )
        available = inp.surplus_available + freed_minimum
        while available > 0 and any(b > 0 for b in balances):
            target = _target_index(balances, annual_rates, inp.method)
            if target is None:
                break
            pay = min(available, balances[target])
            balances[target] -= pay
            available -= pay
            if balances[target] <= 1e-6:
                balances[target] = 0.0
                if close_month[target] is None:
                    close_month[target] = month

        # Record close months for any debts that hit zero from minimums.
        for i in range(n_debts):
            if balances[i] <= 1e-6 and close_month[i] is None:
                close_month[i] = month
                balances[i] = 0.0

        remaining = sum(1 for b in balances if b > 0)
        projection.append(
            DebtMonthlyPoint(
                month=month,
                total_balance=_round2(sum(balances)),
                interest_charged=_round2(interest_this_month),
                accounts_remaining=remaining,
            )
        )

    debt_free_months: int | None = None
    if all(b <= 0 for b in balances):
        debt_free_months = month

    # payment_order: order in which debts are closed (or current order for unfinished).
    def _reason(i: int) -> str:
        if inp.method == "snowball":
            return "smallest balance first"
        if inp.method == "avalanche":
            return "highest interest rate first"
        return "Debtonator™ — highest rate retired against access-bond cost (prime)"

    # Order by close_month then by attack order (snowball: balance asc; avalanche/debtonator: rate desc).
    def _sort_key(i: int) -> tuple[int, float]:
        cm = close_month[i] if close_month[i] is not None else month + 1
        sub = original_balances[i] if inp.method == "snowball" else -annual_rates_orig[i]
        return (cm, sub)

    ordered_indices = sorted(range(n_debts), key=_sort_key)
    payment_order = [
        DebtPaymentOrder(
            name=names[i],
            balance=_round2(original_balances[i]),
            annual_rate_pct=annual_rates_orig[i],
            expected_close_month=close_month[i],
            reason=_reason(i),
        )
        for i in ordered_indices
    ]

    return DebtAnalysisOutput(
        total_debt=_round2(total_debt),
        weighted_average_rate_pct=_round2(weighted_avg),
        total_monthly_minimums=_round2(total_min),
        debt_free_months=debt_free_months,
        total_interest_paid=_round2(total_interest),
        payment_order=payment_order,
        monthly_projection=projection,
    )


# ---------------------------------------------------------------------------
# budget_allocator
# ---------------------------------------------------------------------------


class BudgetAllocatorInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    income_monthly: float = Field(ge=0)
    needs: float = Field(ge=0)
    wants: float = Field(ge=0)
    invest: float = Field(ge=0)


class BudgetCategoryStatus(BaseModel):
    category: Literal["needs", "wants", "invest"]
    actual_pct: float
    target_pct: float
    status: Literal["low", "on_track", "high"]


class BudgetAllocatorOutput(BaseModel):
    total_income: float
    total_allocated: float
    surplus_deficit: float
    needs_pct: float
    wants_pct: float
    invest_pct: float
    status: Literal["balanced", "surplus", "deficit"]
    feedback: str
    target_comparison: list[BudgetCategoryStatus]


_TARGETS: dict[str, float] = {"needs": 50.0, "wants": 30.0, "invest": 20.0}


def _category_status(actual: float, target: float) -> Literal["low", "on_track", "high"]:
    if abs(actual - target) <= 5:
        return "on_track"
    return "low" if actual < target else "high"


def _budget_feedback(comparison: list[BudgetCategoryStatus], status: str) -> str:
    if status == "deficit":
        prefix = "Your allocations exceed income; you're in deficit. "
    elif status == "surplus":
        prefix = "You're allocating less than your income — surplus available. "
    else:
        prefix = ""
    # Prefer the largest over-target deviation — that's the actionable insight
    # (being under-target on wants or invest is rarely the urgent number).
    over_target = [c for c in comparison if c.actual_pct - c.target_pct > 0]
    if over_target:
        worst = max(over_target, key=lambda c: c.actual_pct - c.target_pct)
    else:
        worst = max(comparison, key=lambda c: abs(c.actual_pct - c.target_pct))
    gap = worst.actual_pct - worst.target_pct
    direction = "above" if gap > 0 else "below"
    return (
        f"{prefix}{worst.category.title()} sits at {worst.actual_pct:.1f}% "
        f"({abs(gap):.1f} pts {direction} the {worst.target_pct:.0f}% target)."
    )


def budget_allocator(inp: BudgetAllocatorInput) -> BudgetAllocatorOutput:
    total_allocated = inp.needs + inp.wants + inp.invest
    surplus_deficit = inp.income_monthly - total_allocated

    income_for_pct = inp.income_monthly if inp.income_monthly > 0 else 1.0
    needs_pct = inp.needs / income_for_pct * 100.0
    wants_pct = inp.wants / income_for_pct * 100.0
    invest_pct = inp.invest / income_for_pct * 100.0

    if abs(surplus_deficit) <= 1.0:
        status: Literal["balanced", "surplus", "deficit"] = "balanced"
    elif surplus_deficit > 0:
        status = "surplus"
    else:
        status = "deficit"

    comparison = [
        BudgetCategoryStatus(
            category="needs",
            actual_pct=_round2(needs_pct),
            target_pct=_TARGETS["needs"],
            status=_category_status(needs_pct, _TARGETS["needs"]),
        ),
        BudgetCategoryStatus(
            category="wants",
            actual_pct=_round2(wants_pct),
            target_pct=_TARGETS["wants"],
            status=_category_status(wants_pct, _TARGETS["wants"]),
        ),
        BudgetCategoryStatus(
            category="invest",
            actual_pct=_round2(invest_pct),
            target_pct=_TARGETS["invest"],
            status=_category_status(invest_pct, _TARGETS["invest"]),
        ),
    ]

    return BudgetAllocatorOutput(
        total_income=_round2(inp.income_monthly),
        total_allocated=_round2(total_allocated),
        surplus_deficit=_round2(surplus_deficit),
        needs_pct=_round2(needs_pct),
        wants_pct=_round2(wants_pct),
        invest_pct=_round2(invest_pct),
        status=status,
        feedback=_budget_feedback(comparison, status),
        target_comparison=comparison,
    )


# ---------------------------------------------------------------------------
# net_worth_analyzer
# ---------------------------------------------------------------------------


class NetWorthItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    value: float = Field(ge=0)


class NetWorthInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lifestyle_assets: list[NetWorthItem] = Field(default_factory=list)
    income_generating_assets: list[NetWorthItem] = Field(default_factory=list)
    liabilities: list[NetWorthItem] = Field(default_factory=list)


class NetWorthOutput(BaseModel):
    total_lifestyle_assets: float
    total_income_generating_assets: float
    total_assets: float
    total_liabilities: float
    net_worth: float
    income_generating_pct_of_net_worth: float
    interpretation: str


def _net_worth_interpretation(income_generating_pct: float, net_worth: float) -> str:
    if net_worth <= 0:
        return (
            "Net worth is at or below zero. The Phase 1 priority is killing "
            "consumer debt and building an emergency buffer (Steps 5 + 4A)."
        )
    rounded = round(income_generating_pct)
    if rounded < 20:
        tail = "below the 20% Foundation marker — focus on building Bucket 2 (wealth)."
    elif rounded < 40:
        tail = "between Foundation and Momentum — keep growing the income-generating slice."
    elif rounded < 60:
        tail = "approaching the Freedom benchmark of 40%+."
    else:
        tail = "at or above the 60%+ Abundance benchmark."
    return (
        f"{rounded}% of your net worth is income-generating — {tail} "
        "Healthy households target 60%+ over time."
    )


def net_worth_analyzer(inp: NetWorthInput) -> NetWorthOutput:
    total_lifestyle = sum(i.value for i in inp.lifestyle_assets)
    total_income_generating = sum(i.value for i in inp.income_generating_assets)
    total_liabilities = sum(i.value for i in inp.liabilities)
    total_assets = total_lifestyle + total_income_generating
    net_worth = total_assets - total_liabilities

    pct_base = max(net_worth, 1.0)  # guard div-by-zero
    income_generating_pct = total_income_generating / pct_base * 100.0
    if net_worth <= 0:
        income_generating_pct = 0.0

    return NetWorthOutput(
        total_lifestyle_assets=_round2(total_lifestyle),
        total_income_generating_assets=_round2(total_income_generating),
        total_assets=_round2(total_assets),
        total_liabilities=_round2(total_liabilities),
        net_worth=_round2(net_worth),
        income_generating_pct_of_net_worth=_round2(income_generating_pct),
        interpretation=_net_worth_interpretation(income_generating_pct, net_worth),
    )


# ---------------------------------------------------------------------------
# Dispatch helpers (used by /content/examples/{code}/calculate)
# ---------------------------------------------------------------------------


CALCULATORS = {
    "compound_interest": (CompoundInterestInput, compound_interest),
    "debt_analysis": (DebtAnalysisInput, debt_analysis),
    "budget_allocator": (BudgetAllocatorInput, budget_allocator),
    "net_worth_analyzer": (NetWorthInput, net_worth_analyzer),
}


__all__ = [
    "CALCULATORS",
    "BudgetAllocatorInput",
    "BudgetAllocatorOutput",
    "CompoundInterestInput",
    "CompoundInterestOutput",
    "DebtAccount",
    "DebtAnalysisInput",
    "DebtAnalysisOutput",
    "NetWorthInput",
    "NetWorthOutput",
    "PRIME_RATE_PCT",
    "budget_allocator",
    "compound_interest",
    "debt_analysis",
    "net_worth_analyzer",
]
