"""Milestones service — pure derivation from existing data.

No new storage. Achieved milestones come from existing assessment/worksheet/
progress rows; upcoming milestones are date math against the most recent
review-style worksheets.
"""

from __future__ import annotations

from calendar import monthrange
from collections import defaultdict
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy import asc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.datetimes import utcnow
from app.db.models import Assessment, User, UserProgress, WorksheetResponse
from app.services.progress import STEP_TITLES


@dataclass(slots=True)
class _Milestone:
    code: str
    title: str
    date: datetime | None = None
    due_date: date | None = None
    category: str | None = None
    urgency: str | None = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _ensure_tzaware(dt: datetime) -> datetime:
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=UTC)


def _last_day_of_month(d: date) -> date:
    return date(d.year, d.month, monthrange(d.year, d.month)[1])


def _urgency_for(due_date: date, *, today: date) -> str:
    if due_date < today:
        return "overdue"
    delta = (due_date - today).days
    if delta <= 7:
        return "soon"
    if delta <= 30:
        return "upcoming"
    return "upcoming"


# ---------------------------------------------------------------------------
# Achieved milestones
# ---------------------------------------------------------------------------


async def _first_assessment(session: AsyncSession, user_id) -> _Milestone | None:
    res = await session.execute(
        select(Assessment)
        .where(Assessment.user_id == user_id)
        .order_by(asc(Assessment.created_at))
        .limit(1)
    )
    row = res.scalar_one_or_none()
    if row is None:
        return None
    return _Milestone(
        code="first_assessment",
        title="First assessment completed",
        date=row.created_at,
    )


async def _first_worksheet(session: AsyncSession, user_id) -> _Milestone | None:
    res = await session.execute(
        select(WorksheetResponse)
        .where(WorksheetResponse.user_id == user_id)
        .where(WorksheetResponse.is_draft.is_(False))
        .order_by(asc(WorksheetResponse.created_at))
        .limit(1)
    )
    row = res.scalar_one_or_none()
    if row is None:
        return None
    return _Milestone(
        code="first_worksheet",
        title="First worksheet submitted",
        date=row.created_at,
    )


async def _stage_progression(session: AsyncSession, user_id) -> list[_Milestone]:
    res = await session.execute(
        select(Assessment)
        .where(Assessment.user_id == user_id)
        .where(Assessment.assessment_type.in_(("5q", "10q")))
        .order_by(asc(Assessment.created_at))
    )
    rows = list(res.scalars())
    out: list[_Milestone] = []
    prev_stage: str | None = None
    for row in rows:
        if (
            prev_stage is not None
            and row.calculated_stage is not None
            and row.calculated_stage != prev_stage
        ):
            out.append(
                _Milestone(
                    code="stage_progression",
                    title=f"Moved from {prev_stage} → {row.calculated_stage}",
                    date=row.created_at,
                )
            )
        prev_stage = row.calculated_stage
    return out


async def _step_completion_milestones(session: AsyncSession, user_id) -> list[_Milestone]:
    res = await session.execute(select(UserProgress).where(UserProgress.user_id == user_id))
    row = res.scalar_one_or_none()
    if row is None:
        return []
    out: list[_Milestone] = []
    for step_number, title in STEP_TITLES.items():
        if getattr(row, f"step_{step_number}_completed") and getattr(
            row, f"step_{step_number}_completion_date"
        ):
            out.append(
                _Milestone(
                    code="framework_step_completed",
                    title=f"Completed Step {step_number}: {title}",
                    date=getattr(row, f"step_{step_number}_completion_date"),
                )
            )
    return out


async def _worksheet_streak_3(session: AsyncSession, user_id) -> _Milestone | None:
    """Earliest date a user submitted their 3rd worksheet within a single
    calendar month, if any."""
    res = await session.execute(
        select(WorksheetResponse)
        .where(WorksheetResponse.user_id == user_id)
        .where(WorksheetResponse.is_draft.is_(False))
        .order_by(asc(WorksheetResponse.created_at))
    )
    rows = list(res.scalars())
    by_month: dict[tuple[int, int], list[datetime]] = defaultdict(list)
    for row in rows:
        ts = _ensure_tzaware(row.created_at)
        by_month[(ts.year, ts.month)].append(ts)
    earliest: datetime | None = None
    for _, timestamps in by_month.items():
        timestamps.sort()
        if len(timestamps) >= 3:
            candidate = timestamps[2]  # 3rd submission in that month
            if earliest is None or candidate < earliest:
                earliest = candidate
    if earliest is None:
        return None
    return _Milestone(
        code="worksheet_streak_3",
        title="Submitted 3 worksheets in a single month",
        date=earliest,
    )


