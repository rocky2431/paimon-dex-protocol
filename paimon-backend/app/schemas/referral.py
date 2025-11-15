"""
Pydantic schemas for referral system.

Handles validation and serialization for referral-related API requests/responses.
"""

from pydantic import BaseModel, Field, ConfigDict


class GenerateCodeRequest(BaseModel):
    """Request schema for generating/regenerating referral code."""

    user_id: int = Field(gt=0, description="User ID")

    model_config = ConfigDict(populate_by_name=True)


class GenerateCodeResponse(BaseModel):
    """Response schema for referral code generation."""

    model_config = ConfigDict(populate_by_name=True)

    user_id: int = Field(alias="userId", description="User ID")
    referral_code: str = Field(alias="referralCode", description="Generated referral code (6-8 chars)")


class ReferralStatsResponse(BaseModel):
    """Response schema for referral statistics."""

    model_config = ConfigDict(populate_by_name=True)

    user_id: int = Field(alias="userId", description="User ID")
    referral_code: str = Field(alias="referralCode", description="User's referral code")
    total_referrals: int = Field(alias="totalReferrals", description="Total number of referrals")
    total_rewards_earned: str = Field(alias="totalRewardsEarned", description="Total rewards earned (decimal string)")
