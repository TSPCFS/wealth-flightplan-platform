"""Content endpoints — conforms to docs/API_CONTRACT.md (Phase 3)."""

from __future__ import annotations

import logging
import re
from typing import Any, Literal

from fastapi import APIRouter, Body, Depends, Query, status
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_request_context
from app.core.errors import APIError
from app.db.database import get_db
from app.db.models import ExampleInteraction, User
from app.schemas.content import (
    CalculateResponse,
    CaseStudiesResponse,
    CaseStudyDetail,
    ExampleDetail,
    ExamplesResponse,
    FrameworkResponse,
    StepDetail,
)
from app.services import content as content_service
from app.services.auth import RequestContext
from app.services.calculator import CALCULATORS

router = APIRouter(prefix="/content", tags=["content"])
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Framework
# ---------------------------------------------------------------------------


@router.get("/framework", response_model=FrameworkResponse)
async def get_framework(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    return await content_service.get_framework(session)


@router.get("/steps/{step_number}", response_model=StepDetail)
async def get_step(
    step_number: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    return await content_service.get_step(session, step_number)


# ---------------------------------------------------------------------------
# Examples
# ---------------------------------------------------------------------------


@router.get("/examples", response_model=ExamplesResponse)
async def list_examples(
    step_number: str | None = Query(default=None),
    stage: str | None = Query(default=None),
    calculator_type: (
        Literal["compound_interest", "debt_analysis", "budget_allocator", "net_worth_analyzer"]
        | None
    ) = Query(default=None),
    has_calculator: bool | None = Query(default=None),
    q: str | None = Query(default=None),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    return await content_service.list_examples(
        session,
        step_number=step_number,
        stage=stage,
        calculator_type=calculator_type,
        has_calculator=has_calculator,
        q=q,
    )


@router.get("/examples/{example_code}", response_model=ExampleDetail)
async def get_example(
    example_code: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    return await content_service.get_example(session, example_code)


# ---------------------------------------------------------------------------
# Calculate
# ---------------------------------------------------------------------------


_FORMAT_RENDERERS: dict[str, callable] = {
    "currency": lambda v: f"{float(v):,.0f}",
    "integer": lambda v: f"{int(round(float(v))):,}",
    "percent": lambda v: f"{float(v):.1f}%",
    "decimal": lambda v: f"{float(v):,.2f}",
}


def _format_value(value: Any, fmt: str | None) -> str:
    if value is None:
        return ""
    if fmt and fmt in _FORMAT_RENDERERS:
        try:
            return _FORMAT_RENDERERS[fmt](value)
        except (TypeError, ValueError):
            return str(value)
    if isinstance(value, float):
        return _FORMAT_RENDERERS["decimal"](value)
    return str(value)


def _format_map(inputs: dict, outputs: dict, calculator_config: dict) -> dict[str, str]:
    """Build a {key: formatted_string} map for substitution in the template."""
    input_formats: dict[str, str | None] = {
        spec.get("name"): spec.get("format")
        for spec in calculator_config.get("inputs", [])
        if isinstance(spec, dict) and spec.get("name")
    }
    out: dict[str, str] = {}
    for key, value in inputs.items():
        out[key] = _format_value(value, input_formats.get(key))
    output_formats = {
        "final_amount": "currency",
        "monthly_passive_income": "currency",
        "total_contributed": "currency",
        "total_growth": "currency",
        "total_debt": "currency",
        "total_interest_paid": "currency",
        "total_monthly_minimums": "currency",
        "weighted_average_rate_pct": "percent",
        "debt_free_months": "integer",
        "total_income": "currency",
        "total_allocated": "currency",
        "surplus_deficit": "currency",
        "needs_pct": "percent",
        "wants_pct": "percent",
        "invest_pct": "percent",
        "total_lifestyle_assets": "currency",
        "total_income_generating_assets": "currency",
        "total_assets": "currency",
        "total_liabilities": "currency",
        "net_worth": "currency",
        "income_generating_pct_of_net_worth": "percent",
    }
    for key, value in outputs.items():
        if isinstance(value, list | dict):
            continue
        fmt = output_formats.get(key)
        out[key] = _format_value(value, fmt)
    return out


_PLACEHOLDER_RE = re.compile(r"\{([a-zA-Z0-9_]+)\}")


def _render_interpretation(template: str, values: dict[str, str]) -> str:
    def _sub(match: re.Match[str]) -> str:
        key = match.group(1)
        return values.get(key, match.group(0))

    return _PLACEHOLDER_RE.sub(_sub, template)


def _validation_error_from_pydantic(exc: ValidationError) -> APIError:
    details: dict[str, list[str]] = {}
    for err in exc.errors():
        loc = [str(p) for p in err.get("loc", []) if p not in ("body", "query", "path")]
        field = ".".join(loc) if loc else "_"
        details.setdefault(field, []).append(err.get("msg", "Invalid value"))
    return APIError(
        status_code=status.HTTP_400_BAD_REQUEST,
        code="VALIDATION_ERROR",
        message="One or more fields are invalid.",
        details=details,
    )


@router.post("/examples/{example_code}/calculate", response_model=CalculateResponse)
async def calculate_example(
    example_code: str,
    payload: dict = Body(default_factory=dict),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    ctx: RequestContext = Depends(get_request_context),
) -> dict:
    row = await content_service.get_example_row(session, example_code)
    if row is None or row.calculator_type is None or row.calculator_config is None:
        raise APIError(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message=f"No calculator available for example {example_code!r}.",
        )

    calculator_type = row.calculator_type
    spec = CALCULATORS.get(calculator_type)
    if spec is None:
        raise APIError(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message=f"Unknown calculator_type {calculator_type!r}.",
        )
    input_model, fn = spec

    try:
        inp = input_model.model_validate(payload)
    except ValidationError as exc:
        raise _validation_error_from_pydantic(exc) from exc

    output = fn(inp)

    inputs_dict = inp.model_dump()
    outputs_dict = output.model_dump()
    template: str = row.calculator_config.get("interpretation_template", "")
    values = _format_map(inputs_dict, outputs_dict, row.calculator_config)
    interpretation = _render_interpretation(template, values)

    # Persist analytics row.
    try:
        chapter = (row.detail or {}).get("chapter") if row.detail else None
        session.add(
            ExampleInteraction(
                user_id=current_user.user_id,
                example_code=row.content_code,
                example_title=row.title,
                chapter=chapter,
                input_parameters=inputs_dict,
                calculated_output=outputs_dict,
            )
        )
        await session.commit()
    except Exception as exc:  # pragma: no cover — defensive
        logger.warning("Failed to record example_interaction: %s", exc)
        await session.rollback()

    return {
        "example_code": row.content_code,
        "calculator_type": calculator_type,
        "inputs": inputs_dict,
        "outputs": outputs_dict,
        "interpretation": interpretation,
    }


# ---------------------------------------------------------------------------
# Case studies
# ---------------------------------------------------------------------------


@router.get("/case-studies", response_model=CaseStudiesResponse)
async def list_case_studies(
    stage: str | None = Query(default=None),
    step_number: str | None = Query(default=None),
    q: str | None = Query(default=None),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    return await content_service.list_case_studies(
        session, stage=stage, step_number=step_number, q=q
    )


@router.get("/case-studies/{study_code}", response_model=CaseStudyDetail)
async def get_case_study(
    study_code: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    return await content_service.get_case_study(session, study_code)
