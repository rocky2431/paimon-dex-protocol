"""
Historical data API endpoints.

Provides time-series queries for APR trends and reward history.
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.models.historical import HistoricalAPR, HistoricalRewards

router = APIRouter(prefix="/api/v2/historical", tags=["historical"])


# Response models
class APRSnapshot(BaseModel):
    """Single APR snapshot."""

    pool_address: str
    pool_name: str
    timestamp: datetime
    apr: Decimal
    tvl_usd: Decimal
    trading_volume_24h: Decimal

    class Config:
        from_attributes = True


class APRHistoryResponse(BaseModel):
    """APR history response."""

    pool_address: str
    pool_name: str
    period: str  # "7d", "30d", "90d"
    snapshots: List[APRSnapshot]
    avg_apr: Decimal
    max_apr: Decimal
    min_apr: Decimal


class RewardSnapshot(BaseModel):
    """Single reward snapshot."""

    user_address: str
    pool_address: str
    timestamp: datetime
    reward_type: str
    amount: Decimal
    cumulative_amount: Decimal

    class Config:
        from_attributes = True


class RewardsHistoryResponse(BaseModel):
    """Rewards history response."""

    user_address: str
    pool_address: Optional[str]
    reward_type: Optional[str]
    period: str
    rewards: List[RewardSnapshot]
    total_earned: Decimal


@router.get("/apr/{pool_address}", response_model=APRHistoryResponse)
async def get_apr_history(
    pool_address: str,
    period: str = Query("30d", regex="^(7d|30d|90d)$"),
    session: AsyncSession = Depends(get_db_session),
) -> APRHistoryResponse:
    """
    Get APR history for a pool.

    Args:
        pool_address: Pool contract address
        period: Time period (7d, 30d, 90d)
        session: Database session

    Returns:
        APR history with statistics
    """
    # Normalize address
    pool_address = pool_address.lower()

    # Calculate time range
    period_days = {"7d": 7, "30d": 30, "90d": 90}[period]
    start_time = datetime.now(timezone.utc) - timedelta(days=period_days)

    # Query APR snapshots
    stmt = (
        select(HistoricalAPR)
        .where(
            HistoricalAPR.pool_address == pool_address,
            HistoricalAPR.timestamp >= start_time,
        )
        .order_by(HistoricalAPR.timestamp.desc())
    )

    result = await session.execute(stmt)
    snapshots = result.scalars().all()

    if not snapshots:
        # Return empty response
        return APRHistoryResponse(
            pool_address=pool_address,
            pool_name="Unknown",
            period=period,
            snapshots=[],
            avg_apr=Decimal("0"),
            max_apr=Decimal("0"),
            min_apr=Decimal("0"),
        )

    # Calculate statistics
    apr_values = [s.apr for s in snapshots]
    avg_apr = sum(apr_values, Decimal("0")) / len(apr_values)
    max_apr = max(apr_values)
    min_apr = min(apr_values)

    return APRHistoryResponse(
        pool_address=pool_address,
        pool_name=snapshots[0].pool_name,
        period=period,
        snapshots=[APRSnapshot.from_orm(s) for s in snapshots],
        avg_apr=avg_apr.quantize(Decimal("0.0001")),
        max_apr=max_apr,
        min_apr=min_apr,
    )


@router.get("/rewards/{user_address}", response_model=RewardsHistoryResponse)
async def get_rewards_history(
    user_address: str,
    pool_address: Optional[str] = None,
    reward_type: Optional[str] = Query(None, regex="^(lp|debt|boost|ecosystem)$"),
    period: str = Query("30d", regex="^(7d|30d|90d)$"),
    session: AsyncSession = Depends(get_db_session),
) -> RewardsHistoryResponse:
    """
    Get rewards history for a user.

    Args:
        user_address: User wallet address
        pool_address: Filter by pool (optional)
        reward_type: Filter by type (optional)
        period: Time period (7d, 30d, 90d)
        session: Database session

    Returns:
        Rewards history with total earnings
    """
    # Normalize addresses
    user_address = user_address.lower()
    if pool_address:
        pool_address = pool_address.lower()

    # Calculate time range
    period_days = {"7d": 7, "30d": 30, "90d": 90}[period]
    start_time = datetime.now(timezone.utc) - timedelta(days=period_days)

    # Build query
    stmt = select(HistoricalRewards).where(
        HistoricalRewards.user_address == user_address,
        HistoricalRewards.timestamp >= start_time,
    )

    if pool_address:
        stmt = stmt.where(HistoricalRewards.pool_address == pool_address)

    if reward_type:
        stmt = stmt.where(HistoricalRewards.reward_type == reward_type)

    stmt = stmt.order_by(HistoricalRewards.timestamp.desc())

    # Execute query
    result = await session.execute(stmt)
    rewards = result.scalars().all()

    # Calculate total earned
    total_earned = sum((r.amount for r in rewards), Decimal("0"))

    return RewardsHistoryResponse(
        user_address=user_address,
        pool_address=pool_address,
        reward_type=reward_type,
        period=period,
        rewards=[RewardSnapshot.from_orm(r) for r in rewards],
        total_earned=total_earned,
    )


@router.get("/apr/pools/all", response_model=List[APRSnapshot])
async def get_latest_apr_all_pools(
    session: AsyncSession = Depends(get_db_session),
) -> List[APRSnapshot]:
    """
    Get latest APR snapshot for all pools.

    Args:
        session: Database session

    Returns:
        List of latest APR snapshots
    """
    # Get latest timestamp
    stmt = select(HistoricalAPR).order_by(HistoricalAPR.timestamp.desc()).limit(100)

    result = await session.execute(stmt)
    snapshots = result.scalars().all()

    # Deduplicate by pool (keep latest for each pool)
    seen_pools = set()
    unique_snapshots = []
    for s in snapshots:
        if s.pool_address not in seen_pools:
            seen_pools.add(s.pool_address)
            unique_snapshots.append(APRSnapshot.from_orm(s))

    return unique_snapshots
