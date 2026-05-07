"""Client inquiries, dual intake validation, and threaded messages."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_user, require_roles
from app.models import ClientSegment, Inquiry, InquiryStatus, Message, PlannerProfile, User, UserRole
from app.schemas import InquiryCreate, MessageIn
from app.services.response_time import record_planner_first_response_if_needed


class StatusUpdate(BaseModel):
    status: InquiryStatus


router = APIRouter(prefix="/inquiries", tags=["inquiries"])


def _validate_intake(segment: ClientSegment, payload: dict) -> None:
    """
    Validate segment-specific required intake fields.

    Args:
        segment: Corporate or individual flow.
        payload: Arbitrary intake JSON from the client.

    Raises:
        HTTPException: When required keys are missing.
    """

    if segment == ClientSegment.corporate:
        if not payload.get("company_name"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="company_name is required")
        if not payload.get("event_type"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="event_type is required")
    else:
        if not payload.get("event_kind"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="event_kind is required")


@router.post("", status_code=status.HTTP_201_CREATED)
def create_inquiry(
    body: InquiryCreate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.client, UserRole.admin))],
) -> dict[str, str]:
    """
    Create an inquiry to a planner with validated intake payload.

    Args:
        body: Inquiry fields from the client.
        db: Database session.
        user: Authenticated client.

    Returns:
        dict[str, str]: Created inquiry id.

    Raises:
        HTTPException: When the planner is missing or validation fails.
    """

    planner = db.get(PlannerProfile, body.planner_profile_id)
    if planner is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Planner not found")
    _validate_intake(body.client_segment, body.intake_payload)
    row = Inquiry(
        client_user_id=user.id,
        planner_profile_id=body.planner_profile_id,
        client_segment=body.client_segment,
        event_date=body.event_date,
        message=body.message,
        intake_payload=body.intake_payload,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": str(row.id)}


@router.get("/mine")
def list_my_inquiries(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.client, UserRole.admin))],
) -> list[dict]:
    """
    List inquiries created by the authenticated client, including whether
    the planner has posted at least one reply message.

    Args:
        db: Database session.
        user: Authenticated client.

    Returns:
        list[dict]: Inquiry summaries with has_planner_reply flag.
    """

    rows = db.execute(
        select(Inquiry).where(Inquiry.client_user_id == user.id).order_by(Inquiry.created_at.desc())
    ).scalars().all()

    if not rows:
        return []

    # Single query: fetch all messages for the client's inquiries
    inquiry_ids = [r.id for r in rows]
    messages = db.execute(
        select(Message).where(Message.inquiry_id.in_(inquiry_ids))
    ).scalars().all()

    # Build a set of inquiry_ids where a non-client message exists
    planner_replied: set[uuid.UUID] = {
        m.inquiry_id for m in messages if m.author_user_id != user.id
    }

    return [
        {
            "id": str(r.id),
            "planner_profile_id": str(r.planner_profile_id),
            "client_segment": r.client_segment.value,
            "event_date": r.event_date.isoformat() if r.event_date else None,
            "message": r.message,
            "status": r.status.value,
            "created_at": r.created_at.isoformat(),
            "has_planner_reply": r.id in planner_replied,
        }
        for r in rows
    ]


@router.get("/inbox/planner")
def planner_inbox(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.planner))],
) -> list[dict]:
    """
    List inquiries addressed to the authenticated planner.

    Args:
        db: Database session.
        user: Authenticated planner.

    Returns:
        list[dict]: Inquiry summaries for inbox rendering.

    Raises:
        HTTPException: When the planner profile is missing.
    """

    profile = db.execute(select(PlannerProfile).where(PlannerProfile.user_id == user.id)).scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Planner profile missing")
    rows = db.execute(
        select(Inquiry)
        .options(joinedload(Inquiry.client_user))
        .where(Inquiry.planner_profile_id == profile.id)
        .order_by(Inquiry.created_at.desc())
    ).scalars().all()
    return [
        {
            "id": str(r.id),
            "client_user_id": str(r.client_user_id),
            "client_display_name": r.client_user.display_name if r.client_user else None,
            "client_segment": r.client_segment.value,
            "event_date": r.event_date.isoformat() if r.event_date else None,
            "message": r.message,
            "status": r.status.value,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]


def _inquiry_participant(db: Session, inquiry_id: uuid.UUID, user: User) -> Inquiry:
    """
    Ensure the user is either the client or owning planner for the inquiry.

    Args:
        db: Database session.
        inquiry_id: Inquiry id.
        user: Authenticated user.

    Returns:
        Inquiry: Authorized inquiry row.

    Raises:
        HTTPException: When missing or forbidden.
    """

    row = db.get(Inquiry, inquiry_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inquiry not found")
    planner = db.get(PlannerProfile, row.planner_profile_id)
    if planner is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Planner missing")
    if row.client_user_id != user.id and planner.user_id != user.id and user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return row


@router.get("/{inquiry_id}/messages")
def list_messages(
    inquiry_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> list[dict]:
    """
    List messages on an inquiry thread (participants only).

    Args:
        inquiry_id: Inquiry id.
        db: Database session.
        user: Authenticated participant.

    Returns:
        list[dict]: Message rows ordered oldest first.
    """

    _inquiry_participant(db, inquiry_id, user)
    rows = db.execute(
        select(Message).where(Message.inquiry_id == inquiry_id).order_by(Message.created_at.asc())
    ).scalars().all()
    return [
        {
            "id": str(m.id),
            "author_user_id": str(m.author_user_id),
            "body": m.body,
            "created_at": m.created_at.isoformat(),
        }
        for m in rows
    ]


@router.post("/{inquiry_id}/messages", status_code=status.HTTP_201_CREATED)
def post_message(
    inquiry_id: uuid.UUID,
    body: MessageIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict[str, str]:
    """
    Post a message on an inquiry thread and update planner response metrics.

    Args:
        inquiry_id: Inquiry id.
        body: Message body.
        db: Database session.
        user: Authenticated participant.

    Returns:
        dict[str, str]: Created message id.
    """

    inv = _inquiry_participant(db, inquiry_id, user)
    msg = Message(inquiry_id=inquiry_id, author_user_id=user.id, body=body.body)
    db.add(msg)
    db.flush()
    planner = db.get(PlannerProfile, inv.planner_profile_id)
    if planner is not None and planner.user_id == user.id:
        record_planner_first_response_if_needed(
            db,
            inquiry_id=inquiry_id,
            planner_user_id=user.id,
            message_created_at=msg.created_at,
        )
        # Auto-advance status to responded when the planner sends a reply
        if inv.status == InquiryStatus.open:
            inv.status = InquiryStatus.responded
    db.commit()
    db.refresh(msg)
    return {"id": str(msg.id)}


@router.patch("/{inquiry_id}/status")
def update_inquiry_status(
    inquiry_id: uuid.UUID,
    body: StatusUpdate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.planner, UserRole.admin))],
) -> dict:
    """
    Update the status of an inquiry. Planner-only; not exposed to clients.

    Args:
        inquiry_id: Inquiry id.
        body: New status value.
        db: Database session.
        user: Authenticated planner.

    Returns:
        dict: Updated inquiry id and new status.

    Raises:
        HTTPException: When inquiry is missing or planner doesn't own it.
    """

    profile = db.execute(select(PlannerProfile).where(PlannerProfile.user_id == user.id)).scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Planner profile missing")
    row = db.get(Inquiry, inquiry_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inquiry not found")
    if row.planner_profile_id != profile.id and user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    row.status = body.status
    db.commit()
    return {"id": str(row.id), "status": row.status.value}

