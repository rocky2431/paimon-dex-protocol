"""
Security utilities for JWT authentication.

Provides functions for creating and validating JWT tokens.
"""

from datetime import datetime, timedelta, UTC
from typing import Any

from jose import JWTError, jwt

from app.core.config import settings


def create_access_token(
    data: dict[str, Any], expires_delta: timedelta | None = None
) -> str:
    """
    Create a JWT access token.

    Args:
        data: Payload data to encode in the token.
        expires_delta: Optional custom expiration time.
                      Defaults to ACCESS_TOKEN_EXPIRE_MINUTES from settings.

    Returns:
        str: Encoded JWT token.

    Example:
        >>> token = create_access_token({"sub": "0x123..."})
        >>> # token is valid for 15 minutes
    """
    to_encode = data.copy()

    # Set expiration time
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    # Add expiration to payload
    to_encode.update({"exp": expire})

    # Encode and return token
    encoded_jwt = jwt.encode(
        to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM
    )

    return encoded_jwt


def create_refresh_token(data: dict[str, Any]) -> str:
    """
    Create a JWT refresh token with longer expiration.

    Args:
        data: Payload data to encode in the token.

    Returns:
        str: Encoded JWT refresh token.

    Example:
        >>> refresh_token = create_refresh_token({"sub": "0x123..."})
        >>> # token is valid for 7 days
    """
    to_encode = data.copy()

    # Set long expiration for refresh token
    expire = datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})

    # Encode and return token
    encoded_jwt = jwt.encode(
        to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM
    )

    return encoded_jwt


def decode_token(token: str) -> dict[str, Any] | None:
    """
    Decode and validate a JWT token.

    Args:
        token: JWT token to decode.

    Returns:
        dict | None: Decoded payload if valid, None if invalid or expired.

    Example:
        >>> token = create_access_token({"sub": "0x123..."})
        >>> payload = decode_token(token)
        >>> payload["sub"]
        '0x123...'
    """
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        # Token is invalid, expired, or tampered
        return None


def refresh_access_token(refresh_token: str) -> str | None:
    """
    Create a new access token from a valid refresh token.

    Args:
        refresh_token: Valid refresh token.

    Returns:
        str | None: New access token if refresh token is valid, None otherwise.

    Example:
        >>> refresh_token = create_refresh_token({"sub": "0x123..."})
        >>> new_access_token = refresh_access_token(refresh_token)
        >>> # new access token is valid for 15 minutes
    """
    # Decode and validate refresh token
    payload = decode_token(refresh_token)

    if payload is None:
        return None

    # Extract user identifier (sub) from refresh token
    user_sub = payload.get("sub")

    if user_sub is None:
        return None

    # Create new access token with same subject
    new_access_token = create_access_token({"sub": user_sub})

    return new_access_token
