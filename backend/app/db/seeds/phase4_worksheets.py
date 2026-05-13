"""Idempotent seed for Phase 4: 7 worksheet rows in ``content_metadata``.

Each row is ``content_type='worksheet'`` with the full form schema stored
under the ``detail`` JSONB column. The seed is upsert-by-content_code so
it's safe to re-run.

Schema shape per worksheet::

    detail = {
        "worksheet_code": "APP-A",
        "estimated_time_minutes": 30,
        "related_step_number": "2",
        "related_example_codes": ["WE-7"],
        "calculator": "budget_allocator" | None,   # service-name dispatch key
        "summary_keys": [...],                     # which calculated keys appear in history rows
        "sections": [
            {
                "name": "...", "label": "...",
                "fields": [...],                   # for scalar sections (numbers / text / select)
                # OR for table-style sections:
                "type": "array", "min_items": 1, "max_items": 20,
                "item_schema": [...]
            },
        ],
    }

Run inline::

    python -m app.db.seeds.phase4_worksheets
"""

from __future__ import annotations

import asyncio
from typing import Any

from sqlalchemy import select

from app.db.database import get_session_factory
from app.db.models import ContentMetadata

# ---------------------------------------------------------------------------
# Field-builder helpers
# ---------------------------------------------------------------------------


def _money(name: str, label: str, default: float = 0) -> dict[str, Any]:
    return {
        "name": name,
        "label": label,
        "type": "number",
        "format": "currency",
        "min": 0,
        "default": default,
    }


def _percent(name: str, label: str, default: float = 0) -> dict[str, Any]:
    return {
        "name": name,
        "label": label,
        "type": "number",
        "format": "percent",
        "min": 0,
        "max": 100,
        "default": default,
    }


def _text(name: str, label: str, default: str = "") -> dict[str, Any]:
    return {"name": name, "label": label, "type": "text", "default": default}


def _select(
    name: str, label: str, options: list[str], default: str | None = None
) -> dict[str, Any]:
    return {
        "name": name,
        "label": label,
        "type": "select",
        "options": options,
        "default": default if default is not None else options[0],
    }


def _bool_select(name: str, label: str) -> dict[str, Any]:
    """Yes/Partial/No/N-A column used pervasively in APP-C and APP-F audits."""
    return _select(name, label, options=["yes", "partial", "no", "n/a"], default="no")


def _textarea(name: str, label: str) -> dict[str, Any]:
    return {"name": name, "label": label, "type": "text", "multiline": True, "default": ""}


# ---------------------------------------------------------------------------
# Worksheet definitions
# ---------------------------------------------------------------------------

# APP-A Zero-Based Budget: fields per wealth_index.md Appendix A details.

APP_A_SECTIONS = [
    {
        "name": "income",
        "label": "Income",
        "fields": [
            _money("salary_1", "Primary salary (after tax)"),
            _money("salary_2", "Secondary salary (after tax)"),
            _money("rental_income", "Rental income"),
            _money("dividends_interest", "Dividends & interest"),
            _money("side_income", "Side income / freelance"),
            _money("other_income", "Other income"),
        ],
    },
    {
        "name": "needs",
        "label": "Needs (essentials)",
        "fields": [
            _money("bond", "Bond / rent"),
            _money("utilities", "Utilities (water, electricity, fibre)"),
            _money("groceries", "Groceries"),
            _money("transport", "Transport (fuel, public transport)"),
            _money("medical", "Medical aid"),
            _money("insurance", "Insurance (short-term + cover)"),
            _money("school", "School fees + extracurriculars"),
            _money("family", "Family obligations / support"),
            _money("debt_minimums", "Debt minimum payments"),
        ],
    },
    {
        "name": "wants",
        "label": "Wants (lifestyle)",
        "fields": [
            _money("dining", "Dining out / takeaway"),
            _money("entertainment", "Entertainment & subscriptions"),
            _money("travel", "Travel & holidays"),
            _money("personal", "Personal care & shopping"),
            _money("gifts", "Gifts & celebrations"),
            _money("other_wants", "Other wants"),
        ],
    },
    {
        "name": "invest",
        "label": "Invest",
        "fields": [
            _money("emergency_fund", "Emergency fund top-up"),
            _money("ra", "Retirement annuity (Section 11F)"),
            _money("tfsa", "TFSA contributions"),
            _money("discretionary", "Discretionary unit trusts / shares"),
            _money("bucket_3", "Bucket 3 (dream fund)"),
            _money("extra_debt", "Extra debt repayments"),
        ],
    },
]


