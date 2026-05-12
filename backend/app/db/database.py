from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""


_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def _build_engine(url: str) -> AsyncEngine:
    # SQLite needs check_same_thread off; asyncpg can take pool tuning.
    if url.startswith("sqlite"):
        return create_async_engine(url, future=True, echo=False)
    return create_async_engine(
        url,
        future=True,
        echo=False,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
    )


def get_engine() -> AsyncEngine:
    global _engine, _session_factory
    if _engine is None:
        settings = get_settings()
        _engine = _build_engine(settings.database_url)
        _session_factory = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    if _session_factory is None:
        get_engine()
    assert _session_factory is not None
    return _session_factory


async def get_db() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency."""
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def reset_engine_for_tests(url: str) -> None:
    """Replace the global engine — call from test fixtures."""
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
    _engine = _build_engine(url)
    _session_factory = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)
