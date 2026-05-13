"""Phase 8a: admin role + suspension columns.

Adds three columns to ``users``:

- ``is_admin BOOLEAN NOT NULL DEFAULT FALSE`` — gates the /admin/* surface
- ``suspended_at TIMESTAMPTZ NULL`` — set when an admin suspends the account
- ``locked_until TIMESTAMPTZ NULL`` — far-future timestamp paired with
  ``suspended_at`` so revocation also blocks programmatic access until
  explicitly unsuspended

Bootstraps wouter@attooh.co.za as the initial admin so the admin surface is
usable on first deploy. The data step is idempotent — if the user doesn't
exist yet (fresh DB) it simply updates zero rows.

The partial index speeds the ``WHERE is_admin = TRUE`` lookup the admin
list endpoint uses for the "Show admins" filter.

Revision ID: 0007_phase8_admin
Revises: 0006_phase7a_chatbot
Create Date: 2026-05-13
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0007_phase8_admin"
down_revision: str | Sequence[str] | None = "0006_phase7a_chatbot"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "is_admin",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "users",
        sa.Column("suspended_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
    )

    # Partial index — the "show admins only" filter scans this; ordinary user
    # listings never read the index.
    op.create_index(
        "ix_users_is_admin",
        "users",
        ["is_admin"],
        postgresql_where=sa.text("is_admin = true"),
        sqlite_where=sa.text("is_admin = 1"),
    )

    # Bootstrap: promote the platform owner so the /admin surface is usable
    # immediately after the deploy. Idempotent — updates 0 rows on a fresh
    # DB where the user hasn't registered yet.
    op.execute("UPDATE users SET is_admin = TRUE WHERE LOWER(email) = 'wouter@attooh.co.za'")


def downgrade() -> None:
    op.drop_index("ix_users_is_admin", table_name="users")
    op.drop_column("users", "locked_until")
    op.drop_column("users", "suspended_at")
    op.drop_column("users", "is_admin")
