"""Authored feedback strings for Phase 4 worksheets.

Per-worksheet feedback rules live here so tests can assert against the same
constants the service emits. Each rule produces a ``Feedback`` payload of:

    {
        "status": "on_track" | "needs_attention" | "critical",
        "message": "<one-line summary>",
        "recommendations": ["<bullet>", ...],
    }
"""

from __future__ import annotations

from typing import Literal

FeedbackStatus = Literal["on_track", "needs_attention", "critical"]


# ---------------------------------------------------------------------------
# APP-A — Zero-Based Budget
# ---------------------------------------------------------------------------

APP_A_RECS_HIGH_NEEDS = (
    "Review bond affordability or refinance options.",
    "Audit recurring subscriptions and discretionary fixed costs.",
    "Tackle the highest-rate consumer debt to free up monthly minimums.",
)
APP_A_RECS_LOW_INVEST = (
    "Direct an extra R500–R2,000/month into your TFSA or RA.",
    "Schedule annual contribution increases tied to salary reviews.",
)
APP_A_RECS_BALANCED = (
    "Lock in monthly increases as income grows.",
    "Run the Net Worth Statement (Appendix B) next quarter.",
)


# ---------------------------------------------------------------------------
# APP-B — Net Worth Statement
# ---------------------------------------------------------------------------

APP_B_RECS_LOW_PCT = (
    "Shift surplus into income-generating assets (TFSA, RA, discretionary unit trusts).",
    "Run the compound-interest calculator (WE-3) to model a 20-year shift.",
    "Reduce lifestyle-asset additions (vehicles, holiday assets) for the next 24 months.",
)
APP_B_RECS_MID_PCT = (
    "Keep increasing TFSA / RA contributions toward the annual cap.",
    "Consider a rental property or offshore allocation to diversify income-generating assets.",
)
APP_B_RECS_HIGH_PCT = (
    "You're approaching Abundance — focus on tax structures (trust, offshore) and estate planning.",
)


# ---------------------------------------------------------------------------
# APP-C — Risk Cover Review Checklist
# ---------------------------------------------------------------------------

APP_C_CRITICAL_ITEMS: dict[tuple[str, str], str] = {
    ("life_cover", "policy_active"): "Activate life cover sized for debt + 10–15× annual income.",
    ("life_cover", "sum_assured_meets_target"): "Top up life cover to 10–15× annual income.",
    (
        "disability_income_protection",
        "income_protection_monthly",
    ): "Put monthly income protection in place (≥75% of salary).",
    ("will_estate", "will_valid"): "Draft or refresh your will and have it signed within 30 days.",
}


# ---------------------------------------------------------------------------
# APP-D — Debt Disclosure
# ---------------------------------------------------------------------------

APP_D_RECS_HIGH_RATE = (
    "Run the debt calculator (WE-1) with the Avalanche method to attack the highest-rate balance.",
    "Consider the Debtonator™ approach (WE-12) for credit-card balances above 20%.",
    "Stop using credit cards for discretionary spending until the rate-weighted average is below 15%.",
)
APP_D_RECS_MID_RATE = (
    "Keep paying minimums on bond + vehicle; redirect any surplus to the highest-rate account.",
    "Re-quote vehicle finance with 2+ providers — refinance can shave 1–2% off the rate.",
)
APP_D_RECS_LOW_RATE = (
    "Debt is well-priced. Focus the next month's surplus on investing (Step 6).",
)


# ---------------------------------------------------------------------------
# APP-E / APP-F — completion-only worksheets
# ---------------------------------------------------------------------------

APP_E_RECS_COMPLETE = (
    "Lock the next conversation into the calendar — same time every month.",
    "Close on a forward-looking item; never end on blame.",
)
APP_E_RECS_INCOMPLETE = (
    "Block 30 minutes on the calendar and complete the three sections together.",
)

APP_F_RECS_INCOMPLETE = (
    "Fill the Personal + Assets sections first — they unlock the most for your family in an emergency.",
    "Store the Life File in a known location and share access with your executor.",
)
APP_F_RECS_COMPLETE = ("Set a calendar reminder to review the Life File annually.",)


__all__ = [
    "APP_A_RECS_BALANCED",
    "APP_A_RECS_HIGH_NEEDS",
    "APP_A_RECS_LOW_INVEST",
    "APP_B_RECS_HIGH_PCT",
    "APP_B_RECS_LOW_PCT",
    "APP_B_RECS_MID_PCT",
    "APP_C_CRITICAL_ITEMS",
    "APP_D_RECS_HIGH_RATE",
    "APP_D_RECS_LOW_RATE",
    "APP_D_RECS_MID_RATE",
    "APP_E_RECS_COMPLETE",
    "APP_E_RECS_INCOMPLETE",
    "APP_F_RECS_COMPLETE",
    "APP_F_RECS_INCOMPLETE",
    "FeedbackStatus",
]
