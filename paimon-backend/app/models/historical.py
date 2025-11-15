"""
Historical data models for TimescaleDB time-series storage.

These models store APR trends and reward claims for portfolio analytics.
"""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Index, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.models.base import Base


class HistoricalAPR(Base):
    """
    Pool APR snapshots (hourly).

    Stores historical APR data for liquidity pools to enable trend analysis.
    Configured as TimescaleDB hypertable in production (PostgreSQL).
    """

    __tablename__ = "historical_apr"

    # Primary key (auto-increment, INTEGER for SQLite compatibility)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Pool identification
    pool_address: Mapped[str] = mapped_column(String(42), nullable=False, index=True)
    pool_name: Mapped[str] = mapped_column(String(50), nullable=False)

    # Time dimension (hypertable partition key)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True, server_default=func.now()
    )

    # APR metrics
    apr: Mapped[Decimal] = mapped_column(Numeric(10, 4), nullable=False)
    tvl_usd: Mapped[Decimal] = mapped_column(Numeric(20, 2), nullable=False)
    trading_volume_24h: Mapped[Decimal] = mapped_column(
        Numeric(20, 2), nullable=False, default=0
    )

    __table_args__ = (
        # Composite unique constraint (prevent duplicate snapshots)
        UniqueConstraint("pool_address", "timestamp", name="uq_apr_pool_time"),
        # Time-range query optimization
        Index("idx_apr_time_pool", "timestamp", "pool_address"),
    )

    def __repr__(self) -> str:
        return f"<HistoricalAPR(pool={self.pool_name}, apr={self.apr}%, time={self.timestamp})>"


class HistoricalRewards(Base):
    """
    User reward claims (per-event).

    Stores reward claim events for users to enable earnings history tracking.
    Configured as TimescaleDB hypertable in production (PostgreSQL).
    """

    __tablename__ = "historical_rewards"

    # Primary key (auto-increment, INTEGER for SQLite compatibility)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # User and pool identification
    user_address: Mapped[str] = mapped_column(String(42), nullable=False, index=True)
    pool_address: Mapped[str] = mapped_column(String(42), nullable=False, index=True)

    # Time dimension (hypertable partition key)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True, server_default=func.now()
    )

    # Reward details
    reward_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # 'lp', 'debt', 'boost', 'ecosystem'
    amount: Mapped[Decimal] = mapped_column(
        Numeric(78, 18), nullable=False
    )  # 18-decimal precision
    cumulative_amount: Mapped[Decimal] = mapped_column(
        Numeric(78, 18), nullable=False, default=0
    )

    __table_args__ = (
        # Composite unique constraint (prevent duplicate claims)
        UniqueConstraint(
            "user_address",
            "timestamp",
            "pool_address",
            "reward_type",
            name="uq_rewards_user_time_pool_type",
        ),
        # Time-range query optimization for user history
        Index("idx_rewards_time_user", "timestamp", "user_address"),
        # Pool reward aggregation queries
        Index("idx_rewards_pool_time", "pool_address", "timestamp"),
    )

    def __repr__(self) -> str:
        return f"<HistoricalRewards(user={self.user_address[:8]}..., type={self.reward_type}, amount={self.amount}, time={self.timestamp})>"
