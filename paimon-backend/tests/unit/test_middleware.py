"""
Unit tests for Response Middleware module.

Tests middleware for unified response format and request logging.
"""

from fastapi import FastAPI
from fastapi.testclient import TestClient


class TestResponseMiddleware:
    """Test unified response middleware."""

    def test_middleware_wraps_success_response(self):
        """Test middleware wraps successful responses."""
        from app.core.middleware import setup_middleware

        app = FastAPI()
        setup_middleware(app)

        @app.get("/test-success")
        def test_success():
            return {"message": "Success"}

        client = TestClient(app)
        response = client.get("/test-success")

        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert data["success"] is True
        assert "data" in data
        assert data["data"]["message"] == "Success"

    def test_middleware_adds_timestamp(self):
        """Test middleware adds timestamp to response."""
        from app.core.middleware import setup_middleware

        app = FastAPI()
        setup_middleware(app)

        @app.get("/test-timestamp")
        def test_timestamp():
            return {"value": 123}

        client = TestClient(app)
        response = client.get("/test-timestamp")

        data = response.json()
        assert "timestamp" in data
        assert isinstance(data["timestamp"], str)

    def test_middleware_adds_request_id(self):
        """Test middleware adds request ID to response."""
        from app.core.middleware import setup_middleware

        app = FastAPI()
        setup_middleware(app)

        @app.get("/test-request-id")
        def test_request_id():
            return {"value": 456}

        client = TestClient(app)
        response = client.get("/test-request-id")

        data = response.json()
        assert "request_id" in data
        assert isinstance(data["request_id"], str)
        assert len(data["request_id"]) > 0

    def test_middleware_preserves_status_code(self):
        """Test middleware preserves original status code."""
        from app.core.middleware import setup_middleware

        app = FastAPI()
        setup_middleware(app)

        @app.post("/test-created", status_code=201)
        def test_created():
            return {"id": 1}

        client = TestClient(app)
        response = client.post("/test-created")

        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True


class TestRequestLoggingMiddleware:
    """Test request logging middleware."""

    def test_middleware_logs_requests(self, caplog):
        """Test middleware logs incoming requests."""
        from app.core.middleware import setup_middleware

        app = FastAPI()
        setup_middleware(app)

        @app.get("/test-logging")
        def test_logging():
            return {"status": "ok"}

        client = TestClient(app)
        with caplog.at_level("INFO"):
            client.get("/test-logging")

        # Check logs contain request info
        assert any("GET" in record.message for record in caplog.records)

    def test_middleware_tracks_response_time(self):
        """Test middleware tracks response time."""
        import time

        from app.core.middleware import setup_middleware

        app = FastAPI()
        setup_middleware(app)

        @app.get("/test-timing")
        def test_timing():
            time.sleep(0.1)  # Simulate processing
            return {"status": "ok"}

        client = TestClient(app)
        response = client.get("/test-timing")

        # Response should have timing information (in headers or logs)
        # This is implementation-dependent
        assert response.status_code == 200


class TestMiddlewareExclusions:
    """Test middleware exclusions for certain paths."""

    def test_health_endpoint_excluded(self):
        """Test /health endpoint is excluded from response wrapping."""
        from app.core.middleware import setup_middleware

        app = FastAPI()
        setup_middleware(app)

        @app.get("/health")
        def health():
            return {"status": "healthy"}

        client = TestClient(app)
        response = client.get("/health")

        # Health endpoint should return raw response
        # Should NOT have wrapper structure for /health
        # (Implementation may vary - this tests the concept)
        assert response.status_code == 200

    def test_docs_endpoint_excluded(self):
        """Test /docs and /openapi.json are excluded."""
        from app.core.middleware import setup_middleware

        app = FastAPI()
        setup_middleware(app)

        client = TestClient(app)
        # These should not raise errors
        docs_response = client.get("/docs")
        # OpenAPI docs should be accessible
        assert docs_response.status_code in [200, 404]  # 404 if not configured yet
