"""Phase 5: add is_business_owner to users.

The recommendation engine + progress service treat business owners
differently: step 4b is only counted/exposed when this flag is true, and
business cover gaps surface as recommendations only for business owners.

Revision ID: 0005_phase5_business_owner
Revises: 0004_phase4_worksheet_responses
Create Date: 2026-05-12
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005_phase5_business_owner"
down_revision: str | Sequence[str] | None = "0004_phase4_worksheet_responses"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "is_business_owner",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "is_business_owner")
