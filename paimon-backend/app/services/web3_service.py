"""
Web3 service for blockchain interactions.

Handles interactions with esPAIMON contract for points redemption.
"""

import logging
from decimal import Decimal
from typing import Optional

from web3 import Web3
from web3.contract import Contract
from web3.exceptions import ContractLogicError

from app.core.config import settings

logger = logging.getLogger(__name__)


class Web3Service:
    """Service for Web3/blockchain interactions."""

    def __init__(self):
        """Initialize Web3 service with RPC connection."""
        self.w3 = Web3(Web3.HTTPProvider(settings.BSC_RPC_URL))

        if not self.w3.is_connected():
            raise ConnectionError("Failed to connect to BSC RPC")

        # Load private key for transaction signing
        self.account = self.w3.eth.account.from_key(settings.REDEMPTION_PRIVATE_KEY)

        # Load esPAIMON contract
        self.espaimon_contract: Contract = self.w3.eth.contract(
            address=Web3.to_checksum_address(settings.ESPAIMON_CONTRACT_ADDRESS),
            abi=settings.ESPAIMON_ABI
        )

        logger.info(
            f"Web3Service initialized: network={self.w3.eth.chain_id}, "
            f"account={self.account.address}"
        )

    async def vest_espaimon(
        self,
        user_address: str,
        amount_wei: int
    ) -> tuple[str, int]:
        """
        Call esPAIMON.vestFor() to distribute vesting tokens.

        Args:
            user_address: User's wallet address
            amount_wei: Amount in Wei (18 decimals)

        Returns:
            Tuple of (transaction_hash, block_number)

        Raises:
            ValueError: If transaction fails validation
            ContractLogicError: If contract execution fails
        """
        try:
            # Validate inputs
            checksum_address = Web3.to_checksum_address(user_address)
            if amount_wei <= 0:
                raise ValueError(f"Invalid amount: {amount_wei}")

            # Build transaction
            nonce = self.w3.eth.get_transaction_count(self.account.address)

            # Estimate gas
            try:
                gas_estimate = self.espaimon_contract.functions.vestFor(
                    checksum_address,
                    amount_wei
                ).estimate_gas({'from': self.account.address})

                # Add 20% buffer to gas estimate
                gas_limit = int(gas_estimate * 1.2)
            except ContractLogicError as e:
                logger.error(f"Gas estimation failed: {e}")
                raise ValueError(f"Transaction would fail: {str(e)}")

            # Get current gas price
            gas_price = self.w3.eth.gas_price

            # Build transaction
            transaction = self.espaimon_contract.functions.vestFor(
                checksum_address,
                amount_wei
            ).build_transaction({
                'from': self.account.address,
                'nonce': nonce,
                'gas': gas_limit,
                'gasPrice': gas_price,
            })

            # Sign transaction
            signed_txn = self.w3.eth.account.sign_transaction(
                transaction,
                private_key=settings.REDEMPTION_PRIVATE_KEY
            )

            # Send transaction
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            tx_hash_hex = tx_hash.hex()

            logger.info(
                f"Transaction sent: hash={tx_hash_hex}, "
                f"user={user_address}, amount={amount_wei}"
            )

            # Wait for transaction receipt (with timeout)
            receipt = self.w3.eth.wait_for_transaction_receipt(
                tx_hash,
                timeout=120
            )

            if receipt['status'] != 1:
                raise ValueError(f"Transaction failed: {tx_hash_hex}")

            logger.info(
                f"Transaction confirmed: hash={tx_hash_hex}, "
                f"block={receipt['blockNumber']}, gas_used={receipt['gasUsed']}"
            )

            return tx_hash_hex, receipt['blockNumber']

        except ContractLogicError as e:
            logger.error(f"Contract error in vest_espaimon: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in vest_espaimon: {e}")
            raise

    async def get_vesting_balance(self, user_address: str) -> Decimal:
        """
        Query user's vesting esPAIMON balance.

        Args:
            user_address: User's wallet address

        Returns:
            Vesting balance in esPAIMON (converted from Wei)
        """
        try:
            checksum_address = Web3.to_checksum_address(user_address)

            # Call balanceOf() function
            balance_wei = self.espaimon_contract.functions.balanceOf(
                checksum_address
            ).call()

            # Convert Wei to esPAIMON (18 decimals)
            balance = Decimal(balance_wei) / Decimal(10 ** 18)

            return balance

        except Exception as e:
            logger.error(f"Failed to get vesting balance: {e}")
            raise

    def get_transaction_status(self, tx_hash: str) -> Optional[dict]:
        """
        Get transaction receipt and status.

        Args:
            tx_hash: Transaction hash (0x...)

        Returns:
            Transaction receipt dict or None if not found
        """
        try:
            receipt = self.w3.eth.get_transaction_receipt(tx_hash)
            return {
                'status': receipt['status'],  # 1 = success, 0 = failed
                'block_number': receipt['blockNumber'],
                'gas_used': receipt['gasUsed'],
            }
        except Exception as e:
            logger.warning(f"Transaction {tx_hash} not found: {e}")
            return None


# Singleton instance
web3_service: Optional[Web3Service] = None


def get_web3_service() -> Web3Service:
    """
    Get or create Web3Service singleton instance.

    Returns:
        Web3Service instance
    """
    global web3_service

    if web3_service is None:
        web3_service = Web3Service()

    return web3_service
