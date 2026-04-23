"""Pydantic schemas for request and response bodies."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field

from app.models import BookingStatus, ClientSegment, UserRole


class UserOut(BaseModel):
    """Public user fields returned to the client."""

    id: uuid.UUID
    email: EmailStr
    display_name: Optional[str]
    role: UserRole


class RegisterIn(BaseModel):
    """Registration payload."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: Optional[str] = Field(default=None, max_length=120)
    role: UserRole = UserRole.client


class LoginIn(BaseModel):
    """Login payload."""

    email: EmailStr
    password: str


class PlannerPublic(BaseModel):
    """Planner card for search results."""

    id: uuid.UUID
    slug: str
    bio: str
    location_text: str
    price_min: int
    price_max: int
    planning_styles: List[str]
    event_sizes: List[str]
    specialties: List[str]
    aesthetic_tags: List[str]
    response_time_hours: Optional[float]
    is_premium: bool
    avg_rating: Optional[float] = None
    review_count: int = 0


class PlannerDetail(PlannerPublic):
    """Planner profile detail including nested lists."""

    timezone: str


class PortfolioOut(BaseModel):
    """Portfolio item returned publicly."""

    id: uuid.UUID
    title: str
    event_type: str
    photos: List[Any]
    budget_breakdown: Dict[str, Any]


class AvailabilityBlockOut(BaseModel):
    """Busy block returned to calendar UI."""

    id: uuid.UUID
    start_ts: datetime
    end_ts: datetime
    all_day: bool


class PlannerUpsert(BaseModel):
    """Create/update planner profile for the authenticated planner."""

    slug: str = Field(min_length=3, max_length=160)
    bio: str = ""
    location_text: str = ""
    price_min: int = Field(ge=0)
    price_max: int = Field(ge=0)
    planning_styles: List[str] = Field(default_factory=list)
    event_sizes: List[str] = Field(default_factory=list)
    specialties: List[str] = Field(default_factory=list)
    aesthetic_tags: List[str] = Field(default_factory=list)
    timezone: str = "UTC"


class PortfolioIn(BaseModel):
    """Create/update portfolio item."""

    title: str
    event_type: str = ""
    photos: List[Any] = Field(default_factory=list)
    budget_breakdown: Dict[str, Any] = Field(default_factory=dict)


class AvailabilityIn(BaseModel):
    """Create a busy block."""

    start_ts: datetime
    end_ts: datetime
    all_day: bool = True


class InquiryCreate(BaseModel):
    """Create inquiry with dual-intake validation in the router."""

    planner_profile_id: uuid.UUID
    client_segment: ClientSegment
    event_date: Optional[date] = None
    message: str = ""
    intake_payload: Dict[str, Any] = Field(default_factory=dict)


class MessageIn(BaseModel):
    """Post a message on an inquiry thread."""

    body: str = Field(min_length=1, max_length=8000)


class BookingCreate(BaseModel):
    """Client creates a booking awaiting planner confirmation."""

    inquiry_id: Optional[uuid.UUID] = None
    planner_profile_id: uuid.UUID
    proposed_terms: Dict[str, Any] = Field(default_factory=dict)


class BookingTransition(BaseModel):
    """Mutate booking status along the allowed workflow."""

    action: str = Field(pattern="^(planner_accept|client_confirm|decline|cancel)$")


class ReviewCreate(BaseModel):
    """Create a verified review for a confirmed booking."""

    booking_id: uuid.UUID
    rating: int = Field(ge=1, le=5)
    body: str = ""


class ReviewOut(BaseModel):
    """Public review row."""

    id: uuid.UUID
    rating: int
    body: str
    created_at: datetime
    verified: bool = True


class QuizMatchIn(BaseModel):
    """Fit quiz answers used for ranking."""

    answers: Dict[str, Any]
    event_date: Optional[date] = None


class QuizMatchOut(BaseModel):
    """Top planner matches for a quiz submission."""

    matches: List[Dict[str, Any]]


class PremiumPatch(BaseModel):
    """Admin-only premium flag patch."""

    is_premium: bool
    premium_expires_at: Optional[datetime] = None


class ChecklistProgress(BaseModel):
    """Opaque checklist state stored per user."""

    progress: Dict[str, Any]
