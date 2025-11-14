"""
KYC ORM model.

Stores KYC verification records from Blockpass.
"""

import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class KYCTier(enum.Enum):
    """KYC tier levels."""

    TIER_0 = 0  # Not verified
    TIER_1 = 1  # Basic verification
    TIER_2 = 2  # Advanced verification


class KYCStatus(enum.Enum):
    """KYC verification status."""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


class KYC(Base, TimestampMixin):
    """KYC verification record."""

    __tablename__ = "kyc_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # User relationship
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True
    )

    # KYC tier and status
    tier: Mapped[KYCTier] = mapped_column(
        SQLEnum(KYCTier), default=KYCTier.TIER_0, nullable=False
    )
    status: Mapped[KYCStatus] = mapped_column(
        SQLEnum(KYCStatus), default=KYCStatus.PENDING, nullable=False
    )

    # Blockpass integration
    blockpass_id: Mapped[str | None] = mapped_column(String(255), unique=True)

    # Verification timestamps
    approved_at: Mapped[datetime | None] = mapped_column(DateTime)

    # Relationship
    user: Mapped["User"] = relationship("User", back_populates="kyc_record")

    def __repr__(self) -> str:
        return f"<KYC(id={self.id}, user_id={self.user_id}, tier={self.tier.name}, status={self.status.name})>"
