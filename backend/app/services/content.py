"""Content service — DB queries + view-shaping for /content/* endpoints.

The seed populates content_metadata. The API layer calls into this module
and returns the dicts as-is via Pydantic response models.
"""

from __future__ import annotations

from typing import Any

from fastapi import status
from sqlalchemy import and_, asc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import APIError
from app.db.models import ContentMetadata

# Step ordering: 1, 2, 3, 4a, 4b, 5, 6.
_STEP_ORDER = ["1", "2", "3", "4a", "4b", "5", "6"]
_STEP_ORDER_INDEX = {s: i for i, s in enumerate(_STEP_ORDER)}


# ---------------------------------------------------------------------------
# Shaping helpers
# ---------------------------------------------------------------------------


def _step_view(row: ContentMetadata) -> dict[str, Any]:
    """Map a content_type='step' row to the FrameworkStep response shape."""
    detail = row.detail or {}
    return {
        "step_number": detail.get("step_number", str(row.parent_step or "")),
        "title": row.title,
        "subtitle": detail.get("subtitle", ""),
        "description": row.description or "",
        "key_metrics": detail.get("key_metrics", []),
        "time_estimate_minutes": int(detail.get("time_estimate_minutes", 0) or 0),
        "stage_relevance": list(row.stage_relevance or []),
        "related_example_codes": detail.get("related_example_codes", []),
        "related_worksheet_codes": detail.get("related_worksheet_codes", []),
    }


def _step_detail_view(row: ContentMetadata) -> dict[str, Any]:
    base = _step_view(row)
    base["body_markdown"] = (row.detail or {}).get("body_markdown")
    return base


def _example_list_view(row: ContentMetadata) -> dict[str, Any]:
    detail = row.detail or {}
    return {
        "example_code": row.content_code,
        "title": row.title,
        "step_number": detail.get("step_number", str(row.parent_step or "")),
        "chapter": detail.get("chapter", ""),
        "calculator_type": row.calculator_type,
        "stage_relevance": list(row.stage_relevance or []),
        "key_principle": detail.get("key_principle", ""),
        "summary": row.summary or "",
    }


def _example_detail_view(row: ContentMetadata) -> dict[str, Any]:
    detail = row.detail or {}
    return {
        "example_code": row.content_code,
        "title": row.title,
        "step_number": detail.get("step_number", str(row.parent_step or "")),
        "chapter": detail.get("chapter", ""),
        "description": row.description or "",
        "key_principle": detail.get("key_principle", ""),
        "key_takeaway": detail.get("key_takeaway", ""),
        "educational_text": detail.get("educational_text", ""),
        "stage_relevance": list(row.stage_relevance or []),
        "calculator_type": row.calculator_type,
        "calculator_config": row.calculator_config if row.calculator_type else None,
        "related_example_codes": detail.get("related_example_codes", []),
    }


def _case_study_list_view(row: ContentMetadata) -> dict[str, Any]:
    detail = row.detail or {}
    return {
        "study_code": row.content_code,
        "name": row.title,
        "summary": row.summary or "",
        "learning": detail.get("learning", ""),
        "stage_relevance": list(row.stage_relevance or []),
        "related_step_numbers": detail.get("related_step_numbers", []),
    }


def _case_study_detail_view(row: ContentMetadata) -> dict[str, Any]:
    detail = row.detail or {}
    return {
        "study_code": row.content_code,
        "name": row.title,
        "age_band": detail.get("age_band"),
        "income_monthly": detail.get("income_monthly"),
        "situation": detail.get("situation", ""),
        "learning": detail.get("learning", ""),
        "key_insight": detail.get("key_insight", ""),
        "stage_relevance": list(row.stage_relevance or []),
        "related_step_numbers": detail.get("related_step_numbers", []),
        "related_example_codes": detail.get("related_example_codes", []),
    }


# ---------------------------------------------------------------------------
# Queries
# ---------------------------------------------------------------------------


async def get_framework(session: AsyncSession) -> dict[str, Any]:
    res = await session.execute(
        select(ContentMetadata).where(ContentMetadata.content_type == "step")
    )
    rows = list(res.scalars())
    steps = [_step_view(r) for r in rows]
    steps.sort(key=lambda s: _STEP_ORDER_INDEX.get(s["step_number"], 999))
    return {"steps": steps}


