"""
Main indexer script for LP positions.

Usage:
    poetry run python -m app.indexer.main
"""

import asyncio
import logging
import os

from web3 import AsyncWeb3, AsyncHTTPProvider

from app.config.contracts import (
    DEX_FACTORY_ABI,
    DEX_PAIR_ABI,
    GAUGE_CONTROLLER_ABI,
    get_contract_address,
)
from app.indexer.event_listener import EventListener
from app.indexer.handlers.dex_handler import DEXEventHandler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


async def get_all_pairs(
    w3: AsyncWeb3,
    factory_address: str,
) -> list[tuple[str, any]]:
    """
    Get all DEX pairs from factory.

    Args:
        w3: Web3 instance
        factory_address: DEXFactory address

    Returns:
        List of (pair_address, pair_contract) tuples
    """
    factory = w3.eth.contract(address=factory_address, abi=DEX_FACTORY_ABI)

    pairs_count = await factory.functions.allPairsLength().call()
    logger.info(f"Found {pairs_count} pairs in factory")

    pairs = []
    for i in range(pairs_count):
        pair_address = await factory.functions.allPairs(i).call()
        pair_contract = w3.eth.contract(address=pair_address, abi=DEX_PAIR_ABI)
        pairs.append((pair_address, pair_contract))

    return pairs


async def main():
    """Main indexer entry point."""
    # Get RPC URL from environment
    rpc_url = os.getenv(
        "BSC_TESTNET_RPC_URL",
        "https://data-seed-prebsc-1-s1.binance.org:8545",
    )

    logger.info(f"Connecting to BSC Testnet: {rpc_url}")

    # Initialize Web3
    w3 = AsyncWeb3(AsyncHTTPProvider(rpc_url))

    # Verify connection
    is_connected = await w3.is_connected()
    if not is_connected:
        logger.error("Failed to connect to BSC Testnet")
        return

    chain_id = await w3.eth.chain_id
    latest_block = await w3.eth.block_number
    logger.info(f"Connected to chain {chain_id}, latest block: {latest_block}")

    # Load contracts
    factory_address = get_contract_address("dex", "DEXFactory")
    gauge_controller_address = get_contract_address("governance", "GaugeController")

    # Get all pairs
    pairs = await get_all_pairs(w3, factory_address)
    logger.info(f"Loaded {len(pairs)} DEX pairs")

    # Create pair contracts dict
    pair_contracts = {address: contract for address, contract in pairs}

    # Initialize GaugeController
    gauge_controller = w3.eth.contract(
        address=gauge_controller_address,
        abi=GAUGE_CONTROLLER_ABI,
    )

    # Create DEX event handler
    dex_handler = DEXEventHandler(
        w3=w3,
        pair_contracts=pair_contracts,
        gauge_controller=gauge_controller,
    )

    # Create event listeners for each pair
    listeners = []
    for pair_address, pair_contract in pairs:
        # Get pair name for logging
        token0_addr = await pair_contract.functions.token0().call()
        token1_addr = await pair_contract.functions.token1().call()

        # Get token symbols (simplified, assumes standard ERC20)
        try:
            from web3 import Web3

            erc20_abi = [
                {
                    "constant": True,
                    "inputs": [],
                    "name": "symbol",
                    "outputs": [{"name": "", "type": "string"}],
                    "type": "function",
                }
            ]

            token0 = w3.eth.contract(address=token0_addr, abi=erc20_abi)
            token1 = w3.eth.contract(address=token1_addr, abi=erc20_abi)

            symbol0 = await token0.functions.symbol().call()
            symbol1 = await token1.functions.symbol().call()

            pair_name = f"{symbol0}/{symbol1}"
        except Exception:
            pair_name = f"Pair-{pair_address[:8]}"

        # Create listener for this pair
        listener = EventListener(
            w3=w3,
            contract_name=f"DEXPair-{pair_name}",
            contract=pair_contract,
            start_block=46648000,  # BSC Testnet deployment block (approximate)
        )

        # Register event handlers
        listener.register_handler("Mint", dex_handler.handle_mint)
        listener.register_handler("Burn", dex_handler.handle_burn)
        listener.register_handler("Swap", dex_handler.handle_swap)

        listeners.append(listener)

        logger.info(f"Initialized listener for {pair_name} at {pair_address[:10]}...")

    # Run initial sync for all pairs
    logger.info("Starting initial sync for all pairs...")
    for listener in listeners:
        try:
            await listener.sync(batch_size=1000, max_blocks=10000)
        except Exception as e:
            logger.error(f"Error syncing {listener.contract_name}: {e}", exc_info=True)

    logger.info("Initial sync complete")

    # Start continuous sync (optional, comment out for manual testing)
    # logger.info("Starting continuous sync (press Ctrl+C to stop)...")
    # await asyncio.gather(*[
    #     listener.start_continuous_sync(interval_seconds=30, batch_size=1000)
    #     for listener in listeners
    # ])


if __name__ == "__main__":
    asyncio.run(main())
