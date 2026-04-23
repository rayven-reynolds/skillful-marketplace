"""Authenticated planner profile, portfolio, and availability management."""

from __future__ import annotations

import uuid
from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status
from starlette.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_roles
from app.models import AvailabilityBlock, PlannerProfile, PortfolioItem, User, UserRole
from app.schemas import AvailabilityBlockOut, AvailabilityIn, PlannerUpsert, PortfolioIn, PortfolioOut

router = APIRouter(prefix="/planner", tags=["planner"])


def _profile_for_user(db: Session, user: User) -> PlannerProfile:
    """
    Load the planner profile owned by the given user.

    Args:
        db: Database session.
        user: Authenticated planner user.

    Returns:
        PlannerProfile: Owned profile row.

    Raises:
        HTTPException: When the profile does not exist yet.
    """

    p = db.execute(select(PlannerProfile).where(PlannerProfile.user_id == user.id)).scalar_one_or_none()
    if p is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Planner profile not created yet")
    return p


@router.post("/profile", status_code=status.HTTP_201_CREATED)
def create_profile(
    payload: PlannerUpsert,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.planner))],
) -> dict[str, str]:
    """
    Create the planner profile for the authenticated planner user (one per user).

    Args:
        payload: Profile fields from the client.
        db: Database session.
        user: Authenticated planner.

    Returns:
        dict[str, str]: Created slug acknowledgement.

    Raises:
        HTTPException: When a profile already exists or slug collides.
    """

    exists = db.execute(select(PlannerProfile).where(PlannerProfile.user_id == user.id)).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Profile already exists")
    slug_taken = db.execute(select(PlannerProfile.id).where(PlannerProfile.slug == payload.slug)).first()
    if slug_taken:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug already taken")
    p = PlannerProfile(
        user_id=user.id,
        slug=payload.slug,
        bio=payload.bio,
        location_text=payload.location_text,
        price_min=payload.price_min,
        price_max=payload.price_max,
        planning_styles=payload.planning_styles,
        event_sizes=payload.event_sizes,
        specialties=payload.specialties,
        aesthetic_tags=payload.aesthetic_tags,
        timezone=payload.timezone,
    )
    db.add(p)
    db.commit()
    return {"slug": p.slug}


@router.get("/profile/me")
def get_my_profile(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.planner))],
) -> dict:
    """
    Return the authenticated planner's profile row as JSON.

    Args:
        db: Database session.
        user: Authenticated planner.

    Returns:
        dict: Planner profile fields.
    """

    p = _profile_for_user(db, user)
    return {
        "id": str(p.id),
        "slug": p.slug,
        "bio": p.bio,
        "location_text": p.location_text,
        "price_min": p.price_min,
        "price_max": p.price_max,
        "planning_styles": list(p.planning_styles or []),
        "event_sizes": list(p.event_sizes or []),
        "specialties": list(p.specialties or []),
        "aesthetic_tags": list(p.aesthetic_tags or []),
        "response_time_hours": p.response_time_hours,
        "is_premium": p.is_premium,
        "premium_expires_at": p.premium_expires_at.isoformat() if p.premium_expires_at else None,
        "timezone": p.timezone,
    }


@router.patch("/profile/me")
def update_my_profile(
    payload: PlannerUpsert,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.planner))],
) -> dict[str, str]:
    """
    Update mutable planner profile fields.

    Args:
        payload: Replacement fields.
        db: Database session.
        user: Authenticated planner.

    Returns:
        dict[str, str]: Acknowledgement.

    Raises:
        HTTPException: When slug collides with another planner.
    """

    p = _profile_for_user(db, user)
    if payload.slug != p.slug:
        taken = db.execute(select(PlannerProfile.id).where(PlannerProfile.slug == payload.slug)).first()
        if taken:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug already taken")
    p.slug = payload.slug
    p.bio = payload.bio
    p.location_text = payload.location_text
    p.price_min = payload.price_min
    p.price_max = payload.price_max
    p.planning_styles = payload.planning_styles
    p.event_sizes = payload.event_sizes
    p.specialties = payload.specialties
    p.aesthetic_tags = payload.aesthetic_tags
    p.timezone = payload.timezone
    db.add(p)
    db.commit()
    return {"status": "ok"}


