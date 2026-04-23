"""Liveness and readiness style health checks."""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    """
    Return a static success payload for smoke tests.

    Returns:
        dict[str, str]: Simple status object.
    """

    return {"status": "ok"}
