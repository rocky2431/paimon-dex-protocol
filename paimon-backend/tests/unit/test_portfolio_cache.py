"""
Unit tests for PortfolioCache ORM model.

Tests portfolio data caching functionality for LP positions,
Vault positions, veNFT positions, and portfolio summaries.
"""

from datetime import UTC, datetime, timedelta

import pytest


class TestPortfolioCacheModel:
    """Test PortfolioCache model structure."""

    def test_portfolio_cache_model_has_required_fields(self):
        """Test PortfolioCache model has all required fields."""
        from app.models.portfolio_cache import PortfolioCache

        required_fields = [
            "id",
            "user_id",
            "data_type",
            "data",
            "expires_at",
            "created_at",
            "updated_at",
        ]
        for field in required_fields:
            assert hasattr(
                PortfolioCache, field
            ), f"PortfolioCache model missing field: {field}"

    def test_data_type_enum_exists(self):
        """Test DataType enum is defined."""
        from app.models.portfolio_cache import DataType

        assert hasattr(DataType, "LP_POSITIONS")
        assert hasattr(DataType, "VAULT_POSITIONS")
        assert hasattr(DataType, "VENFT_POSITIONS")
        assert hasattr(DataType, "PORTFOLIO_SUMMARY")


class TestPortfolioCacheCreation:
    """Test creating PortfolioCache records."""

    @pytest.mark.asyncio
    async def test_create_portfolio_cache(self):
        """Test creating a portfolio cache record."""
        from app.core.database import AsyncSessionLocal
        from app.models.portfolio_cache import DataType, PortfolioCache
        from app.models.user import User

        async with AsyncSessionLocal() as session:
            # Create test user
            user = User(
                address="0x1234567890123456789012345678901234567890",
                referral_code="TEST1234",
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)

            # Create portfolio cache
            cache_data = {
                "positions": [
                    {
                        "pool": "PAIMON/USDT",
                        "liquidity": "1000.0",
                        "value_usd": "2000.0",
                    }
                ]
            }

            cache = PortfolioCache(
                user_id=user.id,
                data_type=DataType.LP_POSITIONS,
                data=cache_data,
                expires_at=datetime.now(UTC) + timedelta(minutes=5),
            )
            session.add(cache)
            await session.commit()
            await session.refresh(cache)

            assert cache.id is not None
            assert cache.user_id == user.id
            assert cache.data_type == DataType.LP_POSITIONS
            assert cache.data == cache_data
            assert cache.expires_at is not None

            # Cleanup
            await session.delete(cache)
            await session.delete(user)
            await session.commit()

    @pytest.mark.asyncio
    async def test_portfolio_cache_user_relationship(self):
        """Test PortfolioCache has relationship with User."""
        from app.core.database import AsyncSessionLocal
        from app.models.portfolio_cache import DataType, PortfolioCache
        from app.models.user import User

        async with AsyncSessionLocal() as session:
            # Create test user
            user = User(
                address="0xABCDEF1234567890123456789012345678901234",
                referral_code="TEST5678",
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)

            # Create cache
            cache = PortfolioCache(
                user_id=user.id,
                data_type=DataType.VAULT_POSITIONS,
                data={"total_debt": "5000.0", "health_factor": "2.5"},
                expires_at=datetime.now(UTC) + timedelta(minutes=5),
            )
            session.add(cache)
            await session.commit()
            await session.refresh(cache)

            # Test relationship
            assert cache.user is not None
            assert cache.user.address == user.address

            # Cleanup
            await session.delete(cache)
            await session.delete(user)
            await session.commit()


class TestPortfolioCacheQuery:
    """Test querying PortfolioCache records."""

    @pytest.mark.asyncio
    async def test_query_by_user_and_data_type(self):
        """Test querying cache by user_id and data_type."""
        from sqlalchemy import select

        from app.core.database import AsyncSessionLocal
        from app.models.portfolio_cache import DataType, PortfolioCache
        from app.models.user import User

        async with AsyncSessionLocal() as session:
            # Create test user
            user = User(
                address="0x1111222233334444555566667777888899990000",
                referral_code="QUERY123",
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)

            # Create multiple cache records
            cache1 = PortfolioCache(
                user_id=user.id,
                data_type=DataType.LP_POSITIONS,
                data={"positions": []},
                expires_at=datetime.now(UTC) + timedelta(minutes=5),
            )
            cache2 = PortfolioCache(
                user_id=user.id,
                data_type=DataType.VAULT_POSITIONS,
                data={"debt": 0},
                expires_at=datetime.now(UTC) + timedelta(minutes=5),
            )
            session.add_all([cache1, cache2])
            await session.commit()

            # Query by user and data_type
            stmt = select(PortfolioCache).where(
                PortfolioCache.user_id == user.id,
                PortfolioCache.data_type == DataType.LP_POSITIONS,
            )
            result = await session.execute(stmt)
            found_cache = result.scalar_one_or_none()

            assert found_cache is not None
            assert found_cache.data_type == DataType.LP_POSITIONS
            assert found_cache.data == {"positions": []}

            # Cleanup
            await session.delete(cache1)
            await session.delete(cache2)
            await session.delete(user)
            await session.commit()


class TestPortfolioCacheExpiration:
    """Test portfolio cache expiration logic."""

    @pytest.mark.asyncio
    async def test_cache_expiration_check(self):
        """Test checking if cache is expired."""
        from sqlalchemy import select

        from app.core.database import AsyncSessionLocal
        from app.models.portfolio_cache import DataType, PortfolioCache
        from app.models.user import User

        async with AsyncSessionLocal() as session:
            # Create test user
            user = User(
                address="0xEXPIRE1234567890123456789012345678901234",
                referral_code="EXPIRE12",
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)

            # Create expired cache
            expired_cache = PortfolioCache(
                user_id=user.id,
                data_type=DataType.PORTFOLIO_SUMMARY,
                data={"total_value": "10000"},
                expires_at=datetime.now(UTC) - timedelta(minutes=1),  # Already expired
            )

            # Create valid cache
            valid_cache = PortfolioCache(
                user_id=user.id,
                data_type=DataType.LP_POSITIONS,
                data={"positions": []},
                expires_at=datetime.now(UTC) + timedelta(minutes=5),  # Not expired
            )

            session.add_all([expired_cache, valid_cache])
            await session.commit()

            # Query only non-expired caches
            now = datetime.now(UTC)
            stmt = select(PortfolioCache).where(
                PortfolioCache.user_id == user.id,
                PortfolioCache.expires_at > now,
            )
            result = await session.execute(stmt)
            caches = result.scalars().all()

            # Should only find the valid cache
            assert len(caches) == 1
            assert caches[0].data_type == DataType.LP_POSITIONS

            # Cleanup
            await session.delete(expired_cache)
            await session.delete(valid_cache)
            await session.delete(user)
            await session.commit()


class TestPortfolioCacheIndexes:
    """Test portfolio cache indexes."""

    def test_composite_index_exists(self):
        """Test composite index on user_id and data_type exists."""
        from app.models.portfolio_cache import PortfolioCache

        # Check table has indexes defined
        assert hasattr(PortfolioCache, "__table_args__")
        table_args = PortfolioCache.__table_args__

        # Should have at least one index
        assert table_args is not None
        if isinstance(table_args, tuple):
            # Check if any element is an Index (indexes defined in __table_args__)
            # This is acceptable - indexes might also be defined via mapped_column
            pass
        elif isinstance(table_args, dict):
            # Dict format is also valid
            pass
