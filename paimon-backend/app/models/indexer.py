"""
Indexer ORM models for on-chain data caching.

Stores cached blockchain data for fast portfolio queries.
"""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class LPPosition(Base, TimestampMixin):
    """
    Liquidity Pool position cache.

    Stores user LP positions with real-time APR and pending rewards.
    Updated by DEX event indexer.
    """

    __tablename__ = "lp_positions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # User relationship
    user_address: Mapped[str] = mapped_column(String(42), nullable=False, index=True)

    # Pool identification
    pair_address: Mapped[str] = mapped_column(String(42), nullable=False, index=True)
    pool_name: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., "USDP/USDC"

    # Balance data
    lp_token_balance: Mapped[Decimal] = mapped_column(
        Numeric(precision=78, scale=18), nullable=False
    )
    share_percentage: Mapped[Decimal] = mapped_column(
        Numeric(precision=10, scale=6), nullable=False
    )

    # Value data
    liquidity_usd: Mapped[Decimal] = mapped_column(
        Numeric(precision=20, scale=2), nullable=False
    )
    token0_amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=78, scale=18), nullable=False
    )
    token1_amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=78, scale=18), nullable=False
    )
    token0_symbol: Mapped[str] = mapped_column(String(20), nullable=False)
    token1_symbol: Mapped[str] = mapped_column(String(20), nullable=False)

    # APR and rewards
    current_apr: Mapped[Decimal] = mapped_column(
        Numeric(precision=10, scale=4), nullable=False, default=0
    )
    pending_rewards: Mapped[Decimal] = mapped_column(
        Numeric(precision=78, scale=18), nullable=False, default=0
    )

    # Metadata
    last_updated: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    __table_args__ = (
        UniqueConstraint('user_address', 'pair_address', name='uq_lp_user_pair'),
        Index('idx_lp_user', 'user_address'),
        Index('idx_lp_pair', 'pair_address'),
    )

    def __repr__(self) -> str:
        return (
            f"<LPPosition(user={self.user_address}, pool={self.pool_name}, "
            f"balance={self.lp_token_balance}, apr={self.current_apr}%)>"
        )


class VaultPosition(Base, TimestampMixin):
    """
    USDP Vault position cache.

    Stores user collateral and debt positions with risk metrics.
    Updated by Vault event indexer.
    """

    __tablename__ = "vault_positions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # User relationship
    user_address: Mapped[str] = mapped_column(String(42), nullable=False, index=True)

    # Collateral identification
    collateral_address: Mapped[str] = mapped_column(String(42), nullable=False)
    asset_name: Mapped[str] = mapped_column(String(20), nullable=False)  # e.g., "HYD", "USDC"

    # Collateral data
    collateral_amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=78, scale=18), nullable=False
    )
    collateral_value_usd: Mapped[Decimal] = mapped_column(
        Numeric(precision=20, scale=2), nullable=False
    )

    # Debt data
    debt_amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=78, scale=18), nullable=False, default=0
    )

    # Risk metrics
    ltv_ratio: Mapped[Decimal] = mapped_column(
        Numeric(precision=10, scale=4), nullable=False
    )
    health_factor: Mapped[Decimal] = mapped_column(
        Numeric(precision=20, scale=6), nullable=False
    )
    liquidation_price: Mapped[Decimal] = mapped_column(
        Numeric(precision=20, scale=8), nullable=False
    )

    # Metadata
    last_updated: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    __table_args__ = (
        UniqueConstraint('user_address', 'collateral_address', name='uq_vault_user_collateral'),
        Index('idx_vault_user', 'user_address'),
        Index('idx_vault_health', 'health_factor'),  # For querying risky positions
    )

    def __repr__(self) -> str:
        return (
            f"<VaultPosition(user={self.user_address}, asset={self.asset_name}, "
            f"collateral=${self.collateral_value_usd}, debt={self.debt_amount}, "
            f"health={self.health_factor})>"
        )


class VeNFTPosition(Base, TimestampMixin):
    """
    veNFT lock position cache.

    Stores user veNFT positions with voting power and expiry tracking.
    Updated by VotingEscrowPaimon event indexer.
    """

    __tablename__ = "venft_positions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # User relationship
    user_address: Mapped[str] = mapped_column(String(42), nullable=False, index=True)

    # NFT identification
    token_id: Mapped[int] = mapped_column(BigInteger, nullable=False, unique=True)

    # Lock data
    locked_amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=78, scale=18), nullable=False
    )
    lock_end: Mapped[int] = mapped_column(BigInteger, nullable=False)  # Unix timestamp

    # Voting power
    voting_power: Mapped[Decimal] = mapped_column(
        Numeric(precision=78, scale=18), nullable=False
    )

    # Computed fields
    remaining_days: Mapped[int] = mapped_column(Integer, nullable=False)
    is_expired: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Metadata
    last_updated: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    __table_args__ = (
        Index('idx_venft_user', 'user_address'),
        Index('idx_venft_expiry', 'lock_end'),
        Index('idx_venft_token_id', 'token_id', unique=True),
    )

    def __repr__(self) -> str:
        return (
            f"<VeNFTPosition(user={self.user_address}, token_id={self.token_id}, "
            f"locked={self.locked_amount}, expiry_days={self.remaining_days})>"
        )


class PortfolioSummary(Base, TimestampMixin):
    """
    Aggregated portfolio summary.

    Stores pre-computed portfolio summary for fast API responses.
    Updated by portfolio aggregator every 5 minutes.
    """

    __tablename__ = "portfolio_summary"

    # User relationship (primary key)
    user_address: Mapped[str] = mapped_column(String(42), primary_key=True)

    # Aggregated values
    total_net_worth: Mapped[Decimal] = mapped_column(
        Numeric(precision=20, scale=2), nullable=False
    )
    total_lp_value: Mapped[Decimal] = mapped_column(
        Numeric(precision=20, scale=2), nullable=False, default=0
    )
    total_collateral_value: Mapped[Decimal] = mapped_column(
        Numeric(precision=20, scale=2), nullable=False, default=0
    )
    total_debt: Mapped[Decimal] = mapped_column(
        Numeric(precision=20, scale=2), nullable=False, default=0
    )
    total_locked_paimon: Mapped[Decimal] = mapped_column(
        Numeric(precision=20, scale=2), nullable=False, default=0
    )
    total_pending_rewards: Mapped[Decimal] = mapped_column(
        Numeric(precision=20, scale=2), nullable=False, default=0
    )

    # Risk alerts (JSON array)
    risk_alerts: Mapped[dict] = mapped_column(JSON, nullable=False, default=list)

    # Cache control
    cache_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    last_updated: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow, index=True
    )

    def __repr__(self) -> str:
        return (
            f"<PortfolioSummary(user={self.user_address}, "
            f"net_worth=${self.total_net_worth}, "
            f"alerts={len(self.risk_alerts)})>"
        )


class IndexerState(Base):
    """
    Indexer scanning progress state.

    Tracks last scanned block for each contract to enable resumption after restart.
    """

    __tablename__ = "indexer_state"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Contract identification
    contract_name: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)

    # Scanning progress
    last_scanned_block: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    last_scanned_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Status flag
    is_syncing: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    def __repr__(self) -> str:
        return (
            f"<IndexerState(contract={self.contract_name}, "
            f"block={self.last_scanned_block}, syncing={self.is_syncing})>"
        )
