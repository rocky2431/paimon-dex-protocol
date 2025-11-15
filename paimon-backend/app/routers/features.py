"""
Feature endpoints with tier-based authorization.

Demonstrates KYC tier requirements for different features.
"""

from fastapi import APIRouter, Depends

from app.api.dependencies import get_current_user
from app.api.tier_auth import require_tier_1, require_tier_2
from app.models.user import User

router = APIRouter(prefix="/api/features", tags=["features"])


@router.get("/tier1-only")
async def tier1_feature(
    current_user: User = Depends(get_current_user),
    tier_check: None = Depends(require_tier_1),
):
    """
    Tier 1 restricted feature (Basic KYC required).

    Example use cases:
    - Basic trading features
    - Standard launchpad participation
    - Basic borrowing limits

    Requires:
        - Tier 1 (Basic KYC) or higher

    Returns:
        Success message if authorized
    """
    return {
        "success": True,
        "message": "Tier 1 feature access granted",
        "user_address": current_user.address,
        "feature": "tier1-only",
    }


@router.get("/tier2-only")
async def tier2_feature(
    current_user: User = Depends(get_current_user),
    tier_check: None = Depends(require_tier_2),
):
    """
    Tier 2 restricted feature (Advanced KYC required).

    Example use cases:
    - High-value launchpad participation
    - Increased borrowing limits
    - Advanced trading features
    - Governance voting

    Requires:
        - Tier 2 (Advanced KYC)

    Returns:
        Success message if authorized
    """
    return {
        "success": True,
        "message": "Tier 2 feature access granted",
        "user_address": current_user.address,
        "feature": "tier2-only",
    }


@router.get("/public")
async def public_feature():
    """
    Public feature (no KYC required).

    Example use cases:
    - Read-only data
    - Public statistics
    - General information

    Returns:
        Public data
    """
    return {
        "success": True,
        "message": "Public feature - no KYC required",
        "feature": "public",
    }
