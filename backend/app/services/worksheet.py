"""Worksheet service — schema validation, calculation dispatch, persistence.

The schema lives in ``content_metadata.detail`` (seeded by phase4_worksheets).
The /draft endpoint upserts into ``worksheet_responses`` keyed by
(user_id, worksheet_code, is_draft=True) — the partial unique index in
migration 0004 enforces "at most one draft per (user, worksheet_code)".
/submit validates, calculates, inserts is_draft=False, and removes any
matching draft.
"""

from __future__ import annotations

import uuid
from collections import defaultdict
from dataclasses import dataclass
from typing import Any

from fastapi import status
from sqlalchemy import and_, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import APIError
from app.db.models import ContentMetadata, WorksheetResponse
from app.services import worksheet_content as content
from app.services.calculator import (
    BudgetAllocatorInput,
    NetWorthInput,
    NetWorthItem,
    budget_allocator,
    net_worth_analyzer,
)

# Order in which APP-D buckets aggregate consumer-debt totals.
_DEBT_CATEGORIES = (
    "credit_card",
    "store_account",
    "personal_loan",
    "vehicle",
    "bond",
    "other",
)


# ---------------------------------------------------------------------------
# Schema lookup
# ---------------------------------------------------------------------------


async def get_worksheet_row(session: AsyncSession, worksheet_code: str) -> ContentMetadata:
    res = await session.execute(
        select(ContentMetadata).where(
            and_(
                ContentMetadata.content_type == "worksheet",
                ContentMetadata.content_code == worksheet_code,
            )
        )
    )
    row = res.scalar_one_or_none()
    if row is None:
        raise APIError(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message=f"Worksheet {worksheet_code!r} not found.",
        )
    return row


def schema_for(row: ContentMetadata) -> dict[str, Any]:
    """Public schema view — used as the /worksheets/{code} response body.

    The internal dispatch key (``detail.calculator``) is NOT exposed here;
    use :func:`internal_calculator_key` when the service needs it.
    """
    detail = row.detail or {}
    return {
        "worksheet_code": row.content_code,
        "title": row.title,
        "description": row.description or "",
        "summary": row.summary or "",
        "sections": detail.get("sections", []),
        "estimated_time_minutes": detail.get("estimated_time_minutes", 0),
        "related_step_number": detail.get("related_step_number"),
        "related_example_codes": detail.get("related_example_codes", []),
        "summary_keys": detail.get("summary_keys", []),
        "has_calculator": detail.get("calculator") is not None,
    }


def internal_calculator_key(row: ContentMetadata) -> str | None:
    """Dispatch key read off the content_metadata row — internal use only."""
    return (row.detail or {}).get("calculator")


def catalogue_view(row: ContentMetadata) -> dict[str, Any]:
    detail = row.detail or {}
    return {
        "worksheet_code": row.content_code,
        "title": row.title,
        "description": row.description or "",
        "related_step_number": detail.get("related_step_number"),
        "related_example_codes": detail.get("related_example_codes", []),
        "estimated_time_minutes": detail.get("estimated_time_minutes", 0),
        "has_calculator": detail.get("calculator") is not None,
    }


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------


@dataclass(slots=True)
class ValidationResult:
    cleaned: dict[str, Any]
    errors: dict[str, list[str]]


def _coerce_number(value: Any, *, field: str, errors: dict[str, list[str]]) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        errors.setdefault(field, []).append("Must be a number.")
        return None


def _validate_scalar_field(
    spec: dict[str, Any],
    raw_value: Any,
    *,
    path: str,
    errors: dict[str, list[str]],
) -> Any:
    f_type = spec.get("type", "number")
    if f_type == "number":
        v = _coerce_number(raw_value, field=path, errors=errors)
        if v is None:
            return spec.get("default", 0)
        if "min" in spec and v < spec["min"]:
            errors.setdefault(path, []).append(f"Must be ≥ {spec['min']}.")
        if "max" in spec and v > spec["max"]:
            errors.setdefault(path, []).append(f"Must be ≤ {spec['max']}.")
        return v
    if f_type == "select":
        options = spec.get("options", [])
        if raw_value is None or raw_value == "":
            return spec.get("default")
        if raw_value not in options:
            errors.setdefault(path, []).append(f"Must be one of: {', '.join(options)}.")
        return raw_value
    # text (including multiline) — just normalise None → "".
    return "" if raw_value is None else str(raw_value)


