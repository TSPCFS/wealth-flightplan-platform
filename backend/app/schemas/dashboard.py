"""Pydantic models for Phase 5 dashboard / progress / activity / milestones."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict

from app.schemas._base import MoneyAmount, ZuluDateTime, ZuluResponse

Stage = Literal["Foundation", "Momentum", "Freedom", "Independence", "Abundance"]
StepNumber = Literal["1", "2", "3", "4a", "4b", "5", "6"]
Priority = Literal["high", "medium", "low"]
ActionSource = Literal[
    "first_step",
    "high_priority_gap",
    "missing_worksheet",
    "stale_review",
    "stage_gap",
    "backfill",
]
EventType = Literal[
    "assessment_submitted", "worksheet_submitted", "step_completed", "stage_changed"
]
Urgency = Literal["overdue", "soon", "upcoming"]


# ---------- Actions ----------


class RecommendedAction(BaseModel):
    model_config = ConfigDict(extra="forbid")
    priority: Priority
    title: str
    reason: str
    action_url: str
    estimated_time_minutes: int
    source: ActionSource


# ---------- Progress ----------


class StepEntry(ZuluResponse):
    step_number: StepNumber
    title: str
    is_completed: bool
    completed_at: ZuluDateTime | None = None
    time_spent_minutes: int


class ProgressResponse(BaseModel):
    overall_completion_pct: int
    steps_completed: int
    steps_total: int
    current_focus_step: StepNumber | None = None
    steps: list[StepEntry]


# ---------- Dashboard ----------


class StageDetails(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: Stage
    description: str
    income_runway: str
    progress_to_next_stage_pct: int | None = None
    next_stage: Stage | None = None


class OverallProgress(BaseModel):
    model_config = ConfigDict(extra="forbid")
    framework_completion_pct: int
    steps_completed: int
    steps_total: int
    current_focus_step: StepNumber | None = None
    next_step: dict[str, Any] | None = None


class ActivityEvent(ZuluResponse):
    event_type: EventType
    title: str
    details: dict[str, Any] | None = None
    timestamp: ZuluDateTime
    link: str | None = None


class UpcomingMilestone(BaseModel):
    model_config = ConfigDict(extra="forbid")
    code: str
    title: str
    due_date: str  # ISO date (YYYY-MM-DD)
    category: str
    urgency: Urgency


class QuickStats(BaseModel):
    model_config = ConfigDict(extra="forbid")
    net_worth: MoneyAmount | None = None
    monthly_surplus: MoneyAmount | None = None
    total_consumer_debt: MoneyAmount | None = None
    income_generating_pct: float | None = None


class DashboardResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    current_stage: Stage | None = None
    current_stage_details: StageDetails | None = None
    overall_progress: OverallProgress
    recommended_actions: list[RecommendedAction]
    recent_activity: list[ActivityEvent]
    upcoming_milestones: list[UpcomingMilestone]
    quick_stats: QuickStats


# ---------- Recommendations (full) ----------


class ReadingPathEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")
    order: int
    step_number: StepNumber
    title: str
    status: Literal["completed", "next", "upcoming"]


class SuggestedExample(BaseModel):
    model_config = ConfigDict(extra="forbid")
    example_code: str
    title: str
    reason: str


class SuggestedWorksheet(BaseModel):
    model_config = ConfigDict(extra="forbid")
    worksheet_code: str
    title: str
    reason: str


class RecommendationsResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    current_stage: Stage | None = None
    immediate_actions: list[RecommendedAction]
    reading_path: list[ReadingPathEntry]
    suggested_examples: list[SuggestedExample]
    suggested_worksheets: list[SuggestedWorksheet]


# ---------- Activity feed ----------


class ActivityFeedResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    events: list[ActivityEvent]
    next_cursor: str | None = None
    has_more: bool


# ---------- Milestones ----------


class AchievedMilestone(ZuluResponse):
    code: str
    title: str
    date: ZuluDateTime


class MilestonesResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    achieved: list[AchievedMilestone]
    upcoming: list[UpcomingMilestone]


__all__ = [
    "AchievedMilestone",
    "ActivityEvent",
    "ActivityFeedResponse",
    "DashboardResponse",
    "MilestonesResponse",
    "OverallProgress",
    "ProgressResponse",
    "QuickStats",
    "ReadingPathEntry",
    "RecommendationsResponse",
    "RecommendedAction",
    "StageDetails",
    "StepEntry",
    "SuggestedExample",
    "SuggestedWorksheet",
    "UpcomingMilestone",
]
