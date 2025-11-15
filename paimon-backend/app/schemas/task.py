"""
Task Progress API schemas.

Response models for task progress aggregation.
"""

from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field, ConfigDict


class TaskItem(BaseModel):
    """Individual task progress item."""

    model_config = ConfigDict(populate_by_name=True)

    task_id: str = Field(..., alias="taskId", description="Task identifier")
    task_type: str = Field(..., alias="taskType", description="Task type (social/onchain_complex/etc)")
    status: str = Field(..., description="Task status (pending/completed/claimed)")
    completed_at: datetime | None = Field(None, alias="completedAt", description="Completion timestamp")
    claimed_at: datetime | None = Field(None, alias="claimedAt", description="Claim timestamp")
    reward_amount: str | None = Field(None, alias="rewardAmount", description="Reward amount (decimal string)")
    config: dict[str, Any] | None = Field(None, description="Task configuration")
    verification_data: dict[str, Any] | None = Field(None, alias="verificationData", description="Verification data")


class TaskStatistics(BaseModel):
    """Task statistics summary."""

    model_config = ConfigDict(populate_by_name=True)

    total: int = Field(..., description="Total number of tasks")
    completed: int = Field(..., description="Number of completed tasks")
    pending: int = Field(..., description="Number of pending tasks")
    claimed: int = Field(..., description="Number of claimed tasks")
    completion_rate: float = Field(..., alias="completionRate", description="Completion rate (0-1)")


class TaskProgressResponse(BaseModel):
    """Task progress aggregation response."""

    model_config = ConfigDict(populate_by_name=True)

    address: str = Field(..., description="User wallet address")
    tasks: list[TaskItem] = Field(default_factory=list, description="List of tasks")
    statistics: TaskStatistics = Field(..., description="Task statistics")


class ClaimRewardRequest(BaseModel):
    """Request schema for claiming task rewards."""

    user_address: str = Field(
        ...,
        alias="userAddress",
        description="User wallet address (Ethereum format)",
        min_length=42,
        max_length=42,
    )

    model_config = ConfigDict(populate_by_name=True)


class ClaimRewardResponse(BaseModel):
    """Response schema for task reward claim."""

    model_config = ConfigDict(populate_by_name=True)

    task_id: str = Field(..., alias="taskId", description="Task identifier")
    status: str = Field(..., description="Updated task status (should be 'claimed')")
    points_awarded: int = Field(..., alias="pointsAwarded", description="Points awarded for this task")
    transaction_id: str = Field(..., alias="transactionId", description="Points transaction ID")
    claimed_at: datetime = Field(..., alias="claimedAt", description="Claim timestamp")
