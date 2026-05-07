"""add event_prefs jsonb column to users

Revision ID: 20260505_0004
Revises: 20260505_0003
Create Date: 2026-05-05
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260505_0004"
down_revision = "20260505_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("event_prefs", postgresql.JSONB(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "event_prefs")