# APP-B Net Worth Statement: table-style sections.

APP_B_LIFESTYLE_ITEMS = [
    {"name": "Primary home"},
    {"name": "Holiday home"},
    {"name": "Vehicles"},
    {"name": "Household contents"},
    {"name": "Personal items"},
]
APP_B_INCOME_ITEMS = [
    {"name": "Retirement annuity / pension"},
    {"name": "TFSA"},
    {"name": "Discretionary unit trusts"},
    {"name": "Offshore investments"},
    {"name": "Rental property"},
    {"name": "Business interests"},
    {"name": "Cash / money market"},
]
APP_B_LIABILITY_ITEMS = [
    {"name": "Bond"},
    {"name": "Vehicle finance"},
    {"name": "Credit cards"},
    {"name": "Store accounts"},
    {"name": "Personal loans"},
    {"name": "Other debt"},
]


def _asset_section(name: str, label: str, defaults: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "name": name,
        "label": label,
        "type": "array",
        "min_items": 0,
        "max_items": 30,
        "item_schema": [
            {"name": "name", "label": "Asset", "type": "text"},
            {
                "name": "value",
                "label": "Value (R)",
                "type": "number",
                "format": "currency",
                "min": 0,
            },
        ],
        "default": [{"name": i["name"], "value": 0} for i in defaults],
    }


APP_B_SECTIONS = [
    _asset_section("lifestyle_assets", "Lifestyle assets", APP_B_LIFESTYLE_ITEMS),
    _asset_section(
        "income_generating_assets",
        "Income-generating assets",
        APP_B_INCOME_ITEMS,
    ),
    {
        "name": "liabilities",
        "label": "Liabilities",
        "type": "array",
        "min_items": 0,
        "max_items": 30,
        "item_schema": [
            {"name": "name", "label": "Liability", "type": "text"},
            {
                "name": "value",
                "label": "Outstanding balance (R)",
                "type": "number",
                "format": "currency",
                "min": 0,
            },
        ],
        "default": [{"name": i["name"], "value": 0} for i in APP_B_LIABILITY_ITEMS],
    },
]


# APP-C Risk Cover Review Checklist: 6 coverage categories + 1 business owner.

APP_C_SECTIONS = [
    {
        "name": "life_cover",
        "label": "Life cover",
        "fields": [
            _bool_select("policy_active", "Active life policy"),
            _bool_select("sum_assured_meets_target", "Sum assured ≥ 10–15× annual income"),
            _bool_select("debt_clearance_covered", "Debt clearance covered separately"),
            _bool_select("beneficiaries_current", "Beneficiaries reviewed in last 12mo"),
        ],
    },
    {
        "name": "medical",
        "label": "Medical aid + gap cover",
        "fields": [
            _bool_select("comprehensive_plan", "Comprehensive / hospital plan"),
            _bool_select("gap_cover_in_place", "Gap cover in place"),
            _bool_select("annual_review_done", "Reviewed in last 12mo"),
        ],
    },
    {
        "name": "disability_income_protection",
        "label": "Disability & income protection",
        "fields": [
            _bool_select("disability_lump_sum", "Lump-sum disability cover"),
            _bool_select("income_protection_monthly", "Income protection (≥75% of salary monthly)"),
            _bool_select("waiting_period_appropriate", "Waiting period appropriate"),
        ],
    },
    {
        "name": "will_estate",
        "label": "Will & estate",
        "fields": [
            _bool_select("will_valid", "Valid signed will (≤3yr old)"),
            _bool_select("executor_named", "Executor named & willing"),
            _bool_select("guardians_named", "Guardians named for minors (if applicable)"),
            _bool_select("marriage_regime_known", "Marriage regime documented"),
        ],
    },
    {
        "name": "short_term_insurance",
        "label": "Short-term insurance",
        "fields": [
            _bool_select("building_cover", "Building cover"),
            _bool_select("contents_cover", "Contents cover"),
            _bool_select("vehicle_cover", "Vehicle cover"),
            _bool_select("liability_cover", "Liability cover"),
            _bool_select("annual_requote", "Re-quoted with 2+ providers in last 12mo"),
        ],
    },
    {
        "name": "structured_benefits",
        "label": "Structured benefits (e.g. Vitality)",
        "fields": [
            _bool_select("programme_active", "Active rewards programme"),
            _bool_select(
                "annual_benefit_captured",
                "Captured ≥50% of available benefit in last 12mo",
            ),
        ],
    },
    {
        "name": "business_owner_additions",
        "label": "Business owner additions (skip if not applicable)",
        "fields": [
            _bool_select("key_person_cover", "Key-person cover"),
            _bool_select("buy_and_sell_cover", "Buy-and-sell cover current"),
            _bool_select("contingent_liability", "Contingent liability cover"),
        ],
    },
]


