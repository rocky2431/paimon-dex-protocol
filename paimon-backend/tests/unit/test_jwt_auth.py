"""
Unit tests for JWT authentication module.

Tests:
1. Functional: JWT generation and validation
2. Boundary: Token expiration and edge cases
3. Exception: Invalid tokens and error handling
4. Performance: Token operations < 100ms
5. Security: Token tampering detection
6. Compatibility: Different payload types
"""

import time
from datetime import datetime, timedelta, UTC

import pytest
from jose import jwt, JWTError


class TestJWTGeneration:
    """Test JWT token generation."""

    def test_create_access_token_success(self):
        """Test creating a valid access token."""
        from app.core.security import create_access_token

        data = {"sub": "0x1234567890abcdef"}
        token = create_access_token(data)

        assert isinstance(token, str)
        assert len(token) > 0
        # Token should have 3 parts (header.payload.signature)
        assert token.count(".") == 2

    def test_create_access_token_with_expiration(self):
        """Test creating access token with custom expiration."""
        from app.core.security import create_access_token

        data = {"sub": "0x1234567890abcdef"}
        expires_delta = timedelta(minutes=30)
        token = create_access_token(data, expires_delta=expires_delta)

        # Decode without verification to check expiration
        from app.core.config import settings

        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )

        # Check expiration is approximately 30 minutes from now
        exp_time = datetime.fromtimestamp(payload["exp"], tz=UTC)
        now = datetime.now(UTC)
        time_diff = (exp_time - now).total_seconds()

        # Should be close to 30 minutes (allow 5 second tolerance)
        assert 1795 < time_diff < 1805

    def test_create_access_token_default_expiration(self):
        """Test access token uses default 15 minute expiration."""
        from app.core.security import create_access_token

        data = {"sub": "0x1234567890abcdef"}
        token = create_access_token(data)

        from app.core.config import settings

        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )

        # Check expiration is approximately 15 minutes from now
        exp_time = datetime.fromtimestamp(payload["exp"], tz=UTC)
        now = datetime.now(UTC)
        time_diff = (exp_time - now).total_seconds()

        # Should be close to 15 minutes (allow 5 second tolerance)
        assert 895 < time_diff < 905

    def test_create_refresh_token_success(self):
        """Test creating a valid refresh token."""
        from app.core.security import create_refresh_token

        data = {"sub": "0x1234567890abcdef"}
        token = create_refresh_token(data)

        assert isinstance(token, str)
        assert len(token) > 0
        assert token.count(".") == 2

    def test_create_refresh_token_long_expiration(self):
        """Test refresh token has 7-day expiration."""
        from app.core.security import create_refresh_token

        data = {"sub": "0x1234567890abcdef"}
        token = create_refresh_token(data)

        from app.core.config import settings

        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )

        # Check expiration is approximately 7 days from now
        exp_time = datetime.fromtimestamp(payload["exp"], tz=UTC)
        now = datetime.now(UTC)
        time_diff = (exp_time - now).total_seconds()

        # Should be close to 7 days (allow 5 second tolerance)
        seven_days_seconds = 7 * 24 * 60 * 60
        assert seven_days_seconds - 5 < time_diff < seven_days_seconds + 5


class TestJWTValidation:
    """Test JWT token validation."""

    def test_decode_token_success(self):
        """Test decoding a valid token."""
        from app.core.security import create_access_token, decode_token

        data = {"sub": "0x1234567890abcdef", "name": "Test User"}
        token = create_access_token(data)

        payload = decode_token(token)

        assert payload is not None
        assert payload["sub"] == "0x1234567890abcdef"
        assert payload["name"] == "Test User"
        assert "exp" in payload

    def test_decode_token_expired(self):
        """Test decoding an expired token returns None."""
        from app.core.security import create_access_token, decode_token

        data = {"sub": "0x1234567890abcdef"}
        # Create token that expires immediately
        token = create_access_token(data, expires_delta=timedelta(seconds=-1))

        payload = decode_token(token)

        # Expired token should return None
        assert payload is None

    def test_decode_token_invalid_signature(self):
        """Test decoding token with invalid signature returns None."""
        from app.core.security import create_access_token, decode_token

        data = {"sub": "0x1234567890abcdef"}
        token = create_access_token(data)

        # Tamper with the token by changing last character
        tampered_token = token[:-1] + ("a" if token[-1] != "a" else "b")

        payload = decode_token(tampered_token)

        # Tampered token should return None
        assert payload is None

    def test_decode_token_malformed(self):
        """Test decoding malformed token returns None."""
        from app.core.security import decode_token

        malformed_tokens = [
            "not.a.token",
            "invalid",
            "",
            "a.b",  # Missing part
            "a.b.c.d",  # Too many parts
        ]

        for token in malformed_tokens:
            payload = decode_token(token)
            assert payload is None, f"Malformed token should return None: {token}"

    def test_decode_token_wrong_algorithm(self):
        """Test token signed with wrong algorithm is rejected."""
        from app.core.config import settings

        data = {"sub": "0x1234567890abcdef"}

        # Create token with different algorithm
        wrong_token = jwt.encode(data, settings.JWT_SECRET, algorithm="HS512")

        from app.core.security import decode_token

        payload = decode_token(wrong_token)

        # Token with wrong algorithm should be rejected
        assert payload is None


