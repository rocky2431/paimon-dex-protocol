"""
Integration tests for user management API.

Tests:
1. Functional: Get user info, update user info
2. Boundary: Non-existent user, invalid address format
3. Exception: Unauthorized access, invalid fields
4. Performance: Response times < 200ms
5. Security: JWT authentication, only update own profile
6. Compatibility: With/without social login data
"""

from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import app


class TestUserManagement:
    """Test user management CRUD operations."""

    def setup_method(self):
        """Setup for each test."""
        self.client = TestClient(app)
        self.test_address = "0x1234567890abcdef1234567890abcdef12345678"
        self.other_address = "0xabcdef1234567890abcdef1234567890abcdef12"

    def teardown_method(self):
        """Clean up after each test."""
        app.dependency_overrides.clear()

    def test_get_user_success(self):
        """Test GET /api/user/:address returns user info."""
        from app.core.database import get_db
        from app.models.user import User

        # Mock database session
        async def override_get_db():
            mock_session = MagicMock()
            mock_user = User(
                id=1,
                address=self.test_address,
                email="user@example.com",
                social_provider="google",
                social_id="google_123",
                referral_code="ABC12345",
                referred_by=None,
            )
            mock_session.execute.return_value.scalar_one_or_none.return_value = (
                mock_user
            )
            yield mock_session

        app.dependency_overrides[get_db] = override_get_db

        response = self.client.get(f"/api/user/{self.test_address}")

        assert response.status_code == 200
        data = response.json()
        assert data["address"] == self.test_address
        assert data["email"] == "user@example.com"
        assert data["social_provider"] == "google"
        assert data["referral_code"] == "ABC12345"

    def test_get_user_not_found(self):
        """Test GET /api/user/:address with non-existent user."""
        from app.core.database import get_db

        async def override_get_db():
            mock_session = MagicMock()
            # Mock user not found
            mock_session.execute.return_value.scalar_one_or_none.return_value = None
            yield mock_session

        app.dependency_overrides[get_db] = override_get_db

        response = self.client.get(f"/api/user/{self.test_address}")

        assert response.status_code == 404
        assert "User not found" in response.json()["detail"]

    def test_update_user_success(self):
        """Test PUT /api/user/:address updates user info."""
        from app.core.database import get_db
        from app.core.dependencies import get_current_user
        from app.models.user import User

        # Mock authenticated user
        mock_current_user = User(
            id=1,
            address=self.test_address,
            email="user@example.com",
            social_provider="google",
            social_id="google_123",
            referral_code="ABC12345",
            referred_by=None,
        )

        async def override_get_current_user():
            return mock_current_user

        async def override_get_db():
            mock_session = MagicMock()
            # Mock user found
            mock_session.execute.return_value.scalar_one_or_none.return_value = (
                mock_current_user
            )
            # Mock commit and refresh
            mock_session.commit = MagicMock()
            mock_session.refresh = MagicMock()
            yield mock_session

        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db

        update_data = {"email": "newemail@example.com"}

        response = self.client.put(
            f"/api/user/{self.test_address}",
            json=update_data,
            headers={"Authorization": "Bearer valid_token"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["address"] == self.test_address

    def test_update_user_unauthorized_no_token(self):
        """Test PUT /api/user/:address without JWT token."""
        update_data = {"email": "newemail@example.com"}

        response = self.client.put(
            f"/api/user/{self.test_address}",
            json=update_data,
        )

        # Should require authentication
        assert response.status_code == 401

    def test_update_user_forbidden_wrong_user(self):
        """Test PUT /api/user/:address attempting to update another user."""
        from app.core.dependencies import get_current_user
        from app.models.user import User

        # Mock authenticated as different user
        mock_current_user = User(
            id=2,
            address=self.other_address,
            email="other@example.com",
            social_provider="google",
            social_id="google_456",
            referral_code="DEF67890",
            referred_by=None,
        )

        async def override_get_current_user():
            return mock_current_user

        app.dependency_overrides[get_current_user] = override_get_current_user

        update_data = {"email": "newemail@example.com"}

        response = self.client.put(
            f"/api/user/{self.test_address}",
            json=update_data,
            headers={"Authorization": "Bearer valid_token"},
        )

        # Should be forbidden
        assert response.status_code == 403
        assert "permission" in response.json()["detail"].lower()

    def test_update_user_not_found(self):
        """Test PUT /api/user/:address with non-existent user."""
        from app.core.database import get_db
        from app.core.dependencies import get_current_user
        from app.models.user import User

        mock_current_user = User(
            id=1,
            address=self.test_address,
            email="user@example.com",
            social_provider=None,
            social_id=None,
            referral_code="ABC12345",
            referred_by=None,
        )

        async def override_get_current_user():
            return mock_current_user

        async def override_get_db():
            mock_session = MagicMock()
            # Mock user not found
            mock_session.execute.return_value.scalar_one_or_none.return_value = None
            yield mock_session

        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db

        update_data = {"email": "newemail@example.com"}

        response = self.client.put(
            f"/api/user/{self.test_address}",
            json=update_data,
            headers={"Authorization": "Bearer valid_token"},
        )

        assert response.status_code == 404

    def test_update_user_invalid_email(self):
        """Test PUT /api/user/:address with invalid email format."""
        from app.core.dependencies import get_current_user
        from app.models.user import User

        mock_current_user = User(
            id=1,
            address=self.test_address,
            email="user@example.com",
            social_provider=None,
            social_id=None,
            referral_code="ABC12345",
            referred_by=None,
        )

        async def override_get_current_user():
            return mock_current_user

        app.dependency_overrides[get_current_user] = override_get_current_user

        # Invalid email format
        update_data = {"email": "not-an-email"}

        response = self.client.put(
            f"/api/user/{self.test_address}",
            json=update_data,
            headers={"Authorization": "Bearer valid_token"},
        )

        # Pydantic validation should reject
        assert response.status_code == 422


class TestUserManagementPerformance:
    """Test user management performance."""

    def setup_method(self):
        """Setup for each test."""
        self.client = TestClient(app)
        self.test_address = "0x1234567890abcdef1234567890abcdef12345678"

    def teardown_method(self):
        """Clean up after each test."""
        app.dependency_overrides.clear()

    def test_get_user_response_time(self):
        """Test GET /api/user/:address response time < 200ms."""
        import time

        from app.core.database import get_db
        from app.models.user import User

        async def override_get_db():
            mock_session = MagicMock()
            mock_user = User(
                id=1,
                address=self.test_address,
                email="perf@test.com",
                social_provider=None,
                social_id=None,
                referral_code="PERF1234",
                referred_by=None,
            )
            mock_session.execute.return_value.scalar_one_or_none.return_value = (
                mock_user
            )
            yield mock_session

        app.dependency_overrides[get_db] = override_get_db

        start_time = time.time()
        response = self.client.get(f"/api/user/{self.test_address}")
        elapsed_time = time.time() - start_time

        assert response.status_code == 200
        assert (
            elapsed_time < 0.2
        ), f"Get user too slow: {elapsed_time}s (should be < 200ms)"


class TestUserManagementSecurity:
    """Test user management security features."""

    def setup_method(self):
        """Setup for each test."""
        self.client = TestClient(app)
        self.test_address = "0x1234567890abcdef1234567890abcdef12345678"

    def teardown_method(self):
        """Clean up after each test."""
        app.dependency_overrides.clear()

    def test_jwt_authentication_required_for_update(self):
        """Test that JWT authentication is required for PUT endpoint."""
        update_data = {"email": "test@example.com"}

        response = self.client.put(
            f"/api/user/{self.test_address}",
            json=update_data,
        )

        # Should require authentication
        assert response.status_code == 401

    def test_cannot_update_protected_fields(self):
        """Test that protected fields cannot be updated via schema."""
        from app.core.database import get_db
        from app.core.dependencies import get_current_user
        from app.models.user import User

        mock_current_user = User(
            id=1,
            address=self.test_address,
            email="user@example.com",
            social_provider=None,
            social_id=None,
            referral_code="ABC12345",
            referred_by=None,
        )

        async def override_get_current_user():
            return mock_current_user

        async def override_get_db():
            mock_session = MagicMock()
            mock_session.execute.return_value.scalar_one_or_none.return_value = (
                mock_current_user
            )
            mock_session.commit = MagicMock()
            mock_session.refresh = MagicMock()
            yield mock_session

        app.dependency_overrides[get_current_user] = override_get_current_user
        app.dependency_overrides[get_db] = override_get_db

        # Attempt to update protected fields
        update_data = {
            "address": "0xnewaddress",
            "referral_code": "NEWCODE",
        }

        response = self.client.put(
            f"/api/user/{self.test_address}",
            json=update_data,
            headers={"Authorization": "Bearer valid_token"},
        )

        # Schema should reject unknown fields (extra="forbid")
        assert response.status_code == 422