# ---------------------------------------------------------------------------
# Upcoming milestones
# ---------------------------------------------------------------------------


def _monthly_money_conversation(today: date) -> _Milestone:
    due = _last_day_of_month(today)
    return _Milestone(
        code="monthly_money_conversation",
        title="Monthly Money Conversation",
        due_date=due,
        category="review",
        urgency=_urgency_for(due, today=today),
    )


async def _annual_review(
    session: AsyncSession,
    user_id,
    *,
    code: str,
    title: str,
    worksheet_code: str,
    today: date,
) -> _Milestone:
    res = await session.execute(
        select(WorksheetResponse.created_at)
        .where(WorksheetResponse.user_id == user_id)
        .where(WorksheetResponse.worksheet_code == worksheet_code)
        .where(WorksheetResponse.is_draft.is_(False))
        .order_by(WorksheetResponse.created_at.desc())
        .limit(1)
    )
    row = res.first()
    if row is None:
        due = today + timedelta(days=30)
    else:
        due = _ensure_tzaware(row[0]).date() + timedelta(days=365)
    return _Milestone(
        code=code,
        title=title,
        due_date=due,
        category="review",
        urgency=_urgency_for(due, today=today),
    )


async def _quarterly_assessment_refresh(
    session: AsyncSession, user_id, *, today: date
) -> _Milestone | None:
    res = await session.execute(
        select(Assessment.created_at)
        .where(Assessment.user_id == user_id)
        .where(Assessment.assessment_type.in_(("5q", "10q")))
        .order_by(Assessment.created_at.desc())
        .limit(1)
    )
    row = res.first()
    if row is None:
        return None
    last_at = _ensure_tzaware(row[0]).date()
    due = last_at + timedelta(days=90)
    return _Milestone(
        code="quarterly_assessment_refresh",
        title="Quarterly stage refresh — retake the assessment",
        due_date=due,
        category="assessment",
        urgency=_urgency_for(due, today=today),
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def _achieved_view(m: _Milestone) -> dict[str, Any]:
    return {"code": m.code, "title": m.title, "date": m.date}


def _upcoming_view(m: _Milestone) -> dict[str, Any]:
    return {
        "code": m.code,
        "title": m.title,
        "due_date": m.due_date.isoformat() if m.due_date else None,
        "category": m.category,
        "urgency": m.urgency,
    }


async def get_milestones(
    session: AsyncSession, user: User, *, now: datetime | None = None
) -> dict[str, Any]:
    now = _ensure_tzaware(now or utcnow())
    today = now.date()

    achieved: list[_Milestone] = []
    fa = await _first_assessment(session, user.user_id)
    if fa is not None:
        achieved.append(fa)
    fw = await _first_worksheet(session, user.user_id)
    if fw is not None:
        achieved.append(fw)
    achieved.extend(await _stage_progression(session, user.user_id))
    achieved.extend(await _step_completion_milestones(session, user.user_id))
    streak = await _worksheet_streak_3(session, user.user_id)
    if streak is not None:
        achieved.append(streak)

    achieved.sort(key=lambda m: _ensure_tzaware(m.date), reverse=True)

    upcoming: list[_Milestone] = [
        _monthly_money_conversation(today),
        await _annual_review(
            session,
            user.user_id,
            code="annual_cover_review",
            title="Annual cover review",
            worksheet_code="APP-C",
            today=today,
        ),
        await _annual_review(
            session,
            user.user_id,
            code="annual_net_worth_review",
            title="Annual Net Worth Statement",
            worksheet_code="APP-B",
            today=today,
        ),
    ]
    quarterly = await _quarterly_assessment_refresh(session, user.user_id, today=today)
    if quarterly is not None:
        upcoming.append(quarterly)

    upcoming.sort(key=lambda m: m.due_date or date.max)

    return {
        "achieved": [_achieved_view(m) for m in achieved],
        "upcoming": [_upcoming_view(m) for m in upcoming],
    }


__all__ = ["get_milestones"]