async def get_step(session: AsyncSession, step_number: str) -> dict[str, Any]:
    if step_number not in _STEP_ORDER:
        raise APIError(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message=f"Unknown step_number: {step_number!r}",
        )
    # detail->>'step_number' equality (works on Postgres JSONB + SQLite JSON via
    # raw text comparison, since we always seed step_number as a string).
    res = await session.execute(
        select(ContentMetadata).where(ContentMetadata.content_type == "step")
    )
    rows = list(res.scalars())
    for row in rows:
        if (row.detail or {}).get("step_number") == step_number:
            return _step_detail_view(row)
    raise APIError(
        status_code=status.HTTP_404_NOT_FOUND,
        code="NOT_FOUND",
        message=f"Step {step_number!r} not found.",
    )


async def list_examples(
    session: AsyncSession,
    *,
    step_number: str | None = None,
    stage: str | None = None,
    calculator_type: str | None = None,
    has_calculator: bool | None = None,
    q: str | None = None,
) -> dict[str, Any]:
    stmt = select(ContentMetadata).where(ContentMetadata.content_type == "example")
    if calculator_type is not None:
        stmt = stmt.where(ContentMetadata.calculator_type == calculator_type)
    if has_calculator is True:
        stmt = stmt.where(ContentMetadata.calculator_type.isnot(None))
    elif has_calculator is False:
        stmt = stmt.where(ContentMetadata.calculator_type.is_(None))
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(ContentMetadata.title).like(like),
                func.lower(ContentMetadata.summary).like(like),
                func.lower(ContentMetadata.description).like(like),
            )
        )
    res = await session.execute(stmt)
    rows = list(res.scalars())

    # Filters that touch JSON fields are easier post-hoc and the data set is tiny.
    def _matches(row: ContentMetadata) -> bool:
        detail = row.detail or {}
        if step_number is not None and detail.get("step_number") != step_number:
            return False
        if stage is not None and stage not in (row.stage_relevance or []):
            return False
        return True

    filtered = [r for r in rows if _matches(r)]
    # Stable, predictable order: by example_code (WE-1, WE-2, ...).
    filtered.sort(key=lambda r: _example_sort_key(r.content_code))
    items = [_example_list_view(r) for r in filtered]
    return {"examples": items, "total": len(items)}


def _example_sort_key(code: str) -> tuple[int, str]:
    """Sort 'WE-3' < 'WE-10' < 'WE-13' (numeric within the WE- family)."""
    if code.startswith("WE-"):
        try:
            return (int(code.split("-", 1)[1]), code)
        except ValueError:
            return (10_000, code)
    return (10_001, code)


async def get_example(session: AsyncSession, example_code: str) -> dict[str, Any]:
    res = await session.execute(
        select(ContentMetadata).where(
            and_(
                ContentMetadata.content_type == "example",
                ContentMetadata.content_code == example_code,
            )
        )
    )
    row = res.scalar_one_or_none()
    if row is None:
        raise APIError(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message=f"Example {example_code!r} not found.",
        )
    return _example_detail_view(row)


async def get_example_row(session: AsyncSession, example_code: str) -> ContentMetadata | None:
    """Raw row accessor for the calculate endpoint."""
    res = await session.execute(
        select(ContentMetadata).where(
            and_(
                ContentMetadata.content_type == "example",
                ContentMetadata.content_code == example_code,
            )
        )
    )
    return res.scalar_one_or_none()


async def list_case_studies(
    session: AsyncSession,
    *,
    stage: str | None = None,
    step_number: str | None = None,
    q: str | None = None,
) -> dict[str, Any]:
    stmt = (
        select(ContentMetadata)
        .where(ContentMetadata.content_type == "case_study")
        .order_by(asc(ContentMetadata.content_code))
    )
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(ContentMetadata.title).like(like),
                func.lower(ContentMetadata.summary).like(like),
                func.lower(ContentMetadata.description).like(like),
            )
        )
    res = await session.execute(stmt)
    rows = list(res.scalars())

    def _matches(row: ContentMetadata) -> bool:
        detail = row.detail or {}
        if stage is not None and stage not in (row.stage_relevance or []):
            return False
        if step_number is not None and step_number not in (
            detail.get("related_step_numbers") or []
        ):
            return False
        return True

    filtered = [r for r in rows if _matches(r)]
    items = [_case_study_list_view(r) for r in filtered]
    return {"case_studies": items, "total": len(items)}


async def get_case_study(session: AsyncSession, study_code: str) -> dict[str, Any]:
    res = await session.execute(
        select(ContentMetadata).where(
            and_(
                ContentMetadata.content_type == "case_study",
                ContentMetadata.content_code == study_code,
            )
        )
    )
    row = res.scalar_one_or_none()
    if row is None:
        raise APIError(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message=f"Case study {study_code!r} not found.",
        )
    return _case_study_detail_view(row)


__all__ = [
    "get_case_study",
    "get_example",
    "get_example_row",
    "get_framework",
    "get_step",
    "list_case_studies",
    "list_examples",
]
