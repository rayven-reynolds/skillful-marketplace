"""Optional fit-quiz matching endpoint."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import PlannerProfile
from app.schemas import QuizMatchIn, QuizMatchOut
from app.services.quiz_match import top_planners

router = APIRouter(prefix="/quiz", tags=["quiz"])


@router.post("/match", response_model=QuizMatchOut)
def match_quiz(body: QuizMatchIn, db: Annotated[Session, Depends(get_db)]) -> QuizMatchOut:
    """
    Rank planners for quiz answers and return the top matches with metadata.

    Args:
        body: Quiz answers and optional event date.
        db: Database session.

    Returns:
        QuizMatchOut: Top matches with slug and score for UI linking.
    """

    ranked = top_planners(db, body.answers, event_date=body.event_date, limit=3)
    matches: list[dict] = []
    for pid, score in ranked:
        p = db.get(PlannerProfile, pid)
        if p is None:
            continue
        matches.append({"planner_profile_id": str(p.id), "slug": p.slug, "score": score})
    return QuizMatchOut(matches=matches)

