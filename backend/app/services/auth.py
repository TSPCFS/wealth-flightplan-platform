"""Auth service — pure business logic. API layer calls these functions."""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal

from fastapi import status
from jose import ExpiredSignatureError, JWTError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.errors import APIError
from app.core.security import (
    TokenType,
    decode_token,
    encode_token,
    hash_password,
    is_password_pwned,
    validate_password_strength,
    verify_password,
)
from app.db.models import User
from app.services import audit, email, token_blacklist

logger = logging.getLogger(__name__)


# ---------- Context ----------


@dataclass(slots=True)
class RequestContext:
    ip_address: str | None = None
    user_agent: str | None = None


# ---------- Helpers ----------


async def _password_validation_errors(
    password: str, *, email_addr: str, settings: Settings
) -> list[str]:
    errors = validate_password_strength(password, email=email_addr)
    if not errors and settings.hibp_enabled:
        if await is_password_pwned(password, timeout=settings.hibp_timeout_seconds):
            errors.append(
                "This password has appeared in a known data breach. Please choose another."
            )
    return errors


def _raise_validation(field: str, messages: list[str]) -> None:
    raise APIError(
        status_code=status.HTTP_400_BAD_REQUEST,
        code="VALIDATION_ERROR",
        message="One or more fields are invalid.",
        details={field: messages},
    )


async def _get_user_by_email(session: AsyncSession, email_addr: str) -> User | None:
    res = await session.execute(select(User).where(User.email == email_addr.lower()))
    return res.scalar_one_or_none()


async def _get_user_by_id(session: AsyncSession, user_id: uuid.UUID) -> User | None:
    res = await session.execute(select(User).where(User.user_id == user_id))
    return res.scalar_one_or_none()


def _issue_access(user: User, settings: Settings) -> tuple[str, str]:
    return encode_token(
        subject=str(user.user_id),
        token_type=TokenType.ACCESS,
        expires_in=settings.jwt_access_token_expire_seconds,
        extra_claims={
            "email": user.email,
            "subscription_tier": user.subscription_tier,
            "tv": user.token_version,
        },
        settings=settings,
    )


def _issue_refresh(user: User, settings: Settings) -> tuple[str, str]:
    return encode_token(
        subject=str(user.user_id),
        token_type=TokenType.REFRESH,
        expires_in=settings.jwt_refresh_token_expire_seconds,
        extra_claims={"tv": user.token_version},
        settings=settings,
    )


# ---------- Register ----------


async def register(
    session: AsyncSession,
    *,
    email_addr: str,
    password: str,
    first_name: str,
    last_name: str,
    household_income_monthly_after_tax: Decimal | None,
    household_size: int | None,
    number_of_dependants: int | None,
    ctx: RequestContext,
    settings: Settings | None = None,
) -> User:
    settings = settings or get_settings()
    email_addr = email_addr.strip().lower()

    pw_errors = await _password_validation_errors(
        password, email_addr=email_addr, settings=settings
    )
    if pw_errors:
        _raise_validation("password", pw_errors)

    existing = await _get_user_by_email(session, email_addr)
    if existing is not None:
        await audit.record(
            session,
            action="auth.register.duplicate",
            status="failure",
            ip_address=ctx.ip_address,
            user_agent=ctx.user_agent,
            new_values={"email": email_addr},
        )
        await session.commit()
        raise APIError(
            status_code=status.HTTP_409_CONFLICT,
            code="EMAIL_ALREADY_REGISTERED",
            message="An account with that email already exists.",
        )

    user = User(
        email=email_addr,
        password_hash=hash_password(password),
        first_name=first_name.strip(),
        last_name=last_name.strip(),
        household_income_monthly_after_tax=household_income_monthly_after_tax,
        household_size=household_size,
        number_of_dependants=number_of_dependants,
    )
    session.add(user)
    try:
        await session.flush()
    except IntegrityError:
        await session.rollback()
        raise APIError(
            status_code=status.HTTP_409_CONFLICT,
            code="EMAIL_ALREADY_REGISTERED",
            message="An account with that email already exists.",
        ) from None

    verify_token, _ = encode_token(
        subject=str(user.user_id),
        token_type=TokenType.VERIFY,
        expires_in=settings.jwt_verification_token_expire_seconds,
        settings=settings,
    )

    await audit.record(
        session,
        action="auth.register",
        user_id=user.user_id,
        status="success",
        ip_address=ctx.ip_address,
        user_agent=ctx.user_agent,
        new_values={"email": email_addr},
    )
    await session.commit()

    await email.send_verification_email(
        to_email=user.email,
        first_name=user.first_name,
        token=verify_token,
        settings=settings,
    )
    return user


