"""Chatbot service: conversation persistence + Anthropic SDK orchestration.

Behaviour summary:
- ``POST /chatbot/conversations`` creates a fresh ``ChatbotConversation``.
- ``POST /chatbot/conversations/{id}/messages`` persists the user turn,
  applies guardrails (input length, prompt-injection refusal, per-day rate
  limit), calls Claude (or the deterministic stub if no API key), persists
  the assistant turn, and returns it.
- The assistant turn's ``metadata.intent`` is set to ``"advisor_handoff"``
  whenever the reply contains a handoff signal — the FE uses this to render
  a "Yes, connect me" quick-reply.

The Anthropic SDK call is intentionally wrapped in a small synchronous
helper so tests can monkeypatch it without standing up an HTTP mock.
"""

from __future__ import annotations

import asyncio
import logging
import re
import uuid
from dataclasses import dataclass

from fastapi import status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.datetimes import utcnow
from app.core.errors import APIError
from app.db.models import (
    ChatbotConversation,
    ChatbotMessage,
    User,
)
from app.services import rate_limit
from app.services.chatbot_prompts import build_user_context, get_system_prompt

logger = logging.getLogger(__name__)

# Maximum length of user-supplied content. Matches the schema validator but
# we re-check here so the service is safe to call without going through HTTP.
MAX_USER_CONTENT_CHARS = 4000

# Crude prompt-injection patterns. We reject these pre-call so we never bill
# tokens for obvious attempts to subvert the system prompt.
_INJECTION_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"ignore (all |any |your )?previous instructions", re.IGNORECASE),
    re.compile(r"ignore (all |any |the )?(prior|above) instructions", re.IGNORECASE),
    re.compile(r"\bsystem:\s", re.IGNORECASE),
    re.compile(r"you are now\b", re.IGNORECASE),
    re.compile(r"disregard (all |any |your )?previous", re.IGNORECASE),
    re.compile(r"forget (everything|all|your) (above|prior|previous)", re.IGNORECASE),
)


# Substrings (case-insensitive) that suggest Claude declined and offered the
# handoff. We detect post-call so the FE can render a quick-reply.
_HANDOFF_SIGNALS: tuple[str, ...] = (
    "not able to give personalised advice",
    "not able to give personalized advice",
    "cannot give personalised advice",
    "cannot give personalized advice",
    "speak to an attooh",
    "talk to an attooh",
    "connect you with an attooh",
    "connect with an attooh",
    "qualified attooh! advisor",
    "qualified attooh advisor",
)


_REFUSAL_STUB = (
    "I can't act on that instruction. I'm here to help you explore the Wealth "
    "FlightPlan framework — feel free to ask about the six steps, worked "
    "examples, or your own worksheets.\n\n"
    "Illustrative. Not financial advice. Verify with a qualified attooh! advisor."
)


_NOT_CONFIGURED_STUB = (
    "The assistant is not configured in this environment yet. Once the "
    "ANTHROPIC_API_KEY is set, I'll be able to answer questions about your "
    "Wealth FlightPlan framework, worksheets, and worked examples.\n\n"
    "Illustrative. Not financial advice. Verify with a qualified attooh! advisor."
)


@dataclass(frozen=True)
class ClaudeReply:
    text: str
    tokens_in: int | None
    tokens_out: int | None
    model: str | None


# ---------------------------------------------------------------------------
# Guardrails
# ---------------------------------------------------------------------------


def _should_use_real_claude(settings: Settings) -> bool:
    return bool(settings.anthropic_api_key.strip())


def _detect_prompt_injection(text: str) -> bool:
    for pat in _INJECTION_PATTERNS:
        if pat.search(text):
            return True
    return False


def _detect_handoff(text: str) -> bool:
    lower = text.lower()
    return any(sig in lower for sig in _HANDOFF_SIGNALS)


# ---------------------------------------------------------------------------
# Claude call
# ---------------------------------------------------------------------------


def _build_history_param(messages: list[ChatbotMessage]) -> list[dict]:
    """Convert persisted messages to the Anthropic ``messages`` param shape.

    Only user + assistant turns are sent (system goes via ``system=``).
    Empty messages are filtered defensively.
    """
    out: list[dict] = []
    for m in messages:
        if m.role not in ("user", "assistant"):
            continue
        if not m.content:
            continue
        out.append({"role": m.role, "content": m.content})
    return out


def _stub_claude_reply(user_text: str) -> ClaudeReply:
    """Deterministic stub used when ``anthropic_api_key`` is empty.

    Echoes the contract while making it obvious the real model is not wired.
    """
    return ClaudeReply(
        text=_NOT_CONFIGURED_STUB,
        tokens_in=None,
        tokens_out=None,
        model="stub",
    )


