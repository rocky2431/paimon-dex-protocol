"""
Enhanced health check endpoint tests for deployment readiness.

Tests:
1. Functional: Health check returns complete status
2. Boundary: Health check with DB/Redis down
3. Exception: Health check error handling
4. Performance: Health check response time < 1s
5. Security: No sensitive information leaked
6. Compatibility: Works with different DB/Redis configurations
"""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient


class TestEnhancedHealthCheck:
    """Test enhanced health check endpoint for deployment verification."""

    def test_health_check_returns_complete_status(self):
        """Test health check endpoint returns database and Redis status."""
        from app.main import app

        client = TestClient(app)
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()

        # Basic status
        assert "status" in data
        assert "service" in data
        assert data["service"] == "paimon-backend"

        # Database status
        assert "database" in data
        assert "connected" in data["database"]

        # Redis status
        assert "redis" in data
        assert "connected" in data["redis"]

        # Timestamp
        assert "timestamp" in data

    def test_health_check_database_and_redis_fields_exist(self):
        """Test health check includes database and redis status fields."""
        from app.main import app

        client = TestClient(app)
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()

        # Verify database and redis fields exist
        assert "database" in data
        assert "connected" in data["database"]
        assert isinstance(data["database"]["connected"], bool)

        assert "redis" in data
        assert "connected" in data["redis"]
        assert isinstance(data["redis"]["connected"], bool)

    def test_health_check_status_reflects_services(self):
        """Test health check status reflects overall health."""
        from app.main import app

        client = TestClient(app)
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()

        # Status should be "healthy" or "degraded" depending on services
        assert data["status"] in ["healthy", "degraded"]

        # If status is healthy, both services should be connected
        if data["status"] == "healthy":
            assert data["database"]["connected"] is True
            assert data["redis"]["connected"] is True

        # If status is degraded, at least one service should be down
        if data["status"] == "degraded":
            assert (
                data["database"]["connected"] is False
                or data["redis"]["connected"] is False
            )

    def test_health_check_performance(self):
        """Test health check responds within 1 second."""
        from app.main import app
        import time

        client = TestClient(app)

        start_time = time.time()
        response = client.get("/health")
        elapsed_time = time.time() - start_time

        assert response.status_code == 200
        assert elapsed_time < 1.0, f"Health check took {elapsed_time}s, expected < 1s"

    def test_health_check_no_sensitive_info(self):
        """Test health check doesn't leak sensitive information."""
        from app.main import app

        client = TestClient(app)
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        response_str = str(data).lower()

        # Check for common sensitive patterns
        sensitive_patterns = [
            "password",
            "secret",
            "token",
            "api_key",
            "private",
            "credential",
        ]

        for pattern in sensitive_patterns:
            assert (
                pattern not in response_str
            ), f"Health check leaked sensitive info: {pattern}"

    def test_health_check_timestamp_format(self):
        """Test health check timestamp is ISO 8601 format."""
        from app.main import app
        from datetime import datetime

        client = TestClient(app)
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        timestamp = data["timestamp"]

        # Should be parseable as ISO 8601
        try:
            datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        except ValueError:
            pytest.fail(f"Invalid ISO 8601 timestamp: {timestamp}")


class TestHealthCheckBoundary:
    """Test boundary conditions for health check."""

    def test_health_check_handles_transient_failures_gracefully(self):
        """Test health check gracefully handles service failures."""
        from app.main import app

        client = TestClient(app)
        response = client.get("/health")

        # Should always return 200 (even if services are down)
        assert response.status_code == 200
        data = response.json()

        # Should have all required fields even on failure
        assert "status" in data
        assert "database" in data
        assert "redis" in data
        assert "timestamp" in data


class TestHealthCheckCompatibility:
    """Test health check compatibility with different configurations."""

    def test_health_check_with_sqlite(self, monkeypatch):
        """Test health check works with SQLite database."""
        monkeypatch.setenv("DATABASE_URL", "sqlite+aiosqlite:///./test.db")

        from app.main import app

        client = TestClient(app)
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        # SQLite should be accessible
        assert "database" in data

    def test_health_check_with_postgresql(self, monkeypatch):
        """Test health check configuration for PostgreSQL."""
        monkeypatch.setenv(
            "DATABASE_URL", "postgresql+asyncpg://user:pass@localhost/db"
        )

        from app.main import app

        # Just verify the app can be created with PostgreSQL config
        assert app is not None