# APP-D Debt Disclosure: one table-style section.

APP_D_SECTIONS = [
    {
        "name": "debts",
        "label": "Debts",
        "type": "array",
        "min_items": 0,
        "max_items": 30,
        "item_schema": [
            {"name": "creditor", "label": "Creditor", "type": "text"},
            {
                "name": "balance",
                "label": "Balance (R)",
                "type": "number",
                "format": "currency",
                "min": 0,
            },
            {
                "name": "minimum_payment",
                "label": "Minimum payment (R)",
                "type": "number",
                "format": "currency",
                "min": 0,
            },
            {
                "name": "annual_rate_pct",
                "label": "Rate (% p.a.)",
                "type": "number",
                "format": "percent",
                "min": 0,
                "max": 50,
            },
            {
                "name": "account_type",
                "label": "Account type",
                "type": "select",
                "options": [
                    "credit_card",
                    "store_account",
                    "personal_loan",
                    "vehicle",
                    "bond",
                    "other",
                ],
                "default": "credit_card",
            },
        ],
        "default": [],
    },
]


# APP-E Monthly Money Review: 30-minute conversation script.

APP_E_SECTIONS = [
    {
        "name": "last_month",
        "label": "Last month (10 min)",
        "fields": [
            _textarea("budget_adherence", "Where did we land vs the budget?"),
            _textarea("unexpected_items", "Any unexpected expenses or windfalls?"),
            _bool_select("debit_reconciliation_done", "Bank debit reconciliation completed"),
        ],
    },
    {
        "name": "this_month",
        "label": "This month (10 min)",
        "fields": [
            _textarea("upcoming_expenses", "Known upcoming expenses"),
            _textarea("anticipated_income", "Anticipated income changes"),
            _textarea("budget_adjustments", "Adjustments to the budget"),
        ],
    },
    {
        "name": "us",
        "label": "Us (10 min)",
        "fields": [
            _textarea("pride_points", "What are we proud of this month?"),
            _textarea("worries", "What are we worried about?"),
            _textarea("next_month_focus", "One thing to focus on next month"),
        ],
    },
]


# APP-F attooh! Life File: 4 inventory sections.

APP_F_SECTIONS = [
    {
        "name": "personal",
        "label": "Personal",
        "fields": [
            _text("id_number", "ID number"),
            _text("marriage_cert_location", "Marriage certificate location"),
            _text("childrens_docs_location", "Children's documents location"),
            _text("passport_numbers", "Passport numbers"),
            _text("medical_aid_numbers", "Medical aid numbers"),
            _textarea("funeral_wishes", "Funeral wishes"),
            _textarea("key_contacts", "Key contacts (executor, advisor, family)"),
        ],
    },
    {
        "name": "assets",
        "label": "Assets",
        "fields": [
            _text("property_details", "Property details + bond bank"),
            _text("vehicles", "Vehicles (make, model, financed by)"),
            _text("retirement_funds", "Retirement funds (provider + policy nos)"),
            _text("tfsas", "TFSAs (provider + account nos)"),
            _text("investments", "Investments (provider + reference)"),
            _text("offshore", "Offshore holdings"),
            _text("business_stakes", "Business stakes / shareholdings"),
            _text("bank_accounts", "Bank accounts"),
            _text("digital_assets", "Digital assets (crypto, online accounts)"),
        ],
    },
    {
        "name": "liabilities",
        "label": "Liabilities",
        "fields": [
            _text("bonds", "Bonds"),
            _text("vehicle_finance", "Vehicle finance"),
            _text("credit_cards", "Credit cards"),
            _text("personal_loans", "Personal loans"),
            _text("sureties", "Sureties signed"),
        ],
    },
    {
        "name": "general",
        "label": "General",
        "fields": [
            _text("will_location", "Will (location + executor)"),
            _text("insurance_policies", "Insurance policies (provider + policy nos)"),
            _text("sars_tin", "SARS TIN"),
            _text("employer_details", "Employer details + HR contact"),
            _text("subscriptions", "Active subscriptions"),
            _text("storage_units", "Storage units / safety deposits"),
        ],
    },
]


