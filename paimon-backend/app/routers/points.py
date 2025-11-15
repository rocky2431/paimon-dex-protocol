"""
Points system API router.

Provides endpoints for points balance, transactions, and redemptions.
"""

import logging
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.points import (
    AwardPointsRequest,
    DeductPointsRequest,
    PointsBalanceResponse,
    PointsHistoryResponse,
    PointsTransactionResponse,
)
from app.services.points import PointsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/points", tags=["points"])


@router.get("/balance/{user_id}", response_model=PointsBalanceResponse)
async def get_points_balance(
    user_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Get user's points balance.

    Returns:
        Points balance with total earned and spent
    """
    try:
        service = PointsService(db)
        balance = await service.get_balance(user_id)
        return balance
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to get points balance: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve points balance",
        )


@router.post("/award", response_model=PointsTransactionResponse, status_code=status.HTTP_201_CREATED)
async def award_points(
    request: AwardPointsRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Award points to a user (idempotent).

    Uses transaction_id for idempotency - multiple requests with same source:reference_id
    will only create one transaction.

    Returns:
        Created transaction record
    """
    try:
        service = PointsService(db)
        transaction = await service.award_points(
            user_id=request.user_id,
            amount=request.amount,
            source=request.source,
            reference_id=request.reference_id,
            metadata=request.metadata,
        )
        return transaction
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to award points: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to award points",
        )


@router.post("/deduct", response_model=PointsTransactionResponse)
async def deduct_points(
    request: DeductPointsRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Deduct points from a user (idempotent).

    Requires sufficient balance. Uses transaction_id for idempotency.

    Returns:
        Created transaction record
    """
    try:
        service = PointsService(db)
        transaction = await service.deduct_points(
            user_id=request.user_id,
            amount=request.amount,
            source=request.source,
            reference_id=request.reference_id,
            metadata=request.metadata,
        )
        return transaction
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to deduct points: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to deduct points",
        )


@router.get("/history/{user_id}", response_model=PointsHistoryResponse)
async def get_points_history(
    user_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 50,
    transaction_type: Annotated[Optional[str], Query()] = None,
):
    """
    Get user's points transaction history with pagination.

    Query Parameters:
        page: Page number (starts from 1)
        page_size: Number of records per page (max 100)
        transaction_type: Filter by type ('award', 'deduct', 'redeem')

    Returns:
        Paginated transaction history
    """
    try:
        service = PointsService(db)
        offset = (page - 1) * page_size

        transactions, total_count = await service.get_transactions(
            user_id=user_id,
            limit=page_size,
            offset=offset,
            transaction_type=transaction_type,
        )

        return PointsHistoryResponse(
            transactions=transactions,
            total_count=total_count,
            page=page,
            page_size=page_size,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to get points history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve points history",
        )
