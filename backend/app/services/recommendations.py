"""Recommendation engine — 6-rule cascade producing up to 5 actions.

Rules apply in order; rules 1 and 2 are short-circuiting (they stop the
cascade as soon as they fire). The remaining rules append candidates until
the 5-action cap is reached. Final ordering is by priority (high > medium >
low), preserving insertion order within a priority.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import and_, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.datetimes import utcnow
from app.db.models import Assessment, User, WorksheetResponse
from app.services import progress as progress_service
from app.services.recommendation_content import (
    BASELINE_DETAILS,
    FIRST_STEP_ACTION,
    GAP_CRITICAL_ACTIONS,
    STAGE_BASELINE_WORKSHEETS,
    STAGE_NEXT_STEP_ACTIONS,
    STALE_REVIEW_ACTIONS,
    Action,
    backfill_action,
)

CRITICAL_GAP_KEYS: tuple[str, ...] = ("q1", "q4", "q5", "q6")
MAX_ACTIONS = 5
PRIORITY_ORDER: dict[str, int] = {"high": 0, "medium": 1, "low": 2}


# ---------------------------------------------------------------------------
# Helper queries
# ---------------------------------------------------------------------------


@dataclass(slots=True)
class _UserSignals:
    latest_5q_or_10q: Assessment | None
    latest_gap_test: Assessment | None
    submitted_worksheet_codes: set[str]
    latest_app_b_at: datetime | None
    latest_app_c_at: datetime | None
    current_focus_step: str | None


async def _gather_signals(session: AsyncSession, user: User) -> _UserSignals:
    """Single round-trip per signal — all read-only, no N+1 across worksheets."""
    # Latest 5Q/10Q assessment.
    res = await session.execute(
        select(Assessment)
        .where(Assessment.user_id == user.user_id)
        .where(Assessment.assessment_type.in_(("5q", "10q")))
        .order_by(desc(Assessment.created_at))
        .limit(1)
    )
    latest_5q_or_10q = res.scalar_one_or_none()

    # Latest gap_test (only used if within 90 days).
    res = await session.execute(
        select(Assessment)
        .where(Assessment.user_id == user.user_id)
        .where(Assessment.assessment_type == "gap_test")
        .order_by(desc(Assessment.created_at))
        .limit(1)
    )
    latest_gap_test = res.scalar_one_or_none()

    # Submitted (non-draft) worksheet codes.
    res = await session.execute(
        select(WorksheetResponse.worksheet_code)
        .where(
            and_(
                WorksheetResponse.user_id == user.user_id,
                WorksheetResponse.is_draft.is_(False),
            )
        )
        .distinct()
    )
    submitted_codes: set[str] = {r for (r,) in res.all()}

    # Latest APP-B / APP-C submission timestamps.
    async def _latest_of(code: str) -> datetime | None:
        r = await session.execute(
            select(WorksheetResponse.created_at)
            .where(
                and_(
                    WorksheetResponse.user_id == user.user_id,
                    WorksheetResponse.worksheet_code == code,
                    WorksheetResponse.is_draft.is_(False),
                )
            )
            .order_by(desc(WorksheetResponse.created_at))
            .limit(1)
        )
        row = r.first()
        return row[0] if row else None

    latest_app_b_at = await _latest_of("APP-B")
    latest_app_c_at = await _latest_of("APP-C")

    progress_row = await progress_service.get_or_create_row(session, user.user_id)

    return _UserSignals(
        latest_5q_or_10q=latest_5q_or_10q,
        latest_gap_test=latest_gap_test,
        submitted_worksheet_codes=submitted_codes,
        latest_app_b_at=latest_app_b_at,
        latest_app_c_at=latest_app_c_at,
        current_focus_step=progress_row.current_focus_area,
    )


def _is_stale(ts: datetime | None, *, now: datetime) -> bool:
    if ts is None:
        return False
    # Normalise to tz-aware UTC.
    if ts.tzinfo is None:
        from datetime import UTC

        ts = ts.replace(tzinfo=UTC)
    return (now - ts) > timedelta(days=11 * 30)  # ~11 months


def _gap_responses(gap: Assessment) -> dict[str, str]:
    raw = gap.responses if isinstance(gap.responses, dict) else {}
    return {k: str(v).strip().lower() for k, v in raw.items()}


# ---------------------------------------------------------------------------
# Rule selection
# ---------------------------------------------------------------------------


def _rule_first_step(signals: _UserSignals) -> list[Action]:
    if signals.latest_5q_or_10q is None:
        return [FIRST_STEP_ACTION]
    return []


def _rule_critical_gaps(signals: _UserSignals, *, now: datetime) -> list[Action]:
    gap = signals.latest_gap_test
    if gap is None:
        return []
    gap_at = gap.created_at
    if gap_at.tzinfo is None:
        from datetime import UTC

        gap_at = gap_at.replace(tzinfo=UTC)
    if (now - gap_at) > timedelta(days=90):
        return []
    responses = _gap_responses(gap)
    out: list[Action] = []
    for key in CRITICAL_GAP_KEYS:
        if responses.get(key) == "no":
            out.append(GAP_CRITICAL_ACTIONS[key])
    return out


def _rule_missing_worksheet(signals: _UserSignals, stage: str | None) -> list[Action]:
    if stage is None:
        return []
    baseline_codes = STAGE_BASELINE_WORKSHEETS.get(stage, [])
    out: list[Action] = []
    for code in baseline_codes:
        if code in signals.submitted_worksheet_codes:
            continue
        det = BASELINE_DETAILS.get(code)
        if det is None:
            continue
        out.append(
            Action(
                priority="high",
                title=str(det["title"]),
                reason=str(det["reason"]),
                action_url=str(det["action_url"]),
                estimated_time_minutes=int(det["estimated_time_minutes"]),
                source="missing_worksheet",
            )
        )
    return out


def _rule_stale_review(signals: _UserSignals, *, now: datetime) -> list[Action]:
    out: list[Action] = []
    if _is_stale(signals.latest_app_c_at, now=now):
        out.append(STALE_REVIEW_ACTIONS["APP-C"])
    if _is_stale(signals.latest_app_b_at, now=now):
        out.append(STALE_REVIEW_ACTIONS["APP-B"])
    return out


def _rule_stage_content(stage: str | None) -> list[Action]:
    if stage is None:
        return []
    return list(STAGE_NEXT_STEP_ACTIONS.get(stage, []))


def _rule_backfill(signals: _UserSignals) -> list[Action]:
    step = signals.current_focus_step or "1"
    return [backfill_action(step)]


# ---------------------------------------------------------------------------
# Composition
# ---------------------------------------------------------------------------


def _stage_of(latest: Assessment | None) -> str | None:
    return latest.calculated_stage if latest is not None else None


def _cap_and_sort(actions: list[Action]) -> list[Action]:
    # Stable sort by priority; preserves insertion order within a priority.
    actions.sort(key=lambda a: PRIORITY_ORDER.get(a["priority"], 99))
    return actions[:MAX_ACTIONS]


def _dedupe_by_url(actions: list[Action]) -> list[Action]:
    seen: set[str] = set()
    out: list[Action] = []
    for a in actions:
        if a["action_url"] in seen:
            continue
        seen.add(a["action_url"])
        out.append(a)
    return out


def compose_actions(signals: _UserSignals, *, now: datetime | None = None) -> list[Action]:
    """Run the 6-rule cascade. Returns up to 5 actions ordered by priority."""
    now = now or utcnow()

    # Rule 1 — short-circuits if it fires.
    rule1 = _rule_first_step(signals)
    if rule1:
        return rule1

    stage = _stage_of(signals.latest_5q_or_10q)

    # Rule 2 — short-circuits if it fires (still capped by MAX_ACTIONS).
    rule2 = _rule_critical_gaps(signals, now=now)
    if rule2:
        return _cap_and_sort(_dedupe_by_url(rule2))

    # Rules 3-5 accumulate; rule 6 is the always-on backfill.
    pool: list[Action] = []
    pool.extend(_rule_missing_worksheet(signals, stage))
    pool.extend(_rule_stale_review(signals, now=now))
    pool.extend(_rule_stage_content(stage))
    pool.extend(_rule_backfill(signals))
    return _cap_and_sort(_dedupe_by_url(pool))


async def get_recommendations(session: AsyncSession, user: User) -> list[Action]:
    signals = await _gather_signals(session, user)
    return compose_actions(signals)


# ---------------------------------------------------------------------------
# Reading path + suggested content (for /users/recommendations)
# ---------------------------------------------------------------------------


def _reading_path_for(stage: str | None, focus_step: str | None) -> list[dict[str, Any]]:
    from app.services.progress import STEPS

    next_step = focus_step or "1"
    out: list[dict[str, Any]] = []
    found_next = False
    for order, (num, title) in enumerate(STEPS, start=1):
        if num == "4b":
            continue  # business-owner step omitted from generic reading path
        status_label = (
            "completed"
            if not found_next and num != next_step
            else ("next" if num == next_step else "upcoming")
        )
        if num == next_step:
            status_label = "next"
            found_next = True
        out.append(
            {
                "order": order,
                "step_number": num,
                "title": title,
                "status": status_label,
            }
        )
    return out


def _suggested_for(stage: str | None) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Returns (suggested_examples, suggested_worksheets)."""
    if stage in (None, "Foundation"):
        examples = [
            {
                "example_code": "WE-1",
                "title": "R30,000 at 24% Interest",
                "reason": "Foundation: see the brutal mathematics of consumer debt.",
            },
            {
                "example_code": "WE-7",
                "title": "Zero-Based Budget (R45k household)",
                "reason": "Foundation: model your real allocation against the 50/30/20 target.",
            },
        ]
        worksheets = [
            {
                "worksheet_code": "APP-A",
                "title": "Zero-Based Budget",
                "reason": "Foundation baseline worksheet.",
            }
        ]
    elif stage == "Momentum":
        examples = [
            {
                "example_code": "WE-12",
                "title": "Debtonator™ Cycle",
                "reason": "Momentum: model the velocity-banking lever for consumer debt.",
            }
        ]
        worksheets = [
            {
                "worksheet_code": "APP-D",
                "title": "Debt Disclosure",
                "reason": "Momentum baseline — every account on one page.",
            },
            {
                "worksheet_code": "APP-C",
                "title": "Risk Cover Review",
                "reason": "Momentum follow-up — protect the plan before scaling investing.",
            },
        ]
    elif stage == "Freedom":
        examples = [
            {
                "example_code": "WE-8",
                "title": "Hennie's Net Worth",
                "reason": "Freedom: lifestyle vs income-generating asset distinction.",
            },
            {
                "example_code": "WE-3",
                "title": "R5k/month for 25 years",
                "reason": "Freedom: anchor the long-run investment trajectory.",
            },
        ]
        worksheets = [
            {
                "worksheet_code": "APP-B",
                "title": "Net Worth Statement",
                "reason": "Freedom baseline — annual income-generating-pct check.",
            }
        ]
    else:  # Independence / Abundance
        examples = [
            {
                "example_code": "WE-10",
                "title": "Ilse's RA Tax Relief",
                "reason": "Section 11F leverage for higher earners.",
            }
        ]
        worksheets = [
            {
                "worksheet_code": "APP-F",
                "title": "attooh! Life File",
                "reason": "Estate-planning baseline.",
            }
        ]
    return examples, worksheets


