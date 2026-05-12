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

from app.core.datetimes import utcnow
from app.db.database import Base
from app.db.types import GUID, INETType, JSONType


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)

    # Auth
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    email_verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
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
    is_business_owner: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # 2FA
    two_factor_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    two_factor_method: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Privacy
    privacy_settings: Mapped[dict] = mapped_column(JSONType(), default=dict, nullable=False)

    # Token versioning — bumped to invalidate all refresh tokens (e.g. on password reset).
    token_version: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Timestamps (tz-aware UTC — see app.core.datetimes)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.current_timestamp(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
        nullable=False,
    )
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    audit_logs: Mapped[list[AuditLog]] = relationship(
        "AuditLog", back_populates="user", cascade="all, delete"
    )
    assessments: Mapped[list[Assessment]] = relationship(
        "Assessment", back_populates="user", cascade="all, delete"
    )
    progress: Mapped[UserProgress | None] = relationship(
        "UserProgress", back_populates="user", uselist=False, cascade="all, delete"
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
        DateTime(timezone=True), server_default=func.current_timestamp(), nullable=False
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


# ---------------------------------------------------------------------------
# Phase 2 — assessments, user_progress, content_metadata
# ---------------------------------------------------------------------------


class Assessment(Base):
    __tablename__ = "assessments"

    assessment_id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False
    )

    # Metadata
    assessment_type: Mapped[str] = mapped_column(String(20), nullable=False)

    # Responses + results
    responses: Mapped[dict] = mapped_column(JSONType(), nullable=False)
    total_score: Mapped[int] = mapped_column(Integer, nullable=False)
    # 5q/10q: 'Foundation' | 'Momentum' | 'Freedom' | 'Independence' | 'Abundance'
    # gap_test: 'solid_plan' | 'meaningful_gaps' | 'wide_gaps'
    calculated_stage: Mapped[str | None] = mapped_column(String(50), nullable=True)
    stage_change_from_previous: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Engagement
    completion_time_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(INETType(), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timestamps — Python-side default keeps microsecond precision under SQLite
    # tests (server_default truncates to seconds), which is needed for
    # deterministic ordering by created_at.
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        default=utcnow,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        default=utcnow,
        onupdate=utcnow,
        nullable=False,
    )

    user: Mapped[User] = relationship("User", back_populates="assessments")

    __table_args__ = (
        CheckConstraint(
            "assessment_type IN ('5q','10q','gap_test')",
            name="ck_assessments_type",
        ),
        CheckConstraint(
            "(assessment_type <> '5q') OR (total_score BETWEEN 5 AND 20)",
            name="ck_assessments_score_5q",
        ),
        CheckConstraint(
            "(assessment_type <> '10q') OR (total_score BETWEEN 10 AND 40)",
            name="ck_assessments_score_10q",
        ),
        CheckConstraint(
            "(assessment_type <> 'gap_test') OR (total_score BETWEEN 0 AND 24)",
            name="ck_assessments_score_gap",
        ),
        Index("idx_assessments_user_id", "user_id"),
        Index("idx_assessments_type", "assessment_type"),
        Index("idx_assessments_stage", "calculated_stage"),
        Index("idx_assessments_created_at", "created_at"),
        # Composite (user, type, created_at) for the "latest 5q/10q" query.
        Index("idx_assessments_user_type_created", "user_id", "assessment_type", "created_at"),
    )


