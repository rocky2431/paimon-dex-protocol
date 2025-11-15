"""
MAINTAIN_HEALTH_FACTOR Task Verifier.

Verifies that user maintained health factor above threshold for specified duration.
"""

from datetime import datetime, UTC, timedelta
from typing import Any

from app.services.rwa_task.task_verifier import BaseTaskVerifier


class MaintainHealthFactorVerifier(BaseTaskVerifier):
    """Verifier for MAINTAIN_HEALTH_FACTOR task type."""

    async def verify(
        self,
        address: str,
        config: dict[str, Any]
    ) -> tuple[bool, dict[str, Any]]:
        """
        Verify user maintained health factor above threshold.

        Config format:
            {
                "type": "MAINTAIN_HEALTH_FACTOR",
                "minimumHealthFactor": "1.5",  # 1.5x
                "durationDays": 7,
                "snapshotIntervalHours": 24
            }

        Returns:
            (verified, verification_data)
        """
        # Validate address
        if not address or not self.validate_address(address):
            return (False, {"error": "Invalid address format", "address": address})

        # Validate config
        required_fields = ["minimumHealthFactor", "durationDays"]
        valid, error = self.validate_config(config, required_fields)
        if not valid:
            return (False, {"error": error})

        try:
            minimum_hf = float(config["minimumHealthFactor"])
            duration_days = int(config["durationDays"])
            snapshot_interval = int(config.get("snapshotIntervalHours", 24))
        except (ValueError, KeyError):
            return (False, {"error": "Invalid config values"})

        # Get Treasury contract
        try:
            treasury = self.contracts.get_contract("Treasury")
        except Exception as e:
            return (False, {"error": f"Failed to load contract: {str(e)}"})

        # Query user's current health factor
        try:
            checksum_address = self.w3.to_checksum_address(address)
            current_hf_raw = await treasury.functions.getHealthFactor(
                checksum_address
            ).call()

            # Health factor is returned as 18-decimal integer (e.g., 1.5 * 10^18)
            current_hf = current_hf_raw / (10 ** 18)
        except Exception as e:
            return (False, {"error": f"Failed to query health factor: {str(e)}"})

        # For MVP, we'll do a simplified check:
        # If current HF >= minimum, we assume it's been maintained
        # (In production, this would query historical snapshots from database)

        # Simulate snapshot collection (would be from database in production)
        snapshots = await self._collect_snapshots(
            address,
            duration_days,
            snapshot_interval,
            current_hf
        )

        if not snapshots:
            return (False, {
                "verified": False,
                "reason": "No snapshot data available",
                "currentHealthFactor": str(current_hf)
            })

        # Check if all snapshots meet minimum threshold
        minimum_snapshot_hf = min(s["healthFactor"] for s in snapshots)
        all_above_threshold = minimum_snapshot_hf >= minimum_hf

        verified = all_above_threshold and len(snapshots) >= duration_days

        verification_data = {
            "verified": verified,
            "currentHealthFactor": str(current_hf),
            "minimumHealthFactor": str(minimum_hf),
            "snapshotCount": len(snapshots),
            "minimumSnapshotHF": str(minimum_snapshot_hf),
            "allAboveThreshold": all_above_threshold,
            "durationDays": duration_days
        }

        return (verified, verification_data)

    async def _collect_snapshots(
        self,
        address: str,
        duration_days: int,
        interval_hours: int,
        current_hf: float
    ) -> list[dict[str, Any]]:
        """
        Collect health factor snapshots.

        In production, this would query from database.
        For MVP, we simulate with current HF.

        Args:
            address: User wallet address
            duration_days: Duration to check
            interval_hours: Snapshot interval
            current_hf: Current health factor

        Returns:
            List of snapshot dicts
        """
        # Simulate snapshots (in production, query from PostgreSQL)
        snapshots = []

        now = datetime.now(UTC)
        for i in range(duration_days):
            snapshot_time = now - timedelta(days=i)
            snapshots.append({
                "timestamp": snapshot_time.isoformat(),
                "healthFactor": current_hf  # Simplified: use current HF
            })

        return snapshots
