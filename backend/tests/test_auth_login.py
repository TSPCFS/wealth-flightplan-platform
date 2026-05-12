"""Login + access-token tests."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.conftest import VALID_PASSWORD, register_payload


async def _register(client: AsyncClient, email: str) -> None:
    r = await client.post("/auth/register", json=register_payload(email))
    assert r.status_code == 201, r.text


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient) -> None:
    email = "login-ok@example.com"
    await _register(client, email)
    r = await client.post("/auth/login", json={"email": email, "password": VALID_PASSWORD})
    assert r.status_code == 200
    body = r.json()
    assert body["token_type"] == "Bearer"
    assert body["expires_in"] > 0
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["user"]["email"] == email
    assert body["user"]["subscription_tier"] == "free"


@pytest.mark.asyncio
async def test_login_wrong_password_returns_401(client: AsyncClient) -> None:
    email = "login-bad@example.com"
    await _register(client, email)
    r = await client.post("/auth/login", json={"email": email, "password": "WrongPass123!@#"})
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "INVALID_CREDENTIALS"


@pytest.mark.asyncio
async def test_login_unknown_email_returns_401(client: AsyncClient) -> None:
    r = await client.post(
        "/auth/login",
        json={"email": "nobody@example.com", "password": VALID_PASSWORD},
    )
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "INVALID_CREDENTIALS"


@pytest.mark.asyncio
async def test_profile_requires_auth(client: AsyncClient) -> None:
    r = await client.get("/users/profile")
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "TOKEN_INVALID"


@pytest.mark.asyncio
async def test_profile_returns_user(client: AsyncClient) -> None:
    email = "profile@example.com"
    await _register(client, email)
    login = await client.post("/auth/login", json={"email": email, "password": VALID_PASSWORD})
    access = login.json()["access_token"]

    r = await client.get("/users/profile", headers={"Authorization": f"Bearer {access}"})
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == email
    assert body["first_name"] == "Alice"
    assert body["subscription_tier"] == "free"
    assert body["household_size"] == 3


@pytest.mark.asyncio
async def test_profile_rejects_garbage_bearer(client: AsyncClient) -> None:
    r = await client.get(
        "/users/profile",
        headers={"Authorization": "Bearer not-a-real-token"},
    )
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "TOKEN_INVALID"


@pytest.mark.asyncio
async def test_rate_limit_login_returns_429(client: AsyncClient) -> None:
    """Per-contract: 10/hour per email (test override: 5/hour)."""
    email = "rate-target@example.com"
    await _register(client, email)
    # 5 attempts with bad password → all 401.
    for _ in range(5):
        r = await client.post("/auth/login", json={"email": email, "password": "wrong-Pass1!"})
        assert r.status_code in (401, 200)
    # 6th attempt → 429 RATE_LIMITED.
    r = await client.post("/auth/login", json={"email": email, "password": "wrong-Pass1!"})
    assert r.status_code == 429
    assert r.json()["error"]["code"] == "RATE_LIMITED"
    assert "Retry-After" in r.headers
