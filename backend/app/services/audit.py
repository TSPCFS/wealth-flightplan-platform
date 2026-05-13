"""Append-only audit logging for security-relevant actions."""

from __future__ import annotations

import logging
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AuditLog

logger = logging.getLogger(__name__)


async def record(
    session: AsyncSession,
    *,
    action: str,
    user_id: uuid.UUID | None = None,
    status: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    entity_type: str | None = None,
    entity_id: uuid.UUID | None = None,
    old_values: dict[str, Any] | None = None,
    new_values: dict[str, Any] | None = None,
    error_message: str | None = None,
) -> None:
    """Insert an audit log row. Never raises; auditing must not break the request."""
    try:
        log = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
            user_agent=user_agent,
            status=status,
            error_message=error_message,
        )
        session.add(log)
        await session.flush()
    except Exception as e:  # pragma: no cover; defensive
        logger.exception("Audit log write failed for action=%s: %s", action, e)
