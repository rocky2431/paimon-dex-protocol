"""
FastAPI dependency functions for authentication.

Dependencies:
- get_current_user: Requires valid JWT token, raises 401 if invalid
- get_current_user_optional: Returns user data if token valid, None otherwise
"""

from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User

# HTTP Bearer security scheme for JWT tokens
http_bearer = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(http_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    FastAPI dependency to extract and validate current user from JWT token.

    Requires valid JWT token in Authorization header.
    Raises 401 Unauthorized if token is invalid, expired, or missing required claims.

    Args:
        credentials: HTTP Authorization credentials with Bearer token.
        db: Database session.

    Returns:
        User: User model instance from database.

    Raises:
        HTTPException: 401 Unauthorized if token is invalid or expired.
        HTTPException: 404 Not Found if user not found in database.

    Example:
        >>> @app.get("/protected")
        >>> async def protected_route(current_user: User = Depends(get_current_user)):
        ...     return {"user_address": current_user.address}
    """
    # Extract token from credentials
    token = credentials.credentials

    # Decode and validate token
    payload = decode_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify required claim 'sub' (subject/wallet address)
    wallet_address = payload.get("sub")
    if wallet_address is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch user from database
    user_query = select(User).where(User.address == wallet_address)
    result = await db.execute(user_query)
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User not found: {wallet_address}",
        )

    return user


def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(HTTPBearer(auto_error=False)),
) -> dict[str, Any] | None:
    """
    FastAPI dependency to optionally extract user from JWT token.

    Returns user data if token is valid, None otherwise.
    Does not raise exception for missing or invalid tokens.

    Args:
        credentials: HTTP Authorization credentials with Bearer token (optional).

    Returns:
        dict | None: Decoded token payload if valid, None otherwise.

    Example:
        >>> @app.get("/optional-auth")
        >>> async def optional_route(user: dict | None = Depends(get_current_user_optional)):
        ...     if user:
        ...         return {"authenticated": True, "user": user["sub"]}
        ...     return {"authenticated": False}
    """
    if credentials is None:
        return None

    # Extract token from credentials
    token = credentials.credentials

    # Decode and validate token
    payload = decode_token(token)

    # Return None if token is invalid (no exception)
    if payload is None:
        return None

    # Return None if missing required claim (no exception)
    if payload.get("sub") is None:
        return None

    return payload
