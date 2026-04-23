"""Admin-only maintenance endpoints (premium flag without Stripe)."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_roles
from app.models import PlannerProfile, User, UserRole
from app.schemas import PremiumPatch

router = APIRouter(prefix="/admin", tags=["admin"])


@router.patch("/planners/{planner_profile_id}/premium")
def set_premium(
    planner_profile_id: uuid.UUID,
    body: PremiumPatch,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles(UserRole.admin))],
) -> dict[str, str]:
    """
    Toggle premium placement fields for demos until Stripe is integrated.

    Args:
        planner_profile_id: Planner profile UUID.
        body: Premium flags.
        db: Database session.
        _: Authenticated admin user (unused).

    Returns:
        dict[str, str]: Acknowledgement.

    Raises:
        HTTPException: When the planner profile is missing.
    """

    p = db.get(PlannerProfile, planner_profile_id)
    if p is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Planner not found")
    p.is_premium = body.is_premium
    p.premium_expires_at = body.premium_expires_at
    db.add(p)
    db.commit()
    return {"status": "ok"}