# ---------- Login ----------


async def login(
    session: AsyncSession,
    *,
    email_addr: str,
    password: str,
    ctx: RequestContext,
    settings: Settings | None = None,
) -> tuple[User, str, str]:
    settings = settings or get_settings()
    email_addr = email_addr.strip().lower()

    user = await _get_user_by_email(session, email_addr)
    invalid_credentials = APIError(
        status_code=status.HTTP_401_UNAUTHORIZED,
        code="INVALID_CREDENTIALS",
        message="Invalid email or password.",
    )

    if user is None or not verify_password(password, user.password_hash):
        await audit.record(
            session,
            action="auth.login",
            user_id=user.user_id if user else None,
            status="failure",
            ip_address=ctx.ip_address,
            user_agent=ctx.user_agent,
            error_message="invalid_credentials",
            new_values={"email": email_addr},
        )
        await session.commit()
        raise invalid_credentials

    if user.account_status != "active":
        await audit.record(
            session,
            action="auth.login",
            user_id=user.user_id,
            status="failure",
            ip_address=ctx.ip_address,
            user_agent=ctx.user_agent,
            error_message=f"account_status={user.account_status}",
        )
        await session.commit()
        raise APIError(
            status_code=status.HTTP_403_FORBIDDEN,
            code="ACCOUNT_INACTIVE",
            message="This account is not active.",
        )

    access, _ = _issue_access(user, settings)
    refresh, _ = _issue_refresh(user, settings)

    user.last_login = datetime.now(UTC)
    await audit.record(
        session,
        action="auth.login",
        user_id=user.user_id,
        status="success",
        ip_address=ctx.ip_address,
        user_agent=ctx.user_agent,
    )
    await session.commit()
    return user, access, refresh


# ---------- Verify ----------


async def verify_email(
    session: AsyncSession,
    *,
    token: str,
    ctx: RequestContext,
    settings: Settings | None = None,
) -> User:
    settings = settings or get_settings()
    try:
        payload = decode_token(token, expected_type=TokenType.VERIFY, settings=settings)
    except ExpiredSignatureError:
        raise APIError(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="TOKEN_EXPIRED",
            message="Verification link has expired. Please request a new one.",
        ) from None
    except JWTError:
        raise APIError(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="TOKEN_INVALID",
            message="Verification link is invalid.",
        ) from None

    try:
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError):
        raise APIError(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="TOKEN_INVALID",
            message="Verification link is invalid.",
        ) from None

    user = await _get_user_by_id(session, user_id)
    if user is None:
        raise APIError(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="TOKEN_INVALID",
            message="Verification link is invalid.",
        )

    if not user.email_verified:
        user.email_verified = True
        user.email_verified_at = datetime.now(UTC)

    await audit.record(
        session,
        action="auth.verify_email",
        user_id=user.user_id,
        status="success",
        ip_address=ctx.ip_address,
        user_agent=ctx.user_agent,
    )
    await session.commit()
    return user


# ---------- Refresh ----------


async def refresh_access_token(
    session: AsyncSession,
    *,
    refresh_token: str,
    ctx: RequestContext,
    settings: Settings | None = None,
) -> tuple[str, int]:
    settings = settings or get_settings()
    try:
        payload = decode_token(refresh_token, expected_type=TokenType.REFRESH, settings=settings)
    except ExpiredSignatureError:
        raise APIError(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="TOKEN_EXPIRED",
            message="Refresh token has expired.",
        ) from None
    except JWTError:
        raise APIError(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="TOKEN_INVALID",
            message="Refresh token is invalid.",
        ) from None

    jti = payload.get("jti")
    if not jti or await token_blacklist.is_blacklisted(jti):
        raise APIError(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="TOKEN_INVALID",
            message="Refresh token has been revoked.",
        )

    try:
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError):
        raise APIError(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="TOKEN_INVALID",
            message="Refresh token is invalid.",
        ) from None

    user = await _get_user_by_id(session, user_id)
    if user is None or user.account_status != "active":
        raise APIError(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="TOKEN_INVALID",
            message="Refresh token is invalid.",
        )

    # token_version mismatch → password was reset, force re-login.
    if int(payload.get("tv", -1)) != int(user.token_version):
        raise APIError(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="TOKEN_INVALID",
            message="Refresh token has been revoked.",
        )

    access, _ = _issue_access(user, settings)
    await audit.record(
        session,
        action="auth.refresh",
        user_id=user.user_id,
        status="success",
        ip_address=ctx.ip_address,
        user_agent=ctx.user_agent,
    )
    await session.commit()
    return access, settings.jwt_access_token_expire_seconds


