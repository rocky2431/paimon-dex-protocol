"""
RWA Task Verification Service.

Main service for verifying RWA task completion.
"""

from datetime import datetime, UTC
from typing import Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import TaskProgress, TaskStatus
from app.services.rwa_task.web3_provider import Web3Provider
from app.services.rwa_task.contract_manager import ContractManager
from app.services.rwa_task.cache_manager import CacheManager
from app.services.rwa_task.verifiers import (
    HoldRWAAssetVerifier,
    MaintainHealthFactorVerifier,
    MintUSDPAmountVerifier,
    ProvideLiquidityVerifier,
    EarnStabilityPoolVerifier,
)


class VerificationService:
    """Main RWA task verification service."""

    def __init__(
        self,
        w3_provider: Web3Provider,
        contract_mgr: ContractManager,
        cache_mgr: CacheManager,
        db: AsyncSession
    ):
        """
        Initialize verification service.

        Args:
            w3_provider: Web3 provider instance
            contract_mgr: Contract manager instance
            cache_mgr: Cache manager instance
            db: Database session
        """
        self.w3 = w3_provider
        self.contracts = contract_mgr
        self.cache = cache_mgr
        self.db = db

        # Register task verifiers
        self.verifiers = {
            "HOLD_RWA_ASSET": HoldRWAAssetVerifier(w3_provider, contract_mgr, cache_mgr),
            "MAINTAIN_HEALTH_FACTOR": MaintainHealthFactorVerifier(w3_provider, contract_mgr, cache_mgr),
            "MINT_USDP_AMOUNT": MintUSDPAmountVerifier(w3_provider, contract_mgr, cache_mgr),
            "PROVIDE_LIQUIDITY": ProvideLiquidityVerifier(w3_provider, contract_mgr, cache_mgr),
            "EARN_STABILITY_POOL": EarnStabilityPoolVerifier(w3_provider, contract_mgr, cache_mgr),
        }

    async def verify_task(
        self,
        address: str,
        task_id: str,
        task_config: dict[str, Any]
    ) -> tuple[bool, dict[str, Any]]:
        """
        Verify task completion for a user.

        Workflow:
        1. Check cache for previous result
        2. If cache miss, call appropriate verifier
        3. Update TaskProgress in database if verified
        4. Cache result
        5. Return (verified, verification_data)

        Args:
            address: User wallet address
            task_id: Task identifier
            task_config: Task configuration dict

        Returns:
            Tuple of (verified: bool, verification_data: dict)
        """
        # 1. Check cache
        cached_result = await self.cache.get_verification_result(address, task_id)
        if cached_result is not None:
            return (
                cached_result.get("verified", False),
                cached_result
            )

        # 2. Get task type from config
        task_type = task_config.get("type")
        if not task_type:
            return (False, {"error": "Missing task type in config"})

        # 3. Get verifier for task type
        verifier = self.verifiers.get(task_type)
        if not verifier:
            return (False, {"error": f"Unsupported task type: {task_type}"})

        # 4. Execute verification
        verified, verification_data = await verifier.verify(address, task_config)

        # 5. Update database if verified
        if verified:
            await self._update_task_progress(
                address,
                task_id,
                verification_data
            )

        # 6. Cache result
        cache_data = {
            "verified": verified,
            **verification_data
        }
        await self.cache.set_verification_result(address, task_id, cache_data)

        return (verified, verification_data)

    async def _update_task_progress(
        self,
        address: str,
        task_id: str,
        verification_data: dict[str, Any]
    ) -> None:
        """
        Update TaskProgress record on successful verification.

        Args:
            address: User wallet address
            task_id: Task identifier
            verification_data: Verification result data
        """
        try:
            # Find user's task progress record
            from app.models.user import User

            # Get user
            user_stmt = select(User).where(User.address.ilike(address))
            user_result = await self.db.execute(user_stmt)
            user = user_result.scalar_one_or_none()

            if not user:
                return

            # Get task progress
            task_stmt = select(TaskProgress).where(
                TaskProgress.user_id == user.id,
                TaskProgress.task_id == task_id
            )
            task_result = await self.db.execute(task_stmt)
            task_progress = task_result.scalar_one_or_none()

            if task_progress:
                # Update status and verification data
                task_progress.status = TaskStatus.COMPLETED
                task_progress.verification_data = verification_data
                task_progress.completed_at = datetime.now(UTC)

                await self.db.commit()

        except Exception:
            # Silently fail - don't block verification on DB errors
            await self.db.rollback()
