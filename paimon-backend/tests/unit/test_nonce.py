"""
Unit tests for nonce management system.

Tests:
1. Functional: Nonce generation and validation
2. Boundary: Nonce format, expiration edge cases
3. Exception: Invalid nonce, double use, expired nonce
4. Performance: Nonce operations < 50ms
5. Security: Nonce uniqueness, cannot reuse
6. Compatibility: Different storage backends
"""

import time

import pytest


class TestNonceGeneration:
    """Test nonce generation."""

    @pytest.mark.asyncio
    async def test_generate_nonce_success(self):
        """Test generating a valid nonce."""
        from app.core.nonce import generate_nonce

        # Generate nonce for an address
        address = "0x1234567890abcdef1234567890abcdef12345678"
        nonce = await generate_nonce(address)

        assert nonce is not None
        assert isinstance(nonce, str)
        assert len(nonce) > 0
        # Nonce should be a hex string (UUID format typically 32+ chars)
        assert len(nonce) >= 32

    @pytest.mark.asyncio
    async def test_generate_different_nonces(self):
        """Test that different calls generate different nonces."""
        from app.core.nonce import generate_nonce

        address = "0x1234567890abcdef1234567890abcdef12345678"

        nonce1 = await generate_nonce(address)
        nonce2 = await generate_nonce(address)
        nonce3 = await generate_nonce(address)

        # All nonces should be unique
        assert nonce1 != nonce2
        assert nonce2 != nonce3
        assert nonce1 != nonce3

    @pytest.mark.asyncio
    async def test_generate_nonce_for_different_addresses(self):
        """Test generating nonces for different addresses."""
        from app.core.nonce import generate_nonce

        address1 = "0x1111111111111111111111111111111111111111"
        address2 = "0x2222222222222222222222222222222222222222"

        nonce1 = await generate_nonce(address1)
        nonce2 = await generate_nonce(address2)

        # Nonces for different addresses should be different
        assert nonce1 != nonce2


class TestNonceValidation:
    """Test nonce validation."""

    @pytest.mark.asyncio
    async def test_validate_valid_nonce(self):
        """Test validating a valid nonce."""
        from app.core.nonce import generate_nonce, validate_nonce

        address = "0x1234567890abcdef1234567890abcdef12345678"

        # Generate nonce
        nonce = await generate_nonce(address)

        # Validate it immediately
        is_valid = await validate_nonce(address, nonce)

        assert is_valid is True

    @pytest.mark.asyncio
    async def test_validate_nonexistent_nonce(self):
        """Test that nonexistent nonce is invalid."""
        from app.core.nonce import validate_nonce

        address = "0x1234567890abcdef1234567890abcdef12345678"
        fake_nonce = "nonexistent_nonce_12345"

        is_valid = await validate_nonce(address, fake_nonce)

        assert is_valid is False

    @pytest.mark.asyncio
    async def test_validate_nonce_wrong_address(self):
        """Test that nonce for different address is invalid."""
        from app.core.nonce import generate_nonce, validate_nonce

        address1 = "0x1111111111111111111111111111111111111111"
        address2 = "0x2222222222222222222222222222222222222222"

        # Generate nonce for address1
        nonce = await generate_nonce(address1)

        # Try to validate with address2
        is_valid = await validate_nonce(address2, nonce)

        assert is_valid is False


class TestNonceConsumption:
    """Test nonce consumption (single use)."""

    @pytest.mark.asyncio
    async def test_consume_nonce_success(self):
        """Test consuming a valid nonce."""
        from app.core.nonce import consume_nonce, generate_nonce

        address = "0x1234567890abcdef1234567890abcdef12345678"

        # Generate nonce
        nonce = await generate_nonce(address)

        # Consume it
        consumed = await consume_nonce(address, nonce)

        assert consumed is True

    @pytest.mark.asyncio
    async def test_consume_nonce_double_use(self):
        """Test that nonce can only be used once."""
        from app.core.nonce import consume_nonce, generate_nonce, validate_nonce

        address = "0x1234567890abcdef1234567890abcdef12345678"

        # Generate and consume nonce
        nonce = await generate_nonce(address)
        first_consume = await consume_nonce(address, nonce)

        assert first_consume is True

        # Try to validate after consumption
        is_valid_after = await validate_nonce(address, nonce)
        assert is_valid_after is False

        # Try to consume again
        second_consume = await consume_nonce(address, nonce)
        assert second_consume is False

    @pytest.mark.asyncio
    async def test_consume_nonexistent_nonce(self):
        """Test consuming nonexistent nonce returns False."""
        from app.core.nonce import consume_nonce

        address = "0x1234567890abcdef1234567890abcdef12345678"
        fake_nonce = "nonexistent_nonce"

        consumed = await consume_nonce(address, fake_nonce)

        assert consumed is False


class TestNonceExpiration:
    """Test nonce expiration."""

    @pytest.mark.asyncio
    async def test_nonce_expiration(self):
        """Test that nonce expires after configured time."""
        from app.core.nonce import generate_nonce, validate_nonce

        address = "0x1234567890abcdef1234567890abcdef12345678"

        # Generate nonce with short TTL (1 second)
        nonce = await generate_nonce(address, ttl_seconds=1)

        # Validate immediately
        is_valid_before = await validate_nonce(address, nonce)
        assert is_valid_before is True

        # Wait for expiration
        await asyncio.sleep(1.5)

        # Validate after expiration
        is_valid_after = await validate_nonce(address, nonce)
        assert is_valid_after is False

    @pytest.mark.asyncio
    async def test_nonce_default_ttl(self):
        """Test nonce has default 5-minute TTL."""
        from app.core.nonce import generate_nonce, get_nonce_ttl

        address = "0x1234567890abcdef1234567890abcdef12345678"

        # Generate nonce with default TTL
        nonce = await generate_nonce(address)

        # Get remaining TTL
        ttl = await get_nonce_ttl(address, nonce)

        # TTL should be close to 300 seconds (5 minutes), allow some variance
        assert ttl is not None
        assert 295 < ttl <= 300


class TestNoncePerformance:
    """Test nonce operations performance."""

    @pytest.mark.asyncio
    async def test_nonce_operations_performance(self):
        """Test that nonce operations are fast (< 50ms each)."""
        from app.core.nonce import consume_nonce, generate_nonce, validate_nonce

        address = "0x1234567890abcdef1234567890abcdef12345678"

        # Test generation performance
        start_time = time.time()
        nonce = await generate_nonce(address)
        gen_time = time.time() - start_time
        assert gen_time < 0.05, f"Generation too slow: {gen_time}s"

        # Test validation performance
        start_time = time.time()
        await validate_nonce(address, nonce)
        val_time = time.time() - start_time
        assert val_time < 0.05, f"Validation too slow: {val_time}s"

        # Test consumption performance
        start_time = time.time()
        await consume_nonce(address, nonce)
        cons_time = time.time() - start_time
        assert cons_time < 0.05, f"Consumption too slow: {cons_time}s"


# Import asyncio for sleep in expiration test
import asyncio
