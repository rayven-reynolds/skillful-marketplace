"""Fit-quiz scoring: rank planners for a small answer payload."""

from __future__ import annotations

import uuid
from datetime import date, datetime, time, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AvailabilityBlock, PlannerProfile


def _day_window_utc(d: date) -> Tuple[datetime, datetime]:
    """Return UTC [start, end) bounds for a calendar date."""

    start = datetime.combine(d, time.min, tzinfo=timezone.utc)
    from datetime import timedelta

    end = start + timedelta(days=1)
    return start, end


def planner_free_on_date(db: Session, planner_id: uuid.UUID, event_date: Optional[date]) -> bool:
    """
    Return True when the planner has no busy block overlapping the given UTC day.

    Args:
        db: Database session.
        planner_id: Planner profile id.
        event_date: Client-selected event date, or None to skip availability scoring.

    Returns:
        bool: True when free or when no date is provided.
    """

    if event_date is None:
        return True
    start, end = _day_window_utc(event_date)
    overlap = db.execute(
        select(AvailabilityBlock.id).where(
            AvailabilityBlock.planner_profile_id == planner_id,
            AvailabilityBlock.start_ts < end,
            AvailabilityBlock.end_ts > start,
        )
    ).first()
    return overlap is None


def score_planner(profile: PlannerProfile, answers: Dict[str, Any], event_date: Optional[date]) -> float:
    """
    Compute a weighted match score for a planner profile.

    Args:
        profile: Candidate planner row.
        answers: Quiz answers (location, styles, vibe, specialties, budget, size, segment).
        event_date: Optional event date for soft availability scoring.

    Returns:
        float: Higher is a better match.
    """

    score = 0.0
    loc = (answers.get("location") or "").lower()
    if loc and loc in (profile.location_text or "").lower():
        score += 25
    styles = set(answers.get("planning_styles") or [])
    score += 5 * len(styles.intersection(set(profile.planning_styles or [])))
    vibe = set(answers.get("aesthetic_tags") or [])
    score += 4 * len(vibe.intersection(set(profile.aesthetic_tags or [])))
    specs = set(answers.get("specialties") or [])
    score += 6 * len(specs.intersection(set(profile.specialties or [])))
    sizes = set(answers.get("event_sizes") or [])
    score += 3 * len(sizes.intersection(set(profile.event_sizes or [])))
    budget = answers.get("budget_max")
    if isinstance(budget, int):
        if profile.price_min <= budget and profile.price_max >= 0:
            if profile.price_max <= budget + max(budget * 2, 1):
                score += 15
    if profile.is_premium:
        score += 8
    return score


def top_planners(
    db: Session, answers: Dict[str, Any], *, event_date: Optional[date], limit: int = 3
) -> List[Tuple[uuid.UUID, float]]:
    """
    Return the top planner ids with scores for the given quiz answers.

    Args:
        db: Database session.
        answers: Quiz answers payload.
        event_date: Optional event date; filters out planners who are busy that day.
        limit: Maximum number of matches to return.

    Returns:
        List[Tuple[uuid.UUID, float]]: Planner id and score pairs, sorted descending.
    """

    rows = db.execute(select(PlannerProfile)).scalars().all()
    ranked: List[Tuple[uuid.UUID, float]] = []
    for p in rows:
        if event_date and not planner_free_on_date(db, p.id, event_date):
            continue
        s = score_planner(p, answers, event_date)
        ranked.append((p.id, s))
    ranked.sort(key=lambda x: x[1], reverse=True)
    return ranked[:limit]
