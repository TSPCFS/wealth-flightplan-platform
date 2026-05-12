from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.db.types import GUID, INETType, JSONType


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)

    # Auth
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    # Profile
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    date_of_birth: Mapped[Date | None] = mapped_column(Date, nullable=True)

    # Household
    household_income_monthly_after_tax: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 2), nullable=True
    )
    household_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    number_of_dependants: Mapped[int | None] = mapped_column(Integer, nullable=True)
    primary_language: Mapped[str] = mapped_column(String(10), default="en", nullable=False)
    timezone: Mapped[str] = mapped_column(String(50), default="SAST", nullable=False)

    # Account
    account_status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    subscription_tier: Mapped[str] = mapped_column(String(20), default="free", nullable=False)

    # 2FA
    two_factor_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    two_factor_method: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Privacy
    privacy_settings: Mapped[dict] = mapped_column(JSONType(), default=dict, nullable=False)

    # Token versioning — bumped to invalidate all refresh tokens (e.g. on password reset).
    token_version: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.current_timestamp(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
        nullable=False,
    )
    last_login: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    audit_logs: Mapped[list[AuditLog]] = relationship(
        "AuditLog", back_populates="user", cascade="all, delete"
    )

    __table_args__ = (
        CheckConstraint(
            "account_status IN ('active','inactive','suspended')",
            name="ck_users_account_status",
        ),
        CheckConstraint(
            "subscription_tier IN ('free','premium','advisor')",
            name="ck_users_subscription_tier",
        ),
        CheckConstraint(
            "household_income_monthly_after_tax IS NULL OR household_income_monthly_after_tax > 0",
            name="ck_users_household_income_positive",
        ),
        CheckConstraint(
            "household_size IS NULL OR household_size > 0",
            name="ck_users_household_size_positive",
        ),
        Index("idx_users_email", "email"),
        Index("idx_users_account_status", "account_status"),
        Index("idx_users_created_at", "created_at"),
        Index("idx_users_last_login", "last_login"),
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    log_id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True
    )

    action: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    entity_id: Mapped[uuid.UUID | None] = mapped_column(GUID(), nullable=True)

    old_values: Mapped[dict | None] = mapped_column(JSONType(), nullable=True)
    new_values: Mapped[dict | None] = mapped_column(JSONType(), nullable=True)

    ip_address: Mapped[str | None] = mapped_column(INETType(), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.current_timestamp(), nullable=False
    )

    user: Mapped[User | None] = relationship("User", back_populates="audit_logs")

    __table_args__ = (
        CheckConstraint(
            "status IS NULL OR status IN ('success','failure')",
            name="ck_audit_logs_status",
        ),
        Index("idx_audit_logs_user_id", "user_id"),
        Index("idx_audit_logs_created_at", "created_at"),
        Index("idx_audit_logs_action", "action"),
        Index("idx_audit_logs_entity", "entity_type", "entity_id"),
    )


__all__ = ["AuditLog", "User"]
