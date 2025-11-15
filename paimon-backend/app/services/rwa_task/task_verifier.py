"""
Base Task Verifier abstract class.

All task verifiers must inherit from this class.
"""

from abc import ABC, abstractmethod
from typing import Any

from app.services.rwa_task.web3_provider import Web3Provider
from app.services.rwa_task.contract_manager import ContractManager
from app.services.rwa_task.cache_manager import CacheManager


class BaseTaskVerifier(ABC):
    """Base class for all task verifiers."""

    def __init__(
        self,
        w3_provider: Web3Provider,
        contract_mgr: ContractManager,
        cache_mgr: CacheManager
    ):
        """
        Initialize task verifier.

        Args:
            w3_provider: Web3 provider instance
            contract_mgr: Contract manager instance
            cache_mgr: Cache manager instance
        """
        self.w3 = w3_provider
        self.contracts = contract_mgr
        self.cache = cache_mgr

    @abstractmethod
    async def verify(
        self,
        address: str,
        config: dict[str, Any]
    ) -> tuple[bool, dict[str, Any]]:
        """
        Verify task completion for a user.

        Args:
            address: User wallet address
            config: Task configuration dict

        Returns:
            Tuple of (verified: bool, verification_data: dict)

        Example verification_data:
            {
                "verified": True,
                "currentBalance": "2000000000000000000000",
                "holdDuration": 35,
                "firstDepositTime": "2025-01-01T00:00:00Z"
            }
        """
        pass

    def validate_address(self, address: str) -> bool:
        """
        Validate Ethereum address format.

        Args:
            address: Address to validate

        Returns:
            True if valid, False otherwise
        """
        # Check if address is non-empty and has correct length (42 chars: 0x + 40 hex digits)
        if not address or len(address) != 42:
            return False

        # Check if it's a valid Ethereum address
        return self.w3.is_valid_address(address)

    def validate_config(
        self,
        config: dict[str, Any],
        required_fields: list[str]
    ) -> tuple[bool, str | None]:
        """
        Validate task configuration.

        Args:
            config: Configuration dict
            required_fields: List of required field names

        Returns:
            Tuple of (valid: bool, error_message: str | None)
        """
        for field in required_fields:
            if field not in config:
                return (False, f"Missing required field: {field}")

        return (True, None)
