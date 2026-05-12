"""Phase 2: assessments + user_progress + content_metadata, tz-aware timestamps.

Revision ID: 0002_phase2_assessments
Revises: 0001_initial_auth_tables
Create Date: 2026-05-12
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_phase2_assessments"
down_revision: str | Sequence[str] | None = "0001_initial_auth_tables"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# Columns that need to switch from TIMESTAMP to TIMESTAMP WITH TIME ZONE.
# Existing rows store naive UTC values, so AT TIME ZONE 'UTC' converts them
# losslessly to tz-aware UTC on Postgres.
_TZ_CONVERTS: list[tuple[str, str]] = [
    ("users", "email_verified_at"),
    ("users", "created_at"),
    ("users", "updated_at"),
    ("users", "last_login"),
    ("audit_logs", "created_at"),
]


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    # 1) Convert existing TIMESTAMP columns to TIMESTAMPTZ (Postgres only;
    #    SQLite is dynamically typed so this is a no-op there).
    if dialect == "postgresql":
        for table, column in _TZ_CONVERTS:
            op.execute(
                f"ALTER TABLE {table} "
                f"ALTER COLUMN {column} TYPE TIMESTAMP WITH TIME ZONE "
                f"USING {column} AT TIME ZONE 'UTC'"
            )

    # 2) assessments
    op.create_table(
        "assessments",
        sa.Column(
            "assessment_id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.user_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("assessment_type", sa.String(20), nullable=False),
        sa.Column("responses", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("total_score", sa.Integer(), nullable=False),
        sa.Column("calculated_stage", sa.String(50), nullable=True),
        sa.Column("stage_change_from_previous", sa.String(50), nullable=True),
        sa.Column("completion_time_seconds", sa.Integer(), nullable=True),
        sa.Column("ip_address", postgresql.INET(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.CheckConstraint(
            "assessment_type IN ('5q','10q','gap_test')",
            name="ck_assessments_type",
        ),
        sa.CheckConstraint(
            "(assessment_type <> '5q') OR (total_score BETWEEN 5 AND 20)",
            name="ck_assessments_score_5q",
        ),
        sa.CheckConstraint(
            "(assessment_type <> '10q') OR (total_score BETWEEN 10 AND 40)",
            name="ck_assessments_score_10q",
        ),
        sa.CheckConstraint(
            "(assessment_type <> 'gap_test') OR (total_score BETWEEN 0 AND 24)",
            name="ck_assessments_score_gap",
        ),
    )
    op.create_index("idx_assessments_user_id", "assessments", ["user_id"])
    op.create_index("idx_assessments_type", "assessments", ["assessment_type"])
    op.create_index("idx_assessments_stage", "assessments", ["calculated_stage"])
    op.create_index("idx_assessments_created_at", "assessments", [sa.text("created_at DESC")])
    op.create_index(
        "idx_assessments_user_type_created",
        "assessments",
        ["user_id", "assessment_type", sa.text("created_at DESC")],
    )

    # 3) user_progress
    op.create_table(
        "user_progress",
        sa.Column(
            "progress_id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.user_id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column(
            "step_1_completed", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        sa.Column("step_1_completion_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "step_2_completed", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        sa.Column("step_2_completion_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "step_3_completed", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        sa.Column("step_3_completion_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "step_4a_completed", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        sa.Column("step_4a_completion_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "step_4b_completed", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        sa.Column("step_4b_completion_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "step_5_completed", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        sa.Column("step_5_completion_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "step_6_completed", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        sa.Column("step_6_completion_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "overall_completion_percentage",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column("last_accessed_step", sa.Integer(), nullable=True),
        sa.Column("current_focus_area", sa.String(100), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.CheckConstraint(
            "overall_completion_percentage BETWEEN 0 AND 100",
            name="ck_progress_completion_percentage",
        ),
        sa.CheckConstraint(
            "last_accessed_step IS NULL OR last_accessed_step BETWEEN 1 AND 6",
            name="ck_progress_last_accessed_step",
        ),
    )
    op.create_index("idx_progress_user_id", "user_progress", ["user_id"])

    # 4) content_metadata
    op.create_table(
        "content_metadata",
        sa.Column(
            "content_id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("content_type", sa.String(50), nullable=False),
        sa.Column("content_code", sa.String(50), unique=True, nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("parent_step", sa.Integer(), nullable=True),
        sa.Column(
            "related_chapters",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "stage_relevance",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "keywords",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("difficulty_level", sa.String(20), nullable=True),
        sa.Column("has_calculator", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("has_worksheet", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("has_example", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.CheckConstraint(
            "content_type IN ('step','example','worksheet','assessment','framework','case_study')",
            name="ck_content_type",
        ),
        sa.CheckConstraint(
            "parent_step IS NULL OR parent_step BETWEEN 1 AND 6",
            name="ck_content_parent_step",
        ),
        sa.CheckConstraint(
            "difficulty_level IS NULL OR difficulty_level IN ('beginner','intermediate','advanced')",
            name="ck_content_difficulty_level",
        ),
    )
    op.create_index("idx_content_type", "content_metadata", ["content_type"])
    op.create_index("idx_content_code", "content_metadata", ["content_code"])
    op.create_index("idx_content_parent_step", "content_metadata", ["parent_step"])


def downgrade() -> None:
    op.drop_index("idx_content_parent_step", table_name="content_metadata")
    op.drop_index("idx_content_code", table_name="content_metadata")
    op.drop_index("idx_content_type", table_name="content_metadata")
    op.drop_table("content_metadata")

    op.drop_index("idx_progress_user_id", table_name="user_progress")
    op.drop_table("user_progress")

    op.drop_index("idx_assessments_user_type_created", table_name="assessments")
    op.drop_index("idx_assessments_created_at", table_name="assessments")
    op.drop_index("idx_assessments_stage", table_name="assessments")
    op.drop_index("idx_assessments_type", table_name="assessments")
    op.drop_index("idx_assessments_user_id", table_name="assessments")
    op.drop_table("assessments")

    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        for table, column in _TZ_CONVERTS:
            op.execute(
                f"ALTER TABLE {table} "
                f"ALTER COLUMN {column} TYPE TIMESTAMP "
                f"USING {column} AT TIME ZONE 'UTC'"
            )
