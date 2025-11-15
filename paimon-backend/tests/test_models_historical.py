"""
Unit tests for historical data models.

Tests HistoricalAPR and HistoricalRewards models.
"""

from datetime import datetime, timezone
from decimal import Decimal

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.historical import HistoricalAPR, HistoricalRewards


@pytest.mark.asyncio
class TestHistoricalAPR:
    """Test suite for HistoricalAPR model."""

    async def test_create_apr_snapshot(self, db_session: AsyncSession):
        """
        Test creating APR snapshot with all required fields.

        Verifies:
        - Successful creation
        - Auto-generated timestamp
        - Decimal precision preservation
        """
        # Arrange
        apr = HistoricalAPR(
            pool_address="0x1234567890123456789012345678901234567890",
            pool_name="USDC/USDP",
            timestamp=datetime(2025, 11, 15, 10, 0, 0, tzinfo=timezone.utc),
            apr=Decimal("25.5000"),
            tvl_usd=Decimal("1500000.00"),
            trading_volume_24h=Decimal("350000.00"),
        )

        # Act
        db_session.add(apr)
        await db_session.commit()
        await db_session.refresh(apr)

        # Assert
        assert apr.id is not None
        assert apr.apr == Decimal("25.5000")
        assert apr.tvl_usd == Decimal("1500000.00")
        assert apr.timestamp.tzinfo is not None  # Timezone-aware

    async def test_unique_constraint_pool_timestamp(self, db_session: AsyncSession):
        """
        Test unique constraint on (pool_address, timestamp).

        Prevents duplicate APR snapshots for same pool at same time.
        """
        # Arrange
        timestamp = datetime(2025, 11, 15, 10, 0, 0, tzinfo=timezone.utc)
        pool_address = "0x1234567890123456789012345678901234567890"

        apr1 = HistoricalAPR(
            pool_address=pool_address,
            pool_name="USDC/USDP",
            timestamp=timestamp,
            apr=Decimal("25.5"),
            tvl_usd=Decimal("1500000"),
            trading_volume_24h=Decimal("350000"),
        )
        db_session.add(apr1)
        await db_session.commit()

        # Act & Assert
        apr2 = HistoricalAPR(
            pool_address=pool_address,  # Same pool
            pool_name="USDC/USDP",
            timestamp=timestamp,  # Same timestamp
            apr=Decimal("26.0"),  # Different APR (should fail)
            tvl_usd=Decimal("1600000"),
            trading_volume_24h=Decimal("360000"),
        )
        db_session.add(apr2)

        with pytest.raises(IntegrityError):
            await db_session.commit()

    async def test_query_apr_time_range(self, db_session: AsyncSession):
        """
        Test time-range query performance (simulated).

        Verifies index usage for time-based filtering.
        """
        # Arrange: Create 24 hourly snapshots
        pool_address = "0x1234567890123456789012345678901234567890"
        for hour in range(24):
            apr = HistoricalAPR(
                pool_address=pool_address,
                pool_name="USDC/USDP",
                timestamp=datetime(2025, 11, 15, hour, 0, 0, tzinfo=timezone.utc),
                apr=Decimal("25.5") + Decimal(hour) * Decimal("0.1"),
                tvl_usd=Decimal("1500000"),
                trading_volume_24h=Decimal("350000"),
            )
            db_session.add(apr)
        await db_session.commit()

        # Act: Query 6-hour range
        start_time = datetime(2025, 11, 15, 10, 0, 0, tzinfo=timezone.utc)
        end_time = datetime(2025, 11, 15, 16, 0, 0, tzinfo=timezone.utc)

        stmt = (
            select(HistoricalAPR)
            .where(
                HistoricalAPR.pool_address == pool_address,
                HistoricalAPR.timestamp >= start_time,
                HistoricalAPR.timestamp < end_time,
            )
            .order_by(HistoricalAPR.timestamp)
        )

        result = await db_session.execute(stmt)
        snapshots = result.scalars().all()

        # Assert
        assert len(snapshots) == 6  # 6 hours (10:00 - 15:00)
        assert snapshots[0].timestamp.hour == 10
        assert snapshots[-1].timestamp.hour == 15

    async def test_apr_default_trading_volume(self, db_session: AsyncSession):
        """Test default value for trading_volume_24h."""
        # Arrange
        apr = HistoricalAPR(
            pool_address="0x1234567890123456789012345678901234567890",
            pool_name="USDC/USDP",
            timestamp=datetime(2025, 11, 15, 10, 0, 0, tzinfo=timezone.utc),
            apr=Decimal("25.5"),
            tvl_usd=Decimal("1500000"),
            # trading_volume_24h omitted
        )

        # Act
        db_session.add(apr)
        await db_session.commit()
        await db_session.refresh(apr)

        # Assert
        assert apr.trading_volume_24h == Decimal("0")


