"""
Rewards Recorder service for historical rewards claim recording.

Records reward claims from RewardDistributor events.
"""

import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from web3 import AsyncWeb3
from web3.contract import AsyncContract

from app.models.historical import HistoricalRewards

logger = logging.getLogger(__name__)


class RewardsRecorder:
    """
    Records historical reward claims from blockchain events.

    Processes RewardClaimed events and saves to historical_rewards table.
    """

    def __init__(self, w3: AsyncWeb3, reward_distributor: AsyncContract):
        """
        Initialize rewards recorder.

        Args:
            w3: AsyncWeb3 instance
            reward_distributor: RewardDistributor contract
        """
        self.w3 = w3
        self.reward_distributor = reward_distributor

    async def record_reward_claim(
        self,
        user_address: str,
        pool_address: str,
        reward_type: str,
        amount: int,
        session: AsyncSession,
    ) -> None:
        """
        Record a reward claim event.

        Args:
            user_address: User who claimed
            pool_address: Pool address
            reward_type: Type (lp, debt, boost, ecosystem)
            amount: Reward amount (wei)
            session: Database session
        """
        # Convert amount to Decimal
        amount_decimal = Decimal(amount) / Decimal(10**18)

        # Get cumulative amount for user
        cumulative = await self._get_cumulative_amount(
            user_address, pool_address, reward_type, session
        )
        cumulative += amount_decimal

        # Create record
        reward_data = {
            "user_address": user_address.lower(),
            "pool_address": pool_address.lower(),
            "timestamp": datetime.now(timezone.utc),
            "reward_type": reward_type,
            "amount": amount_decimal,
            "cumulative_amount": cumulative,
        }

        await self._save_reward(reward_data, session)

    async def _get_cumulative_amount(
        self, user_address: str, pool_address: str, reward_type: str, session: AsyncSession
    ) -> Decimal:
        """Get cumulative rewards for user/pool/type."""
        stmt = (
            select(HistoricalRewards.cumulative_amount)
            .where(
                HistoricalRewards.user_address == user_address.lower(),
                HistoricalRewards.pool_address == pool_address.lower(),
                HistoricalRewards.reward_type == reward_type,
            )
            .order_by(HistoricalRewards.timestamp.desc())
            .limit(1)
        )

        result = await session.execute(stmt)
        last_cumulative = result.scalar_one_or_none()

        return last_cumulative if last_cumulative else Decimal("0")

    async def _save_reward(
        self, reward_data: Dict[str, any], session: AsyncSession
    ) -> None:
        """Save reward record to database."""
        # Check for duplicate
        stmt = select(HistoricalRewards).where(
            HistoricalRewards.user_address == reward_data["user_address"],
            HistoricalRewards.pool_address == reward_data["pool_address"],
            HistoricalRewards.timestamp == reward_data["timestamp"],
            HistoricalRewards.reward_type == reward_data["reward_type"],
        )
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            logger.debug(f"Reward record already exists, skipping")
            return

        # Create new record
        reward = HistoricalRewards(**reward_data)
        session.add(reward)
        await session.commit()

        logger.debug(
            f"Recorded reward: {reward_data['user_address'][:10]}... "
            f"{reward_data['amount']} {reward_data['reward_type']}"
        )
