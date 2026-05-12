"""Phase 5 endpoints — dashboard, recommendations, progress, activity, milestones.

Hosted as a separate router (still mounted under ``/users``) so the basic
profile module stays focused on identity / PATCH while this file owns the
"derived view of the user's state" surface.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.schemas.dashboard import (
    ActivityFeedResponse,
    DashboardResponse,
    MilestonesResponse,
    ProgressResponse,
    RecommendationsResponse,
)
from app.services import activity as activity_service
from app.services import dashboard as dashboard_service
from app.services import milestones as milestones_service
from app.services import progress as progress_service
from app.services import recommendations as rec_service

router = APIRouter(prefix="/users", tags=["users"])


# ---------- Dashboard --------------------------------------------------------


@router.get(
    "/dashboard",
    response_model=DashboardResponse,
    status_code=status.HTTP_200_OK,
)
async def get_dashboard(
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_db),
) -> dict:
    return await dashboard_service.get_dashboard(session, current_user)


# ---------- Recommendations --------------------------------------------------


@router.get(
    "/recommendations",
    response_model=RecommendationsResponse,
    status_code=status.HTTP_200_OK,
)
async def get_recommendations(
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_db),
) -> dict:
    return await rec_service.get_recommendations_full(session, current_user)


# ---------- Progress ---------------------------------------------------------


@router.get(
    "/progress",
    response_model=ProgressResponse,
    status_code=status.HTTP_200_OK,
)
async def get_progress(
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_db),
) -> dict:
    return await progress_service.get_progress(session, current_user)


@router.post(
    "/progress/steps/{step_number}/complete",
    response_model=ProgressResponse,
    status_code=status.HTTP_200_OK,
)
async def complete_step(
    step_number: str,
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_db),
) -> dict:
    return await progress_service.set_step_complete(
        session, user=current_user, step_number=step_number
    )


@router.post(
    "/progress/steps/{step_number}/incomplete",
    response_model=ProgressResponse,
    status_code=status.HTTP_200_OK,
)
async def uncomplete_step(
    step_number: str,
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_db),
) -> dict:
    return await progress_service.set_step_incomplete(
        session, user=current_user, step_number=step_number
    )


# ---------- Activity ---------------------------------------------------------


@router.get(
    "/activity",
    response_model=ActivityFeedResponse,
    status_code=status.HTTP_200_OK,
)
async def get_activity(
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_db),
    limit: int = Query(default=activity_service.DEFAULT_LIMIT, ge=1, le=100),
    cursor: str | None = Query(default=None),
) -> dict:
    return await activity_service.get_activity(
        session, user=current_user, limit=limit, cursor=cursor
    )


# ---------- Milestones -------------------------------------------------------


@router.get(
    "/milestones",
    response_model=MilestonesResponse,
    status_code=status.HTTP_200_OK,
)
async def get_milestones(
    current_user: Annotated[User, Depends(get_current_user)],
    session: AsyncSession = Depends(get_db),
) -> dict:
    return await milestones_service.get_milestones(session, current_user)
