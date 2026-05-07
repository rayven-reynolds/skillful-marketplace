"""Pydantic schemas for request and response bodies."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import BookingStatus, ClientSegment, UserRole


class UserOut(BaseModel):
    """Public user fields returned to the client."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    display_name: Optional[str]
    role: UserRole
    event_prefs: Optional[Dict[str, Any]] = None


class ProfileUpdate(BaseModel):
    """Payload for updating the current user's display name."""

    first_name: str = Field(min_length=1, max_length=60)
    last_name: Optional[str] = Field(default=None, max_length=60)


class EventPrefsIn(BaseModel):
    """Client event preferences stored on their profile."""

    phone: Optional[str] = Field(default=None, max_length=30)
    event_date: Optional[str] = Field(default=None)   # ISO date string e.g. "2026-09-20"
    event_type: Optional[str] = Field(default=None, max_length=80)
    guest_count: Optional[str] = Field(default=None, max_length=40)


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
    display_name: Optional[str] = None
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
    instagram_url: Optional[str] = None


class PlannerDetail(PlannerPublic):
    """Planner profile detail including nested lists."""

    timezone: str


class BecomePlannerIn(BaseModel):
    """Payload for the 'become a planner' self-service registration flow."""

    business_name: str = Field(min_length=2, max_length=120)
    location_text: str = Field(min_length=2, max_length=200)
    bio: str = ""
    price_min: int = Field(ge=0, default=0)
    price_max: int = Field(ge=0, default=0)
    specialties: List[str] = Field(default_factory=list)
    planning_styles: List[str] = Field(default_factory=list)
    event_sizes: List[str] = Field(default_factory=list)
    aesthetic_tags: List[str] = Field(default_factory=list)
    timezone: str = "UTC"
    instagram_url: Optional[str] = None
    cover_photos: List[str] = Field(default_factory=list)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "business_name": "Studio Bloom Events",
                "location_text": "Austin, TX",
                "bio": "Boutique full-service wedding planner with 8 years of experience.",
                "price_min": 3000,
                "price_max": 12000,
                "specialties": ["wedding", "micro_wedding"],
                "planning_styles": ["full_service", "month_of"],
                "event_sizes": ["under_50", "50_150"],
                "aesthetic_tags": ["garden_romantic", "modern_minimal"],
                "timezone": "America/Chicago",
            }
        }
    )


class PortfolioOut(BaseModel):
    """Portfolio item returned publicly."""

    id: uuid.UUID
    title: str
    event_type: str
    photos: List[Any]
    budget_breakdown: Dict[str, Any]


class ListingPublic(BaseModel):
    """
    Portfolio item augmented with owner attribution + an ``is_owner`` flag.

    ``is_owner`` is computed server-side from the request session cookie so the
    UI can simply render an Edit button when ``is_owner`` is true. It's
    advisory only — the actual edit endpoint independently re-verifies
    ownership and returns 403 if the caller is not the owner.
    """

    id: uuid.UUID
    title: str
    event_type: str
    photos: List[Any]
    budget_breakdown: Dict[str, Any]
    planner_profile_id: uuid.UUID
    planner_slug: str
    planner_display_name: Optional[str] = None
    is_owner: bool = False


class ListingEdit(BaseModel):
    """Editable subset of a listing/portfolio item used by the edit form."""

    title: str = Field(min_length=1, max_length=200)
    event_type: str = ""


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
    instagram_url: Optional[str] = None


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
    reviewer_display_name: Optional[str] = None


class ReviewIn(BaseModel):
    """Payload for submitting a direct client review."""

    rating: int = Field(ge=1, le=5)
    body: str = Field(default="", max_length=2000)


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
