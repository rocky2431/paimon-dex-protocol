"""
User ORM model.

Stores user account information including wallet address and social login.
"""

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.kyc import KYC
    from app.models.points import PointsBalance
    from app.models.portfolio_cache import PortfolioCache
    from app.models.referral import Referral
    from app.models.task import TaskProgress


class User(Base, TimestampMixin):
    """User model for authentication and profile."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Wallet address (primary identifier)
    address: Mapped[str] = mapped_column(
        String(42), unique=True, index=True, nullable=False
    )

    # Social login (optional)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
    social_provider: Mapped[str | None] = mapped_column(String(50))  # google, x, email
    social_id: Mapped[str | None] = mapped_column(String(255))

    # Referral system
    referral_code: Mapped[str] = mapped_column(
        String(8), unique=True, index=True, nullable=False
    )
    referred_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), index=True
    )

    # Relationships
    kyc_record: Mapped["KYC"] = relationship(
        "KYC", back_populates="user", uselist=False
    )
    referrals: Mapped[list["Referral"]] = relationship(
        "Referral",
        foreign_keys="[Referral.referrer_id]",
        back_populates="referrer",
    )
    task_progress: Mapped[list["TaskProgress"]] = relationship(
        "TaskProgress", back_populates="user"
    )
    portfolio_caches: Mapped[list["PortfolioCache"]] = relationship(
        "PortfolioCache", back_populates="user"
    )
    points_balance: Mapped["PointsBalance"] = relationship(
        "PointsBalance", back_populates="user", uselist=False
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, address={self.address})>"
