"""
APR Recorder service for historical APR snapshot recording.

Records hourly APR snapshots for all active liquidity pools.
"""

import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, List, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from web3 import AsyncWeb3
from web3.contract import AsyncContract

from app.models.historical import HistoricalAPR

logger = logging.getLogger(__name__)

# Mock PAIMON price (Task 68 will add real oracle)
MOCK_PAIMON_PRICE_USD = Decimal("0.50")

# DEX constants
FEE_RATE = Decimal("0.003")  # 0.3% per swap
HOURS_PER_YEAR = Decimal("8760")  # 365 * 24
WEEKS_PER_YEAR = Decimal("52")


class APRRecorder:
    """
    Records hourly APR snapshots for liquidity pools.

    Calculates total APR from:
    1. Trading fee APR (based on 24h volume)
    2. Gauge emission APR (based on weekly PAIMON emissions)
    """

    def __init__(
        self,
        w3: AsyncWeb3,
        pair_contracts: Dict[str, AsyncContract],
        gauge_controller: AsyncContract,
        paimon_price_usd: Decimal = MOCK_PAIMON_PRICE_USD,
    ):
        """
        Initialize APR recorder.

        Args:
            w3: AsyncWeb3 instance
            pair_contracts: Dict of {pair_address: pair_contract}
            gauge_controller: GaugeController contract
            paimon_price_usd: PAIMON price in USD (default: mock price)
        """
        self.w3 = w3
        self.pair_contracts = pair_contracts
        self.gauge_controller = gauge_controller
        self.paimon_price_usd = paimon_price_usd

    async def record_all_pools(self, session: AsyncSession) -> int:
        """
        Record APR snapshots for all active pools.

        Args:
            session: Database session

        Returns:
            Number of snapshots recorded
        """
        logger.info(f"Recording APR for {len(self.pair_contracts)} pools...")

        recorded_count = 0
        for pair_address, pair_contract in self.pair_contracts.items():
            try:
                apr_data = await self._calculate_apr(pair_address, pair_contract)
                await self._save_snapshot(apr_data, session)
                recorded_count += 1
            except Exception as e:
                logger.error(
                    f"Failed to record APR for {pair_address}: {e}", exc_info=True
                )
                # Continue with other pools

        logger.info(f"APR recording completed: {recorded_count}/{len(self.pair_contracts)} pools")
        return recorded_count

    async def _calculate_apr(
        self, pair_address: str, pair: AsyncContract
    ) -> Dict[str, any]:
        """
        Calculate total APR for a pool.

        Args:
            pair_address: Pool contract address
            pair: Pool contract instance

        Returns:
            Dict with APR data (pool_address, pool_name, apr, tvl_usd, etc.)
        """
        # Get pool metadata
        token0_addr = await pair.functions.token0().call()
        token1_addr = await pair.functions.token1().call()

        # Get token symbols
        pool_name = await self._get_pool_name(token0_addr, token1_addr)

        # Get reserves and calculate TVL
        reserves = await pair.functions.getReserves().call()
        reserve0, reserve1, _ = reserves

        # Simplified TVL (assume both tokens = $1 for now, Task 68 adds real prices)
        tvl_usd = Decimal(reserve0 + reserve1) / Decimal(10**18)

        # Calculate trading volume (simplified: estimate from reserve changes)
        # Real implementation would query Swap events from last 24h
        trading_volume_24h = tvl_usd * Decimal("0.1")  # Mock: 10% daily turnover

        # Calculate fee APR
        fee_apr = self._calculate_fee_apr(trading_volume_24h, tvl_usd)

        # Calculate emission APR
        emission_apr = await self._calculate_emission_apr(pair_address, tvl_usd)

        # Total APR
        total_apr = fee_apr + emission_apr

        return {
            "pool_address": pair_address,
            "pool_name": pool_name,
            "timestamp": datetime.now(timezone.utc),
            "apr": total_apr,
            "tvl_usd": tvl_usd,
            "trading_volume_24h": trading_volume_24h,
        }

    def _calculate_fee_apr(
        self, trading_volume_24h: Decimal, tvl_usd: Decimal
    ) -> Decimal:
        """
        Calculate trading fee APR.

        Formula: (24h Volume × Fee Rate × 365 / TVL) × 100

        Args:
            trading_volume_24h: 24-hour trading volume in USD
            tvl_usd: Total value locked in USD

        Returns:
            Fee APR percentage
        """
        if tvl_usd == 0:
            return Decimal("0")

        # Annual fee revenue = daily volume × fee rate × 365
        annual_fees = trading_volume_24h * FEE_RATE * Decimal("365")

        # APR = (annual fees / TVL) × 100
        fee_apr = (annual_fees / tvl_usd) * Decimal("100")

        return fee_apr.quantize(Decimal("0.0001"))  # 4 decimal places

    async def _calculate_emission_apr(
        self, pair_address: str, tvl_usd: Decimal
    ) -> Decimal:
        """
        Calculate gauge emission APR.

        Formula: (Weekly Emission × PAIMON Price × 52 / TVL) × 100

        Args:
            pair_address: Pool address
            tvl_usd: Total value locked in USD

        Returns:
            Emission APR percentage
        """
        if tvl_usd == 0:
            return Decimal("0")

        try:
            # Get gauge for this pool
            gauge_address = await self.gauge_controller.functions.gauges(
                pair_address
            ).call()

            if gauge_address == "0x0000000000000000000000000000000000000000":
                return Decimal("0")  # No gauge = no emissions

            # Get gauge weight (mock: 10% of total emissions)
            gauge_weight = Decimal("0.1")  # Simplified

            # Weekly PAIMON emission (mock: 1M PAIMON/week)
            weekly_emission = Decimal("1000000") * gauge_weight

            # Annual emission value = weekly × price × 52
            annual_emission_value = (
                weekly_emission * self.paimon_price_usd * WEEKS_PER_YEAR
            )

            # APR = (annual emission value / TVL) × 100
            emission_apr = (annual_emission_value / tvl_usd) * Decimal("100")

            return emission_apr.quantize(Decimal("0.0001"))

        except Exception as e:
            logger.warning(
                f"Failed to calculate emission APR for {pair_address}: {e}"
            )
            return Decimal("0")

    async def _get_pool_name(self, token0: str, token1: str) -> str:
        """
        Get pool name from token addresses.

        Args:
            token0: Token0 address
            token1: Token1 address

        Returns:
            Pool name (e.g., "USDC/USDP")
        """
        # ERC20 symbol ABI
        erc20_abi = [
            {
                "constant": True,
                "inputs": [],
                "name": "symbol",
                "outputs": [{"name": "", "type": "string"}],
                "type": "function",
            }
        ]

        try:
            token0_contract = self.w3.eth.contract(address=token0, abi=erc20_abi)
            token1_contract = self.w3.eth.contract(address=token1, abi=erc20_abi)

            symbol0 = await token0_contract.functions.symbol().call()
            symbol1 = await token1_contract.functions.symbol().call()

            return f"{symbol0}/{symbol1}"
        except Exception:
            return f"Pool-{token0[:8]}/{token1[:8]}"

    async def _save_snapshot(
        self, apr_data: Dict[str, any], session: AsyncSession
    ) -> None:
        """
        Save APR snapshot to database.

        Args:
            apr_data: APR data dict
            session: Database session
        """
        # Check for existing snapshot (prevent duplicates)
        stmt = select(HistoricalAPR).where(
            HistoricalAPR.pool_address == apr_data["pool_address"],
            HistoricalAPR.timestamp == apr_data["timestamp"],
        )
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            logger.debug(
                f"Snapshot already exists for {apr_data['pool_name']} at {apr_data['timestamp']}"
            )
            return

        # Create new snapshot
        snapshot = HistoricalAPR(**apr_data)
        session.add(snapshot)
        await session.commit()

        logger.debug(
            f"Recorded APR snapshot: {apr_data['pool_name']} = {apr_data['apr']}%"
        )
