"""Pydantic models for /chatbot endpoints (Phase 7a)."""

from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_serializer

from app.schemas._base import ZuluDateTime, ZuluResponse

LeadTriggerEvent = Literal[
    "worksheet_complete",
    "calculator_complete",
    "regulated_question",
    "user_request",
    "step_complete",
]

LeadStatus = Literal["new", "contacted", "qualified", "closed"]

MessageRole = Literal["user", "assistant", "system"]


# ---------- Conversations ----------


class ConversationCreate(BaseModel):
    """Body for POST /chatbot/conversations.

    No fields today; included for forwards-compatibility (titles, seed prompts).
    """

    model_config = ConfigDict(extra="forbid")


class ConversationOut(ZuluResponse):
    conversation_id: UUID
    created_at: ZuluDateTime
    last_message_at: ZuluDateTime
    summary: str | None = None
    message_count: int


class ConversationListOut(ZuluResponse):
    conversations: list[ConversationOut]


# ---------- Messages ----------


class MessageCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    content: str = Field(min_length=1, max_length=4000)


class MessageOut(ZuluResponse):
    """A message as returned by the API. ``metadata`` is the DB ``meta`` column."""

    model_config = ConfigDict(from_attributes=True)

    role: MessageRole
    content: str
    created_at: ZuluDateTime
    # Serialized from ``ChatbotMessage.meta`` (the DB column).
    metadata: dict | None = Field(default=None, alias="meta")

    @field_serializer("metadata")
    def _serialize_metadata(self, value: dict | None) -> dict | None:
        return value


class ConversationDetailOut(ZuluResponse):
    conversation_id: UUID
    created_at: ZuluDateTime
    last_message_at: ZuluDateTime
    summary: str | None = None
    message_count: int
    messages: list[MessageOut]


class SendMessageOut(ZuluResponse):
    """Response for POST /chatbot/conversations/{id}/messages.

    Returns the assistant's reply so the FE can render it without a follow-up GET.
    """

    conversation_id: UUID
    message: MessageOut


# ---------- Leads ----------


class LeadCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    trigger_event: LeadTriggerEvent
    topic: str | None = Field(default=None, max_length=255)
    message: str | None = Field(default=None, max_length=1000)
    conversation_id: UUID | None = None


class LeadOut(ZuluResponse):
    lead_id: UUID
    status: LeadStatus
    created_at: ZuluDateTime
