"""Shared pydantic helpers for response models.

The API contract requires:
- ISO 8601 UTC with explicit ``Z`` suffix on every datetime field
- Numeric fields serialized as JSON numbers, never strings (Decimal columns)

Use ``ZuluDateTime`` for any datetime field, ``MoneyAmount`` for any monetary
field that comes off a ``Decimal`` column. ``ZuluResponse`` is the shared base
class so existing imports keep working.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, PlainSerializer

from app.core.datetimes import to_utc_z


def _serialize_money(value: Decimal | float | int | None) -> float | None:
    """Coerce a Decimal/None to a JSON number for response output."""
    if value is None:
        return None
    return float(value)


# Annotated alias: any datetime field annotated as ZuluDateTime serializes as
# ``2026-05-12T10:30:00.123456Z`` on JSON output.
ZuluDateTime = Annotated[
    datetime,
    PlainSerializer(to_utc_z, return_type=str, when_used="json"),
]

# Annotated alias: any monetary Decimal field serializes as a JSON number.
# Phase 2 emitted ``"85000.00"`` from /users/profile; Phase 3 fixes this so the
# frontend can use the value directly without coercion.
MoneyAmount = Annotated[
    Decimal,
    PlainSerializer(_serialize_money, return_type=float, when_used="json"),
]


class ZuluResponse(BaseModel):
    """Base for response models. Datetimes serialize as UTC with ``Z`` suffix."""

    model_config = ConfigDict(json_encoders={datetime: to_utc_z})
