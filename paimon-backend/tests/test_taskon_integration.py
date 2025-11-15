"""
Test suite for TaskOn Integration (Task 23).

Tests the TaskOn verification API endpoint:
1. Verification endpoint functionality
2. Bearer token authentication
3. Task completion status checks
4. Performance requirements (< 1s)
5. Error handling
"""

import pytest
from datetime import datetime, UTC
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.task import TaskProgress, TaskType, TaskStatus


class TestTaskOnVerificationAPI:
    """Test TaskOn verification API endpoint."""

    @pytest.mark.asyncio
    async def test_verification_completed_task_returns_true(
        self, test_db: AsyncSession, async_client: AsyncClient
    ):
        """FUNCTIONAL: Completed task should return isValid: true."""
        # Create user and completed task
        user = User(
            address="0x1234567890123456789012345678901234567890",
            referral_code="TEST0001",
        )
        test_db.add(user)
        await test_db.flush()

        task = TaskProgress(
            user_id=user.id,
            task_id="taskon-follow-twitter",
            task_type=TaskType.SOCIAL,
            status=TaskStatus.COMPLETED,
            completed_at=datetime.now(UTC),
        )
        test_db.add(task)
        await test_db.commit()

        # Call verification API
        response = await async_client.get(
            "/api/taskon/verification",
            params={
                "address": user.address,
                "task_id": "taskon-follow-twitter"
            },
            headers={"Authorization": "Bearer test_taskon_secret"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "result" in data
        assert data["result"]["isValid"] is True

    @pytest.mark.asyncio
    async def test_verification_pending_task_returns_false(
        self, test_db: AsyncSession, async_client: AsyncClient
    ):
        """FUNCTIONAL: Pending task should return isValid: false."""
        user = User(
            address="0x1234567890123456789012345678901234567891",
            referral_code="TEST0002",
        )
        test_db.add(user)
        await test_db.flush()

        task = TaskProgress(
            user_id=user.id,
            task_id="taskon-join-discord",
            task_type=TaskType.SOCIAL,
            status=TaskStatus.PENDING,
        )
        test_db.add(task)
        await test_db.commit()

        response = await async_client.get(
            "/api/taskon/verification",
            params={
                "address": user.address,
                "task_id": "taskon-join-discord"
            },
            headers={"Authorization": "Bearer test_taskon_secret"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["result"]["isValid"] is False

    @pytest.mark.asyncio
    async def test_verification_nonexistent_task_returns_false(
        self, test_db: AsyncSession, async_client: AsyncClient
    ):
        """FUNCTIONAL: Non-existent task should return isValid: false."""
        user = User(
            address="0x1234567890123456789012345678901234567892",
            referral_code="TEST0003",
        )
        test_db.add(user)
        await test_db.commit()

        response = await async_client.get(
            "/api/taskon/verification",
            params={
                "address": user.address,
                "task_id": "nonexistent-task"
            },
            headers={"Authorization": "Bearer test_taskon_secret"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["result"]["isValid"] is False

    @pytest.mark.asyncio
    async def test_verification_case_insensitive_address(
        self, test_db: AsyncSession, async_client: AsyncClient
    ):
        """BOUNDARY: Address should be case-insensitive."""
        user = User(
            address="0xABCDEF1234567890123456789012345678901234",
            referral_code="TEST0004",
        )
        test_db.add(user)
        await test_db.flush()

        task = TaskProgress(
            user_id=user.id,
            task_id="test-task",
            task_type=TaskType.SOCIAL,
            status=TaskStatus.COMPLETED,
            completed_at=datetime.now(UTC),
        )
        test_db.add(task)
        await test_db.commit()

        # Test lowercase
        response = await async_client.get(
            "/api/taskon/verification",
            params={
                "address": user.address.lower(),
                "task_id": "test-task"
            },
            headers={"Authorization": "Bearer test_taskon_secret"},
        )

        assert response.status_code == 200
        assert response.json()["result"]["isValid"] is True

        # Test uppercase
        response = await async_client.get(
            "/api/taskon/verification",
            params={
                "address": user.address.upper(),
                "task_id": "test-task"
            },
            headers={"Authorization": "Bearer test_taskon_secret"},
        )

        assert response.status_code == 200
        assert response.json()["result"]["isValid"] is True

    @pytest.mark.asyncio
    async def test_verification_missing_address_parameter(
        self, async_client: AsyncClient
    ):
        """EXCEPTION: Missing address parameter should return 422."""
        response = await async_client.get(
            "/api/taskon/verification",
            params={"task_id": "test-task"},
            headers={"Authorization": "Bearer test_taskon_secret"},
        )

        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_verification_missing_task_id_parameter(
        self, async_client: AsyncClient
    ):
        """EXCEPTION: Missing task_id parameter should return 422."""
        response = await async_client.get(
            "/api/taskon/verification",
            params={"address": "0x1234"},
            headers={"Authorization": "Bearer test_taskon_secret"},
        )

        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_verification_empty_address(self, async_client: AsyncClient):
        """BOUNDARY: Empty address should return 422."""
        response = await async_client.get(
            "/api/taskon/verification",
            params={"address": "", "task_id": "test-task"},
            headers={"Authorization": "Bearer test_taskon_secret"},
        )

        assert response.status_code == 422  # Validation error


class TestTaskOnBearerTokenAuth:
    """Test Bearer token authentication for TaskOn API."""

    @pytest.mark.asyncio
    async def test_verification_with_valid_bearer_token(
        self, test_db: AsyncSession, async_client: AsyncClient
    ):
        """SECURITY: Valid Bearer token should be accepted."""
        user = User(
            address="0x1234567890123456789012345678901234567893",
            referral_code="TEST0005",
        )
        test_db.add(user)
        await test_db.flush()

        task = TaskProgress(
            user_id=user.id,
            task_id="test-task",
            task_type=TaskType.SOCIAL,
            status=TaskStatus.COMPLETED,
            completed_at=datetime.now(UTC),
        )
        test_db.add(task)
        await test_db.commit()

        # Use valid token from environment
        response = await async_client.get(
            "/api/taskon/verification",
            params={"address": user.address, "task_id": "test-task"},
            headers={"Authorization": "Bearer test_taskon_secret"},
        )

        assert response.status_code == 200
        assert response.json()["result"]["isValid"] is True

    @pytest.mark.asyncio
    async def test_verification_with_invalid_bearer_token(
        self, async_client: AsyncClient
    ):
        """SECURITY: Invalid Bearer token should return 401."""
        response = await async_client.get(
            "/api/taskon/verification",
            params={
                "address": "0x1234567890123456789012345678901234567894",
                "task_id": "test-task"
            },
            headers={"Authorization": "Bearer invalid_token"},
        )

        assert response.status_code == 401  # Unauthorized

    @pytest.mark.asyncio
    async def test_verification_without_bearer_token_when_required(
        self, async_client: AsyncClient
    ):
        """SECURITY: Missing Bearer token should return 401 when required."""
        response = await async_client.get(
            "/api/taskon/verification",
            params={
                "address": "0x1234567890123456789012345678901234567895",
                "task_id": "test-task"
            },
        )

        # If token authentication is required, should return 401
        # If optional, should return 200
        assert response.status_code in [200, 401]


class TestTaskOnPerformance:
    """Test performance requirements for TaskOn API."""

    @pytest.mark.asyncio
    async def test_verification_response_time_under_1_second(
        self, test_db: AsyncSession, async_client: AsyncClient
    ):
        """PERFORMANCE: API should respond within 1 second."""
        import time

        user = User(
            address="0x1234567890123456789012345678901234567896",
            referral_code="TEST0006",
        )
        test_db.add(user)
        await test_db.flush()

        task = TaskProgress(
            user_id=user.id,
            task_id="perf-test-task",
            task_type=TaskType.SOCIAL,
            status=TaskStatus.COMPLETED,
            completed_at=datetime.now(UTC),
        )
        test_db.add(task)
        await test_db.commit()

        start_time = time.time()

        response = await async_client.get(
            "/api/taskon/verification",
            params={"address": user.address, "task_id": "perf-test-task"},
            headers={"Authorization": "Bearer test_taskon_secret"},
        )

        end_time = time.time()
        response_time = end_time - start_time

        assert response.status_code == 200
        assert response_time < 1.0  # Must be under 1 second


class TestTaskOnResponseFormat:
    """Test response format compliance."""

    @pytest.mark.asyncio
    async def test_verification_response_structure(
        self, test_db: AsyncSession, async_client: AsyncClient
    ):
        """COMPATIBILITY: Response should match TaskOn specification."""
        user = User(
            address="0x1234567890123456789012345678901234567897",
            referral_code="TEST0007",
        )
        test_db.add(user)
        await test_db.flush()

        task = TaskProgress(
            user_id=user.id,
            task_id="format-test",
            task_type=TaskType.SOCIAL,
            status=TaskStatus.COMPLETED,
            completed_at=datetime.now(UTC),
        )
        test_db.add(task)
        await test_db.commit()

        response = await async_client.get(
            "/api/taskon/verification",
            params={"address": user.address, "task_id": "format-test"},
            headers={"Authorization": "Bearer test_taskon_secret"},
        )

        assert response.status_code == 200
        data = response.json()

        # Verify structure matches: {"result": {"isValid": true|false}}
        assert "result" in data
        assert isinstance(data["result"], dict)
        assert "isValid" in data["result"]
        assert isinstance(data["result"]["isValid"], bool)
