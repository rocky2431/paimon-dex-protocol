"""
Points system ORM models.

Stores user points balance and transaction history.
"""

from typing import TYPE_CHECKING
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    ForeignKey,
    Integer,
    String,
    Index,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class PointsBalance(Base, TimestampMixin):
    """
    User points balance.

    Each user has one balance record tracking total points.
    """

    __tablename__ = "points_balance"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Foreign key to users table
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), unique=True, index=True, nullable=False
    )

    # Current balance (in points, no decimals)
    balance: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)

    # Lifetime earned points (for statistics)
    total_earned: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)

    # Lifetime spent points (for statistics)
    total_spent: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="points_balance")
    transactions: Mapped[list["PointsTransaction"]] = relationship(
        "PointsTransaction", back_populates="balance"
    )

    def __repr__(self) -> str:
        return f"<PointsBalance(user_id={self.user_id}, balance={self.balance})>"


class PointsTransaction(Base, TimestampMixin):
    """
    Points transaction history.

    Records every points award, deduction, and redemption.
    Supports idempotency via transaction_id to prevent duplicates.
    """

    __tablename__ = "points_transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Foreign key to points_balance
    balance_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("points_balance.id"), index=True, nullable=False
    )

    # Transaction type: 'award', 'deduct', 'redeem'
    type: Mapped[str] = mapped_column(String(20), nullable=False)

    # Amount (positive for awards, negative for deductions/redemptions)
    amount: Mapped[int] = mapped_column(BigInteger, nullable=False)

    # Balance after this transaction
    balance_after: Mapped[int] = mapped_column(BigInteger, nullable=False)

    # Source of transaction (e.g., 'task_completion', 'referral_bonus', 'espaimon_redemption')
    source: Mapped[str] = mapped_column(String(100), nullable=False)

    # Reference ID (e.g., task_id, referral_id, redemption_id)
    reference_id: Mapped[str | None] = mapped_column(String(255), index=True)

    # Idempotency key to prevent duplicate transactions
    # Format: "{source}:{reference_id}" or UUID for redemptions
    transaction_id: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )

    # Additional metadata (JSON-serialized)
    transaction_metadata: Mapped[str | None] = mapped_column(String(500))

    # Relationships
    balance: Mapped["PointsBalance"] = relationship(
        "PointsBalance", back_populates="transactions"
    )

    # Indexes for efficient queries
    __table_args__ = (
        Index("ix_points_tx_balance_created", "balance_id", "created_at"),
        Index("ix_points_tx_type_source", "type", "source"),
    )

    def __repr__(self) -> str:
        return (
            f"<PointsTransaction(id={self.id}, type={self.type}, "
            f"amount={self.amount}, source={self.source})>"
        )