def validate_response(schema: dict[str, Any], response_data: dict[str, Any]) -> ValidationResult:
    """Validate ``response_data`` against a worksheet ``schema``.

    For scalar sections: every field is validated; missing fields fall back
    to the spec default (so partial drafts work without exploding). For
    array sections: each row is validated and capped to ``min_items``/
    ``max_items``.
    """
    errors: dict[str, list[str]] = {}
    cleaned: dict[str, Any] = {}

    for section in schema.get("sections", []):
        s_name = section["name"]
        s_data = response_data.get(s_name) if isinstance(response_data, dict) else None

        if section.get("type") == "array":
            rows = s_data if isinstance(s_data, list) else []
            min_items = int(section.get("min_items", 0))
            max_items = int(section.get("max_items", 100))
            if len(rows) < min_items:
                errors.setdefault(s_name, []).append(f"At least {min_items} row(s) required.")
            if len(rows) > max_items:
                errors.setdefault(s_name, []).append(f"At most {max_items} row(s) allowed.")
            cleaned_rows: list[dict[str, Any]] = []
            for idx, row in enumerate(rows[:max_items]):
                cleaned_row: dict[str, Any] = {}
                for col in section.get("item_schema", []):
                    col_path = f"{s_name}[{idx}].{col['name']}"
                    cleaned_row[col["name"]] = _validate_scalar_field(
                        col,
                        (row or {}).get(col["name"]) if isinstance(row, dict) else None,
                        path=col_path,
                        errors=errors,
                    )
                cleaned_rows.append(cleaned_row)
            cleaned[s_name] = cleaned_rows
        else:
            cleaned_section: dict[str, Any] = {}
            section_data = s_data if isinstance(s_data, dict) else {}
            for field in section.get("fields", []):
                f_path = f"{s_name}.{field['name']}"
                cleaned_section[field["name"]] = _validate_scalar_field(
                    field, section_data.get(field["name"]), path=f_path, errors=errors
                )
            cleaned[s_name] = cleaned_section

    return ValidationResult(cleaned=cleaned, errors=errors)


def _raise_validation_error(errors: dict[str, list[str]]) -> None:
    if errors:
        raise APIError(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="VALIDATION_ERROR",
            message="One or more fields are invalid.",
            details=errors,
        )


# ---------------------------------------------------------------------------
# Completion percentage
# ---------------------------------------------------------------------------


def _field_is_filled(field_spec: dict[str, Any], value: Any) -> bool:
    """Per API contract: a scalar leaf is 'filled' if its value is non-null AND
    (for type:number) is a finite number, (for type:text|select) is a non-empty
    string. Note: 0 IS a filled number — many worksheet fields legitimately have
    zero values (no secondary earner, no store account, etc.)."""
    f_type = field_spec.get("type", "number")
    if f_type == "number":
        if value is None or isinstance(value, bool):
            return False
        if not isinstance(value, int | float):
            return False
        import math

        return math.isfinite(value)
    if f_type == "select":
        return isinstance(value, str) and value != ""
    # text and anything else
    return isinstance(value, str) and value != ""


def derive_completion_percentage(schema: dict[str, Any], response_data: dict[str, Any]) -> int:
    total_fields = 0
    filled = 0
    for section in schema.get("sections", []):
        s_data = response_data.get(section["name"], {})
        if section.get("type") == "array":
            rows = s_data if isinstance(s_data, list) else []
            for row in rows:
                for col in section.get("item_schema", []):
                    total_fields += 1
                    if isinstance(row, dict) and _field_is_filled(col, row.get(col["name"])):
                        filled += 1
        else:
            for field in section.get("fields", []):
                total_fields += 1
                if isinstance(s_data, dict) and _field_is_filled(field, s_data.get(field["name"])):
                    filled += 1
    if total_fields == 0:
        return 0
    return int(round(100 * filled / total_fields))


