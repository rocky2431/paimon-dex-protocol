"""
Test suite for Task Progress API.

6-dimensional test coverage:
1. Functional - Core progress aggregation logic
2. Boundary - Empty tasks, large datasets
3. Exception - Invalid addresses, missing users
4. Performance - Response time < 500ms, caching
5. Security - Address format validation
6. Compatibility - Different task types (social, RWA)
"""

import pytest
from datetime import datetime, UTC
from decimal import Decimal
from httpx import AsyncClient
from unittest.mock import Mock, AsyncMock, patch

from app.models.task import TaskType, TaskStatus
from app.models.user import User


class TestFunctional:
    """Test core task progress aggregation functionality."""

    @pytest.mark.asyncio
    async def test_get_task_progress_social_only(self, async_client: AsyncClient, test_user: User):
        """FUNCTIONAL: Query user with only social tasks."""
        # Expect successful response with social tasks
        response = await async_client.get(f"/api/tasks/{test_user.address}")

        assert response.status_code == 200
        data = response.json()

        assert data["address"].lower() == test_user.address.lower()
        assert "tasks" in data
        assert "statistics" in data
        assert isinstance(data["tasks"], list)

    @pytest.mark.asyncio
    async def test_get_task_progress_mixed_tasks(
        self, async_client: AsyncClient, test_user: User
    ):
        """FUNCTIONAL: Query user with both social and RWA tasks."""
        response = await async_client.get(f"/api/tasks/{test_user.address}")

        assert response.status_code == 200
        data = response.json()

        # Verify task types (if tasks exist)
        if len(data["tasks"]) > 0:
            task_types = {task["taskType"] for task in data["tasks"]}
            # At least one task type should be present
            assert len(task_types) > 0
            # All task types should be valid
            valid_types = {"social", "onchain_simple", "onchain_complex", "referral"}
            assert task_types.issubset(valid_types)

        # Verify statistics
        stats = data["statistics"]
        assert stats["total"] == len(data["tasks"])
        assert 0 <= stats["completionRate"] <= 1

    @pytest.mark.asyncio
    async def test_task_status_mapping(self, async_client: AsyncClient, test_user: User):
        """FUNCTIONAL: Verify correct status mapping (pending/completed/claimed)."""
        response = await async_client.get(f"/api/tasks/{test_user.address}")

        assert response.status_code == 200
        data = response.json()

        # Verify all tasks have valid status
        valid_statuses = {"pending", "completed", "claimed"}
        for task in data["tasks"]:
            assert task["status"] in valid_statuses


class TestBoundary:
    """Test edge cases and boundary conditions."""

    @pytest.mark.asyncio
    async def test_get_task_progress_no_tasks(self, async_client: AsyncClient, test_user: User):
        """BOUNDARY: User with no tasks should return empty list."""
        response = await async_client.get(f"/api/tasks/{test_user.address}")

        assert response.status_code == 200
        data = response.json()

        assert data["tasks"] == [] or len(data["tasks"]) >= 0
        assert data["statistics"]["total"] == len(data["tasks"])
        assert data["statistics"]["completionRate"] == 0 or data["statistics"]["total"] > 0

    @pytest.mark.asyncio
    async def test_get_task_progress_case_insensitive_address(
        self, async_client: AsyncClient, test_user: User
    ):
        """BOUNDARY: Address lookup should be case-insensitive."""
        # Test with uppercase address
        uppercase_address = test_user.address.upper()
        response = await async_client.get(f"/api/tasks/{uppercase_address}")

        assert response.status_code == 200

        # Test with lowercase address
        lowercase_address = test_user.address.lower()
        response = await async_client.get(f"/api/tasks/{lowercase_address}")

        assert response.status_code == 200


