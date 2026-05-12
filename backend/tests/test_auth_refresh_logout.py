"""Refresh + logout tests."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.conftest import VALID_PASSWORD, register_payload


async def _setup_session(client: AsyncClient, email: str) -> tuple[str, str]:
    await client.post("/auth/register", json=register_payload(email))
    r = await client.post("/auth/login", json={"email": email, "password": VALID_PASSWORD})
    body = r.json()
    return body["access_token"], body["refresh_token"]


@pytest.mark.asyncio
async def test_refresh_returns_new_access_token(client: AsyncClient) -> None:
    _access, refresh = await _setup_session(client, "refresh-ok@example.com")
    r = await client.post("/auth/refresh", json={"refresh_token": refresh})
    assert r.status_code == 200
    body = r.json()
    assert body["access_token"]
    assert body["expires_in"] > 0


@pytest.mark.asyncio
async def test_refresh_with_garbage_token_returns_401(client: AsyncClient) -> None:
    r = await client.post("/auth/refresh", json={"refresh_token": "garbage.token.value"})
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "TOKEN_INVALID"


@pytest.mark.asyncio
async def test_refresh_with_access_token_rejected(client: AsyncClient) -> None:
    access, _ = await _setup_session(client, "refresh-type@example.com")
    # Access tokens shouldn't refresh — wrong token type.
    r = await client.post("/auth/refresh", json={"refresh_token": access})
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "TOKEN_INVALID"


@pytest.mark.asyncio
async def test_logout_blacklists_refresh_token(client: AsyncClient) -> None:
    access, refresh = await _setup_session(client, "logout@example.com")
    r = await client.post(
        "/auth/logout",
        json={"refresh_token": refresh},
        headers={"Authorization": f"Bearer {access}"},
    )
    assert r.status_code == 200
    assert r.json()["message"] == "Logged out successfully"

    # Subsequent refresh with the blacklisted token must fail.
    again = await client.post("/auth/refresh", json={"refresh_token": refresh})
    assert again.status_code == 401
    assert again.json()["error"]["code"] == "TOKEN_INVALID"


@pytest.mark.asyncio
async def test_logout_requires_auth(client: AsyncClient) -> None:
    r = await client.post("/auth/logout", json={"refresh_token": "anything"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_refresh_expired_returns_401(client: AsyncClient) -> None:
    """Synthesize an expired refresh token and ensure 401 TOKEN_EXPIRED."""
    from app.core.config import get_settings
    from app.core.security import TokenType, encode_token

    expired, _ = encode_token(
        subject="00000000-0000-0000-0000-000000000000",
        token_type=TokenType.REFRESH,
        expires_in=-30,
        extra_claims={"tv": 0},
        settings=get_settings(),
    )
    r = await client.post("/auth/refresh", json={"refresh_token": expired})
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "TOKEN_EXPIRED"
