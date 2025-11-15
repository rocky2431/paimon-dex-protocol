"""
Vault event handler for collateral and debt position indexing.

Processes Deposit, Withdraw, Borrow, and Repay events from USDPVault.
"""

import logging
from decimal import Decimal
from typing import Optional

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from web3 import AsyncWeb3
from web3.contract import AsyncContract
from web3.types import EventData

from app.models.indexer import VaultPosition

logger = logging.getLogger(__name__)


class VaultEventHandler:
    """
    Handler for USDPVault events.

    Processes collateral and debt events, updates position cache with risk metrics.
    """

    def __init__(
        self,
        w3: AsyncWeb3,
        vault_contract: AsyncContract,
        price_oracle: Optional[AsyncContract] = None,
    ):
        """
        Initialize Vault event handler.

        Args:
            w3: Web3 instance
            vault_contract: USDPVault contract
            price_oracle: Optional price oracle for collateral valuation
        """
        self.w3 = w3
        self.vault = vault_contract
        self.price_oracle = price_oracle

        # Vault parameters (fetch once during init)
        self.ltv_ratios: dict[str, Decimal] = {}  # {collateral_address: ltv_ratio}
        self.liquidation_thresholds: dict[str, Decimal] = {}

    async def handle_deposit(
        self,
        event: EventData,
        session: AsyncSession,
    ) -> None:
        """
        Handle Deposit event (collateral deposited).

        Event signature: Deposit(address indexed user, address indexed collateral, uint256 amount)

        Args:
            event: Deposit event data
            session: Database session
        """
        user_address = event["args"]["user"]
        collateral_address = event["args"]["collateral"]
        amount = event["args"]["amount"]

        logger.info(
            f"Processing Deposit event for {user_address[:10]}... "
            f"collateral={collateral_address[:10]}... amount={amount}"
        )

        await self._update_vault_position(
            user_address, collateral_address, session
        )

    async def handle_withdraw(
        self,
        event: EventData,
        session: AsyncSession,
    ) -> None:
        """
        Handle Withdraw event (collateral withdrawn).

        Event signature: Withdraw(address indexed user, address indexed collateral, uint256 amount)

        Args:
            event: Withdraw event data
            session: Database session
        """
        user_address = event["args"]["user"]
        collateral_address = event["args"]["collateral"]
        amount = event["args"]["amount"]

        logger.info(
            f"Processing Withdraw event for {user_address[:10]}... "
            f"collateral={collateral_address[:10]}... amount={amount}"
        )

        await self._update_vault_position(
            user_address, collateral_address, session
        )

    async def handle_borrow(
        self,
        event: EventData,
        session: AsyncSession,
    ) -> None:
        """
        Handle Borrow event (USDP borrowed against collateral).

        Event signature: Borrow(address indexed user, uint256 amount)

        Args:
            event: Borrow event data
            session: Database session
        """
        user_address = event["args"]["user"]
        amount = event["args"]["amount"]

        logger.info(
            f"Processing Borrow event for {user_address[:10]}... "
            f"amount={amount}"
        )

        # Borrow affects all collaterals, update all positions
        await self._update_all_user_positions(user_address, session)

    async def handle_repay(
        self,
        event: EventData,
        session: AsyncSession,
    ) -> None:
        """
        Handle Repay event (USDP debt repaid).

        Event signature: Repay(address indexed user, uint256 amount)

        Args:
            event: Repay event data
            session: Database session
        """
        user_address = event["args"]["user"]
        amount = event["args"]["amount"]

        logger.info(
            f"Processing Repay event for {user_address[:10]}... "
            f"amount={amount}"
        )

        # Repay affects all collaterals, update all positions
        await self._update_all_user_positions(user_address, session)

    async def _update_vault_position(
        self,
        user_address: str,
        collateral_address: str,
        session: AsyncSession,
    ) -> None:
        """
        Update vault position for specific collateral.

        Args:
            user_address: User address
            collateral_address: Collateral token address
            session: Database session
        """
        try:
            # Query on-chain collateral data
            collateral_amount = await self.vault.functions.getCollateralBalance(
                user_address, collateral_address
            ).call()

            # If no collateral, delete position
            if collateral_amount == 0:
                await self._delete_vault_position(
                    user_address, collateral_address, session
                )
                return

            # Get collateral metadata
            asset_name = await self._get_asset_symbol(collateral_address)

            # Get collateral price
            collateral_price = await self._get_collateral_price(collateral_address)

            # Calculate collateral value in USD
            # Assume 18 decimals for collateral
            collateral_value_usd = (
                Decimal(collateral_amount) / Decimal(10**18) * collateral_price
            )

            # Get user total debt
            total_debt = await self.vault.functions.getDebt(user_address).call()
            debt_amount = Decimal(total_debt) / Decimal(10**18)

            # Get LTV ratio and liquidation threshold
            ltv_ratio = await self._get_ltv_ratio(collateral_address)
            liquidation_threshold = await self._get_liquidation_threshold(
                collateral_address
            )

            # Calculate health factor
            # Health Factor = (Collateral Value * Liquidation Threshold) / Total Debt
            # If health factor < 1.0, position can be liquidated
            if debt_amount > 0:
                health_factor = (
                    collateral_value_usd * liquidation_threshold / debt_amount
                )
            else:
                health_factor = Decimal("999999")  # No debt = infinite health

            # Calculate liquidation price
            # Liquidation Price = (Total Debt) / (Collateral Amount * Liquidation Threshold)
            if collateral_amount > 0:
                liquidation_price = (
                    debt_amount * Decimal(10**18) /
                    (Decimal(collateral_amount) * liquidation_threshold)
                )
            else:
                liquidation_price = Decimal(0)

            # Update or create position
            stmt = select(VaultPosition).where(
                VaultPosition.user_address == user_address,
                VaultPosition.collateral_address == collateral_address,
            )
            result = await session.execute(stmt)
            position = result.scalar_one_or_none()

            # Convert amounts
            collateral_amount_decimal = Decimal(collateral_amount) / Decimal(10**18)

            if position:
                # Update existing position
                position.collateral_amount = collateral_amount_decimal
                position.collateral_value_usd = collateral_value_usd.quantize(
                    Decimal("0.01")
                )
                position.debt_amount = debt_amount
                position.ltv_ratio = ltv_ratio
                position.health_factor = health_factor
                position.liquidation_price = liquidation_price.quantize(
                    Decimal("0.00000001")
                )

                logger.info(
                    f"Updated Vault position for {user_address[:10]}... "
                    f"{asset_name}: collateral=${collateral_value_usd:.2f} "
                    f"debt=${debt_amount:.2f} health={health_factor:.2f}"
                )
            else:
                # Create new position
                position = VaultPosition(
                    user_address=user_address,
                    collateral_address=collateral_address,
                    asset_name=asset_name,
                    collateral_amount=collateral_amount_decimal,
                    collateral_value_usd=collateral_value_usd.quantize(
                        Decimal("0.01")
                    ),
                    debt_amount=debt_amount,
                    ltv_ratio=ltv_ratio,
                    health_factor=health_factor,
                    liquidation_price=liquidation_price.quantize(
                        Decimal("0.00000001")
                    ),
                )
                session.add(position)

                logger.info(
                    f"Created Vault position for {user_address[:10]}... "
                    f"{asset_name}: collateral=${collateral_value_usd:.2f} "
                    f"debt=${debt_amount:.2f} health={health_factor:.2f}"
                )

            await session.commit()

        except Exception as e:
            logger.error(
                f"Error updating Vault position for {user_address} "
                f"collateral {collateral_address}: {e}",
                exc_info=True,
            )
            await session.rollback()

    async def _update_all_user_positions(
        self,
        user_address: str,
        session: AsyncSession,
    ) -> None:
        """
        Update all vault positions for user (after borrow/repay).

        Args:
            user_address: User address
            session: Database session
        """
        # Get all collaterals for this user
        stmt = select(VaultPosition).where(
            VaultPosition.user_address == user_address
        )
        result = await session.execute(stmt)
        positions = result.scalars().all()

        for position in positions:
            await self._update_vault_position(
                user_address, position.collateral_address, session
            )

    async def _delete_vault_position(
        self,
        user_address: str,
        collateral_address: str,
        session: AsyncSession,
    ) -> None:
        """
        Delete vault position (user withdrew all collateral).

        Args:
            user_address: User address
            collateral_address: Collateral address
            session: Database session
        """
        stmt = delete(VaultPosition).where(
            VaultPosition.user_address == user_address,
            VaultPosition.collateral_address == collateral_address,
        )
        await session.execute(stmt)
        await session.commit()

        logger.info(
            f"Deleted Vault position for {user_address[:10]}... "
            f"collateral {collateral_address[:10]}..."
        )

    async def _get_asset_symbol(self, collateral_address: str) -> str:
        """
        Get asset symbol for collateral.

        Args:
            collateral_address: Collateral token address

        Returns:
            Asset symbol (e.g., "HYD", "USDC")
        """
        try:
            erc20_abi = [
                {
                    "constant": True,
                    "inputs": [],
                    "name": "symbol",
                    "outputs": [{"name": "", "type": "string"}],
                    "type": "function",
                }
            ]

            token = self.w3.eth.contract(address=collateral_address, abi=erc20_abi)
            symbol = await token.functions.symbol().call()
            return symbol
        except Exception as e:
            logger.warning(
                f"Error getting symbol for {collateral_address}: {e}"
            )
            return f"Token-{collateral_address[:8]}"

    async def _get_collateral_price(self, collateral_address: str) -> Decimal:
        """
        Get collateral price in USD.

        Args:
            collateral_address: Collateral token address

        Returns:
            Price in USD (e.g., 1.5 for $1.50)
        """
        # TODO: Implement price oracle integration
        # For now, return placeholder based on asset

        # Simplified: HYD = $1, others = $1
        return Decimal("1.0")

    async def _get_ltv_ratio(self, collateral_address: str) -> Decimal:
        """
        Get LTV ratio for collateral.

        Args:
            collateral_address: Collateral address

        Returns:
            LTV ratio (e.g., 0.80 for 80%)
        """
        # Cache LTV ratios
        if collateral_address in self.ltv_ratios:
            return self.ltv_ratios[collateral_address]

        try:
            # Query from vault contract
            ltv_bps = await self.vault.functions.collateralLTVRatio(
                collateral_address
            ).call()
            ltv_ratio = Decimal(ltv_bps) / Decimal(10000)

            self.ltv_ratios[collateral_address] = ltv_ratio
            return ltv_ratio
        except Exception as e:
            logger.warning(
                f"Error getting LTV for {collateral_address}: {e}"
            )
            return Decimal("0.80")  # Default 80%

    async def _get_liquidation_threshold(self, collateral_address: str) -> Decimal:
        """
        Get liquidation threshold for collateral.

        Args:
            collateral_address: Collateral address

        Returns:
            Liquidation threshold (e.g., 0.85 for 85%)
        """
        # Cache liquidation thresholds
        if collateral_address in self.liquidation_thresholds:
            return self.liquidation_thresholds[collateral_address]

        try:
            # Query from vault contract
            threshold_bps = await self.vault.functions.liquidationThreshold(
                collateral_address
            ).call()
            threshold = Decimal(threshold_bps) / Decimal(10000)

            self.liquidation_thresholds[collateral_address] = threshold
            return threshold
        except Exception as e:
            logger.warning(
                f"Error getting liquidation threshold for {collateral_address}: {e}"
            )
            return Decimal("0.85")  # Default 85%
