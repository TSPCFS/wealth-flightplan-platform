"""Refresh-token blacklist backed by Redis.

We store entries under ``blacklist:<jti>`` with TTL = remaining token lifetime.
"""

from __future__ import annotations

import time

from app.services.redis_client import get_redis

_PREFIX = "blacklist:"


async def blacklist_jti(jti: str, *, exp_unix: int) -> None:
    """Mark a refresh token jti as revoked until its natural expiry."""
    ttl = max(int(exp_unix - time.time()), 1)
    await get_redis().set(f"{_PREFIX}{jti}", "1", ex=ttl)


async def is_blacklisted(jti: str) -> bool:
    return bool(await get_redis().exists(f"{_PREFIX}{jti}"))
