"""Dashboard aggregator: composes data from progress / recommendations /
activity / milestones plus a small quick-stats query."""

from __future__ import annotations

from typing import Any

from sqlalchemy import and_, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User, WorksheetResponse
from app.services import activity as activity_service
from app.services import milestones as milestone_service
from app.services import progress as progress_service
from app.services import recommendations as rec_service
from app.services.assessment_content import (
    STAGE_DESCRIPTIONS,
    STAGE_INCOME_RUNWAY,
    STAGES_5Q,
    STAGES_10Q,
)

# Ordered list used for "next_stage" lookup.
STAGE_ORDER: list[str] = ["Foundation", "Momentum", "Freedom", "Independence", "Abundance"]


# ---------------------------------------------------------------------------
# Stage progress within band
# ---------------------------------------------------------------------------


def _band_for(assessment_type: str, score: int) -> tuple[int, int, str] | None:
    table = STAGES_5Q if assessment_type == "5q" else STAGES_10Q
    for lo, hi, name in table:
        if lo <= score <= hi:
            return (lo, hi, name)
    return None


def progress_to_next_stage_pct(
    *, assessment_type: str | None, score: int | None, stage: str | None
) -> int | None:
    if assessment_type is None or score is None or stage is None:
        return None
    band = _band_for(assessment_type, int(score))
    if band is None:
        return None
    lo, hi, _name = band
    if hi == lo:
        return 0
    # Abundance (top band of 10Q) has no next stage → null per contract.
    table = STAGES_5Q if assessment_type == "5q" else STAGES_10Q
    if band == table[-1]:
        return None
    pct = round(100 * (score - lo) / (hi - lo))
    return max(0, min(100, pct))


def next_stage_of(current_stage: str | None) -> str | None:
    if current_stage is None:
        return None
    try:
        idx = STAGE_ORDER.index(current_stage)
    except ValueError:
        return None
    return STAGE_ORDER[idx + 1] if idx + 1 < len(STAGE_ORDER) else None


# ---------------------------------------------------------------------------
# Quick stats query: 4 single-row lookups, no N+1.
# ---------------------------------------------------------------------------


async def _latest_calculated(
    session: AsyncSession, user_id, worksheet_code: str
) -> dict[str, Any] | None:
    res = await session.execute(
        select(WorksheetResponse.calculated_values)
        .where(
            and_(
                WorksheetResponse.user_id == user_id,
                WorksheetResponse.worksheet_code == worksheet_code,
                WorksheetResponse.is_draft.is_(False),
            )
        )
        .order_by(desc(WorksheetResponse.created_at))
        .limit(1)
    )
    row = res.first()
    return (row[0] if row else None) or None


async def _latest_response(
    session: AsyncSession, user_id, worksheet_code: str
) -> dict[str, Any] | None:
    res = await session.execute(
        select(WorksheetResponse.response_data)
        .where(
            and_(
                WorksheetResponse.user_id == user_id,
                WorksheetResponse.worksheet_code == worksheet_code,
                WorksheetResponse.is_draft.is_(False),
            )
        )
        .order_by(desc(WorksheetResponse.created_at))
        .limit(1)
    )
    row = res.first()
    return (row[0] if row else None) or None


async def quick_stats(session: AsyncSession, user_id) -> dict[str, Any]:
    app_a = await _latest_calculated(session, user_id, "APP-A")
    app_b = await _latest_calculated(session, user_id, "APP-B")
    app_d_response = await _latest_response(session, user_id, "APP-D")

    monthly_surplus: float | None = None
    if app_a is not None:
        monthly_surplus = app_a.get("surplus_deficit")

    net_worth: float | None = None
    income_generating_pct: float | None = None
    if app_b is not None:
        net_worth = app_b.get("net_worth")
        income_generating_pct = app_b.get("income_generating_pct_of_net_worth")

    total_consumer_debt: float | None = None
    if app_d_response is not None:
        consumer_buckets = {"credit_card", "store_account", "personal_loan"}
        total = 0.0
        for row in app_d_response.get("debts") or []:
            if not isinstance(row, dict):
                continue
            if row.get("account_type") in consumer_buckets:
                try:
                    total += float(row.get("balance") or 0)
                except (TypeError, ValueError):
                    pass
        total_consumer_debt = total

    return {
        "net_worth": net_worth,
        "monthly_surplus": monthly_surplus,
        "total_consumer_debt": total_consumer_debt,
        "income_generating_pct": income_generating_pct,
    }


# ---------------------------------------------------------------------------
# Dashboard composer
# ---------------------------------------------------------------------------


async def get_dashboard(session: AsyncSession, user: User) -> dict[str, Any]:
    # Reuse the recommendations signals pipeline so we don't re-query.
    signals = await rec_service._gather_signals(session, user)  # noqa: SLF001
    actions = rec_service.compose_actions(signals)

    progress_payload = await progress_service.get_progress(session, user)

    stage = (
        signals.latest_5q_or_10q.calculated_stage if signals.latest_5q_or_10q is not None else None
    )

    stage_details: dict[str, Any] | None = None
    if stage is not None and stage in STAGE_DESCRIPTIONS:
        latest = signals.latest_5q_or_10q
        pct = progress_to_next_stage_pct(
            assessment_type=latest.assessment_type if latest else None,
            score=latest.total_score if latest else None,
            stage=stage,
        )
        stage_details = {
            "name": stage,
            "description": STAGE_DESCRIPTIONS[stage],
            "income_runway": STAGE_INCOME_RUNWAY[stage],
            "progress_to_next_stage_pct": pct,
            "next_stage": next_stage_of(stage),
        }

    # next_step = first incomplete visible step
    next_step: dict[str, Any] | None = None
    for step in progress_payload["steps"]:
        if not step["is_completed"]:
            next_step = {"step_number": step["step_number"], "title": step["title"]}
            break

    overall_progress = {
        "framework_completion_pct": progress_payload["overall_completion_pct"],
        "steps_completed": progress_payload["steps_completed"],
        "steps_total": progress_payload["steps_total"],
        "current_focus_step": progress_payload["current_focus_step"],
        "next_step": next_step,
    }

    activity = await activity_service.get_activity(session, user=user, limit=10)
    milestones = await milestone_service.get_milestones(session, user)
    upcoming_top5 = milestones["upcoming"][:5]

    stats = await quick_stats(session, user.user_id)

    return {
        "current_stage": stage,
        "current_stage_details": stage_details,
        "overall_progress": overall_progress,
        "recommended_actions": actions,
        "recent_activity": activity["events"],
        "upcoming_milestones": upcoming_top5,
        "quick_stats": stats,
    }


__all__ = [
    "STAGE_ORDER",
    "get_dashboard",
    "next_stage_of",
    "progress_to_next_stage_pct",
    "quick_stats",
]
