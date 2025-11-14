"""
Referral ORM model.

Stores referral relationships and rewards.
"""

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class Referral(Base):
    """Referral relationship and reward tracking."""

    __tablename__ = "referrals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Referral relationship
    referrer_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    referee_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )

    # Reward tracking
    reward_earned: Mapped[Decimal] = mapped_column(
        Numeric(precision=36, scale=18), default=0, nullable=False
    )

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # Relationships
    referrer: Mapped["User"] = relationship(
        "User",
        foreign_keys=[referrer_id],
        back_populates="referrals",
    )
    referee: Mapped["User"] = relationship("User", foreign_keys=[referee_id])

    def __repr__(self) -> str:
        return f"<Referral(id={self.id}, referrer_id={self.referrer_id}, referee_id={self.referee_id})>"
