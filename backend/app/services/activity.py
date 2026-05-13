"""Activity feed: query-time aggregation across assessments, worksheets,
and user_progress, plus a derived `stage_changed` synthesis.

Phase 5 only: no new storage. Cursor pagination is opaque base64 of
``(timestamp_iso, sort_tag)`` where ``sort_tag`` is a stable per-event key
so ties between events that landed in the same instant remain deterministic.
"""

from __future__ import annotations

import base64
import binascii
import json
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import asc, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Assessment, User, UserProgress, WorksheetResponse
from app.services.progress import STEP_TITLES

DEFAULT_LIMIT = 20
MAX_LIMIT = 100


@dataclass(slots=True)
class _Event:
    event_type: str
    title: str
    timestamp: datetime
    details: dict[str, Any]
    link: str | None
    sort_tag: str  # stable tie-breaker for the cursor


# ---------------------------------------------------------------------------
# Source-table loaders
# ---------------------------------------------------------------------------


async def _load_assessment_events(session: AsyncSession, user_id) -> list[_Event]:
    res = await session.execute(
        select(Assessment)
        .where(Assessment.user_id == user_id)
        .order_by(desc(Assessment.created_at))
    )
    rows = list(res.scalars())
    events: list[_Event] = []
    for row in rows:
        if row.assessment_type == "gap_test":
            band = row.calculated_stage or "–"
            title = f"Completed GAP Test: scored {band} band"
        else:
            label = "5Q" if row.assessment_type == "5q" else "10Q"
            stage = row.calculated_stage or "–"
            title = f"Completed {label} assessment: placed at {stage}"
        events.append(
            _Event(
                event_type="assessment_submitted",
                title=title,
                timestamp=row.created_at,
                details={
                    "assessment_id": str(row.assessment_id),
                    "assessment_type": row.assessment_type,
                    "stage": row.calculated_stage,
                    "score": row.total_score,
                },
                link=f"/assessments/results/{row.assessment_id}",
                sort_tag=f"assessment:{row.assessment_id}",
            )
        )
    return events


async def _load_worksheet_events(session: AsyncSession, user_id) -> list[_Event]:
    """Submissions only (drafts don't surface in the feed)."""
    res = await session.execute(
        select(WorksheetResponse)
        .where(WorksheetResponse.user_id == user_id)
        .where(WorksheetResponse.is_draft.is_(False))
        .order_by(desc(WorksheetResponse.created_at))
    )
    rows = list(res.scalars())
    events: list[_Event] = []
    for row in rows:
        title_suffix = _worksheet_highlight(row)
        events.append(
            _Event(
                event_type="worksheet_submitted",
                title=f"Submitted {_worksheet_title(row.worksheet_code)}"
                + (f": {title_suffix}" if title_suffix else ""),
                timestamp=row.created_at,
                details={
                    "worksheet_id": str(row.worksheet_id),
                    "worksheet_code": row.worksheet_code,
                },
                link=f"/worksheets/results/{row.worksheet_id}",
                sort_tag=f"worksheet:{row.worksheet_id}",
            )
        )
    return events


def _worksheet_title(code: str) -> str:
    return {
        "APP-A": "Zero-Based Budget",
        "APP-B": "Net Worth Statement",
        "APP-C": "Risk Cover Review",
        "APP-D": "Debt Disclosure",
        "APP-E": "Monthly Money Review",
        "APP-F": "attooh! Life File",
        "APP-G": "Self-Assessment (10Q)",
    }.get(code, code)


def _worksheet_highlight(row: WorksheetResponse) -> str | None:
    calc = row.calculated_values or {}
    if row.worksheet_code == "APP-A" and "needs_pct" in calc:
        return (
            f"{calc.get('needs_pct')}%/"
            f"{calc.get('wants_pct')}%/"
            f"{calc.get('invest_pct')}% split"
        )
    if row.worksheet_code == "APP-B" and "net_worth" in calc:
        return f"R{calc['net_worth']:,.0f} net worth"
    if row.worksheet_code == "APP-D" and "total_debt" in calc:
        return f"R{calc['total_debt']:,.0f} total debt"
    return None


