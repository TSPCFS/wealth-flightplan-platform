"""Phase 3: content detail columns + example_interactions.

Adds JSONB columns to content_metadata (option (a) from the Phase 3 backend
prompt: simpler than a 1:1 sibling table, since detail is always read with
the row and the shape legitimately varies by content_type) and creates the
example_interactions table for the calculator analytics log.

Revision ID: 0003_phase3_content_detail
Revises: 0002_phase2_assessments
Create Date: 2026-05-12
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003_phase3_content_detail"
down_revision: str | Sequence[str] | None = "0002_phase2_assessments"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1) content_metadata gets summary + calculator_type + detail + calculator_config.
    op.add_column("content_metadata", sa.Column("summary", sa.Text(), nullable=True))
    op.add_column(
        "content_metadata",
        sa.Column("calculator_type", sa.String(50), nullable=True),
    )
    op.add_column(
        "content_metadata",
        sa.Column(
            "detail",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )
    op.add_column(
        "content_metadata",
        sa.Column("calculator_config", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.create_check_constraint(
        "ck_content_calculator_type",
        "content_metadata",
        "calculator_type IS NULL OR calculator_type IN "
        "('compound_interest','debt_analysis','budget_allocator','net_worth_analyzer')",
    )
    op.create_index("idx_content_calculator_type", "content_metadata", ["calculator_type"])

    # 2) example_interactions
    op.create_table(
        "example_interactions",
        sa.Column(
            "interaction_id",
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
        sa.Column("example_code", sa.String(50), nullable=False),
        sa.Column("example_title", sa.String(200), nullable=False),
        sa.Column("chapter", sa.String(100), nullable=True),
        sa.Column("input_parameters", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("calculated_output", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("time_spent_seconds", sa.Integer(), nullable=True),
        sa.Column(
            "modification_count",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "export_requested",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("export_format", sa.String(20), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.CheckConstraint(
            "export_format IS NULL OR export_format IN ('pdf','csv','image')",
            name="ck_interactions_export_format",
        ),
    )
    op.create_index("idx_interactions_user_id", "example_interactions", ["user_id"])
    op.create_index("idx_interactions_example_code", "example_interactions", ["example_code"])
    op.create_index(
        "idx_interactions_created_at",
        "example_interactions",
        [sa.text("created_at DESC")],
    )


def downgrade() -> None:
    op.drop_index("idx_interactions_created_at", table_name="example_interactions")
    op.drop_index("idx_interactions_example_code", table_name="example_interactions")
    op.drop_index("idx_interactions_user_id", table_name="example_interactions")
    op.drop_table("example_interactions")

    op.drop_index("idx_content_calculator_type", table_name="content_metadata")
    op.drop_constraint("ck_content_calculator_type", "content_metadata", type_="check")
    op.drop_column("content_metadata", "calculator_config")
    op.drop_column("content_metadata", "detail")
    op.drop_column("content_metadata", "calculator_type")
    op.drop_column("content_metadata", "summary")
