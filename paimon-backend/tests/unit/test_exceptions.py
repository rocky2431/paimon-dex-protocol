"""
Unit tests for Exception Handler module.

Tests custom exceptions and global exception handlers for FastAPI.
"""

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient


class TestCustomExceptions:
    """Test custom exception classes."""

    def test_api_exception_exists(self):
        """Test APIException class exists."""
        from app.core.exceptions import APIException

        exception = APIException(message="Test error", status_code=400)
        assert exception.message == "Test error"
        assert exception.status_code == 400

    def test_api_exception_with_details(self):
        """Test APIException with details field."""
        from app.core.exceptions import APIException

        exception = APIException(
            message="Validation error",
            status_code=422,
            details={"field": "email", "error": "invalid format"},
        )
        assert exception.details == {"field": "email", "error": "invalid format"}

    def test_not_found_exception(self):
        """Test NotFoundException."""
        from app.core.exceptions import NotFoundException

        exception = NotFoundException(resource="User", identifier="0x123")
        assert "User" in exception.message
        assert "0x123" in exception.message
        assert exception.status_code == 404

    def test_unauthorized_exception(self):
        """Test UnauthorizedException."""
        from app.core.exceptions import UnauthorizedException

        exception = UnauthorizedException(message="Invalid token")
        assert exception.message == "Invalid token"
        assert exception.status_code == 401

    def test_forbidden_exception(self):
        """Test ForbiddenException."""
        from app.core.exceptions import ForbiddenException

        exception = ForbiddenException(message="Insufficient permissions")
        assert exception.message == "Insufficient permissions"
        assert exception.status_code == 403


class TestExceptionHandlers:
    """Test global exception handlers."""

    def test_api_exception_handler_format(self):
        """Test APIException handler returns correct format."""
        from app.core.exceptions import APIException, setup_exception_handlers

        app = FastAPI()
        setup_exception_handlers(app)

        @app.get("/test-error")
        def test_error():
            raise APIException(message="Test error", status_code=400)

        client = TestClient(app)
        response = client.get("/test-error")

        assert response.status_code == 400
        data = response.json()
        assert "success" in data
        assert data["success"] is False
        assert "error" in data
        assert data["error"]["message"] == "Test error"
        assert data["error"]["code"] == 400

    def test_http_exception_handler_format(self):
        """Test HTTPException handler returns correct format."""
        from app.core.exceptions import setup_exception_handlers

        app = FastAPI()
        setup_exception_handlers(app)

        @app.get("/test-http-error")
        def test_http_error():
            raise HTTPException(status_code=500, detail="Internal server error")

        client = TestClient(app)
        response = client.get("/test-http-error")

        assert response.status_code == 500
        data = response.json()
        assert data["success"] is False
        assert "error" in data

    def test_validation_error_handler(self):
        """Test validation error handler returns correct format."""
        from pydantic import BaseModel

        from app.core.exceptions import setup_exception_handlers

        app = FastAPI()
        setup_exception_handlers(app)

        class TestModel(BaseModel):
            email: str
            age: int

        @app.post("/test-validation")
        def test_validation(data: TestModel):
            return data

        client = TestClient(app)
        response = client.post(
            "/test-validation", json={"email": "invalid", "age": "not_a_number"}
        )

        assert response.status_code == 422
        data = response.json()
        assert data["success"] is False
        assert "error" in data
        assert data["error"]["code"] == 422

    def test_generic_exception_handler(self):
        """Test generic exception handler for unexpected errors."""
        from app.core.exceptions import setup_exception_handlers

        app = FastAPI()
        setup_exception_handlers(app)

        @app.get("/test-unexpected")
        def test_unexpected():
            raise ValueError("Unexpected error")

        # Use raise_server_exceptions=False to let exception handler catch it
        client = TestClient(app, raise_server_exceptions=False)
        response = client.get("/test-unexpected")

        assert response.status_code == 500
        data = response.json()
        assert data["success"] is False
        assert data["error"]["code"] == 500
        assert "Internal server error" in data["error"]["message"]
