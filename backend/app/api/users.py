"""User endpoints (Phase 1 minimum, with Phase 2 stage fields)."""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.db.models import Assessment, User
from app.schemas.auth import UserProfile

router = APIRouter(prefix="/users", tags=["users"])


@router.get(
    "/profile",
    response_model=UserProfile,
    status_code=status.HTTP_200_OK,
)
async def get_profile(
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_db),
) -> UserProfile:
    # One round-trip: select the most recent assessment of any type, plus the
    # most recent stage-bearing (5q/10q) one in the same query result set, then
    # pick what we need in Python.
    res = await session.execute(
        select(
            Assessment.assessment_id,
            Assessment.assessment_type,
            Assessment.calculated_stage,
            Assessment.created_at,
        )
        .where(Assessment.user_id == current_user.user_id)
        .order_by(desc(Assessment.created_at))
    )
    rows = res.all()
    latest_assessment_id = rows[0].assessment_id if rows else None
    current_stage = next(
        (r.calculated_stage for r in rows if r.assessment_type in ("5q", "10q")),
        None,
    )

    return UserProfile(
        user_id=current_user.user_id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        email_verified=current_user.email_verified,
        household_income_monthly_after_tax=current_user.household_income_monthly_after_tax,
        household_size=current_user.household_size,
        number_of_dependants=current_user.number_of_dependants,
        subscription_tier=current_user.subscription_tier,
        current_stage=current_stage,
        latest_assessment_id=latest_assessment_id,
        created_at=current_user.created_at,
    )
