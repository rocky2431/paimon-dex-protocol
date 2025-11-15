"""
Referral system API router.

Provides endpoints for referral code generation and statistics.
"""

import logging
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import cache
from app.core.database import get_db
from app.models.user import User
from app.schemas.referral import (
    GenerateCodeRequest,
    GenerateCodeResponse,
    ReferralStatsResponse,
    CreateReferralRequest,
    CreateReferralResponse,
)
from app.services.referral import ReferralService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/referrals", tags=["referrals"])


@router.post("/generate-code", response_model=GenerateCodeResponse, status_code=status.HTTP_200_OK)
async def generate_referral_code(
    request: GenerateCodeRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Generate or regenerate referral code for a user.

    Args:
        request: GenerateCodeRequest with user_id
        db: Database session

    Returns:
        GenerateCodeResponse: Generated referral code

    Raises:
        HTTPException: If user not found (404) or code generation fails (500)
    """
    try:
        service = ReferralService(db)
        code = await service.update_user_referral_code(request.user_id)

        return GenerateCodeResponse(
            user_id=request.user_id,
            referral_code=code,
        )
    except ValueError as e:
        if "not found" in str(e):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate referral code: {str(e)}",
        )
    except Exception as e:
        logger.error(f"Failed to generate referral code: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate referral code",
        )


@router.get("/{user_id}/stats", response_model=ReferralStatsResponse)
async def get_referral_stats(
    user_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Get referral statistics for a user.

    Args:
        user_id: User ID
        db: Database session

    Returns:
        ReferralStatsResponse: Referral statistics

    Raises:
        HTTPException: If user not found (404)
    """
    try:
        service = ReferralService(db)
        stats = await service.get_referral_stats(user_id)

        return ReferralStatsResponse(**stats)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Failed to get referral stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve referral statistics",
        )


@router.get("/address/{wallet_address}/stats", response_model=ReferralStatsResponse)
async def get_referral_stats_by_address(
    wallet_address: str = Path(..., description="User wallet address (Ethereum format)"),
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Get referral statistics for a user by wallet address.

    This endpoint includes caching for better performance.

    Args:
        wallet_address: User wallet address
        db: Database session

    Returns:
        ReferralStatsResponse: Referral statistics

    Raises:
        HTTPException: If user not found (404)
    """
    # Normalize address to lowercase
    normalized_address = wallet_address.lower()

    # Try cache first
    cache_key = f"referral_stats:{normalized_address}"
    cached_data = await cache.get_json(cache_key)
    if cached_data is not None:
        return ReferralStatsResponse(**cached_data)

    try:
        # Get user by wallet address
        user_result = await db.execute(
            select(User).where(User.wallet_address == normalized_address)
        )
        user = user_result.scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with address {wallet_address} not found"
            )

        # Get stats from service
        service = ReferralService(db)
        stats = await service.get_referral_stats(user.id)

        # Cache the result for 5 minutes
        await cache.set_json(
            cache_key,
            stats,
            ttl=timedelta(minutes=5)
        )

        return ReferralStatsResponse(**stats)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get referral stats by address: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve referral statistics",
        )


@router.post("/create", response_model=CreateReferralResponse, status_code=status.HTTP_201_CREATED)
async def create_referral_relationship(
    request: CreateReferralRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Create a referral relationship.

    Binds a referee to a referrer using the referral code.
    This is typically called during user registration.

    Args:
        request: CreateReferralRequest with referee_id and referral_code
        db: Database session

    Returns:
        CreateReferralResponse: Created referral relationship details

    Raises:
        HTTPException: If validation fails (400) or users not found (404)
    """
    try:
        service = ReferralService(db)
        referral = await service.create_referral_relationship(
            referee_id=request.referee_id,
            referral_code=request.referral_code,
        )

        return CreateReferralResponse(
            referral_id=referral.id,
            referrer_id=referral.referrer_id,
            referee_id=referral.referee_id,
            message=f"Successfully created referral relationship: user {referral.referee_id} referred by user {referral.referrer_id}",
        )
    except ValueError as e:
        error_msg = str(e)
        # Determine appropriate status code based on error message
        if "not found" in error_msg:
            status_code = status.HTTP_404_NOT_FOUND
        else:
            status_code = status.HTTP_400_BAD_REQUEST

        raise HTTPException(status_code=status_code, detail=error_msg)
    except Exception as e:
        logger.error(f"Failed to create referral relationship: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create referral relationship",
        )
