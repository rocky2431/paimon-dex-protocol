"""
User schemas for API requests and responses.

Schemas:
- UserResponse: Response model for user profile
- UserUpdateRequest: Request model for updating user profile
"""

from typing import Any

from pydantic import BaseModel, EmailStr, Field


class UserResponse(BaseModel):
    """
    Response model for user profile data.

    Example:
        >>> user = UserResponse(
        ...     id=1,
        ...     address="0x1234567890abcdef1234567890abcdef12345678",
        ...     email="user@example.com",
        ...     social_provider="google",
        ...     referral_code="ABC12345",
        ...     referred_by=None
        ... )
    """

    id: int = Field(..., description="User ID")
    address: str = Field(..., description="Wallet address (0x...)")
    email: str | None = Field(None, description="User email (optional)")
    social_provider: str | None = Field(
        None, description="Social login provider (google, x, email)"
    )
    referral_code: str = Field(..., description="User's referral code")
    referred_by: int | None = Field(None, description="Referrer user ID (optional)")

    model_config = {"from_attributes": True}  # Enable ORM mode for SQLAlchemy models


class UserUpdateRequest(BaseModel):
    """
    Request model for updating user profile.

    Only email can be updated. Protected fields (address, referral_code, id) are read-only.

    Example:
        >>> update = UserUpdateRequest(email="newemail@example.com")
    """

    email: EmailStr | None = Field(
        None, description="New email address (optional, must be valid email format)"
    )

    model_config = {"extra": "forbid"}  # Reject unknown fields
