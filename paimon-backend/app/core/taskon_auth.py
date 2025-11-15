"""
TaskOn API authentication.

Bearer token authentication for TaskOn verification API.
"""

from fastapi import Header, HTTPException, status

from app.core.config import settings


async def verify_taskon_token(authorization: str = Header(None)) -> bool:
    """
    Verify TaskOn API Bearer token.

    Args:
        authorization: Authorization header (Bearer {token})

    Returns:
        True if token is valid

    Raises:
        HTTPException: If token is invalid or missing
    """
    # If TASKON_API_KEY is not configured, skip authentication
    if not settings.TASKON_API_KEY:
        return True

    # Check if authorization header is provided
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify Bearer token format
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header format. Use: Bearer {token}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = parts[1]

    # Verify token matches configured TASKON_API_KEY
    if token != settings.TASKON_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return True