# APP-G: schema mirrors 10Q assessment; submit forwards to /assessments/10q.

APP_G_SECTIONS = [
    {
        "name": "responses",
        "label": "Self-assessment",
        "fields": [
            _select(
                f"q{i}",
                f"Question {i}",
                options=["a", "b", "c", "d"],
                default="a",
            )
            for i in range(1, 11)
        ],
    },
]


# ---------------------------------------------------------------------------
# Worksheet rows
# ---------------------------------------------------------------------------

WORKSHEETS: list[dict[str, Any]] = [
    {
        "content_code": "APP-A",
        "title": "Zero-Based Budget",
        "summary": "Every rand has a job: Income − (Needs + Wants + Invest) = R0.",
        "description": (
            "Build a bottom-up monthly budget. Allocate every rand to needs, wants, "
            "or investing, until the remainder is zero. The discipline kills the "
            "'where did it go?' problem that funds invisible drains."
        ),
        "parent_step": 2,
        "stage_relevance": ["Foundation", "Momentum", "Freedom"],
        "detail": {
            "worksheet_code": "APP-A",
            "estimated_time_minutes": 30,
            "related_step_number": "2",
            "related_example_codes": ["WE-7"],
            "calculator": "budget_allocator",
            "summary_keys": ["surplus_deficit", "needs_pct", "wants_pct", "invest_pct"],
            "sections": APP_A_SECTIONS,
        },
    },
    {
        "content_code": "APP-B",
        "title": "Net Worth Statement",
        "summary": "Distinguish lifestyle assets from income-generating assets.",
        "description": (
            "Lay out everything you own and owe. The headline question: what "
            "percentage of net worth is income-generating? Healthy households "
            "target 60%+ over time."
        ),
        "parent_step": 3,
        "stage_relevance": ["Momentum", "Freedom", "Independence", "Abundance"],
        "detail": {
            "worksheet_code": "APP-B",
            "estimated_time_minutes": 45,
            "related_step_number": "3",
            "related_example_codes": ["WE-8"],
            "calculator": "net_worth_analyzer",
            "summary_keys": ["net_worth", "income_generating_pct_of_net_worth"],
            "sections": APP_B_SECTIONS,
        },
    },
    {
        "content_code": "APP-C",
        "title": "Risk Cover Review Checklist",
        "summary": "Annual audit across six cover categories + business-owner additions.",
        "description": (
            "Run this every 12 months. Aim is not 'do I have cover' but 'is the "
            "cover right-sized and still cost-effective?'."
        ),
        "parent_step": 4,
        "stage_relevance": ["Foundation", "Momentum", "Freedom", "Independence", "Abundance"],
        "detail": {
            "worksheet_code": "APP-C",
            "estimated_time_minutes": 30,
            "related_step_number": "4a",
            "related_example_codes": ["WE-9"],
            "calculator": None,
            "summary_keys": ["gaps_total", "critical_gaps"],
            "sections": APP_C_SECTIONS,
        },
    },
    {
        "content_code": "APP-D",
        "title": "Debt Disclosure Worksheet",
        "summary": "Every account, balance, rate, and minimum on one page.",
        "description": (
            "List every consumer / vehicle / bond debt. Once the full inventory "
            "is visible, the elimination strategy writes itself (Snowball / "
            "Avalanche / Debtonator™)."
        ),
        "parent_step": 5,
        "stage_relevance": ["Foundation", "Momentum"],
        "detail": {
            "worksheet_code": "APP-D",
            "estimated_time_minutes": 30,
            "related_step_number": "5",
            "related_example_codes": ["WE-1", "WE-12", "WE-13"],
            "calculator": "debt_disclosure",
            "summary_keys": [
                "total_debt",
                "weighted_average_rate_pct",
                "total_monthly_minimums",
            ],
            "sections": APP_D_SECTIONS,
        },
    },
    {
        "content_code": "APP-E",
        "title": "Monthly Money Review Agenda",
        "summary": "30-minute structured monthly conversation: Last / This / Us.",
        "description": (
            "A repeatable conversation script. Last Month (budget reconciliation) → "
            "This Month (upcoming + adjustments) → Us (pride, worries, focus). "
            "End on a forward-looking item. Never on blame."
        ),
        "parent_step": 2,
        "stage_relevance": ["Foundation", "Momentum", "Freedom", "Independence", "Abundance"],
        "detail": {
            "worksheet_code": "APP-E",
            "estimated_time_minutes": 30,
            "related_step_number": "2",
            "related_example_codes": [],
            "calculator": None,
            "summary_keys": ["completion_percentage"],
            "sections": APP_E_SECTIONS,
        },
    },
    {
        "content_code": "APP-F",
        "title": "attooh! Life File",
        "summary": "Complete estate documentation across personal / assets / liabilities / general.",
        "description": (
            "The one document your family needs if something happens to you. "
            "Personal IDs, asset registers, liability lists, and the location "
            "of every important document. Update annually."
        ),
        "parent_step": 4,
        "stage_relevance": ["Momentum", "Freedom", "Independence", "Abundance"],
        "detail": {
            "worksheet_code": "APP-F",
            "estimated_time_minutes": 90,
            "related_step_number": "4a",
            "related_example_codes": [],
            "calculator": None,
            "summary_keys": ["completion_percentage"],
            "sections": APP_F_SECTIONS,
        },
    },
    {
        "content_code": "APP-G",
        "title": "Wealth FlightPlan™ Self-Assessment (10Q)",
        "summary": "Stage placement: same 10 questions as the assessment endpoint.",
        "description": (
            "Worksheet variant of the 10-question self-assessment. Submitting it "
            "is equivalent to POSTing /assessments/10q; the form persists as a "
            "draftable worksheet but submissions are forwarded to the assessment "
            "service so the result lands in `assessments` (and updates current_stage)."
        ),
        "parent_step": 1,
        "stage_relevance": ["Foundation", "Momentum", "Freedom", "Independence", "Abundance"],
        "detail": {
            "worksheet_code": "APP-G",
            "estimated_time_minutes": 10,
            "related_step_number": "1",
            "related_example_codes": [],
            "calculator": "assessment_10q",  # service forwards to assessments.submit_10q
            "summary_keys": ["calculated_stage", "total_score"],
            "sections": APP_G_SECTIONS,
        },
    },
]


