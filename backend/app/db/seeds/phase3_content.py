"""Idempotent seed for Phase 3 content_metadata.

Loads three classes of content described in
``/Users/cornels/Downloads/files/wealth_index.md``:

- 6-step framework (STEP-1 … STEP-6, with STEP-4A and STEP-4B as separate rows)
- 13 worked examples (WE-1 … WE-13)
- 15 case studies (CS-001 … CS-015)

Run inline:

    python -m app.db.seeds.phase3_content

The script INSERTs missing rows and UPDATEs existing rows in place (idempotent
- matches on ``content_code``). Safe to invoke after every migration; safe to
re-run during development.
"""

from __future__ import annotations

import asyncio
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_session_factory
from app.db.models import ContentMetadata

# ---------------------------------------------------------------------------
# 6-Step Framework
# ---------------------------------------------------------------------------

STEPS: list[dict[str, Any]] = [
    {
        "content_code": "STEP-1",
        "title": "Financial GPS",
        "summary": "Know your position; define your destination.",
        "description": (
            "Step 1 anchors the journey. You can't plan if you don't know where you "
            "stand. Financial GPS is the act of measuring two coordinates (current "
            "wealth stage and a destination sentence) so every subsequent decision "
            "has a reference point."
        ),
        "parent_step": 1,
        "stage_relevance": ["Foundation", "Momentum", "Freedom", "Independence", "Abundance"],
        "detail": {
            "step_number": "1",
            "subtitle": "Know your position",
            "core_concept": "Know where you are; define destination.",
            "key_metrics": ["Current stage", "Destination sentence"],
            "time_estimate_minutes": 90,
            "related_example_codes": ["WE-8"],
            "related_worksheet_codes": ["APP-G", "APP-B"],
            "body_markdown": (
                "**Financial GPS** is the diagnostic step. Take the 10-question "
                "self-assessment (Appendix G) to land on a stage, then write down "
                "a one-sentence destination ('We want passive income of R45k/month "
                "by age 60'). This pair becomes the reference for every Step 2-6 "
                "decision."
            ),
        },
    },
    {
        "content_code": "STEP-2",
        "title": "Zero-Based Budget",
        "summary": "Every rand has a job.",
        "description": (
            "A zero-based budget allocates every rand of income to needs, wants, "
            "investing, or buffering, until the remainder is zero. The discipline "
            "kills the 'where did it go?' problem that funds invisible drains."
        ),
        "parent_step": 2,
        "stage_relevance": ["Foundation", "Momentum", "Freedom"],
        "detail": {
            "step_number": "2",
            "subtitle": "Every rand has a job",
            "core_concept": "Income − (Needs + Wants + Invest) = R0",
            "key_metrics": ["Total income", "Allocation by category", "Surplus"],
            "time_estimate_minutes": 120,
            "related_example_codes": ["WE-7"],
            "related_worksheet_codes": ["APP-A", "APP-D"],
            "body_markdown": (
                "Build the budget bottom-up using Appendix A's nine Needs / six "
                "Wants / six Invest categories. The 50/30/20 target is a starting "
                "frame; actual households often land at 71/8/21 (see WE-7). The "
                "value is in the conversation about *why* the split looks the way "
                "it does."
            ),
        },
    },
    {
        "content_code": "STEP-3",
        "title": "Money Matrix",
        "summary": "The four numbers: Income / Expenses / Surplus / Assets.",
        "description": (
            "Money Matrix is the dashboard. Four numbers (Income, Expenses, "
            "Surplus, Assets) tell you whether the plan is working. The asset "
            "view distinguishes lifestyle assets from income-generating assets, "
            "which is where most households discover they're 'asset-rich but "
            "income-poor'."
        ),
        "parent_step": 3,
        "stage_relevance": ["Momentum", "Freedom", "Independence"],
        "detail": {
            "step_number": "3",
            "subtitle": "The four numbers",
            "core_concept": "Income / Expenses / Surplus / Assets",
            "key_metrics": [
                "Net worth",
                "% income-generating assets",
                "Monthly surplus",
            ],
            "time_estimate_minutes": 60,
            "related_example_codes": ["WE-8"],
            "related_worksheet_codes": ["APP-B"],
            "body_markdown": (
                "Complete Appendix B (Net Worth Statement). Total it. Then ask "
                "the central question: *what percentage of net worth is "
                "income-generating?* Healthy households aim for 60%+ by "
                "Independence. WE-8 (Hennie) shows a R8.55m household with only "
                "R4k/month passive income: high net worth, low income engine."
            ),
        },
    },
    {
        "content_code": "STEP-4A",
        "title": "Risk Cover: Households",
        "summary": "Protect the plan: Life / Medical / Disability / Assets.",
        "description": (
            "Step 4A is the protective layer for every household. Four pillars: "
            "Life, Medical, Disability + Income Protection, and Short-Term "
            "Insurance. Each pillar has a benchmark (life cover at 10-15× income, "
            "short-term insurance at 1.5-2.5% of gross household income)."
        ),
        "parent_step": 4,
        "stage_relevance": ["Foundation", "Momentum", "Freedom", "Independence", "Abundance"],
        "detail": {
            "step_number": "4a",
            "subtitle": "Protect the plan",
            "core_concept": "Four pillars: Life / Medical / Disability / Assets",
            "key_metrics": ["Cover ratio vs benchmark", "Last review date"],
            "time_estimate_minutes": 90,
            "related_example_codes": ["WE-9"],
            "related_worksheet_codes": ["APP-C"],
            "body_markdown": (
                "Run Appendix C every 12 months. Pull a fresh quote from at least "
                "two providers; the test isn't 'do I have cover' but 'is the "
                "cover right-sized and still cost-effective?'."
            ),
        },
    },
    {
        "content_code": "STEP-4B",
        "title": "Risk Cover: Business Owners",
        "summary": "Three additional policies for business owners.",
        "description": (
            "Step 4B sits alongside 4A for business owners. Key-person cover, "
            "buy-and-sell cover, and contingent liability cover protect the "
            "business and the personal balance sheet from one bad day."
        ),
        "parent_step": 4,
        "stage_relevance": ["Momentum", "Freedom", "Independence", "Abundance"],
        "detail": {
            "step_number": "4b",
            "subtitle": "Protect the business",
            "core_concept": "Key-person / Buy-sell / Contingent liability",
            "key_metrics": ["Key-person sum insured", "Buy-sell agreement currency"],
            "time_estimate_minutes": 60,
            "related_example_codes": [],
            "related_worksheet_codes": ["APP-C"],
            "body_markdown": (
                "If you own >25% of a business, sit with a broker who handles "
                "business cover specifically. Personal life cover doesn't replace "
                "a buy-and-sell agreement; sureties on business debt don't "
                "disappear when you do."
            ),
        },
    },
    {
        "content_code": "STEP-5",
        "title": "Debt Optimisation",
        "summary": "Snowball vs Avalanche vs Debtonator™.",
        "description": (
            "Debt isn't homogenous. Asset-building debt (bond, business) is "
            "near-prime and tolerable; vehicle debt is borderline; consumer debt "
            "at 20-30% is the chain that has to come off first. Step 5 picks the "
            "elimination strategy (Snowball / Avalanche / Debtonator™) and "
            "executes."
        ),
        "parent_step": 5,
        "stage_relevance": ["Foundation", "Momentum"],
        "detail": {
            "step_number": "5",
            "subtitle": "Break the chains",
            "core_concept": "Snowball vs Avalanche vs Debtonator™",
            "key_metrics": ["Months to debt-free", "Interest avoided"],
            "time_estimate_minutes": 60,
            "related_example_codes": ["WE-1", "WE-12", "WE-13"],
            "related_worksheet_codes": ["APP-D"],
            "body_markdown": (
                "Complete Appendix D (Debt Disclosure). Run all three methods "
                "through the calculator. Snowball wins on psychology; Avalanche "
                "wins on math; Debtonator™ uses the access bond as a velocity "
                "lever: draw cheap money against the bond, settle expensive "
                "debt, repay the bond from freed-up payments."
            ),
        },
    },
    {
        "content_code": "STEP-6",
        "title": "Investment",
        "summary": "Compound quietly: TFSA + RA + Offshore + Bucket 3.",
        "description": (
            "Step 6 is where time does the work. The South African toolkit is "
            "TFSA (R36k/yr cap; tax-free), Section 11F retirement annuity "
            "(27.5% deductible, capped R350k/yr), discretionary unit trusts, "
            "offshore allocation, and a Bucket 3 'dream fund' for 5-10yr goals."
        ),
        "parent_step": 6,
        "stage_relevance": ["Foundation", "Momentum", "Freedom", "Independence", "Abundance"],
        "detail": {
            "step_number": "6",
            "subtitle": "Compound quietly",
            "core_concept": "TFSA + RA + Offshore + Bucket 3",
            "key_metrics": [
                "Monthly contribution",
                "% income invested",
                "Projected FV at retirement",
            ],
            "time_estimate_minutes": 90,
            "related_example_codes": [
                "WE-3",
                "WE-4",
                "WE-5",
                "WE-6",
                "WE-11",
                "WE-14",
                "WE-15",
            ],
            "related_worksheet_codes": [],
            "body_markdown": (
                "Fill the tax-advantaged buckets first (TFSA + RA), then move to "
                "discretionary and offshore. WE-3 / WE-4 / WE-5 show why time "
                "horizon matters more than contribution amount; every decade of "
                "delay roughly halves the retirement outcome."
            ),
        },
    },
]


