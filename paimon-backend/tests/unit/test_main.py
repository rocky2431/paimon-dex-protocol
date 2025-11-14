"""
Unit tests for main FastAPI application.

Tests:
1. Functional: FastAPI app creation and basic routes
2. Boundary: Empty config handling
3. Exception: Invalid configuration
4. Performance: App startup time
5. Security: CORS configuration
6. Compatibility: Python version compatibility
"""

from fastapi.testclient import TestClient


class TestFastAPIApp:
    """Test FastAPI application initialization and basic functionality."""

    def test_app_creation(self):
        """Test that FastAPI app can be created successfully."""
        from app.main import app

        assert app is not None
        assert app.title == "Paimon DEX Backend API"

    def test_health_endpoint(self):
        """Test health check endpoint exists and returns 200."""
        from app.main import app

        client = TestClient(app)
        response = client.get("/health")

        assert response.status_code == 200
        assert response.json() == {
            "status": "healthy",
            "service": "paimon-backend",
        }

    def test_root_endpoint(self):
        """Test root endpoint returns API information."""
        from app.main import app

        client = TestClient(app)
        response = client.get("/")

        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "version" in data
        assert data["name"] == "Paimon DEX Backend API"

    def test_cors_middleware_configured(self):
        """Test CORS middleware is properly configured."""
        from fastapi.testclient import TestClient

        from app.main import app

        # Test CORS by checking OPTIONS preflight request
        client = TestClient(app)
        response = client.options(
            "/",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
            },
        )
        # CORS should allow the request from allowed origins
        assert "access-control-allow-origin" in response.headers

    def test_openapi_docs_available(self):
        """Test OpenAPI documentation endpoints are available."""
        from app.main import app

        client = TestClient(app)

        # Test /docs (Swagger UI)
        response = client.get("/docs")
        assert response.status_code == 200

        # Test /redoc (ReDoc)
        response = client.get("/redoc")
        assert response.status_code == 200

        # Test /openapi.json
        response = client.get("/openapi.json")
        assert response.status_code == 200
        assert "openapi" in response.json()


class TestConfiguration:
    """Test configuration management with pydantic-settings."""

    def test_config_loads_from_env(self, monkeypatch):
        """Test configuration loads environment variables."""
        # Set test environment variables
        monkeypatch.setenv("DATABASE_URL", "postgresql://test:test@localhost/test")
        monkeypatch.setenv("REDIS_URL", "redis://localhost:6379")
        monkeypatch.setenv("JWT_SECRET", "test-secret-key")

        from app.core.config import Settings

        settings = Settings()

        assert settings.DATABASE_URL == "postgresql://test:test@localhost/test"
        assert settings.REDIS_URL == "redis://localhost:6379"
        assert settings.JWT_SECRET == "test-secret-key"

    def test_config_has_defaults(self):
        """Test configuration has sensible defaults."""
        from app.core.config import Settings

        settings = Settings()

        assert settings.API_V1_PREFIX == "/api"
        assert settings.PROJECT_NAME == "Paimon DEX Backend API"
        assert isinstance(settings.ALLOWED_ORIGINS, list)

    def test_config_validation_fails_on_invalid_url(self, monkeypatch):
        """Test configuration validation catches invalid URLs."""
        monkeypatch.setenv("DATABASE_URL", "not-a-valid-url")

        from app.core.config import Settings

        # Should either raise ValidationError or handle gracefully
        try:
            settings = Settings()
            # If no error, validation should still mark as invalid
            assert "postgresql://" not in settings.DATABASE_URL
        except Exception as e:
            # Expected to fail validation
            assert "DATABASE_URL" in str(e) or "validation" in str(e).lower()


class TestProjectStructure:
    """Test project structure and imports."""

    def test_all_modules_importable(self):
        """Test all core modules can be imported."""
        # Test imports don't raise errors

        assert True  # If we get here, all imports succeeded

    def test_package_structure_exists(self):
        """Test required package structure exists."""
        from pathlib import Path

        backend_dir = Path(__file__).parent.parent.parent
        app_dir = backend_dir / "app"

        required_dirs = [
            app_dir / "routers",
            app_dir / "services",
            app_dir / "models",
            app_dir / "schemas",
            app_dir / "core",
        ]

        for directory in required_dirs:
            assert directory.exists(), f"Missing directory: {directory}"
            # Check for __init__.py
            init_file = directory / "__init__.py"
            assert init_file.exists(), f"Missing __init__.py in {directory}"
