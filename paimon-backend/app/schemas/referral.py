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


class CreateReferralRequest(BaseModel):
    """Request schema for creating a referral relationship."""

    referee_id: int = Field(gt=0, alias="refereeId", description="User ID being referred")
    referral_code: str = Field(min_length=6, max_length=8, alias="referralCode", description="Referrer's code")

    model_config = ConfigDict(populate_by_name=True)


class CreateReferralResponse(BaseModel):
    """Response schema for referral relationship creation."""

    model_config = ConfigDict(populate_by_name=True)

    referral_id: int = Field(alias="referralId", description="Created referral record ID")
    referrer_id: int = Field(alias="referrerId", description="Referrer user ID")
    referee_id: int = Field(alias="refereeId", description="Referee user ID")
    message: str = Field(description="Success message")
