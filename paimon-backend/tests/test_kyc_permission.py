"""
Test suite for KYC Permission Service (Task 24).

Tests the KYC permission validation service:
1. KYC tier caching (Redis)
2. Task permission checking based on required_kyc_tier
3. Webhook cache invalidation
4. Performance requirements (< 100ms cache hit)
5. Error handling and graceful degradation
"""

import pytest
from datetime import datetime, UTC, timedelta
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.kyc import KYC, KYCTier, KYCStatus
from app.services.kyc_permission import (
    get_user_kyc_tier,
    check_task_kyc_permission,
    cache_user_kyc_tier,
    invalidate_kyc_cache,
)
from app.core.cache import cache


class TestKYCTierCaching:
    """Test KYC tier caching functionality."""

    @pytest.mark.asyncio
    async def test_cache_user_kyc_tier_success(self, test_db: AsyncSession):
        """FUNCTIONAL: Caching KYC tier should succeed."""
        # Create user
        user = User(
            address="0x1234567890123456789012345678901234567890",
            referral_code="TEST0001",
        )
        test_db.add(user)
        await test_db.flush()

        # Cache tier
        result = await cache_user_kyc_tier(user.address, KYCTier.TIER_1)
        assert result is True

        # Verify cache
        cached_tier = await cache.get(f"kyc:tier:{user.address.lower()}")
        assert cached_tier == "1"

    @pytest.mark.asyncio
    async def test_get_user_kyc_tier_from_cache(
        self, test_db: AsyncSession
    ):
        """PERFORMANCE: Getting KYC tier from cache should be fast."""
        import time

        # Create user with KYC
        user = User(
            address="0x1234567890123456789012345678901234567891",
            referral_code="TEST0002",
        )
        test_db.add(user)
        await test_db.flush()

        kyc = KYC(
            user_id=user.id,
            tier=KYCTier.TIER_1,
            status=KYCStatus.APPROVED,
            blockpass_id="bp_test_001",
            approved_at=datetime.now(UTC),
        )
        test_db.add(kyc)
        await test_db.commit()

        # Cache the tier
        await cache_user_kyc_tier(user.address, KYCTier.TIER_1)

        # Measure cache hit performance
        start_time = time.time()
        tier = await get_user_kyc_tier(test_db, user.address)
        end_time = time.time()

        assert tier == KYCTier.TIER_1
        assert (end_time - start_time) < 0.1  # < 100ms

    @pytest.mark.asyncio
    async def test_get_user_kyc_tier_from_database(
        self, test_db: AsyncSession
    ):
        """FUNCTIONAL: Getting KYC tier from database should work when cache miss."""
        # Create user with KYC
        user = User(
            address="0x1234567890123456789012345678901234567892",
            referral_code="TEST0003",
        )
        test_db.add(user)
        await test_db.flush()

        kyc = KYC(
            user_id=user.id,
            tier=KYCTier.TIER_2,
            status=KYCStatus.APPROVED,
            blockpass_id="bp_test_002",
            approved_at=datetime.now(UTC),
        )
        test_db.add(kyc)
        await test_db.commit()

        # Get tier (should query database and cache)
        tier = await get_user_kyc_tier(test_db, user.address)

        assert tier == KYCTier.TIER_2

        # Verify it was cached
        cached_tier = await cache.get(f"kyc:tier:{user.address.lower()}")
        assert cached_tier == "2"

    @pytest.mark.asyncio
    async def test_get_user_kyc_tier_case_insensitive(
        self, test_db: AsyncSession
    ):
        """BOUNDARY: Address should be case-insensitive."""
        user = User(
            address="0xABCDEF1234567890123456789012345678901234",
            referral_code="TEST0004",
        )
        test_db.add(user)
        await test_db.flush()

        kyc = KYC(
            user_id=user.id,
            tier=KYCTier.TIER_1,
            status=KYCStatus.APPROVED,
        )
        test_db.add(kyc)
        await test_db.commit()

        # Test lowercase
        tier_lower = await get_user_kyc_tier(test_db, user.address.lower())
        assert tier_lower == KYCTier.TIER_1

        # Test uppercase
        tier_upper = await get_user_kyc_tier(test_db, user.address.upper())
        assert tier_upper == KYCTier.TIER_1

    @pytest.mark.asyncio
    async def test_cache_expiration(self, test_db: AsyncSession):
        """SECURITY: Cache should expire after TTL."""
        user = User(
            address="0x1234567890123456789012345678901234567893",
            referral_code="TEST0005",
        )
        test_db.add(user)
        await test_db.flush()

        # Cache with short TTL
        await cache.set(
            f"kyc:tier:{user.address.lower()}",
            "1",
            ttl=timedelta(seconds=1)
        )

        # Verify cache exists
        exists_before = await cache.exists(f"kyc:tier:{user.address.lower()}")
        assert exists_before is True

        # Wait for expiration
        import asyncio
        await asyncio.sleep(2)

        # Verify cache expired
        exists_after = await cache.exists(f"kyc:tier:{user.address.lower()}")
        assert exists_after is False

    @pytest.mark.asyncio
    async def test_invalidate_kyc_cache(self, test_db: AsyncSession):
        """FUNCTIONAL: Invalidating cache should delete the key."""
        user = User(
            address="0x1234567890123456789012345678901234567894",
            referral_code="TEST0006",
        )
        test_db.add(user)
        await test_db.commit()

        # Cache tier
        await cache_user_kyc_tier(user.address, KYCTier.TIER_1)

        # Verify cache exists
        exists_before = await cache.exists(f"kyc:tier:{user.address.lower()}")
        assert exists_before is True

        # Invalidate cache
        result = await invalidate_kyc_cache(user.address)
        assert result > 0

        # Verify cache deleted
        exists_after = await cache.exists(f"kyc:tier:{user.address.lower()}")
        assert exists_after is False


