"""Pydantic models for /worksheets/* endpoints."""

from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas._base import ZuluDateTime, ZuluResponse

WorksheetCode = Literal["APP-A", "APP-B", "APP-C", "APP-D", "APP-E", "APP-F", "APP-G"]
StepNumber = Literal["1", "2", "3", "4a", "4b", "5", "6"]
FeedbackStatus = Literal["on_track", "needs_attention", "critical"]


# ---------- Catalogue ----------


class WorksheetCatalogueItem(BaseModel):
    model_config = ConfigDict(extra="forbid")
    worksheet_code: WorksheetCode
    title: str
    description: str
    related_step_number: StepNumber | None = None
    related_example_codes: list[str]
    estimated_time_minutes: int
    has_calculator: bool


class WorksheetCatalogueResponse(BaseModel):
    worksheets: list[WorksheetCatalogueItem]
    total: int


# ---------- Schema (form definition) ----------


class WorksheetSchema(BaseModel):
    """Loose response model — sections/fields carry arbitrary metadata
    for the FE renderer, mirrored from the seed."""

    model_config = ConfigDict(extra="forbid")

    worksheet_code: WorksheetCode
    title: str
    description: str
    summary: str
    estimated_time_minutes: int
    related_step_number: StepNumber | None = None
    related_example_codes: list[str]
    summary_keys: list[str]
    has_calculator: bool
    sections: list[dict[str, Any]]


# ---------- Draft / submit ----------


class WorksheetSaveRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    response_data: dict[str, Any]
    completion_percentage: int | None = Field(default=None, ge=0, le=100)


class WorksheetDraftResponse(ZuluResponse):
    worksheet_id: UUID
    worksheet_code: WorksheetCode
    is_draft: bool = True
    completion_percentage: int
    updated_at: ZuluDateTime


class WorksheetFeedback(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: FeedbackStatus
    message: str
    recommendations: list[str]


class WorksheetSubmissionResponse(ZuluResponse):
    worksheet_id: UUID
    worksheet_code: WorksheetCode
    is_draft: bool = False
    completion_percentage: int
    calculated_values: dict[str, Any] | None = None
    feedback: WorksheetFeedback | None = None
    created_at: ZuluDateTime


class WorksheetLatestResponse(ZuluResponse):
    worksheet_id: UUID
    worksheet_code: WorksheetCode
    is_draft: bool
    response_data: dict[str, Any]
    calculated_values: dict[str, Any] | None = None
    feedback: WorksheetFeedback | None = None
    completion_percentage: int
    created_at: ZuluDateTime
    updated_at: ZuluDateTime


class WorksheetHistoryEntry(ZuluResponse):
    worksheet_id: UUID
    completion_percentage: int
    calculated_values_summary: dict[str, Any]
    created_at: ZuluDateTime


class WorksheetHistoryResponse(BaseModel):
    worksheet_code: WorksheetCode
    submissions: list[WorksheetHistoryEntry]
