"""Phase 4: worksheet_responses table.

Adds the table that backs /worksheets/{code}/draft + /submit + /latest +
/history + exports. Replaces the speculative ``worksheet_type`` enum from
DATABASE_SCHEMA.md with ``worksheet_code`` so it stays aligned with the
``APP-A`` … ``APP-G`` codes the Phase 4 contract uses.

A partial unique index enforces "at most one draft per (user, worksheet_code)"
so the /draft endpoint can upsert without race conditions. Submissions
(``is_draft = false``) are unconstrained; every submit inserts a new row,
preserving history.

Revision ID: 0004_phase4_worksheet_responses
Revises: 0003_phase3_content_detail
Create Date: 2026-05-12
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004_phase4_worksheet_responses"
down_revision: str | Sequence[str] | None = "0003_phase3_content_detail"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "worksheet_responses",
        sa.Column(
            "worksheet_id",
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
        sa.Column("worksheet_code", sa.String(20), nullable=False),
        sa.Column("response_data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "calculated_values",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "feedback",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "completion_percentage",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "is_draft",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
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
            "worksheet_code IN ('APP-A','APP-B','APP-C','APP-D','APP-E','APP-F','APP-G')",
            name="ck_worksheets_code",
        ),
        sa.CheckConstraint(
            "completion_percentage BETWEEN 0 AND 100",
            name="ck_worksheets_completion_percentage",
        ),
    )
    op.create_index("idx_worksheets_user_id", "worksheet_responses", ["user_id"])
    op.create_index("idx_worksheets_code", "worksheet_responses", ["worksheet_code"])
    op.create_index(
        "idx_worksheets_created_at",
        "worksheet_responses",
        [sa.text("created_at DESC")],
    )
    # Partial unique index: at most one draft per (user_id, worksheet_code).
    # Supported by both Postgres and SQLite (CREATE UNIQUE INDEX ... WHERE).
    op.create_index(
        "uq_worksheets_one_draft_per_user_code",
        "worksheet_responses",
        ["user_id", "worksheet_code"],
        unique=True,
        postgresql_where=sa.text("is_draft = true"),
        sqlite_where=sa.text("is_draft = 1"),
    )


def downgrade() -> None:
    op.drop_index("uq_worksheets_one_draft_per_user_code", table_name="worksheet_responses")
    op.drop_index("idx_worksheets_created_at", table_name="worksheet_responses")
    op.drop_index("idx_worksheets_code", table_name="worksheet_responses")
    op.drop_index("idx_worksheets_user_id", table_name="worksheet_responses")
    op.drop_table("worksheet_responses")
