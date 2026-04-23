"""SQLAlchemy ORM models for Eventsee."""

from __future__ import annotations

import enum
import uuid
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _utcnow() -> datetime:
    """Return the current instant in UTC for DB defaults."""

    return datetime.now(timezone.utc)


class UserRole(str, enum.Enum):
    """Application roles stored on each user account."""

    client = "client"
    planner = "planner"
    admin = "admin"


class ClientSegment(str, enum.Enum):
    """Intake segment for inquiries and bookings."""

    individual = "individual"
    corporate = "corporate"


class InquiryStatus(str, enum.Enum):
    """Lifecycle state for planner inquiries."""

    open = "open"
    closed = "closed"


class BookingStatus(str, enum.Enum):
    """
    Booking workflow states.

    Flow: pending_planner -> pending_client -> confirmed (or declined/cancelled).
    """

    pending_planner = "pending_planner"
    pending_client = "pending_client"
    confirmed = "confirmed"
    declined = "declined"
    cancelled = "cancelled"


class User(Base):
    """End-user account (clients, planners, and admins)."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role"), nullable=False, default=UserRole.client)
    checklist_progress: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    sessions: Mapped[List["SessionToken"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    planner_profile: Mapped[Optional["PlannerProfile"]] = relationship(back_populates="user", uselist=False)


class SessionToken(Base):
    """Server-side session row referenced by an HTTP-only cookie value."""

    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    user: Mapped[User] = relationship(back_populates="sessions")


class PlannerProfile(Base):
    """Public-facing planner identity and marketplace facets."""

    __tablename__ = "planner_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(160), unique=True, index=True, nullable=False)
    bio: Mapped[str] = mapped_column(Text, default="")
    location_text: Mapped[str] = mapped_column(String(200), default="")
    price_min: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    price_max: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    planning_styles: Mapped[List[str]] = mapped_column(ARRAY(String(64)), default=list)
    event_sizes: Mapped[List[str]] = mapped_column(ARRAY(String(64)), default=list)
    specialties: Mapped[List[str]] = mapped_column(ARRAY(String(64)), default=list)
    aesthetic_tags: Mapped[List[str]] = mapped_column(ARRAY(String(64)), default=list)
    response_time_hours: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    premium_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    timezone: Mapped[str] = mapped_column(String(64), default="UTC")

    user: Mapped[User] = relationship(back_populates="planner_profile")
    portfolio_items: Mapped[List["PortfolioItem"]] = relationship(
        back_populates="planner", cascade="all, delete-orphan"
    )
    availability_blocks: Mapped[List["AvailabilityBlock"]] = relationship(
        back_populates="planner", cascade="all, delete-orphan"
    )


class PortfolioItem(Base):
    """Planner portfolio entry with optional anonymized budget breakdown."""

    __tablename__ = "portfolio_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    planner_profile_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("planner_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    event_type: Mapped[str] = mapped_column(String(120), default="")
    photos: Mapped[List[Any]] = mapped_column(JSONB, default=list)
    budget_breakdown: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict)

    planner: Mapped[PlannerProfile] = relationship(back_populates="portfolio_items")


class AvailabilityBlock(Base):
    """Busy interval on a planner calendar (manual source in MVP)."""

    __tablename__ = "availability_blocks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    planner_profile_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("planner_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    start_ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    all_day: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    source: Mapped[str] = mapped_column(String(32), default="manual")

    planner: Mapped[PlannerProfile] = relationship(back_populates="availability_blocks")


class Favorite(Base):
    """Saved planner for a signed-in client."""

    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint("user_id", "planner_profile_id", name="uq_favorite_user_planner"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    planner_profile_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("planner_profiles.id", ondelete="CASCADE"), nullable=False
    )


class Inquiry(Base):
    """Client inquiry to a planner, optionally threaded into messages and bookings."""

    __tablename__ = "inquiries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    planner_profile_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("planner_profiles.id", ondelete="CASCADE"), nullable=False
    )
    client_segment: Mapped[ClientSegment] = mapped_column(Enum(ClientSegment, name="client_segment"), nullable=False)
    event_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    message: Mapped[str] = mapped_column(Text, default="")
    intake_payload: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict)
    status: Mapped[InquiryStatus] = mapped_column(Enum(InquiryStatus, name="inquiry_status"), default=InquiryStatus.open)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class Message(Base):
    """Message on an inquiry thread (MVP: inquiries only)."""

    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inquiry_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("inquiries.id", ondelete="CASCADE"), nullable=False)
    author_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class Booking(Base):
    """Booking proposal and confirmation workflow between client and planner."""

    __tablename__ = "bookings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inquiry_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("inquiries.id", ondelete="SET NULL"), nullable=True)
    planner_profile_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("planner_profiles.id", ondelete="CASCADE"), nullable=False
    )
    client_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    proposed_terms: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict)
    status: Mapped[BookingStatus] = mapped_column(
        Enum(BookingStatus, name="booking_status"), default=BookingStatus.pending_planner
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)


class Review(Base):
    """Verified review tied to a confirmed booking (client -> planner in MVP)."""

    __tablename__ = "reviews"
    __table_args__ = (UniqueConstraint("booking_id", name="uq_review_booking"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False)
    author_user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    body: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class ResponseSample(Base):
    """Observed first-response latency sample used to compute planner response score."""

    __tablename__ = "response_samples"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    planner_profile_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("planner_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    hours: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
