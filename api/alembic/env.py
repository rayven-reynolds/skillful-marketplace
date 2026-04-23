"""Alembic migration environment wiring for SQLAlchemy metadata."""

from __future__ import annotations

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.config import get_settings
from app.database import Base
from app import models  # noqa: F401 — register metadata

config = context.config
if config.config_file_name is not None:
    try:
        fileConfig(config.config_file_name)
    except KeyError:
        # Allow running Alembic without a full logging section in ``alembic.ini``.
        pass

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode (emit SQL without connecting).

    This configures the context with just a URL and no Engine.
    """

    url = get_settings().database_url
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode (connect and apply revisions).
    """

    connectable = engine_from_config(
        {"sqlalchemy.url": get_settings().database_url},
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
