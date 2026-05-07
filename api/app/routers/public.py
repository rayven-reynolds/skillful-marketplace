"""Public planner discovery and profile pages."""

from __future__ import annotations

import uuid
from datetime import date, datetime, time, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, get_optional_user
from app.models import AvailabilityBlock, Booking, PlannerProfile, PortfolioItem, Review, User, UserRole
from app.schemas import ListingPublic, PlannerPublic, PlannerDetail, PortfolioOut, ReviewIn, ReviewOut

router = APIRouter(prefix="/public", tags=["public"])


def _utc_day_bounds(d: date) -> tuple[datetime, datetime]:
    """Return UTC bounds for calendar date ``d``."""

    start = datetime.combine(d, time.min, tzinfo=timezone.utc)
    from datetime import timedelta

    return start, start + timedelta(days=1)


def _review_stats(db: Session) -> dict[uuid.UUID, tuple[float, int]]:
    """
    Compute average rating and review count per planner profile.

    Args:
        db: Database session.

    Returns:
        dict[uuid.UUID, tuple[float, int]]: Map of planner_profile_id to (avg, count).
    """

    rows = db.execute(
        select(Booking.planner_profile_id, func.avg(Review.rating), func.count(Review.id))
        .join(Review, Review.booking_id == Booking.id)
        .group_by(Booking.planner_profile_id)
    ).all()
    return {r[0]: (float(r[1] or 0), int(r[2] or 0)) for r in rows}


