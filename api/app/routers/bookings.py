"""Booking lifecycle between clients and planners."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_roles
from app.models import Booking, BookingStatus, Inquiry, PlannerProfile, User, UserRole
from app.schemas import BookingCreate, BookingTransition

router = APIRouter(prefix="/bookings", tags=["bookings"])


def _get_booking(db: Session, booking_id: uuid.UUID) -> Booking:
    """
    Load a booking or raise 404.

    Args:
        db: Database session.
        booking_id: Booking id.

    Returns:
        Booking: Row.

    Raises:
        HTTPException: When missing.
    """

    row = db.get(Booking, booking_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    return row


@router.post("", status_code=status.HTTP_201_CREATED)
def create_booking(
    body: BookingCreate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.client, UserRole.admin))],
) -> dict[str, str]:
    """
    Create a booking in ``pending_planner`` awaiting planner acceptance.

    Args:
        body: Booking fields.
        db: Database session.
        user: Authenticated client.

    Returns:
        dict[str, str]: Created booking id.

    Raises:
        HTTPException: When planner missing or inquiry ownership invalid.
    """

    planner = db.get(PlannerProfile, body.planner_profile_id)
    if planner is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Planner not found")
    if body.inquiry_id is not None:
        inv = db.get(Inquiry, body.inquiry_id)
        if inv is None or inv.client_user_id != user.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid inquiry")
        if inv.planner_profile_id != body.planner_profile_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inquiry planner mismatch")
    row = Booking(
        inquiry_id=body.inquiry_id,
        planner_profile_id=body.planner_profile_id,
        client_user_id=user.id,
        proposed_terms=body.proposed_terms,
        status=BookingStatus.pending_planner,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": str(row.id)}


@router.get("/mine")
def list_client_bookings(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.client, UserRole.admin))],
) -> list[dict]:
    """
    List bookings where the authenticated user is the client.

    Args:
        db: Database session.
        user: Authenticated client.

    Returns:
        list[dict]: Booking summaries.
    """

    rows = db.execute(select(Booking).where(Booking.client_user_id == user.id)).scalars().all()
    return [
        {
            "id": str(b.id),
            "planner_profile_id": str(b.planner_profile_id),
            "status": b.status.value,
            "created_at": b.created_at.isoformat(),
        }
        for b in rows
    ]


@router.get("/planner")
def list_planner_bookings(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.planner))],
) -> list[dict]:
    """
    List bookings for the authenticated planner's profile.

    Args:
        db: Database session.
        user: Authenticated planner.

    Returns:
        list[dict]: Booking summaries.

    Raises:
        HTTPException: When planner profile is missing.
    """

    profile = db.execute(select(PlannerProfile).where(PlannerProfile.user_id == user.id)).scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Planner profile missing")
    rows = db.execute(select(Booking).where(Booking.planner_profile_id == profile.id)).scalars().all()
    return [
        {
            "id": str(b.id),
            "client_user_id": str(b.client_user_id),
            "status": b.status.value,
            "created_at": b.created_at.isoformat(),
        }
        for b in rows
    ]


@router.post("/{booking_id}/transition")
def transition_booking(
    booking_id: uuid.UUID,
    body: BookingTransition,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict[str, str]:
    """
    Apply a guarded booking workflow transition.

    Args:
        booking_id: Booking id.
        body: Transition action label.
        db: Database session.
        user: Authenticated actor.

    Returns:
        dict[str, str]: New status value.

    Raises:
        HTTPException: When the transition is illegal for the actor or state.
    """

    b = _get_booking(db, booking_id)
    planner = db.get(PlannerProfile, b.planner_profile_id)
    if planner is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Planner missing")
    is_planner = planner.user_id == user.id
    is_client = b.client_user_id == user.id
    if body.action == "planner_accept":
        if not is_planner and user.role != UserRole.admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Planner only")
        if b.status != BookingStatus.pending_planner:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Invalid state")
        b.status = BookingStatus.pending_client
    elif body.action == "client_confirm":
        if not is_client and user.role != UserRole.admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Client only")
        if b.status != BookingStatus.pending_client:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Invalid state")
        b.status = BookingStatus.confirmed
    elif body.action == "decline":
        if not (is_planner or is_client) and user.role != UserRole.admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Participant only")
        if b.status in (BookingStatus.confirmed, BookingStatus.declined, BookingStatus.cancelled):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Invalid state")
        b.status = BookingStatus.declined
    elif body.action == "cancel":
        if not (is_planner or is_client) and user.role != UserRole.admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Participant only")
        if b.status == BookingStatus.confirmed:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cannot cancel confirmed")
        b.status = BookingStatus.cancelled
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown action")
    db.add(b)
    db.commit()
    return {"status": b.status.value}

