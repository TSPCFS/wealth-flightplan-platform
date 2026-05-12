"""FastAPI dependencies: current user, request context, rate limiter."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import Depends, Header, Request, status
from jose import ExpiredSignatureError, JWTError
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import APIError
from app.core.security import TokenType, decode_token
from app.db.database import get_db
from app.db.models import User
from app.services.auth import RequestContext

# ---------- Rate limiter (single shared instance) ----------


def _limiter_key(request: Request) -> str:
    # Per-IP keying by default; specific endpoints override via custom key_func.
    return get_remote_address(request)


limiter = Limiter(key_func=_limiter_key, headers_enabled=False)


def email_key(request: Request) -> str:
    """Rate-limit by submitted email — used by /auth/login and /auth/password-reset."""
    try:
        email_val = request.scope.get("_rate_email") or (
            request.path_params.get("email") if request.path_params else None
        )
    except Exception:
        email_val = None
    return f"email:{email_val}" if email_val else get_remote_address(request)


# ---------- Request context ----------


def get_request_context(
    request: Request,
    user_agent: Annotated[str | None, Header(alias="User-Agent")] = None,
) -> RequestContext:
    return RequestContext(
        ip_address=get_remote_address(request),
        user_agent=user_agent,
    )


# ---------- Auth: current user from Bearer ----------


def _extract_bearer(authorization: str | None) -> str:
    if not authorization:
        raise APIError(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="TOKEN_INVALID",
            message="Missing Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not authorization.lower().startswith("bearer "):
        raise APIError(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="TOKEN_INVALID",
            message="Authorization header must be 'Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return authorization.split(" ", 1)[1].strip()


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    session: AsyncSession = Depends(get_db),
) -> User:
    token = _extract_bearer(authorization)
    settings = get_settings()
    try:
        payload = decode_token(token, expected_type=TokenType.ACCESS, settings=settings)
    except ExpiredSignatureError:
        raise APIError(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="TOKEN_EXPIRED",
            message="Access token has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None
    except JWTError:
        raise APIError(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="TOKEN_INVALID",
            message="Access token is invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None

    try:
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError):
        raise APIError(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="TOKEN_INVALID",
            message="Access token is invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None

    res = await session.execute(select(User).where(User.user_id == user_id))
    user = res.scalar_one_or_none()
    if user is None or user.account_status != "active":
        raise APIError(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="TOKEN_INVALID",
            message="Access token is invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if int(payload.get("tv", -1)) != int(user.token_version):
        raise APIError(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="TOKEN_INVALID",
            message="Access token has been revoked.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