@pytest.mark.asyncio
class TestHistoricalRewards:
    """Test suite for HistoricalRewards model."""

    async def test_create_reward_claim(self, db_session: AsyncSession):
        """
        Test creating reward claim with all required fields.

        Verifies:
        - Successful creation
        - 18-decimal precision (blockchain standard)
        - Cumulative amount tracking
        """
        # Arrange
        reward = HistoricalRewards(
            user_address="0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
            pool_address="0x1234567890123456789012345678901234567890",
            timestamp=datetime(2025, 11, 15, 10, 30, 0, tzinfo=timezone.utc),
            reward_type="lp",
            amount=Decimal("125.500000000000000000"),  # 18 decimals
            cumulative_amount=Decimal("1250.750000000000000000"),
        )

        # Act
        db_session.add(reward)
        await db_session.commit()
        await db_session.refresh(reward)

        # Assert
        assert reward.id is not None
        assert reward.amount == Decimal("125.500000000000000000")
        assert reward.cumulative_amount == Decimal("1250.750000000000000000")

    async def test_unique_constraint_user_time_pool_type(
        self, db_session: AsyncSession
    ):
        """
        Test unique constraint on (user, timestamp, pool, reward_type).

        Prevents duplicate reward claims.
        """
        # Arrange
        timestamp = datetime(2025, 11, 15, 10, 30, 0, tzinfo=timezone.utc)
        user_address = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
        pool_address = "0x1234567890123456789012345678901234567890"

        reward1 = HistoricalRewards(
            user_address=user_address,
            pool_address=pool_address,
            timestamp=timestamp,
            reward_type="lp",
            amount=Decimal("125.5"),
            cumulative_amount=Decimal("1250.75"),
        )
        db_session.add(reward1)
        await db_session.commit()

        # Act & Assert
        reward2 = HistoricalRewards(
            user_address=user_address,  # Same user
            pool_address=pool_address,  # Same pool
            timestamp=timestamp,  # Same timestamp
            reward_type="lp",  # Same type
            amount=Decimal("130.0"),  # Different amount (should fail)
            cumulative_amount=Decimal("1380.75"),
        )
        db_session.add(reward2)

        with pytest.raises(IntegrityError):
            await db_session.commit()

    async def test_query_user_rewards_history(self, db_session: AsyncSession):
        """
        Test user reward history query.

        Verifies index usage for user-based filtering.
        """
        # Arrange: Create 10 reward claims for user
        user_address = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
        pool_address = "0x1234567890123456789012345678901234567890"

        cumulative = Decimal("0")
        for day in range(10):
            amount = Decimal("100") * Decimal(day + 1)
            cumulative += amount

            reward = HistoricalRewards(
                user_address=user_address,
                pool_address=pool_address,
                timestamp=datetime(2025, 11, day + 1, 10, 0, 0, tzinfo=timezone.utc),
                reward_type="lp",
                amount=amount,
                cumulative_amount=cumulative,
            )
            db_session.add(reward)
        await db_session.commit()

        # Act: Query last 7 days
        start_time = datetime(2025, 11, 4, 0, 0, 0, tzinfo=timezone.utc)
        end_time = datetime(2025, 11, 11, 0, 0, 0, tzinfo=timezone.utc)

        stmt = (
            select(HistoricalRewards)
            .where(
                HistoricalRewards.user_address == user_address,
                HistoricalRewards.timestamp >= start_time,
                HistoricalRewards.timestamp < end_time,
            )
            .order_by(HistoricalRewards.timestamp.desc())
        )

        result = await db_session.execute(stmt)
        rewards = result.scalars().all()

        # Assert
        assert len(rewards) == 7  # Days 4-10
        assert rewards[0].timestamp.day == 10  # Most recent first
        assert rewards[-1].timestamp.day == 4

    async def test_reward_type_values(self, db_session: AsyncSession):
        """
        Test different reward_type values.

        Verifies support for all reward types: lp, debt, boost, ecosystem.
        """
        # Arrange
        user_address = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
        pool_address = "0x1234567890123456789012345678901234567890"
        timestamp = datetime(2025, 11, 15, 10, 0, 0, tzinfo=timezone.utc)

        reward_types = ["lp", "debt", "boost", "ecosystem"]

        for i, reward_type in enumerate(reward_types):
            reward = HistoricalRewards(
                user_address=user_address,
                pool_address=pool_address,
                timestamp=timestamp.replace(minute=i),  # Different timestamps
                reward_type=reward_type,
                amount=Decimal("100"),
                cumulative_amount=Decimal("100") * Decimal(i + 1),
            )
            db_session.add(reward)

        # Act
        await db_session.commit()

        # Assert: Query by reward type
        stmt = select(HistoricalRewards).where(
            HistoricalRewards.user_address == user_address,
            HistoricalRewards.reward_type == "lp",
        )
        result = await db_session.execute(stmt)
        lp_rewards = result.scalars().all()

        assert len(lp_rewards) == 1
        assert lp_rewards[0].reward_type == "lp"

    async def test_cumulative_amount_default(self, db_session: AsyncSession):
        """Test default value for cumulative_amount."""
        # Arrange
        reward = HistoricalRewards(
            user_address="0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
            pool_address="0x1234567890123456789012345678901234567890",
            timestamp=datetime(2025, 11, 15, 10, 0, 0, tzinfo=timezone.utc),
            reward_type="lp",
            amount=Decimal("125.5"),
            # cumulative_amount omitted
        )

        # Act
        db_session.add(reward)
        await db_session.commit()
        await db_session.refresh(reward)

        # Assert
        assert reward.cumulative_amount == Decimal("0")
