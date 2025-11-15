"""
Task Progress API router.

Provides task progress aggregation endpoint for users and reward claiming.
"""

from datetime import datetime, timedelta, UTC

from fastapi import APIRouter, Depends, Path, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.cache import cache
from app.models.task import TaskProgress, TaskStatus
from app.models.user import User
from app.schemas.task import (
    TaskProgressResponse,
    ClaimRewardRequest,
    ClaimRewardResponse,
)
from app.services.task_progress import TaskProgressService
from app.services.points import PointsService


router = APIRouter(prefix="/api/tasks", tags=["Tasks"])


def validate_ethereum_address(address: str) -> str:
    """
    Validate Ethereum address format (case-insensitive).

    Args:
        address: Ethereum address string

    Returns:
        Validated and normalized (lowercase) address

    Raises:
        HTTPException: If address format is invalid
    """
    # Normalize to lowercase for validation
    normalized = address.lower() if address else ""

    # Basic validation: must start with 0x and be 42 characters
    if not normalized or len(normalized) != 42 or not normalized.startswith("0x"):
        raise HTTPException(
            status_code=422,
            detail="Invalid Ethereum address format. Expected 42 characters starting with 0x"
        )

    # Check hex characters (skip 0x prefix)
    try:
        int(normalized, 16)
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail="Invalid Ethereum address format. Contains non-hexadecimal characters"
        )

    return normalized


@router.get(
    "/{address}",
    response_model=TaskProgressResponse,
    summary="Get user task progress",
    description="""
    Get aggregated task progress for a user address.

    This endpoint aggregates task progress from multiple sources:
    - Social tasks (from task_progress table)
    - RWA tasks (from VerificationService)

    **Parameters**:
    - `address`: User wallet address (Ethereum format, case-insensitive)

    **Response**:
    - `tasks`: List of all tasks with status and verification data
    - `statistics`: Aggregated statistics (total, completed, pending, claimed, completion rate)

    **Performance**:
    - Cached for 5 minutes (Redis)
    - Response time target: < 500ms
    """,
)
async def get_task_progress(
    address: str = Path(
        ...,
        description="Ethereum wallet address (42 characters, 0x-prefixed, case-insensitive)",
    ),
    db: AsyncSession = Depends(get_db),
) -> TaskProgressResponse:
    """
    Get task progress for a user.

    Args:
        address: User wallet address
        db: Database session

    Returns:
        TaskProgressResponse: Aggregated task progress

    Raises:
        HTTPException: If address format is invalid (422)
    """
    # Validate address format (returns normalized lowercase address)
    validated_address = validate_ethereum_address(address)

    # Create cache key using normalized address
    cache_key = f"task_progress:{validated_address}"

    # Try to get from cache
    cached_data = await cache.get_json(cache_key)
    if cached_data is not None:
        return TaskProgressResponse(**cached_data)

    # Cache miss - query from service
    task_service = TaskProgressService(db)
    task_progress = await task_service.get_task_progress(validated_address)

    # Cache the result for 5 minutes
    await cache.set_json(
        cache_key,
        task_progress.model_dump(by_alias=True),
        ttl=timedelta(minutes=5)
    )

    return task_progress


@router.post(
    "/{task_id}/claim",
    response_model=ClaimRewardResponse,
    status_code=status.HTTP_200_OK,
    summary="Claim task reward",
    description="""
    Claim reward points for a completed task.

    **Requirements**:
    - Task must be in COMPLETED status
    - User must have completed the task
    - Task can only be claimed once

    **Process**:
    1. Verify task exists and is completed
    2. Check task hasn't been claimed already
    3. Award points using PointsService (idempotent)
    4. Update task status to CLAIMED
    5. Invalidate task progress cache

    **Error Codes**:
    - 404: Task not found or user hasn't completed this task
    - 400: Task not completed yet or already claimed
    - 500: Points service error
    """,
)
async def claim_task_reward(
    task_id: str = Path(..., description="Task identifier"),
    request: ClaimRewardRequest = None,
    db: AsyncSession = Depends(get_db),
) -> ClaimRewardResponse:
    """
    Claim reward for completed task.

    Args:
        task_id: Task identifier
        request: Claim request with user address
        db: Database session

    Returns:
        ClaimRewardResponse: Claim result with points awarded

    Raises:
        HTTPException: If task not found (404), not completed (400),
                      already claimed (400), or points service fails (500)
    """
    # Validate user address
    user_address = validate_ethereum_address(request.user_address)

    # Get user by address
    user_result = await db.execute(
        select(User).where(User.wallet_address == user_address)
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with address {user_address} not found"
        )

    # Get task progress
    task_result = await db.execute(
        select(TaskProgress).where(
            TaskProgress.user_id == user.id,
            TaskProgress.task_id == task_id
        )
    )
    task_progress = task_result.scalar_one_or_none()
    if not task_progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task {task_id} not found or not started by user"
        )

    # Check if task is completed
    if task_progress.status != TaskStatus.COMPLETED:
        if task_progress.status == TaskStatus.CLAIMED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Task {task_id} has already been claimed"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Task {task_id} is not completed yet. Current status: {task_progress.status.value}"
        )

    # Determine points to award (use reward_amount if set, otherwise default)
    points_to_award = int(task_progress.reward_amount) if task_progress.reward_amount else 100

    # Award points using PointsService (idempotent)
    points_service = PointsService(db)
    try:
        transaction = await points_service.award_points(
            user_id=user.id,
            amount=points_to_award,
            source="task_completion",
            reference_id=task_id,
            metadata={
                "task_type": task_progress.task_type.value,
                "completed_at": task_progress.completed_at.isoformat() if task_progress.completed_at else None,
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to award points: {str(e)}"
        )

    # Update task status to CLAIMED
    task_progress.status = TaskStatus.CLAIMED
    task_progress.claimed_at = datetime.now(UTC)

    await db.commit()
    await db.refresh(task_progress)

    # Invalidate task progress cache for this user
    cache_key = f"task_progress:{user_address}"
    await cache.delete(cache_key)

    return ClaimRewardResponse(
        task_id=task_id,
        status=task_progress.status.value,
        points_awarded=points_to_award,
        transaction_id=transaction.transaction_id,
        claimed_at=task_progress.claimed_at,
    )
