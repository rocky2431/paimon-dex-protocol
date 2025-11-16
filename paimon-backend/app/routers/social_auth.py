"""
Social Media OAuth Router.

Handles OAuth callbacks for Twitter, Discord, and Telegram.
Stores user social IDs for task verification.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
import httpx

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User


router = APIRouter(prefix="/api/social", tags=["Social Auth"])


# ==================== Twitter OAuth ====================

@router.get("/twitter/login")
async def twitter_login_url():
    """
    Get Twitter OAuth2 authorization URL.

    Returns redirect URL for user to authorize app.
    """
    if not settings.TWITTER_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Twitter OAuth not configured"
        )

    # Twitter OAuth 2.0 PKCE flow
    oauth_url = (
        f"https://twitter.com/i/oauth2/authorize"
        f"?response_type=code"
        f"&client_id={settings.TWITTER_CLIENT_ID}"
        f"&redirect_uri={settings.ALLOWED_ORIGINS[0]}/api/social/twitter/callback"
        f"&scope=tweet.read%20users.read%20follows.read"
        f"&state=random_state_string"
    )

    return {"url": oauth_url}


@router.get("/twitter/callback")
async def twitter_callback(
    code: str = Query(..., description="OAuth authorization code"),
    state: str = Query(..., description="State parameter"),
    db: AsyncSession = Depends(get_db)
):
    """
    Twitter OAuth callback handler.

    Exchanges code for access token and retrieves user info.
    """
    if not settings.TWITTER_CLIENT_ID or not settings.TWITTER_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Twitter OAuth not configured"
        )

    async with httpx.AsyncClient() as client:
        # Exchange code for access token
        token_response = await client.post(
            "https://api.twitter.com/2/oauth2/token",
            data={
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": f"{settings.ALLOWED_ORIGINS[0]}/api/social/twitter/callback",
                "code_verifier": "challenge"  # In production, store and retrieve PKCE challenge
            },
            auth=(settings.TWITTER_CLIENT_ID, settings.TWITTER_CLIENT_SECRET)
        )

        if token_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to exchange Twitter authorization code"
            )

        token_data = token_response.json()
        access_token = token_data["access_token"]

        # Get user info
        user_response = await client.get(
            "https://api.twitter.com/2/users/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )

        if user_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to retrieve Twitter user info"
            )

        user_data = user_response.json()["data"]
        twitter_id = user_data["id"]
        twitter_username = user_data["username"]

        # TODO: Link to existing user by wallet address (from session)
        # For now, return user info for frontend to handle

        return {
            "platform": "twitter",
            "id": twitter_id,
            "username": twitter_username,
            "access_token": access_token
        }


# ==================== Discord OAuth ====================

@router.get("/discord/login")
async def discord_login_url():
    """
    Get Discord OAuth2 authorization URL.

    Returns redirect URL for user to authorize app.
    """
    if not settings.DISCORD_BOT_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Discord OAuth not configured"
        )

    # Note: Discord OAuth requires app registration at https://discord.com/developers
    # This is a placeholder - actual client_id needed
    oauth_url = (
        f"https://discord.com/api/oauth2/authorize"
        f"?client_id=YOUR_DISCORD_CLIENT_ID"
        f"&redirect_uri={settings.ALLOWED_ORIGINS[0]}/api/social/discord/callback"
        f"&response_type=code"
        f"&scope=identify%20guilds"
    )

    return {"url": oauth_url}


@router.get("/discord/callback")
async def discord_callback(
    code: str = Query(..., description="OAuth authorization code"),
    db: AsyncSession = Depends(get_db)
):
    """
    Discord OAuth callback handler.

    Exchanges code for access token and retrieves user info.
    """
    # Similar to Twitter flow
    # Exchange code → Get user info → Store discord_id
    pass


# ==================== Telegram OAuth ====================

@router.post("/telegram/verify")
async def telegram_verify(
    telegram_id: int,
    first_name: str,
    username: str | None = None,
    auth_date: int = None,
    hash: str = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Verify Telegram login widget data.

    Telegram uses a different auth flow (widget-based).

    Args:
        telegram_id: User's Telegram ID
        first_name: User's first name
        username: User's username (optional)
        auth_date: Unix timestamp
        hash: Data hash for verification

    Returns:
        Success message
    """
    if not settings.TELEGRAM_BOT_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Telegram Bot not configured"
        )

    # TODO: Verify hash using TELEGRAM_BOT_TOKEN
    # TODO: Link to existing user

    return {
        "platform": "telegram",
        "id": telegram_id,
        "username": username,
        "first_name": first_name
    }


# ==================== Link Social Account to User ====================

@router.post("/link")
async def link_social_account(
    wallet_address: str,
    platform: str,  # "twitter" | "discord" | "telegram"
    social_id: str,
    username: str | None = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Link social media account to user's wallet address.

    Args:
        wallet_address: User's wallet address
        platform: Social platform name
        social_id: User's ID on the platform
        username: User's username (optional)

    Returns:
        Success message
    """
    # Find user
    stmt = select(User).where(User.address.ilike(wallet_address.lower()))
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Update user social ID
    if platform == "twitter":
        user.twitter_id = social_id
        user.twitter_username = username
    elif platform == "discord":
        user.discord_id = social_id
        user.discord_username = username
    elif platform == "telegram":
        user.telegram_id = int(social_id)
        user.telegram_username = username
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid platform: {platform}"
        )

    await db.commit()

    return {
        "success": True,
        "message": f"{platform.capitalize()} account linked successfully",
        "platform": platform,
        "social_id": social_id
    }
