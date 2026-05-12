"""Assessment service — scoring + persistence + history.

Pure scoring/banding functions are kept stateless so they can be unit-tested
without spinning a DB.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Literal

from fastapi import status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import APIError
from app.db.models import Assessment
from app.services import audit
from app.services.assessment_content import (
    GAP_BANDS,
    GAP_QUESTION_TITLES,
    GAP_RECOMMENDATIONS_NO,
    GAP_RECOMMENDATIONS_PARTIALLY,
    STAGE_DESCRIPTIONS,
    STAGE_INCOME_RUNWAY,
    STAGE_RECOMMENDATIONS,
    STAGES_5Q,
    STAGES_10Q,
)

AssessmentType = Literal["5q", "10q", "gap_test"]

_LETTER_POINTS: dict[str, int] = {"a": 1, "b": 2, "c": 3, "d": 4}
_GAP_POINTS: dict[str, int] = {"no": 0, "partially": 1, "yes": 2}
_GAP_PRIORITY: dict[str, str] = {"no": "high", "partially": "medium"}


# ---------------------------------------------------------------------------
# Pure scoring helpers
# ---------------------------------------------------------------------------


def _raise_validation(field: str, message: str) -> None:
    raise APIError(
        status_code=status.HTTP_400_BAD_REQUEST,
        code="VALIDATION_ERROR",
        message="One or more fields are invalid.",
        details={field: [message]},
    )


def _score_letters(responses: dict, *, expected_keys: tuple[str, ...]) -> int:
    if not isinstance(responses, dict):
        _raise_validation("responses", "responses must be an object.")

    missing = [k for k in expected_keys if k not in responses]
    if missing:
        _raise_validation("responses", f"missing answers for: {', '.join(missing)}")

    extra = [k for k in responses if k not in expected_keys]
    if extra:
        _raise_validation("responses", f"unexpected keys: {', '.join(sorted(extra))}")

    total = 0
    for key in expected_keys:
        raw = responses[key]
        if not isinstance(raw, str):
            _raise_validation(f"responses.{key}", "value must be a string a|b|c|d.")
        letter = raw.strip().lower()
        if letter not in _LETTER_POINTS:
            _raise_validation(f"responses.{key}", f"value must be one of a|b|c|d (got {raw!r}).")
        total += _LETTER_POINTS[letter]
    return total


def score_5q(responses: dict) -> int:
    """Return the sum-of-letters score for a 5Q submission (5-20)."""
    return _score_letters(responses, expected_keys=tuple(f"q{i}" for i in range(1, 6)))


def score_10q(responses: dict) -> int:
    """Return the sum-of-letters score for a 10Q submission (10-40)."""
    return _score_letters(responses, expected_keys=tuple(f"q{i}" for i in range(1, 11)))


def score_gap(responses: dict) -> int:
    """Return the sum-of-points score for a GAP submission (0-24)."""
    expected = tuple(f"q{i}" for i in range(1, 13))
    if not isinstance(responses, dict):
        _raise_validation("responses", "responses must be an object.")

    missing = [k for k in expected if k not in responses]
    if missing:
        _raise_validation("responses", f"missing answers for: {', '.join(missing)}")

    extra = [k for k in responses if k not in expected]
    if extra:
        _raise_validation("responses", f"unexpected keys: {', '.join(sorted(extra))}")

    total = 0
    for key in expected:
        raw = responses[key]
        if not isinstance(raw, str):
            _raise_validation(f"responses.{key}", "value must be one of yes|partially|no.")
        norm = raw.strip().lower()
        if norm not in _GAP_POINTS:
            _raise_validation(
                f"responses.{key}",
                f"value must be one of yes|partially|no (got {raw!r}).",
            )
        total += _GAP_POINTS[norm]
    return total


def _band_for(score: int, table: tuple[tuple[int, int, str], ...]) -> str:
    for lo, hi, name in table:
        if lo <= score <= hi:
            return name
    # Should never hit; bands cover full range.
    raise ValueError(f"score {score} outside known band table")


def stage_5q(score: int) -> str:
    return _band_for(score, STAGES_5Q)


def stage_10q(score: int) -> str:
    return _band_for(score, STAGES_10Q)


def gap_band(score: int) -> str:
    return _band_for(score, GAP_BANDS)


# ---------------------------------------------------------------------------
# Output shapers
# ---------------------------------------------------------------------------


def stage_details(stage: str) -> dict:
    return {
        "name": stage,
        "income_runway": STAGE_INCOME_RUNWAY[stage],
        "description": STAGE_DESCRIPTIONS[stage],
    }


def stage_recommendations(stage: str) -> list[str]:
    return list(STAGE_RECOMMENDATIONS[stage])


def _question_number(code: str) -> int:
    return int(code[1:]) if code.startswith("q") else 0


def gaps_identified(responses: dict) -> list[dict]:
    """Return non-yes responses, sorted: no first then partially, then by qN ascending."""
    out: list[dict] = []
    for code, raw in responses.items():
        norm = str(raw).strip().lower()
        if norm == "yes":
            continue
        rec = GAP_RECOMMENDATIONS_NO[code] if norm == "no" else GAP_RECOMMENDATIONS_PARTIALLY[code]
        out.append(
            {
                "question_code": code,
                "title": GAP_QUESTION_TITLES[code],
                "current_status": norm,
                "priority": _GAP_PRIORITY[norm],
                "recommendation": rec,
            }
        )
    # no=0 sorts before partially=1, then ascending question number.
    out.sort(key=lambda g: (_GAP_POINTS[g["current_status"]], _question_number(g["question_code"])))
    return out


def is_gap_plan_eligible(score: int, responses: dict) -> bool:
    """Eligible if total < 20 OR any answer is `no`."""
    if score < 20:
        return True
    return any(str(v).strip().lower() == "no" for v in responses.values())


# ---------------------------------------------------------------------------
# DB-aware operations
# ---------------------------------------------------------------------------


@dataclass(slots=True)
class RequestContext:
    ip_address: str | None = None
    user_agent: str | None = None


def _normalize_responses(responses: dict) -> dict:
    """Lowercase string values so DB storage matches what we scored."""
    return {k: (v.strip().lower() if isinstance(v, str) else v) for k, v in responses.items()}


async def _previous_stage(
    session: AsyncSession, user_id: uuid.UUID, before: datetime | None = None
) -> str | None:
    """Return the most-recent 5Q/10Q calculated_stage prior to ``before``."""
    stmt = (
        select(Assessment.calculated_stage)
        .where(Assessment.user_id == user_id)
        .where(Assessment.assessment_type.in_(("5q", "10q")))
        .order_by(desc(Assessment.created_at))
        .limit(1)
    )
    if before is not None:
        stmt = stmt.where(Assessment.created_at < before)
    res = await session.execute(stmt)
    row = res.first()
    return row[0] if row else None


async def _persist(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    assessment_type: AssessmentType,
    responses: dict,
    total_score: int,
    calculated_stage: str | None,
    stage_change_from_previous: str | None,
    completion_time_seconds: int | None,
    ctx: RequestContext,
) -> Assessment:
    row = Assessment(
        user_id=user_id,
        assessment_type=assessment_type,
        responses=_normalize_responses(responses),
        total_score=total_score,
        calculated_stage=calculated_stage,
        stage_change_from_previous=stage_change_from_previous,
        completion_time_seconds=completion_time_seconds,
        ip_address=ctx.ip_address,
        user_agent=ctx.user_agent,
    )
    session.add(row)
    await session.flush()
    await audit.record(
        session,
        action=f"assessment.submit.{assessment_type}",
        user_id=user_id,
        status="success",
        ip_address=ctx.ip_address,
        user_agent=ctx.user_agent,
        entity_type="assessment",
        entity_id=row.assessment_id,
        new_values={"total_score": total_score, "calculated_stage": calculated_stage},
    )
    await session.commit()
    await session.refresh(row)
    return row


async def submit_5q(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    responses: dict,
    completion_time_seconds: int | None,
    ctx: RequestContext,
) -> dict:
    score = score_5q(responses)
    stage = stage_5q(score)
    previous = await _previous_stage(session, user_id)
    row = await _persist(
        session,
        user_id=user_id,
        assessment_type="5q",
        responses=responses,
        total_score=score,
        calculated_stage=stage,
        stage_change_from_previous=previous,
        completion_time_seconds=completion_time_seconds,
        ctx=ctx,
    )
    return {
        "assessment_id": row.assessment_id,
        "assessment_type": "5q",
        "total_score": score,
        "calculated_stage": stage,
        "previous_stage": previous,
        "stage_details": stage_details(stage),
        "recommendations": stage_recommendations(stage),
        "created_at": row.created_at,
    }


async def submit_10q(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    responses: dict,
    completion_time_seconds: int | None,
    ctx: RequestContext,
) -> dict:
    score = score_10q(responses)
    stage = stage_10q(score)
    previous = await _previous_stage(session, user_id)
    row = await _persist(
        session,
        user_id=user_id,
        assessment_type="10q",
        responses=responses,
        total_score=score,
        calculated_stage=stage,
        stage_change_from_previous=previous,
        completion_time_seconds=completion_time_seconds,
        ctx=ctx,
    )
    return {
        "assessment_id": row.assessment_id,
        "assessment_type": "10q",
        "total_score": score,
        "calculated_stage": stage,
        "previous_stage": previous,
        "stage_details": stage_details(stage),
        "recommendations": stage_recommendations(stage),
        "created_at": row.created_at,
    }


async def submit_gap(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    responses: dict,
    completion_time_seconds: int | None,
    ctx: RequestContext,
) -> dict:
    score = score_gap(responses)
    band = gap_band(score)
    normalized = _normalize_responses(responses)
    gaps = gaps_identified(normalized)
    eligible = is_gap_plan_eligible(score, normalized)
    row = await _persist(
        session,
        user_id=user_id,
        assessment_type="gap_test",
        responses=responses,
        total_score=score,
        calculated_stage=band,
        stage_change_from_previous=None,
        completion_time_seconds=completion_time_seconds,
        ctx=ctx,
    )
    return {
        "assessment_id": row.assessment_id,
        "assessment_type": "gap_test",
        "total_score": score,
        "band": band,
        "gaps_identified": gaps,
        "advisor_recommendation": "Book a GAP Plan(TM) conversation" if eligible else None,
        "gap_plan_eligible": eligible,
        "created_at": row.created_at,
    }


# ---------------------------------------------------------------------------
# History + single-record
# ---------------------------------------------------------------------------


async def get_current_stage(session: AsyncSession, user_id: uuid.UUID) -> str | None:
    """Most-recent 5Q/10Q calculated_stage."""
    return await _previous_stage(session, user_id)


async def get_latest_assessment_id(session: AsyncSession, user_id: uuid.UUID) -> uuid.UUID | None:
    res = await session.execute(
        select(Assessment.assessment_id)
        .where(Assessment.user_id == user_id)
        .order_by(desc(Assessment.created_at))
        .limit(1)
    )
    row = res.first()
    return row[0] if row else None


async def get_history(session: AsyncSession, user_id: uuid.UUID) -> dict:
    res = await session.execute(
        select(Assessment)
        .where(Assessment.user_id == user_id)
        .order_by(desc(Assessment.created_at))
    )
    rows: list[Assessment] = list(res.scalars())

    assessments = []
    for row in rows:
        is_stage_test = row.assessment_type in ("5q", "10q")
        assessments.append(
            {
                "assessment_id": row.assessment_id,
                "assessment_type": row.assessment_type,
                "total_score": row.total_score,
                "calculated_stage": row.calculated_stage if is_stage_test else None,
                "band": row.calculated_stage if not is_stage_test else None,
                "created_at": row.created_at,
            }
        )

    # stage_progression: 5Q + 10Q only, oldest first.
    progression_rows = sorted(
        (r for r in rows if r.assessment_type in ("5q", "10q")),
        key=lambda r: r.created_at,
    )
    stage_progression = [
        {
            "stage": r.calculated_stage,
            "score": r.total_score,
            "date": r.created_at,
        }
        for r in progression_rows
    ]
    current_stage = stage_progression[-1]["stage"] if stage_progression else None
    return {
        "assessments": assessments,
        "current_stage": current_stage,
        "stage_progression": stage_progression,
    }


async def get_one(session: AsyncSession, *, user_id: uuid.UUID, assessment_id: uuid.UUID) -> dict:
    res = await session.execute(
        select(Assessment).where(
            Assessment.assessment_id == assessment_id,
            Assessment.user_id == user_id,
        )
    )
    row = res.scalar_one_or_none()
    if row is None:
        raise APIError(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Assessment not found.",
        )

    if row.assessment_type == "gap_test":
        normalized = _normalize_responses(row.responses)
        gaps = gaps_identified(normalized)
        return {
            "assessment_id": row.assessment_id,
            "assessment_type": row.assessment_type,
            "responses": row.responses,
            "total_score": row.total_score,
            "band": row.calculated_stage,
            "gaps_identified": gaps,
            "advisor_recommendation": (
                "Book a GAP Plan(TM) conversation"
                if is_gap_plan_eligible(row.total_score, normalized)
                else None
            ),
            "gap_plan_eligible": is_gap_plan_eligible(row.total_score, normalized),
            "completion_time_seconds": row.completion_time_seconds,
            "created_at": row.created_at,
        }
    # 5q / 10q
    stage = row.calculated_stage or ""
    return {
        "assessment_id": row.assessment_id,
        "assessment_type": row.assessment_type,
        "responses": row.responses,
        "total_score": row.total_score,
        "calculated_stage": stage,
        "previous_stage": row.stage_change_from_previous,
        "stage_details": stage_details(stage),
        "recommendations": stage_recommendations(stage),
        "completion_time_seconds": row.completion_time_seconds,
        "created_at": row.created_at,
    }


__all__ = [
    "RequestContext",
    "gap_band",
    "gaps_identified",
    "get_current_stage",
    "get_history",
    "get_latest_assessment_id",
    "get_one",
    "is_gap_plan_eligible",
    "score_10q",
    "score_5q",
    "score_gap",
    "stage_10q",
    "stage_5q",
    "stage_details",
    "stage_recommendations",
    "submit_10q",
    "submit_5q",
    "submit_gap",
]
