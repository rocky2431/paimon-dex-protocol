"""
Unit tests for Redis cache module.

Tests Redis connection, basic operations (get/set/delete/expire),
async support, and connection pool configuration.
"""

import asyncio
from datetime import timedelta

import pytest
import redis.asyncio as aioredis


@pytest.fixture
async def redis_client():
    """Create a Redis client for testing."""
    from app.core.config import settings

    client = aioredis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
    )
    yield client
    await client.aclose()


@pytest.fixture
async def redis_cache(redis_client):
    """Create a RedisCache instance for testing."""
    from app.core.cache import RedisCache

    cache = RedisCache()
    cache.client = redis_client  # Override with test client
    return cache


class TestRedisConnection:
    """Test Redis connection and initialization."""

    @pytest.mark.asyncio
    async def test_redis_client_creation(self, redis_client):
        """Test Redis client can be created."""
        assert redis_client is not None
        assert hasattr(redis_client, "get")
        assert hasattr(redis_client, "set")

    @pytest.mark.asyncio
    async def test_redis_ping(self, redis_client):
        """Test Redis connection with ping."""
        result = await redis_client.ping()
        assert result is True


class TestRedisBasicOperations:
    """Test basic Redis operations (get/set/delete)."""

    @pytest.mark.asyncio
    async def test_set_and_get_string(self, redis_client):
        """Test setting and getting a string value."""
        key = "test_key_string"
        value = "test_value"

        # Set value
        await redis_client.set(key, value)

        # Get value
        result = await redis_client.get(key)
        assert result == value

        # Cleanup
        await redis_client.delete(key)

    @pytest.mark.asyncio
    async def test_set_and_get_json(self, redis_cache):
        """Test setting and getting a JSON object."""
        key = "test_key_json"
        value = {"user_id": 123, "address": "0x123", "balance": 100.5}

        # Set JSON value
        await redis_cache.set_json(key, value)

        # Get JSON value
        result = await redis_cache.get_json(key)
        assert result == value

        # Cleanup
        await redis_cache.delete(key)

    @pytest.mark.asyncio
    async def test_delete_key(self, redis_client):
        """Test deleting a key."""
        key = "test_key_delete"
        value = "test_value"

        # Set value
        await redis_client.set(key, value)

        # Delete key
        deleted_count = await redis_client.delete(key)
        assert deleted_count == 1

        # Verify key is deleted
        result = await redis_client.get(key)
        assert result is None

    @pytest.mark.asyncio
    async def test_get_nonexistent_key(self, redis_client):
        """Test getting a non-existent key returns None."""
        result = await redis_client.get("nonexistent_key_12345")
        assert result is None


class TestRedisExpiration:
    """Test Redis key expiration."""

    @pytest.mark.asyncio
    async def test_set_with_expiration(self, redis_client):
        """Test setting a key with expiration time."""
        key = "test_key_expire"
        value = "test_value"
        ttl_seconds = 2

        # Set value with expiration
        await redis_client.set(key, value, ex=ttl_seconds)

        # Verify value exists
        result = await redis_client.get(key)
        assert result == value

        # Wait for expiration
        await asyncio.sleep(ttl_seconds + 1)

        # Verify key expired
        result = await redis_client.get(key)
        assert result is None

    @pytest.mark.asyncio
    async def test_expire_existing_key(self, redis_client):
        """Test setting expiration on an existing key."""
        key = "test_key_expire_existing"
        value = "test_value"
        ttl_seconds = 2

        # Set value without expiration
        await redis_client.set(key, value)

        # Set expiration
        await redis_client.expire(key, ttl_seconds)

        # Verify value exists
        result = await redis_client.get(key)
        assert result == value

        # Wait for expiration
        await asyncio.sleep(ttl_seconds + 1)

        # Verify key expired
        result = await redis_client.get(key)
        assert result is None


class TestRedisCacheHelper:
    """Test RedisCache helper class."""

    @pytest.mark.asyncio
    async def test_cache_helper_set_get(self, redis_cache):
        """Test RedisCache helper set/get methods."""
        key = "test_cache_key"
        value = "test_cache_value"

        # Set value
        await redis_cache.set(key, value)

        # Get value
        result = await redis_cache.get(key)
        assert result == value

        # Cleanup
        await redis_cache.delete(key)

    @pytest.mark.asyncio
    async def test_cache_helper_with_ttl(self, redis_cache):
        """Test RedisCache helper with TTL."""
        key = "test_cache_ttl"
        value = "test_value"
        ttl = timedelta(seconds=2)

        # Set value with TTL
        await redis_cache.set(key, value, ttl=ttl)

        # Verify value exists
        result = await redis_cache.get(key)
        assert result == value

        # Wait for expiration
        await asyncio.sleep(3)

        # Verify key expired
        result = await redis_cache.get(key)
        assert result is None

    @pytest.mark.asyncio
    async def test_cache_helper_exists(self, redis_cache):
        """Test checking if a key exists."""
        key = "test_exists_key"
        value = "test_value"

        # Key should not exist
        exists = await redis_cache.exists(key)
        assert exists is False

        # Set value
        await redis_cache.set(key, value)

        # Key should exist
        exists = await redis_cache.exists(key)
        assert exists is True

        # Cleanup
        await redis_cache.delete(key)


class TestRedisConnectionPool:
    """Test Redis connection pool configuration."""

    def test_connection_pool_exists(self, redis_client):
        """Test Redis client has connection pool."""
        assert hasattr(redis_client, "connection_pool")
        assert redis_client.connection_pool is not None

    def test_connection_pool_settings(self, redis_client):
        """Test connection pool has reasonable settings."""
        pool = redis_client.connection_pool
        # Connection pool should have max_connections configured
        assert hasattr(pool, "max_connections")
        # Max connections should be reasonable (>= 0)
        assert pool.max_connections >= 0


class TestRedisErrorHandling:
    """Test Redis error handling."""

    @pytest.mark.asyncio
    async def test_get_handles_error_gracefully(self, redis_cache):
        """Test get operation handles errors gracefully."""
        # This should not raise an exception
        result = await redis_cache.get("any_key")
        assert result is None or isinstance(result, str | bytes)

    @pytest.mark.asyncio
    async def test_set_handles_error_gracefully(self, redis_cache):
        """Test set operation handles errors gracefully."""
        # This should not raise an exception
        try:
            await redis_cache.set("test_key", "test_value")
        except Exception as e:
            # If connection fails, should fail gracefully
            assert "connection" in str(e).lower() or "timeout" in str(e).lower()