@router.get("/portfolio/me", response_model=List[PortfolioOut])
def list_my_portfolio(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.planner))],
) -> List[PortfolioOut]:
    """
    List portfolio items for the authenticated planner.

    Args:
        db: Database session.
        user: Authenticated planner.

    Returns:
        List[PortfolioOut]: Portfolio rows.
    """

    p = _profile_for_user(db, user)
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


@router.post("/portfolio/me", response_model=PortfolioOut)
def add_portfolio_item(
    payload: PortfolioIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.planner))],
) -> PortfolioOut:
    """
    Add a portfolio item with optional anonymized budget breakdown JSON.

    Args:
        payload: Portfolio fields.
        db: Database session.
        user: Authenticated planner.

    Returns:
        PortfolioOut: Created portfolio row.
    """

    p = _profile_for_user(db, user)
    item = PortfolioItem(
        planner_profile_id=p.id,
        title=payload.title,
        event_type=payload.event_type,
        photos=payload.photos,
        budget_breakdown=payload.budget_breakdown,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return PortfolioOut(
        id=item.id,
        title=item.title,
        event_type=item.event_type,
        photos=list(item.photos or []),
        budget_breakdown=dict(item.budget_breakdown or {}),
    )


@router.delete("/portfolio/me/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_portfolio_item(
    item_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.planner))],
) -> Response:
    """
    Delete a portfolio item owned by the authenticated planner.

    Args:
        item_id: Portfolio item id.
        db: Database session.
        user: Authenticated planner.

    Raises:
        HTTPException: When the item is missing or not owned.
    """

    p = _profile_for_user(db, user)
    item = db.get(PortfolioItem, item_id)
    if item is None or item.planner_profile_id != p.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    db.delete(item)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/availability/me", response_model=List[AvailabilityBlockOut])
def list_my_availability(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.planner))],
) -> List[AvailabilityBlockOut]:
    """
    List busy blocks for the authenticated planner.

    Args:
        db: Database session.
        user: Authenticated planner.

    Returns:
        List[AvailabilityBlockOut]: Busy intervals.
    """

    p = _profile_for_user(db, user)
    blocks = db.execute(
        select(AvailabilityBlock).where(AvailabilityBlock.planner_profile_id == p.id)
    ).scalars().all()
    return [
        AvailabilityBlockOut(id=b.id, start_ts=b.start_ts, end_ts=b.end_ts, all_day=b.all_day) for b in blocks
    ]


@router.post("/availability/me", response_model=AvailabilityBlockOut)
def add_availability_block(
    payload: AvailabilityIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.planner))],
) -> AvailabilityBlockOut:
    """
    Add a manual busy block to the planner calendar.

    Args:
        payload: Block bounds.
        db: Database session.
        user: Authenticated planner.

    Returns:
        AvailabilityBlockOut: Created block.
    """

    p = _profile_for_user(db, user)
    if payload.end_ts <= payload.start_ts:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="end_ts must be after start_ts")
    b = AvailabilityBlock(
        planner_profile_id=p.id,
        start_ts=payload.start_ts,
        end_ts=payload.end_ts,
        all_day=payload.all_day,
    )
    db.add(b)
    db.commit()
    db.refresh(b)
    return AvailabilityBlockOut(id=b.id, start_ts=b.start_ts, end_ts=b.end_ts, all_day=b.all_day)


@router.delete("/availability/me/{block_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_availability_block(
    block_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.planner))],
) -> Response:
    """
    Delete a busy block owned by the authenticated planner.

    Args:
        block_id: Block id.
        db: Database session.
        user: Authenticated planner.

    Raises:
        HTTPException: When missing or not owned.
    """

    p = _profile_for_user(db, user)
    b = db.get(AvailabilityBlock, block_id)
    if b is None or b.planner_profile_id != p.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    db.delete(b)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
