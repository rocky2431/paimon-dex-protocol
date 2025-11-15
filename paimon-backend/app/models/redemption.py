"""
Redemption ORM models.

Stores points redemption requests and transaction records.
"""

import enum
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
)
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class RedemptionStatus(enum.Enum):
    """Redemption request status."""

    PENDING = "pending"  # Waiting for processing
    PROCESSING = "processing"  # Transaction submitted
    COMPLETED = "completed"  # Transaction confirmed
    FAILED = "failed"  # Transaction failed


class PointsRedemption(Base, TimestampMixin):
    """
    Points redemption request and transaction record.

    Tracks the conversion of points to esPAIMON tokens.
    """

    __tablename__ = "points_redemptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # User relationship
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )

    # Redemption details
    points_amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    espaimon_amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=36, scale=18), nullable=False
    )  # In Wei (18 decimals)

    # Transaction details
    status: Mapped[RedemptionStatus] = mapped_column(
        SQLEnum(RedemptionStatus), default=RedemptionStatus.PENDING, nullable=False, index=True
    )
    transaction_hash: Mapped[str | None] = mapped_column(String(66), index=True)  # 0x + 64 hex chars
    block_number: Mapped[int | None] = mapped_column(BigInteger)

    # Error tracking
    error_message: Mapped[str | None] = mapped_column(String(500))
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Timestamps
    processed_at: Mapped[datetime | None] = mapped_column(DateTime)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)

    # Relationship
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])

    def __repr__(self) -> str:
        return (
            f"<PointsRedemption(id={self.id}, user_id={self.user_id}, "
            f"points={self.points_amount}, status={self.status.value})>"
        )
