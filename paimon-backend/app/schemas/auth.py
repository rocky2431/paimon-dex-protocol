"""
Authentication schemas for JWT tokens and wallet login.

Schemas:
- TokenResponse: Response model for token generation endpoints
- TokenData: Internal token payload data model
- NonceResponse: Response for nonce generation endpoint
- LoginRequest: Request model for wallet signature login
- SocialLoginRequest: Request model for social login (Email/Google/X)
- SocialLoginResponse: Response model for social login with user info
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


class NonceResponse(BaseModel):
    """
    Response model for nonce generation endpoint.

    Example:
        >>> response = NonceResponse(
        ...     nonce="a1b2c3d4e5f6789...",
        ...     address="0x1234...",
        ...     expires_in=300
        ... )
    """

    nonce: str = Field(..., description="Generated nonce for signing")
    address: str = Field(..., description="Wallet address")
    expires_in: int = Field(
        default=300, description="Nonce expiration time in seconds (5 minutes)"
    )


class LoginRequest(BaseModel):
    """
    Request model for wallet signature login.

    Example:
        >>> request = LoginRequest(
        ...     address="0x1234567890abcdef...",
        ...     message="Sign this message to login to Paimon DEX",
        ...     signature="0xabcdef123456...",
        ...     nonce="a1b2c3d4e5f6..."
        ... )
    """

    address: str = Field(
        ...,
        description="Ethereum wallet address",
        min_length=42,
        max_length=42,
        pattern=r"^0x[a-fA-F0-9]{40}$",
    )
    message: str = Field(..., description="Message that was signed")
    signature: str = Field(
        ...,
        description="Hex-encoded signature (with or without 0x prefix)",
        min_length=130,  # 65 bytes = 130 hex chars (or 132 with 0x)
    )
    nonce: str = Field(..., description="Nonce that was included in the signed message")


class SocialLoginRequest(BaseModel):
    """
    Request model for social login via Reown OAuth.

    Supports Email, Google, and X (Twitter) login.

    Example:
        >>> request = SocialLoginRequest(
        ...     provider="google",
        ...     token="ya29.a0AfH6SMB...",
        ...     address="0x1234567890abcdef..." # Optional
        ... )
    """

    provider: str = Field(
        ...,
        description="OAuth provider (email, google, x)",
        pattern=r"^(email|google|x)$",
    )
    token: str = Field(
        ...,
        description="OAuth access token from Reown AppKit",
        min_length=10,
    )
    address: str | None = Field(
        None,
        description="Optional wallet address to link (42 chars with 0x prefix)",
        min_length=42,
        max_length=42,
        pattern=r"^0x[a-fA-F0-9]{40}$",
    )


class SocialLoginResponse(BaseModel):
    """
    Response model for social login.

    Includes JWT tokens and user information.

    Example:
        >>> response = SocialLoginResponse(
        ...     access_token="eyJ0eXAiOiJKV1QiLCJhbGc...",
        ...     refresh_token="eyJ0eXAiOiJKV1QiLCJhbGc...",
        ...     token_type="bearer",
        ...     user=UserInfo(...)
        ... )
    """

    access_token: str = Field(..., description="JWT access token (15 minutes)")
    refresh_token: str = Field(..., description="JWT refresh token (7 days)")
    token_type: str = Field(default="bearer", description="Token type")
    user: dict[str, Any] = Field(..., description="User information")


class UserInfo(BaseModel):
    """
    User information model for social login response.

    Example:
        >>> user = UserInfo(
        ...     id=1,
        ...     address="0x1234...",
        ...     email="user@example.com",
        ...     social_provider="google"
        ... )
    """

    id: int = Field(..., description="User ID")
    address: str | None = Field(None, description="Linked wallet address")
    email: str | None = Field(None, description="User email")
    social_provider: str | None = Field(None, description="OAuth provider")