class UserProgress(Base):
    """Framework completion — schema only in Phase 2; populated by Phase 3+."""

    __tablename__ = "user_progress"

    progress_id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    step_1_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    step_1_completion_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    step_2_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    step_2_completion_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    step_3_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    step_3_completion_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    step_4a_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    step_4a_completion_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    step_4b_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    step_4b_completion_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    step_5_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    step_5_completion_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    step_6_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    step_6_completion_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    overall_completion_percentage: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_accessed_step: Mapped[int | None] = mapped_column(Integer, nullable=True)
    current_focus_area: Mapped[str | None] = mapped_column(String(100), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.current_timestamp(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
        nullable=False,
    )

    user: Mapped[User] = relationship("User", back_populates="progress")

    __table_args__ = (
        CheckConstraint(
            "overall_completion_percentage BETWEEN 0 AND 100",
            name="ck_progress_completion_percentage",
        ),
        CheckConstraint(
            "last_accessed_step IS NULL OR last_accessed_step BETWEEN 1 AND 6",
            name="ck_progress_last_accessed_step",
        ),
        Index("idx_progress_user_id", "user_id"),
    )


class ContentMetadata(Base):
    """Framework / examples / worksheets catalogue — schema only in Phase 2."""

    __tablename__ = "content_metadata"

    content_id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)

    content_type: Mapped[str] = mapped_column(String(50), nullable=False)
    content_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    parent_step: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # related_chapters / stage_relevance / keywords are arrays in Postgres but
    # we store them as JSONType for portability with the SQLite test database.
    related_chapters: Mapped[list | None] = mapped_column(JSONType(), default=list, nullable=False)
    stage_relevance: Mapped[list | None] = mapped_column(JSONType(), default=list, nullable=False)
    keywords: Mapped[list | None] = mapped_column(JSONType(), default=list, nullable=False)
    difficulty_level: Mapped[str | None] = mapped_column(String(20), nullable=True)

    has_calculator: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_worksheet: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_example: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Phase 3 additions — keep all rich content on the same row.
    #
    # Decision: option (a) from the Phase 3 prompt — add JSONB columns rather
    # than a sibling content_details table. Reasoning: (1) reads are 1:1 with
    # the metadata row, so a join buys nothing; (2) the shape varies by
    # content_type and is read-heavy, write-once, which JSONB handles cleanly;
    # (3) the API contract already organises detail fields nested under
    # ``calculator_config`` etc, so JSON storage maps directly onto the wire
    # format without an extra mapping layer.
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    calculator_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    detail: Mapped[dict | None] = mapped_column(JSONType(), default=dict, nullable=False)
    calculator_config: Mapped[dict | None] = mapped_column(JSONType(), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.current_timestamp(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint(
            "content_type IN ('step','example','worksheet','assessment','framework','case_study')",
            name="ck_content_type",
        ),
        CheckConstraint(
            "parent_step IS NULL OR parent_step BETWEEN 1 AND 6",
            name="ck_content_parent_step",
        ),
        CheckConstraint(
            "difficulty_level IS NULL OR difficulty_level IN ('beginner','intermediate','advanced')",
            name="ck_content_difficulty_level",
        ),
        CheckConstraint(
            "calculator_type IS NULL OR calculator_type IN "
            "('compound_interest','debt_analysis','budget_allocator','net_worth_analyzer')",
            name="ck_content_calculator_type",
        ),
        Index("idx_content_type", "content_type"),
        Index("idx_content_code", "content_code"),
        Index("idx_content_parent_step", "parent_step"),
        Index("idx_content_calculator_type", "calculator_type"),
    )


class ExampleInteraction(Base):
    """Per-user calculator run log — for analytics + replay."""

    __tablename__ = "example_interactions"

    interaction_id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False
    )

    example_code: Mapped[str] = mapped_column(String(50), nullable=False)
    example_title: Mapped[str] = mapped_column(String(200), nullable=False)
    chapter: Mapped[str | None] = mapped_column(String(100), nullable=True)

    input_parameters: Mapped[dict] = mapped_column(JSONType(), nullable=False)
    calculated_output: Mapped[dict] = mapped_column(JSONType(), nullable=False)

    time_spent_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    modification_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    export_requested: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    export_format: Mapped[str | None] = mapped_column(String(20), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        default=utcnow,
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint(
            "export_format IS NULL OR export_format IN ('pdf','csv','image')",
            name="ck_interactions_export_format",
        ),
        Index("idx_interactions_user_id", "user_id"),
        Index("idx_interactions_example_code", "example_code"),
        Index("idx_interactions_created_at", "created_at"),
    )


class WorksheetResponse(Base):
    """Phase 4 — per-user worksheet draft / submission rows.

    Draft uniqueness ("at most one draft per (user, worksheet_code)") is
    enforced at the DB level by a partial unique index in migration 0004.
    Submissions (is_draft=False) are unconstrained — each submit inserts a
    new row, preserving history.
    """

    __tablename__ = "worksheet_responses"

    worksheet_id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False
    )

    worksheet_code: Mapped[str] = mapped_column(String(20), nullable=False)
    response_data: Mapped[dict] = mapped_column(JSONType(), nullable=False)
    calculated_values: Mapped[dict | None] = mapped_column(JSONType(), nullable=True)
    feedback: Mapped[dict | None] = mapped_column(JSONType(), nullable=True)

    completion_percentage: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_draft: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        default=utcnow,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.current_timestamp(),
        default=utcnow,
        onupdate=utcnow,
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint(
            "worksheet_code IN ('APP-A','APP-B','APP-C','APP-D','APP-E','APP-F','APP-G')",
            name="ck_worksheets_code",
        ),
        CheckConstraint(
            "completion_percentage BETWEEN 0 AND 100",
            name="ck_worksheets_completion_percentage",
        ),
        Index("idx_worksheets_user_id", "user_id"),
        Index("idx_worksheets_code", "worksheet_code"),
        Index("idx_worksheets_created_at", "created_at"),
    )


__all__ = [
    "Assessment",
    "AuditLog",
    "ContentMetadata",
    "ExampleInteraction",
    "User",
    "UserProgress",
    "WorksheetResponse",
]