def _call_claude_sync(
    *,
    settings: Settings,
    system_prompt: str,
    history: list[dict],
) -> ClaudeReply:
    """Synchronous Anthropic SDK call. Wrapped in ``asyncio.to_thread`` upstream."""
    import anthropic

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    response = client.messages.create(
        model=settings.chatbot_model,
        max_tokens=settings.chatbot_max_tokens,
        system=system_prompt,
        messages=history,
    )

    # Concatenate text blocks; ignore tool_use etc. (we don't expose tools).
    parts: list[str] = []
    for block in response.content:
        block_type = getattr(block, "type", None)
        if block_type == "text":
            parts.append(getattr(block, "text", "") or "")
    text = "".join(parts).strip()
    if not text:
        # Defensive: never store an empty assistant message.
        text = (
            "I wasn't able to produce a response just now. "
            "Please try again, or rephrase your question.\n\n"
            "Illustrative. Not financial advice. Verify with a qualified attooh! advisor."
        )

    usage = getattr(response, "usage", None)
    return ClaudeReply(
        text=text,
        tokens_in=getattr(usage, "input_tokens", None) if usage else None,
        tokens_out=getattr(usage, "output_tokens", None) if usage else None,
        model=getattr(response, "model", settings.chatbot_model),
    )


async def _call_claude(
    *, settings: Settings, system_prompt: str, history: list[dict]
) -> ClaudeReply:
    if not _should_use_real_claude(settings):
        # ``history`` is non-empty by construction (the user turn was just added).
        last_user_text = history[-1]["content"] if history else ""
        return _stub_claude_reply(last_user_text)
    try:
        return await asyncio.to_thread(
            _call_claude_sync,
            settings=settings,
            system_prompt=system_prompt,
            history=history,
        )
    except Exception as exc:  # pragma: no cover - exercised only with a real key
        logger.exception("Anthropic call failed: %s", exc)
        raise APIError(
            status_code=status.HTTP_502_BAD_GATEWAY,
            code="UPSTREAM_ERROR",
            message="The assistant is temporarily unavailable. Please retry shortly.",
        ) from exc


# ---------------------------------------------------------------------------
# Conversation CRUD
# ---------------------------------------------------------------------------


async def _load_conversation(
    session: AsyncSession, *, user_id: uuid.UUID, conversation_id: uuid.UUID
) -> ChatbotConversation:
    """Fetch a conversation, enforcing user ownership + non-deleted state."""
    res = await session.execute(
        select(ChatbotConversation).where(
            ChatbotConversation.conversation_id == conversation_id,
        )
    )
    conv = res.scalar_one_or_none()
    # Cross-user isolation: pretend we never found it. 404 — never 403 — so we
    # don't leak the existence of another user's conversation.
    if conv is None or conv.user_id != user_id or conv.status == "deleted":
        raise APIError(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Conversation not found.",
        )
    return conv


async def create_conversation(
    session: AsyncSession, *, user_id: uuid.UUID
) -> ChatbotConversation:
    conv = ChatbotConversation(
        user_id=user_id,
        created_at=utcnow(),
        last_message_at=utcnow(),
        message_count=0,
        status="active",
    )
    session.add(conv)
    await session.commit()
    await session.refresh(conv)
    return conv


async def list_conversations(
    session: AsyncSession, *, user_id: uuid.UUID
) -> list[ChatbotConversation]:
    res = await session.execute(
        select(ChatbotConversation)
        .where(
            ChatbotConversation.user_id == user_id,
            ChatbotConversation.status == "active",
        )
        .order_by(desc(ChatbotConversation.last_message_at))
    )
    return list(res.scalars().all())


async def get_conversation_with_messages(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    conversation_id: uuid.UUID,
) -> tuple[ChatbotConversation, list[ChatbotMessage]]:
    conv = await _load_conversation(
        session, user_id=user_id, conversation_id=conversation_id
    )
    res = await session.execute(
        select(ChatbotMessage)
        .where(ChatbotMessage.conversation_id == conv.conversation_id)
        .order_by(ChatbotMessage.created_at)
    )
    messages = list(res.scalars().all())
    return conv, messages


async def delete_conversation(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    conversation_id: uuid.UUID,
) -> None:
    """Hard-delete a conversation (POPIA right-to-delete).

    ``ondelete=CASCADE`` on chatbot_messages drops the message rows too.
    """
    conv = await _load_conversation(
        session, user_id=user_id, conversation_id=conversation_id
    )
    await session.delete(conv)
    await session.commit()


# ---------------------------------------------------------------------------
# Send message (the big one)
# ---------------------------------------------------------------------------