# ---------------------------------------------------------------------------
# Calculate dispatch
# ---------------------------------------------------------------------------


def _sum_section(data: dict[str, Any], name: str) -> float:
    section = data.get(name, {})
    if not isinstance(section, dict):
        return 0.0
    return float(sum(v for v in section.values() if isinstance(v, int | float)))


def calculate_budget(data: dict[str, Any]) -> dict[str, Any]:
    total_income = _sum_section(data, "income")
    total_needs = _sum_section(data, "needs")
    total_wants = _sum_section(data, "wants")
    total_invest = _sum_section(data, "invest")
    out = budget_allocator(
        BudgetAllocatorInput(
            income_monthly=total_income,
            needs=total_needs,
            wants=total_wants,
            invest=total_invest,
        )
    )
    return {
        "total_income": total_income,
        "total_needs": total_needs,
        "total_wants": total_wants,
        "total_invest": total_invest,
        "total_allocated": out.total_allocated,
        "surplus_deficit": out.surplus_deficit,
        "needs_pct": out.needs_pct,
        "wants_pct": out.wants_pct,
        "invest_pct": out.invest_pct,
        "status": out.status,
        "target_comparison": [c.model_dump() for c in out.target_comparison],
    }


def calculate_net_worth(data: dict[str, Any]) -> dict[str, Any]:
    def _items(section_name: str) -> list[NetWorthItem]:
        rows = data.get(section_name) or []
        return [
            NetWorthItem(
                name=str(r.get("name", "")) or "(unnamed)",
                value=float(r.get("value") or 0),
            )
            for r in rows
            if isinstance(r, dict)
        ]

    out = net_worth_analyzer(
        NetWorthInput(
            lifestyle_assets=_items("lifestyle_assets"),
            income_generating_assets=_items("income_generating_assets"),
            liabilities=_items("liabilities"),
        )
    )
    return out.model_dump()


def calculate_debt_disclosure(data: dict[str, Any]) -> dict[str, Any]:
    """Aggregate totals + per-category breakdown for the debt-disclosure worksheet."""
    debts = data.get("debts") or []
    total_debt = 0.0
    total_minimums = 0.0
    rate_weighted_sum = 0.0
    breakdown: dict[str, dict[str, float]] = defaultdict(lambda: {"count": 0, "total_balance": 0.0})

    for row in debts:
        if not isinstance(row, dict):
            continue
        balance = float(row.get("balance") or 0)
        minimum = float(row.get("minimum_payment") or 0)
        rate = float(row.get("annual_rate_pct") or 0)
        cat = row.get("account_type", "other")
        if cat not in _DEBT_CATEGORIES:
            cat = "other"

        total_debt += balance
        total_minimums += minimum
        rate_weighted_sum += balance * rate
        breakdown[cat]["count"] += 1
        breakdown[cat]["total_balance"] += balance

    weighted_avg = round(rate_weighted_sum / total_debt, 2) if total_debt > 0 else 0.0

    return {
        "total_debt": round(total_debt, 2),
        "total_monthly_minimums": round(total_minimums, 2),
        "weighted_average_rate_pct": weighted_avg,
        "account_count": len(debts),
        "breakdown_by_category": [
            {
                "category": cat,
                "count": int(breakdown[cat]["count"]),
                "total_balance": round(breakdown[cat]["total_balance"], 2),
            }
            for cat in _DEBT_CATEGORIES
            if cat in breakdown
        ],
    }


def calculate(calculator: str | None, data: dict[str, Any]) -> dict[str, Any] | None:
    """Dispatcher used by submit / latest. Returns None for non-calculating worksheets."""
    if calculator is None or calculator == "assessment_10q":
        return None
    if calculator == "budget_allocator":
        return calculate_budget(data)
    if calculator == "net_worth_analyzer":
        return calculate_net_worth(data)
    if calculator == "debt_disclosure":
        return calculate_debt_disclosure(data)
    raise APIError(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        code="INTERNAL_ERROR",
        message=f"Unknown worksheet calculator {calculator!r}",
    )


