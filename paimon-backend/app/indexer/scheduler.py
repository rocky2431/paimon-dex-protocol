"""
Indexer scheduler for periodic blockchain scanning.

Runs event listeners and data aggregators on schedule.
"""

import asyncio
import logging
import os
from typing import List

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from web3 import AsyncWeb3, AsyncHTTPProvider

from app.config.contracts import (
    DEX_FACTORY_ABI,
    DEX_PAIR_ABI,
    GAUGE_CONTROLLER_ABI,
    TREASURY_ABI,
    VAULT_ABI,
    VENFT_ABI,
    get_contract_address,
)
from app.indexer.event_listener import EventListener
from app.indexer.handlers.dex_handler import DEXEventHandler
from app.indexer.handlers.vault_handler import VaultEventHandler
from app.indexer.handlers.venft_handler import VeNFTEventHandler
from app.indexer.services.apr_recorder import APRRecorder
from app.indexer.services.health_monitor import HealthFactorMonitor
from app.core.database import get_db_session

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


class IndexerScheduler:
    """
    Scheduler for periodic blockchain event scanning.

    Runs indexers on configurable intervals.
    """

    def __init__(
        self,
        rpc_url: str,
        event_scan_interval: int = 30,
        aggregation_interval: int = 300,
    ):
        """
        Initialize scheduler.

        Args:
            rpc_url: BSC RPC URL
            event_scan_interval: Seconds between event scans (default: 30s)
            aggregation_interval: Seconds between portfolio aggregations (default: 5min)
        """
        self.rpc_url = rpc_url
        self.event_scan_interval = event_scan_interval
        self.aggregation_interval = aggregation_interval

        self.w3: AsyncWeb3 = None
        self.scheduler: AsyncIOScheduler = None

        # Event listeners
        self.dex_listeners: List[EventListener] = []
        self.vault_listener: EventListener = None
        self.venft_listener: EventListener = None

        # Services
        self.apr_recorder: APRRecorder = None
        self.health_monitor: HealthFactorMonitor = None

    async def initialize(self) -> None:
        """Initialize Web3 and create event listeners."""
        logger.info(f"Connecting to BSC Testnet: {self.rpc_url}")

        # Initialize Web3
        self.w3 = AsyncWeb3(AsyncHTTPProvider(self.rpc_url))

        # Verify connection
        is_connected = await self.w3.is_connected()
        if not is_connected:
            raise ConnectionError("Failed to connect to BSC Testnet")

        chain_id = await self.w3.eth.chain_id
        latest_block = await self.w3.eth.block_number
        logger.info(f"Connected to chain {chain_id}, latest block: {latest_block}")

        # Load contract addresses
        factory_address = get_contract_address("dex", "DEXFactory")
        vault_address = get_contract_address("core", "USDPVault")
        venft_address = get_contract_address("core", "VotingEscrowPaimon")
        gauge_controller_address = get_contract_address("governance", "GaugeController")

        # Create contracts
        factory = self.w3.eth.contract(address=factory_address, abi=DEX_FACTORY_ABI)
        vault = self.w3.eth.contract(address=vault_address, abi=VAULT_ABI)
        venft = self.w3.eth.contract(address=venft_address, abi=VENFT_ABI)
        gauge_controller = self.w3.eth.contract(
            address=gauge_controller_address,
            abi=GAUGE_CONTROLLER_ABI,
        )

        # Get all DEX pairs
        pairs = await self._get_all_pairs(factory)
        logger.info(f"Loaded {len(pairs)} DEX pairs")

        # Create pair contracts dict
        pair_contracts = {address: contract for address, contract in pairs}

        # Create event handlers
        dex_handler = DEXEventHandler(
            w3=self.w3,
            pair_contracts=pair_contracts,
            gauge_controller=gauge_controller,
        )

        vault_handler = VaultEventHandler(
            w3=self.w3,
            vault_contract=vault,
        )

        venft_handler = VeNFTEventHandler(
            w3=self.w3,
            venft_contract=venft,
        )

        # Create DEX listeners (one per pair)
        for pair_address, pair_contract in pairs:
            # Get pair name
            try:
                token0_addr = await pair_contract.functions.token0().call()
                token1_addr = await pair_contract.functions.token1().call()

                erc20_abi = [
                    {
                        "constant": True,
                        "inputs": [],
                        "name": "symbol",
                        "outputs": [{"name": "", "type": "string"}],
                        "type": "function",
                    }
                ]

                token0 = self.w3.eth.contract(address=token0_addr, abi=erc20_abi)
                token1 = self.w3.eth.contract(address=token1_addr, abi=erc20_abi)

                symbol0 = await token0.functions.symbol().call()
                symbol1 = await token1.functions.symbol().call()

                pair_name = f"{symbol0}/{symbol1}"
            except Exception:
                pair_name = f"Pair-{pair_address[:8]}"

            # Create listener
            listener = EventListener(
                w3=self.w3,
                contract_name=f"DEXPair-{pair_name}",
                contract=pair_contract,
                start_block=46648000,  # BSC Testnet deployment block
            )

            # Register handlers
            listener.register_handler("Mint", dex_handler.handle_mint)
            listener.register_handler("Burn", dex_handler.handle_burn)
            listener.register_handler("Swap", dex_handler.handle_swap)

            self.dex_listeners.append(listener)

            logger.info(f"Initialized listener for {pair_name}")

        # Create Vault listener
        self.vault_listener = EventListener(
            w3=self.w3,
            contract_name="USDPVault",
            contract=vault,
            start_block=46648000,
        )

        self.vault_listener.register_handler("Deposit", vault_handler.handle_deposit)
        self.vault_listener.register_handler("Withdraw", vault_handler.handle_withdraw)
        self.vault_listener.register_handler("Borrow", vault_handler.handle_borrow)
        self.vault_listener.register_handler("Repay", vault_handler.handle_repay)

        logger.info("Initialized Vault listener")

        # Create veNFT listener
        self.venft_listener = EventListener(
            w3=self.w3,
            contract_name="VotingEscrowPaimon",
            contract=venft,
            start_block=46648000,
        )

        # Use "Deposit" instead of "Lock" for veNFT
        self.venft_listener.register_handler("Deposit", venft_handler.handle_lock)
        self.venft_listener.register_handler("Withdraw", venft_handler.handle_unlock)
        self.venft_listener.register_handler("Merge", venft_handler.handle_merge)

        logger.info("Initialized veNFT listener")

        # Create APR recorder
        self.apr_recorder = APRRecorder(
            w3=self.w3,
            pair_contracts=pair_contracts,
            gauge_controller=gauge_controller,
        )
        logger.info("Initialized APR recorder")

        # Create Health Factor Monitor
        treasury_address = get_contract_address("treasury", "Treasury")
        treasury = self.w3.eth.contract(address=treasury_address, abi=TREASURY_ABI)

        self.health_monitor = HealthFactorMonitor(
            w3=self.w3,
            treasury_contract=treasury,
        )
        logger.info("Initialized Health Factor Monitor")

    async def _get_all_pairs(
        self,
        factory,
    ) -> list[tuple[str, any]]:
        """Get all DEX pairs from factory."""
        pairs_count = await factory.functions.allPairsLength().call()
        logger.info(f"Found {pairs_count} pairs in factory")

        pairs = []
        for i in range(pairs_count):
            pair_address = await factory.functions.allPairs(i).call()
            pair_contract = self.w3.eth.contract(address=pair_address, abi=DEX_PAIR_ABI)
            pairs.append((pair_address, pair_contract))

        return pairs

    async def scan_events(self) -> None:
        """Scan events for all contracts (scheduled job)."""
        logger.info("Starting scheduled event scan...")

        try:
            # Scan DEX pairs
            for listener in self.dex_listeners:
                await listener.sync(batch_size=1000, max_blocks=1000)

            # Scan Vault
            await self.vault_listener.sync(batch_size=1000, max_blocks=1000)

            # Scan veNFT
            await self.venft_listener.sync(batch_size=1000, max_blocks=1000)

            logger.info("Event scan completed successfully")

        except Exception as e:
            logger.error(f"Error during event scan: {e}", exc_info=True)

    async def record_apr_snapshots(self) -> None:
        """Record APR snapshots for all pools (scheduled job)."""
        logger.info("Starting APR snapshot recording...")

        try:
            async with get_db_session() as session:
                count = await self.apr_recorder.record_all_pools(session)
                logger.info(f"APR recording completed: {count} snapshots")

        except Exception as e:
            logger.error(f"Error during APR recording: {e}", exc_info=True)

    async def check_health_factors(self) -> None:
        """Check health factors and send liquidation warnings (scheduled job)."""
        logger.info("Starting health factor checks...")

        try:
            stats = await self.health_monitor.check_all_positions()
            logger.info(
                f"Health check completed: {stats['checked']} positions checked, "
                f"{stats['warnings_sent']} warnings sent, "
                f"{stats['critical_positions']} critical positions"
            )

        except Exception as e:
            logger.error(f"Error during health check: {e}", exc_info=True)

    async def aggregate_portfolios(self) -> None:
        """Aggregate portfolio summaries (scheduled job)."""
        logger.info("Starting portfolio aggregation...")

        try:
            # TODO: Implement portfolio aggregation
            # - Query all LP positions
            # - Query all Vault positions
            # - Query all veNFT positions
            # - Calculate total net worth
            # - Generate risk alerts
            # - Update portfolio_summary table

            logger.info("Portfolio aggregation completed (placeholder)")

        except Exception as e:
            logger.error(f"Error during portfolio aggregation: {e}", exc_info=True)

    def start(self) -> None:
        """Start the scheduler."""
        logger.info("Starting indexer scheduler...")

        # Create scheduler
        self.scheduler = AsyncIOScheduler()

        # Add jobs
        self.scheduler.add_job(
            self.scan_events,
            "interval",
            seconds=self.event_scan_interval,
            id="scan_events",
            name="Scan blockchain events",
        )

        self.scheduler.add_job(
            self.aggregate_portfolios,
            "interval",
            seconds=self.aggregation_interval,
            id="aggregate_portfolios",
            name="Aggregate portfolio summaries",
        )

        # Add hourly APR recording job
        self.scheduler.add_job(
            self.record_apr_snapshots,
            "interval",
            hours=1,  # Every hour
            id="record_apr",
            name="Record APR snapshots",
        )

        # Add health factor monitoring job (every 5 minutes)
        self.scheduler.add_job(
            self.check_health_factors,
            "interval",
            minutes=5,  # Every 5 minutes
            id="check_health",
            name="Check health factors",
        )

        # Start scheduler
        self.scheduler.start()

        logger.info(
            f"Scheduler started: event scan every {self.event_scan_interval}s, "
            f"aggregation every {self.aggregation_interval}s, APR recording every 1h, "
            f"health check every 5min"
        )

    def stop(self) -> None:
        """Stop the scheduler."""
        if self.scheduler:
            self.scheduler.shutdown()
            logger.info("Scheduler stopped")


async def main():
    """Main entry point for indexer scheduler."""
    # Get RPC URL from environment
    rpc_url = os.getenv(
        "BSC_TESTNET_RPC_URL",
        "https://data-seed-prebsc-1-s1.binance.org:8545",
    )

    # Create scheduler
    scheduler = IndexerScheduler(
        rpc_url=rpc_url,
        event_scan_interval=30,  # 30 seconds
        aggregation_interval=300,  # 5 minutes
    )

    # Initialize
    await scheduler.initialize()

    # Run initial sync
    logger.info("Running initial sync...")
    await scheduler.scan_events()
    await scheduler.aggregate_portfolios()

    # Start scheduler
    scheduler.start()

    # Keep running
    logger.info("Indexer running... Press Ctrl+C to stop")
    try:
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        scheduler.stop()


if __name__ == "__main__":
    asyncio.run(main())
