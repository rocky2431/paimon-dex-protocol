"""
Cache Manager for RWA task verification results.

Optimizes performance by caching verification results in Redis.
"""

from datetime import timedelta
from typing import Any
import json

from app.core.cache import RedisCache


class CacheManager:
    """Manages caching for RWA task verification results."""

    VERIFICATION_CACHE_PREFIX = "rwa:verify:"
    VERIFICATION_CACHE_TTL = timedelta(minutes=10)  # 10 minutes TTL

    def __init__(self, cache: RedisCache):
        """
        Initialize cache manager.

        Args:
            cache: Redis cache instance
        """
        self.cache = cache

    async def get_verification_result(
        self,
        address: str,
        task_id: str
    ) -> dict[str, Any] | None:
        """
        Get cached verification result.

        Args:
            address: User wallet address
            task_id: Task identifier

        Returns:
            Cached verification result or None if not found
        """
        cache_key = self._build_cache_key(address, task_id)

        try:
            cached_data = await self.cache.get(cache_key)
            if cached_data:
                return json.loads(cached_data)
        except Exception:
            # Cache error - return None
            pass

        return None

    async def set_verification_result(
        self,
        address: str,
        task_id: str,
        result: dict[str, Any]
    ) -> bool:
        """
        Cache verification result.

        Args:
            address: User wallet address
            task_id: Task identifier
            result: Verification result dict

        Returns:
            True if successful, False otherwise
        """
        cache_key = self._build_cache_key(address, task_id)

        try:
            return await self.cache.set(
                cache_key,
                json.dumps(result),
                ttl=self.VERIFICATION_CACHE_TTL
            )
        except Exception:
            return False

    async def invalidate_verification_result(
        self,
        address: str,
        task_id: str
    ) -> int:
        """
        Invalidate cached verification result.

        Args:
            address: User wallet address
            task_id: Task identifier

        Returns:
            Number of keys deleted
        """
        cache_key = self._build_cache_key(address, task_id)

        try:
            return await self.cache.delete(cache_key)
        except Exception:
            return 0

    def _build_cache_key(self, address: str, task_id: str) -> str:
        """
        Build cache key.

        Args:
            address: User wallet address
            task_id: Task identifier

        Returns:
            Cache key string
        """
        normalized_address = address.lower()
        return f"{self.VERIFICATION_CACHE_PREFIX}{normalized_address}:{task_id}"