# ---------------------------------------------------------------------------
# Worked Examples (WE-1 … WE-13)
# ---------------------------------------------------------------------------


def _ci_inputs(monthly: float, years: int, rate: float, *, initial: float = 0.0) -> dict:
    """Standard compound-interest calculator config with named defaults."""
    return {
        "inputs": [
            {
                "name": "monthly_contribution",
                "label": "Monthly contribution (R)",
                "type": "number",
                "default": monthly,
                "min": 0,
                "max": 100_000,
                "step": 500,
                "format": "currency",
            },
            {
                "name": "initial_amount",
                "label": "Initial lump sum (R)",
                "type": "number",
                "default": initial,
                "min": 0,
                "max": 10_000_000,
                "step": 1_000,
                "format": "currency",
            },
            {
                "name": "years",
                "label": "Years",
                "type": "number",
                "default": years,
                "min": 1,
                "max": 60,
                "step": 1,
                "format": "integer",
            },
            {
                "name": "annual_rate_pct",
                "label": "Annual growth rate (%)",
                "type": "number",
                "default": rate,
                "min": 0,
                "max": 25,
                "step": 0.5,
                "format": "percent",
            },
            {
                "name": "withdrawal_rate_pct",
                "label": "Safe withdrawal rate (%)",
                "type": "number",
                "default": 4,
                "min": 0,
                "max": 10,
                "step": 0.25,
                "format": "percent",
            },
        ],
        "interpretation_template": (
            "At R{monthly_contribution}/month for {years} years at {annual_rate_pct} "
            "growth, you accumulate R{final_amount}, generating R{monthly_passive_income}/month "
            "in passive income at the {withdrawal_rate_pct} safe-withdrawal rate."
        ),
    }


def _budget_inputs() -> dict:
    return {
        "inputs": [
            {
                "name": "income_monthly",
                "label": "Monthly take-home (R)",
                "type": "number",
                "default": 45_000,
                "min": 0,
                "max": 1_000_000,
                "step": 500,
                "format": "currency",
            },
            {
                "name": "needs",
                "label": "Needs (R)",
                "type": "number",
                "default": 32_000,
                "min": 0,
                "max": 1_000_000,
                "step": 500,
                "format": "currency",
            },
            {
                "name": "wants",
                "label": "Wants (R)",
                "type": "number",
                "default": 3_500,
                "min": 0,
                "max": 1_000_000,
                "step": 500,
                "format": "currency",
            },
            {
                "name": "invest",
                "label": "Invest (R)",
                "type": "number",
                "default": 9_500,
                "min": 0,
                "max": 1_000_000,
                "step": 500,
                "format": "currency",
            },
        ],
        "interpretation_template": (
            "Needs sit at {needs_pct} (target 50%), wants at {wants_pct} (target 30%), "
            "invest at {invest_pct} (target 20%). Overall: {status}."
        ),
    }


