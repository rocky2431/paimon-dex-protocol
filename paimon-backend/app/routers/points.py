"""
Points system API router.

Provides endpoints for points balance, transactions, and redemptions.
"""

import logging
from datetime import datetime, UTC
from decimal import Decimal
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.redemption import PointsRedemption, RedemptionStatus
from app.models.user import User
from app.schemas.points import (
    AwardPointsRequest,
    DeductPointsRequest,
    PointsBalanceResponse,
    PointsHistoryResponse,
    PointsTransactionResponse,
    RedeemPointsRequest,
    RedeemPointsResponse,
    RedemptionHistoryItem,
    RedemptionHistoryResponse,
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


@router.post("/redeem", response_model=RedeemPointsResponse, status_code=status.HTTP_201_CREATED)
async def redeem_points(
    request: RedeemPointsRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Redeem points for esPAIMON tokens.

    Creates a redemption request that will be processed asynchronously.

    Conversion rate: 1 point = 1 esPAIMON (18 decimals)

    Returns:
        RedeemPointsResponse: Redemption request details
    """
    try:
        # Validate user exists
        user_result = await db.execute(
            select(User).where(User.id == request.user_id)
        )
        user = user_result.scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User {request.user_id} not found"
            )

        # Check points balance
        points_service = PointsService(db)
        balance = await points_service.get_balance(request.user_id)

        if balance.balance < request.amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient points balance: {balance.balance} < {request.amount}"
            )

        # Calculate esPAIMON amount (1:1 ratio, converted to Wei)
        # 1 point = 1 esPAIMON = 1 * 10^18 Wei
        espaimon_wei = Decimal(request.amount) * Decimal(10 ** 18)

        # Deduct points using PointsService
        transaction = await points_service.deduct_points(
            user_id=request.user_id,
            amount=request.amount,
            source="espaimon_redemption",
            reference_id=f"redemption_{datetime.now(UTC).timestamp()}",
            metadata={"redemption_type": request.redemption_type}
        )

        # Create redemption request
        redemption = PointsRedemption(
            user_id=request.user_id,
            points_amount=request.amount,
            espaimon_amount=espaimon_wei,
            status=RedemptionStatus.PENDING,
        )

        db.add(redemption)
        await db.commit()
        await db.refresh(redemption)

        logger.info(
            f"Created redemption request {redemption.id} for user {request.user_id}: "
            f"{request.amount} points -> {espaimon_wei} Wei esPAIMON"
        )

        return RedeemPointsResponse(
            redemption_id=redemption.id,
            points_amount=redemption.points_amount,
            espaimon_amount=str(redemption.espaimon_amount),
            status=redemption.status.value,
            created_at=redemption.created_at,
        )

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create redemption request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process redemption request",
        )


@router.get("/redemption-history/{user_id}", response_model=RedemptionHistoryResponse)
async def get_redemption_history(
    user_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 50,
):
    """
    Get user's redemption history with pagination.

    Query Parameters:
        page: Page number (starts from 1)
        page_size: Number of records per page (max 100)

    Returns:
        Paginated redemption history
    """
    try:
        # Verify user exists
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User {user_id} not found"
            )

        # Get total count
        count_result = await db.execute(
            select(PointsRedemption.id).where(PointsRedemption.user_id == user_id)
        )
        total_count = len(count_result.all())

        # Get paginated redemptions
        offset = (page - 1) * page_size
        query = (
            select(PointsRedemption)
            .where(PointsRedemption.user_id == user_id)
            .order_by(desc(PointsRedemption.created_at))
            .limit(page_size)
            .offset(offset)
        )
        result = await db.execute(query)
        redemptions = result.scalars().all()

        # Convert to response items
        redemption_items = [
            RedemptionHistoryItem(
                redemption_id=r.id,
                points_amount=r.points_amount,
                espaimon_amount=str(r.espaimon_amount),
                status=r.status.value,
                transaction_hash=r.transaction_hash,
                error_message=r.error_message,
                created_at=r.created_at,
                completed_at=r.completed_at,
            )
            for r in redemptions
        ]

        return RedemptionHistoryResponse(
            redemptions=redemption_items,
            total_count=total_count,
            page=page,
            page_size=page_size,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get redemption history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve redemption history",
        )
