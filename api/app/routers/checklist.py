"""Persisted wedding checklist progress for authenticated users."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas import ChecklistProgress

router = APIRouter(prefix="/me", tags=["checklist"])


@router.get("/checklist")
def get_checklist(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """
    Return the user's saved checklist JSON (or an empty object).

    Args:
        db: Database session.
        user: Authenticated user.

    Returns:
        dict: Checklist progress payload.
    """

    db.refresh(user)
    return {"progress": user.checklist_progress or {}}


@router.put("/checklist")
def put_checklist(
    body: ChecklistProgress,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """
    Replace the user's checklist progress JSON.

    Args:
        body: Opaque progress object from the web tool.
        db: Database session.
        user: Authenticated user.

    Returns:
        dict: Echo of saved progress.
    """

    user.checklist_progress = body.progress
    db.add(user)
    db.commit()
    return {"progress": user.checklist_progress or {}}