def _debt_inputs(default_debts: list[dict[str, Any]], surplus: float, method: str) -> dict:
    return {
        "inputs": [
            {
                "name": "debts",
                "label": "Debts",
                "type": "array",
                "default": default_debts,
                "min_items": 1,
                "max_items": 20,
                "item_schema": [
                    {"name": "name", "label": "Account", "type": "text"},
                    {
                        "name": "balance",
                        "label": "Balance",
                        "type": "number",
                        "format": "currency",
                        "min": 0,
                    },
                    {
                        "name": "annual_rate_pct",
                        "label": "Rate",
                        "type": "number",
                        "format": "percent",
                        "min": 0,
                        "max": 50,
                    },
                    {
                        "name": "minimum_payment",
                        "label": "Minimum",
                        "type": "number",
                        "format": "currency",
                        "min": 0,
                    },
                ],
            },
            {
                "name": "surplus_available",
                "label": "Extra monthly surplus (R)",
                "type": "number",
                "default": surplus,
                "min": 0,
                "max": 100_000,
                "step": 100,
                "format": "currency",
            },
            {
                "name": "method",
                "label": "Method",
                "type": "select",
                "default": method,
                "options": ["snowball", "avalanche", "debtonator"],
            },
        ],
        "interpretation_template": (
            "Total debt of R{total_debt} cleared in {debt_free_months} months using {method} "
            "method; total interest paid R{total_interest_paid}."
        ),
    }


def _net_worth_inputs() -> dict:
    return {
        "inputs": [
            {
                "name": "lifestyle_assets",
                "label": "Lifestyle assets",
                "type": "array",
                "default": [
                    {"name": "Primary home", "value": 4_500_000},
                    {"name": "Vehicles", "value": 850_000},
                ],
                "min_items": 0,
                "max_items": 20,
                "item_schema": [
                    {"name": "name", "label": "Asset", "type": "text"},
                    {
                        "name": "value",
                        "label": "Value",
                        "type": "number",
                        "format": "currency",
                        "min": 0,
                    },
                ],
            },
            {
                "name": "income_generating_assets",
                "label": "Income-generating assets",
                "type": "array",
                "default": [
                    {"name": "Retirement annuity", "value": 1_200_000},
                    {"name": "TFSA", "value": 500_000},
                ],
                "min_items": 0,
                "max_items": 20,
                "item_schema": [
                    {"name": "name", "label": "Asset", "type": "text"},
                    {
                        "name": "value",
                        "label": "Value",
                        "type": "number",
                        "format": "currency",
                        "min": 0,
                    },
                ],
            },
            {
                "name": "liabilities",
                "label": "Liabilities",
                "type": "array",
                "default": [{"name": "Bond", "value": 3_100_000}],
                "min_items": 0,
                "max_items": 20,
                "item_schema": [
                    {"name": "name", "label": "Liability", "type": "text"},
                    {
                        "name": "value",
                        "label": "Balance",
                        "type": "number",
                        "format": "currency",
                        "min": 0,
                    },
                ],
            },
        ],
        "interpretation_template": (
            "Net worth: R{net_worth}. {income_generating_pct_of_net_worth} is "
            "income-generating. Healthy households target 60%+ over time."
        ),
    }


