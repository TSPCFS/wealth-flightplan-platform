"""Cross-dialect column types so we run on Postgres in prod and SQLite in tests."""

from __future__ import annotations

import uuid

from sqlalchemy import CHAR, JSON, TypeDecorator
from sqlalchemy.dialects.postgresql import INET, JSONB, UUID


class GUID(TypeDecorator):
    """Platform-independent UUID type.

    Uses Postgres UUID when available, falls back to CHAR(36) elsewhere.
    """

    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):  # type: ignore[override]
        if dialect.name == "postgresql":
            return dialect.type_descriptor(UUID(as_uuid=True))
        return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):  # type: ignore[override]
        if value is None:
            return None
        if dialect.name == "postgresql":
            return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))
        return str(value)

    def process_result_value(self, value, dialect):  # type: ignore[override]
        if value is None:
            return None
        if isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(str(value))


class JSONType(TypeDecorator):
    """JSONB on Postgres, JSON elsewhere."""

    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):  # type: ignore[override]
        if dialect.name == "postgresql":
            return dialect.type_descriptor(JSONB())
        return dialect.type_descriptor(JSON())


class INETType(TypeDecorator):
    """Postgres INET; on SQLite store as string."""

    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):  # type: ignore[override]
        if dialect.name == "postgresql":
            return dialect.type_descriptor(INET())
        return dialect.type_descriptor(CHAR(45))

    def process_bind_param(self, value, dialect):  # type: ignore[override]
        if value is None:
            return None
        return str(value)

    def process_result_value(self, value, dialect):  # type: ignore[override]
        return value
