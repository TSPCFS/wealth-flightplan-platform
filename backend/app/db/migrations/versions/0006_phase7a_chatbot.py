"""Phase 7a: chatbot conversations, messages, and leads.

Three tables backing the Wealth FlightPlan Assistant:

- ``chatbot_conversations``: top-level conversation per (user, session).
- ``chatbot_messages``: append-only history; one row per turn.
- ``chatbot_leads``: advisor handoff requests; emails routed to
  ``settings.attooh_lead_email``.

``gen_random_uuid()`` requires the ``pgcrypto`` extension, enabled in
migration 0001.

Revision ID: 0006_phase7a_chatbot
Revises: 0005_phase5_business_owner
Create Date: 2026-05-13
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0006_phase7a_chatbot"
down_revision: str | Sequence[str] | None = "0005_phase5_business_owner"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "chatbot_conversations",
        sa.Column(
            "conversation_id",
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
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "last_message_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column(
            "message_count",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'active'"),
        ),
        sa.CheckConstraint(
            "status IN ('active','deleted')",
            name="ck_chatbot_conversations_status",
        ),
    )
    op.create_index(
        "ix_chatbot_conversations_user_id",
        "chatbot_conversations",
        ["user_id"],
    )

    op.create_table(
        "chatbot_messages",
        sa.Column(
            "message_id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "conversation_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "chatbot_conversations.conversation_id", ondelete="CASCADE"
            ),
            nullable=False,
        ),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("tokens_in", sa.Integer(), nullable=True),
        sa.Column("tokens_out", sa.Integer(), nullable=True),
        sa.Column("model", sa.String(64), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        # Column named ``meta`` (not ``metadata``) to avoid SQLAlchemy's
        # reserved ``metadata`` attribute on the declarative Base class.
        # The API exposes this as ``metadata`` in JSON output.
        sa.Column(
            "meta",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.CheckConstraint(
            "role IN ('user','assistant','system')",
            name="ck_chatbot_messages_role",
        ),
    )
    op.create_index(
        "ix_chatbot_messages_conversation_id",
        "chatbot_messages",
        ["conversation_id", "created_at"],
    )

    op.create_table(
        "chatbot_leads",
        sa.Column(
            "lead_id",
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
        sa.Column(
            "conversation_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "chatbot_conversations.conversation_id", ondelete="SET NULL"
            ),
            nullable=True,
        ),
        sa.Column("trigger_event", sa.String(64), nullable=False),
        sa.Column("topic", sa.String(255), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("advisor_email", sa.String(255), nullable=False),
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            server_default=sa.text("'new'"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column("contacted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('new','contacted','qualified','closed')",
            name="ck_chatbot_leads_status",
        ),
        sa.CheckConstraint(
            "trigger_event IN ('worksheet_complete','calculator_complete',"
            "'regulated_question','user_request','step_complete')",
            name="ck_chatbot_leads_trigger_event",
        ),
    )
    op.create_index("ix_chatbot_leads_user_id", "chatbot_leads", ["user_id"])
    op.create_index(
        "ix_chatbot_leads_status_created",
        "chatbot_leads",
        ["status", sa.text("created_at DESC")],
    )


def downgrade() -> None:
    op.drop_index("ix_chatbot_leads_status_created", table_name="chatbot_leads")
    op.drop_index("ix_chatbot_leads_user_id", table_name="chatbot_leads")
    op.drop_table("chatbot_leads")

    op.drop_index(
        "ix_chatbot_messages_conversation_id", table_name="chatbot_messages"
    )
    op.drop_table("chatbot_messages")

    op.drop_index(
        "ix_chatbot_conversations_user_id", table_name="chatbot_conversations"
    )
    op.drop_table("chatbot_conversations")