EXAMPLES: list[dict[str, Any]] = [
    {
        "content_code": "WE-1",
        "title": "R30,000 at 24% Interest",
        "summary": "R30k credit card balance, R1,500/mo payment → ~24 months to clear, ~R6.7k interest.",
        "description": (
            "A R30,000 credit card balance at 24% p.a. (2%/month). With a fixed "
            "R1,500/month payment the math is unforgiving: every month the "
            "balance accrues R600 interest on day one, so only R900 of each "
            "payment actually attacks principal. Even the textbook outcome is "
            "stark, and the book's narrative variant (which uses a *declining* "
            "5% minimum) stretches this to 8-9 years. Either way: expensive debt "
            "destroys plans."
        ),
        "parent_step": 5,
        "stage_relevance": ["Foundation", "Momentum"],
        "calculator_type": "debt_analysis",
        "calculator_config": _debt_inputs(
            [
                {
                    "name": "Credit Card",
                    "balance": 30_000,
                    "annual_rate_pct": 24,
                    "minimum_payment": 1_500,
                }
            ],
            surplus=0,
            method="avalanche",
        ),
        "detail": {
            "step_number": "5",
            "chapter": "Step 5: Debt Optimisation",
            "key_principle": "Compounding works against you with expensive debt.",
            "key_takeaway": "A fixed minimum payment is mathematically tractable; the percentage minimum used in most credit-card agreements is what creates 8+ year horizons.",
            "educational_text": (
                "Use the calculator with a fixed R1,500/month payment to see the "
                "*best case* outcome. The book's longer payoff timeline (8-9 years, "
                "R21-26k interest) comes from credit cards' standard 'pay 5% of "
                "current balance' minimum, which decreases as the balance "
                "decreases, perpetually pushing the payoff horizon out."
            ),
            "related_example_codes": ["WE-12", "WE-13"],
        },
    },
    {
        "content_code": "WE-2",
        "title": "R30k drawn from Savings Pot",
        "summary": "Withdraw R30k at 45 → receive ~R19.2k after tax; forfeit R201.8k of compounding by 65.",
        "description": (
            "A R30,000 withdrawal from the Two-Pot Savings Pot at age 45 with a "
            "36% marginal tax rate yields ~R19,200 cash in hand. Left invested "
            "at 10% nominal for 20 years that same R30,000 would have compounded "
            "to roughly R201,800. The headline cost isn't the tax. It's the "
            "foregone compounding."
        ),
        "parent_step": 6,
        "stage_relevance": ["Momentum", "Freedom"],
        "calculator_type": None,
        "calculator_config": None,
        "detail": {
            "step_number": "6",
            "chapter": "Step 6: Investment",
            "key_principle": "Savings Pot withdrawals trade visible cash for invisible compounding.",
            "key_takeaway": "Treat the Savings Pot like a true emergency reserve: taking it ahead of retirement is rarely worth what it costs.",
            "educational_text": (
                "The Two-Pot System (post-Sept 2024) splits new retirement "
                "contributions 1/3 Savings Pot, 2/3 Retirement Pot. Savings Pot "
                "withdrawals are taxed at marginal rates and break the compounding "
                "chain. Use the compound-interest calculator on a R30k lump sum to "
                "model the foregone growth."
            ),
            "related_example_codes": ["WE-9", "WE-10"],
        },
    },
    {
        "content_code": "WE-3",
        "title": "R5k/month for 25 years",
        "summary": "Age 35→60 at 10% p.a. → ~R6.6m at retirement; R22.1k/month passive (4% rule).",
        "description": (
            "The headline example. R5,000/month invested from age 35 to 60 "
            "compounding monthly at 10% nominal grows to ~R6.6m (the book "
            "rounds to R6.4m; the standard formula yields ~R6.63m). At the 4% "
            "safe-withdrawal rate that supplies R22.1k/month of passive income, "
            "indefinitely."
        ),
        "parent_step": 6,
        "stage_relevance": ["Foundation", "Momentum", "Freedom"],
        "calculator_type": "compound_interest",
        "calculator_config": _ci_inputs(monthly=5_000, years=25, rate=10),
        "detail": {
            "step_number": "6",
            "chapter": "Step 6: Investment",
            "key_principle": "Magic of consistent monthly saving + time horizon.",
            "key_takeaway": "Time horizon beats contribution amount.",
            "educational_text": (
                "WE-3 anchors the entire investment chapter. Adjust the slider on "
                "monthly contribution or years; notice how *years* moves the "
                "outcome dramatically more than contribution. That's the lever "
                "WE-4 and WE-5 push on next."
            ),
            "related_example_codes": ["WE-4", "WE-5", "WE-6"],
        },
    },
    {
        "content_code": "WE-4",
        "title": "Nomvula vs Themba",
        "summary": "Same R5k/month, different timing: early starter beats late starter by ~R5m.",
        "description": (
            "Nomvula contributes R5,000/month for 10 years (age 25-35) then stops "
            "and lets the balance compound for 25 more years to age 60. Themba "
            "starts at 35 and contributes for 25 consecutive years to 60. Both at "
            "10% p.a. Nomvula's earlier start (despite contributing one-third "
            "of what Themba contributes) produces ~R12.3m vs Themba's ~R6.6m."
        ),
        "parent_step": 6,
        "stage_relevance": ["Foundation", "Momentum", "Freedom"],
        "calculator_type": "compound_interest",
        "calculator_config": _ci_inputs(monthly=5_000, years=25, rate=10),
        "detail": {
            "step_number": "6",
            "chapter": "Step 6: Investment",
            "key_principle": "Time horizon > contribution amount.",
            "key_takeaway": "Starting early, even with a smaller total contribution, wins.",
            "educational_text": (
                "Model Themba's scenario directly with the defaults (R5k/month × "
                "25 years). For Nomvula's, run R5k/month for 10 years, take the "
                "final_amount, then re-run with initial_amount = that figure, "
                "monthly_contribution = 0, years = 25."
            ),
            "related_example_codes": ["WE-3", "WE-5"],
        },
    },
    {
        "content_code": "WE-5",
        "title": "Cost of Waiting",
        "summary": "R3k/month at 10%: start age 18 → R26.5m at 65; start age 40 → R3.6m.",
        "description": (
            "Four investors all contribute R3,000/month at 10% nominal until age "
            "65. The only variable is start age. From 18: ~R26.5m. From 25: "
            "~R15.9m. From 30: ~R9.7m. From 40: ~R3.6m. Every decade of delay "
            "roughly halves the retirement outcome."
        ),
        "parent_step": 6,
        "stage_relevance": ["Foundation", "Momentum", "Freedom"],
        "calculator_type": "compound_interest",
        "calculator_config": _ci_inputs(monthly=3_000, years=47, rate=10),
        "detail": {
            "step_number": "6",
            "chapter": "Step 6: Investment",
            "key_principle": "Every decade of delay ≈ halves the result.",
            "key_takeaway": "The cost of waiting compounds against you.",
            "educational_text": (
                "Sweep the `years` input from 25 → 35 → 40 → 47 (matching ages 40, "
                "30, 25, 18 to retirement at 65). The output series is the most "
                "persuasive single chart in the book."
            ),
            "related_example_codes": ["WE-3", "WE-4", "WE-6"],
        },
    },
    {
        "content_code": "WE-6",
        "title": "R5-A-Day Child",
        "summary": "R150/month from birth to age 18, then idle to 65 at 10% → ~R8.9m (book quote: R1.9m).",
        "description": (
            "R5/day (R150/month) contributed from birth to age 18, then left to "
            "compound to age 65. Standard monthly compounding at 10% gives ~R8.9m. "
            "The book's R1.9m figure assumes a lower effective rate (~6%); the "
            "calculator will reflect whatever rate you set."
        ),
        "parent_step": 6,
        "stage_relevance": ["Foundation", "Momentum", "Freedom", "Independence"],
        "calculator_type": "compound_interest",
        "calculator_config": _ci_inputs(monthly=150, years=18, rate=10),
        "detail": {
            "step_number": "6",
            "chapter": "Step 6: Investment",
            "key_principle": "Time horizon is the great equaliser: even tiny contributions matter when started early.",
            "key_takeaway": "A R5/day gift at birth becomes life-changing by retirement.",
            "educational_text": (
                "The 18-year contribution phase produces around R90k. From there "
                "the 47-year idle phase is pure compounding; try setting "
                "monthly_contribution=0, initial_amount=90000, years=47 to see "
                "the second leg."
            ),
            "related_example_codes": ["WE-3", "WE-4", "WE-5"],
        },
    },
    {
        "content_code": "WE-7",
        "title": "Zero-Based Budget: R45k household",
        "summary": "R45k take-home: Needs R32k (71%), Wants R3.5k (8%), Invest R9.5k (21%).",
        "description": (
            "A real R45,000/month household budget. Needs absorb 71% (well above "
            "the 50% target), Wants 8% (well below 30%), Invest 21% (close to "
            "20%). The story matters more than the numbers; most households "
            "don't realise how much of 'wants' has been re-classified as 'needs' "
            "until they run the exercise."
        ),
        "parent_step": 2,
        "stage_relevance": ["Foundation", "Momentum"],
        "calculator_type": "budget_allocator",
        "calculator_config": _budget_inputs(),
        "detail": {
            "step_number": "2",
            "chapter": "Step 2: Zero-Based Budget",
            "key_principle": "Real household allocations often exceed the 50/30/20 targets.",
            "key_takeaway": "Track the gap between target and reality. That gap is the conversation.",
            "educational_text": (
                "Run your own numbers through the allocator. If Needs > 60% the "
                "structural question is bond/vehicle/school affordability, not "
                "discretionary spending. Step 5 (Debt) and Step 4 (Cover) are "
                "where the bigger levers live."
            ),
            "related_example_codes": ["WE-8"],
        },
    },
    {
        "content_code": "WE-8",
        "title": "Hennie's Net Worth",
        "summary": "R8.55m total assets, R5.45m net worth, only R4k/month passive income.",
        "description": (
            "Hennie's balance sheet looks healthy on paper: R8.55m in assets, "
            "R3.1m bond, R5.45m net worth. But only ~R900k is income-generating; "
            "the rest is lifestyle (primary home, vehicles, contents). At a 4% "
            "withdrawal rate that's R3,000-R4,000/month of passive income."
        ),
        "parent_step": 3,
        "stage_relevance": ["Momentum", "Freedom"],
        "calculator_type": "net_worth_analyzer",
        "calculator_config": _net_worth_inputs(),
        "detail": {
            "step_number": "3",
            "chapter": "Step 3: Money Matrix",
            "key_principle": "Lifestyle assets look wealthy; income assets create wealth.",
            "key_takeaway": "Net worth headline ≠ retirement readiness.",
            "educational_text": (
                "The lever isn't 'own more assets', it's 'shift the mix toward "
                "income-generating assets'. Use the net-worth-analyzer with your "
                "own figures and watch what happens to the "
                "`income_generating_pct_of_net_worth` ratio when you move R500k "
                "from a vehicle into a TFSA or RA."
            ),
            "related_example_codes": ["WE-7"],
        },
    },
    {
        "content_code": "WE-9",
        "title": "Vitality Optimisation (Gold Status)",
        "summary": "R53.4k/year of structured benefits captured by an actively-engaged Gold member.",
        "description": (
            "Vitality, Smart Shopper, and similar structured benefits programmes "
            "produce ~R50k/year of real value at Gold status. The catch: you have "
            "to actually use them. Most members capture less than 20% of the "
            "available benefit."
        ),
        "parent_step": 4,
        "stage_relevance": ["Foundation", "Momentum", "Freedom"],
        "calculator_type": None,
        "calculator_config": None,
        "detail": {
            "step_number": "4a",
            "chapter": "Step 4A: Risk Cover (Households)",
            "key_principle": "Structured benefits work only if worked actively.",
            "key_takeaway": "Either commit to the programme or downgrade; partial engagement is the worst-value option.",
            "educational_text": (
                "List the benefits available on your medical aid / insurer. Cross "
                "off any you've used in the last 12 months. The remainder is your "
                "leakage."
            ),
            "related_example_codes": [],
        },
    },
    {
        "content_code": "WE-10",
        "title": "Ilse's RA Tax Relief",
        "summary": "R60k RA contribution × 36% marginal = R21.6k instant tax saving (56% first-year return).",
        "description": (
            "Ilse earns R700k/year and contributes R60k to a retirement annuity. "
            "At a 36% marginal rate she gets R21,600 of tax back, lifting the "
            "first-year return to ~56%, before any investment growth. The "
            "Section 11F leverage is overwhelming for higher earners."
        ),
        "parent_step": 6,
        "stage_relevance": ["Momentum", "Freedom", "Independence"],
        "calculator_type": None,
        "calculator_config": None,
        "detail": {
            "step_number": "6",
            "chapter": "Step 6: Investment",
            "key_principle": "Section 11F leverage for higher earners.",
            "key_takeaway": "The tax refund alone justifies the contribution.",
            "educational_text": (
                "Section 11F allows a deduction of up to 27.5% of taxable income, "
                "capped at R350,000/year. For a higher earner at the 36-45% "
                "marginal bands, every R1 contributed costs only R0.55-R0.64 of "
                "after-tax income."
            ),
            "related_example_codes": ["WE-2"],
        },
    },
    {
        "content_code": "WE-11",
        "title": "TFSA Over a Lifetime",
        "summary": "R3k/month from 25 until the R500k cap is hit → R8m at 65 tax-free; couple = R16m.",
        "description": (
            "Contribute R3,000/month from age 25; you hit the R500,000 lifetime "
            "cap around age 39. Leave the balance to compound at 10% to age 65. "
            "Final value: ~R8m, fully tax-free on withdrawal. A couple maxing "
            "both TFSAs: ~R16m of completely tax-free retirement money."
        ),
        "parent_step": 6,
        "stage_relevance": ["Foundation", "Momentum", "Freedom"],
        "calculator_type": "compound_interest",
        "calculator_config": _ci_inputs(monthly=3_000, years=14, rate=10),
        "detail": {
            "step_number": "6",
            "chapter": "Step 6: Investment",
            "key_principle": "Tax-free growth compounding over decades is unmatched.",
            "key_takeaway": "Max the TFSA first, every year, no exceptions.",
            "educational_text": (
                "Use the compound-interest calculator with monthly=3000, years=14 "
                "to model the contribution phase (you'll hit the R500k cap around "
                "year 14 at 10%). Then take that final balance and re-run with "
                "monthly=0, initial=that-balance, years=26 to model the idle "
                "phase to age 65."
            ),
            "related_example_codes": ["WE-3", "WE-4"],
        },
    },
    {
        "content_code": "WE-12",
        "title": "Debtonator™ Cycle",
        "summary": "Draw R30k against access bond (10.25%), settle R30k credit card (24%): annual saving ~R4k+.",
        "description": (
            "Debtonator™ uses the access bond as a velocity-banking lever. Draw "
            "R30,000 from the bond at the prime rate (10.25%) and use it to "
            "settle a R30,000 credit card at 24%. The credit card is closed "
            "permanently; the bond balance rises by R30,000 but at less than half "
            "the rate. Repay the bond from the freed-up R1,500/month credit-card "
            "payment plus surplus."
        ),
        "parent_step": 5,
        "stage_relevance": ["Momentum", "Freedom"],
        "calculator_type": "debt_analysis",
        "calculator_config": _debt_inputs(
            [
                {
                    "name": "Credit Card",
                    "balance": 30_000,
                    "annual_rate_pct": 24,
                    "minimum_payment": 1_500,
                }
            ],
            surplus=2_000,
            method="debtonator",
        ),
        "detail": {
            "step_number": "5",
            "chapter": "Step 5: Debt Optimisation",
            "key_principle": "Use cheap money to retire expensive money.",
            "key_takeaway": "Debtonator™ only works if the consumer debt actually closes; don't re-borrow.",
            "educational_text": (
                "The implementation in this calculator models Debtonator™ by "
                "reducing the highest-rate debt's effective rate to prime (10.25%) "
                "and then running an Avalanche allocation. Real-world Debtonator™ "
                "is more nuanced (access-bond mechanics, daily interest accrual) "
                "but the headline saving is captured."
            ),
            "related_example_codes": ["WE-1", "WE-13"],
        },
    },
    {
        "content_code": "WE-13",
        "title": "Bond Date-Change Trick",
        "summary": "R1.5m bond, move debit order from 26th to 1st → ~R80-150k saved over the life of the bond.",
        "description": (
            "Most home loans accrue interest daily. Paying earlier in the month "
            "means the interest charge is calculated on a lower running balance. "
            "Shifting a R1.5m bond's debit from the 26th to the 1st saves "
            "R80,000-R150,000 over a 20-year loan: no rate change, no extra "
            "money out, just a date."
        ),
        "parent_step": 5,
        "stage_relevance": ["Momentum", "Freedom", "Independence"],
        "calculator_type": None,
        "calculator_config": None,
        "detail": {
            "step_number": "5",
            "chapter": "Step 5: Debt Optimisation",
            "key_principle": "Timing optimization of daily interest accrual.",
            "key_takeaway": "Free money: phone the bank, move the debit date.",
            "educational_text": (
                "Phase 3 does not ship a dedicated 'daily-interest bond' "
                "calculator; the effect is real but small relative to the four "
                "headline calculators. Model the saving roughly by running the "
                "debt calculator with the bond at prime and noting how interest "
                "accumulates over the simulation."
            ),
            "related_example_codes": ["WE-12"],
        },
    },
]


