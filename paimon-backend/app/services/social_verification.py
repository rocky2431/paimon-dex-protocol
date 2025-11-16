"""
Social Media Verification Service.

Verifies user completion of social tasks (Twitter, Discord, Telegram).
"""

import httpx
from typing import Optional
from app.core.config import settings


class SocialVerificationService:
    """
    Service for verifying social media tasks.

    Supports:
    - Twitter: Follow, retweet, like
    - Discord: Join server
    - Telegram: Join channel
    """

    def __init__(self):
        """Initialize HTTP client for API calls."""
        self.http_client = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        """Close HTTP client."""
        await self.http_client.aclose()

    # ==================== Twitter Verification ====================

    async def verify_twitter_follow(
        self,
        user_twitter_id: str,
        target_username: str = "PaimonDEX"
    ) -> bool:
        """
        Verify if user follows a Twitter account.

        Args:
            user_twitter_id: User's Twitter ID (from OAuth)
            target_username: Target account to check

        Returns:
            True if user follows the account, False otherwise

        Requires:
            TWITTER_BEARER_TOKEN environment variable
        """
        if not settings.TWITTER_BEARER_TOKEN:
            raise ValueError("TWITTER_BEARER_TOKEN not configured")

        try:
            # Get target user ID
            target_response = await self.http_client.get(
                f"https://api.twitter.com/2/users/by/username/{target_username}",
                headers={"Authorization": f"Bearer {settings.TWITTER_BEARER_TOKEN}"}
            )
            target_response.raise_for_status()
            target_id = target_response.json()["data"]["id"]

            # Check if user follows target
            follow_response = await self.http_client.get(
                f"https://api.twitter.com/2/users/{user_twitter_id}/following/{target_id}",
                headers={"Authorization": f"Bearer {settings.TWITTER_BEARER_TOKEN}"}
            )

            # HTTP 200 = following, HTTP 404 = not following
            return follow_response.status_code == 200

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return False
            raise
        except Exception as e:
            print(f"Twitter follow verification error: {e}")
            return False

    async def verify_twitter_retweet(
        self,
        user_twitter_id: str,
        tweet_id: str
    ) -> bool:
        """
        Verify if user retweeted a specific tweet.

        Args:
            user_twitter_id: User's Twitter ID
            tweet_id: Target tweet ID

        Returns:
            True if user retweeted, False otherwise
        """
        if not settings.TWITTER_BEARER_TOKEN:
            raise ValueError("TWITTER_BEARER_TOKEN not configured")

        try:
            response = await self.http_client.get(
                f"https://api.twitter.com/2/tweets/{tweet_id}/retweeted_by",
                headers={"Authorization": f"Bearer {settings.TWITTER_BEARER_TOKEN}"}
            )
            response.raise_for_status()

            retweeters = response.json().get("data", [])
            return any(user["id"] == user_twitter_id for user in retweeters)

        except Exception as e:
            print(f"Twitter retweet verification error: {e}")
            return False

    async def verify_twitter_like(
        self,
        user_twitter_id: str,
        tweet_id: str
    ) -> bool:
        """
        Verify if user liked a specific tweet.

        Args:
            user_twitter_id: User's Twitter ID
            tweet_id: Target tweet ID

        Returns:
            True if user liked, False otherwise
        """
        if not settings.TWITTER_BEARER_TOKEN:
            raise ValueError("TWITTER_BEARER_TOKEN not configured")

        try:
            response = await self.http_client.get(
                f"https://api.twitter.com/2/tweets/{tweet_id}/liking_users",
                headers={"Authorization": f"Bearer {settings.TWITTER_BEARER_TOKEN}"}
            )
            response.raise_for_status()

            likers = response.json().get("data", [])
            return any(user["id"] == user_twitter_id for user in likers)

        except Exception as e:
            print(f"Twitter like verification error: {e}")
            return False

    # ==================== Discord Verification ====================

    async def verify_discord_member(
        self,
        user_discord_id: str,
        server_id: Optional[str] = None
    ) -> bool:
        """
        Verify if user is a member of Discord server.

        Args:
            user_discord_id: User's Discord ID (from OAuth)
            server_id: Discord server ID (defaults to settings.DISCORD_SERVER_ID)

        Returns:
            True if user is a member, False otherwise

        Requires:
            DISCORD_BOT_TOKEN environment variable
        """
        if not settings.DISCORD_BOT_TOKEN:
            raise ValueError("DISCORD_BOT_TOKEN not configured")

        server_id = server_id or settings.DISCORD_SERVER_ID
        if not server_id:
            raise ValueError("DISCORD_SERVER_ID not configured")

        try:
            response = await self.http_client.get(
                f"https://discord.com/api/v10/guilds/{server_id}/members/{user_discord_id}",
                headers={"Authorization": f"Bot {settings.DISCORD_BOT_TOKEN}"}
            )

            # HTTP 200 = member, HTTP 404 = not a member
            return response.status_code == 200

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return False
            raise
        except Exception as e:
            print(f"Discord member verification error: {e}")
            return False

    # ==================== Telegram Verification ====================

    async def verify_telegram_member(
        self,
        user_telegram_id: int,
        channel_id: Optional[str] = None
    ) -> bool:
        """
        Verify if user is a member of Telegram channel.

        Args:
            user_telegram_id: User's Telegram ID (from OAuth)
            channel_id: Telegram channel ID (defaults to settings.TELEGRAM_CHANNEL_ID)

        Returns:
            True if user is a member, False otherwise

        Requires:
            TELEGRAM_BOT_TOKEN environment variable
        """
        if not settings.TELEGRAM_BOT_TOKEN:
            raise ValueError("TELEGRAM_BOT_TOKEN not configured")

        channel_id = channel_id or settings.TELEGRAM_CHANNEL_ID
        if not channel_id:
            raise ValueError("TELEGRAM_CHANNEL_ID not configured")

        try:
            response = await self.http_client.get(
                f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/getChatMember",
                params={
                    "chat_id": channel_id,
                    "user_id": user_telegram_id
                }
            )
            response.raise_for_status()

            data = response.json()
            if not data.get("ok"):
                return False

            # Check member status
            status = data.get("result", {}).get("status")
            return status in ["member", "administrator", "creator"]

        except Exception as e:
            print(f"Telegram member verification error: {e}")
            return False


# Global instance
social_verification_service = SocialVerificationService()
