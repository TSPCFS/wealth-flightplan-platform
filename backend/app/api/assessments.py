"""Assessment endpoints: conforms to docs/API_CONTRACT.md (Phase 2)."""

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_request_context
from app.db.database import get_db
from app.db.models import User
from app.schemas.assessment import (
    GapSubmitResponse,
    HistoryResponse,
    StageSubmitResponse,
    Submit5QRequest,
    Submit10QRequest,
    SubmitGapRequest,
)
from app.services import assessment as assessment_service
from app.services.auth import RequestContext

router = APIRouter(prefix="/assessments", tags=["assessments"])


@router.post(
    "/5q",
    response_model=StageSubmitResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_5q(
    payload: Submit5QRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    ctx: RequestContext = Depends(get_request_context),
) -> dict:
    return await assessment_service.submit_5q(
        session,
        user_id=current_user.user_id,
        responses=payload.responses.model_dump(),
        completion_time_seconds=payload.completion_time_seconds,
        ctx=assessment_service.RequestContext(ip_address=ctx.ip_address, user_agent=ctx.user_agent),
    )


@router.post(
    "/10q",
    response_model=StageSubmitResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_10q(
    payload: Submit10QRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    ctx: RequestContext = Depends(get_request_context),
) -> dict:
    return await assessment_service.submit_10q(
        session,
        user_id=current_user.user_id,
        responses=payload.responses.model_dump(),
        completion_time_seconds=payload.completion_time_seconds,
        ctx=assessment_service.RequestContext(ip_address=ctx.ip_address, user_agent=ctx.user_agent),
    )


@router.post(
    "/gap-test",
    response_model=GapSubmitResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_gap(
    payload: SubmitGapRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    ctx: RequestContext = Depends(get_request_context),
) -> dict:
    return await assessment_service.submit_gap(
        session,
        user_id=current_user.user_id,
        responses=payload.responses.model_dump(),
        completion_time_seconds=payload.completion_time_seconds,
        ctx=assessment_service.RequestContext(ip_address=ctx.ip_address, user_agent=ctx.user_agent),
    )


@router.get(
    "/history",
    response_model=HistoryResponse,
    status_code=status.HTTP_200_OK,
)
async def history(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    return await assessment_service.get_history(session, current_user.user_id)


@router.get("/{assessment_id}", status_code=status.HTTP_200_OK)
async def get_one(
    assessment_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Returns either a stage-test or gap-test record. Shape is documented in
    docs/API_CONTRACT.md and validated by the integration tests; we don't pin a
    single Pydantic response_model because the shapes legitimately differ."""
    from datetime import datetime

    from app.core.datetimes import to_utc_z

    record = await assessment_service.get_one(
        session, user_id=current_user.user_id, assessment_id=assessment_id
    )
    # Serialize datetimes consistently with the rest of the API.
    if isinstance(record.get("created_at"), datetime):
        record["created_at"] = to_utc_z(record["created_at"])
    return record