async def get_recommendations_full(session: AsyncSession, user: User) -> dict[str, Any]:
    signals = await _gather_signals(session, user)
    actions = compose_actions(signals)
    stage = _stage_of(signals.latest_5q_or_10q)
    examples, worksheets = _suggested_for(stage)
    reading = _reading_path_for(stage, signals.current_focus_step)
    return {
        "current_stage": stage,
        "immediate_actions": actions,
        "reading_path": reading,
        "suggested_examples": examples,
        "suggested_worksheets": worksheets,
    }


__all__ = [
    "CRITICAL_GAP_KEYS",
    "MAX_ACTIONS",
    "compose_actions",
    "get_recommendations",
    "get_recommendations_full",
]


# ---------------------------------------------------------------------------
# Test helpers
# ---------------------------------------------------------------------------


def _make_signals(
    *,
    latest_assessment: Assessment | None = None,
    latest_gap_test: Assessment | None = None,
    submitted_codes: set[str] | None = None,
    latest_app_b_at: datetime | None = None,
    latest_app_c_at: datetime | None = None,
    current_focus_step: str | None = None,
) -> _UserSignals:
    return _UserSignals(
        latest_5q_or_10q=latest_assessment,
        latest_gap_test=latest_gap_test,
        submitted_worksheet_codes=submitted_codes or set(),
        latest_app_b_at=latest_app_b_at,
        latest_app_c_at=latest_app_c_at,
        current_focus_step=current_focus_step,
    )


def _fake_assessment(
    *,
    assessment_type: str,
    stage: str | None,
    created_at: datetime,
    responses: dict[str, str] | None = None,
) -> Assessment:
    """Build an Assessment in-memory for unit-testing the engine (no DB)."""
    return Assessment(
        assessment_id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        assessment_type=assessment_type,
        responses=responses or {},
        total_score=0,
        calculated_stage=stage,
        created_at=created_at,
        updated_at=created_at,
    )