async def _persist_user_message(
    session: AsyncSession,
    *,
    conv: ChatbotConversation,
    content: str,
) -> ChatbotMessage:
    msg = ChatbotMessage(
        conversation_id=conv.conversation_id,
        role="user",
        content=content,
        created_at=utcnow(),
    )
    session.add(msg)
    conv.message_count += 1
    conv.last_message_at = msg.created_at
    await session.commit()
    await session.refresh(msg)
    return msg


async def _persist_assistant_message(
    session: AsyncSession,
    *,
    conv: ChatbotConversation,
    reply: ClaudeReply,
    extra_meta: dict | None = None,
) -> ChatbotMessage:
    meta: dict | None = None
    intent = "advisor_handoff" if _detect_handoff(reply.text) else None
    if intent or extra_meta:
        meta = {}
        if intent:
            meta["intent"] = intent
        if extra_meta:
            meta.update(extra_meta)

    msg = ChatbotMessage(
        conversation_id=conv.conversation_id,
        role="assistant",
        content=reply.text,
        tokens_in=reply.tokens_in,
        tokens_out=reply.tokens_out,
        model=reply.model,
        meta=meta,
        created_at=utcnow(),
    )
    session.add(msg)
    conv.message_count += 1
    conv.last_message_at = msg.created_at
    if conv.summary is None:
        conv.summary = _derive_summary(reply.text)
    await session.commit()
    await session.refresh(msg)
    return msg


def _derive_summary(text: str) -> str:
    """One-line preview used for the conversations list view."""
    first_line = next((ln.strip() for ln in text.splitlines() if ln.strip()), "")
    if len(first_line) > 140:
        return first_line[:137] + "..."
    return first_line


async def send_message(
    session: AsyncSession,
    *,
    user: User,
    conversation_id: uuid.UUID,
    content: str,
    settings: Settings | None = None,
) -> tuple[ChatbotConversation, ChatbotMessage]:
    """Append a user turn, call Claude (or stub), persist assistant reply.

    Returns ``(conversation, assistant_message)`` so the router can return
    the assistant's reply without an extra round-trip.
    """
    settings = settings or get_settings()

    # ---- pre-call guardrails (cheap) ----
    if not isinstance(content, str) or not content.strip():
        raise APIError(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="VALIDATION_ERROR",
            message="Message content is required.",
        )
    if len(content) > MAX_USER_CONTENT_CHARS:
        raise APIError(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="VALIDATION_ERROR",
            message=f"Message exceeds {MAX_USER_CONTENT_CHARS} characters.",
        )

    conv = await _load_conversation(
        session, user_id=user.user_id, conversation_id=conversation_id
    )

    # Daily per-user rate limit. Bucket key is per-user, period is one day —
    # this is independent of the per-IP/auth rate limit on the API.
    daily_limit = settings.chatbot_daily_limit_per_user
    if daily_limit and daily_limit > 0:
        await rate_limit.enforce(
            bucket="chatbot",
            key=str(user.user_id),
            limit=f"{daily_limit}/day",
        )

    # Persist user turn first so it's visible even if the model call fails.
    await _persist_user_message(session, conv=conv, content=content)

    # ---- prompt-injection refusal (post-persist so it shows in history) ----
    if _detect_prompt_injection(content):
        logger.warning(
            "Prompt-injection pattern detected for user %s in conversation %s",
            user.user_id,
            conv.conversation_id,
        )
        refusal = ClaudeReply(
            text=_REFUSAL_STUB,
            tokens_in=None,
            tokens_out=None,
            model="guardrail",
        )
        assistant_msg = await _persist_assistant_message(
            session,
            conv=conv,
            reply=refusal,
            extra_meta={"trigger": "prompt_injection_refusal"},
        )
        return conv, assistant_msg

    # ---- assemble history + user context, call Claude ----
    res = await session.execute(
        select(ChatbotMessage)
        .where(ChatbotMessage.conversation_id == conv.conversation_id)
        .order_by(ChatbotMessage.created_at)
    )
    history_msgs = list(res.scalars().all())

    user_context = await build_user_context(session, user=user)
    history_param = _build_history_param(history_msgs)
    # Prepend the per-message user context to the most recent user turn so
    # Claude sees it without invalidating the system prompt's cache key.
    if history_param and history_param[-1]["role"] == "user":
        history_param[-1] = {
            "role": "user",
            "content": f"{user_context}\n\n{history_param[-1]['content']}",
        }

    system_prompt = get_system_prompt()
    reply = await _call_claude(
        settings=settings, system_prompt=system_prompt, history=history_param
    )

    assistant_msg = await _persist_assistant_message(session, conv=conv, reply=reply)
    return conv, assistant_msg


__all__ = [
    "ClaudeReply",
    "MAX_USER_CONTENT_CHARS",
    "create_conversation",
    "delete_conversation",
    "get_conversation_with_messages",
    "list_conversations",
    "send_message",
]
