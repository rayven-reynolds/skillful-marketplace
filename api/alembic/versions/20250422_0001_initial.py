"""Initial Eventsee schema."""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20250422_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create enums and tables for the MVP schema."""

    bind = op.get_bind()
    user_role = postgresql.ENUM("client", "planner", "admin", name="user_role", create_type=False)
    client_segment = postgresql.ENUM("individual", "corporate", name="client_segment", create_type=False)
    inquiry_status = postgresql.ENUM("open", "closed", name="inquiry_status", create_type=False)
    booking_status = postgresql.ENUM(
        "pending_planner",
        "pending_client",
        "confirmed",
        "declined",
        "cancelled",
        name="booking_status",
        create_type=False,
    )
    user_role.create(bind, checkfirst=True)
    client_segment.create(bind, checkfirst=True)
    inquiry_status.create(bind, checkfirst=True)
    booking_status.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("display_name", sa.String(length=120), nullable=True),
        sa.Column("role", user_role, nullable=False),
        sa.Column("checklist_progress", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "planner_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("slug", sa.String(length=160), nullable=False),
        sa.Column("bio", sa.Text(), nullable=False, server_default=""),
        sa.Column("location_text", sa.String(length=200), nullable=False, server_default=""),
        sa.Column("price_min", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("price_max", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("planning_styles", postgresql.ARRAY(sa.String(length=64)), nullable=False, server_default="{}"),
        sa.Column("event_sizes", postgresql.ARRAY(sa.String(length=64)), nullable=False, server_default="{}"),
        sa.Column("specialties", postgresql.ARRAY(sa.String(length=64)), nullable=False, server_default="{}"),
        sa.Column("aesthetic_tags", postgresql.ARRAY(sa.String(length=64)), nullable=False, server_default="{}"),
        sa.Column("response_time_hours", sa.Float(), nullable=True),
        sa.Column("is_premium", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("premium_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("timezone", sa.String(length=64), nullable=False, server_default="UTC"),
    )
    op.create_index("ix_planner_profiles_slug", "planner_profiles", ["slug"], unique=True)
    op.create_index("ix_planner_profiles_user_id", "planner_profiles", ["user_id"], unique=True)

    op.create_table(
        "portfolio_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "planner_profile_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("planner_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("event_type", sa.String(length=120), nullable=False, server_default=""),
        sa.Column("photos", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column(
            "budget_breakdown",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )
    op.create_index("ix_portfolio_items_planner_profile_id", "portfolio_items", ["planner_profile_id"])

    op.create_table(
        "availability_blocks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "planner_profile_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("planner_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("start_ts", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_ts", sa.DateTime(timezone=True), nullable=False),
        sa.Column("all_day", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("source", sa.String(length=32), nullable=False, server_default="manual"),
    )
    op.create_index("ix_availability_blocks_planner_profile_id", "availability_blocks", ["planner_profile_id"])

    op.create_table(
        "favorites",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "planner_profile_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("planner_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.UniqueConstraint("user_id", "planner_profile_id", name="uq_favorite_user_planner"),
    )

    op.create_table(
        "inquiries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("client_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "planner_profile_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("planner_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("client_segment", client_segment, nullable=False),
        sa.Column("event_date", sa.Date(), nullable=True),
        sa.Column("message", sa.Text(), nullable=False, server_default=""),
        sa.Column("intake_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("status", inquiry_status, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("inquiry_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("inquiries.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "bookings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("inquiry_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("inquiries.id", ondelete="SET NULL"), nullable=True),
        sa.Column(
            "planner_profile_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("planner_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("client_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("proposed_terms", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("status", booking_status, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "reviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("booking_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("booking_id", name="uq_review_booking"),
    )

    op.create_table(
        "response_samples",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "planner_profile_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("planner_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("hours", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_response_samples_planner_profile_id", "response_samples", ["planner_profile_id"])


def downgrade() -> None:
    """Drop all MVP tables and enum types."""

    op.drop_index("ix_response_samples_planner_profile_id", table_name="response_samples")
    op.drop_table("response_samples")
    op.drop_table("reviews")
    op.drop_table("bookings")
    op.drop_table("messages")
    op.drop_table("inquiries")
    op.drop_table("favorites")
    op.drop_index("ix_availability_blocks_planner_profile_id", table_name="availability_blocks")
    op.drop_table("availability_blocks")
    op.drop_index("ix_portfolio_items_planner_profile_id", table_name="portfolio_items")
    op.drop_table("portfolio_items")
    op.drop_index("ix_planner_profiles_user_id", table_name="planner_profiles")
    op.drop_index("ix_planner_profiles_slug", table_name="planner_profiles")
    op.drop_table("planner_profiles")
    op.drop_table("sessions")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

    op.execute("DROP TYPE IF EXISTS booking_status CASCADE")
    op.execute("DROP TYPE IF EXISTS inquiry_status CASCADE")
    op.execute("DROP TYPE IF EXISTS client_segment CASCADE")
    op.execute("DROP TYPE IF EXISTS user_role CASCADE")
