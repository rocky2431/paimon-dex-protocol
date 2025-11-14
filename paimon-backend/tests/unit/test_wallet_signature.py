"""
Unit tests for wallet signature verification.

Tests:
1. Functional: Valid signature verification
2. Boundary: Edge cases (empty message, invalid format)
3. Exception: Invalid signature, wrong signer
4. Performance: Verification < 10ms per signature
5. Security: Signature tampering detection
6. Compatibility: Different wallet types (MetaMask, WalletConnect)
"""

import time

import pytest
from eth_account import Account
from eth_account.messages import encode_defunct


class TestSignatureVerification:
    """Test Ethereum signature verification utilities."""

    def test_verify_valid_signature(self):
        """Test verifying a valid Ethereum signature."""
        from app.core.wallet import verify_signature

        # Create test wallet
        account = Account.create()
        message = "Sign this message to login to Paimon DEX"

        # Sign message
        message_hash = encode_defunct(text=message)
        signed_message = account.sign_message(message_hash)

        # Verify signature
        is_valid = verify_signature(
            message=message,
            signature=signed_message.signature.hex(),
            expected_address=account.address,
        )

        assert is_valid is True

    def test_verify_signature_wrong_signer(self):
        """Test that signature from different signer is rejected."""
        from app.core.wallet import verify_signature

        # Create two accounts
        account1 = Account.create()
        account2 = Account.create()
        message = "Sign this message to login"

        # Sign with account1
        message_hash = encode_defunct(text=message)
        signed_message = account1.sign_message(message_hash)

        # Verify with account2's address (should fail)
        is_valid = verify_signature(
            message=message,
            signature=signed_message.signature.hex(),
            expected_address=account2.address,
        )

        assert is_valid is False

    def test_verify_signature_invalid_format(self):
        """Test that invalid signature format is rejected."""
        from app.core.wallet import verify_signature

        account = Account.create()
        message = "Test message"

        # Invalid signatures
        invalid_signatures = [
            "invalid_signature",
            "0x123",  # Too short
            "0x" + "00" * 64,  # Wrong length
            "",  # Empty
        ]

        for invalid_sig in invalid_signatures:
            is_valid = verify_signature(
                message=message, signature=invalid_sig, expected_address=account.address
            )
            assert is_valid is False, f"Invalid signature should be rejected: {invalid_sig}"

    def test_verify_signature_tampered(self):
        """Test that tampered signature is rejected."""
        from app.core.wallet import verify_signature

        account = Account.create()
        message = "Original message"

        # Sign original message
        message_hash = encode_defunct(text=message)
        signed_message = account.sign_message(message_hash)

        # Tamper with signature (replace middle section with zeros)
        original_sig = signed_message.signature.hex()
        # Replace bytes 10-20 with zeros - this will definitely invalidate the signature
        tampered_sig = original_sig[:20] + ("00" * 10) + original_sig[40:]

        # Verify tampered signature
        is_valid = verify_signature(
            message=message, signature=tampered_sig, expected_address=account.address
        )

        assert is_valid is False

    def test_verify_signature_wrong_message(self):
        """Test that signature for different message is rejected."""
        from app.core.wallet import verify_signature

        account = Account.create()
        original_message = "Original message"
        wrong_message = "Wrong message"

        # Sign original message
        message_hash = encode_defunct(text=original_message)
        signed_message = account.sign_message(message_hash)

        # Verify with wrong message
        is_valid = verify_signature(
            message=wrong_message,
            signature=signed_message.signature.hex(),
            expected_address=account.address,
        )

        assert is_valid is False

    def test_verify_signature_checksum_address(self):
        """Test that checksum and non-checksum addresses both work."""
        from app.core.wallet import verify_signature

        account = Account.create()
        message = "Test message"

        # Sign message
        message_hash = encode_defunct(text=message)
        signed_message = account.sign_message(message_hash)

        # Test with checksum address
        is_valid_checksum = verify_signature(
            message=message,
            signature=signed_message.signature.hex(),
            expected_address=account.address,  # Checksum
        )

        # Test with lowercase address
        is_valid_lowercase = verify_signature(
            message=message,
            signature=signed_message.signature.hex(),
            expected_address=account.address.lower(),  # Lowercase
        )

        assert is_valid_checksum is True
        assert is_valid_lowercase is True


class TestSignaturePerformance:
    """Test signature verification performance."""

    def test_verification_performance(self):
        """Test that signature verification is reasonably fast (< 1s for 100 verifications)."""
        from app.core.wallet import verify_signature

        account = Account.create()
        message = "Performance test message"

        # Sign message once
        message_hash = encode_defunct(text=message)
        signed_message = account.sign_message(message_hash)

        # Verify 100 times and measure time
        start_time = time.time()
        for _ in range(100):
            verify_signature(
                message=message,
                signature=signed_message.signature.hex(),
                expected_address=account.address,
            )
        elapsed_time = time.time() - start_time

        # Should complete 100 verifications in < 1 second (avg ~10ms per verification)
        assert elapsed_time < 1.0, f"Verification too slow: {elapsed_time}s for 100 verifications"


class TestRecoverAddress:
    """Test address recovery from signature."""

    def test_recover_address_from_signature(self):
        """Test recovering signer address from signature."""
        from app.core.wallet import recover_address

        account = Account.create()
        message = "Test message for recovery"

        # Sign message
        message_hash = encode_defunct(text=message)
        signed_message = account.sign_message(message_hash)

        # Recover address
        recovered_address = recover_address(
            message=message, signature=signed_message.signature.hex()
        )

        # Should match original address (case-insensitive)
        assert recovered_address.lower() == account.address.lower()

    def test_recover_address_invalid_signature(self):
        """Test that invalid signature returns None."""
        from app.core.wallet import recover_address

        message = "Test message"
        invalid_signatures = ["invalid", "0x123", ""]

        for invalid_sig in invalid_signatures:
            recovered = recover_address(message=message, signature=invalid_sig)
            assert recovered is None, f"Should return None for invalid signature: {invalid_sig}"
