"""Liveness and readiness style health checks."""

from __future__ import annotations

import logging
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import DATABASE_URL, get_db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    """
    Return a static success payload for liveness checks.

    Returns:
        dict[str, str]: Simple status object.
    """

    return {"status": "ok"}


@router.get("/health/db")
def health_db(db: Session = Depends(get_db)) -> dict[str, str]:
    """
    Verify database connectivity for readiness checks.

    Reports the configured database host (without credentials) so the value
    can be cross-checked against the platform's environment variables.

    Args:
        db: Request-scoped SQLAlchemy session.

    Returns:
        dict[str, str]: Connection status and the host being targeted.
    """

    parts = urlsplit(DATABASE_URL)
    host = parts.hostname or "unknown"
    port = parts.port or 0
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "host": host, "port": str(port)}
    except Exception as exc:
        logger.exception("Database health check failed")
        return {
            "status": "error",
            "host": host,
            "port": str(port),
            "error": str(exc).splitlines()[0][:200],
        }
