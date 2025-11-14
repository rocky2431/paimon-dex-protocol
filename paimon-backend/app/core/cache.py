"""
Redis cache module.

Provides async Redis client and helper class for caching operations.
"""

import json
from datetime import timedelta
from typing import Any

import redis.asyncio as aioredis

from app.core.config import settings

# Global Redis client instance
_redis_client: aioredis.Redis | None = None


def get_redis_client() -> aioredis.Redis:
    """
    Get or create Redis client instance.

    Returns:
        Redis client instance.
    """
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            max_connections=20,  # Connection pool size
        )
    return _redis_client


# Convenience reference to redis_client
redis_client = get_redis_client()


class RedisCache:
    """
    Redis cache helper class.

    Provides convenient methods for common caching operations.
    """

    def __init__(self):
        """Initialize Redis cache helper."""
        self.client = redis_client

    async def get(self, key: str) -> str | None:
        """
        Get a value from Redis.

        Args:
            key: Cache key.

        Returns:
            Cached value or None if not found.
        """
        try:
            return await self.client.get(key)
        except Exception:
            # Return None on error (graceful degradation)
            return None

    async def set(self, key: str, value: str, ttl: timedelta | None = None) -> bool:
        """
        Set a value in Redis.

        Args:
            key: Cache key.
            value: Value to cache.
            ttl: Time to live (optional).

        Returns:
            True if successful, False otherwise.
        """
        try:
            if ttl:
                await self.client.set(key, value, ex=int(ttl.total_seconds()))
            else:
                await self.client.set(key, value)
            return True
        except Exception:
            # Return False on error (graceful degradation)
            return False

    async def delete(self, key: str) -> int:
        """
        Delete a key from Redis.

        Args:
            key: Cache key.

        Returns:
            Number of keys deleted (0 or 1).
        """
        try:
            return await self.client.delete(key)
        except Exception:
            return 0

    async def exists(self, key: str) -> bool:
        """
        Check if a key exists in Redis.

        Args:
            key: Cache key.

        Returns:
            True if key exists, False otherwise.
        """
        try:
            result = await self.client.exists(key)
            return result > 0
        except Exception:
            return False

    async def expire(self, key: str, seconds: int) -> bool:
        """
        Set expiration time for a key.

        Args:
            key: Cache key.
            seconds: Expiration time in seconds.

        Returns:
            True if successful, False otherwise.
        """
        try:
            return await self.client.expire(key, seconds)
        except Exception:
            return False

    async def get_json(self, key: str) -> dict[str, Any] | None:
        """
        Get a JSON value from Redis.

        Args:
            key: Cache key.

        Returns:
            Parsed JSON object or None if not found.
        """
        try:
            value = await self.client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception:
            return None

    async def set_json(
        self, key: str, value: dict[str, Any], ttl: timedelta | None = None
    ) -> bool:
        """
        Set a JSON value in Redis.

        Args:
            key: Cache key.
            value: Dictionary to cache as JSON.
            ttl: Time to live (optional).

        Returns:
            True if successful, False otherwise.
        """
        try:
            json_str = json.dumps(value)
            if ttl:
                await self.client.set(key, json_str, ex=int(ttl.total_seconds()))
            else:
                await self.client.set(key, json_str)
            return True
        except Exception:
            return False


# Global cache instance
cache = RedisCache()