@router.get("/planners", response_model=list[PlannerPublic])
def list_planners(
    db: Annotated[Session, Depends(get_db)],
    location: Optional[str] = None,
    price_min: Optional[int] = None,
    price_max: Optional[int] = None,
    planning_styles: Optional[str] = None,
    event_sizes: Optional[str] = None,
    specialties: Optional[str] = None,
    aesthetic_tags: Optional[str] = None,
    event_date: Optional[date] = None,
    available_only: bool = False,
    limit: int = Query(default=40, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[PlannerPublic]:
    """
    Search planners with optional filters and premium ordering.

    Args:
        db: Database session.
        location: Case-insensitive substring match on ``location_text``.
        price_min: Minimum inclusive budget filter against ``price_max`` column.
        price_max: Maximum inclusive budget filter against ``price_min`` column.
        planning_styles: Comma-separated tags; planner must include all (subset flexible in UI).
        event_sizes: Comma-separated sizes; planner must intersect.
        specialties: Comma-separated specialties; planner must intersect.
        aesthetic_tags: Comma-separated vibe tags; planner must intersect.
        event_date: When ``available_only`` is true, exclude planners busy that UTC day.
        available_only: Enable availability filtering for ``event_date``.
        limit: Page size.
        offset: Page offset.

    Returns:
        list[PlannerPublic]: Matching planners with rating aggregates.
    """

    q = select(PlannerProfile).order_by(PlannerProfile.is_premium.desc(), PlannerProfile.slug)
    if location:
        q = q.where(PlannerProfile.location_text.ilike(f"%{location}%"))
    if price_min is not None:
        q = q.where(PlannerProfile.price_max >= price_min)
    if price_max is not None:
        q = q.where(PlannerProfile.price_min <= price_max)
    styles = [s.strip() for s in (planning_styles or "").split(",") if s.strip()]
    for s in styles:
        q = q.where(PlannerProfile.planning_styles.contains([s]))
    sizes = [s.strip() for s in (event_sizes or "").split(",") if s.strip()]
    if sizes:
        q = q.where(PlannerProfile.event_sizes.overlap(sizes))
    specs = [s.strip() for s in (specialties or "").split(",") if s.strip()]
    if specs:
        q = q.where(PlannerProfile.specialties.overlap(specs))
    vibes = [s.strip() for s in (aesthetic_tags or "").split(",") if s.strip()]
    if vibes:
        q = q.where(PlannerProfile.aesthetic_tags.overlap(vibes))
    if available_only and event_date:
        start, end = _utc_day_bounds(event_date)
        busy = select(AvailabilityBlock.planner_profile_id).where(
            AvailabilityBlock.start_ts < end,
            AvailabilityBlock.end_ts > start,
        )
        q = q.where(~PlannerProfile.id.in_(busy))
    rows = db.execute(
        q.add_columns(User.display_name)
        .join(User, PlannerProfile.user_id == User.id)
        .offset(offset)
        .limit(limit)
    ).all()
    stats = _review_stats(db)
    out: list[PlannerPublic] = []
    for p, display_name in rows:
        avg_r, cnt = stats.get(p.id, (None, 0))
        out.append(
            PlannerPublic(
                id=p.id,
                slug=p.slug,
                display_name=display_name,
                bio=p.bio,
                location_text=p.location_text,
                price_min=p.price_min,
                price_max=p.price_max,
                planning_styles=list(p.planning_styles or []),
                event_sizes=list(p.event_sizes or []),
                specialties=list(p.specialties or []),
                aesthetic_tags=list(p.aesthetic_tags or []),
                response_time_hours=p.response_time_hours,
                is_premium=p.is_premium,
                avg_rating=avg_r,
                review_count=cnt,
                instagram_url=p.instagram_url,
            )
        )
    return out


@router.get("/planners/by-slug/{slug}", response_model=PlannerDetail)
def get_planner_by_slug(slug: str, db: Annotated[Session, Depends(get_db)]) -> PlannerDetail:
    """
    Fetch a single planner profile by public slug.

    Args:
        slug: URL slug for the planner.
        db: Database session.

    Returns:
        PlannerDetail: Planner row with aggregates.

    Raises:
        HTTPException: When the slug does not exist.
    """

    row = db.execute(
        select(PlannerProfile, User.display_name)
        .join(User, PlannerProfile.user_id == User.id)
        .where(PlannerProfile.slug == slug)
    ).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Planner not found")
    p, display_name = row
    stats = _review_stats(db)
    avg_r, cnt = stats.get(p.id, (None, 0))
    return PlannerDetail(
        id=p.id,
        slug=p.slug,
        display_name=display_name,
        bio=p.bio,
        location_text=p.location_text,
        price_min=p.price_min,
        price_max=p.price_max,
        planning_styles=list(p.planning_styles or []),
        event_sizes=list(p.event_sizes or []),
        specialties=list(p.specialties or []),
        aesthetic_tags=list(p.aesthetic_tags or []),
        response_time_hours=p.response_time_hours,
        is_premium=p.is_premium,
        avg_rating=avg_r,
        review_count=cnt,
        timezone=p.timezone,
        instagram_url=p.instagram_url,
    )


@router.get("/planners/by-slug/{slug}/portfolio", response_model=list[PortfolioOut])
def list_portfolio(slug: str, db: Annotated[Session, Depends(get_db)]) -> list[PortfolioOut]:
    """
    List portfolio items for a planner slug.

    Args:
        slug: Planner slug.
        db: Database session.

    Returns:
        list[PortfolioOut]: Portfolio rows ordered by creation time.

    Raises:
        HTTPException: When the slug does not exist.
    """

    p = db.execute(select(PlannerProfile).where(PlannerProfile.slug == slug)).scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Planner not found")
    items = db.execute(select(PortfolioItem).where(PortfolioItem.planner_profile_id == p.id)).scalars().all()
    return [
        PortfolioOut(
            id=i.id,
            title=i.title,
            event_type=i.event_type,
            photos=list(i.photos or []),
            budget_breakdown=dict(i.budget_breakdown or {}),
        )
        for i in items
    ]


@router.get("/planners/by-slug/{slug}/reviews", response_model=list[ReviewOut])
def list_reviews(slug: str, db: Annotated[Session, Depends(get_db)]) -> list[ReviewOut]:
    """List all reviews for a planner — booking-verified and direct."""

    p = db.execute(select(PlannerProfile).where(PlannerProfile.slug == slug)).scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Planner not found")

    # Direct reviews (planner_profile_id set)
    direct = db.execute(
        select(Review)
        .where(Review.planner_profile_id == p.id)
        .order_by(Review.created_at.desc())
    ).scalars().all()

    # Booking-verified reviews
    verified = db.execute(
        select(Review)
        .join(Booking, Booking.id == Review.booking_id)
        .where(Booking.planner_profile_id == p.id)
        .order_by(Review.created_at.desc())
    ).scalars().all()

    # Merge, dedup by id, keep newest first
    seen: set[uuid.UUID] = set()
    merged: list[Review] = []
    for r in [*direct, *verified]:
        if r.id not in seen:
            seen.add(r.id)
            merged.append(r)
    merged.sort(key=lambda r: r.created_at, reverse=True)

    return [
        ReviewOut(
            id=r.id,
            rating=r.rating,
            body=r.body,
            created_at=r.created_at,
            verified=r.booking_id is not None,
            reviewer_display_name=r.author.display_name if r.author else None,
        )
        for r in merged
    ]


@router.post("/planners/by-slug/{slug}/reviews", status_code=status.HTTP_201_CREATED)
def create_review(
    slug: str,
    payload: ReviewIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """Submit a direct review for a planner. One review per client per planner."""

    if user.role == UserRole.planner:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only clients can leave reviews")

    p = db.execute(select(PlannerProfile).where(PlannerProfile.slug == slug)).scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Planner not found")

    existing = db.execute(
        select(Review).where(Review.planner_profile_id == p.id, Review.author_user_id == user.id)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You have already reviewed this planner")

    row = Review(
        planner_profile_id=p.id,
        author_user_id=user.id,
        rating=payload.rating,
        body=payload.body,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": str(row.id)}


def _to_listing_public(
    item: PortfolioItem, profile: PlannerProfile, owner: User, current: Optional[User]
) -> ListingPublic:
    """
    Project a portfolio item + its owning planner into a ``ListingPublic``.

    ``is_owner`` reflects whether the request session belongs to the planner
    that owns the item. The edit endpoint re-checks ownership server-side, so
    this flag is purely a UI hint.
    """

    return ListingPublic(
        id=item.id,
        title=item.title,
        event_type=item.event_type,
        photos=list(item.photos or []),
        budget_breakdown=dict(item.budget_breakdown or {}),
        planner_profile_id=profile.id,
        planner_slug=profile.slug,
        planner_display_name=owner.display_name,
        is_owner=current is not None and current.id == owner.id,
    )


@router.get("/listings", response_model=list[ListingPublic])
def list_all_listings(
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[Optional[User], Depends(get_optional_user)],
) -> list[ListingPublic]:
    """
    Public catalog of every portfolio item with owner attribution.

    Anyone (signed-in or not) can read this. The ``is_owner`` flag in the
    response is ``True`` only for items belonging to the planner whose session
    is attached to the request, which lets the UI render an Edit button only
    on the caller's own rows.
    """

    rows = db.execute(
        select(PortfolioItem, PlannerProfile, User)
        .join(PlannerProfile, PortfolioItem.planner_profile_id == PlannerProfile.id)
        .join(User, PlannerProfile.user_id == User.id)
        .order_by(PortfolioItem.title)
    ).all()
    return [_to_listing_public(item, profile, owner, current) for item, profile, owner in rows]


@router.get("/listings/{item_id}", response_model=ListingPublic, responses={404: {"description": "Listing not found."}})
def get_listing(
    item_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    current: Annotated[Optional[User], Depends(get_optional_user)],
) -> ListingPublic:
    """Fetch a single listing for the edit page (auth optional)."""

    item = db.get(PortfolioItem, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    profile = db.get(PlannerProfile, item.planner_profile_id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    owner = db.get(User, profile.user_id)
    if owner is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    return _to_listing_public(item, profile, owner, current)


@router.get("/planners/by-slug/{slug}/availability", response_model=list[dict])
def list_availability(slug: str, db: Annotated[Session, Depends(get_db)]) -> list[dict]:
    """
    Return busy blocks for a planner within a month window (MVP: all blocks).

    Args:
        slug: Planner slug.
        db: Database session.

    Returns:
        list[dict]: Serialized availability blocks.
    """

    p = db.execute(select(PlannerProfile).where(PlannerProfile.slug == slug)).scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Planner not found")
    blocks = db.execute(
        select(AvailabilityBlock).where(AvailabilityBlock.planner_profile_id == p.id)
    ).scalars().all()
    return [
        {"id": str(b.id), "start_ts": b.start_ts.isoformat(), "end_ts": b.end_ts.isoformat(), "all_day": b.all_day}
        for b in blocks
    ]
