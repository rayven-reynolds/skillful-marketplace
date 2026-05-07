"""add instagram_url to planner_profiles

Revision ID: 20260505_0002
Revises: 20250422_0001_initial
Create Date: 2026-05-05
"""

from alembic import op
import sqlalchemy as sa

revision = "20260505_0002"
down_revision = "20250422_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "planner_profiles",
        sa.Column("instagram_url", sa.String(200), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("planner_profiles", "instagram_url")
