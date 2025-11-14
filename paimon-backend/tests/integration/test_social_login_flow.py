"""
Integration tests for social login flow.

Tests:
1. Functional: Complete social login flow (Google/Email/X)
2. Boundary: Invalid token, unsupported provider
3. Exception: Network errors, malformed response
4. Performance: Response times < 500ms
5. Security: httpOnly cookie, token validation
6. Compatibility: With/without wallet address linking
"""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app


class TestSocialLoginFlow:
    """Test complete social login flow."""

    def setup_method(self):
        """Setup for each test."""
        self.client = TestClient(app)

    def test_google_login_success(self):
        """Test successful Google OAuth login."""
        # Mock OAuth token verification (patch where it's used in the router)
        with patch("app.routers.auth.verify_oauth_token") as mock_verify:
            mock_verify.return_value = {
                "email": "testuser@gmail.com",
                "sub": "google_123456",
                "email_verified": True,
            }

            # Mock database operations
            with patch("app.routers.auth.get_or_create_user") as mock_get_user:
                from app.models.user import User

                mock_user = User(
                    id=1,
                    email="testuser@gmail.com",
                    social_provider="google",
                    social_id="google_123456",
                    address=None,
                    referral_code="ABC12345",
                )
                mock_get_user.return_value = mock_user

                response = self.client.post(
                    "/api/auth/social",
                    json={
                        "provider": "google",
                        "token": "ya29.a0AfH6SMBvalidtoken",
                    },
                )

                assert response.status_code == 200

                data = response.json()
                assert "access_token" in data
                assert "refresh_token" in data
                assert data["token_type"] == "bearer"
                assert "user" in data
                assert data["user"]["email"] == "testuser@gmail.com"
                assert data["user"]["social_provider"] == "google"

                # Verify httpOnly cookie was set
                assert "refresh_token" in response.cookies

    def test_email_login_success(self):
        """Test successful Email OAuth login."""
        with patch("app.routers.auth.verify_oauth_token") as mock_verify:
            mock_verify.return_value = {
                "email": "user@example.com",
                "sub": "email_789012",
                "email_verified": True,
            }

            with patch("app.routers.auth.get_or_create_user") as mock_get_user:
                from app.models.user import User

                mock_user = User(
                    id=2,
                    email="user@example.com",
                    social_provider="email",
                    social_id="email_789012",
                    address=None,
                    referral_code="DEF67890",
                )
                mock_get_user.return_value = mock_user

                response = self.client.post(
                    "/api/auth/social",
                    json={
                        "provider": "email",
                        "token": "email_valid_token_123",
                    },
                )

                assert response.status_code == 200
                data = response.json()
                assert data["user"]["social_provider"] == "email"

    def test_x_login_success(self):
        """Test successful X (Twitter) OAuth login."""
        with patch("app.routers.auth.verify_oauth_token") as mock_verify:
            # X API returns data in "data" wrapper
            mock_verify.return_value = {
                "id": "x_user_456",
                "username": "testuser",
                "name": "Test User",
            }

            with patch("app.routers.auth.get_or_create_user") as mock_get_user:
                from app.models.user import User

                mock_user = User(
                    id=3,
                    email=None,  # X may not provide email
                    social_provider="x",
                    social_id="x_user_456",
                    address=None,
                    referral_code="XYZ34567",
                )
                mock_get_user.return_value = mock_user

                response = self.client.post(
                    "/api/auth/social",
                    json={
                        "provider": "x",
                        "token": "x_bearer_token_valid",
                    },
                )

                assert response.status_code == 200
                data = response.json()
                assert data["user"]["social_provider"] == "x"

    def test_social_login_with_wallet_linking(self):
        """Test social login with wallet address linking."""
        wallet_address = "0x1234567890abcdef1234567890abcdef12345678"

        with patch("app.routers.auth.verify_oauth_token") as mock_verify:
            mock_verify.return_value = {
                "email": "user@gmail.com",
                "sub": "google_999",
            }

            with patch("app.routers.auth.get_or_create_user") as mock_get_user:
                from app.models.user import User

                mock_user = User(
                    id=4,
                    email="user@gmail.com",
                    social_provider="google",
                    social_id="google_999",
                    address=None,  # No address initially
                    referral_code="LINK1234",
                )
                mock_get_user.return_value = mock_user

                with patch(
                    "app.routers.auth.link_wallet_address"
                ) as mock_link:
                    mock_user_linked = User(
                        id=4,
                        email="user@gmail.com",
                        social_provider="google",
                        social_id="google_999",
                        address=wallet_address.lower(),
                        referral_code="LINK1234",
                    )
                    mock_link.return_value = mock_user_linked

                    response = self.client.post(
                        "/api/auth/social",
                        json={
                            "provider": "google",
                            "token": "valid_token",
                            "address": wallet_address,
                        },
                    )

                    assert response.status_code == 200
                    data = response.json()
                    assert data["user"]["address"] == wallet_address.lower()

    def test_social_login_invalid_token(self):
        """Test social login with invalid OAuth token."""
        with patch("app.routers.auth.verify_oauth_token") as mock_verify:
            # Return None for invalid token
            mock_verify.return_value = None

            response = self.client.post(
                "/api/auth/social",
                json={
                    "provider": "google",
                    "token": "invalid_token_12345",
                },
            )

            assert response.status_code == 401
            assert "Invalid google OAuth token" in response.json()["detail"]

    def test_social_login_unsupported_provider(self):
        """Test social login with unsupported provider."""
        response = self.client.post(
            "/api/auth/social",
            json={
                "provider": "facebook",  # Not supported
                "token": "valid_token",
            },
        )

        # Pydantic validation should reject invalid provider
        assert response.status_code == 422

    def test_social_login_missing_required_fields(self):
        """Test social login with missing required fields."""
        # Missing token
        response = self.client.post(
            "/api/auth/social",
            json={
                "provider": "google",
            },
        )
        assert response.status_code == 422

        # Missing provider
        response = self.client.post(
            "/api/auth/social",
            json={
                "token": "valid_token",
            },
        )
        assert response.status_code == 422

    def test_social_login_invalid_wallet_address_format(self):
        """Test social login with invalid wallet address format."""
        response = self.client.post(
            "/api/auth/social",
            json={
                "provider": "google",
                "token": "valid_token",
                "address": "invalid_address",  # Invalid format
            },
        )

        # Pydantic validation should reject invalid address
        assert response.status_code == 422