# ---------------------------------------------------------------------------
# Case studies (CS-001 … CS-015)
# ---------------------------------------------------------------------------

CASE_STUDIES: list[dict[str, Any]] = [
    {
        "content_code": "CS-001",
        "title": "Susan & Johan",
        "summary": "R85k/month → found R90k invisible monthly drain at the kitchen table.",
        "description": "Kitchen-table moment. R85,000/month combined income. Discovered R90,000/month leaking out across uncoded subscriptions, lifestyle creep, and an over-extended bond.",
        "parent_step": 1,
        "stage_relevance": ["Foundation", "Momentum"],
        "detail": {
            "age_band": "Multiple",
            "income_monthly": 85_000,
            "situation": "Two adults, kids at home, R85k/month combined. They ran the budget on a Saturday afternoon and discovered the surplus they thought existed was actually a small monthly deficit, masked by savings withdrawals.",
            "learning": "Start with the honest number. The 20-year plan that followed (Net Worth Statement annually, Step 4A audit, RA top-up, settle two credit cards) lifted them from Foundation to early Freedom over 18 months.",
            "key_insight": "Honesty about the gap is the first move, and it's the move most households skip.",
            "related_step_numbers": ["1", "2"],
            "related_example_codes": ["WE-7"],
        },
    },
    {
        "content_code": "CS-002",
        "title": "Thabo & Lerato",
        "summary": "R65k/month, R180k consumer debt, R8k emergency fund.",
        "description": "Foundation-stage diagnosis. Two professionals at 34/32, R65,000/month combined, but R180k of consumer debt across credit cards and store accounts; R8,000 emergency fund.",
        "parent_step": 1,
        "stage_relevance": ["Foundation"],
        "detail": {
            "age_band": "34/32",
            "income_monthly": 65_000,
            "situation": "Looked successful from the outside (good income, recent flat purchase) but were one missed paycheck away from disaster.",
            "learning": "Honest stage assessment unlocks the right next step: not 'invest more' but 'kill consumer debt, then build emergency fund'.",
            "key_insight": "Stage placement governs strategy: wrong stage, wrong moves.",
            "related_step_numbers": ["1", "5"],
            "related_example_codes": ["WE-1"],
        },
    },
    {
        "content_code": "CS-003",
        "title": "Johan & Marlize van der Merwe",
        "summary": "R150k/month, perceived wealthy; zero income-generating assets.",
        "description": "Senior couple, R150,000/month, primary home valued at R7m, two cars, no consumer debt, and approximately zero income-generating assets outside their RA.",
        "parent_step": 3,
        "stage_relevance": ["Freedom"],
        "detail": {
            "age_band": "Senior/40s",
            "income_monthly": 150_000,
            "situation": "Lifestyle-rich but asset-poor. The R90k Question ('if you both stopped working tomorrow, how long until lifestyle breaks?') produced silence at the kitchen table.",
            "learning": "Income ≠ wealth. The next five years were spent re-routing surplus into Bucket 2 (wealth) instead of Bucket 1 (lifestyle).",
            "key_insight": "High income masks low income-generating assets.",
            "related_step_numbers": ["3"],
            "related_example_codes": ["WE-8"],
        },
    },
    {
        "content_code": "CS-004",
        "title": "Dineo",
        "summary": "Polokwane school principal, R45k/month, owns two rental flats.",
        "description": "Polokwane school principal in her 40s. R45,000/month gross. Owns two paid-off rental flats producing R12,000/month net. Net worth around R3.5m.",
        "parent_step": 3,
        "stage_relevance": ["Momentum", "Freedom"],
        "detail": {
            "age_band": "40s",
            "income_monthly": 45_000,
            "situation": "Modest income, decades of discipline. Started with one flat in her 30s, used the rent + her surplus to pay it off, then bought the second.",
            "learning": "Discipline over income. A R45k/month earner with focus beats a R150k/month earner without it.",
            "key_insight": "Behaviour compounds harder than income.",
            "related_step_numbers": ["3", "6"],
            "related_example_codes": [],
        },
    },
    {
        "content_code": "CS-005",
        "title": "Marius",
        "summary": "R78k/month, R483k consumer debt across 13 accounts.",
        "description": "41 years old, R78k/month, midnight spreadsheet moment when he finally added up every consumer-debt balance: R483,000 across 13 accounts.",
        "parent_step": 5,
        "stage_relevance": ["Momentum"],
        "detail": {
            "age_band": "41",
            "income_monthly": 78_000,
            "situation": "Years of unbudgeted giving (family obligations, religious giving) plus a habit of using store cards for any over-budget purchase. Each account felt small; the total felt impossible.",
            "learning": "The brutal mathematics of expensive debt. Marius ran Snowball for the psychological win (closed three accounts inside six months), then switched to Debtonator™ for the bigger balances.",
            "key_insight": "Make the invisible visible. Once the full list is on paper, the plan writes itself.",
            "related_step_numbers": ["5"],
            "related_example_codes": ["WE-1", "WE-12"],
        },
    },
    {
        "content_code": "CS-006",
        "title": "45-year-old household",
        "summary": "R45k take-home, typical middle-class budget structure.",
        "description": "Composite 45-year-old household used in WE-7. R45,000 take-home produces Needs R32,000 (71%), Wants R3,500 (8%), Invest R9,500 (21%).",
        "parent_step": 2,
        "stage_relevance": ["Foundation", "Momentum"],
        "detail": {
            "age_band": "45",
            "income_monthly": 45_000,
            "situation": "Two earners, bond + one car loan + school fees + medical aid. Tries to invest 20%, gets there most months but lives close to the line.",
            "learning": "Real households often exceed the 50% Needs target. The pragmatic plan accepts 60-70% Needs short-term and works on bond, vehicle, and consumer-debt levers.",
            "key_insight": "Targets are starting frames, not finishing lines.",
            "related_step_numbers": ["2"],
            "related_example_codes": ["WE-7"],
        },
    },
    {
        "content_code": "CS-007",
        "title": "Hennie",
        "summary": "R8.55m net worth, R4k/month passive income: wealth illusion.",
        "description": "52-year-old, R8.55m in total assets, R3.1m bond outstanding, R5.45m net worth. Income-generating slice: R900k → R3,000-R4,000/month at 4% withdrawal.",
        "parent_step": 3,
        "stage_relevance": ["Momentum", "Freedom"],
        "detail": {
            "age_band": "52",
            "income_monthly": None,
            "situation": "On paper, late Freedom stage; in cash-flow reality, still working full-time because passive income covers ~5% of lifestyle.",
            "learning": "Lifestyle assets vs income-generating assets is the most under-appreciated distinction in personal finance.",
            "key_insight": "The mix matters more than the total.",
            "related_step_numbers": ["3"],
            "related_example_codes": ["WE-8"],
        },
    },
    {
        "content_code": "CS-008",
        "title": "Sipho & Linda",
        "summary": "R85k/month combined, executing a 30-year plan from age 32.",
        "description": "32/30 couple, two young children, R85,000/month combined. Mapped a 30-year plan: R17k/month invested now (20%) growing to R73,500/month passive at age 62.",
        "parent_step": 6,
        "stage_relevance": ["Foundation", "Momentum"],
        "detail": {
            "age_band": "32/30",
            "income_monthly": 85_000,
            "situation": "Started with the 10-question assessment, scored Foundation, ran the budget worksheet and decided to invest 20% from day one regardless of stage.",
            "learning": "Plan beats prediction. The 30-year arithmetic gives a destination sentence ('R73.5k/month passive by 62'); every monthly conversation is a course-check against it.",
            "key_insight": "Time + discipline + a number beats luck.",
            "related_step_numbers": ["1", "6"],
            "related_example_codes": ["WE-3", "WE-4"],
        },
    },
    {
        "content_code": "CS-009",
        "title": "Sello",
        "summary": "R30k Savings Pot withdrawal at 45 → R10.8k tax + R201.8k foregone compounding.",
        "description": "Sello, 45, withdrew R30,000 from his Two-Pot Savings Pot to fix a roof. R10,800 went to SARS (36% marginal). Left invested 20 years at 10% nominal, that same R30k would have grown to R201,800.",
        "parent_step": 6,
        "stage_relevance": ["Momentum"],
        "detail": {
            "age_band": "45",
            "income_monthly": None,
            "situation": "Genuine emergency, but the structural answer was 'borrow short-term and protect the retirement compound', not 'tap the savings pot'.",
            "learning": "True cost of accessing Savings Pot is the foregone compounding, not the tax.",
            "key_insight": "The Savings Pot isn't an ATM. It's a last-resort lever.",
            "related_step_numbers": ["6"],
            "related_example_codes": ["WE-2"],
        },
    },
    {
        "content_code": "CS-010",
        "title": "Ilse",
        "summary": "R700k/year, R60k RA contribution at 36% marginal → R21.6k instant tax saving.",
        "description": "Ilse earns R700,000/year and contributes R60,000 to her retirement annuity. Section 11F deduction × 36% marginal rate = R21,600 instant tax saving: a 56% first-year return on the contribution before any investment growth.",
        "parent_step": 6,
        "stage_relevance": ["Freedom", "Independence"],
        "detail": {
            "age_band": "High earner",
            "income_monthly": 58_333,
            "situation": "Higher earner who finally read the Section 11F mechanics and realised her RA contribution was being subsidised by 36% of every rand.",
            "learning": "Section 11F leverage for higher earners is overwhelming: every R1 contributed costs ~R0.64 after tax.",
            "key_insight": "Use the tax code in your favour. Fill the RA up to the cap.",
            "related_step_numbers": ["6"],
            "related_example_codes": ["WE-10"],
        },
    },
    {
        "content_code": "CS-011",
        "title": "Nomvula",
        "summary": "R5k/month age 25-35, then idle; R1.02m at 35 compounds to ~R12.3m by 60.",
        "description": "Starts at 25 with R5,000/month for 10 years. Stops at 35 (career change, lower income). Lets the R1.02m balance compound to age 60 at 10%; final value ~R12.3m.",
        "parent_step": 6,
        "stage_relevance": ["Foundation", "Momentum"],
        "detail": {
            "age_band": "25-60",
            "income_monthly": None,
            "situation": "Got compound interest early, then life happened. She stopped contributing but did not withdraw.",
            "learning": "Early start + leave it alone is the most underrated wealth strategy.",
            "key_insight": "The compounding does the work; you just don't interrupt it.",
            "related_step_numbers": ["6"],
            "related_example_codes": ["WE-4"],
        },
    },
    {
        "content_code": "CS-012",
        "title": "Themba",
        "summary": "R5k/month age 35-60: late start, longer run, ~R6.6m at 60.",
        "description": "Mirror of Nomvula. Themba waits until 35, then contributes R5,000/month for 25 consecutive years at 10%. Final value ~R6.6m.",
        "parent_step": 6,
        "stage_relevance": ["Foundation", "Momentum"],
        "detail": {
            "age_band": "35-60",
            "income_monthly": None,
            "situation": "Did everything right from his start date, but his start date was 10 years late.",
            "learning": "Same monthly amount, same retirement age, half the outcome.",
            "key_insight": "Start dates compound. Earlier is exponentially better.",
            "related_step_numbers": ["6"],
            "related_example_codes": ["WE-3", "WE-4"],
        },
    },
    {
        "content_code": "CS-013",
        "title": "Four Investor Cohort",
        "summary": "Same R3k/month to 65: start age 18/25/30/40 → R26.5m / R15.9m / R9.7m / R3.6m.",
        "description": "Four investors at start ages 18, 25, 30, 40. All contribute R3,000/month until age 65 at 10%. Outcomes diverge sharply.",
        "parent_step": 6,
        "stage_relevance": ["Foundation", "Momentum", "Freedom"],
        "detail": {
            "age_band": "18/25/30/40",
            "income_monthly": None,
            "situation": "Hypothetical cohort used to illustrate the cost of waiting.",
            "learning": "Each decade of delay roughly halves the retirement outcome.",
            "key_insight": "If you have time, you have leverage.",
            "related_step_numbers": ["6"],
            "related_example_codes": ["WE-5"],
        },
    },
    {
        "content_code": "CS-014",
        "title": "Ouma Maria",
        "summary": "R200/month for 45 years (R108k contributed) → R2.1m at 83.",
        "description": "Started a unit trust at 38 with R200/month from a R14,000/month max salary. Never increased the contribution. Never withdrew. By 83 the balance had grown to R2.1m: 19× the total contributed.",
        "parent_step": 6,
        "stage_relevance": ["Foundation", "Momentum"],
        "detail": {
            "age_band": "38-83",
            "income_monthly": 14_000,
            "situation": "Modest income, modest contribution, extraordinary discipline.",
            "learning": "Tiny consistent action over a long horizon beats heroic late effort.",
            "key_insight": "It doesn't take a big shovel. It takes a long arm.",
            "related_step_numbers": ["6"],
            "related_example_codes": ["WE-3"],
        },
    },
    {
        "content_code": "CS-015",
        "title": "R5-A-Day Child",
        "summary": "R150/month from birth to age 18, then idle to 65 → ~R8.9m (book: R1.9m).",
        "description": "Newborn receives R150/month for 18 years (total contributed: R32,400). No further contributions. The balance compounds to age 65. Standard math at 10% gives ~R8.9m; the book uses a more conservative rate and quotes R1.9m.",
        "parent_step": 6,
        "stage_relevance": ["Foundation", "Momentum", "Freedom"],
        "detail": {
            "age_band": "Birth-65",
            "income_monthly": None,
            "situation": "Aunts, uncles, grandparents pooling small amounts make this trivial to fund.",
            "learning": "Universal availability of compounding: anyone can do this for any child.",
            "key_insight": "R5/day is a generational rounding error; R1-9m is a generational outcome.",
            "related_step_numbers": ["6"],
            "related_example_codes": ["WE-6"],
        },
    },
]


