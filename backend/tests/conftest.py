"""Pytest fixtures — hermetic auth test environment.

We swap:
- Postgres → SQLite (aiosqlite) with the same SQLAlchemy models.
- Redis → InMemoryRedis stand-in.
- JWT keypair → generated in-process and injected via Settings.
- HIBP + SendGrid → monkeypatched no-ops.
"""

from __future__ import annotations

import os
import uuid
from collections.abc import AsyncIterator, Iterator

import pytest
import pytest_asyncio
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from httpx import ASGITransport, AsyncClient

# ---- Force test mode BEFORE app imports ----
os.environ["ENVIRONMENT"] = "test"
os.environ["TESTING"] = "true"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["REDIS_URL"] = "redis://invalid-host:0/0"  # never used
os.environ["SENDGRID_API_KEY"] = ""  # forces stdout fallback


def _generate_rsa_keypair() -> tuple[str, str]:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048, backend=default_backend())
    private_pem = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()
    public_pem = (
        key.public_key()
        .public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        .decode()
    )
    return private_pem, public_pem


_PRIVATE_PEM, _PUBLIC_PEM = _generate_rsa_keypair()
os.environ["JWT_PRIVATE_KEY"] = _PRIVATE_PEM
os.environ["JWT_PUBLIC_KEY"] = _PUBLIC_PEM

# Rate limits tuned for tests:
# - register/password-reset: high so cross-test traffic on shared IP doesn't trip.
# - login: 5/hour matches the dedicated rate-limit test; other tests use fresh emails
#   so the per-email key keeps them isolated.
os.environ.setdefault("RATE_LIMIT_REGISTER", "1000/hour")
os.environ.setdefault("RATE_LIMIT_LOGIN", "5/hour")
os.environ.setdefault("RATE_LIMIT_PASSWORD_RESET", "1000/hour")
os.environ.setdefault("RATE_LIMIT_AUTHED", "10000/minute")
os.environ.setdefault("HIBP_ENABLED", "false")
os.environ.setdefault("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")


from app.core import security  # noqa: E402
from app.core.config import get_settings  # noqa: E402
from app.db import database as db_mod  # noqa: E402
from app.db import models  # noqa: E402,F401  (register models on Base.metadata)
from app.db.database import Base  # noqa: E402
from app.services import redis_client  # noqa: E402
from app.services.redis_client import InMemoryRedis  # noqa: E402


@pytest.fixture(autouse=True)
def _reset_caches() -> Iterator[None]:
    """Force fresh settings + key cache between tests."""
    get_settings.cache_clear()  # type: ignore[attr-defined]
    security.reset_key_cache()
    yield
    get_settings.cache_clear()  # type: ignore[attr-defined]
    security.reset_key_cache()


@pytest_asyncio.fixture
async def db_engine(tmp_path_factory):
    """Per-test SQLite engine + schema (temp file for cross-connection state)."""
    db_path = tmp_path_factory.mktemp("db") / f"wfp_{uuid.uuid4().hex}.sqlite"
    db_url = f"sqlite+aiosqlite:///{db_path}"
    await db_mod.reset_engine_for_tests(db_url)
    engine = db_mod.get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def redis_stub():
    stub = InMemoryRedis()
    redis_client.set_redis_for_tests(stub)
    yield stub
    await stub.flushall()
    await redis_client.reset_redis()


@pytest_asyncio.fixture
async def client(db_engine, redis_stub) -> AsyncIterator[AsyncClient]:
    # Import after env is configured.
    from app.main import create_app

    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac


# ---------- Convenience helpers ----------

VALID_PASSWORD = "Wealth!Plan2026Strong"


def register_payload(email: str = "alice@example.com", **overrides):
    payload = {
        "email": email,
        "password": VALID_PASSWORD,
        "first_name": "Alice",
        "last_name": "Doe",
        "household_income_monthly_after_tax": 50000,
        "household_size": 3,
        "number_of_dependants": 1,
    }
    payload.update(overrides)
    return payload


async def seed_phase3_content() -> dict:
    """Run the Phase 3 content seed against the current test DB (idempotent)."""
    from app.db.seeds.phase3_content import seed

    return await seed()


async def seed_phase4_worksheets() -> dict:
    """Run the Phase 4 worksheet seed against the current test DB (idempotent)."""
    from app.db.seeds.phase4_worksheets import seed

    return await seed()


async def authed_session(client, email: str) -> tuple[str, str]:
    """Register a user and return (access_token, user_id)."""
    r = await client.post("/auth/register", json=register_payload(email))
    assert r.status_code == 201, r.text
    user_id = r.json()["user_id"]
    login = await client.post("/auth/login", json={"email": email, "password": VALID_PASSWORD})
    assert login.status_code == 200, login.text
    return login.json()["access_token"], user_id


def bearer(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
