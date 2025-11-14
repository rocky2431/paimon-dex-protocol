"""
PortfolioCache ORM model.

Stores cached portfolio data for users (LP positions, Vault positions,
veNFT positions, and portfolio summaries).
"""

import enum
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, DateTime, ForeignKey, Index, Integer
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class DataType(enum.Enum):
    """Portfolio cache data types."""

    LP_POSITIONS = "lp_positions"  # Liquidity pool positions
    VAULT_POSITIONS = "vault_positions"  # CDP Vault positions
    VENFT_POSITIONS = "venft_positions"  # veNFT positions
    PORTFOLIO_SUMMARY = "portfolio_summary"  # Overall portfolio summary


class PortfolioCache(Base, TimestampMixin):
    """Portfolio data cache for improved query performance."""

    __tablename__ = "portfolio_cache"

    # Composite index on user_id and data_type for efficient queries
    __table_args__ = (
        Index("idx_portfolio_cache_user_data_type", "user_id", "data_type"),
        Index("idx_portfolio_cache_expires_at", "expires_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # User relationship
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )

    # Data type (LP, Vault, veNFT, or Summary)
    data_type: Mapped[DataType] = mapped_column(SQLEnum(DataType), nullable=False)

    # Cached data (JSON format)
    data: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)

    # Expiration time (for cache invalidation)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    # Relationship
    user: Mapped["User"] = relationship("User", back_populates="portfolio_caches")

    def __repr__(self) -> str:
        return f"<PortfolioCache(id={self.id}, user_id={self.user_id}, data_type={self.data_type.name})>"

    def is_expired(self) -> bool:
        """
        Check if this cache entry is expired.

        Returns:
            True if expired, False otherwise.
        """
        from datetime import UTC

        return datetime.now(UTC) > self.expires_at
