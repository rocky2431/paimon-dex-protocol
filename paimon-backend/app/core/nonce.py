"""
Nonce management for preventing signature replay attacks.

Provides functions for:
- Generating unique nonces for wallet addresses
- Validating nonces before use
- Consuming nonces (single use)
- Managing nonce expiration (default 5 minutes)

Storage: Redis for high-performance, automatic expiration
"""

import uuid
from typing import Optional

import redis.asyncio as aioredis

from app.core.config import settings

# Default nonce TTL: 5 minutes (300 seconds)
DEFAULT_NONCE_TTL = 300


def _get_redis() -> aioredis.Redis:
    """
    Get Redis client for nonce operations.

    Creates a new connection each time to avoid event loop conflicts in tests.

    Returns:
        Redis client instance.
    """
    return aioredis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
    )


def _nonce_key(address: str, nonce: str) -> str:
    """
    Generate Redis key for nonce storage.

    Args:
        address: Ethereum wallet address.
        nonce: Unique nonce string.

    Returns:
        str: Redis key in format "nonce:{address}:{nonce}".
    """
    # Normalize address to lowercase for consistency
    address_lower = address.lower()
    return f"nonce:{address_lower}:{nonce}"


async def generate_nonce(address: str, ttl_seconds: int = DEFAULT_NONCE_TTL) -> str:
    """
    Generate a unique nonce for a wallet address.

    Args:
        address: Ethereum wallet address.
        ttl_seconds: Time-to-live in seconds (default 300 = 5 minutes).

    Returns:
        str: Generated nonce (UUID format, 32 hex characters).

    Example:
        >>> nonce = await generate_nonce("0x123...")
        >>> # nonce = "a1b2c3d4e5f6..."
    """
    redis = _get_redis()

    # Generate UUID nonce (remove hyphens for cleaner format)
    nonce = uuid.uuid4().hex

    # Store in Redis with TTL
    key = _nonce_key(address, nonce)
    await redis.setex(key, ttl_seconds, "1")

    return nonce


async def validate_nonce(address: str, nonce: str) -> bool:
    """
    Validate that a nonce exists and is valid.

    Args:
        address: Ethereum wallet address.
        nonce: Nonce to validate.

    Returns:
        bool: True if nonce exists and is valid, False otherwise.

    Example:
        >>> nonce = await generate_nonce("0x123...")
        >>> is_valid = await validate_nonce("0x123...", nonce)
        >>> # is_valid = True
    """
    redis = _get_redis()

    key = _nonce_key(address, nonce)
    exists = await redis.exists(key)

    return exists > 0


async def consume_nonce(address: str, nonce: str) -> bool:
    """
    Consume a nonce (delete it, preventing reuse).

    Args:
        address: Ethereum wallet address.
        nonce: Nonce to consume.

    Returns:
        bool: True if nonce was consumed successfully, False if it didn't exist.

    Example:
        >>> nonce = await generate_nonce("0x123...")
        >>> consumed = await consume_nonce("0x123...", nonce)
        >>> # consumed = True
        >>> # Trying again:
        >>> consumed_again = await consume_nonce("0x123...", nonce)
        >>> # consumed_again = False
    """
    redis = _get_redis()

    key = _nonce_key(address, nonce)
    deleted = await redis.delete(key)

    return deleted > 0


async def get_nonce_ttl(address: str, nonce: str) -> Optional[int]:
    """
    Get remaining time-to-live for a nonce.

    Args:
        address: Ethereum wallet address.
        nonce: Nonce to check.

    Returns:
        int | None: Remaining TTL in seconds, or None if nonce doesn't exist.

    Example:
        >>> nonce = await generate_nonce("0x123...", ttl_seconds=300)
        >>> ttl = await get_nonce_ttl("0x123...", nonce)
        >>> # ttl ≈ 300 (slightly less due to processing time)
    """
    redis = _get_redis()

    key = _nonce_key(address, nonce)
    ttl = await redis.ttl(key)

    # Redis returns -2 if key doesn't exist, -1 if key exists but has no expiration
    if ttl < 0:
        return None

    return ttl
