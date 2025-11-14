"""
Social OAuth verification for Reown AppKit integration.

Provides functions for:
- Verifying OAuth tokens from Email/Google/X providers
- Creating or updating users from OAuth data
- Linking wallet addresses to social login users

Supported providers: email, google, x (Twitter)
"""

import random
import string
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.user import User

# Constants
OAUTH_REQUEST_TIMEOUT = 5.0  # seconds
REFERRAL_CODE_LENGTH = 8  # characters

# OAuth provider endpoints (Reown/WalletConnect OAuth)
OAUTH_VERIFY_ENDPOINTS = {
    "google": "https://oauth2.googleapis.com/tokeninfo",
    "email": "https://api.reown.com/oauth/verify",  # Placeholder for Reown Email OAuth
    "x": "https://api.twitter.com/2/users/me",  # X (Twitter) API
}


def _generate_referral_code(length: int = REFERRAL_CODE_LENGTH) -> str:
    """
    Generate a random referral code.

    Args:
        length: Length of referral code (default 8).

    Returns:
        str: Random alphanumeric referral code (uppercase).

    Example:
        >>> code = _generate_referral_code()
        >>> len(code)
        8
    """
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


async def verify_oauth_token(token: str, provider: str) -> dict[str, Any] | None:
    """
    Verify OAuth token with provider API.

    Args:
        token: OAuth access token from Reown AppKit.
        provider: OAuth provider (email, google, x).

    Returns:
        dict | None: User info from OAuth provider, or None if invalid.

    Example:
        >>> user_info = await verify_oauth_token("ya29.a0AfH6SMB...", "google")
        >>> user_info['email']
        'user@gmail.com'
    """
    # Check if provider is supported
    if provider not in OAUTH_VERIFY_ENDPOINTS:
        return None

    endpoint = OAUTH_VERIFY_ENDPOINTS[provider]

    try:
        async with httpx.AsyncClient(timeout=OAUTH_REQUEST_TIMEOUT) as client:
            if provider == "google":
                # Google tokeninfo endpoint
                response = await client.get(endpoint, params={"access_token": token})
            elif provider == "email":
                # Reown Email OAuth (POST)
                response = await client.post(
                    endpoint, json={"token": token}, headers={"Content-Type": "application/json"}
                )
            elif provider == "x":
                # X (Twitter) API requires Bearer token
                response = await client.get(
                    endpoint,
                    headers={"Authorization": f"Bearer {token}"},
                    params={"user.fields": "id,username,name"},
                )

            # Check response status
            if response.status_code != 200:
                return None

            # Parse response
            user_info = response.json()

            # Validate response has required fields
            if provider == "google":
                if "email" not in user_info or "sub" not in user_info:
                    return None
            elif provider == "email":
                if "email" not in user_info:
                    return None
            elif provider == "x":
                # X may not have email, use username
                if "data" not in user_info:
                    return None
                user_info = user_info["data"]  # Extract data object

            return user_info

    except (httpx.RequestError, ValueError, KeyError):
        # Network error, JSON parsing error, or missing keys
        return None


async def get_or_create_user(
    oauth_data: dict[str, Any], provider: str, session: AsyncSession | None = None
) -> User:
    """
    Get existing user or create new user from OAuth data.

    Args:
        oauth_data: User info from OAuth provider.
        provider: OAuth provider (email, google, x).
        session: Optional database session (creates new if None).

    Returns:
        User: Existing or newly created user.

    Example:
        >>> user = await get_or_create_user({"email": "user@gmail.com", "sub": "123"}, "google")
        >>> user.email
        'user@gmail.com'
    """
    # Create session if not provided
    if session is None:
        async with AsyncSessionLocal() as session:
            return await _get_or_create_user_internal(oauth_data, provider, session)
    else:
        return await _get_or_create_user_internal(oauth_data, provider, session)


async def _get_or_create_user_internal(
    oauth_data: dict[str, Any], provider: str, session: AsyncSession
) -> User:
    """Internal implementation of get_or_create_user."""
    # Extract user identifiers
    email = oauth_data.get("email")
    social_id = oauth_data.get("sub") or oauth_data.get("id")

    # Try to find existing user by email or social_id
    query = select(User)
    if email:
        query = query.where(User.email == email)
    elif social_id:
        query = query.where(User.social_id == str(social_id))
    else:
        raise ValueError("OAuth data must contain email or sub/id")

    result = await session.execute(query)
    user = result.scalar_one_or_none()

    if user:
        # User exists, update if needed
        user.social_provider = provider
        user.social_id = str(social_id) if social_id else user.social_id
        await session.commit()
        await session.refresh(user)
        return user
    else:
        # Create new user
        # Generate unique referral code
        referral_code = _generate_referral_code()

        # Ensure referral code is unique
        while True:
            check_query = select(User).where(User.referral_code == referral_code)
            existing = await session.execute(check_query)
            if existing.scalar_one_or_none() is None:
                break
            referral_code = _generate_referral_code()

        # Create user without address (can be linked later)
        new_user = User(
            email=email,
            social_provider=provider,
            social_id=str(social_id) if social_id else None,
            address=None,  # No wallet address yet
            referral_code=referral_code,
            referred_by=None,  # Can be set later via referral code
        )

        session.add(new_user)
        await session.commit()
        await session.refresh(new_user)

        return new_user


async def link_wallet_address(
    user: User, address: str, session: AsyncSession
) -> User:
    """
    Link wallet address to social login user.

    Args:
        user: User object to update.
        address: Ethereum wallet address (0x...).
        session: Database session.

    Returns:
        User: Updated user with linked address.

    Example:
        >>> user = await link_wallet_address(user, "0x1234...", session)
        >>> user.address
        '0x1234567890abcdef1234567890abcdef12345678'
    """
    # Normalize address to lowercase
    user.address = address.lower()

    await session.commit()
    await session.refresh(user)

    return user


async def get_db_session():
    """Get database session for dependency injection in tests."""
    async with AsyncSessionLocal() as session:
        yield session