# ---------- Logout ----------


async def logout(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    refresh_token: str,
    ctx: RequestContext,
    settings: Settings | None = None,
) -> None:
    settings = settings or get_settings()
    # Attempt to decode for jti / exp — silently no-op on invalid token.
    try:
        payload = decode_token(refresh_token, expected_type=TokenType.REFRESH, settings=settings)
        jti = payload.get("jti")
        exp = int(payload.get("exp", 0))
        if jti and exp:
            await token_blacklist.blacklist_jti(jti, exp_unix=exp)
    except JWTError:
        pass

    await audit.record(
        session,
        action="auth.logout",
        user_id=user_id,
        status="success",
        ip_address=ctx.ip_address,
        user_agent=ctx.user_agent,
    )
    await session.commit()


# ---------- Password reset ----------


async def request_password_reset(
    session: AsyncSession,
    *,
    email_addr: str,
    ctx: RequestContext,
    settings: Settings | None = None,
) -> None:
    """Always returns successfully — never reveal whether the email exists."""
    settings = settings or get_settings()
    email_addr = email_addr.strip().lower()
    user = await _get_user_by_email(session, email_addr)
    if user is not None:
        reset_token, _ = encode_token(
            subject=str(user.user_id),
            token_type=TokenType.RESET,
            expires_in=settings.jwt_reset_token_expire_seconds,
            extra_claims={"tv": user.token_version},
            settings=settings,
        )
        await email.send_password_reset_email(
            to_email=user.email,
            first_name=user.first_name,
            token=reset_token,
            settings=settings,
        )
        await audit.record(
            session,
            action="auth.password_reset.request",
            user_id=user.user_id,
            status="success",
            ip_address=ctx.ip_address,
            user_agent=ctx.user_agent,
        )
    else:
        await audit.record(
            session,
            action="auth.password_reset.request",
            status="failure",
            error_message="no_such_user",
            ip_address=ctx.ip_address,
            user_agent=ctx.user_agent,
            new_values={"email": email_addr},
        )
    await session.commit()


async def confirm_password_reset(
    session: AsyncSession,
    *,
    token: str,
    new_password: str,
    ctx: RequestContext,
    settings: Settings | None = None,
) -> User:
    settings = settings or get_settings()
    try:
        payload = decode_token(token, expected_type=TokenType.RESET, settings=settings)
    except ExpiredSignatureError:
        raise APIError(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="TOKEN_EXPIRED",
            message="Reset link has expired. Please request a new one.",
        ) from None
    except JWTError:
        raise APIError(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="TOKEN_INVALID",
            message="Reset link is invalid.",
        ) from None

    try:
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError):
        raise APIError(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="TOKEN_INVALID",
            message="Reset link is invalid.",
        ) from None

    user = await _get_user_by_id(session, user_id)
    if user is None or int(payload.get("tv", -1)) != int(user.token_version):
        raise APIError(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="TOKEN_INVALID",
            message="Reset link is invalid.",
        )

    pw_errors = await _password_validation_errors(
        new_password, email_addr=user.email, settings=settings
    )
    if pw_errors:
        _raise_validation("new_password", pw_errors)

    user.password_hash = hash_password(new_password)
    user.token_version = int(user.token_version) + 1  # invalidate all refresh tokens

    await audit.record(
        session,
        action="auth.password_reset.confirm",
        user_id=user.user_id,
        status="success",
        ip_address=ctx.ip_address,
        user_agent=ctx.user_agent,
    )
    await session.commit()
    return user
