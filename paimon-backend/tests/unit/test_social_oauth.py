"""
Unit tests for social OAuth verification.

Tests:
1. Functional: Token verification for Email/Google/X
2. Boundary: Invalid token, expired token
3. Exception: Network errors, malformed response
4. Performance: Token verification < 200ms
5. Security: Token validation strict
6. Compatibility: Different OAuth providers
"""

import httpx
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


class TestOAuthTokenVerification:
    """Test OAuth token verification for different providers."""

    @pytest.mark.asyncio
    async def test_verify_google_token_success(self):
        """Test verifying valid Google OAuth token."""
        from app.core.social_oauth import verify_oauth_token

        # Mock Google OAuth verification
        token = "ya29.a0AfH6SMBvalidGoogleToken"
        provider = "google"

        # Expected user info from Google
        expected_user_info = {
            "email": "user@gmail.com",
            "email_verified": True,
            "sub": "google_user_id_12345",
            "name": "Test User",
        }

        with patch("httpx.AsyncClient.get") as mock_get:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json = MagicMock(return_value=expected_user_info)
            mock_get.return_value = mock_response

            result = await verify_oauth_token(token, provider)

            assert result is not None
            assert result["email"] == "user@gmail.com"
            assert result["sub"] == "google_user_id_12345"
            assert result["email_verified"] is True

    @pytest.mark.asyncio
    async def test_verify_email_token_success(self):
        """Test verifying valid Email OAuth token."""
        from app.core.social_oauth import verify_oauth_token

        token = "email_token_valid_12345"
        provider = "email"

        expected_user_info = {
            "email": "user@example.com",
            "email_verified": True,
            "sub": "email_user_id_67890",
        }

        with patch("httpx.AsyncClient.post") as mock_post:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json = MagicMock(return_value=expected_user_info)
            mock_post.return_value = mock_response

            result = await verify_oauth_token(token, provider)

            assert result is not None
            assert result["email"] == "user@example.com"
            assert "sub" in result

    @pytest.mark.asyncio
    async def test_verify_x_token_success(self):
        """Test verifying valid X (Twitter) OAuth token."""
        from app.core.social_oauth import verify_oauth_token

        token = "x_token_valid_twitter"
        provider = "x"

        # X API wraps user data in "data" object
        expected_api_response = {
            "data": {
                "id": "x_user_id_twitter_123",
                "username": "test_user",
                "name": "Test User",
            }
        }

        with patch("httpx.AsyncClient.get") as mock_get:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json = MagicMock(return_value=expected_api_response)
            mock_get.return_value = mock_response

            result = await verify_oauth_token(token, provider)

            assert result is not None
            assert "id" in result or "sub" in result
            assert "username" in result

    @pytest.mark.asyncio
    async def test_verify_token_invalid(self):
        """Test verifying invalid OAuth token."""
        from app.core.social_oauth import verify_oauth_token

        token = "invalid_token_12345"
        provider = "google"

        with patch("httpx.AsyncClient.get") as mock_get:
            mock_response = MagicMock()
            mock_response.status_code = 401
            mock_response.json = MagicMock(return_value={"error": "invalid_token"})
            mock_get.return_value = mock_response

            result = await verify_oauth_token(token, provider)

            assert result is None

    @pytest.mark.asyncio
    async def test_verify_token_network_error(self):
        """Test handling network errors during token verification."""
        from app.core.social_oauth import verify_oauth_token

        token = "valid_token"
        provider = "google"

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = MagicMock()
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            # Use httpx.RequestError instead of generic Exception
            mock_client.get = AsyncMock(side_effect=httpx.RequestError("Network error"))
            mock_client_class.return_value = mock_client

            result = await verify_oauth_token(token, provider)

            assert result is None

    @pytest.mark.asyncio
    async def test_verify_token_malformed_response(self):
        """Test handling malformed response from OAuth provider."""
        from app.core.social_oauth import verify_oauth_token

        token = "valid_token"
        provider = "google"

        with patch("httpx.AsyncClient.get") as mock_get:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json = MagicMock(side_effect=ValueError("Invalid JSON"))
            mock_get.return_value = mock_response

            result = await verify_oauth_token(token, provider)

            assert result is None

    @pytest.mark.asyncio
    async def test_verify_token_unsupported_provider(self):
        """Test verifying token with unsupported provider."""
        from app.core.social_oauth import verify_oauth_token

        token = "valid_token"
        provider = "facebook"  # Not supported

        result = await verify_oauth_token(token, provider)

        assert result is None


