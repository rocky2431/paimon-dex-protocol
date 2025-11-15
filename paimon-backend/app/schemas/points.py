"""
Pydantic schemas for points system.

Handles validation and serialization for points-related API requests/responses.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class PointsBalanceResponse(BaseModel):
    """Points balance response schema."""

    user_id: int
    balance: int = Field(description="Current points balance")
    total_earned: int = Field(description="Lifetime total earned points")
    total_spent: int = Field(description="Lifetime total spent points")
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PointsTransactionResponse(BaseModel):
    """Points transaction response schema."""

    id: int
    balance_id: int
    type: str = Field(description="Transaction type: award, deduct, redeem")
    amount: int = Field(description="Transaction amount (positive or negative)")
    balance_after: int = Field(description="Balance after this transaction")
    source: str = Field(description="Transaction source")
    reference_id: Optional[str] = Field(
        None, description="Reference ID (task_id, referral_id, etc.)"
    )
    transaction_id: str = Field(description="Idempotency key")
    transaction_metadata: Optional[str] = Field(None, description="Additional JSON metadata")
    created_at: datetime

    model_config = {"from_attributes": True}


class AwardPointsRequest(BaseModel):
    """Request schema for awarding points."""

    user_id: int = Field(description="User ID to award points to")
    amount: int = Field(gt=0, description="Points amount (must be positive)")
    source: str = Field(
        description="Source of points (e.g., 'task_completion', 'referral_bonus')"
    )
    reference_id: str = Field(description="Reference ID (e.g., task_id, referral_id)")
    metadata: Optional[dict] = Field(None, description="Additional metadata")

    @field_validator("source")
    @classmethod
    def validate_source(cls, v: str) -> str:
        """Validate source is one of allowed values."""
        allowed_sources = [
            "task_completion",
            "referral_bonus",
            "daily_checkin",
            "admin_grant",
        ]
        if v not in allowed_sources:
            raise ValueError(
                f"Invalid source: {v}. Must be one of {allowed_sources}"
            )
        return v


class DeductPointsRequest(BaseModel):
    """Request schema for deducting points."""

    user_id: int = Field(description="User ID to deduct points from")
    amount: int = Field(gt=0, description="Points amount (must be positive)")
    source: str = Field(
        description="Source of deduction (e.g., 'admin_correction', 'penalty')"
    )
    reference_id: str = Field(description="Reference ID")
    metadata: Optional[dict] = Field(None, description="Additional metadata")


class RedeemPointsRequest(BaseModel):
    """Request schema for redeeming points."""

    user_id: int = Field(gt=0, description="User ID")
    amount: int = Field(gt=0, description="Points to redeem (must be positive)")
    redemption_type: str = Field(
        default="espaimon", description="Redemption type (default: espaimon)"
    )

    @field_validator("redemption_type")
    @classmethod
    def validate_redemption_type(cls, v: str) -> str:
        """Validate redemption type."""
        if v != "espaimon":
            raise ValueError("Currently only 'espaimon' redemption is supported")
        return v


class RedeemPointsResponse(BaseModel):
    """Response schema for points redemption."""

    transaction_id: str = Field(description="Unique transaction ID")
    amount: int = Field(description="Points redeemed")
    espaimon_amount: str = Field(description="esPAIMON tokens granted (in Wei)")
    tx_hash: Optional[str] = Field(None, description="Blockchain transaction hash")
    balance_after: int = Field(description="Points balance after redemption")
    created_at: datetime


class PointsHistoryResponse(BaseModel):
    """Response schema for points transaction history."""

    transactions: list[PointsTransactionResponse]
    total_count: int
    page: int
    page_size: int


class RedeemPointsResponse(BaseModel):
    """Response schema for points redemption."""

    redemption_id: int = Field(alias="redemptionId", description="Redemption request ID")
    points_amount: int = Field(alias="pointsAmount", description="Points redeemed")
    espaimon_amount: str = Field(alias="espaimonAmount", description="esPAIMON amount (in Wei, 18 decimals)")
    status: str = Field(description="Redemption status (pending/processing/completed/failed)")
    created_at: datetime = Field(alias="createdAt", description="Request creation time")

    model_config = {"from_attributes": True, "populate_by_name": True}


class RedemptionHistoryItem(BaseModel):
    """Individual redemption history item."""

    redemption_id: int = Field(alias="redemptionId")
    points_amount: int = Field(alias="pointsAmount")
    espaimon_amount: str = Field(alias="espaimonAmount")
    status: str = Field(description="Redemption status")
    transaction_hash: Optional[str] = Field(None, alias="transactionHash")
    error_message: Optional[str] = Field(None, alias="errorMessage")
    created_at: datetime = Field(alias="createdAt")
    completed_at: Optional[datetime] = Field(None, alias="completedAt")

    model_config = {"from_attributes": True, "populate_by_name": True}


class RedemptionHistoryResponse(BaseModel):
    """Response schema for redemption history."""

    redemptions: list[RedemptionHistoryItem]
    total_count: int = Field(alias="totalCount")
    page: int
    page_size: int = Field(alias="pageSize")

    model_config = {"populate_by_name": True}
