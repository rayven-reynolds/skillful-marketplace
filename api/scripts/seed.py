#!/usr/bin/env python3
"""
Seed local development data (admin, demo client, demo planner).

Run from the ``api/`` directory after migrations::

    python -m venv .venv && source .venv/bin/activate
    pip install -r requirements.txt
    alembic upgrade head
    PYTHONPATH=. python scripts/seed.py
"""

from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import AvailabilityBlock, PlannerProfile, PortfolioItem, User, UserRole
from app.security import hash_password


def _ensure_user(db: Session, *, email: str, password: str, display_name: str, role: UserRole) -> User:
    """
    Return an existing user by email or create a new seeded user.

    Args:
        db: Active database session.
        email: Unique email address.
        password: Plain password to hash for local dev only.
        display_name: Human-readable name.
        role: Assigned role.

    Returns:
        User: Persisted user row.
    """

    row = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if row:
        return row
    u = User(
        email=email,
        password_hash=hash_password(password),
        display_name=display_name,
        role=role,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def main() -> None:
    """Insert deterministic demo rows when missing."""

    db = SessionLocal()
    try:
        _ensure_user(
            db,
            email="admin@eventsee.local",
            password="adminadmin12",
            display_name="Admin",
            role=UserRole.admin,
        )
        planner_user = _ensure_user(
            db,
            email="planner@eventsee.local",
            password="plannerplanner12",
            display_name="Jordan Avery",
            role=UserRole.planner,
        )
        _ensure_user(
            db,
            email="client@eventsee.local",
            password="clientclient12",
            display_name="Alex Client",
            role=UserRole.client,
        )

        profile = db.execute(select(PlannerProfile).where(PlannerProfile.user_id == planner_user.id)).scalar_one_or_none()
        if profile is None:
            profile = PlannerProfile(
                user_id=planner_user.id,
                slug="jordan-avery",
                bio="Full-service weddings and corporate events with calm coordination.",
                location_text="San Francisco, CA",
                price_min=3500,
                price_max=12000,
                planning_styles=["full_service", "month_of"],
                event_sizes=["50_150", "150_300"],
                specialties=["south_asian", "lgbtq_inclusive"],
                aesthetic_tags=["modern_minimal", "garden_romantic"],
                response_time_hours=4.5,
                is_premium=True,
            )
            db.add(profile)
            db.commit()
            db.refresh(profile)
            db.add(
                PortfolioItem(
                    planner_profile_id=profile.id,
                    title="City rooftop reception",
                    event_type="wedding",
                    photos=["https://images.unsplash.com/photo-1519741497674-611481863552?w=800"],
                    budget_breakdown={
                        "venue_pct_range": [35, 45],
                        "catering_pct_range": [25, 35],
                        "photo_pct_range": [10, 15],
                        "notes": "Anonymized ranges for a ~120 guest evening.",
                    },
                )
            )
            busy_start = datetime(2026, 6, 20, tzinfo=timezone.utc)
            busy_end = busy_start + timedelta(days=1)
            db.add(
                AvailabilityBlock(
                    planner_profile_id=profile.id,
                    start_ts=busy_start,
                    end_ts=busy_end,
                    all_day=True,
                )
            )
            db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    main()
