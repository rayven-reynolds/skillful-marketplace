"""allow direct client reviews without requiring a booking

Revision ID: 20260505_0005
Revises: 20260505_0004
Create Date: 2026-05-05
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260505_0005"
down_revision = "20260505_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Allow booking_id to be null (direct reviews without a booking)
    op.alter_column("reviews", "booking_id", nullable=True)

    # Add planner_profile_id so direct reviews can be tied to a planner
    op.add_column(
        "reviews",
        sa.Column(
            "planner_profile_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("planner_profiles.id", ondelete="CASCADE"),
            nullable=True,
        ),
    )

    # One review per author per planner (prevents duplicate reviews)
    op.create_unique_constraint(
        "uq_review_author_planner",
        "reviews",
        ["planner_profile_id", "author_user_id"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_review_author_planner", "reviews", type_="unique")
    op.drop_column("reviews", "planner_profile_id")
    op.alter_column("reviews", "booking_id", nullable=False)