class TestUserCreationFromOAuth:
    """Test user creation/update logic from OAuth data."""

    @pytest.mark.asyncio
    async def test_create_user_from_oauth_google(self):
        """Test creating new user from Google OAuth."""
        from app.core.social_oauth import get_or_create_user

        oauth_data = {
            "email": "newuser@gmail.com",
            "sub": "google_12345",
            "email_verified": True,
        }
        provider = "google"

        with patch("app.core.social_oauth.get_db_session") as mock_db:
            mock_session = AsyncMock()
            mock_db.return_value.__aenter__.return_value = mock_session

            # Mock: User doesn't exist
            mock_session.execute.return_value.scalar_one_or_none.return_value = None

            user = await get_or_create_user(oauth_data, provider)

            assert user is not None
            assert user.email == "newuser@gmail.com"
            assert user.social_provider == "google"
            assert user.social_id == "google_12345"

    @pytest.mark.asyncio
    async def test_update_existing_user_from_oauth(self):
        """Test updating existing user with OAuth data."""
        from app.core.social_oauth import get_or_create_user
        from app.models.user import User

        oauth_data = {
            "email": "existinguser@gmail.com",
            "sub": "google_67890",
        }
        provider = "google"

        with patch("app.core.social_oauth.get_db_session") as mock_db:
            mock_session = AsyncMock()
            mock_db.return_value.__aenter__.return_value = mock_session

            # Mock: User exists
            existing_user = User(
                id=1,
                email="existinguser@gmail.com",
                social_provider="google",
                social_id="google_67890",
                address=None,
                referral_code="ABC12345",
            )
            mock_session.execute.return_value.scalar_one_or_none.return_value = (
                existing_user
            )

            user = await get_or_create_user(oauth_data, provider)

            assert user is not None
            assert user.id == 1
            assert user.email == "existinguser@gmail.com"

    @pytest.mark.asyncio
    async def test_link_wallet_address_to_user(self):
        """Test linking wallet address to social login user."""
        from app.core.social_oauth import link_wallet_address
        from app.models.user import User

        user = User(
            id=1,
            email="user@gmail.com",
            social_provider="google",
            social_id="google_123",
            address=None,
            referral_code="DEF45678",
        )
        wallet_address = "0x1234567890abcdef1234567890abcdef12345678"

        with patch("app.core.social_oauth.get_db_session") as mock_db:
            mock_session = AsyncMock()
            mock_db.return_value.__aenter__.return_value = mock_session

            updated_user = await link_wallet_address(user, wallet_address, mock_session)

            assert updated_user.address == wallet_address


class TestOAuthPerformance:
    """Test OAuth operations performance."""

    @pytest.mark.asyncio
    async def test_token_verification_performance(self):
        """Test token verification is fast (< 200ms)."""
        import time
        from app.core.social_oauth import verify_oauth_token

        token = "performance_test_token"
        provider = "google"

        with patch("httpx.AsyncClient.get") as mock_get:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json = MagicMock(return_value={
                "email": "test@example.com",
                "sub": "test_123",
            })
            mock_get.return_value = mock_response

            start_time = time.time()
            await verify_oauth_token(token, provider)
            elapsed_time = time.time() - start_time

            assert (
                elapsed_time < 0.2
            ), f"Token verification too slow: {elapsed_time}s (should be < 200ms)"
