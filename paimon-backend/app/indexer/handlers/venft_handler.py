"""
veNFT event handler for voting escrow position indexing.

Processes Lock, Unlock, and Merge events from VotingEscrowPaimon.
"""

import logging
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from web3 import AsyncWeb3
from web3.contract import AsyncContract
from web3.types import EventData

from app.models.indexer import VeNFTPosition

logger = logging.getLogger(__name__)


class VeNFTEventHandler:
    """
    Handler for VotingEscrowPaimon events.

    Processes veNFT lock/unlock events and calculates voting power with linear decay.
    """

    def __init__(
        self,
        w3: AsyncWeb3,
        venft_contract: AsyncContract,
    ):
        """
        Initialize veNFT event handler.

        Args:
            w3: Web3 instance
            venft_contract: VotingEscrowPaimon contract
        """
        self.w3 = w3
        self.venft = venft_contract

        # Constants
        self.WEEK = 7 * 24 * 60 * 60  # 1 week in seconds
        self.MAX_LOCK_TIME = 4 * 365 * 24 * 60 * 60  # 4 years

    async def handle_lock(
        self,
        event: EventData,
        session: AsyncSession,
    ) -> None:
        """
        Handle Lock event (PAIMON locked to create/increase veNFT).

        Event signature: Lock(address indexed provider, uint256 indexed tokenId, uint256 value, uint256 locktime)

        Args:
            event: Lock event data
            session: Database session
        """
        user_address = event["args"]["provider"]
        token_id = event["args"]["tokenId"]
        value = event["args"]["value"]
        lock_end = event["args"]["locktime"]

        logger.info(
            f"Processing Lock event for {user_address[:10]}... "
            f"tokenId={token_id} value={value} lockEnd={lock_end}"
        )

        await self._update_venft_position(token_id, user_address, session)

    async def handle_unlock(
        self,
        event: EventData,
        session: AsyncSession,
    ) -> None:
        """
        Handle Withdraw event (veNFT unlocked, PAIMON withdrawn).

        Event signature: Withdraw(address indexed provider, uint256 indexed tokenId, uint256 value)

        Args:
            event: Withdraw event data
            session: Database session
        """
        user_address = event["args"]["provider"]
        token_id = event["args"]["tokenId"]
        value = event["args"]["value"]

        logger.info(
            f"Processing Withdraw event for {user_address[:10]}... "
            f"tokenId={token_id} value={value}"
        )

        # veNFT unlocked, delete position
        await self._delete_venft_position(token_id, session)

    async def handle_merge(
        self,
        event: EventData,
        session: AsyncSession,
    ) -> None:
        """
        Handle Merge event (two veNFTs merged into one).

        Event signature: Merge(address indexed provider, uint256 indexed from, uint256 indexed to)

        Args:
            event: Merge event data
            session: Database session
        """
        user_address = event["args"]["provider"]
        from_token_id = event["args"]["from"]
        to_token_id = event["args"]["to"]

        logger.info(
            f"Processing Merge event for {user_address[:10]}... "
            f"from={from_token_id} to={to_token_id}"
        )

        # Delete source NFT
        await self._delete_venft_position(from_token_id, session)

        # Update target NFT
        await self._update_venft_position(to_token_id, user_address, session)

    async def _update_venft_position(
        self,
        token_id: int,
        user_address: str,
        session: AsyncSession,
    ) -> None:
        """
        Update veNFT position for token.

        Args:
            token_id: veNFT token ID
            user_address: Owner address
            session: Database session
        """
        try:
            # Query on-chain lock data
            lock_data = await self.venft.functions.locked(token_id).call()
            locked_amount = lock_data[0]  # amount
            lock_end = lock_data[1]  # end timestamp

            # If no lock, delete position
            if locked_amount == 0:
                await self._delete_venft_position(token_id, session)
                return

            # Calculate voting power (linear decay)
            current_time = datetime.utcnow().timestamp()
            voting_power = self._calculate_voting_power(
                locked_amount, lock_end, current_time
            )

            # Calculate remaining days
            remaining_seconds = max(0, lock_end - current_time)
            remaining_days = int(remaining_seconds / 86400)

            # Check if expired
            is_expired = lock_end <= current_time

            # Convert amounts
            locked_amount_decimal = Decimal(locked_amount) / Decimal(10**18)
            voting_power_decimal = voting_power / Decimal(10**18)

            # Update or create position
            stmt = select(VeNFTPosition).where(VeNFTPosition.token_id == token_id)
            result = await session.execute(stmt)
            position = result.scalar_one_or_none()

            if position:
                # Update existing position
                position.user_address = user_address
                position.locked_amount = locked_amount_decimal
                position.lock_end = lock_end
                position.voting_power = voting_power_decimal
                position.remaining_days = remaining_days
                position.is_expired = is_expired

                logger.info(
                    f"Updated veNFT position tokenId={token_id} "
                    f"locked={locked_amount_decimal} vp={voting_power_decimal} "
                    f"days_left={remaining_days}"
                )
            else:
                # Create new position
                position = VeNFTPosition(
                    user_address=user_address,
                    token_id=token_id,
                    locked_amount=locked_amount_decimal,
                    lock_end=lock_end,
                    voting_power=voting_power_decimal,
                    remaining_days=remaining_days,
                    is_expired=is_expired,
                )
                session.add(position)

                logger.info(
                    f"Created veNFT position tokenId={token_id} "
                    f"locked={locked_amount_decimal} vp={voting_power_decimal} "
                    f"days_left={remaining_days}"
                )

            await session.commit()

        except Exception as e:
            logger.error(
                f"Error updating veNFT position for token {token_id}: {e}",
                exc_info=True,
            )
            await session.rollback()

    async def _delete_venft_position(
        self,
        token_id: int,
        session: AsyncSession,
    ) -> None:
        """
        Delete veNFT position (unlocked or merged).

        Args:
            token_id: veNFT token ID
            session: Database session
        """
        stmt = delete(VeNFTPosition).where(VeNFTPosition.token_id == token_id)
        await session.execute(stmt)
        await session.commit()

        logger.info(f"Deleted veNFT position tokenId={token_id}")

    def _calculate_voting_power(
        self,
        locked_amount: int,
        lock_end: int,
        current_time: float,
    ) -> Decimal:
        """
        Calculate voting power with linear decay.

        Formula: voting_power = locked_amount * (lock_end - current_time) / MAX_LOCK_TIME

        Args:
            locked_amount: Locked PAIMON amount (in Wei)
            lock_end: Lock end timestamp
            current_time: Current timestamp

        Returns:
            Voting power (in Wei)
        """
        # If expired, voting power is 0
        if lock_end <= current_time:
            return Decimal(0)

        # Calculate remaining time
        remaining_time = lock_end - current_time

        # Linear decay: vp = amount * (remaining_time / MAX_LOCK_TIME)
        voting_power = Decimal(locked_amount) * Decimal(remaining_time) / Decimal(
            self.MAX_LOCK_TIME
        )

        return voting_power
