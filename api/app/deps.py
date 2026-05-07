"""FastAPI dependencies for database sessions and authentication."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Annotated, Optional

from fastapi import Depends, HTTPException, Request, Security, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import SessionToken, User, UserRole
from app.security import verify_password

# Swagger "Authorize" button wires to this scheme.
# auto_error=False so we can fall back to cookie auth without a hard 401.
_http_basic = HTTPBasic(auto_error=False)


def utcnow() -> datetime:
    """Return the current UTC timestamp."""

    return datetime.now(timezone.utc)


def get_optional_user(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    basic: Annotated[Optional[HTTPBasicCredentials], Security(_http_basic)] = None,
) -> Optional[User]:
    """
    Resolve the current user from *either* the session cookie (web app)
    *or* HTTP Basic credentials (Swagger UI / API clients).

    Cookie takes precedence. If neither is present, returns None.

    Args:
        request: Incoming HTTP request (reads cookies).
        db: Active SQLAlchemy session.
        basic: Optional HTTP Basic credentials injected by FastAPI security.

    Returns:
        Optional[User]: Authenticated user, or None when unauthenticated.
    """

    settings = get_settings()

    # ── 1. Session cookie (web app) ────────────────────────────────────────
    session_id = request.cookies.get(settings.session_cookie_name)
    if session_id:
        try:
            sid = uuid.UUID(session_id)
        except ValueError:
            pass
        else:
            row = db.get(SessionToken, sid)
            if row is not None and row.expires_at >= utcnow():
                return db.get(User, row.user_id)

    # ── 2. HTTP Basic Auth (Swagger UI / curl) ─────────────────────────────
    if basic and basic.username:
        user = db.execute(
            select(User).where(User.email == basic.username.lower())
        ).scalar_one_or_none()
        if user and verify_password(basic.password, user.password_hash):
            return user

    return None


def get_current_user(user: Annotated[Optional[User], Depends(get_optional_user)]) -> User:
    """
    Require an authenticated user or raise 401.

    Args:
        user: Optional user resolved upstream.

    Returns:
        User: Authenticated user.

    Raises:
        HTTPException: When the session is missing or expired.
    """

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Basic"},
        )
    return user


def require_roles(*roles: UserRole):
    """
    Build a dependency that enforces one of the given roles.

    Args:
        *roles: Allowed roles for the route.

    Returns:
        Callable[..., User]: FastAPI dependency returning the current user.
    """

    def _inner(user: Annotated[User, Depends(get_current_user)]) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user

    return _inner
