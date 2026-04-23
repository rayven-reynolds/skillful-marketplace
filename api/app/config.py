"""Application configuration loaded from environment variables."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Runtime settings for the API process.

    Attributes:
        database_url: SQLAlchemy URL for PostgreSQL.
        session_cookie_name: Name of the HTTP-only session cookie.
        session_ttl_hours: Session lifetime in hours.
        cors_origins: Comma-separated browser origins for credentialed CORS.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://postgres:postgres@127.0.0.1:5432/eventsee"
    session_cookie_name: str = "eventsee_session"
    session_ttl_hours: int = 72
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"


@lru_cache
def get_settings() -> Settings:
    """
    Return a cached Settings instance.

    Returns:
        Settings: Parsed environment configuration.
    """

    return Settings()
