"""
Blockchain event listener for indexing smart contract events.

Scans blockchain events and updates database cache.
"""

import asyncio
import logging
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from web3 import AsyncWeb3
from web3.contract import AsyncContract
from web3.types import EventData, FilterParams

from app.core.database import get_db_session
from app.models.indexer import IndexerState

logger = logging.getLogger(__name__)


class EventListener:
    """
    Blockchain event listener.

    Monitors smart contract events and triggers handlers for data indexing.
    """

    def __init__(
        self,
        w3: AsyncWeb3,
        contract_name: str,
        contract: AsyncContract,
        start_block: int = 0,
    ):
        """
        Initialize event listener.

        Args:
            w3: Web3 instance
            contract_name: Contract name for state tracking
            contract: Contract instance
            start_block: Starting block number (default: 0 for chain start)
        """
        self.w3 = w3
        self.contract_name = contract_name
        self.contract = contract
        self.start_block = start_block

        # Event handlers registry: {event_name: handler_function}
        self.event_handlers: Dict[str, Callable] = {}

        # Scanning state
        self.is_syncing = False
        self.last_scanned_block = start_block

    def register_handler(
        self,
        event_name: str,
        handler: Callable[[EventData, AsyncSession], Any]
    ) -> None:
        """
        Register event handler.

        Args:
            event_name: Event name (e.g., "Mint", "Burn", "Swap")
            handler: Async handler function
        """
        self.event_handlers[event_name] = handler
        logger.info(f"Registered handler for {self.contract_name}.{event_name}")

    async def load_state(self, session: AsyncSession) -> None:
        """
        Load scanning state from database.

        Args:
            session: Database session
        """
        from sqlalchemy import select

        stmt = select(IndexerState).where(
            IndexerState.contract_name == self.contract_name
        )
        result = await session.execute(stmt)
        state = result.scalar_one_or_none()

        if state:
            self.last_scanned_block = state.last_scanned_block
            logger.info(
                f"Loaded state for {self.contract_name}: "
                f"last_scanned_block={self.last_scanned_block}"
            )
        else:
            # Initialize state if not exists
            state = IndexerState(
                contract_name=self.contract_name,
                last_scanned_block=self.start_block,
                last_scanned_at=datetime.utcnow(),
                is_syncing=False,
            )
            session.add(state)
            await session.commit()
            logger.info(f"Initialized state for {self.contract_name}")

    async def save_state(
        self,
        session: AsyncSession,
        last_block: int,
        is_syncing: bool = False,
    ) -> None:
        """
        Save scanning state to database.

        Args:
            session: Database session
            last_block: Last scanned block number
            is_syncing: Whether currently syncing
        """
        from sqlalchemy import select, update

        stmt = (
            update(IndexerState)
            .where(IndexerState.contract_name == self.contract_name)
            .values(
                last_scanned_block=last_block,
                last_scanned_at=datetime.utcnow(),
                is_syncing=is_syncing,
            )
        )
        await session.execute(stmt)
        await session.commit()

        self.last_scanned_block = last_block
        self.is_syncing = is_syncing

    async def scan_events(
        self,
        from_block: int,
        to_block: int,
        session: AsyncSession,
    ) -> int:
        """
        Scan events in block range.

        Args:
            from_block: Starting block
            to_block: Ending block
            session: Database session

        Returns:
            Number of events processed
        """
        total_events = 0

        for event_name, handler in self.event_handlers.items():
            try:
                # Get event from contract
                event = getattr(self.contract.events, event_name, None)
                if not event:
                    logger.warning(
                        f"Event {event_name} not found in {self.contract_name}"
                    )
                    continue

                # Create filter
                event_filter = await event.create_filter(
                    fromBlock=from_block,
                    toBlock=to_block,
                )

                # Get all events
                events = await event_filter.get_all_entries()

                # Process each event
                for event_data in events:
                    try:
                        await handler(event_data, session)
                        total_events += 1
                    except Exception as e:
                        logger.error(
                            f"Error processing {event_name} event "
                            f"at block {event_data['blockNumber']}: {e}",
                            exc_info=True,
                        )

                if events:
                    logger.info(
                        f"Processed {len(events)} {event_name} events "
                        f"from {self.contract_name}"
                    )

            except Exception as e:
                logger.error(
                    f"Error scanning {event_name} events: {e}",
                    exc_info=True,
                )

        return total_events

    async def sync(
        self,
        batch_size: int = 1000,
        max_blocks: Optional[int] = None,
    ) -> None:
        """
        Sync events from last scanned block to current block.

        Args:
            batch_size: Number of blocks to scan per batch
            max_blocks: Maximum blocks to scan (None for unlimited)
        """
        async with get_db_session() as session:
            # Load state
            await self.load_state(session)

            # Get current block
            current_block = await self.w3.eth.block_number

            # Calculate scan range
            from_block = self.last_scanned_block + 1
            to_block = current_block

            if max_blocks:
                to_block = min(from_block + max_blocks, current_block)

            if from_block > to_block:
                logger.debug(f"{self.contract_name} is up to date")
                return

            logger.info(
                f"Syncing {self.contract_name} from block {from_block} "
                f"to {to_block} ({to_block - from_block + 1} blocks)"
            )

            # Mark as syncing
            await self.save_state(session, self.last_scanned_block, is_syncing=True)

            try:
                # Scan in batches
                total_events = 0
                current = from_block

                while current <= to_block:
                    batch_end = min(current + batch_size - 1, to_block)

                    # Scan batch
                    events_count = await self.scan_events(
                        from_block=current,
                        to_block=batch_end,
                        session=session,
                    )
                    total_events += events_count

                    # Save progress
                    await self.save_state(session, batch_end, is_syncing=True)

                    logger.info(
                        f"Scanned {self.contract_name} blocks {current}-{batch_end} "
                        f"({events_count} events)"
                    )

                    current = batch_end + 1

                logger.info(
                    f"Sync complete for {self.contract_name}: "
                    f"{total_events} events processed"
                )

            finally:
                # Mark as not syncing
                await self.save_state(session, to_block, is_syncing=False)

    async def start_continuous_sync(
        self,
        interval_seconds: int = 30,
        batch_size: int = 1000,
    ) -> None:
        """
        Start continuous syncing loop.

        Args:
            interval_seconds: Seconds between sync attempts
            batch_size: Blocks per batch
        """
        logger.info(
            f"Starting continuous sync for {self.contract_name} "
            f"(interval: {interval_seconds}s)"
        )

        while True:
            try:
                await self.sync(batch_size=batch_size)
            except Exception as e:
                logger.error(
                    f"Error in continuous sync for {self.contract_name}: {e}",
                    exc_info=True,
                )

            await asyncio.sleep(interval_seconds)
