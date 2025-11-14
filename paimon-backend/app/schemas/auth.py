"""
Authentication schemas for JWT tokens.

Schemas:
- TokenResponse: Response model for token generation endpoints
- TokenData: Internal token payload data model
"""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class TokenResponse(BaseModel):
    """
    Response model for JWT token generation.

    Example:
        >>> response = TokenResponse(
        ...     access_token="eyJ0eXAiOiJKV1QiLCJhbGc...",
        ...     refresh_token="eyJ0eXAiOiJKV1QiLCJhbGc...",
        ...     token_type="bearer"
        ... )
    """

    access_token: str = Field(
        ..., description="JWT access token (15 minutes validity)"
    )
    refresh_token: str = Field(
        ..., description="JWT refresh token (7 days validity)"
    )
    token_type: str = Field(default="bearer", description="Token type (always bearer)")


class TokenData(BaseModel):
    """
    Internal model for token payload data.

    Used for validation and typing when decoding JWT tokens.

    Example:
        >>> token_data = TokenData(
        ...     sub="0x1234567890abcdef",
        ...     exp=1234567890,
        ...     name="Test User"
        ... )
    """

    sub: str = Field(..., description="Subject (wallet address)")
    exp: int = Field(..., description="Expiration timestamp")

    # Optional fields that can be included in token
    name: str | None = Field(None, description="User name")
    role: str | None = Field(None, description="User role")

    # Allow additional fields (Pydantic v2 style)
    model_config = ConfigDict(extra="allow")

    def model_dump(self, **kwargs: Any) -> dict[str, Any]:
        """Override to include extra fields."""
        data = super().model_dump(**kwargs)
        # Include any extra fields that were set
        for key, value in self.__dict__.items():
            if key not in data and not key.startswith("_"):
                data[key] = value
        return data
