"""
TaskOn API router.

Provides verification endpoint for TaskOn platform to check user task completion.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.taskon_auth import verify_taskon_token
from app.models.task import TaskProgress, TaskStatus
from app.models.user import User
from app.schemas.taskon import TaskOnVerificationResponse

router = APIRouter(prefix="/api/taskon", tags=["TaskOn"])


async def _find_user_by_address(
    db: AsyncSession, address: str
) -> User | None:
    """
    Find user by wallet address (case-insensitive).

    Args:
        db: Database session
        address: Wallet address or social ID

    Returns:
        User if found, None otherwise
    """
    normalized_address = address.lower()
    stmt = select(User).where(User.address.ilike(normalized_address))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def _check_task_completion(
    db: AsyncSession, user_id: int, task_id: str
) -> bool:
    """
    Check if user has completed a specific task.

    Args:
        db: Database session
        user_id: User ID
        task_id: Task identifier

    Returns:
        True if task is completed, False otherwise
    """
    stmt = (
        select(TaskProgress)
        .where(TaskProgress.user_id == user_id)
        .where(TaskProgress.task_id == task_id)
        .where(TaskProgress.status == TaskStatus.COMPLETED)
    )
    result = await db.execute(stmt)
    task_progress = result.scalar_one_or_none()
    return task_progress is not None


@router.get(
    "/verification",
    response_model=TaskOnVerificationResponse,
    summary="Verify user task completion",
    description="""
    TaskOn verification API endpoint.

    This endpoint is called by TaskOn platform to verify if a user has completed a task.

    **Parameters**:
    - `address`: User wallet address or social media ID (case-insensitive)
    - `task_id`: Internal task identifier

    **Response**:
    - `result.isValid`: true if user completed the task, false otherwise

    **Authentication**:
    - Bearer token required if TASKON_API_KEY is configured
    """,
)
async def verify_task_completion(
    address: str = Query(
        ...,
        description="Wallet address or social media ID (case-insensitive)",
        min_length=1,
    ),
    task_id: str = Query(
        ...,
        description="Task identifier",
        min_length=1,
    ),
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_taskon_token),
) -> TaskOnVerificationResponse:
    """
    Verify if user has completed a specific task.

    TaskOn calls this endpoint to check task completion status.

    Args:
        address: User wallet address or social ID
        task_id: Internal task ID
        db: Database session
        _: TaskOn token verification (dependency)

    Returns:
        TaskOnVerificationResponse: {"result": {"isValid": true/false}}
    """
    # Find user by address
    user = await _find_user_by_address(db, address)
    if not user:
        return TaskOnVerificationResponse(result={"isValid": False})

    # Check if user has completed the task
    is_valid = await _check_task_completion(db, user.id, task_id)
    return TaskOnVerificationResponse(result={"isValid": is_valid})
