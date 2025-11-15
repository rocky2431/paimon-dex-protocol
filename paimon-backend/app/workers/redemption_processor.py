"""
Redemption processor background worker.

Processes pending points redemption requests by calling esPAIMON contract.
"""

import asyncio
import logging
from datetime import datetime, UTC

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from web3.exceptions import ContractLogicError

from app.core.config import settings
from app.models.redemption import PointsRedemption, RedemptionStatus
from app.models.user import User
from app.services.web3_service import get_web3_service

logger = logging.getLogger(__name__)

# Maximum retry attempts for failed transactions
MAX_RETRY_ATTEMPTS = 3

# Batch size for processing redemptions
BATCH_SIZE = 10


class RedemptionProcessor:
    """Background processor for points redemption requests."""

    def __init__(self):
        """Initialize redemption processor."""
        # Create async engine for background worker
        self.engine = create_async_engine(
            settings.DATABASE_URL,
            echo=False,
            pool_pre_ping=True,
        )

        # Create session factory
        self.async_session = sessionmaker(
            self.engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )

        # Initialize Web3 service
        self.web3_service = get_web3_service()

        logger.info("RedemptionProcessor initialized")

    async def process_pending_redemptions(self) -> int:
        """
        Process all pending redemptions in batch.

        Returns:
            Number of redemptions processed
        """
        processed_count = 0

        async with self.async_session() as db:
            try:
                # Query pending redemptions
                query = (
                    select(PointsRedemption)
                    .where(PointsRedemption.status == RedemptionStatus.PENDING)
                    .where(PointsRedemption.retry_count < MAX_RETRY_ATTEMPTS)
                    .order_by(PointsRedemption.created_at)
                    .limit(BATCH_SIZE)
                )

                result = await db.execute(query)
                pending_redemptions = result.scalars().all()

                if not pending_redemptions:
                    logger.debug("No pending redemptions to process")
                    return 0

                logger.info(f"Processing {len(pending_redemptions)} pending redemptions")

                # Process each redemption
                for redemption in pending_redemptions:
                    success = await self._process_single_redemption(db, redemption)
                    if success:
                        processed_count += 1

                # Commit all changes
                await db.commit()

                logger.info(f"Processed {processed_count}/{len(pending_redemptions)} redemptions")

                return processed_count

            except Exception as e:
                logger.error(f"Error processing redemptions: {e}")
                await db.rollback()
                return processed_count

    async def _process_single_redemption(
        self,
        db: AsyncSession,
        redemption: PointsRedemption
    ) -> bool:
        """
        Process a single redemption request.

        Args:
            db: Database session
            redemption: PointsRedemption record

        Returns:
            True if processed successfully, False otherwise
        """
        try:
            # Get user wallet address
            user_result = await db.execute(
                select(User.wallet_address).where(User.id == redemption.user_id)
            )
            user_wallet = user_result.scalar_one_or_none()

            if not user_wallet:
                logger.error(f"User {redemption.user_id} not found for redemption {redemption.id}")
                await self._mark_as_failed(
                    db,
                    redemption,
                    "User wallet address not found"
                )
                return False

            # Update status to PROCESSING
            redemption.status = RedemptionStatus.PROCESSING
            redemption.processed_at = datetime.now(UTC)
            await db.flush()

            logger.info(
                f"Processing redemption {redemption.id}: "
                f"user={user_wallet}, amount={redemption.espaimon_amount} Wei"
            )

            # Call Web3 service to vest tokens
            tx_hash, block_number = await self.web3_service.vest_espaimon(
                user_address=user_wallet,
                amount_wei=int(redemption.espaimon_amount)
            )

            # Update redemption with success
            redemption.status = RedemptionStatus.COMPLETED
            redemption.transaction_hash = tx_hash
            redemption.block_number = block_number
            redemption.completed_at = datetime.now(UTC)
            redemption.error_message = None

            logger.info(
                f"Redemption {redemption.id} completed: "
                f"tx_hash={tx_hash}, block={block_number}"
            )

            return True

        except ContractLogicError as e:
            # Contract execution error (likely permanent failure)
            error_msg = f"Contract error: {str(e)[:500]}"
            logger.error(f"Redemption {redemption.id} failed: {error_msg}")

            await self._mark_as_failed(db, redemption, error_msg)
            return False

        except Exception as e:
            # Other errors (may be temporary, allow retry)
            error_msg = f"Error: {str(e)[:500]}"
            logger.error(f"Redemption {redemption.id} error: {error_msg}")

            # Increment retry count
            redemption.retry_count += 1
            redemption.error_message = error_msg
            redemption.status = RedemptionStatus.PENDING  # Back to pending for retry

            if redemption.retry_count >= MAX_RETRY_ATTEMPTS:
                # Max retries reached, mark as failed
                await self._mark_as_failed(
                    db,
                    redemption,
                    f"Max retries ({MAX_RETRY_ATTEMPTS}) exceeded. Last error: {error_msg}"
                )

            return False

    async def _mark_as_failed(
        self,
        db: AsyncSession,
        redemption: PointsRedemption,
        error_message: str
    ) -> None:
        """
        Mark redemption as failed with error message.

        Args:
            db: Database session
            redemption: PointsRedemption record
            error_message: Error message to store
        """
        redemption.status = RedemptionStatus.FAILED
        redemption.error_message = error_message[:500]  # Truncate if too long
        redemption.completed_at = datetime.now(UTC)

        logger.warning(
            f"Redemption {redemption.id} marked as FAILED: {error_message}"
        )

    async def run_forever(self, interval_seconds: int = 60):
        """
        Run processor in infinite loop with interval.

        Args:
            interval_seconds: Seconds between each batch processing
        """
        logger.info(f"Starting redemption processor (interval={interval_seconds}s)")

        while True:
            try:
                await self.process_pending_redemptions()
            except Exception as e:
                logger.error(f"Unexpected error in processor loop: {e}")

            # Wait before next batch
            await asyncio.sleep(interval_seconds)

    async def close(self):
        """Close database engine."""
        await self.engine.dispose()
        logger.info("RedemptionProcessor closed")


async def main():
    """Main entry point for running processor as standalone service."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    processor = RedemptionProcessor()

    try:
        await processor.run_forever(interval_seconds=30)
    except KeyboardInterrupt:
        logger.info("Received shutdown signal")
    finally:
        await processor.close()


if __name__ == "__main__":
    asyncio.run(main())
