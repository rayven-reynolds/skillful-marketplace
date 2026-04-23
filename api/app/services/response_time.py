"""Planner response-time score maintenance."""

from __future__ import annotations

import uuid
from datetime import datetime
from statistics import median

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Inquiry, Message, PlannerProfile, ResponseSample


def record_planner_first_response_if_needed(
    db: Session,
    *,
    inquiry_id: uuid.UUID,
    planner_user_id: uuid.UUID,
    message_created_at: datetime,
) -> None:
    """
    If this is the planner owner's first message on the inquiry, record latency.

    Args:
        db: Database session.
        inquiry_id: Inquiry thread identifier.
        planner_user_id: Author of the newly created message.
        message_created_at: Timestamp of the planner message.
    """

    inquiry = db.get(Inquiry, inquiry_id)
    if inquiry is None:
        return
    profile = db.get(PlannerProfile, inquiry.planner_profile_id)
    if profile is None or profile.user_id != planner_user_id:
        return
    n = db.execute(
        select(func.count())
        .select_from(Message)
        .where(Message.inquiry_id == inquiry_id, Message.author_user_id == planner_user_id)
    ).scalar_one()
    if n != 1:
        return
    delta = message_created_at - inquiry.created_at
    hours = max(delta.total_seconds() / 3600.0, 0.0)
    db.add(ResponseSample(planner_profile_id=profile.id, hours=hours))
    db.flush()
    samples = db.execute(
        select(ResponseSample.hours)
        .where(ResponseSample.planner_profile_id == profile.id)
        .order_by(ResponseSample.created_at.desc())
        .limit(20)
    ).scalars().all()
    profile.response_time_hours = float(median(samples)) if samples else hours
    db.add(profile)