# ---------------------------------------------------------------------------
# Upsert routine
# ---------------------------------------------------------------------------


def _row_kwargs_for_step(step: dict[str, Any]) -> dict[str, Any]:
    return {
        "content_type": "step",
        "content_code": step["content_code"],
        "title": step["title"],
        "summary": step["summary"],
        "description": step["description"],
        "parent_step": step["parent_step"],
        "stage_relevance": step["stage_relevance"],
        "keywords": [],
        "related_chapters": [],
        "has_calculator": False,
        "has_worksheet": False,
        "has_example": False,
        "calculator_type": None,
        "calculator_config": None,
        "detail": step["detail"],
    }


def _row_kwargs_for_example(ex: dict[str, Any]) -> dict[str, Any]:
    return {
        "content_type": "example",
        "content_code": ex["content_code"],
        "title": ex["title"],
        "summary": ex["summary"],
        "description": ex["description"],
        "parent_step": ex["parent_step"],
        "stage_relevance": ex["stage_relevance"],
        "keywords": [],
        "related_chapters": [],
        "has_calculator": ex["calculator_type"] is not None,
        "has_worksheet": False,
        "has_example": True,
        "calculator_type": ex["calculator_type"],
        "calculator_config": ex["calculator_config"],
        "detail": ex["detail"],
    }


