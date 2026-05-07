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


def _ensure_user(
    db: Session,
    *,
    email: str,
    password: str,
    display_name: str,
    role: UserRole,
    update_password: bool = False,
) -> User:
    """
    Return an existing user by email or create a new seeded user.

    When ``update_password=True`` the password hash is refreshed even if the
    user already exists — useful for resetting demo accounts to a known value.

    Args:
        db: Active database session.
        email: Unique email address.
        password: Plain password to hash for local dev only.
        display_name: Human-readable name.
        role: Assigned role.
        update_password: If True, overwrite the stored password hash.

    Returns:
        User: Persisted user row.
    """

    row = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if row:
        if update_password:
            row.password_hash = hash_password(password)
            db.add(row)
            db.commit()
            db.refresh(row)
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

        # Homework demo users — Alice & Bob are planners, client/carol are clients.
        # Passwords are reset on every seed run so they stay in sync with the docs.
        alice = _ensure_user(
            db,
            email="alice@example.com",
            password="password123",
            display_name="Alice Anderson",
            role=UserRole.planner,
            update_password=True,
        )
        bob = _ensure_user(
            db,
            email="bob@example.com",
            password="password123",
            display_name="Bob Brown",
            role=UserRole.planner,
            update_password=True,
        )
        _ensure_user(
            db,
            email="carol@example.com",
            password="password123",
            display_name="Carol Carter",
            role=UserRole.client,
            update_password=True,
        )
        # Dedicated "client" account used in the Swagger security demo.
        _ensure_user(
            db,
            email="client@example.com",
            password="password123",
            display_name="Demo Client",
            role=UserRole.client,
            update_password=True,
        )

        demo_planners: tuple = (
            (
                alice,
                "alice-anderson",
                "Minimalist weddings & intimate micro-events. I believe every love story deserves a perfectly curated day — no stress, just magic.",
                "Brooklyn, NY",
                "America/New_York",
                "Brooklyn loft wedding",
                "wedding",
                2500,
                9000,
                ["wedding", "micro_wedding", "anniversary"],
                ["full_service", "month_of"],
                ["under_50", "50_150"],
                ["https://images.unsplash.com/photo-1519741497674-611481863552?w=800"],
            ),
            (
                bob,
                "bob-brown",
                "High-impact corporate offsites, product launches, and conferences. I handle logistics so your team can focus on the content.",
                "Austin, TX",
                "America/Chicago",
                "Austin tech conference",
                "corporate",
                5000,
                25000,
                ["corporate", "conference", "retreat"],
                ["full_service", "partial"],
                ["150_300", "300_plus"],
                ["https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800"],
            ),
        )

        for owner, slug, bio, city, tz, _, event_type, p_min, p_max, specs, styles, sizes, photos in demo_planners:
            existing = db.execute(select(PlannerProfile).where(PlannerProfile.user_id == owner.id)).scalar_one_or_none()
            if existing is None:
                db.add(
                    PlannerProfile(
                        user_id=owner.id,
                        slug=slug,
                        bio=bio,
                        location_text=city,
                        price_min=p_min,
                        price_max=p_max,
                        planning_styles=styles,
                        event_sizes=sizes,
                        specialties=specs,
                        aesthetic_tags=["modern_minimal"],
                        timezone=tz,
                    )
                )
            else:
                # Update existing profiles with richer data
                existing.bio = bio
                existing.location_text = city
                existing.price_min = p_min
                existing.price_max = p_max
                existing.planning_styles = styles
                existing.event_sizes = sizes
                existing.specialties = specs
                db.add(existing)
        db.commit()

        # One signature listing per demo planner so the ownership-based UI has
        # something to render. Idempotent: only inserts when a profile has zero
        # portfolio items so reruns don't duplicate seeds.
        for owner, _, _, _, _, listing_title, listing_event, _, _, _, _, _, cover_photos in demo_planners:
            profile = db.execute(
                select(PlannerProfile).where(PlannerProfile.user_id == owner.id)
            ).scalar_one()
            has_items = db.execute(
                select(PortfolioItem.id).where(PortfolioItem.planner_profile_id == profile.id)
            ).first()
            if has_items is None:
                db.add(
                    PortfolioItem(
                        planner_profile_id=profile.id,
                        title=listing_title,
                        event_type=listing_event,
                        photos=cover_photos,
                        budget_breakdown={"venue_pct_range": [35, 45]},
                    )
                )
        db.commit()

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
