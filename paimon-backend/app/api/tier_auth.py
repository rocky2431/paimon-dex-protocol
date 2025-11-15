"""
Tier-based authorization for KYC features.

Provides FastAPI dependencies for enforcing KYC tier requirements.
"""

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.kyc import KYC, KYCStatus
from app.models.user import User


# Tier requirement messages
TIER_MESSAGES = {
    0: "此功能需要完成 KYC 认证。请前往用户中心完成基础认证。",
    1: "此功能需要 Tier 1 认证。请前往用户中心完成基础 KYC 认证。",
    2: "此功能需要 Tier 2 高级认证。请前往用户中心完成高级 KYC 认证。",
}


async def get_user_tier(
    user: User,
    db: AsyncSession,
) -> int:
    """
    Get user's current KYC tier level.

    Args:
        user: User model instance
        db: Database session

    Returns:
        int: Tier level (0, 1, or 2)

    Logic:
        - No KYC record → Tier 0
        - KYC status not APPROVED → Tier 0
        - KYC status APPROVED → Return tier from record
    """
    # Query KYC record
    kyc_query = select(KYC).where(KYC.user_id == user.id)
    result = await db.execute(kyc_query)
    kyc_record = result.scalar_one_or_none()

    # No KYC record → Tier 0
    if not kyc_record:
        return 0

    # Only APPROVED status grants tier
    if kyc_record.status != KYCStatus.APPROVED:
        return 0

    # Return tier value
    return kyc_record.tier.value


class RequireTier:
    """
    FastAPI dependency for tier-based authorization.

    Usage:
        @router.get("/features/tier1-only")
        async def tier1_feature(
            tier_check: None = Depends(RequireTier(1)),
        ):
            return {"message": "Access granted"}
    """

    def __init__(self, min_tier: int):
        """
        Initialize tier requirement.

        Args:
            min_tier: Minimum tier level required (0, 1, or 2)
        """
        self.min_tier = min_tier

    async def __call__(
        self,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> None:
        """
        Verify user meets tier requirement.

        Args:
            current_user: Authenticated user
            db: Database session

        Raises:
            HTTPException: 403 Forbidden if user tier < min_tier
        """
        # Get user's current tier
        user_tier = await get_user_tier(current_user, db)

        # Check tier requirement
        if user_tier < self.min_tier:
            # Get appropriate error message
            message = TIER_MESSAGES.get(
                self.min_tier,
                f"此功能需要 Tier {self.min_tier} 认证。"
            )

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=message,
            )


# Convenience dependencies for common tier requirements
require_tier_1 = RequireTier(1)
require_tier_2 = RequireTier(2)