class TestTaskKYCPermission:
    """Test task KYC permission checking."""

    @pytest.mark.asyncio
    async def test_tier0_user_cannot_access_tier1_task(
        self, test_db: AsyncSession
    ):
        """FUNCTIONAL: Tier 0 user should not access Tier 1 task."""
        # Create Tier 0 user (no KYC)
        user = User(
            address="0x1234567890123456789012345678901234567895",
            referral_code="TEST0007",
        )
        test_db.add(user)
        await test_db.commit()

        # Task requiring Tier 1
        task_config = {"required_kyc_tier": 1, "task_name": "Advanced RWA Task"}

        # Check permission
        has_permission, error_message = await check_task_kyc_permission(
            test_db, user.address, task_config
        )

        assert has_permission is False
        assert "KYC" in error_message
        assert "Tier 1" in error_message

    @pytest.mark.asyncio
    async def test_tier1_user_can_access_tier1_task(
        self, test_db: AsyncSession
    ):
        """FUNCTIONAL: Tier 1 user should access Tier 1 task."""
        # Create Tier 1 user
        user = User(
            address="0x1234567890123456789012345678901234567896",
            referral_code="TEST0008",
        )
        test_db.add(user)
        await test_db.flush()

        kyc = KYC(
            user_id=user.id,
            tier=KYCTier.TIER_1,
            status=KYCStatus.APPROVED,
        )
        test_db.add(kyc)
        await test_db.commit()

        # Task requiring Tier 1
        task_config = {"required_kyc_tier": 1, "task_name": "Basic RWA Task"}

        # Check permission
        has_permission, error_message = await check_task_kyc_permission(
            test_db, user.address, task_config
        )

        assert has_permission is True
        assert error_message is None

    @pytest.mark.asyncio
    async def test_tier2_user_can_access_all_tasks(
        self, test_db: AsyncSession
    ):
        """FUNCTIONAL: Tier 2 user should access all tasks."""
        # Create Tier 2 user
        user = User(
            address="0x1234567890123456789012345678901234567897",
            referral_code="TEST0009",
        )
        test_db.add(user)
        await test_db.flush()

        kyc = KYC(
            user_id=user.id,
            tier=KYCTier.TIER_2,
            status=KYCStatus.APPROVED,
        )
        test_db.add(kyc)
        await test_db.commit()

        # Test Tier 1 task
        task_config_t1 = {"required_kyc_tier": 1}
        has_perm_t1, _ = await check_task_kyc_permission(
            test_db, user.address, task_config_t1
        )
        assert has_perm_t1 is True

        # Test Tier 2 task
        task_config_t2 = {"required_kyc_tier": 2}
        has_perm_t2, _ = await check_task_kyc_permission(
            test_db, user.address, task_config_t2
        )
        assert has_perm_t2 is True

    @pytest.mark.asyncio
    async def test_task_without_kyc_requirement_allows_all(
        self, test_db: AsyncSession
    ):
        """BOUNDARY: Task without required_kyc_tier should allow all users."""
        # Create Tier 0 user
        user = User(
            address="0x1234567890123456789012345678901234567898",
            referral_code="TEST0010",
        )
        test_db.add(user)
        await test_db.commit()

        # Task without KYC requirement
        task_config = {"task_name": "Social Task"}

        # Check permission
        has_permission, error_message = await check_task_kyc_permission(
            test_db, user.address, task_config
        )

        assert has_permission is True
        assert error_message is None

    @pytest.mark.asyncio
    async def test_empty_task_config_allows_all(
        self, test_db: AsyncSession
    ):
        """BOUNDARY: Empty task config should allow all users."""
        user = User(
            address="0x1234567890123456789012345678901234567899",
            referral_code="TEST0011",
        )
        test_db.add(user)
        await test_db.commit()

        # Check permission with None config
        has_perm_none, _ = await check_task_kyc_permission(
            test_db, user.address, None
        )
        assert has_perm_none is True

        # Check permission with empty dict
        has_perm_empty, _ = await check_task_kyc_permission(
            test_db, user.address, {}
        )
        assert has_perm_empty is True

    @pytest.mark.asyncio
    async def test_user_not_found_defaults_to_tier0(
        self, test_db: AsyncSession
    ):
        """BOUNDARY: Non-existent user should default to Tier 0."""
        nonexistent_address = "0x9999999999999999999999999999999999999999"

        tier = await get_user_kyc_tier(test_db, nonexistent_address)
        assert tier == KYCTier.TIER_0

    @pytest.mark.asyncio
    async def test_user_without_kyc_record_defaults_to_tier0(
        self, test_db: AsyncSession
    ):
        """BOUNDARY: User without KYC record should default to Tier 0."""
        # Create user without KYC
        user = User(
            address="0x1234567890123456789012345678901234567800",
            referral_code="TEST0012",
        )
        test_db.add(user)
        await test_db.commit()

        tier = await get_user_kyc_tier(test_db, user.address)
        assert tier == KYCTier.TIER_0