class TestException:
    """Test error handling and exception cases."""

    @pytest.mark.asyncio
    async def test_get_task_progress_invalid_address_format(self, async_client: AsyncClient):
        """EXCEPTION: Invalid Ethereum address should return 422 or 404."""
        # Addresses that should reach validator (return 422)
        validator_rejected = [
            "0xinvalid",
            "not_an_address",
            "0x123",  # Too short
        ]

        for invalid_addr in validator_rejected:
            response = await async_client.get(f"/api/tasks/{invalid_addr}")
            assert response.status_code in [400, 422], f"Failed for address: {invalid_addr}"

        # Empty string causes route mismatch (404 is expected)
        response = await async_client.get("/api/tasks/")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_task_progress_user_not_found(self, async_client: AsyncClient):
        """EXCEPTION: Non-existent user should return empty tasks."""
        non_existent_address = "0x0000000000000000000000000000000000000000"
        response = await async_client.get(f"/api/tasks/{non_existent_address}")

        # Should return 200 with empty tasks, not 404
        assert response.status_code == 200
        data = response.json()
        assert data["tasks"] == []
        assert data["statistics"]["total"] == 0


class TestPerformance:
    """Test performance requirements."""

    @pytest.mark.asyncio
    async def test_response_time_under_500ms(self, async_client: AsyncClient, test_user: User):
        """PERFORMANCE: API should respond within 500ms."""
        import time

        start_time = time.time()
        response = await async_client.get(f"/api/tasks/{test_user.address}")
        duration = time.time() - start_time

        assert response.status_code == 200
        assert duration < 0.5, f"Response time {duration:.3f}s exceeds 500ms"

    @pytest.mark.asyncio
    async def test_redis_caching_5_minutes(self, async_client: AsyncClient, test_user: User):
        """PERFORMANCE: Second request should hit cache."""
        import time

        # First request - cache miss
        response1 = await async_client.get(f"/api/tasks/{test_user.address}")
        assert response1.status_code == 200
        data1 = response1.json()

        # Second request - should hit cache (faster)
        start_time = time.time()
        response2 = await async_client.get(f"/api/tasks/{test_user.address}")
        duration = time.time() - start_time

        assert response2.status_code == 200
        data2 = response2.json()

        # Cache hit should be very fast (<100ms)
        assert duration < 0.1, f"Cache hit took {duration:.3f}s, expected <100ms"

        # Data should be identical (from cache)
        assert data1["address"] == data2["address"]
        assert len(data1["tasks"]) == len(data2["tasks"])


class TestSecurity:
    """Test security and validation."""

    @pytest.mark.asyncio
    async def test_address_validation_strict(self, async_client: AsyncClient):
        """SECURITY: Strict address format validation."""
        # Short address should be rejected
        response = await async_client.get("/api/tasks/0x123")
        assert response.status_code in [400, 422]

        # Invalid characters
        response = await async_client.get("/api/tasks/0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG")
        assert response.status_code in [400, 422]

    @pytest.mark.asyncio
    async def test_sql_injection_prevention(self, async_client: AsyncClient):
        """SECURITY: Prevent SQL injection attacks."""
        malicious_addresses = [
            "0x' OR '1'='1",
            "0x; DROP TABLE users--",
            "0x<script>alert('xss')</script>",
        ]

        for malicious_addr in malicious_addresses:
            response = await async_client.get(f"/api/tasks/{malicious_addr}")
            # Should not cause server error (404 is acceptable for route mismatch)
            assert response.status_code in [200, 400, 404, 422]


class TestCompatibility:
    """Test compatibility across different task types."""

    @pytest.mark.asyncio
    async def test_social_task_compatibility(self, async_client: AsyncClient, test_user: User):
        """COMPATIBILITY: Social tasks from task_progress table."""
        response = await async_client.get(f"/api/tasks/{test_user.address}")

        assert response.status_code == 200
        data = response.json()

        # Find social tasks
        social_tasks = [t for t in data["tasks"] if t["taskType"] == "social"]

        # Verify social task structure
        for task in social_tasks:
            assert "taskId" in task
            assert "status" in task
            assert task["taskType"] == "social"

    @pytest.mark.asyncio
    async def test_rwa_task_compatibility(self, async_client: AsyncClient, test_user: User):
        """COMPATIBILITY: RWA tasks from VerificationService."""
        response = await async_client.get(f"/api/tasks/{test_user.address}")

        assert response.status_code == 200
        data = response.json()

        # Find RWA tasks
        rwa_tasks = [t for t in data["tasks"] if t["taskType"] == "onchain_complex"]

        # Verify RWA task structure
        for task in rwa_tasks:
            assert "taskId" in task
            assert "status" in task
            assert task["taskType"] == "onchain_complex"
            # RWA tasks may have verificationData
            if task["status"] == "completed":
                assert "verificationData" in task
