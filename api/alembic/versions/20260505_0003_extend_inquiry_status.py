"""extend inquiry_status enum with responded, booked, canceled

Revision ID: 20260505_0003
Revises: 20260505_0002
Create Date: 2026-05-05
"""

from alembic import op

revision = "20260505_0003"
down_revision = "20260505_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE inquiry_status ADD VALUE IF NOT EXISTS 'responded'")
    op.execute("ALTER TYPE inquiry_status ADD VALUE IF NOT EXISTS 'booked'")
    op.execute("ALTER TYPE inquiry_status ADD VALUE IF NOT EXISTS 'canceled'")


def downgrade() -> None:
    # Postgres does not support removing enum values; downgrade is a no-op
    pass
