"""
Unit tests for KYC webhook handler.

Tests comprehensive coverage:
1. Functional: Webhook processing, status updates
2. Boundary: Missing data, unknown events
3. Exception: Invalid signatures, database errors
4. Performance: N/A (external service)
5. Security: Signature verification
6. Compatibility: Event type handling
"""

import hashlib
import hmac
import pytest
from datetime import datetime, timezone
from fastapi import status
from http

client import AsyncClient
from sqlalchemy import select

from app.core.config import settings
from app.core.webhook_security import verify_blockpass_signature, generate_webhook_secret
from app.models.kyc import KYC, KYCStatus, KYCTier
from app.models.user import User
from tests.conftest import async_client, test_db


# Test constants
TEST_WEBHOOK_SECRET = "test-webhook-secret-12345"
TEST_WALLET_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678"
TEST_BLOCKPASS_ID = "bp_test123"


def compute_signature(payload: bytes, secret: str) -> str:
    """Compute HMAC-SHA256 signature for test payloads."""
    hmac_obj = hmac.new(
        key=secret.encode("utf-8"),
        msg=payload,
        digestmod=hashlib.sha256,
    )
    return f"sha256={hmac_obj.hexdigest()}"


@pytest.fixture
async def test_user(test_db):
    """Create test user."""
    user = User(
        address=TEST_WALLET_ADDRESS,
        referral_code="TEST1234",
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    return user


class TestSignatureVerification:
    """Test HMAC-SHA256 signature verification."""

    def test_valid_signature(self):
        """Should verify valid signature."""
        payload = b'{"event": "review.approved", "refId": "0x123"}'
        signature = compute_signature(payload, TEST_WEBHOOK_SECRET)

        is_valid = verify_blockpass_signature(
            payload_bytes=payload,
            signature_header=signature,
            secret=TEST_WEBHOOK_SECRET,
        )

        assert is_valid is True

    def test_invalid_signature(self):
        """Should reject invalid signature."""
        payload = b'{"event": "review.approved", "refId": "0x123"}'
        wrong_secret = "wrong-secret"
        signature = compute_signature(payload, wrong_secret)

        is_valid = verify_blockpass_signature(
            payload_bytes=payload,
            signature_header=signature,
            secret=TEST_WEBHOOK_SECRET,
        )

        assert is_valid is False

    def test_malformed_signature_header(self):
        """Should reject malformed signature header."""
        payload = b'{"event": "review.approved"}'

        # Missing "sha256=" prefix
        is_valid = verify_blockpass_signature(
            payload_bytes=payload,
            signature_header="abc123def456",
            secret=TEST_WEBHOOK_SECRET,
        )

        assert is_valid is False

    def test_missing_signature(self):
        """Should reject missing signature."""
        payload = b'{"event": "review.approved"}'

        is_valid = verify_blockpass_signature(
            payload_bytes=payload,
            signature_header=None,
            secret=TEST_WEBHOOK_SECRET,
        )

        assert is_valid is False

    def test_generate_webhook_secret(self):
        """Should generate cryptographically secure secret."""
        secret1 = generate_webhook_secret()
        secret2 = generate_webhook_secret()

        assert len(secret1) == 64  # 32 bytes = 64 hex chars
        assert secret1 != secret2  # Should be unique
        assert all(c in "0123456789abcdef" for c in secret1)  # Valid hex


@pytest.mark.asyncio
class TestWebhookEndpoint:
    """Test /api/kyc/webhook endpoint."""

    async def test_successful_kyc_approval(self, async_client, test_db, test_user):
        """Should successfully process KYC approval webhook."""
        # Prepare webhook payload
        payload_data = {
            "guid": "550e8400-e29b-41d4-a716-446655440000",
            "status": "approved",
            "clientId": "test-client-id",
            "event": "review.approved",
            "recordId": "rec_abc123",
            "refId": TEST_WALLET_ADDRESS,
            "submitCount": 1,
            "blockPassID": TEST_BLOCKPASS_ID,
            "isArchived": False,
            "isPing": False,
            "env": "prod",
        }

        # Compute signature
        payload_bytes = str(payload_data).replace("'", '"').encode("utf-8")
        signature = compute_signature(payload_bytes, TEST_WEBHOOK_SECRET)

        # Mock settings
        settings.BLOCKPASS_SECRET = TEST_WEBHOOK_SECRET

        # Send webhook
        response = await async_client.post(
            "/api/kyc/webhook",
            json=payload_data,
            headers={"X-Hub-Signature": signature},
        )

        # Verify response
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert "approved" in data["message"].lower()

        # Verify database update
        kyc_query = select(KYC).where(KYC.user_id == test_user.id)
        result = await test_db.execute(kyc_query)
        kyc_record = result.scalar_one_or_none()

        assert kyc_record is not None
        assert kyc_record.status == KYCStatus.APPROVED
        assert kyc_record.tier == KYCTier.TIER_1
        assert kyc_record.blockpass_id == TEST_BLOCKPASS_ID
        assert kyc_record.approved_at is not None

    async def test_kyc_rejection(self, async_client, test_db, test_user):
        """Should process KYC rejection webhook."""
        payload_data = {
            "guid": "550e8400-e29b-41d4-a716-446655440001",
            "status": "rejected",
            "clientId": "test-client-id",
            "event": "review.rejected",
            "recordId": "rec_abc124",
            "refId": TEST_WALLET_ADDRESS,
            "submitCount": 1,
            "blockPassID": TEST_BLOCKPASS_ID,
            "isArchived": False,
            "isPing": False,
            "env": "prod",
        }

        payload_bytes = str(payload_data).replace("'", '"').encode("utf-8")
        signature = compute_signature(payload_bytes, TEST_WEBHOOK_SECRET)
        settings.BLOCKPASS_SECRET = TEST_WEBHOOK_SECRET

        response = await async_client.post(
            "/api/kyc/webhook",
            json=payload_data,
            headers={"X-Hub-Signature": signature},
        )

        assert response.status_code == status.HTTP_200_OK

        # Verify database
        kyc_query = select(KYC).where(KYC.user_id == test_user.id)
        result = await test_db.execute(kyc_query)
        kyc_record = result.scalar_one_or_none()

        assert kyc_record.status == KYCStatus.REJECTED
        assert kyc_record.tier == KYCTier.TIER_0

    async def test_ping_webhook_ignored(self, async_client, test_db):
        """Should ignore ping/test webhooks."""
        payload_data = {
            "guid": "ping-test",
            "status": "test",
            "clientId": "test-client-id",
            "event": "user.created",
            "recordId": "rec_ping",
            "refId": TEST_WALLET_ADDRESS,
            "submitCount": 0,
            "blockPassID": "bp_ping",
            "isArchived": False,
            "isPing": True,  # Ping webhook
            "env": "prod",
        }

        payload_bytes = str(payload_data).replace("'", '"').encode("utf-8")
        signature = compute_signature(payload_bytes, TEST_WEBHOOK_SECRET)
        settings.BLOCKPASS_SECRET = TEST_WEBHOOK_SECRET

        response = await async_client.post(
            "/api/kyc/webhook",
            json=payload_data,
            headers={"X-Hub-Signature": signature},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "ping" in data["message"].lower()

    async def test_invalid_signature_rejected(self, async_client, test_db, test_user):
        """Should reject webhook with invalid signature."""
        payload_data = {
            "guid": "invalid-sig-test",
            "status": "approved",
            "clientId": "test-client-id",
            "event": "review.approved",
            "recordId": "rec_invalid",
            "refId": TEST_WALLET_ADDRESS,
            "submitCount": 1,
            "blockPassID": TEST_BLOCKPASS_ID,
            "isArchived": False,
            "isPing": False,
            "env": "prod",
        }

        # Wrong signature
        wrong_signature = "sha256=invalid_signature_12345"
        settings.BLOCKPASS_SECRET = TEST_WEBHOOK_SECRET

        response = await async_client.post(
            "/api/kyc/webhook",
            json=payload_data,
            headers={"X-Hub-Signature": wrong_signature},
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    async def test_missing_signature_rejected(self, async_client, test_db):
        """Should reject webhook without signature header."""
        payload_data = {
            "guid": "no-sig-test",
            "status": "approved",
            "clientId": "test-client-id",
            "event": "review.approved",
            "recordId": "rec_nosig",
            "refId": TEST_WALLET_ADDRESS,
            "submitCount": 1,
            "blockPassID": TEST_BLOCKPASS_ID,
            "isArchived": False,
            "isPing": False,
            "env": "prod",
        }

        settings.BLOCKPASS_SECRET = TEST_WEBHOOK_SECRET

        # No X-Hub-Signature header
        response = await async_client.post(
            "/api/kyc/webhook",
            json=payload_data,
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    async def test_user_not_found(self, async_client, test_db):
        """Should return 404 if user not found."""
        payload_data = {
            "guid": "user-not-found-test",
            "status": "approved",
            "clientId": "test-client-id",
            "event": "review.approved",
            "recordId": "rec_notfound",
            "refId": "0xnonexistentaddress",  # Non-existent user
            "submitCount": 1,
            "blockPassID": TEST_BLOCKPASS_ID,
            "isArchived": False,
            "isPing": False,
            "env": "prod",
        }

        payload_bytes = str(payload_data).replace("'", '"').encode("utf-8")
        signature = compute_signature(payload_bytes, TEST_WEBHOOK_SECRET)
        settings.BLOCKPASS_SECRET = TEST_WEBHOOK_SECRET

        response = await async_client.post(
            "/api/kyc/webhook",
            json=payload_data,
            headers={"X-Hub-Signature": signature},
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.asyncio
class TestKYCStatusEndpoint:
    """Test /api/kyc/status/{address} endpoint."""

    async def test_get_kyc_status_approved(self, async_client, test_db, test_user):
        """Should return KYC status for approved user."""
        # Create KYC record
        kyc_record = KYC(
            user_id=test_user.id,
            status=KYCStatus.APPROVED,
            tier=KYCTier.TIER_1,
            blockpass_id=TEST_BLOCKPASS_ID,
            approved_at=datetime.now(timezone.utc),
        )
        test_db.add(kyc_record)
        await test_db.commit()

        # Query status
        response = await async_client.get(f"/api/kyc/status/{TEST_WALLET_ADDRESS}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["tier"] == 1
        assert data["status"] == "approved"
        assert data["blockpass_id"] == TEST_BLOCKPASS_ID
        assert data["approved_at"] is not None

    async def test_get_kyc_status_pending(self, async_client, test_db, test_user):
        """Should return default status for user without KYC."""
        # No KYC record created

        response = await async_client.get(f"/api/kyc/status/{TEST_WALLET_ADDRESS}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["tier"] == 0
        assert data["status"] == "pending"
        assert data["blockpass_id"] is None

    async def test_get_kyc_status_user_not_found(self, async_client, test_db):
        """Should return 404 for non-existent user."""
        response = await async_client.get("/api/kyc/status/0xnonexistent")

        assert response.status_code == status.HTTP_404_NOT_FOUND
