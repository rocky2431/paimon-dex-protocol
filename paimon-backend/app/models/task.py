"""
Task ORM models.

Stores user task progress and completion status.
"""

import enum
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy import (
    Enum as SQLEnum,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class TaskType(enum.Enum):
    """Task type classification."""

    SOCIAL = "social"  # Twitter, Discord tasks
    ONCHAIN_SIMPLE = "onchain_simple"  # Token holding, swaps
    ONCHAIN_COMPLEX = "onchain_complex"  # RWA tasks (time dimension, health factor)
    REFERRAL = "referral"  # Referral tasks


class TaskStatus(enum.Enum):
    """Task completion status."""

    PENDING = "pending"
    COMPLETED = "completed"
    CLAIMED = "claimed"


class TaskProgress(Base, TimestampMixin):
    """User task progress tracking with enhanced configuration and verification support."""

    __tablename__ = "task_progress"
    __table_args__ = (
        # Ensure user cannot have duplicate task progress records
        UniqueConstraint("user_id", "task_id", name="uq_user_task"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # User relationship
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )

    # Task identification
    task_id: Mapped[str] = mapped_column(
        String(255), nullable=False, index=True
    )  # Internal task ID
    external_task_id: Mapped[str | None] = mapped_column(
        String(255), index=True
    )  # External task ID (e.g., TaskOn task ID)
    task_type: Mapped[TaskType] = mapped_column(SQLEnum(TaskType), nullable=False)

    # Progress status
    status: Mapped[TaskStatus] = mapped_column(
        SQLEnum(TaskStatus), default=TaskStatus.PENDING, nullable=False, index=True
    )

    # Task configuration (TaskOn API config, RWA verification rules, referral targets)
    config: Mapped[dict[str, Any] | None] = mapped_column(
        JSON
    )  # Flexible JSON storage for task-specific configuration

    # Verification data (snapshots of verification results for complex tasks)
    verification_data: Mapped[dict[str, Any] | None] = mapped_column(
        JSON
    )  # Store validation results, timestamps, asset values, etc.

    # Completion timestamps
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)
    claimed_at: Mapped[datetime | None] = mapped_column(DateTime)

    # Reward information
    reward_amount: Mapped[Decimal | None] = mapped_column(
        Numeric(precision=36, scale=18)  # Support up to 18 decimals for tokens
    )

    # Relationship
    user: Mapped["User"] = relationship("User", back_populates="task_progress")

    def __repr__(self) -> str:
        return f"<TaskProgress(id={self.id}, user_id={self.user_id}, task_id={self.task_id}, status={self.status.name})>"
