"""Redis-backed fixed-window rate limiter.

Used for per-email limits on /auth/login and /auth/password-reset where the
key is only known after parsing the request body; slowapi's decorator-based
limiter inspects the request before the body is read, so we apply it here.
"""

from __future__ import annotations

import re

from fastapi import status

from app.core.errors import APIError
from app.services.redis_client import get_redis

_LIMIT_RE = re.compile(r"^\s*(\d+)\s*/\s*(second|minute|hour|day)s?\s*$", re.IGNORECASE)

_PERIOD_SECONDS = {
    "second": 1,
    "minute": 60,
    "hour": 3600,
    "day": 86_400,
}


def _parse_limit(limit_str: str) -> tuple[int, int]:
    """Parse a slowapi-style limit string like '10/hour' → (count, seconds)."""
    m = _LIMIT_RE.match(limit_str)
    if not m:
        raise ValueError(f"Invalid limit string: {limit_str!r}")
    count = int(m.group(1))
    period = _PERIOD_SECONDS[m.group(2).lower()]
    return count, period


async def enforce(
    *,
    bucket: str,
    key: str,
    limit: str,
) -> None:
    """Increment a counter for ``key`` in ``bucket``; raise 429 if over ``limit``."""
    count, period = _parse_limit(limit)
    redis_key = f"rl:{bucket}:{key}"
    r = get_redis()

    new_val = await r.incr(redis_key)
    if new_val == 1:
        # First hit in this window; set TTL.
        await r.expire(redis_key, period)

    if new_val > count:
        ttl = await r.ttl(redis_key)
        retry_after = max(ttl, 1) if ttl > 0 else period
        raise APIError(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            code="RATE_LIMITED",
            message=f"Rate limit exceeded: {limit}",
            headers={"Retry-After": str(retry_after)},
        )