class TestRefreshTokenMechanism:
    """Test refresh token mechanism."""

    def test_refresh_access_token_success(self):
        """Test refreshing access token with valid refresh token."""
        from app.core.security import (
            create_refresh_token,
            refresh_access_token,
        )

        data = {"sub": "0x1234567890abcdef"}
        refresh_token = create_refresh_token(data)

        # Refresh the access token
        new_access_token = refresh_access_token(refresh_token)

        assert new_access_token is not None
        assert isinstance(new_access_token, str)
        assert new_access_token.count(".") == 2

        # Verify the new token contains the same subject
        from app.core.security import decode_token

        payload = decode_token(new_access_token)
        assert payload["sub"] == "0x1234567890abcdef"

    def test_refresh_access_token_with_expired_refresh_token(self):
        """Test refreshing with expired refresh token returns None."""
        from app.core.security import create_access_token, refresh_access_token

        data = {"sub": "0x1234567890abcdef"}
        # Create expired refresh token
        expired_token = create_access_token(data, expires_delta=timedelta(seconds=-1))

        new_token = refresh_access_token(expired_token)

        # Should return None for expired refresh token
        assert new_token is None

    def test_refresh_access_token_with_invalid_token(self):
        """Test refreshing with invalid token returns None."""
        from app.core.security import refresh_access_token

        invalid_token = "invalid.token.here"

        new_token = refresh_access_token(invalid_token)

        # Should return None for invalid token
        assert new_token is None


class TestJWTPerformance:
    """Test JWT operations performance."""

    def test_token_generation_performance(self):
        """Test token generation completes within 100ms."""
        from app.core.security import create_access_token

        data = {"sub": "0x1234567890abcdef"}

        start_time = time.time()
        for _ in range(100):
            create_access_token(data)
        elapsed_time = time.time() - start_time

        # 100 token generations should complete in < 100ms
        assert elapsed_time < 0.1, f"Token generation too slow: {elapsed_time}s"

    def test_token_validation_performance(self):
        """Test token validation completes within 100ms."""
        from app.core.security import create_access_token, decode_token

        data = {"sub": "0x1234567890abcdef"}
        token = create_access_token(data)

        start_time = time.time()
        for _ in range(100):
            decode_token(token)
        elapsed_time = time.time() - start_time

        # 100 token validations should complete in < 100ms
        assert elapsed_time < 0.1, f"Token validation too slow: {elapsed_time}s"


class TestJWTSecurity:
    """Test JWT security aspects."""

    def test_tokens_are_different_each_time(self):
        """Test that generating multiple tokens produces different values."""
        from app.core.security import create_access_token
        import time

        data = {"sub": "0x1234567890abcdef"}

        token1 = create_access_token(data)
        # Sleep for 1 second to ensure different exp timestamp
        time.sleep(1)
        token2 = create_access_token(data)

        # Tokens should be different due to different exp timestamps
        assert token1 != token2

    def test_token_cannot_be_modified(self):
        """Test that modifying token payload invalidates signature."""
        from app.core.security import create_access_token, decode_token
        from app.core.config import settings

        data = {"sub": "0x1234567890abcdef", "role": "user"}
        token = create_access_token(data)

        # Decode and modify payload
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        payload["role"] = "admin"  # Attempt to escalate privileges

        # Re-encode with modified payload but same signature
        parts = token.split(".")
        import json
        import base64

        modified_payload = base64.urlsafe_b64encode(
            json.dumps(payload).encode()
        ).decode()
        tampered_token = f"{parts[0]}.{modified_payload}.{parts[2]}"

        # Tampered token should be rejected
        result = decode_token(tampered_token)
        assert result is None


class TestJWTCompatibility:
    """Test JWT compatibility with different data types."""

    def test_token_with_various_data_types(self):
        """Test token generation with various payload data types."""
        from app.core.security import create_access_token, decode_token

        test_cases = [
            {"sub": "0x1234", "count": 42},
            {"sub": "0x1234", "active": True},
            {"sub": "0x1234", "rate": 3.14},
            {"sub": "0x1234", "tags": ["admin", "user"]},
            {"sub": "0x1234", "meta": {"key": "value"}},
        ]

        for data in test_cases:
            token = create_access_token(data)
            payload = decode_token(token)

            assert payload is not None
            for key, value in data.items():
                assert payload[key] == value

    def test_token_with_unicode_characters(self):
        """Test token generation with Unicode characters."""
        from app.core.security import create_access_token, decode_token

        data = {"sub": "0x1234", "name": "用户名", "emoji": "🚀"}
        token = create_access_token(data)
        payload = decode_token(token)

        assert payload is not None
        assert payload["name"] == "用户名"
        assert payload["emoji"] == "🚀"