def _row_kwargs_for_case_study(cs: dict[str, Any]) -> dict[str, Any]:
    return {
        "content_type": "case_study",
        "content_code": cs["content_code"],
        "title": cs["title"],
        "summary": cs["summary"],
        "description": cs["description"],
        "parent_step": cs["parent_step"],
        "stage_relevance": cs["stage_relevance"],
        "keywords": [],
        "related_chapters": [],
        "has_calculator": False,
        "has_worksheet": False,
        "has_example": False,
        "calculator_type": None,
        "calculator_config": None,
        "detail": cs["detail"],
    }


async def _upsert(session: AsyncSession, rows: list[dict[str, Any]]) -> tuple[int, int]:
    """Idempotent insert/update by content_code. Returns (inserted, updated)."""
    inserted = 0
    updated = 0
    for row in rows:
        res = await session.execute(
            select(ContentMetadata).where(ContentMetadata.content_code == row["content_code"])
        )
        existing = res.scalar_one_or_none()
        if existing is None:
            session.add(ContentMetadata(**row))
            inserted += 1
        else:
            for k, v in row.items():
                if k == "content_code":
                    continue
                setattr(existing, k, v)
            updated += 1
    await session.commit()
    return inserted, updated


async def seed(session: AsyncSession | None = None) -> dict[str, dict[str, int]]:
    """Run the seed. If ``session`` is None a fresh one is opened."""
    own = False
    if session is None:
        factory = get_session_factory()
        session = factory()
        own = True
    try:
        steps_rows = [_row_kwargs_for_step(s) for s in STEPS]
        example_rows = [_row_kwargs_for_example(e) for e in EXAMPLES]
        case_study_rows = [_row_kwargs_for_case_study(c) for c in CASE_STUDIES]

        step_i, step_u = await _upsert(session, steps_rows)
        ex_i, ex_u = await _upsert(session, example_rows)
        cs_i, cs_u = await _upsert(session, case_study_rows)
    finally:
        if own:
            await session.close()
    return {
        "steps": {"inserted": step_i, "updated": step_u, "total": len(STEPS)},
        "examples": {"inserted": ex_i, "updated": ex_u, "total": len(EXAMPLES)},
        "case_studies": {"inserted": cs_i, "updated": cs_u, "total": len(CASE_STUDIES)},
    }


def main() -> None:
    result = asyncio.run(seed())
    print("Seed complete:")
    for kind, stats in result.items():
        print(
            f"  {kind:13s}  inserted={stats['inserted']:>3}  "
            f"updated={stats['updated']:>3}  total={stats['total']:>3}"
        )


if __name__ == "__main__":
    main()
