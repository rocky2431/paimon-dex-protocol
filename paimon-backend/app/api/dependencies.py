"""
FastAPI dependency functions for authentication.

Dependencies:
- get_current_user: Requires valid JWT token, raises 401 if invalid
- get_current_user_optional: Returns user data if token valid, None otherwise
"""

from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_token

# HTTP Bearer security scheme for JWT tokens
http_bearer = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(http_bearer),
) -> dict[str, Any]:
    """
    FastAPI dependency to extract and validate current user from JWT token.

    Requires valid JWT token in Authorization header.
    Raises 401 Unauthorized if token is invalid, expired, or missing required claims.

    Args:
        credentials: HTTP Authorization credentials with Bearer token.

    Returns:
        dict: Decoded token payload containing user data.

    Raises:
        HTTPException: 401 Unauthorized if token is invalid or expired.

    Example:
        >>> @app.get("/protected")
        >>> async def protected_route(user: dict = Depends(get_current_user)):
        ...     return {"user_address": user["sub"]}
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
    if payload.get("sub") is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload


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
