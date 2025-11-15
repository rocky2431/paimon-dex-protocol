"""
Task Progress Service.

Aggregates task progress from multiple sources (social tasks + RWA tasks).
"""

from datetime import datetime, UTC
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import TaskProgress, TaskType, TaskStatus
from app.models.user import User
from app.schemas.task import TaskItem, TaskStatistics, TaskProgressResponse


class TaskProgressService:
    """Service for aggregating task progress from multiple sources."""

    def __init__(self, db: AsyncSession):
        """
        Initialize task progress service.

        Args:
            db: Database session
        """
        self.db = db

    async def get_task_progress(self, address: str) -> TaskProgressResponse:
        """
        Get aggregated task progress for a user.

        Args:
            address: User wallet address

        Returns:
            TaskProgressResponse with all tasks and statistics
        """
        # Find user by address (case-insensitive)
        user = await self._find_user_by_address(address)

        if not user:
            # Return empty response for non-existent users
            return TaskProgressResponse(
                address=address,
                tasks=[],
                statistics=self._calculate_statistics([])
            )

        # Get social tasks from database
        social_tasks = await self._get_social_tasks(user.id)

        # TODO: Get RWA tasks from VerificationService (Phase 2)
        rwa_tasks: list[TaskItem] = []

        # Aggregate all tasks
        all_tasks = social_tasks + rwa_tasks

        # Calculate statistics
        statistics = self._calculate_statistics(all_tasks)

        return TaskProgressResponse(
            address=address,
            tasks=all_tasks,
            statistics=statistics
        )

    async def _find_user_by_address(self, address: str) -> User | None:
        """
        Find user by wallet address (case-insensitive).

        Args:
            address: Wallet address

        Returns:
            User if found, None otherwise
        """
        normalized_address = address.lower()
        stmt = select(User).where(User.address.ilike(normalized_address))
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def _get_social_tasks(self, user_id: int) -> list[TaskItem]:
        """
        Get social tasks from task_progress table.

        Args:
            user_id: User ID

        Returns:
            List of social task items
        """
        stmt = (
            select(TaskProgress)
            .where(TaskProgress.user_id == user_id)
            .order_by(TaskProgress.created_at.desc())
        )
        result = await self.db.execute(stmt)
        task_progress_records = result.scalars().all()

        return [
            self._convert_task_progress_to_item(record)
            for record in task_progress_records
        ]

    def _convert_task_progress_to_item(
        self,
        task_progress: TaskProgress
    ) -> TaskItem:
        """
        Convert TaskProgress ORM model to TaskItem schema.

        Args:
            task_progress: TaskProgress ORM model

        Returns:
            TaskItem schema
        """
        return TaskItem(
            taskId=task_progress.task_id,
            taskType=task_progress.task_type.value,
            status=task_progress.status.value,
            completedAt=task_progress.completed_at,
            claimedAt=task_progress.claimed_at,
            rewardAmount=str(task_progress.reward_amount) if task_progress.reward_amount else None,
            config=task_progress.config,
            verificationData=task_progress.verification_data
        )

    def _calculate_statistics(self, tasks: list[TaskItem]) -> TaskStatistics:
        """
        Calculate task statistics from task list.

        Args:
            tasks: List of task items

        Returns:
            TaskStatistics summary
        """
        total = len(tasks)
        completed = sum(1 for task in tasks if task.status == TaskStatus.COMPLETED.value)
        pending = sum(1 for task in tasks if task.status == TaskStatus.PENDING.value)
        claimed = sum(1 for task in tasks if task.status == TaskStatus.CLAIMED.value)

        # Calculate completion rate
        completion_rate = (completed + claimed) / total if total > 0 else 0.0

        return TaskStatistics(
            total=total,
            completed=completed,
            pending=pending,
            claimed=claimed,
            completionRate=completion_rate
        )
