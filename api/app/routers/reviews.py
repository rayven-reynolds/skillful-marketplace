"""Verified reviews (confirmed bookings only)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_roles
from app.models import Booking, BookingStatus, Review, User, UserRole
from app.schemas import ReviewCreate, ReviewOut

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.post("", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
def create_review(
    body: ReviewCreate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.client, UserRole.admin))],
) -> ReviewOut:
    """
    Create a verified review for a confirmed booking (client author only).

    Args:
        body: Review payload.
        db: Database session.
        user: Authenticated client.

    Returns:
        ReviewOut: Created review.

    Raises:
        HTTPException: When booking is not confirmed, wrong actor, or duplicate review.
    """

    booking = db.get(Booking, body.booking_id)
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if booking.status != BookingStatus.confirmed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Booking must be confirmed")
    if booking.client_user_id != user.id and user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Client only")
    exists = db.execute(select(Review.id).where(Review.booking_id == body.booking_id)).first()
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Review already exists")
    row = Review(booking_id=body.booking_id, author_user_id=user.id, rating=body.rating, body=body.body)
    db.add(row)
    db.commit()
    db.refresh(row)
    return ReviewOut(id=row.id, rating=row.rating, body=row.body, created_at=row.created_at, verified=True)

