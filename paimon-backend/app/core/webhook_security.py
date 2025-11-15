"""
Webhook security utilities.

Provides signature verification for incoming webhooks from third-party services.
"""

import hashlib
import hmac
import secrets
from typing import Any


def verify_blockpass_signature(
    payload_bytes: bytes, signature_header: str, secret: str
) -> bool:
    """
    Verify Blockpass webhook signature using HMAC-SHA256.

    Blockpass sends the X-Hub-Signature header containing the HMAC hex digest
    of the request body. This function recomputes the signature and compares
    it using a timing-safe comparison.

    Args:
        payload_bytes: Raw request body bytes
        signature_header: Value from X-Hub-Signature header
        secret: Webhook secret configured in Blockpass dashboard

    Returns:
        True if signature is valid, False otherwise

    Example:
        >>> payload = b'{"event": "review.approved", "refId": "0x123..."}'
        >>> signature = "sha256=abc123def456..."
        >>> secret = "my-webhook-secret"
        >>> is_valid = verify_blockpass_signature(payload, signature, secret)
        >>> print(is_valid)
        True

    Security:
        - Uses HMAC-SHA256 for cryptographic integrity
        - Constant-time comparison prevents timing attacks
        - Signature format: "sha256=<hex_digest>"
    """
    if not signature_header or not secret:
        return False

    # Extract hex digest from "sha256=<digest>" format
    if not signature_header.startswith("sha256="):
        return False

    expected_signature = signature_header[7:]  # Remove "sha256=" prefix

    # Compute HMAC-SHA256 of payload
    computed_hmac = hmac.new(
        key=secret.encode("utf-8"), msg=payload_bytes, digestmod=hashlib.sha256
    )
    computed_signature = computed_hmac.hexdigest()

    # Timing-safe comparison
    return secrets.compare_digest(computed_signature, expected_signature)


def generate_webhook_secret(length: int = 32) -> str:
    """
    Generate a cryptographically secure webhook secret.

    Useful for initial webhook configuration or secret rotation.

    Args:
        length: Length of the secret in bytes (default: 32)

    Returns:
        Hex-encoded random secret

    Example:
        >>> secret = generate_webhook_secret()
        >>> len(secret)
        64  # 32 bytes = 64 hex characters
        >>> secret = generate_webhook_secret(length=16)
        >>> len(secret)
        32  # 16 bytes = 32 hex characters
    """
    return secrets.token_hex(length)


def validate_webhook_payload(payload: dict[str, Any], required_fields: list[str]) -> bool:
    """
    Validate that webhook payload contains all required fields.

    Args:
        payload: Decoded JSON payload
        required_fields: List of field names that must be present

    Returns:
        True if all required fields exist, False otherwise

    Example:
        >>> payload = {"event": "review.approved", "refId": "0x123", "status": "approved"}
        >>> required = ["event", "refId", "status"]
        >>> is_valid = validate_webhook_payload(payload, required)
        >>> print(is_valid)
        True
        >>> required = ["event", "refId", "status", "missing_field"]
        >>> is_valid = validate_webhook_payload(payload, required)
        >>> print(is_valid)
        False
    """
    return all(field in payload for field in required_fields)
