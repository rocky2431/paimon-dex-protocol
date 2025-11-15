"""
KYC schemas for API requests and responses.

Schemas:
- BlockpassWebhookPayload: Blockpass webhook POST request payload
- KYCStatusResponse: Response model for KYC status query
"""

from pydantic import BaseModel, Field


class BlockpassWebhookPayload(BaseModel):
    """
    Blockpass webhook payload structure.

    This schema matches the JSON payload sent by Blockpass when KYC events occur.

    Webhook Events:
    - user.created: Profile submission to dashboard
    - user.readyToReview: User completed all certifications
    - review.approved: Reviewer approval
    - user.inReview: Profile moved to review status
    - review.rejected: Reviewer rejection
    - user.blocked: Profile blocked
    - user.deleted: Profile deleted

    Example:
        >>> payload = BlockpassWebhookPayload(
        ...     guid="123e4567-e89b-12d3-a456-426614174000",
        ...     status="approved",
        ...     clientId="my-client-id",
        ...     event="review.approved",
        ...     recordId="rec_abc123",
        ...     refId="0x1234567890abcdef1234567890abcdef12345678",
        ...     submitCount=1,
        ...     blockPassID="bp_xyz789",
        ...     isArchived=False,
        ...     isPing=False,
        ...     env="prod"
        ... )
    """

    guid: str = Field(..., description="Unique webhook delivery ID (matches X-Blockpass-Delivery header)")
    status: str = Field(..., description="Current KYC status (pending, approved, rejected, etc.)")
    clientId: str = Field(..., description="Blockpass client ID from Admin Console")
    event: str = Field(..., description="Event type that triggered webhook (e.g., review.approved)")
    recordId: str = Field(..., description="Blockpass record ID for dashboard URL generation")
    refId: str = Field(..., description="External reference ID (wallet address from widget)")
    submitCount: int = Field(..., description="Number of times profile was submitted")
    blockPassID: str = Field(..., description="Blockpass support reference ID")
    isArchived: bool = Field(..., description="Whether record is archived")
    isPing: bool = Field(False, description="Test/ping webhook flag (can be ignored)")
    env: str = Field("prod", description="Environment (always 'prod')")

    model_config = {"extra": "forbid"}  # Reject unknown fields


class KYCStatusResponse(BaseModel):
    """
    Response model for KYC status query.

    Returns the current KYC verification status for a user.

    Example:
        >>> response = KYCStatusResponse(
        ...     tier=1,
        ...     status="approved",
        ...     approved_at="2025-11-15T12:00:00Z",
        ...     blockpass_id="bp_xyz789"
        ... )
    """

    tier: int = Field(..., description="KYC tier level (0=none, 1=basic, 2=advanced)")
    status: str = Field(..., description="Verification status (pending, approved, rejected, expired)")
    approved_at: str | None = Field(None, description="ISO 8601 timestamp of approval")
    blockpass_id: str | None = Field(None, description="Blockpass record ID")

    model_config = {"from_attributes": True}  # Enable ORM mode


class KYCWebhookResponse(BaseModel):
    """
    Response model for webhook endpoint.

    Blockpass expects HTTP 200/201 for successful delivery.

    Example:
        >>> response = KYCWebhookResponse(
        ...     success=True,
        ...     message="Webhook processed successfully",
        ...     guid="123e4567-e89b-12d3-a456-426614174000"
        ... )
    """

    success: bool = Field(..., description="Whether webhook was processed successfully")
    message: str = Field(..., description="Status message")
    guid: str | None = Field(None, description="Webhook delivery ID for tracing")
