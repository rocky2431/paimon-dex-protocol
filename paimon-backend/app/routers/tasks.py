"""
Task Progress API router.

Provides task progress aggregation endpoint for users.
"""

from datetime import timedelta

from fastapi import APIRouter, Depends, Path, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.cache import cache
from app.schemas.task import TaskProgressResponse
from app.services.task_progress import TaskProgressService


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
