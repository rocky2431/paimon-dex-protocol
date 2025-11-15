"""
MINT_USDP_AMOUNT Task Verifier.

Verifies that user minted USDP reaching target amount.
"""

from datetime import datetime, UTC
from typing import Any

from app.services.rwa_task.task_verifier import BaseTaskVerifier


class MintUSDPAmountVerifier(BaseTaskVerifier):
    """Verifier for MINT_USDP_AMOUNT task type."""

    async def verify(
        self,
        address: str,
        config: dict[str, Any]
    ) -> tuple[bool, dict[str, Any]]:
        """
        Verify user minted USDP reaching target amount.

        Config format:
            {
                "type": "MINT_USDP_AMOUNT",
                "targetAmount": "10000000000000000000000",  # 10,000 USDP
                "startTime": "2025-01-01T00:00:00Z"  # Optional
            }

        Returns:
            (verified, verification_data)
        """
        # Validate address
        if not address or not self.validate_address(address):
            return (False, {"error": "Invalid address format", "address": address})

        # Validate config
        required_fields = ["targetAmount"]
        valid, error = self.validate_config(config, required_fields)
        if not valid:
            return (False, {"error": error})

        try:
            target_amount = int(config["targetAmount"])
        except (ValueError, KeyError):
            return (False, {"error": "Invalid target amount"})

        # Get USDPVault contract
        try:
            vault = self.contracts.get_contract("USDPVault")
        except Exception as e:
            return (False, {"error": f"Failed to load contract: {str(e)}"})

        # Query user's current USDP debt (minted amount)
        try:
            checksum_address = self.w3.to_checksum_address(address)
            current_debt = await vault.functions.getUserDebt(
                checksum_address
            ).call()
        except Exception as e:
            return (False, {"error": f"Failed to query USDP debt: {str(e)}"})

        # For MVP, we check current debt vs target
        # In production, we'd sum all historical Mint events

        # Simulate mint events (would query from blockchain in production)
        mint_events = await self._get_mint_events(address, current_debt)

        total_minted = sum(event["amount"] for event in mint_events)

        # Verify total minted >= target amount
        verified = total_minted >= target_amount

        verification_data = {
            "verified": verified,
            "totalMinted": str(total_minted),
            "targetAmount": str(target_amount),
            "currentDebt": str(current_debt),
            "mintEventCount": len(mint_events)
        }

        return (verified, verification_data)

    async def _get_mint_events(
        self,
        address: str,
        current_debt: int
    ) -> list[dict[str, Any]]:
        """
        Get user's mint events.

        In production, this would query Mint events from blockchain.
        For MVP, we simulate with current debt.

        Args:
            address: User wallet address
            current_debt: Current USDP debt

        Returns:
            List of mint event dicts
        """
        # Simulate mint events (in production, query from eth_getLogs)
        if current_debt == 0:
            return []

        # Simplified: assume one mint event with current debt
        return [
            {
                "timestamp": datetime.now(UTC).isoformat(),
                "amount": current_debt,
                "transactionHash": "0x..."
            }
        ]
