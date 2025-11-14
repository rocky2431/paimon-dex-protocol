"""
Ethereum wallet utilities for signature verification.

Provides functions for:
- Verifying Ethereum signatures (ECDSA)
- Recovering signer addresses from signatures
- Supporting MetaMask, WalletConnect, and other standard wallets
"""

from eth_account import Account
from eth_account.messages import encode_defunct
from eth_keys.exceptions import BadSignature
from eth_utils import to_checksum_address


def verify_signature(message: str, signature: str, expected_address: str) -> bool:
    """
    Verify that a signature was created by the expected address.

    Args:
        message: Original message that was signed.
        signature: Hex-encoded signature (with or without '0x' prefix).
        expected_address: Expected signer's Ethereum address.

    Returns:
        bool: True if signature is valid and from expected address, False otherwise.

    Example:
        >>> from eth_account import Account
        >>> from eth_account.messages import encode_defunct
        >>> account = Account.create()
        >>> message = "Sign this message"
        >>> message_hash = encode_defunct(text=message)
        >>> signed = account.sign_message(message_hash)
        >>> verify_signature(message, signed.signature.hex(), account.address)
        True
    """
    try:
        # Recover signer address from signature
        recovered_address = recover_address(message, signature)

        if recovered_address is None:
            return False

        # Normalize both addresses to checksum format for comparison
        recovered_checksum = to_checksum_address(recovered_address)
        expected_checksum = to_checksum_address(expected_address)

        return recovered_checksum == expected_checksum

    except (ValueError, TypeError, AttributeError):
        # Invalid signature format, address format, or other errors
        return False


def recover_address(message: str, signature: str) -> str | None:
    """
    Recover the Ethereum address that signed a message.

    Args:
        message: Original message that was signed.
        signature: Hex-encoded signature (with or without '0x' prefix).

    Returns:
        str | None: Recovered Ethereum address in checksum format, or None if invalid.

    Example:
        >>> from eth_account import Account
        >>> from eth_account.messages import encode_defunct
        >>> account = Account.create()
        >>> message = "Test message"
        >>> message_hash = encode_defunct(text=message)
        >>> signed = account.sign_message(message_hash)
        >>> recovered = recover_address(message, signed.signature.hex())
        >>> recovered.lower() == account.address.lower()
        True
    """
    try:
        # Ensure signature has '0x' prefix
        if not signature.startswith("0x"):
            signature = "0x" + signature

        # Validate signature length (65 bytes = 130 hex chars + 2 for '0x')
        if len(signature) != 132:
            return None

        # Encode message in the same way wallets do
        message_hash = encode_defunct(text=message)

        # Recover address from signature
        recovered_address = Account.recover_message(message_hash, signature=signature)

        return recovered_address

    except (ValueError, TypeError, AttributeError, BadSignature):
        # Invalid signature format, recovery failure, or bad signature
        return None
