"""Framework progress service: operates on the user_progress table.

The user_progress row is created lazily on first GET so users don't carry
an extra row from registration. Step 4b is conditional: it only counts
toward total + percentage when the user is a business owner.

Step number column mapping::

    "1"   → step_1_completed   / step_1_completion_date
    "2"   → step_2_completed   / step_2_completion_date
    "3"   → step_3_completed   / step_3_completion_date
    "4a"  → step_4a_completed  / step_4a_completion_date
    "4b"  → step_4b_completed  / step_4b_completion_date
    "5"   → step_5_completed   / step_5_completion_date
    "6"   → step_6_completed   / step_6_completion_date
"""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.datetimes import utcnow
from app.core.errors import APIError
from app.db.models import User, UserProgress

# Canonical step ordering used everywhere (titles aligned with Phase 3 seed).
STEPS: list[tuple[str, str]] = [
    ("1", "Financial GPS"),
    ("2", "Zero-Based Budget"),
    ("3", "Money Matrix"),
    ("4a", "Risk Cover: Households"),
    ("4b", "Risk Cover: Business Owners"),
    ("5", "Debt Optimisation"),
    ("6", "Investment"),
]

STEP_NUMBERS: tuple[str, ...] = tuple(s[0] for s in STEPS)
STEP_TITLES: dict[str, str] = dict(STEPS)


def _col_name(step_number: str) -> str:
    """Map a step_number string ('4a') to the SQL column suffix ('4a')."""
    if step_number not in STEP_NUMBERS:
        raise APIError(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="VALIDATION_ERROR",
            message="Unknown step number.",
            details={"step_number": [f"Must be one of: {', '.join(STEP_NUMBERS)}."]},
        )
    return step_number


def _completion_attr(step_number: str) -> str:
    return f"step_{_col_name(step_number)}_completed"


def _date_attr(step_number: str) -> str:
    return f"step_{_col_name(step_number)}_completion_date"


def _visible_steps(*, is_business_owner: bool) -> list[tuple[str, str]]:
    return [(num, title) for num, title in STEPS if num != "4b" or is_business_owner]


def _completed_count(progress: UserProgress, *, is_business_owner: bool) -> int:
    count = 0
    for num, _ in _visible_steps(is_business_owner=is_business_owner):
        if getattr(progress, _completion_attr(num)):
            count += 1
    return count


def _round_half_up(value: float) -> int:
    """Match the contract's example (5/7 → 71, 2/7 → 29)."""
    from math import floor

    return int(floor(value + 0.5))


def _recompute_percentage(progress: UserProgress, *, is_business_owner: bool) -> int:
    visible = _visible_steps(is_business_owner=is_business_owner)
    if not visible:
        return 0
    completed = _completed_count(progress, is_business_owner=is_business_owner)
    return _round_half_up(100 * completed / len(visible))


def _last_accessed_str(progress: UserProgress) -> str | None:
    """Convert the int column to a step_number string (e.g. 4 → '4a' is ambiguous,
    so we round-trip via the focus_area string column instead)."""
    return progress.current_focus_area


# ---------------------------------------------------------------------------
# View shaping
# ---------------------------------------------------------------------------


def _step_view(progress: UserProgress, step_number: str, title: str) -> dict[str, Any]:
    return {
        "step_number": step_number,
        "title": title,
        "is_completed": bool(getattr(progress, _completion_attr(step_number))),
        "completed_at": getattr(progress, _date_attr(step_number)),
        "time_spent_minutes": 0,  # instrumented in Phase 6
    }


def progress_view(progress: UserProgress, *, is_business_owner: bool) -> dict[str, Any]:
    visible = _visible_steps(is_business_owner=is_business_owner)
    steps = [_step_view(progress, num, title) for num, title in visible]
    return {
        "overall_completion_pct": _recompute_percentage(
            progress, is_business_owner=is_business_owner
        ),
        "steps_completed": _completed_count(progress, is_business_owner=is_business_owner),
        "steps_total": len(visible),
        "current_focus_step": _last_accessed_str(progress),
        "steps": steps,
    }


# ---------------------------------------------------------------------------
# DB operations
# ---------------------------------------------------------------------------


async def get_or_create_row(session: AsyncSession, user_id: uuid.UUID) -> UserProgress:
    res = await session.execute(select(UserProgress).where(UserProgress.user_id == user_id))
    row = res.scalar_one_or_none()
    if row is not None:
        return row
    row = UserProgress(user_id=user_id)
    session.add(row)
    await session.commit()
    await session.refresh(row)
    return row


async def get_progress(session: AsyncSession, user: User) -> dict[str, Any]:
    row = await get_or_create_row(session, user.user_id)
    return progress_view(row, is_business_owner=user.is_business_owner)


async def _set_completed(
    session: AsyncSession,
    *,
    user: User,
    step_number: str,
    completed: bool,
) -> dict[str, Any]:
    row = await get_or_create_row(session, user.user_id)
    setattr(row, _completion_attr(step_number), completed)
    if completed and getattr(row, _date_attr(step_number)) is None:
        setattr(row, _date_attr(step_number), utcnow())
    elif not completed:
        setattr(row, _date_attr(step_number), None)

    # Move focus to the next incomplete step on completion.
    if completed:
        row.current_focus_area = _next_focus_step(row, is_business_owner=user.is_business_owner)

    row.overall_completion_percentage = _recompute_percentage(
        row, is_business_owner=user.is_business_owner
    )
    await session.commit()
    await session.refresh(row)
    return progress_view(row, is_business_owner=user.is_business_owner)


async def set_step_complete(
    session: AsyncSession, *, user: User, step_number: str
) -> dict[str, Any]:
    return await _set_completed(session, user=user, step_number=step_number, completed=True)


async def set_step_incomplete(
    session: AsyncSession, *, user: User, step_number: str
) -> dict[str, Any]:
    return await _set_completed(session, user=user, step_number=step_number, completed=False)


async def set_current_focus_step(session: AsyncSession, *, user: User, step_number: str) -> None:
    """Update the user's current focus step. Used internally when the user
    navigates to a step in the framework; not exposed as a top-level endpoint."""
    _col_name(step_number)  # validates
    row = await get_or_create_row(session, user.user_id)
    row.current_focus_area = step_number
    await session.commit()


def _next_focus_step(progress: UserProgress, *, is_business_owner: bool) -> str | None:
    for num, _ in _visible_steps(is_business_owner=is_business_owner):
        if not getattr(progress, _completion_attr(num)):
            return num
    return None


__all__ = [
    "STEPS",
    "STEP_NUMBERS",
    "STEP_TITLES",
    "get_or_create_row",
    "get_progress",
    "progress_view",
    "set_current_focus_step",
    "set_step_complete",
    "set_step_incomplete",
]
