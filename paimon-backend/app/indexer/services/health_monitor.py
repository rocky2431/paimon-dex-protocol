"""
Health Factor Monitor Service.

Monitors user health factors and sends liquidation warning notifications.
"""

import logging
from datetime import datetime, UTC
from decimal import Decimal
from typing import Set

from web3 import Web3
from web3.contract import Contract

from app.websocket.events import send_notification

logger = logging.getLogger(__name__)


class HealthFactorMonitor:
    """
    Monitors user health factors and sends liquidation warnings.

    Checks all users with open positions and sends notification when
    health factor falls below 1.3 (liquidation threshold is 1.15).
    """

    # Thresholds
    WARNING_THRESHOLD = Decimal("1.3")  # Send warning below this
    LIQUIDATION_THRESHOLD = Decimal("1.15")  # Liquidation happens below this

    def __init__(self, w3: Web3, treasury_contract: Contract):
        """
        Initialize health factor monitor.

        Args:
            w3: Web3 instance
            treasury_contract: Treasury contract instance
        """
        self.w3 = w3
        self.treasury = treasury_contract
        self.warned_users: Set[str] = set()  # Track users already warned

    async def check_all_positions(self) -> dict:
        """
        Check health factors for all users with open positions.

        Returns:
            dict: Statistics about checked positions and warnings sent
        """
        stats = {
            "checked": 0,
            "warnings_sent": 0,
            "critical_positions": 0,
            "errors": 0,
        }

        try:
            # Get all users with positions
            # Note: In production, this should query from database or events
            # For now, we'll use a placeholder approach
            users_to_check = await self._get_users_with_positions()

            for user_address in users_to_check:
                try:
                    await self._check_user_health(user_address, stats)
                    stats["checked"] += 1
                except Exception as e:
                    logger.error(f"Error checking health for {user_address}: {e}")
                    stats["errors"] += 1

            logger.info(
                f"Health check complete: {stats['checked']} positions checked, "
                f"{stats['warnings_sent']} warnings sent, "
                f"{stats['critical_positions']} critical positions"
            )

        except Exception as e:
            logger.error(f"Health check failed: {e}")
            stats["errors"] += 1

        return stats

    async def _get_users_with_positions(self) -> list[str]:
        """
        Get list of users with open positions.

        In production, this should:
        - Query from database of known users
        - Or scan PositionOpened events from Treasury contract

        Returns:
            List of user addresses
        """
        # TODO: Implement proper user discovery
        # For now, return empty list (will be populated when events are indexed)
        return []

    async def _check_user_health(self, user_address: str, stats: dict) -> None:
        """
        Check health factor for a specific user and send warning if needed.

        Args:
            user_address: User wallet address
            stats: Statistics dict to update
        """
        # Get health factor from contract
        health_factor_raw = self.treasury.functions.getHealthFactor(
            Web3.to_checksum_address(user_address)
        ).call()

        # Convert to Decimal (health factor is returned with 18 decimals)
        health_factor = Decimal(health_factor_raw) / Decimal(10**18)

        # Check if health factor is below warning threshold
        if health_factor < self.WARNING_THRESHOLD:
            # Classify as critical if below liquidation threshold
            is_critical = health_factor < self.LIQUIDATION_THRESHOLD
            if is_critical:
                stats["critical_positions"] += 1

            # Send notification (only once per user until health improves)
            if user_address not in self.warned_users:
                await self._send_liquidation_warning(
                    user_address,
                    health_factor,
                    is_critical
                )
                self.warned_users.add(user_address)
                stats["warnings_sent"] += 1
        else:
            # Health factor improved - remove from warned set
            if user_address in self.warned_users:
                self.warned_users.remove(user_address)
                logger.info(f"Health factor recovered for {user_address}: {health_factor}")

    async def _send_liquidation_warning(
        self,
        user_address: str,
        health_factor: Decimal,
        is_critical: bool
    ) -> None:
        """
        Send liquidation warning notification to user.

        Args:
            user_address: User wallet address
            health_factor: Current health factor
            is_critical: True if health factor below liquidation threshold
        """
        # Determine severity and message
        if is_critical:
            title = "🚨 Critical: Liquidation Risk"
            message = (
                f"Your position is at risk of liquidation! "
                f"Health factor: {health_factor:.4f} (below {self.LIQUIDATION_THRESHOLD})"
            )
            severity = "critical"
        else:
            title = "⚠️ Warning: Low Health Factor"
            message = (
                f"Your health factor is low: {health_factor:.4f}. "
                f"Liquidation occurs below {self.LIQUIDATION_THRESHOLD}."
            )
            severity = "warning"

        # Build notification payload
        notification = {
            "type": "liquidation_warning",
            "title": title,
            "message": message,
            "data": {
                "health_factor": str(health_factor),
                "warning_threshold": str(self.WARNING_THRESHOLD),
                "liquidation_threshold": str(self.LIQUIDATION_THRESHOLD),
                "severity": severity,
                "suggested_actions": self._get_suggested_actions(is_critical),
            },
            "timestamp": datetime.now(UTC).isoformat(),
        }

        # Send via Socket.IO
        try:
            await send_notification(user_address, notification)
            logger.info(
                f"Sent {severity} liquidation warning to {user_address[:10]}... "
                f"(health factor: {health_factor:.4f})"
            )
        except Exception as e:
            logger.error(f"Failed to send liquidation warning to {user_address}: {e}")

    def _get_suggested_actions(self, is_critical: bool) -> list[str]:
        """
        Get suggested actions based on health factor severity.

        Args:
            is_critical: True if position is critical

        Returns:
            List of suggested action strings
        """
        if is_critical:
            return [
                "🔴 URGENT: Add more collateral immediately",
                "🔴 URGENT: Repay part of your USDP debt",
                "⚠️ Your position may be liquidated at any moment",
                "⚠️ You will lose ~10% of collateral to liquidation penalty",
            ]
        else:
            return [
                "💰 Add more RWA collateral to increase health factor",
                "💵 Repay some USDP debt to reduce risk",
                "📊 Monitor your position regularly",
                "⏰ Act before health factor drops below 1.15",
            ]
