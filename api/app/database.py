"""SQLAlchemy engine and session factory."""

from __future__ import annotations

import logging
from collections.abc import Generator
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import get_settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    """Declarative base for ORM models."""


def _normalize_database_url(raw_url: str) -> str:
    """
    Normalize a Postgres connection URL for SQLAlchemy + psycopg + Supabase.

    - Rewrites the bare ``postgres://`` and ``postgresql://`` schemes to
      ``postgresql+psycopg://`` so SQLAlchemy picks the psycopg 3 driver
      regardless of how the platform (Railway, Supabase, etc.) exports the
      variable.
    - Forces ``sslmode=require`` if the caller did not specify one, since
      Supabase rejects unencrypted connections.

    Args:
        raw_url: Connection URL as provided by the environment.

    Returns:
        Connection URL with a normalized scheme and SSL query param.
    """

    url = raw_url.strip()

    if url.startswith("postgres://"):
        url = "postgresql+psycopg://" + url[len("postgres://") :]
    elif url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://") :]

    parts = urlsplit(url)
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    if "sslmode" not in query:
        query["sslmode"] = "require"
        parts = parts._replace(query=urlencode(query))
        url = urlunsplit(parts)

    return url


def _safe_url_for_logs(url: str) -> str:
    """
    Return a copy of ``url`` with the password obscured for log output.

    Args:
        url: Connection URL.

    Returns:
        Connection URL safe to print; the password segment, if any, is
        replaced with ``***``.
    """

    parts = urlsplit(url)
    if parts.password is None:
        return url
    user = parts.username or ""
    host = parts.hostname or ""
    port = f":{parts.port}" if parts.port else ""
    netloc = f"{user}:***@{host}{port}"
    return urlunsplit(parts._replace(netloc=netloc))


settings = get_settings()
DATABASE_URL = _normalize_database_url(settings.database_url)

logger.info("Database engine target: %s", _safe_url_for_logs(DATABASE_URL))

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=5,
    pool_recycle=1800,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator:
    """
    Yield a database session for request-scoped dependency injection.

    Yields:
        Session: SQLAlchemy session bound to the request lifecycle.
    """

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
