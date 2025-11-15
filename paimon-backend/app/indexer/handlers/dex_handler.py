"""
DEX event handler for LP position indexing.

Processes Mint, Burn, and Swap events from DEX pairs.
"""

import logging
from decimal import Decimal
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from web3 import AsyncWeb3
from web3.contract import AsyncContract
from web3.types import EventData

from app.models.indexer import LPPosition

logger = logging.getLogger(__name__)


class DEXEventHandler:
    """
    Handler for DEX pair events.

    Processes LP events and updates position cache.
    """

    def __init__(
        self,
        w3: AsyncWeb3,
        pair_contracts: dict[str, AsyncContract],
        gauge_controller: AsyncContract,
        price_oracle: Optional[AsyncContract] = None,
    ):
        """
        Initialize DEX event handler.

        Args:
            w3: Web3 instance
            pair_contracts: Dict of {pair_address: pair_contract}
            gauge_controller: GaugeController contract for APR
            price_oracle: Optional price oracle for USD valuation
        """
        self.w3 = w3
        self.pair_contracts = pair_contracts
        self.gauge_controller = gauge_controller
        self.price_oracle = price_oracle

    async def handle_mint(
        self,
        event: EventData,
        session: AsyncSession,
    ) -> None:
        """
        Handle Mint event (liquidity added).

        Event signature: Mint(address indexed sender, uint amount0, uint amount1)

        Args:
            event: Mint event data
            session: Database session
        """
        pair_address = event["address"]
        user_address = event["args"]["sender"]

        logger.info(
            f"Processing Mint event for {user_address} "
            f"in pair {pair_address[:10]}..."
        )

        await self._update_lp_position(pair_address, user_address, session)

    async def handle_burn(
        self,
        event: EventData,
        session: AsyncSession,
    ) -> None:
        """
        Handle Burn event (liquidity removed).

        Event signature: Burn(address indexed sender, uint amount0, uint amount1, address indexed to)

        Args:
            event: Burn event data
            session: Database session
        """
        pair_address = event["address"]
        user_address = event["args"]["to"]

        logger.info(
            f"Processing Burn event for {user_address} "
            f"in pair {pair_address[:10]}..."
        )

        await self._update_lp_position(pair_address, user_address, session)

    async def handle_swap(
        self,
        event: EventData,
        session: AsyncSession,
    ) -> None:
        """
        Handle Swap event (affects reserves and APR).

        Event signature: Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)

        Args:
            event: Swap event data
            session: Database session
        """
        pair_address = event["address"]

        # Swap affects all LP positions in this pair (APR changes)
        # For now, we'll update positions on next scheduled aggregation
        # to avoid updating all positions on every swap

        logger.debug(f"Swap event in pair {pair_address[:10]}... (APR may change)")

    async def _update_lp_position(
        self,
        pair_address: str,
        user_address: str,
        session: AsyncSession,
    ) -> None:
        """
        Update LP position for user in pair.

        Args:
            pair_address: Pair contract address
            user_address: User address
            session: Database session
        """
        try:
            # Get pair contract
            pair = self.pair_contracts.get(pair_address)
            if not pair:
                logger.warning(f"Pair contract not found: {pair_address}")
                return

            # Query on-chain data
            lp_balance = await pair.functions.balanceOf(user_address).call()
            total_supply = await pair.functions.totalSupply().call()
            reserves = await pair.functions.getReserves().call()
            token0_addr = await pair.functions.token0().call()
            token1_addr = await pair.functions.token1().call()

            # If user has no balance, delete position
            if lp_balance == 0:
                await self._delete_lp_position(pair_address, user_address, session)
                return

            # Get token contracts
            from web3 import Web3
            erc20_abi = [
                {
                    "constant": True,
                    "inputs": [],
                    "name": "symbol",
                    "outputs": [{"name": "", "type": "string"}],
                    "type": "function",
                },
                {
                    "constant": True,
                    "inputs": [],
                    "name": "decimals",
                    "outputs": [{"name": "", "type": "uint8"}],
                    "type": "function",
                },
            ]

            token0 = self.w3.eth.contract(address=token0_addr, abi=erc20_abi)
            token1 = self.w3.eth.contract(address=token1_addr, abi=erc20_abi)

            token0_symbol = await token0.functions.symbol().call()
            token1_symbol = await token1.functions.symbol().call()

            # Calculate share percentage
            share_percentage = Decimal(lp_balance) / Decimal(total_supply) * 100

            # Calculate token amounts
            token0_amount = (
                Decimal(lp_balance) / Decimal(total_supply) * Decimal(reserves[0])
            )
            token1_amount = (
                Decimal(lp_balance) / Decimal(total_supply) * Decimal(reserves[1])
            )

            # Calculate liquidity USD (simplified: assume USDC/USDP = $1)
            # In production, use price oracle
            liquidity_usd = await self._calculate_liquidity_usd(
                token0_symbol,
                token1_symbol,
                token0_amount,
                token1_amount,
            )

            # Get APR from GaugeController
            current_apr = await self._get_pair_apr(pair_address)

            # Get pending rewards (TODO: implement)
            pending_rewards = Decimal(0)

            # Create pool name
            pool_name = f"{token0_symbol}/{token1_symbol}"

            # Update or create position
            stmt = select(LPPosition).where(
                LPPosition.user_address == user_address,
                LPPosition.pair_address == pair_address,
            )
            result = await session.execute(stmt)
            position = result.scalar_one_or_none()

            # Convert Wei to decimals (assuming 18 decimals)
            lp_balance_decimal = Decimal(lp_balance) / Decimal(10**18)
            token0_amount_decimal = token0_amount / Decimal(10**18)
            token1_amount_decimal = token1_amount / Decimal(10**18)

            if position:
                # Update existing position
                position.lp_token_balance = lp_balance_decimal
                position.share_percentage = share_percentage
                position.liquidity_usd = liquidity_usd
                position.token0_amount = token0_amount_decimal
                position.token1_amount = token1_amount_decimal
                position.token0_symbol = token0_symbol
                position.token1_symbol = token1_symbol
                position.current_apr = current_apr
                position.pending_rewards = pending_rewards

                logger.info(
                    f"Updated LP position for {user_address[:10]}... "
                    f"in {pool_name}: {lp_balance_decimal} LP tokens"
                )
            else:
                # Create new position
                position = LPPosition(
                    user_address=user_address,
                    pair_address=pair_address,
                    pool_name=pool_name,
                    lp_token_balance=lp_balance_decimal,
                    share_percentage=share_percentage,
                    liquidity_usd=liquidity_usd,
                    token0_amount=token0_amount_decimal,
                    token1_amount=token1_amount_decimal,
                    token0_symbol=token0_symbol,
                    token1_symbol=token1_symbol,
                    current_apr=current_apr,
                    pending_rewards=pending_rewards,
                )
                session.add(position)

                logger.info(
                    f"Created LP position for {user_address[:10]}... "
                    f"in {pool_name}: {lp_balance_decimal} LP tokens"
                )

            await session.commit()

        except Exception as e:
            logger.error(
                f"Error updating LP position for {user_address} "
                f"in pair {pair_address}: {e}",
                exc_info=True,
            )
            await session.rollback()

    async def _delete_lp_position(
        self,
        pair_address: str,
        user_address: str,
        session: AsyncSession,
    ) -> None:
        """
        Delete LP position (user withdrew all liquidity).

        Args:
            pair_address: Pair address
            user_address: User address
            session: Database session
        """
        from sqlalchemy import delete

        stmt = delete(LPPosition).where(
            LPPosition.user_address == user_address,
            LPPosition.pair_address == pair_address,
        )
        await session.execute(stmt)
        await session.commit()

        logger.info(
            f"Deleted LP position for {user_address[:10]}... "
            f"in pair {pair_address[:10]}..."
        )

    async def _calculate_liquidity_usd(
        self,
        token0_symbol: str,
        token1_symbol: str,
        token0_amount: Decimal,
        token1_amount: Decimal,
    ) -> Decimal:
        """
        Calculate total liquidity in USD.

        Simplified: Assumes USDC/USDP = $1.
        In production, use price oracle.

        Args:
            token0_symbol: Token0 symbol
            token1_symbol: Token1 symbol
            token0_amount: Token0 amount (in Wei)
            token1_amount: Token1 amount (in Wei)

        Returns:
            Total liquidity in USD (2 decimals)
        """
        # Stablecoin symbols
        stablecoins = {"USDC", "USDP", "USDT", "DAI"}

        # If both are stablecoins, sum them
        if token0_symbol in stablecoins and token1_symbol in stablecoins:
            total_usd = (token0_amount + token1_amount) / Decimal(10**18)
            return total_usd.quantize(Decimal("0.01"))

        # If one is stablecoin, double it (assume equal value)
        if token0_symbol in stablecoins:
            total_usd = (token0_amount * 2) / Decimal(10**18)
            return total_usd.quantize(Decimal("0.01"))

        if token1_symbol in stablecoins:
            total_usd = (token1_amount * 2) / Decimal(10**18)
            return total_usd.quantize(Decimal("0.01"))

        # Otherwise, return 0 (need price oracle)
        logger.warning(
            f"Cannot calculate USD value for {token0_symbol}/{token1_symbol} "
            f"(price oracle not configured)"
        )
        return Decimal(0)

    async def _get_pair_apr(self, pair_address: str) -> Decimal:
        """
        Get current APR for pair from GaugeController.

        Args:
            pair_address: Pair address

        Returns:
            APR as percentage (e.g., 12.5 for 12.5%)
        """
        try:
            # Query GaugeController for gauge address
            gauge_address = await self.gauge_controller.functions.gauges(
                pair_address
            ).call()

            if gauge_address == "0x0000000000000000000000000000000000000000":
                # No gauge for this pair
                return Decimal(0)

            # Query emission rate (simplified)
            # In production, calculate APR from:
            # - Gauge weight
            # - Total emission rate
            # - Pool TVL

            # Placeholder: Return 0 for now
            # TODO: Implement proper APR calculation
            return Decimal(0)

        except Exception as e:
            logger.warning(f"Error getting APR for pair {pair_address}: {e}")
            return Decimal(0)
