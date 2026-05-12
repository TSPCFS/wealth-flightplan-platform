"""Password reset flow tests."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.core.config import get_settings
from app.core.security import TokenType, encode_token
from tests.conftest import VALID_PASSWORD, register_payload


async def _register(client: AsyncClient, email: str) -> str:
    r = await client.post("/auth/register", json=register_payload(email))
    return r.json()["user_id"]


@pytest.mark.asyncio
async def test_password_reset_request_existing_email_returns_200(
    client: AsyncClient,
) -> None:
    email = "reset-real@example.com"
    await _register(client, email)
    r = await client.post("/auth/password-reset", json={"email": email})
    assert r.status_code == 200
    assert "If that email exists" in r.json()["message"]


@pytest.mark.asyncio
async def test_password_reset_request_unknown_email_returns_200(
    client: AsyncClient,
) -> None:
    """Must NOT reveal existence (enumeration defense)."""
    r = await client.post("/auth/password-reset", json={"email": "noone@example.com"})
    assert r.status_code == 200
    assert "If that email exists" in r.json()["message"]


@pytest.mark.asyncio
async def test_password_reset_confirm_full_flow(client: AsyncClient) -> None:
    email = "reset-flow@example.com"
    user_id = await _register(client, email)

    # Login with old password works.
    r1 = await client.post("/auth/login", json={"email": email, "password": VALID_PASSWORD})
    assert r1.status_code == 200
    old_refresh = r1.json()["refresh_token"]

    # Issue a real reset token (we don't crack the SendGrid email).
    reset_token, _ = encode_token(
        subject=user_id,
        token_type=TokenType.RESET,
        expires_in=3600,
        extra_claims={"tv": 0},
        settings=get_settings(),
    )

    new_password = "BrandNewPlanShine!9"
    r2 = await client.post(
        "/auth/password-reset/confirm",
        json={"token": reset_token, "new_password": new_password},
    )
    assert r2.status_code == 200
    assert r2.json()["message"] == "Password reset successfully"

    # Old password no longer works.
    r3 = await client.post("/auth/login", json={"email": email, "password": VALID_PASSWORD})
    assert r3.status_code == 401

    # New password does.
    r4 = await client.post("/auth/login", json={"email": email, "password": new_password})
    assert r4.status_code == 200

    # Old refresh token is invalidated (token_version bumped).
    r5 = await client.post("/auth/refresh", json={"refresh_token": old_refresh})
    assert r5.status_code == 401
    assert r5.json()["error"]["code"] == "TOKEN_INVALID"


@pytest.mark.asyncio
async def test_password_reset_confirm_invalid_token(client: AsyncClient) -> None:
    r = await client.post(
        "/auth/password-reset/confirm",
        json={"token": "garbage.token", "new_password": "BrandNewPlanShine!9"},
    )
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "TOKEN_INVALID"


@pytest.mark.asyncio
async def test_password_reset_confirm_expired_token(client: AsyncClient) -> None:
    email = "reset-expired@example.com"
    user_id = await _register(client, email)
    token, _ = encode_token(
        subject=user_id,
        token_type=TokenType.RESET,
        expires_in=-10,
        extra_claims={"tv": 0},
        settings=get_settings(),
    )
    r = await client.post(
        "/auth/password-reset/confirm",
        json={"token": token, "new_password": "BrandNewPlanShine!9"},
    )
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "TOKEN_EXPIRED"


@pytest.mark.asyncio
async def test_password_reset_confirm_weak_password_rejected(
    client: AsyncClient,
) -> None:
    email = "reset-weak@example.com"
    user_id = await _register(client, email)
    token, _ = encode_token(
        subject=user_id,
        token_type=TokenType.RESET,
        expires_in=3600,
        extra_claims={"tv": 0},
        settings=get_settings(),
    )
    r = await client.post(
        "/auth/password-reset/confirm",
        json={"token": token, "new_password": "tooweak"},
    )
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"
