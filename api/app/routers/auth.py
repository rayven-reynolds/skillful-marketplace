"""Registration, login, logout, current user, and become-planner endpoints."""

from __future__ import annotations

import re
import uuid
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.deps import get_current_user, utcnow
from app.models import PlannerProfile, SessionToken, User, UserRole
from app.schemas import BecomePlannerIn, EventPrefsIn, LoginIn, ProfileUpdate, RegisterIn, UserOut
from app.security import hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _attach_session_cookie(response: Response, db: Session, user: User) -> None:
    settings = get_settings()
    expires = utcnow() + timedelta(hours=settings.session_ttl_hours)
    row = SessionToken(user_id=user.id, expires_at=expires)
    db.add(row)
    db.commit()
    db.refresh(row)
    response.set_cookie(
        key=settings.session_cookie_name,
        value=str(row.id),
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.session_ttl_hours * 3600,
        path="/",
    )


@router.post(
    "/register",
    response_model=UserOut,
    summary="Register a new account",
    responses={
        403: {"description": "Attempted self-registration as admin."},
        409: {"description": "Email already registered."},
    },
)
def register(payload: RegisterIn, response: Response, db: Session = Depends(get_db)) -> User:
    """Create a new user account (always ``client`` role) and start a session."""

    if payload.role == UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot self-register as admin")
    exists = db.execute(select(User.id).where(User.email == str(payload.email))).first()
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    user = User(
        email=str(payload.email).lower(),
        password_hash=hash_password(payload.password),
        display_name=payload.display_name,
        role=UserRole.client,  # everyone starts as client; promote via /become-planner
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    _attach_session_cookie(response, db, user)
    return user


@router.post(
    "/login",
    response_model=UserOut,
    summary="Log in with email + password",
    responses={401: {"description": "Invalid credentials."}},
)
def login(payload: LoginIn, response: Response, db: Session = Depends(get_db)) -> User:
    """Verify credentials and attach a session cookie."""

    user = db.execute(select(User).where(User.email == str(payload.email).lower())).scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    _attach_session_cookie(response, db, user)
    return user


@router.post("/logout", summary="Log out and clear session cookie")
def logout(request: Request, response: Response, db: Session = Depends(get_db)) -> dict[str, str]:
    """Delete the server session and clear the cookie. Always returns 200."""

    settings = get_settings()
    raw = request.cookies.get(settings.session_cookie_name)
    if raw:
        try:
            row = db.get(SessionToken, uuid.UUID(raw))
            if row:
                db.delete(row)
                db.commit()
        except ValueError:
            pass
    response.delete_cookie(settings.session_cookie_name, path="/")
    return {"status": "ok"}


@router.get("/me", response_model=UserOut, summary="Return the authenticated user")
def me(user: User = Depends(get_current_user)) -> User:
    """Returns 401 when the session cookie is missing or expired."""

    return user


@router.patch(
    "/profile",
    response_model=UserOut,
    summary="Update current user's display name",
    description="Any authenticated user can update their first and last name.",
    responses={401: {"description": "Not authenticated."}},
)
def update_profile(
    payload: ProfileUpdate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Combine first_name + last_name into display_name and persist."""

    full = payload.first_name.strip()
    if payload.last_name and payload.last_name.strip():
        full = f"{full} {payload.last_name.strip()}"
    user.display_name = full
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch(
    "/profile/event",
    response_model=UserOut,
    summary="Save client event preferences",
    description="Stores phone, event date, event type, and guest count on the user's profile for contact form auto-fill.",
)
def update_event_prefs(
    payload: EventPrefsIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    user.event_prefs = payload.model_dump()
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post(
    "/become-planner",
    response_model=UserOut,
    summary="Upgrade to planner and create a business profile",
    description=(
        "Any signed-in user can call this once. Creates a ``PlannerProfile`` "
        "and upgrades the caller's role to ``planner``. The ``business_name`` "
        "is slugified to form the public profile URL. Returns **409** if the "
        "user already has a profile or the slug is taken."
    ),
    responses={
        401: {"description": "Not authenticated."},
        409: {"description": "Profile already exists or business name already taken."},
    },
)
def become_planner(
    payload: BecomePlannerIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Create a planner profile and promote the caller's role to ``planner``."""

    existing = db.execute(
        select(PlannerProfile).where(PlannerProfile.user_id == user.id)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have a planner profile.",
        )
    slug = re.sub(r"[^a-z0-9]+", "-", payload.business_name.lower()).strip("-")
    if db.execute(select(PlannerProfile.id).where(PlannerProfile.slug == slug)).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That business name is already taken — try a different name.",
        )
    profile = PlannerProfile(
        user_id=user.id,
        slug=slug,
        bio=payload.bio,
        location_text=payload.location_text,
        price_min=payload.price_min,
        price_max=payload.price_max,
        planning_styles=payload.planning_styles,
        event_sizes=payload.event_sizes,
        specialties=payload.specialties,
        aesthetic_tags=payload.aesthetic_tags,
        timezone=payload.timezone,
        instagram_url=payload.instagram_url or None,
    )
    db.add(profile)
    db.flush()  # write profile so we have its id for portfolio items

    # Save uploaded photos as a portfolio item if any were provided
    if payload.cover_photos:
        from app.models import PortfolioItem  # local import avoids circular deps
        db.add(
            PortfolioItem(
                planner_profile_id=profile.id,
                title="Portfolio",
                event_type=payload.specialties[0] if payload.specialties else "event",
                photos=payload.cover_photos,
            )
        )

    user.role = UserRole.planner
    if not user.display_name:
        user.display_name = payload.business_name
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.delete(
    "/me",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Permanently delete the authenticated user's account",
    description=(
        "Deletes the caller's account and all associated data (planner profile, "
        "portfolio, availability, inquiries, favourites, sessions). This action is "
        "irreversible. The session cookie is cleared on success."
    ),
)
def delete_account(
    request: Request,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> Response:
    """Permanently remove the authenticated user and wipe the session cookie."""

    settings = get_settings()
    db.delete(user)   # cascade removes sessions, planner_profile, favorites, inquiries, etc.
    db.commit()
    response.delete_cookie(settings.session_cookie_name, path="/")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
