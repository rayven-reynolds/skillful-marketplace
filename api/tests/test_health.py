"""ASGI smoke tests that do not require a running database."""

from fastapi.testclient import TestClient

from app.main import app


def test_health_endpoint_returns_ok() -> None:
    """
    The public health route should respond without touching PostgreSQL.

    This supports CI and local smoke checks before migrations are applied.
    """

    client = TestClient(app)
    response = client.get("/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
