"""Health, CORS, error envelope tests."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_returns_ok(client: AsyncClient) -> None:
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_cors_preflight_allows_vite_origin(client: AsyncClient) -> None:
    r = await client.options(
        "/auth/login",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type, Authorization",
        },
    )
    assert r.status_code in (200, 204)
    allow_origin = r.headers.get("access-control-allow-origin", "")
    assert allow_origin == "http://localhost:5173"
    allow_methods = r.headers.get("access-control-allow-methods", "")
    assert "POST" in allow_methods


@pytest.mark.asyncio
async def test_cors_preflight_allows_docker_origin(client: AsyncClient) -> None:
    r = await client.options(
        "/auth/login",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )
    assert r.status_code in (200, 204)
    assert r.headers.get("access-control-allow-origin") == "http://localhost:3000"


@pytest.mark.asyncio
async def test_404_uses_error_envelope(client: AsyncClient) -> None:
    r = await client.get("/no-such-route")
    assert r.status_code == 404
    body = r.json()
    assert "error" in body
    assert body["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_validation_error_uses_envelope_and_details(client: AsyncClient) -> None:
    r = await client.post("/auth/register", json={"email": "no"})
    assert r.status_code == 400
    body = r.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert "details" in body["error"]
    assert isinstance(body["error"]["details"], dict)
