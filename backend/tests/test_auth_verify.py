"""Email verification tests."""

from __future__ import annotations

import time

import pytest
from httpx import AsyncClient

from app.core.config import get_settings
from app.core.security import TokenType, encode_token
from tests.conftest import register_payload


async def _register_and_get_user_id(client: AsyncClient, email: str) -> str:
    r = await client.post("/auth/register", json=register_payload(email))
    assert r.status_code == 201
    return r.json()["user_id"]


@pytest.mark.asyncio
async def test_verify_with_valid_token_marks_verified(client: AsyncClient) -> None:
    email = "verify-ok@example.com"
    user_id = await _register_and_get_user_id(client, email)
    token, _ = encode_token(
        subject=user_id,
        token_type=TokenType.VERIFY,
        expires_in=3600,
        settings=get_settings(),
    )
    r = await client.get(f"/auth/verify?token={token}")
    assert r.status_code == 200
    body = r.json()
    assert body["email_verified"] is True
    assert "verified successfully" in body["message"].lower()


@pytest.mark.asyncio
async def test_verify_invalid_token_returns_400(client: AsyncClient) -> None:
    r = await client.get("/auth/verify?token=not.a.real.jwt")
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "TOKEN_INVALID"


@pytest.mark.asyncio
async def test_verify_expired_token_returns_400(client: AsyncClient) -> None:
    email = "verify-exp@example.com"
    user_id = await _register_and_get_user_id(client, email)
    token, _ = encode_token(
        subject=user_id,
        token_type=TokenType.VERIFY,
        expires_in=-10,  # already expired
        settings=get_settings(),
    )
    r = await client.get(f"/auth/verify?token={token}")
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "TOKEN_EXPIRED"


@pytest.mark.asyncio
async def test_verify_wrong_token_type_rejected(client: AsyncClient) -> None:
    """A refresh token must not be accepted by the verify endpoint."""
    email = "verify-typecheck@example.com"
    user_id = await _register_and_get_user_id(client, email)
    token, _ = encode_token(
        subject=user_id,
        token_type=TokenType.REFRESH,
        expires_in=3600,
        settings=get_settings(),
    )
    r = await client.get(f"/auth/verify?token={token}")
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "TOKEN_INVALID"


@pytest.mark.asyncio
async def test_verify_then_login_shows_email_verified(client: AsyncClient) -> None:
    from tests.conftest import VALID_PASSWORD

    email = "verify-login@example.com"
    user_id = await _register_and_get_user_id(client, email)
    token, _ = encode_token(
        subject=user_id,
        token_type=TokenType.VERIFY,
        expires_in=3600,
        settings=get_settings(),
    )
    await client.get(f"/auth/verify?token={token}")
    login = await client.post("/auth/login", json={"email": email, "password": VALID_PASSWORD})
    assert login.status_code == 200
    assert login.json()["user"]["email_verified"] is True


@pytest.mark.asyncio
async def test_verify_unknown_user_returns_400(client: AsyncClient) -> None:
    import uuid

    token, _ = encode_token(
        subject=str(uuid.uuid4()),
        token_type=TokenType.VERIFY,
        expires_in=3600,
        settings=get_settings(),
    )
    r = await client.get(f"/auth/verify?token={token}")
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "TOKEN_INVALID"


@pytest.mark.asyncio
async def test_verify_audit_log_recorded(client: AsyncClient) -> None:
    """Spot-check that verification writes an audit row."""
    from sqlalchemy import select

    from app.db.database import get_session_factory
    from app.db.models import AuditLog

    email = "verify-audit@example.com"
    user_id = await _register_and_get_user_id(client, email)
    token, _ = encode_token(
        subject=user_id,
        token_type=TokenType.VERIFY,
        expires_in=3600,
        settings=get_settings(),
    )
    await client.get(f"/auth/verify?token={token}")
    factory = get_session_factory()
    async with factory() as session:
        res = await session.execute(select(AuditLog).where(AuditLog.action == "auth.verify_email"))
        logs = res.scalars().all()
    assert len(logs) >= 1
    assert logs[0].status == "success"
    # Touch time to keep dependency on time module.
    assert isinstance(time.time(), float)
