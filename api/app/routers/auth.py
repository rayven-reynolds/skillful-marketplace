"""Registration, login, logout, and current user endpoints."""

from __future__ import annotations

import uuid
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.deps import get_current_user, utcnow
from app.models import SessionToken, User, UserRole
from app.schemas import LoginIn, RegisterIn, UserOut
from app.security import hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _attach_session_cookie(response: Response, db: Session, user: User) -> None:
    """
    Create a server session and set the HTTP-only session cookie on the response.

    Args:
        response: Outgoing FastAPI response to mutate headers on.
        db: Active database session.
        user: Authenticated user row.
    """

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


@router.post("/register", response_model=UserOut)
def register(payload: RegisterIn, response: Response, db: Session = Depends(get_db)) -> User:
    """
    Create a new user account and establish a session.

    Args:
        payload: Registration fields from the client.
        response: Response used to attach the session cookie.
        db: Database session.

    Returns:
        User: Newly created user row.

    Raises:
        HTTPException: When the email is already registered.
    """

    if payload.role == UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot self-register as admin")
    exists = db.execute(select(User.id).where(User.email == str(payload.email))).first()
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    user = User(
        email=str(payload.email).lower(),
        password_hash=hash_password(payload.password),
        display_name=payload.display_name,
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    _attach_session_cookie(response, db, user)
    return user


@router.post("/login", response_model=UserOut)
def login(payload: LoginIn, response: Response, db: Session = Depends(get_db)) -> User:
    """
    Authenticate by email/password and attach a session cookie.

    Args:
        payload: Login credentials.
        response: Response used to attach the session cookie.
        db: Database session.

    Returns:
        User: Authenticated user row.

    Raises:
        HTTPException: When credentials are invalid.
    """

    user = db.execute(select(User).where(User.email == str(payload.email).lower())).scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    _attach_session_cookie(response, db, user)
    return user


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)) -> dict[str, str]:
    """
    Delete the active server session row and clear the session cookie.

    Args:
        request: Incoming request carrying the session cookie.
        response: Response used to clear the cookie.
        db: Database session.

    Returns:
        dict[str, str]: Acknowledgement payload.
    """

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


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> User:
    """
    Return the authenticated user's public fields.

    Args:
        user: Current user from session dependency.

    Returns:
        User: Authenticated user row.
    """

    return user
