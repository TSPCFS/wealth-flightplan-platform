"""Pydantic models for /assessments endpoints."""

from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas._base import ZuluDateTime, ZuluResponse

Letter = Literal["a", "b", "c", "d"]
GapValue = Literal["yes", "partially", "no"]
StageName = Literal["Foundation", "Momentum", "Freedom", "Independence", "Abundance"]
GapBand = Literal["solid_plan", "meaningful_gaps", "wide_gaps"]


# ---------- Request models ----------


class Submit5QResponses(BaseModel):
    model_config = ConfigDict(extra="forbid")

    q1: Letter
    q2: Letter
    q3: Letter
    q4: Letter
    q5: Letter


class Submit5QRequest(BaseModel):
    responses: Submit5QResponses
    completion_time_seconds: int | None = Field(default=None, ge=0)


class Submit10QResponses(BaseModel):
    model_config = ConfigDict(extra="forbid")

    q1: Letter
    q2: Letter
    q3: Letter
    q4: Letter
    q5: Letter
    q6: Letter
    q7: Letter
    q8: Letter
    q9: Letter
    q10: Letter


class Submit10QRequest(BaseModel):
    responses: Submit10QResponses
    completion_time_seconds: int | None = Field(default=None, ge=0)


class SubmitGapResponses(BaseModel):
    model_config = ConfigDict(extra="forbid")

    q1: GapValue
    q2: GapValue
    q3: GapValue
    q4: GapValue
    q5: GapValue
    q6: GapValue
    q7: GapValue
    q8: GapValue
    q9: GapValue
    q10: GapValue
    q11: GapValue
    q12: GapValue


class SubmitGapRequest(BaseModel):
    responses: SubmitGapResponses
    completion_time_seconds: int | None = Field(default=None, ge=0)


# ---------- Response shapes ----------


class StageDetails(BaseModel):
    name: StageName
    income_runway: str
    description: str


class StageSubmitResponse(ZuluResponse):
    """Used for both 5Q and 10Q submissions."""

    assessment_id: UUID
    assessment_type: Literal["5q", "10q"]
    total_score: int
    calculated_stage: StageName
    previous_stage: StageName | None = None
    stage_details: StageDetails
    recommendations: list[str]
    created_at: ZuluDateTime


class GapIdentified(BaseModel):
    question_code: str
    title: str
    current_status: GapValue
    priority: Literal["high", "medium"]
    recommendation: str


class GapSubmitResponse(ZuluResponse):
    assessment_id: UUID
    assessment_type: Literal["gap_test"] = "gap_test"
    total_score: int
    band: GapBand
    gaps_identified: list[GapIdentified]
    advisor_recommendation: str | None = None
    gap_plan_eligible: bool
    created_at: ZuluDateTime


# ---------- History ----------


class HistoryEntry(ZuluResponse):
    assessment_id: UUID
    assessment_type: Literal["5q", "10q", "gap_test"]
    total_score: int
    calculated_stage: StageName | None = None
    band: GapBand | None = None
    created_at: ZuluDateTime


class ProgressionPoint(ZuluResponse):
    stage: StageName
    score: int
    date: ZuluDateTime


class HistoryResponse(ZuluResponse):
    assessments: list[HistoryEntry]
    current_stage: StageName | None = None
    stage_progression: list[ProgressionPoint]


# ---------- Get-one (full record) ----------


class StageDetailResponse(ZuluResponse):
    assessment_id: UUID
    assessment_type: Literal["5q", "10q"]
    responses: dict
    total_score: int
    calculated_stage: StageName
    previous_stage: StageName | None = None
    stage_details: StageDetails
    recommendations: list[str]
    completion_time_seconds: int | None = None
    created_at: ZuluDateTime


class GapDetailResponse(ZuluResponse):
    assessment_id: UUID
    assessment_type: Literal["gap_test"] = "gap_test"
    responses: dict
    total_score: int
    band: GapBand
    gaps_identified: list[GapIdentified]
    advisor_recommendation: str | None = None
    gap_plan_eligible: bool
    completion_time_seconds: int | None = None
    created_at: ZuluDateTime