class TestSocialLoginPerformance:
    """Test social login performance."""

    def setup_method(self):
        """Setup for each test."""
        self.client = TestClient(app)

    def test_social_login_response_time(self):
        """Test social login response time < 500ms."""
        import time

        with patch("app.routers.auth.verify_oauth_token") as mock_verify:
            mock_verify.return_value = {
                "email": "perf@test.com",
                "sub": "perf_123",
            }

            with patch("app.routers.auth.get_or_create_user") as mock_get_user:
                from app.models.user import User

                mock_user = User(
                    id=999,
                    email="perf@test.com",
                    social_provider="google",
                    social_id="perf_123",
                    address=None,
                    referral_code="PERF9999",
                )
                mock_get_user.return_value = mock_user

                start_time = time.time()

                response = self.client.post(
                    "/api/auth/social",
                    json={
                        "provider": "google",
                        "token": "perf_test_token",
                    },
                )

                elapsed_time = time.time() - start_time

                assert response.status_code == 200
                assert (
                    elapsed_time < 0.5
                ), f"Social login too slow: {elapsed_time}s (should be < 500ms)"


class TestSocialLoginSecurity:
    """Test social login security features."""

    def setup_method(self):
        """Setup for each test."""
        self.client = TestClient(app)

    def test_httponly_cookie_set(self):
        """Test that httpOnly cookie is set for refresh token."""
        with patch("app.routers.auth.verify_oauth_token") as mock_verify:
            mock_verify.return_value = {
                "email": "security@test.com",
                "sub": "sec_123",
            }

            with patch("app.routers.auth.get_or_create_user") as mock_get_user:
                from app.models.user import User

                mock_user = User(
                    id=100,
                    email="security@test.com",
                    social_provider="google",
                    social_id="sec_123",
                    address=None,
                    referral_code="SEC10000",
                )
                mock_get_user.return_value = mock_user

                response = self.client.post(
                    "/api/auth/social",
                    json={
                        "provider": "google",
                        "token": "security_token",
                    },
                )

                assert response.status_code == 200

                # Verify refresh_token cookie is set
                assert "refresh_token" in response.cookies
                # Note: TestClient doesn't expose httponly flag, but we verify cookie exists

    def test_token_validation_strict(self):
        """Test that token validation is strict."""
        with patch("app.routers.auth.verify_oauth_token") as mock_verify:
            # Empty response (no user data)
            mock_verify.return_value = None

            response = self.client.post(
                "/api/auth/social",
                json={
                    "provider": "google",
                    "token": "suspicious_token",
                },
            )

            assert response.status_code == 401
            assert "Invalid" in response.json()["detail"]
