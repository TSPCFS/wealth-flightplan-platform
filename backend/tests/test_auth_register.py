"""Registration flow tests."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.conftest import VALID_PASSWORD, register_payload


@pytest.mark.asyncio
async def test_register_success_returns_201(client: AsyncClient) -> None:
    r = await client.post("/auth/register", json=register_payload("reg-ok@example.com"))
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["email"] == "reg-ok@example.com"
    assert body["email_verified"] is False
    assert "user_id" in body
    assert body["message"] == "Verification email sent"


@pytest.mark.asyncio
async def test_register_lowercases_email(client: AsyncClient) -> None:
    r = await client.post("/auth/register", json=register_payload("Mixed@Case.COM"))
    assert r.status_code == 201
    assert r.json()["email"] == "mixed@case.com"


@pytest.mark.asyncio
async def test_register_duplicate_email_returns_409(client: AsyncClient) -> None:
    payload = register_payload("dup@example.com")
    r1 = await client.post("/auth/register", json=payload)
    assert r1.status_code == 201
    r2 = await client.post("/auth/register", json=payload)
    assert r2.status_code == 409
    body = r2.json()
    assert body["error"]["code"] == "EMAIL_ALREADY_REGISTERED"


@pytest.mark.asyncio
async def test_register_weak_password_rejected(client: AsyncClient) -> None:
    r = await client.post(
        "/auth/register", json=register_payload("weak@example.com", password="short1!A")
    )
    # Pydantic min_length=12 catches this first → 400 VALIDATION_ERROR.
    assert r.status_code == 400
    body = r.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert "password" in body["error"]["details"]


@pytest.mark.asyncio
async def test_register_password_missing_components_rejected(client: AsyncClient) -> None:
    r = await client.post(
        "/auth/register",
        json=register_payload("weak2@example.com", password="alllowercasenobody"),
    )
    assert r.status_code == 400
    body = r.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"
    msgs = " ".join(body["error"]["details"]["password"])
    assert "uppercase" in msgs.lower()
    assert "digit" in msgs.lower()
    assert "special" in msgs.lower()


@pytest.mark.asyncio
async def test_register_password_equals_email_rejected(client: AsyncClient) -> None:
    weird_email = "Verylongpassword123!@@example.com"
    r = await client.post(
        "/auth/register",
        json=register_payload(weird_email, password=weird_email),
    )
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_register_hibp_breach_flagged(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("HIBP_ENABLED", "true")
    from app.core.config import get_settings
    from app.services import auth as auth_svc

    get_settings.cache_clear()  # type: ignore[attr-defined]

    async def fake_pwned(_password: str, *, timeout: float = 2.0) -> bool:
        return True

    monkeypatch.setattr(auth_svc, "is_password_pwned", fake_pwned)

    r = await client.post(
        "/auth/register",
        json=register_payload("breached@example.com", password=VALID_PASSWORD),
    )
    assert r.status_code == 400
    body = r.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert any("breach" in m.lower() for m in body["error"]["details"]["password"])


@pytest.mark.asyncio
async def test_register_invalid_email_returns_400(client: AsyncClient) -> None:
    r = await client.post("/auth/register", json=register_payload("not-an-email"))
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_register_missing_first_name_returns_400(client: AsyncClient) -> None:
    payload = register_payload("noname@example.com")
    payload["first_name"] = ""
    r = await client.post("/auth/register", json=payload)
    assert r.status_code == 400
