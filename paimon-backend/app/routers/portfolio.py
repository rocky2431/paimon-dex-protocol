"""
Portfolio API endpoints with cached data.

Fast portfolio queries using indexed blockchain data.
"""

from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.models.indexer import (
    LPPosition,
    PortfolioSummary,
    VaultPosition,
    VeNFTPosition,
)

router = APIRouter(prefix="/api/v2/portfolio", tags=["portfolio"])


# Response schemas
class LPPositionResponse(BaseModel):
    """LP position response."""

    pair_address: str
    pool_name: str
    lp_token_balance: Decimal
    share_percentage: Decimal
    liquidity_usd: Decimal
    token0_amount: Decimal
    token1_amount: Decimal
    token0_symbol: str
    token1_symbol: str
    current_apr: Decimal
    pending_rewards: Decimal

    class Config:
        from_attributes = True


class VaultPositionResponse(BaseModel):
    """Vault position response."""

    collateral_address: str
    asset_name: str
    collateral_amount: Decimal
    collateral_value_usd: Decimal
    debt_amount: Decimal
    ltv_ratio: Decimal
    health_factor: Decimal
    liquidation_price: Decimal

    class Config:
        from_attributes = True


class VeNFTPositionResponse(BaseModel):
    """veNFT position response."""

    token_id: int
    locked_amount: Decimal
    lock_end: int
    voting_power: Decimal
    remaining_days: int
    is_expired: bool

    class Config:
        from_attributes = True


class PortfolioResponse(BaseModel):
    """Complete portfolio response."""

    user_address: str

    # Summary
    total_net_worth: Decimal
    total_lp_value: Decimal
    total_collateral_value: Decimal
    total_debt: Decimal
    total_locked_paimon: Decimal
    total_pending_rewards: Decimal
    risk_alerts: list

    # Positions
    lp_positions: List[LPPositionResponse]
    vault_positions: List[VaultPositionResponse]
    venft_positions: List[VeNFTPositionResponse]

    # Metadata
    last_updated: str
    cache_version: int


@router.get("/{address}", response_model=PortfolioResponse)
async def get_portfolio(
    address: str,
    session: AsyncSession = Depends(get_db_session),
) -> PortfolioResponse:
    """
    Get complete portfolio for address (cached data).

    Fast response (<500ms) using indexed blockchain data.

    Args:
        address: User wallet address
        session: Database session

    Returns:
        Complete portfolio with LP, Vault, and veNFT positions

    Raises:
        HTTPException: 404 if portfolio not found
    """
    # Normalize address
    address = address.lower()

    # Query portfolio summary
    stmt = select(PortfolioSummary).where(PortfolioSummary.user_address == address)
    result = await session.execute(stmt)
    summary = result.scalar_one_or_none()

    # If no summary exists, return empty portfolio
    if not summary:
        return PortfolioResponse(
            user_address=address,
            total_net_worth=Decimal(0),
            total_lp_value=Decimal(0),
            total_collateral_value=Decimal(0),
            total_debt=Decimal(0),
            total_locked_paimon=Decimal(0),
            total_pending_rewards=Decimal(0),
            risk_alerts=[],
            lp_positions=[],
            vault_positions=[],
            venft_positions=[],
            last_updated="never",
            cache_version=0,
        )

    # Query LP positions
    stmt = select(LPPosition).where(LPPosition.user_address == address)
    result = await session.execute(stmt)
    lp_positions = result.scalars().all()

    # Query Vault positions
    stmt = select(VaultPosition).where(VaultPosition.user_address == address)
    result = await session.execute(stmt)
    vault_positions = result.scalars().all()

    # Query veNFT positions
    stmt = select(VeNFTPosition).where(VeNFTPosition.user_address == address)
    result = await session.execute(stmt)
    venft_positions = result.scalars().all()

    # Build response
    return PortfolioResponse(
        user_address=address,
        total_net_worth=summary.total_net_worth,
        total_lp_value=summary.total_lp_value,
        total_collateral_value=summary.total_collateral_value,
        total_debt=summary.total_debt,
        total_locked_paimon=summary.total_locked_paimon,
        total_pending_rewards=summary.total_pending_rewards,
        risk_alerts=summary.risk_alerts if summary.risk_alerts else [],
        lp_positions=[
            LPPositionResponse.from_orm(pos) for pos in lp_positions
        ],
        vault_positions=[
            VaultPositionResponse.from_orm(pos) for pos in vault_positions
        ],
        venft_positions=[
            VeNFTPositionResponse.from_orm(pos) for pos in venft_positions
        ],
        last_updated=summary.last_updated.isoformat(),
        cache_version=summary.cache_version,
    )


@router.get("/{address}/lp", response_model=List[LPPositionResponse])
async def get_lp_positions(
    address: str,
    session: AsyncSession = Depends(get_db_session),
) -> List[LPPositionResponse]:
    """
    Get LP positions for address.

    Args:
        address: User wallet address
        session: Database session

    Returns:
        List of LP positions
    """
    address = address.lower()

    stmt = select(LPPosition).where(LPPosition.user_address == address)
    result = await session.execute(stmt)
    positions = result.scalars().all()

    return [LPPositionResponse.from_orm(pos) for pos in positions]


@router.get("/{address}/vault", response_model=List[VaultPositionResponse])
async def get_vault_positions(
    address: str,
    session: AsyncSession = Depends(get_db_session),
) -> List[VaultPositionResponse]:
    """
    Get Vault positions for address.

    Args:
        address: User wallet address
        session: Database session

    Returns:
        List of Vault positions
    """
    address = address.lower()

    stmt = select(VaultPosition).where(VaultPosition.user_address == address)
    result = await session.execute(stmt)
    positions = result.scalars().all()

    return [VaultPositionResponse.from_orm(pos) for pos in positions]


@router.get("/{address}/venft", response_model=List[VeNFTPositionResponse])
async def get_venft_positions(
    address: str,
    session: AsyncSession = Depends(get_db_session),
) -> List[VeNFTPositionResponse]:
    """
    Get veNFT positions for address.

    Args:
        address: User wallet address
        session: Database session

    Returns:
        List of veNFT positions
    """
    address = address.lower()

    stmt = select(VeNFTPosition).where(VeNFTPosition.user_address == address)
    result = await session.execute(stmt)
    positions = result.scalars().all()

    return [VeNFTPositionResponse.from_orm(pos) for pos in positions]