# ---------------------------------------------------------------------------
# Feedback
# ---------------------------------------------------------------------------


def _budget_feedback(calc: dict[str, Any]) -> dict[str, Any]:
    needs_pct = calc["needs_pct"]
    invest_pct = calc["invest_pct"]
    status_val: str
    msg: str
    recs: tuple[str, ...]

    if calc["status"] == "deficit":
        status_val = "critical"
        msg = f"Allocations exceed income by R{abs(calc['surplus_deficit']):,.0f}."
        recs = content.APP_A_RECS_HIGH_NEEDS
    elif needs_pct > 60:
        status_val = "needs_attention"
        msg = f"Needs at {needs_pct:.1f}% are above the 50% target."
        recs = content.APP_A_RECS_HIGH_NEEDS
    elif invest_pct < 10:
        status_val = "needs_attention"
        msg = f"Invest at {invest_pct:.1f}% is below the 20% target."
        recs = content.APP_A_RECS_LOW_INVEST
    else:
        status_val = "on_track"
        msg = "Allocations sit close to the 50/30/20 frame."
        recs = content.APP_A_RECS_BALANCED
    return {"status": status_val, "message": msg, "recommendations": list(recs)}


def _net_worth_feedback(calc: dict[str, Any]) -> dict[str, Any]:
    pct = calc["income_generating_pct_of_net_worth"]
    if pct >= 60:
        return {
            "status": "on_track",
            "message": f"{pct:.0f}% of net worth is income-generating — at or above the 60% Abundance benchmark.",
            "recommendations": list(content.APP_B_RECS_HIGH_PCT),
        }
    if pct >= 30:
        return {
            "status": "needs_attention",
            "message": f"{pct:.0f}% of net worth is income-generating — keep growing toward 60%.",
            "recommendations": list(content.APP_B_RECS_MID_PCT),
        }
    return {
        "status": "critical",
        "message": f"Only {pct:.0f}% of net worth is income-generating — Foundation/Momentum territory.",
        "recommendations": list(content.APP_B_RECS_LOW_PCT),
    }


