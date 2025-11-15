"""
KYC Permission Service.

Provides KYC tier caching and task permission validation.
"""

from datetime import timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import cache
from app.models.user import User
from app.models.kyc import KYC, KYCTier

# Cache configuration
KYC_CACHE_PREFIX = "kyc:tier:"
KYC_CACHE_TTL = timedelta(minutes=5)  # 5 minutes TTL


async def get_user_kyc_tier(db: AsyncSession, address: str) -> KYCTier:
    """
    Get user KYC tier from cache or database.

    Checks cache first for performance. If cache miss, queries database
    and updates cache.

    Args:
        db: Database session
        address: User wallet address (case-insensitive)

    Returns:
        KYCTier enum (TIER_0 if user not found or no KYC record)

    Performance:
        - Cache hit: < 100ms
        - Database query: ~200ms
    """
    normalized_address = address.lower()
    cache_key = f"{KYC_CACHE_PREFIX}{normalized_address}"

    # Try cache first
    try:
        cached_tier = await cache.get(cache_key)
        if cached_tier is not None:
            # Convert cached string to KYCTier enum
            try:
                tier_value = int(cached_tier)
                return KYCTier(tier_value)
            except (ValueError, TypeError):
                # Invalid cache value, fallback to database
                pass
    except Exception:
        # Cache error, fallback to database
        pass

    # Cache miss or error - query database
    tier = await _query_user_kyc_tier_from_db(db, normalized_address)

    # Update cache (fire and forget)
    try:
        await cache_user_kyc_tier(address, tier)
    except Exception:
        # Cache error doesn't affect functionality
        pass

    return tier


async def _query_user_kyc_tier_from_db(
    db: AsyncSession, normalized_address: str
) -> KYCTier:
    """
    Query user KYC tier from database.

    Args:
        db: Database session
        normalized_address: Lowercase wallet address

    Returns:
        KYCTier enum (TIER_0 if user not found or no KYC record)
    """
    # Find user by address
    stmt = select(User).where(User.address.ilike(normalized_address))
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        return KYCTier.TIER_0

    # Find user's KYC record
    stmt_kyc = select(KYC).where(KYC.user_id == user.id)
    result_kyc = await db.execute(stmt_kyc)
    kyc_record = result_kyc.scalar_one_or_none()

    if not kyc_record:
        return KYCTier.TIER_0

    return kyc_record.tier


async def cache_user_kyc_tier(address: str, tier: KYCTier) -> bool:
    """
    Cache user KYC tier in Redis.

    Args:
        address: User wallet address
        tier: KYCTier enum

    Returns:
        True if successful, False otherwise

    Cache format:
        Key: "kyc:tier:{address_lowercase}"
        Value: tier value as string (e.g., "0", "1", "2")
        TTL: 5 minutes
    """
    normalized_address = address.lower()
    cache_key = f"{KYC_CACHE_PREFIX}{normalized_address}"

    try:
        return await cache.set(
            cache_key,
            str(tier.value),
            ttl=KYC_CACHE_TTL
        )
    except Exception:
        return False


async def invalidate_kyc_cache(address: str) -> int:
    """
    Invalidate (delete) user KYC tier cache.

    Should be called when user's KYC status changes (e.g., Webhook updates).

    Args:
        address: User wallet address

    Returns:
        Number of keys deleted (0 or 1)

    Usage:
        await invalidate_kyc_cache(user_address)  # After KYC approval/rejection
    """
    normalized_address = address.lower()
    cache_key = f"{KYC_CACHE_PREFIX}{normalized_address}"

    try:
        return await cache.delete(cache_key)
    except Exception:
        return 0


async def check_task_kyc_permission(
    db: AsyncSession,
    address: str,
    task_config: dict[str, Any] | None
) -> tuple[bool, str | None]:
    """
    Check if user has permission to access a task based on KYC tier requirement.

    Args:
        db: Database session
        address: User wallet address
        task_config: Task configuration dict (may contain "required_kyc_tier")

    Returns:
        Tuple of (has_permission: bool, error_message: str | None)

    Task config format:
        {
            "required_kyc_tier": 1,  # 0, 1, or 2 (optional field)
            "task_name": "Advanced RWA Task",
            ... other config fields
        }

    Permission logic:
        - If task_config is None or empty: Allow all users
        - If "required_kyc_tier" not in config: Allow all users
        - If user_tier >= required_tier: Allow
        - Otherwise: Deny with clear error message

    Example:
        has_perm, err = await check_task_kyc_permission(db, "0x123", {"required_kyc_tier": 1})
        if not has_perm:
            return {"error": err}, 403
    """
    # No config or empty config - allow all
    if not task_config:
        return (True, None)

    # Check if task has KYC requirement
    required_tier_value = task_config.get("required_kyc_tier")
    if required_tier_value is None:
        # No KYC requirement - allow all
        return (True, None)

    # Get user's KYC tier
    user_tier = await get_user_kyc_tier(db, address)

    # Check permission
    if user_tier.value >= required_tier_value:
        return (True, None)
    else:
        # Generate clear error message
        tier_name = f"Tier {required_tier_value}"
        error_message = (
            f"此任务需要 KYC {tier_name} 认证。"
            f"您当前的 KYC 等级为 Tier {user_tier.value}。"
            f"请先完成 KYC 认证以解锁此任务。"
        )
        return (False, error_message)
