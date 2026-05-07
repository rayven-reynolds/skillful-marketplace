"""Client favorites (saved planners)."""

from __future__ import annotations

import uuid
from typing import Annotated, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from starlette.responses import Response
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_roles
from app.models import Favorite, PlannerProfile, User, UserRole

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("")
def list_favorites(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.client, UserRole.planner, UserRole.admin))],
) -> List[Dict[str, str]]:
    """
    List planner ids favorited by the authenticated client.

    Args:
        db: Database session.
        user: Authenticated user.

    Returns:
        List[Dict[str, str]]: Favorite rows with planner profile ids and slugs.
    """

    rows = db.execute(select(Favorite, PlannerProfile).join(PlannerProfile).where(Favorite.user_id == user.id)).all()
    return [{"planner_profile_id": str(f.planner_profile_id), "slug": p.slug} for f, p in rows]


@router.post("/{planner_profile_id}", status_code=status.HTTP_201_CREATED)
def add_favorite(
    planner_profile_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.client, UserRole.planner, UserRole.admin))],
) -> Dict[str, str]:
    """
    Save a planner for the authenticated user.

    Args:
        planner_profile_id: Planner profile UUID.
        db: Database session.
        user: Authenticated user.

    Returns:
        Dict[str, str]: Acknowledgement.

    Raises:
        HTTPException: When planner does not exist or favorite already exists.
    """

    p = db.get(PlannerProfile, planner_profile_id)
    if p is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Planner not found")
    exists = db.execute(
        select(Favorite.id).where(
            Favorite.user_id == user.id,
            Favorite.planner_profile_id == planner_profile_id,
        )
    ).first()
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already favorited")
    db.add(Favorite(user_id=user.id, planner_profile_id=planner_profile_id))
    db.commit()
    return {"status": "ok"}


@router.delete("/{planner_profile_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_favorite(
    planner_profile_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles(UserRole.client, UserRole.planner, UserRole.admin))],
) -> Response:
    """
    Remove a saved planner for the authenticated user.

    Args:
        planner_profile_id: Planner profile UUID.
        db: Database session.
        user: Authenticated user.
    """

    db.execute(
        delete(Favorite).where(
            Favorite.user_id == user.id,
            Favorite.planner_profile_id == planner_profile_id,
        )
    )
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
