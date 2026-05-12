"""User profile endpoints (GET + PATCH).

Phase 5 additions:
- ``is_business_owner`` exposed in profile responses
- ``PATCH /users/profile`` for partial updates
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.db.models import Assessment, User
from app.schemas.auth import ProfileUpdateRequest, UserProfile

router = APIRouter(prefix="/users", tags=["users"])


async def _profile_view(session: AsyncSession, user: User) -> UserProfile:
    """Shared serializer — one extra round-trip to pick up latest assessment fields."""
    res = await session.execute(
        select(
            Assessment.assessment_id,
            Assessment.assessment_type,
            Assessment.calculated_stage,
            Assessment.created_at,
        )
        .where(Assessment.user_id == user.user_id)
        .order_by(desc(Assessment.created_at))
    )
    rows = res.all()
    latest_assessment_id = rows[0].assessment_id if rows else None
    current_stage = next(
        (r.calculated_stage for r in rows if r.assessment_type in ("5q", "10q")),
        None,
    )
    return UserProfile(
        user_id=user.user_id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        email_verified=user.email_verified,
        household_income_monthly_after_tax=user.household_income_monthly_after_tax,
        household_size=user.household_size,
        number_of_dependants=user.number_of_dependants,
        is_business_owner=user.is_business_owner,
        primary_language=user.primary_language,
        timezone=user.timezone,
        subscription_tier=user.subscription_tier,
        current_stage=current_stage,
        latest_assessment_id=latest_assessment_id,
        created_at=user.created_at,
    )


@router.get(
    "/profile",
    response_model=UserProfile,
    status_code=status.HTTP_200_OK,
)
async def get_profile(
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_db),
) -> UserProfile:
    return await _profile_view(session, current_user)


@router.patch(
    "/profile",
    response_model=UserProfile,
    status_code=status.HTTP_200_OK,
)
async def update_profile(
    payload: ProfileUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_db),
) -> UserProfile:
    update = payload.model_dump(exclude_unset=True)
    for attr, value in update.items():
        setattr(current_user, attr, value)
    await session.commit()
    await session.refresh(current_user)
    return await _profile_view(session, current_user)
