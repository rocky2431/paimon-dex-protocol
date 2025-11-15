"""
Tiered cache implementation with L1 (memory) and L2 (Redis).

Provides fast in-memory caching with Redis fallback for distributed systems.
"""

from typing import Any, Optional
from datetime import timedelta
import logging
from cachetools import TTLCache

from app.core.cache import cache as redis_cache

logger = logging.getLogger(__name__)


class TieredCache:
    """
    Two-tier cache: L1 (in-memory) + L2 (Redis).

    Fast local cache with distributed Redis backup.
    """

    def __init__(self, l1_max_size: int = 1000, l1_ttl: int = 60):
        """
        Initialize tiered cache.

        Args:
            l1_max_size: Max items in L1 cache
            l1_ttl: L1 TTL in seconds (default 60s)
        """
        self.l1_cache = TTLCache(maxsize=l1_max_size, ttl=l1_ttl)
        self.l2_cache = redis_cache

    async def get(self, key: str) -> Optional[Any]:
        """Get value from L1, fallback to L2."""
        # Try L1 first
        if key in self.l1_cache:
            logger.debug(f"L1 cache hit: {key}")
            return self.l1_cache[key]

        # Fallback to L2 (Redis)
        value = await self.l2_cache.get_json(key)
        if value is not None:
            logger.debug(f"L2 cache hit: {key}")
            self.l1_cache[key] = value  # Promote to L1
            return value

        logger.debug(f"Cache miss: {key}")
        return None

    async def set(self, key: str, value: Any, ttl: Optional[timedelta] = None):
        """Set value in both L1 and L2."""
        self.l1_cache[key] = value  # L1
        await self.l2_cache.set_json(key, value, ttl)  # L2

    async def delete(self, key: str):
        """Delete from both caches."""
        self.l1_cache.pop(key, None)  # L1
        await self.l2_cache.delete(key)  # L2


# Global tiered cache instances with different TTLs
portfolio_cache = TieredCache(l1_max_size=500, l1_ttl=300)  # 5min L1 TTL
apr_cache = TieredCache(l1_max_size=200, l1_ttl=3600)  # 1h L1 TTL
task_cache = TieredCache(l1_max_size=1000, l1_ttl=300)  # 5min L1 TTL
