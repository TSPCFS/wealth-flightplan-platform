"""Pydantic schemas for /admin/* endpoints (Phase 8a)."""

from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr

from app.schemas._base import MoneyAmount, ZuluDateTime

LeadStatus = Literal["new", "contacted", "qualified", "closed"]


# ---------- User listing / detail --------------------------------------------


class AdminUserListItem(BaseModel):
    """List view — kept slim so the table renders fast on large datasets."""

    model_config = ConfigDict(extra="forbid")

    user_id: UUID
    email: EmailStr
    first_name: str
    last_name: str
    is_admin: bool
    is_business_owner: bool
    email_verified: bool
    account_status: str
    suspended_at: ZuluDateTime | None = None
    locked_until: ZuluDateTime | None = None
    subscription_tier: str
    created_at: ZuluDateTime
    last_login: ZuluDateTime | None = None


class AdminUserListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    users: list[AdminUserListItem]
    total: int
    page: int
    page_size: int
    has_more: bool


class AdminUserCounts(BaseModel):
    model_config = ConfigDict(extra="forbid")

    assessments: int
    worksheet_submissions: int
    worksheet_drafts: int
    example_interactions: int
    chatbot_conversations: int
    chatbot_leads: int
    framework_steps_completed: int


class AdminUserDetail(BaseModel):
    """Full detail — used by the per-user admin drawer."""

    model_config = ConfigDict(extra="forbid")

    user_id: UUID
    email: EmailStr
    first_name: str
    last_name: str
    is_admin: bool
    is_business_owner: bool
    email_verified: bool
    email_verified_at: ZuluDateTime | None = None
    account_status: str
    suspended_at: ZuluDateTime | None = None
    locked_until: ZuluDateTime | None = None
    subscription_tier: str
    household_income_monthly_after_tax: MoneyAmount | None = None
    household_size: int | None = None
    number_of_dependants: int | None = None
    primary_language: str
    timezone: str
    current_stage: str | None = None
    latest_assessment_id: UUID | None = None
    created_at: ZuluDateTime
    updated_at: ZuluDateTime
    last_login: ZuluDateTime | None = None
    counts: AdminUserCounts


# ---------- Stats ------------------------------------------------------------


class AdminStats(BaseModel):
    model_config = ConfigDict(extra="forbid")

    total_users: int
    verified_users: int
    suspended_users: int
    admins: int
    new_signups_7d: int
    new_signups_30d: int


# ---------- Audit log --------------------------------------------------------


class AdminAuditLogItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    log_id: UUID
    user_id: UUID | None = None
    action: str
    entity_type: str | None = None
    entity_id: UUID | None = None
    status: str | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    new_values: dict[str, Any] | None = None
    old_values: dict[str, Any] | None = None
    error_message: str | None = None
    created_at: ZuluDateTime


class AdminAuditLogResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    entries: list[AdminAuditLogItem]
    total: int
    page: int
    page_size: int
    has_more: bool


# ---------- Leads ------------------------------------------------------------


class AdminLeadItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lead_id: UUID
    user_id: UUID
    user_email: EmailStr
    user_name: str
    conversation_id: UUID | None = None
    trigger_event: str
    topic: str | None = None
    message: str | None = None
    advisor_email: EmailStr
    status: LeadStatus
    created_at: ZuluDateTime
    contacted_at: ZuluDateTime | None = None


class AdminLeadResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    leads: list[AdminLeadItem]
    total: int
    page: int
    page_size: int
    has_more: bool


class AdminLeadStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: LeadStatus


# ---------- Destructive ------------------------------------------------------


class AdminDeleteUserPayload(BaseModel):
    """Body for hard-delete — must echo the user's email so accidental
    PATCHes from a typo in a curl can't wipe the wrong account."""

    model_config = ConfigDict(extra="forbid")
    confirm_email: EmailStr


# ---------- Generic ack response --------------------------------------------


class AdminAckResponse(BaseModel):
    """Minimal payload used by suspend/unsuspend/promote/demote/reset-password —
    they all return the freshly-mutated user plus a human-readable note."""

    model_config = ConfigDict(extra="forbid")
    user: AdminUserDetail
    message: str


class AdminDeleteAck(BaseModel):
    model_config = ConfigDict(extra="forbid")
    deleted_user_id: UUID
    message: str = "User account permanently deleted."


__all__ = [
    "AdminAckResponse",
    "AdminAuditLogItem",
    "AdminAuditLogResponse",
    "AdminDeleteAck",
    "AdminDeleteUserPayload",
    "AdminLeadItem",
    "AdminLeadResponse",
    "AdminLeadStatusUpdate",
    "AdminStats",
    "AdminUserCounts",
    "AdminUserDetail",
    "AdminUserListItem",
    "AdminUserListResponse",
    "LeadStatus",
]
