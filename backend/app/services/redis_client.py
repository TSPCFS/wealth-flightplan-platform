"""Async Redis client with an in-memory fallback used by tests.

Supported operations are limited to what the auth flow needs:
- get / set (with EX seconds)
- exists
- delete
"""

from __future__ import annotations

import asyncio
import time
from typing import Protocol

import redis.asyncio as redis_async

from app.core.config import get_settings


class RedisLike(Protocol):
    async def get(self, key: str) -> str | None: ...
    async def set(self, key: str, value: str, ex: int | None = None) -> None: ...
    async def exists(self, key: str) -> int: ...
    async def delete(self, key: str) -> int: ...
    async def ping(self) -> bool: ...
    async def aclose(self) -> None: ...


class InMemoryRedis:
    """A minimal in-memory async stand-in for Redis (used in tests).

    Honors per-key TTLs and is safe to call from multiple tasks.
    """

    def __init__(self) -> None:
        self._data: dict[str, tuple[str, float | None]] = {}
        self._lock = asyncio.Lock()

    def _expired(self, expires_at: float | None) -> bool:
        return expires_at is not None and expires_at <= time.monotonic()

    async def get(self, key: str) -> str | None:
        async with self._lock:
            entry = self._data.get(key)
            if entry is None:
                return None
            value, expires_at = entry
            if self._expired(expires_at):
                self._data.pop(key, None)
                return None
            return value

    async def set(self, key: str, value: str, ex: int | None = None) -> None:
        async with self._lock:
            expires_at = time.monotonic() + ex if ex else None
            self._data[key] = (value, expires_at)

    async def exists(self, key: str) -> int:
        async with self._lock:
            entry = self._data.get(key)
            if entry is None:
                return 0
            _, expires_at = entry
            if self._expired(expires_at):
                self._data.pop(key, None)
                return 0
            return 1

    async def delete(self, key: str) -> int:
        async with self._lock:
            return 1 if self._data.pop(key, None) is not None else 0

    async def incr(self, key: str) -> int:
        async with self._lock:
            entry = self._data.get(key)
            if entry is None or self._expired(entry[1]):
                self._data[key] = ("1", None)
                return 1
            value, expires_at = entry
            new = int(value) + 1
            self._data[key] = (str(new), expires_at)
            return new

    async def expire(self, key: str, seconds: int) -> bool:
        async with self._lock:
            entry = self._data.get(key)
            if entry is None:
                return False
            value, _ = entry
            self._data[key] = (value, time.monotonic() + seconds)
            return True

    async def ttl(self, key: str) -> int:
        async with self._lock:
            entry = self._data.get(key)
            if entry is None:
                return -2
            _, expires_at = entry
            if expires_at is None:
                return -1
            remaining = expires_at - time.monotonic()
            return max(int(remaining), 0)

    async def ping(self) -> bool:
        return True

    async def aclose(self) -> None:
        return None

    async def flushall(self) -> None:
        async with self._lock:
            self._data.clear()


_client: RedisLike | None = None


def _build_redis_client() -> RedisLike:
    settings = get_settings()
    if settings.testing:
        return InMemoryRedis()
    return redis_async.from_url(settings.redis_url, encoding="utf-8", decode_responses=True)


def get_redis() -> RedisLike:
    global _client
    if _client is None:
        _client = _build_redis_client()
    return _client


def set_redis_for_tests(client: RedisLike) -> None:
    global _client
    _client = client


async def reset_redis() -> None:
    global _client
    if _client is not None:
        try:
            await _client.aclose()
        except Exception:
            pass
    _client = None