class TestErrorHandling:
    """Test error handling and graceful degradation."""

    @pytest.mark.asyncio
    async def test_redis_unavailable_fallback_to_database(
        self, test_db: AsyncSession, monkeypatch
    ):
        """EXCEPTION: Redis unavailable should fallback to database."""
        # Create user with KYC
        user = User(
            address="0x1234567890123456789012345678901234567801",
            referral_code="TEST0013",
        )
        test_db.add(user)
        await test_db.flush()

        kyc = KYC(
            user_id=user.id,
            tier=KYCTier.TIER_1,
            status=KYCStatus.APPROVED,
        )
        test_db.add(kyc)
        await test_db.commit()

        # Mock Redis failure
        async def mock_redis_get(*args, **kwargs):
            raise Exception("Redis connection failed")

        monkeypatch.setattr(cache, "get", mock_redis_get)

        # Should fallback to database query
        tier = await get_user_kyc_tier(test_db, user.address)
        assert tier == KYCTier.TIER_1

    @pytest.mark.asyncio
    async def test_invalid_tier_in_cache_fallback_to_database(
        self, test_db: AsyncSession
    ):
        """EXCEPTION: Invalid cached tier should fallback to database."""
        user = User(
            address="0x1234567890123456789012345678901234567802",
            referral_code="TEST0014",
        )
        test_db.add(user)
        await test_db.flush()

        kyc = KYC(
            user_id=user.id,
            tier=KYCTier.TIER_1,
            status=KYCStatus.APPROVED,
        )
        test_db.add(kyc)
        await test_db.commit()

        # Set invalid tier in cache
        await cache.set(f"kyc:tier:{user.address.lower()}", "invalid_tier")

        # Should fallback to database and recache
        tier = await get_user_kyc_tier(test_db, user.address)
        assert tier == KYCTier.TIER_1

        # Verify cache was updated with correct value
        cached_tier = await cache.get(f"kyc:tier:{user.address.lower()}")
        assert cached_tier == "1"
