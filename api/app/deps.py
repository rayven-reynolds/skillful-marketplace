"""FastAPI dependencies for database sessions and authentication."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Annotated, Optional

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import SessionToken, User, UserRole


def utcnow() -> datetime:
    """Return the current UTC timestamp."""

    return datetime.now(timezone.utc)


def get_optional_user(request: Request, db: Annotated[Session, Depends(get_db)]) -> Optional[User]:
    """
    Resolve the current user from the session cookie when present.

    Args:
        request: Incoming HTTP request (reads cookies).
        db: Active SQLAlchemy session.

    Returns:
        Optional[User]: Authenticated user, or None when unauthenticated/invalid.
    """

    settings = get_settings()
    session_id = request.cookies.get(settings.session_cookie_name)
    if not session_id:
        return None
    try:
        sid = uuid.UUID(session_id)
    except ValueError:
        return None
    row = db.get(SessionToken, sid)
    if row is None or row.expires_at < utcnow():
        return None
    return db.get(User, row.user_id)


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
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
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
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return _inner
