"""Pydantic models for /content/* endpoints."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict

CalculatorType = Literal[
    "compound_interest",
    "debt_analysis",
    "budget_allocator",
    "net_worth_analyzer",
]
Stage = Literal["Foundation", "Momentum", "Freedom", "Independence", "Abundance"]
StepNumber = Literal["1", "2", "3", "4a", "4b", "5", "6"]


# ---------- Framework / steps ----------


class FrameworkStep(BaseModel):
    model_config = ConfigDict(extra="forbid")

    step_number: StepNumber
    title: str
    subtitle: str
    description: str
    key_metrics: list[str]
    time_estimate_minutes: int
    stage_relevance: list[Stage]
    related_example_codes: list[str]
    related_worksheet_codes: list[str]


class FrameworkResponse(BaseModel):
    steps: list[FrameworkStep]


class StepDetail(FrameworkStep):
    body_markdown: str | None = None


# ---------- Examples — list view ----------


class ExampleListItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    example_code: str
    title: str
    step_number: StepNumber
    chapter: str
    calculator_type: CalculatorType | None = None
    stage_relevance: list[Stage]
    key_principle: str
    summary: str


class ExamplesResponse(BaseModel):
    examples: list[ExampleListItem]
    total: int


# ---------- Examples — detail view ----------


class CalculatorInputSpec(BaseModel):
    model_config = ConfigDict(extra="allow")
    name: str
    label: str
    type: str
    default: Any = None
    format: str | None = None


class CalculatorConfig(BaseModel):
    model_config = ConfigDict(extra="allow")
    inputs: list[dict]
    interpretation_template: str


class ExampleDetail(BaseModel):
    model_config = ConfigDict(extra="forbid")

    example_code: str
    title: str
    step_number: StepNumber
    chapter: str
    description: str
    key_principle: str
    key_takeaway: str
    educational_text: str
    stage_relevance: list[Stage]
    calculator_type: CalculatorType | None = None
    calculator_config: CalculatorConfig | None = None
    related_example_codes: list[str]


# ---------- Calculate endpoint ----------


class CalculateResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    example_code: str
    calculator_type: CalculatorType
    inputs: dict
    outputs: dict
    interpretation: str


# ---------- Case studies ----------


class CaseStudyListItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    study_code: str
    name: str
    summary: str
    learning: str
    stage_relevance: list[Stage]
    related_step_numbers: list[StepNumber]


class CaseStudiesResponse(BaseModel):
    case_studies: list[CaseStudyListItem]
    total: int


class CaseStudyDetail(BaseModel):
    model_config = ConfigDict(extra="forbid")

    study_code: str
    name: str
    age_band: str | None = None
    income_monthly: float | None = None
    situation: str
    learning: str
    key_insight: str
    stage_relevance: list[Stage]
    related_step_numbers: list[StepNumber]
    related_example_codes: list[str]