# ---------------------------------------------------------------------------
# Upsert
# ---------------------------------------------------------------------------


def _row_kwargs(w: dict[str, Any]) -> dict[str, Any]:
    return {
        "content_type": "worksheet",
        "content_code": w["content_code"],
        "title": w["title"],
        "summary": w["summary"],
        "description": w["description"],
        "parent_step": w["parent_step"],
        "stage_relevance": w["stage_relevance"],
        "keywords": [],
        "related_chapters": [],
        "has_calculator": w["detail"].get("calculator") is not None,
        "has_worksheet": True,
        "has_example": False,
        "calculator_type": None,  # worksheets use detail.calculator, not the example calculator_type
        "calculator_config": None,
        "detail": w["detail"],
    }


async def seed(session=None) -> dict[str, dict[str, int]]:
    own = False
    if session is None:
        session = get_session_factory()()
        own = True
    try:
        rows = [_row_kwargs(w) for w in WORKSHEETS]
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
    finally:
        if own:
            await session.close()
    return {
        "worksheets": {
            "inserted": inserted,
            "updated": updated,
            "total": len(WORKSHEETS),
        }
    }


def main() -> None:
    result = asyncio.run(seed())
    print("Phase 4 worksheet seed complete:")
    for kind, stats in result.items():
        print(
            f"  {kind:13s}  inserted={stats['inserted']:>3}  "
            f"updated={stats['updated']:>3}  total={stats['total']:>3}"
        )


if __name__ == "__main__":
    main()
