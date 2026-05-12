"""Datetime helpers — contract mandates ISO 8601 UTC with explicit ``Z`` suffix."""

from __future__ import annotations

from datetime import UTC, datetime


def utcnow() -> datetime:
    """Timezone-aware UTC ``now()``. Used for all DB writes."""
    return datetime.now(UTC)


def to_utc_z(dt: datetime) -> str:
    """Serialize a datetime as ISO 8601 UTC with ``Z`` suffix.

    Accepts naive datetimes (assumed UTC) and tz-aware datetimes (converted).
    """
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC).isoformat().replace("+00:00", "Z")


__all__ = ["to_utc_z", "utcnow"]
