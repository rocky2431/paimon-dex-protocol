"""
EARN_STABILITY_POOL Task Verifier.

Verifies that user earned rewards from stability pool reaching target amount.
"""

from datetime import datetime, UTC
from typing import Any

from app.services.rwa_task.task_verifier import BaseTaskVerifier


class EarnStabilityPoolVerifier(BaseTaskVerifier):
    """Verifier for EARN_STABILITY_POOL task type."""

    async def verify(
        self,
        address: str,
        config: dict[str, Any]
    ) -> tuple[bool, dict[str, Any]]:
        """
        Verify user earned stability pool rewards reaching target amount.

        Config format:
            {
                "type": "EARN_STABILITY_POOL",
                "targetEarnings": "500000000000000000000",  # 500 PAIMON
                "startTime": "2025-01-01T00:00:00Z"  # Optional
            }

        Returns:
            (verified, verification_data)
        """
        # Validate address
        if not address or not self.validate_address(address):
            return (False, {"error": "Invalid address format", "address": address})

        # Validate config
        required_fields = ["targetEarnings"]
        valid, error = self.validate_config(config, required_fields)
        if not valid:
            return (False, {"error": error})

        try:
            target_earnings = int(config["targetEarnings"])
        except (ValueError, KeyError):
            return (False, {"error": "Invalid target earnings"})

        # Get USDPStabilityPool contract
        try:
            stability_pool = self.contracts.get_contract("USDPStabilityPool")
        except Exception as e:
            return (False, {"error": f"Failed to load contract: {str(e)}"})

        # Query user's claimable rewards
        try:
            checksum_address = self.w3.to_checksum_address(address)
            claimable_rewards = await stability_pool.functions.getClaimableReward(
                checksum_address
            ).call()
        except Exception as e:
            return (False, {"error": f"Failed to query claimable rewards: {str(e)}"})

        # For MVP, we check current claimable rewards vs target
        # In production, we'd sum all historical Claim events + current claimable

        # Simulate claim history (would query from blockchain in production)
        claim_events = await self._get_claim_events(address, claimable_rewards)

        total_earned = sum(event["amount"] for event in claim_events) + claimable_rewards

        # Verify total earned >= target amount
        verified = total_earned >= target_earnings

        verification_data = {
            "verified": verified,
            "totalEarned": str(total_earned),
            "targetEarnings": str(target_earnings),
            "claimableRewards": str(claimable_rewards),
            "claimEventCount": len(claim_events)
        }

        return (verified, verification_data)

    async def _get_claim_events(
        self,
        address: str,
        current_claimable: int
    ) -> list[dict[str, Any]]:
        """
        Get user's historical claim events from stability pool.

        In production, this would query RewardClaimed events from blockchain.
        For MVP, we simulate with empty history.

        Args:
            address: User wallet address
            current_claimable: Current claimable rewards

        Returns:
            List of claim event dicts
        """
        # Simulate claim events (in production, query from eth_getLogs)
        # For MVP, we assume no historical claims (all rewards are current claimable)

        try:
            # Get logs would be called here
            logs = await self.w3.get_logs(
                contract_address=self.contracts._get_address("USDPStabilityPool") or "0x0",
                event_signature="0x...",  # RewardClaimed event signature
                from_block="earliest",
                to_block="latest"
            )

            if not logs:
                return []

            # Parse logs and extract claim amounts
            claim_events = []
            for log in logs:
                if "args" in log:
                    amount = log["args"].get("amount", 0)
                    timestamp = log["args"].get("timestamp", 0)
                    if amount > 0:
                        claim_events.append({
                            "timestamp": datetime.fromtimestamp(timestamp, UTC).isoformat() if timestamp else datetime.now(UTC).isoformat(),
                            "amount": amount,
                            "transactionHash": log.get("transactionHash", "0x...")
                        })

            return claim_events

        except Exception:
            # If query fails, return empty (MVP fallback)
            return []
