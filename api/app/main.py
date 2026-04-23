"""FastAPI application entrypoint for Eventsee."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import admin, auth, bookings, checklist, favorites, health, inquiries, planner_me, public, quiz, reviews

settings = get_settings()


def create_app() -> FastAPI:
    """
    Build and configure the FastAPI application instance.

    Returns:
        FastAPI: Configured ASGI application.
    """

    app = FastAPI(title="Eventsee API", version="0.1.0")
    origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health.router, prefix="/v1")
    app.include_router(auth.router, prefix="/v1")
    app.include_router(public.router, prefix="/v1")
    app.include_router(planner_me.router, prefix="/v1")
    app.include_router(favorites.router, prefix="/v1")
    app.include_router(inquiries.router, prefix="/v1")
    app.include_router(bookings.router, prefix="/v1")
    app.include_router(reviews.router, prefix="/v1")
    app.include_router(quiz.router, prefix="/v1")
    app.include_router(admin.router, prefix="/v1")
    app.include_router(checklist.router, prefix="/v1")
    return app


app = create_app()
