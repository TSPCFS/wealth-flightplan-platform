"""Worksheet endpoints — conforms to docs/API_CONTRACT.md (Phase 4)."""

from __future__ import annotations

from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.errors import APIError
from app.db.database import get_db
from app.db.models import ContentMetadata, User
from app.schemas.worksheet import (
    WorksheetCatalogueResponse,
    WorksheetDraftResponse,
    WorksheetHistoryResponse,
    WorksheetLatestResponse,
    WorksheetSaveRequest,
    WorksheetSchema,
    WorksheetSubmissionResponse,
)
from app.services import export as export_service
from app.services import worksheet as worksheet_service

router = APIRouter(prefix="/worksheets", tags=["worksheets"])


# ---------------------------------------------------------------------------
# Catalogue + schema
# ---------------------------------------------------------------------------


@router.get("", response_model=WorksheetCatalogueResponse)
async def list_worksheets(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    res = await session.execute(
        select(ContentMetadata)
        .where(ContentMetadata.content_type == "worksheet")
        .order_by(ContentMetadata.content_code)
    )
    rows = list(res.scalars())
    items = [worksheet_service.catalogue_view(r) for r in rows]
    return {"worksheets": items, "total": len(items)}


@router.get("/{worksheet_code}", response_model=WorksheetSchema)
async def get_worksheet_schema(
    worksheet_code: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    row = await worksheet_service.get_worksheet_row(session, worksheet_code)
    return worksheet_service.schema_for(row)


# ---------------------------------------------------------------------------
# Draft / submit
# ---------------------------------------------------------------------------


@router.post(
    "/{worksheet_code}/draft",
    response_model=WorksheetDraftResponse,
    status_code=status.HTTP_200_OK,
)
async def save_draft(
    worksheet_code: str,
    payload: WorksheetSaveRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    row = await worksheet_service.save_draft(
        session,
        user_id=current_user.user_id,
        worksheet_code=worksheet_code,
        response_data=payload.response_data,
        completion_percentage=payload.completion_percentage,
    )
    return {
        "worksheet_id": row.worksheet_id,
        "worksheet_code": row.worksheet_code,
        "is_draft": row.is_draft,
        "completion_percentage": row.completion_percentage,
        "updated_at": row.updated_at,
    }


@router.post(
    "/{worksheet_code}/submit",
    response_model=WorksheetSubmissionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_worksheet(
    worksheet_code: str,
    payload: WorksheetSaveRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    row = await worksheet_service.submit(
        session,
        user_id=current_user.user_id,
        worksheet_code=worksheet_code,
        response_data=payload.response_data,
    )
    return {
        "worksheet_id": row.worksheet_id,
        "worksheet_code": row.worksheet_code,
        "is_draft": row.is_draft,
        "completion_percentage": row.completion_percentage,
        "calculated_values": row.calculated_values,
        "feedback": row.feedback,
        "created_at": row.created_at,
    }


# ---------------------------------------------------------------------------
# Latest / history
# ---------------------------------------------------------------------------


@router.get("/{worksheet_code}/latest")
async def get_latest(
    worksheet_code: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Confirm worksheet exists (404 vs 204 disambiguation).
    await worksheet_service.get_worksheet_row(session, worksheet_code)
    row = await worksheet_service.get_latest(
        session, user_id=current_user.user_id, worksheet_code=worksheet_code
    )
    if row is None:
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    return WorksheetLatestResponse(
        worksheet_id=row.worksheet_id,
        worksheet_code=row.worksheet_code,
        is_draft=row.is_draft,
        response_data=row.response_data,
        calculated_values=row.calculated_values,
        feedback=row.feedback,
        completion_percentage=row.completion_percentage,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.get("/{worksheet_code}/history", response_model=WorksheetHistoryResponse)
async def get_history(
    worksheet_code: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    row = await worksheet_service.get_worksheet_row(session, worksheet_code)
    schema = worksheet_service.schema_for(row)
    summary_keys = schema.get("summary_keys", [])
    submissions = await worksheet_service.get_history(
        session, user_id=current_user.user_id, worksheet_code=worksheet_code
    )
    return {
        "worksheet_code": worksheet_code,
        "submissions": [worksheet_service.history_entry_view(s, summary_keys) for s in submissions],
    }


# ---------------------------------------------------------------------------
# Submissions (id-based) — namespaced under /submissions/ to disambiguate
# from /{worksheet_code}/... routes (code matches ^APP-[A-G]$, id is UUID v4).
# ---------------------------------------------------------------------------


@router.get("/submissions/{worksheet_id}")
async def get_submission(
    worksheet_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorksheetLatestResponse:
    """Owner-only fetch-by-id. Enables deep-linking to results pages and
    refresh-after-submit flows. 404 for both unknown and cross-user ids."""
    row = await worksheet_service.get_by_id(
        session, user_id=current_user.user_id, worksheet_id=worksheet_id
    )
    return WorksheetLatestResponse(
        worksheet_id=row.worksheet_id,
        worksheet_code=row.worksheet_code,
        is_draft=row.is_draft,
        response_data=row.response_data,
        calculated_values=row.calculated_values,
        feedback=row.feedback,
        completion_percentage=row.completion_percentage,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _slugify(name: str) -> str:
    return "".join(c if c.isalnum() else "_" for c in name).strip("_") or "worksheet"


@router.get("/submissions/{worksheet_id}/export/{fmt}")
async def export_worksheet(
    worksheet_id: UUID,
    fmt: Literal["pdf", "csv"],
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    row = await worksheet_service.get_by_id(
        session, user_id=current_user.user_id, worksheet_id=worksheet_id
    )
    if row.is_draft:
        raise APIError(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="DRAFT_NOT_EXPORTABLE",
            message="Cannot export a draft. Submit the worksheet first.",
        )
    metadata_row = await worksheet_service.get_worksheet_row(session, row.worksheet_code)
    schema = worksheet_service.schema_for(metadata_row)

    if fmt == "pdf":
        body = export_service.render_pdf(worksheet_row=row, schema=schema, user=current_user)
        media = "application/pdf"
        filename = f"{_slugify(row.worksheet_code)}_{row.worksheet_id.hex[:8]}.pdf"
    else:
        body = export_service.render_csv(worksheet_row=row, schema=schema)
        media = "text/csv"
        filename = f"{_slugify(row.worksheet_code)}_{row.worksheet_id.hex[:8]}.csv"

    return StreamingResponse(
        iter([body]),
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
