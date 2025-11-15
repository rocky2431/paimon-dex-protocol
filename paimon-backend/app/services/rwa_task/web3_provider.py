"""
Web3 Provider for BSC blockchain interactions.

Handles connection management and blockchain data queries.
"""

from typing import Any
from web3 import Web3
from web3.providers import HTTPProvider
from web3.middleware import geth_poa_middleware


class Web3Provider:
    """Web3 connection provider for BSC."""

    def __init__(self, rpc_url: str, chain_id: int):
        """
        Initialize Web3 provider.

        Args:
            rpc_url: BSC RPC endpoint URL
            chain_id: Chain ID (97 for BSC Testnet, 56 for BSC Mainnet)
        """
        self.rpc_url = rpc_url
        self.chain_id = chain_id
        self.w3 = Web3(HTTPProvider(rpc_url))

        # Inject POA middleware for BSC (Proof of Authority)
        self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)

        # Verify connection
        if not self.w3.is_connected():
            raise ConnectionError(f"Failed to connect to RPC: {rpc_url}")

    async def get_block(self, block_identifier: int | str) -> dict[str, Any]:
        """
        Get block information.

        Args:
            block_identifier: Block number or "latest"

        Returns:
            Block data dict with timestamp, number, etc.
        """
        block = self.w3.eth.get_block(block_identifier)
        return {
            "number": block["number"],
            "timestamp": block["timestamp"],
            "hash": block["hash"].hex(),
        }

    async def get_logs(
        self,
        contract_address: str,
        event_signature: str,
        from_block: int | str,
        to_block: int | str,
        filter_params: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """
        Query contract event logs.

        Args:
            contract_address: Contract address
            event_signature: Event signature hash (e.g., keccak256("Transfer(...)"))
            from_block: Start block number or "earliest"
            to_block: End block number or "latest"
            filter_params: Additional filter parameters

        Returns:
            List of event log dicts
        """
        filter_params = filter_params or {}

        # Create filter
        event_filter = self.w3.eth.filter({
            "address": Web3.to_checksum_address(contract_address),
            "topics": [event_signature],
            "fromBlock": from_block,
            "toBlock": to_block,
            **filter_params,
        })

        # Get logs
        logs = event_filter.get_all_entries()

        # Convert to dict format
        return [
            {
                "blockNumber": log["blockNumber"],
                "transactionHash": log["transactionHash"].hex(),
                "address": log["address"],
                "topics": [topic.hex() for topic in log["topics"]],
                "data": log["data"].hex(),
            }
            for log in logs
        ]

    def is_valid_address(self, address: str) -> bool:
        """
        Validate Ethereum address format.

        Args:
            address: Address string to validate

        Returns:
            True if valid, False otherwise
        """
        return Web3.is_address(address)

    def to_checksum_address(self, address: str) -> str:
        """
        Convert address to checksum format.

        Args:
            address: Address string

        Returns:
            Checksummed address

        Raises:
            ValueError: If address is invalid
        """
        return Web3.to_checksum_address(address)
