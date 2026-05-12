"""User endpoints (Phase 1 minimum)."""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_user
from app.db.models import User
from app.schemas.auth import UserProfile

router = APIRouter(prefix="/users", tags=["users"])


@router.get(
    "/profile",
    response_model=UserProfile,
    status_code=status.HTTP_200_OK,
)
async def get_profile(
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserProfile:
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
        created_at=current_user.created_at,
    )
