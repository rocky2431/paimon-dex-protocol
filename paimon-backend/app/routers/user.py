"""
User management routes.

Endpoints:
- GET /api/user/:address: Get user profile
- PUT /api/user/:address: Update user profile (authenticated)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdateRequest

router = APIRouter(prefix="/api/user", tags=["user"])


@router.get("/{address}", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def get_user(address: str, db: AsyncSession = Depends(get_db)) -> UserResponse:
    """
    Get user profile by wallet address.

    Public endpoint - no authentication required.

    Args:
        address: Ethereum wallet address (0x...).
        db: Database session.

    Returns:
        UserResponse: User profile data.

    Raises:
        HTTPException: 404 if user not found.

    Example:
        GET /api/user/0x1234567890abcdef1234567890abcdef12345678
        Response: {
            "id": 1,
            "address": "0x1234...",
            "email": "user@example.com",
            "social_provider": "google",
            "referral_code": "ABC12345",
            "referred_by": null
        }
    """
    # Normalize address to lowercase for consistency
    normalized_address = address.lower()

    # Query user by address
    query = select(User).where(User.address == normalized_address)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User not found with address: {address}",
        )

    return user


@router.put("/{address}", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def update_user(
    address: str,
    update_data: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """
    Update user profile (authenticated).

    Users can only update their own profile.

    Args:
        address: Ethereum wallet address (0x...).
        update_data: Fields to update (only email supported).
        current_user: Authenticated user from JWT token.
        db: Database session.

    Returns:
        UserResponse: Updated user profile.

    Raises:
        HTTPException:
            - 401 if not authenticated
            - 403 if trying to update another user's profile
            - 404 if user not found

    Example:
        PUT /api/user/0x1234567890abcdef1234567890abcdef12345678
        Headers: {"Authorization": "Bearer <jwt_token>"}
        Body: {"email": "newemail@example.com"}
        Response: {
            "id": 1,
            "address": "0x1234...",
            "email": "newemail@example.com",
            "social_provider": "google",
            "referral_code": "ABC12345",
            "referred_by": null
        }
    """
    # Normalize address to lowercase
    normalized_address = address.lower()

    # Authorization check: User can only update their own profile
    if current_user.address != normalized_address:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update this user's profile",
        )

    # Query user to update
    query = select(User).where(User.address == normalized_address)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User not found with address: {address}",
        )

    # Update user fields (only email is updatable)
    if update_data.email is not None:
        user.email = update_data.email

    # Commit changes to database
    await db.commit()
    await db.refresh(user)

    return user
