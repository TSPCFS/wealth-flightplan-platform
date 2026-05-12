"""Initial auth tables: users + audit_logs.

Revision ID: 0001_initial_auth_tables
Revises:
Create Date: 2026-05-12

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial_auth_tables"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

    op.create_table(
        "users",
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column(
            "email_verified",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("email_verified_at", sa.DateTime(), nullable=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("phone_number", sa.String(20), nullable=True),
        sa.Column("date_of_birth", sa.Date(), nullable=True),
        sa.Column("household_income_monthly_after_tax", sa.Numeric(10, 2), nullable=True),
        sa.Column("household_size", sa.Integer(), nullable=True),
        sa.Column("number_of_dependants", sa.Integer(), nullable=True),
        sa.Column(
            "primary_language",
            sa.String(10),
            nullable=False,
            server_default=sa.text("'en'"),
        ),
        sa.Column(
            "timezone",
            sa.String(50),
            nullable=False,
            server_default=sa.text("'SAST'"),
        ),
        sa.Column(
            "account_status",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'active'"),
        ),
        sa.Column(
            "subscription_tier",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'free'"),
        ),
        sa.Column(
            "two_factor_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("two_factor_method", sa.String(20), nullable=True),
        sa.Column(
            "privacy_settings",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "token_version",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column("last_login", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.CheckConstraint(
            "account_status IN ('active','inactive','suspended')",
            name="ck_users_account_status",
        ),
        sa.CheckConstraint(
            "subscription_tier IN ('free','premium','advisor')",
            name="ck_users_subscription_tier",
        ),
        sa.CheckConstraint(
            "household_income_monthly_after_tax IS NULL "
            "OR household_income_monthly_after_tax > 0",
            name="ck_users_household_income_positive",
        ),
        sa.CheckConstraint(
            "household_size IS NULL OR household_size > 0",
            name="ck_users_household_size_positive",
        ),
        sa.CheckConstraint(
            r"email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'",
            name="ck_users_valid_email",
        ),
    )

    op.create_index("idx_users_email", "users", ["email"])
    op.create_index("idx_users_account_status", "users", ["account_status"])
    op.create_index(
        "idx_users_created_at",
        "users",
        [sa.text("created_at DESC")],
    )
    op.create_index(
        "idx_users_last_login",
        "users",
        [sa.text("last_login DESC")],
    )

    op.create_table(
        "audit_logs",
        sa.Column(
            "log_id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.user_id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=True),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "old_values",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "new_values",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column("ip_address", postgresql.INET(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.CheckConstraint(
            "status IS NULL OR status IN ('success','failure')",
            name="ck_audit_logs_status",
        ),
    )

    op.create_index("idx_audit_logs_user_id", "audit_logs", ["user_id"])
    op.create_index(
        "idx_audit_logs_created_at",
        "audit_logs",
        [sa.text("created_at DESC")],
    )
    op.create_index("idx_audit_logs_action", "audit_logs", ["action"])
    op.create_index("idx_audit_logs_entity", "audit_logs", ["entity_type", "entity_id"])


def downgrade() -> None:
    op.drop_index("idx_audit_logs_entity", table_name="audit_logs")
    op.drop_index("idx_audit_logs_action", table_name="audit_logs")
    op.drop_index("idx_audit_logs_created_at", table_name="audit_logs")
    op.drop_index("idx_audit_logs_user_id", table_name="audit_logs")
    op.drop_table("audit_logs")

    op.drop_index("idx_users_last_login", table_name="users")
    op.drop_index("idx_users_created_at", table_name="users")
    op.drop_index("idx_users_account_status", table_name="users")
    op.drop_index("idx_users_email", table_name="users")
    op.drop_table("users")
