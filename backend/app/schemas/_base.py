"""Shared pydantic helpers for response models.

The API contract requires ISO 8601 UTC with explicit ``Z`` suffix on every
datetime field. ``ZuluResponse`` is a marker base class (alias for BaseModel)
so the existing imports continue to work; for datetime fields the convention
is to annotate them as ``datetime`` and rely on the ``json_encoders`` config
below, or — for clarity at field level — use the ``ZuluDateTime`` alias.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, PlainSerializer

from app.core.datetimes import to_utc_z

# Annotated alias: any datetime field annotated as ZuluDateTime serializes as
# ``2026-05-12T10:30:00.123456Z`` on JSON output.
ZuluDateTime = Annotated[
    datetime,
    PlainSerializer(to_utc_z, return_type=str, when_used="json"),
]


class ZuluResponse(BaseModel):
    """Base for response models. Datetimes serialize as UTC with ``Z`` suffix.

    The ``json_encoders`` setting catches plain ``datetime`` fields too, so
    callers can use either ``datetime`` or ``ZuluDateTime`` annotations.
    """

    model_config = ConfigDict(json_encoders={datetime: to_utc_z})
