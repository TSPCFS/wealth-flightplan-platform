"""Chatbot endpoints (Phase 7a).

All endpoints require a valid JWT via ``get_current_user``. The router is
thin — heavy lifting lives in ``app.services.chatbot`` and
``app.services.email``.
"""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.db.database import get_db
from app.db.models import ChatbotLead, User
from app.schemas.chatbot import (
    ConversationCreate,
    ConversationDetailOut,
    ConversationListOut,
    ConversationOut,
    LeadCreate,
    LeadOut,
    MessageCreate,
    MessageOut,
    SendMessageOut,
)
from app.services import chatbot as chatbot_service
from app.services.email import send_lead_notification_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chatbot", tags=["chatbot"])


# ---------------------------------------------------------------------------
# Conversations
# ---------------------------------------------------------------------------


@router.post(
    "/conversations",
    response_model=ConversationOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_conversation(
    _payload: ConversationCreate | None = None,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConversationOut:
    conv = await chatbot_service.create_conversation(session, user_id=current_user.user_id)
    return ConversationOut(
        conversation_id=conv.conversation_id,
        created_at=conv.created_at,
        last_message_at=conv.last_message_at,
        summary=conv.summary,
        message_count=conv.message_count,
    )


@router.get(
    "/conversations",
    response_model=ConversationListOut,
    status_code=status.HTTP_200_OK,
)
async def list_conversations(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConversationListOut:
    rows = await chatbot_service.list_conversations(session, user_id=current_user.user_id)
    return ConversationListOut(
        conversations=[
            ConversationOut(
                conversation_id=row.conversation_id,
                created_at=row.created_at,
                last_message_at=row.last_message_at,
                summary=row.summary,
                message_count=row.message_count,
            )
            for row in rows
        ]
    )


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationDetailOut,
    status_code=status.HTTP_200_OK,
)
async def get_conversation(
    conversation_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConversationDetailOut:
    conv, messages = await chatbot_service.get_conversation_with_messages(
        session,
        user_id=current_user.user_id,
        conversation_id=conversation_id,
    )
    return ConversationDetailOut(
        conversation_id=conv.conversation_id,
        created_at=conv.created_at,
        last_message_at=conv.last_message_at,
        summary=conv.summary,
        message_count=conv.message_count,
        messages=[
            MessageOut(
                role=m.role,
                content=m.content,
                created_at=m.created_at,
                meta=m.meta,
            )
            for m in messages
        ],
    )


@router.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_conversation(
    conversation_id: UUID,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    await chatbot_service.delete_conversation(
        session,
        user_id=current_user.user_id,
        conversation_id=conversation_id,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=SendMessageOut,
    status_code=status.HTTP_201_CREATED,
)
async def post_message(
    conversation_id: UUID,
    payload: MessageCreate,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SendMessageOut:
    conv, assistant_msg = await chatbot_service.send_message(
        session,
        user=current_user,
        conversation_id=conversation_id,
        content=payload.content,
    )
    return SendMessageOut(
        conversation_id=conv.conversation_id,
        message=MessageOut(
            role=assistant_msg.role,
            content=assistant_msg.content,
            created_at=assistant_msg.created_at,
            meta=assistant_msg.meta,
        ),
    )


# ---------------------------------------------------------------------------
# Leads
# ---------------------------------------------------------------------------


@router.post(
    "/leads",
    response_model=LeadOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_lead(
    payload: LeadCreate,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LeadOut:
    settings = get_settings()

    # If the user passed a conversation_id, verify ownership (don't 404 here —
    # we silently drop the linkage if it's not ours, since the lead is still
    # valid as a standalone record).
    linked_conv_id: UUID | None = None
    if payload.conversation_id is not None:
        try:
            conv = await chatbot_service._load_conversation(  # noqa: SLF001
                session,
                user_id=current_user.user_id,
                conversation_id=payload.conversation_id,
            )
            linked_conv_id = conv.conversation_id
        except Exception:
            linked_conv_id = None

    lead = ChatbotLead(
        user_id=current_user.user_id,
        conversation_id=linked_conv_id,
        trigger_event=payload.trigger_event,
        topic=payload.topic,
        message=payload.message,
        advisor_email=settings.attooh_lead_email,
        status="new",
    )
    session.add(lead)
    await session.commit()
    await session.refresh(lead)

    # Best-effort email — never fail the request on a send error.
    try:
        await send_lead_notification_email(
            advisor_email=settings.attooh_lead_email,
            lead_id=str(lead.lead_id),
            user_first_name=current_user.first_name,
            user_last_name=current_user.last_name,
            user_email=current_user.email,
            trigger_event=payload.trigger_event,
            topic=payload.topic,
            message=payload.message,
            settings=settings,
        )
    except Exception:  # pragma: no cover - email service already swallows
        logger.exception("Lead notification email failed for lead %s", lead.lead_id)

    return LeadOut(
        lead_id=lead.lead_id,
        status=lead.status,
        created_at=lead.created_at,
    )
