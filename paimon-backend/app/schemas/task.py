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
