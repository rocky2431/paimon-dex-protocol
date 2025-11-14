"""
Unit tests for authentication dependency functions.

Tests:
1. Functional: get_current_user extracts user from valid token
2. Boundary: Missing/empty Authorization header
3. Exception: Invalid token format, expired tokens
4. Performance: Dependency execution < 10ms
5. Security: Token tampering detection in dependency
6. Compatibility: Different header formats
"""

import time
from datetime import timedelta

import pytest
from fastapi import HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials


class TestGetCurrentUser:
    """Test get_current_user FastAPI dependency."""

    def test_get_current_user_success(self):
        """Test extracting user from valid token."""
        from app.core.security import create_access_token
        from app.api.dependencies import get_current_user

        # Create valid token
        data = {"sub": "0x1234567890abcdef", "name": "Test User"}
        token = create_access_token(data)

        # Mock credentials
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer", credentials=token
        )

        # Get current user
        user_data = get_current_user(credentials)

        assert user_data is not None
        assert user_data["sub"] == "0x1234567890abcdef"
        assert user_data["name"] == "Test User"

    def test_get_current_user_with_expired_token(self):
        """Test that expired token raises 401 Unauthorized."""
        from app.core.security import create_access_token
        from app.api.dependencies import get_current_user

        # Create expired token
        data = {"sub": "0x1234567890abcdef"}
        token = create_access_token(data, expires_delta=timedelta(seconds=-1))

        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer", credentials=token
        )

        # Should raise HTTPException with 401 status
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(credentials)

        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Could not validate credentials" in str(exc_info.value.detail)

    def test_get_current_user_with_invalid_token(self):
        """Test that invalid token raises 401 Unauthorized."""
        from app.api.dependencies import get_current_user

        # Invalid token format
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer", credentials="invalid.token.here"
        )

        with pytest.raises(HTTPException) as exc_info:
            get_current_user(credentials)

        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_current_user_with_tampered_token(self):
        """Test that tampered token raises 401 Unauthorized."""
        from app.core.security import create_access_token
        from app.api.dependencies import get_current_user

        # Create valid token then tamper with it
        data = {"sub": "0x1234567890abcdef"}
        token = create_access_token(data)

        # Tamper with last character
        tampered_token = token[:-1] + ("a" if token[-1] != "a" else "b")

        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer", credentials=tampered_token
        )

        with pytest.raises(HTTPException) as exc_info:
            get_current_user(credentials)

        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_current_user_with_missing_sub(self):
        """Test that token without 'sub' claim raises 401."""
        from app.core.security import create_access_token
        from app.api.dependencies import get_current_user

        # Create token without 'sub' claim
        data = {"name": "Test User"}  # Missing 'sub'
        token = create_access_token(data)

        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer", credentials=token
        )

        with pytest.raises(HTTPException) as exc_info:
            get_current_user(credentials)

        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_current_user_extracts_all_claims(self):
        """Test that all token claims are accessible."""
        from app.core.security import create_access_token
        from app.api.dependencies import get_current_user

        data = {
            "sub": "0x1234567890abcdef",
            "name": "Test User",
            "role": "admin",
            "permissions": ["read", "write"],
        }
        token = create_access_token(data)

        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer", credentials=token
        )

        user_data = get_current_user(credentials)

        assert user_data["sub"] == "0x1234567890abcdef"
        assert user_data["name"] == "Test User"
        assert user_data["role"] == "admin"
        assert user_data["permissions"] == ["read", "write"]


class TestGetCurrentUserPerformance:
    """Test get_current_user performance."""

    def test_dependency_execution_performance(self):
        """Test dependency executes within 10ms per call."""
        from app.core.security import create_access_token
        from app.api.dependencies import get_current_user

        data = {"sub": "0x1234567890abcdef"}
        token = create_access_token(data)

        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer", credentials=token
        )

        # Measure 100 executions
        start_time = time.time()
        for _ in range(100):
            get_current_user(credentials)
        elapsed_time = time.time() - start_time

        # 100 calls should complete in < 10ms
        assert elapsed_time < 0.01, f"Dependency too slow: {elapsed_time}s"


class TestGetCurrentUserOptional:
    """Test get_current_user_optional FastAPI dependency."""

    def test_get_current_user_optional_with_valid_token(self):
        """Test optional dependency returns user with valid token."""
        from app.core.security import create_access_token
        from app.api.dependencies import get_current_user_optional

        data = {"sub": "0x1234567890abcdef"}
        token = create_access_token(data)

        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer", credentials=token
        )

        user_data = get_current_user_optional(credentials)

        assert user_data is not None
        assert user_data["sub"] == "0x1234567890abcdef"

    def test_get_current_user_optional_without_token(self):
        """Test optional dependency returns None without token."""
        from app.api.dependencies import get_current_user_optional

        # No credentials provided
        user_data = get_current_user_optional(None)

        # Should return None, not raise exception
        assert user_data is None

    def test_get_current_user_optional_with_invalid_token(self):
        """Test optional dependency returns None with invalid token."""
        from app.api.dependencies import get_current_user_optional

        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer", credentials="invalid.token"
        )

        # Should return None, not raise exception
        user_data = get_current_user_optional(credentials)
        assert user_data is None


class TestAuthenticationSchemas:
    """Test authentication schemas."""

    def test_token_response_schema(self):
        """Test TokenResponse schema validation."""
        from app.schemas.auth import TokenResponse

        token_response = TokenResponse(
            access_token="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
            refresh_token="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
            token_type="bearer",
        )

        assert token_response.access_token.startswith("eyJ")
        assert token_response.refresh_token.startswith("eyJ")
        assert token_response.token_type == "bearer"

    def test_token_data_schema(self):
        """Test TokenData schema validation."""
        from app.schemas.auth import TokenData

        token_data = TokenData(sub="0x1234567890abcdef", exp=1234567890)

        assert token_data.sub == "0x1234567890abcdef"
        assert token_data.exp == 1234567890

    def test_token_data_optional_fields(self):
        """Test TokenData with optional fields."""
        from app.schemas.auth import TokenData

        token_data = TokenData(
            sub="0x1234567890abcdef",
            exp=1234567890,
            name="Test User",
            role="admin",
        )

        assert token_data.name == "Test User"
        assert token_data.role == "admin"
