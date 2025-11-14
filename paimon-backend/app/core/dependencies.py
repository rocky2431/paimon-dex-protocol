"""
FastAPI dependencies for authentication and authorization.

Dependencies:
- get_current_user: Verify JWT token and return authenticated user
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User

# HTTP Bearer token scheme for JWT authentication
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Verify JWT token and return authenticated user.

    Args:
        credentials: HTTP Authorization header with Bearer token.
        db: Database session.

    Returns:
        User: Authenticated user from database.

    Raises:
        HTTPException: 401 if token is invalid or user not found.

    Example:
        >>> # In router:
        >>> @router.get("/protected")
        >>> async def protected_route(current_user: User = Depends(get_current_user)):
        >>>     return {"user_id": current_user.id}
    """
    # Extract token from Authorization header
    token = credentials.credentials

    # Decode JWT token
    payload = decode_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extract user identifier from token payload
    # Token payload contains either "sub" (subject) as address or user_id
    user_sub = payload.get("sub")
    user_id = payload.get("user_id")

    if not user_sub and not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Query user from database
    # Try by user_id first (more efficient), then by address
    if user_id:
        query = select(User).where(User.id == user_id)
    else:
        # user_sub might be address or "user_{id}" format
        if user_sub.startswith("user_"):
            try:
                extracted_id = int(user_sub.split("_")[1])
                query = select(User).where(User.id == extracted_id)
            except (IndexError, ValueError):
                query = select(User).where(User.address == user_sub)
        else:
            query = select(User).where(User.address == user_sub)

    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user
