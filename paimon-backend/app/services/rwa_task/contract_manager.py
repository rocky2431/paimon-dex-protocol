"""
Contract Manager for loading and managing smart contract instances.

Handles ABI loading and contract instance creation.
"""

import json
from pathlib import Path
from typing import Any
from web3 import Web3
from web3.contract import Contract


class ContractManager:
    """Manages smart contract instances and ABIs."""

    def __init__(self, w3: Web3, addresses: dict[str, Any]):
        """
        Initialize contract manager.

        Args:
            w3: Web3 instance
            addresses: Contract addresses dict from deployments
        """
        self.w3 = w3
        self.addresses = addresses
        self.contracts: dict[str, Contract] = {}
        self.abis: dict[str, list] = {}

        # Path to compiled contracts
        self.contracts_path = Path(__file__).parent.parent.parent.parent.parent / "paimon-rwa-contracts" / "out"

    def get_contract(self, name: str) -> Contract:
        """
        Get contract instance (lazy loading).

        Args:
            name: Contract name (e.g., "Treasury", "USDPVault")

        Returns:
            Contract instance

        Raises:
            ValueError: If contract not found in addresses
            FileNotFoundError: If ABI file not found
        """
        # Return cached instance if exists
        if name in self.contracts:
            return self.contracts[name]

        # Get contract address
        address = self._get_address(name)
        if not address:
            raise ValueError(f"Contract address not found: {name}")

        # Load ABI
        abi = self.load_abi(name)

        # Create contract instance
        contract = self.w3.eth.contract(
            address=Web3.to_checksum_address(address),
            abi=abi
        )

        # Cache and return
        self.contracts[name] = contract
        return contract

    def load_abi(self, contract_name: str) -> list:
        """
        Load contract ABI from compiled artifacts.

        Args:
            contract_name: Contract name (e.g., "Treasury")

        Returns:
            ABI list

        Raises:
            FileNotFoundError: If ABI file not found
        """
        # Return cached ABI if exists
        if contract_name in self.abis:
            return self.abis[contract_name]

        # Construct ABI file path
        abi_file = self.contracts_path / f"{contract_name}.sol" / f"{contract_name}.json"

        if not abi_file.exists():
            raise FileNotFoundError(f"ABI file not found: {abi_file}")

        # Load ABI from JSON
        with open(abi_file, "r") as f:
            artifact = json.load(f)
            abi = artifact.get("abi", [])

        # Cache and return
        self.abis[contract_name] = abi
        return abi

    def _get_address(self, contract_name: str) -> str | None:
        """
        Get contract address from deployment addresses.

        Args:
            contract_name: Contract name

        Returns:
            Contract address or None if not found
        """
        # Check in core contracts
        if "core" in self.addresses and contract_name in self.addresses["core"]:
            return self.addresses["core"][contract_name]

        # Check in treasury contracts
        if "treasury" in self.addresses and contract_name in self.addresses["treasury"]:
            return self.addresses["treasury"][contract_name]

        # Check in governance contracts
        if "governance" in self.addresses and contract_name in self.addresses["governance"]:
            return self.addresses["governance"][contract_name]

        # Check in DEX contracts
        if "dex" in self.addresses and contract_name in self.addresses["dex"]:
            return self.addresses["dex"][contract_name]

        return None