def _risk_cover_feedback(
    schema: dict[str, Any], response: dict[str, Any]
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Returns (calculated_values, feedback)."""
    critical: list[str] = []
    other_gaps = 0
    answered = 0
    total = 0
    for section in schema.get("sections", []):
        sname = section["name"]
        s_data = response.get(sname, {})
        for field in section.get("fields", []):
            total += 1
            value = s_data.get(field["name"]) if isinstance(s_data, dict) else None
            if value in (None, "", "n/a"):
                # Not applicable / not answered — skip from gap counting.
                continue
            answered += 1
            if value == "no":
                rec = content.APP_C_CRITICAL_ITEMS.get((sname, field["name"]))
                if rec:
                    critical.append(rec)
                else:
                    other_gaps += 1

    calc = {
        "total_items": total,
        "answered_items": answered,
        "critical_gaps": len(critical),
        "other_gaps": other_gaps,
        "gaps_total": len(critical) + other_gaps,
    }
    if critical:
        feedback = {
            "status": "critical",
            "message": f"{len(critical)} critical cover gap(s) detected.",
            "recommendations": critical[:5],
        }
    elif other_gaps > 0:
        feedback = {
            "status": "needs_attention",
            "message": f"{other_gaps} non-critical cover gap(s) flagged for follow-up.",
            "recommendations": [
                "Re-quote each flagged item with 2+ providers in the next 90 days.",
            ],
        }
    else:
        feedback = {
            "status": "on_track",
            "message": "All cover items checked off — schedule the next annual review.",
            "recommendations": [
                "Diarise the next Appendix C audit 12 months from today.",
            ],
        }
    return calc, feedback


def _debt_feedback(calc: dict[str, Any]) -> dict[str, Any]:
    """Threshold tied to the book's debt categories (wealth_index Section 6):
    bond / asset-building debt = near-prime (≤12%) → on_track;
    vehicle finance = prime+1 to +3 (12–14%) → needs_attention;
    consumer debt at 20%+ → critical.
    """
    rate = calc["weighted_average_rate_pct"]
    if rate > 20:
        return {
            "status": "critical",
            "message": f"Weighted-average rate is {rate:.1f}% — expensive debt is the priority.",
            "recommendations": list(content.APP_D_RECS_HIGH_RATE),
        }
    if rate > 12:
        return {
            "status": "needs_attention",
            "message": f"Weighted-average rate is {rate:.1f}% — workable but worth re-pricing.",
            "recommendations": list(content.APP_D_RECS_MID_RATE),
        }
    return {
        "status": "on_track",
        "message": f"Weighted-average rate is {rate:.1f}% — well-priced debt.",
        "recommendations": list(content.APP_D_RECS_LOW_RATE),
    }


def _completion_feedback(
    completion_pct: int,
    *,
    complete_recs: tuple[str, ...],
    incomplete_recs: tuple[str, ...],
) -> dict[str, Any]:
    if completion_pct >= 80:
        return {
            "status": "on_track",
            "message": f"Worksheet complete ({completion_pct}%).",
            "recommendations": list(complete_recs),
        }
    if completion_pct >= 40:
        return {
            "status": "needs_attention",
            "message": f"Worksheet partially complete ({completion_pct}%).",
            "recommendations": list(incomplete_recs),
        }
    return {
        "status": "critical",
        "message": f"Worksheet barely started ({completion_pct}%).",
        "recommendations": list(incomplete_recs),
    }


def generate_feedback(
    worksheet_code: str,
    schema: dict[str, Any],
    response_data: dict[str, Any],
    calculated_values: dict[str, Any] | None,
    completion_pct: int,
) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    """Returns (calculated_values_augmented, feedback)."""
    if worksheet_code == "APP-A":
        return calculated_values, _budget_feedback(calculated_values or {})
    if worksheet_code == "APP-B":
        return calculated_values, _net_worth_feedback(calculated_values or {})
    if worksheet_code == "APP-D":
        return calculated_values, _debt_feedback(calculated_values or {})
    if worksheet_code == "APP-C":
        calc, fb = _risk_cover_feedback(schema, response_data)
        return calc, fb
    if worksheet_code == "APP-E":
        return None, _completion_feedback(
            completion_pct,
            complete_recs=content.APP_E_RECS_COMPLETE,
            incomplete_recs=content.APP_E_RECS_INCOMPLETE,
        )
    if worksheet_code == "APP-F":
        return None, _completion_feedback(
            completion_pct,
            complete_recs=content.APP_F_RECS_COMPLETE,
            incomplete_recs=content.APP_F_RECS_INCOMPLETE,
        )
    # APP-G is forwarded to assessments; service won't normally reach here.
    return calculated_values, None


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------


async def _find_draft(
    session: AsyncSession, user_id: uuid.UUID, worksheet_code: str
) -> WorksheetResponse | None:
    res = await session.execute(
        select(WorksheetResponse).where(
            and_(
                WorksheetResponse.user_id == user_id,
                WorksheetResponse.worksheet_code == worksheet_code,
                WorksheetResponse.is_draft.is_(True),
            )
        )
    )
    return res.scalar_one_or_none()


async def save_draft(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    worksheet_code: str,
    response_data: dict[str, Any],
    completion_percentage: int | None,
) -> WorksheetResponse:
    row = await get_worksheet_row(session, worksheet_code)
    schema = schema_for(row)
    pct = (
        int(completion_percentage)
        if completion_percentage is not None
        else derive_completion_percentage(schema, response_data)
    )
    pct = max(0, min(100, pct))

    existing = await _find_draft(session, user_id, worksheet_code)
    if existing is None:
        existing = WorksheetResponse(
            user_id=user_id,
            worksheet_code=worksheet_code,
            response_data=response_data,
            calculated_values=None,
            feedback=None,
            completion_percentage=pct,
            is_draft=True,
        )
        session.add(existing)
    else:
        existing.response_data = response_data
        existing.completion_percentage = pct

    await session.commit()
    await session.refresh(existing)
    return existing


async def submit(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    worksheet_code: str,
    response_data: dict[str, Any],
) -> WorksheetResponse:
    row = await get_worksheet_row(session, worksheet_code)
    schema = schema_for(row)
    calculator = internal_calculator_key(row)

    # APP-G is not stored here — the API layer should redirect to /assessments/10q.
    if calculator == "assessment_10q":
        raise APIError(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="USE_ASSESSMENTS_ENDPOINT",
            message="APP-G submissions must use POST /assessments/10q.",
        )

    validated = validate_response(schema, response_data)
    _raise_validation_error(validated.errors)

    completion_pct = derive_completion_percentage(schema, validated.cleaned)
    calculated_values = calculate(calculator, validated.cleaned)
    calculated_values, feedback = generate_feedback(
        worksheet_code,
        schema,
        validated.cleaned,
        calculated_values,
        completion_pct,
    )

    submission = WorksheetResponse(
        user_id=user_id,
        worksheet_code=worksheet_code,
        response_data=validated.cleaned,
        calculated_values=calculated_values,
        feedback=feedback,
        completion_percentage=completion_pct,
        is_draft=False,
    )
    session.add(submission)

    # Remove any matching draft.
    draft = await _find_draft(session, user_id, worksheet_code)
    if draft is not None:
        await session.delete(draft)

    await session.commit()
    await session.refresh(submission)
    return submission


async def get_latest(
    session: AsyncSession, *, user_id: uuid.UUID, worksheet_code: str
) -> WorksheetResponse | None:
    res = await session.execute(
        select(WorksheetResponse)
        .where(
            and_(
                WorksheetResponse.user_id == user_id,
                WorksheetResponse.worksheet_code == worksheet_code,
            )
        )
        .order_by(desc(WorksheetResponse.updated_at))
        .limit(1)
    )
    return res.scalar_one_or_none()


async def get_history(
    session: AsyncSession, *, user_id: uuid.UUID, worksheet_code: str
) -> list[WorksheetResponse]:
    res = await session.execute(
        select(WorksheetResponse)
        .where(
            and_(
                WorksheetResponse.user_id == user_id,
                WorksheetResponse.worksheet_code == worksheet_code,
                WorksheetResponse.is_draft.is_(False),
            )
        )
        .order_by(desc(WorksheetResponse.created_at))
    )
    return list(res.scalars())


async def get_by_id(
    session: AsyncSession, *, user_id: uuid.UUID, worksheet_id: uuid.UUID
) -> WorksheetResponse:
    res = await session.execute(
        select(WorksheetResponse).where(
            and_(
                WorksheetResponse.worksheet_id == worksheet_id,
                WorksheetResponse.user_id == user_id,
            )
        )
    )
    row = res.scalar_one_or_none()
    if row is None:
        raise APIError(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Worksheet not found.",
        )
    return row


def history_entry_view(row: WorksheetResponse, summary_keys: list[str]) -> dict[str, Any]:
    calc = row.calculated_values or {}
    summary = {k: calc.get(k) for k in summary_keys}
    # Completion-only worksheets summarise the percentage instead.
    if "completion_percentage" in summary_keys:
        summary["completion_percentage"] = row.completion_percentage
    return {
        "worksheet_id": row.worksheet_id,
        "completion_percentage": row.completion_percentage,
        "calculated_values_summary": summary,
        "created_at": row.created_at,
    }


__all__ = [
    "ValidationResult",
    "calculate",
    "calculate_budget",
    "calculate_debt_disclosure",
    "calculate_net_worth",
    "catalogue_view",
    "derive_completion_percentage",
    "generate_feedback",
    "get_by_id",
    "get_history",
    "get_latest",
    "get_worksheet_row",
    "history_entry_view",
    "save_draft",
    "schema_for",
    "submit",
    "validate_response",
]