async def _load_step_completed_events(session: AsyncSession, user_id) -> list[_Event]:
    res = await session.execute(select(UserProgress).where(UserProgress.user_id == user_id))
    row = res.scalar_one_or_none()
    if row is None:
        return []
    events: list[_Event] = []
    for step_number in STEP_TITLES:
        completed = getattr(row, f"step_{step_number}_completed")
        completion_date = getattr(row, f"step_{step_number}_completion_date")
        if completed and completion_date:
            events.append(
                _Event(
                    event_type="step_completed",
                    title=f"Completed Step {step_number}: {STEP_TITLES[step_number]}",
                    timestamp=completion_date,
                    details={"step_number": step_number},
                    link=f"/framework/steps/{step_number}",
                    sort_tag=f"step:{step_number}",
                )
            )
    return events


# ---------------------------------------------------------------------------
# stage_changed derivation
# ---------------------------------------------------------------------------


async def _load_stage_changed_events(session: AsyncSession, user_id) -> list[_Event]:
    res = await session.execute(
        select(Assessment)
        .where(Assessment.user_id == user_id)
        .where(Assessment.assessment_type.in_(("5q", "10q")))
        .order_by(asc(Assessment.created_at))
    )
    rows = list(res.scalars())
    events: list[_Event] = []
    prev_stage: str | None = None
    for row in rows:
        new_stage = row.calculated_stage
        if prev_stage is not None and new_stage is not None and prev_stage != new_stage:
            events.append(
                _Event(
                    event_type="stage_changed",
                    title=f"Moved from {prev_stage} → {new_stage}",
                    timestamp=row.created_at,
                    details={
                        "from_stage": prev_stage,
                        "to_stage": new_stage,
                        "assessment_id": str(row.assessment_id),
                    },
                    link=f"/assessments/results/{row.assessment_id}",
                    sort_tag=f"stage_changed:{row.assessment_id}",
                )
            )
        prev_stage = new_stage
    return events


# ---------------------------------------------------------------------------
# Composition + cursor
# ---------------------------------------------------------------------------


def _ensure_tzaware(dt: datetime) -> datetime:
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=UTC)


def _encode_cursor(timestamp: datetime, sort_tag: str) -> str:
    payload = {"t": _ensure_tzaware(timestamp).isoformat(), "k": sort_tag}
    raw = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii")


def _decode_cursor(cursor: str) -> tuple[datetime, str] | None:
    try:
        raw = base64.urlsafe_b64decode(cursor.encode("ascii"))
        payload = json.loads(raw.decode("utf-8"))
        return datetime.fromisoformat(payload["t"]), payload["k"]
    except (binascii.Error, ValueError, KeyError, json.JSONDecodeError):
        return None


def _sort_key(event: _Event) -> tuple[datetime, str]:
    return (_ensure_tzaware(event.timestamp), event.sort_tag)


def _serialise(event: _Event) -> dict[str, Any]:
    return {
        "event_type": event.event_type,
        "title": event.title,
        "details": event.details,
        "timestamp": _ensure_tzaware(event.timestamp),
        "link": event.link,
    }


async def get_activity(
    session: AsyncSession,
    *,
    user: User,
    limit: int = DEFAULT_LIMIT,
    cursor: str | None = None,
) -> dict[str, Any]:
    limit = max(1, min(MAX_LIMIT, limit))

    events: list[_Event] = []
    events.extend(await _load_assessment_events(session, user.user_id))
    events.extend(await _load_worksheet_events(session, user.user_id))
    events.extend(await _load_step_completed_events(session, user.user_id))
    events.extend(await _load_stage_changed_events(session, user.user_id))

    # Sort newest-first; tie-break on sort_tag descending (stable per-event id).
    events.sort(key=lambda e: _sort_key(e), reverse=True)

    if cursor is not None:
        decoded = _decode_cursor(cursor)
        if decoded is not None:
            cursor_ts, cursor_tag = decoded
            cursor_ts = _ensure_tzaware(cursor_ts)
            events = [e for e in events if _sort_key(e) < (cursor_ts, cursor_tag)]

    page = events[:limit]
    has_more = len(events) > limit
    next_cursor: str | None = None
    if has_more and page:
        last = page[-1]
        next_cursor = _encode_cursor(last.timestamp, last.sort_tag)

    return {
        "events": [_serialise(e) for e in page],
        "next_cursor": next_cursor,
        "has_more": has_more,
    }


__all__ = ["DEFAULT_LIMIT", "MAX_LIMIT", "get_activity"]
