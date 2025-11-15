"""
Unit tests for KYC Tier authorization system.

Tests comprehensive coverage:
1. Functional: Tier validation, permission checks
2. Boundary: Edge cases for each tier level
3. Exception: Unauthorized access attempts
4. Performance: N/A (simple validation)
5. Security: Authorization enforcement
6. Compatibility: Tier upgrade paths
"""

import pytest
from datetime import datetime, timezone
from fastapi import status
from httpx import AsyncClient

from app.core.security import create_access_token
from app.models.kyc import KYC, KYCStatus, KYCTier
from app.models.user import User


# Test constants
TEST_WALLET_TIER_0 = "0xTier0User1234567890abcdef1234567890abcd"
TEST_WALLET_TIER_1 = "0xTier1User1234567890abcdef1234567890abcd"
TEST_WALLET_TIER_2 = "0xTier2User1234567890abcdef1234567890abcd"


@pytest.mark.asyncio
class TestTierValidation:
    """Test tier validation logic."""

    async def test_tier_0_default_for_new_users(self, async_client, test_db, test_user):
        """Users without KYC should default to Tier 0."""
        # No KYC record created for test_user

        # Query KYC status
        token = create_access_token({"sub": test_user.address})
        response = await async_client.get(
            f"/api/kyc/status/{test_user.address}",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["tier"] == 0
        assert data["status"] == "pending"

    async def test_tier_1_for_approved_basic_kyc(self, async_client, test_db, test_user):
        """Approved KYC should grant Tier 1."""
        # Create Tier 1 KYC record
        kyc_record = KYC(
            user_id=test_user.id,
            status=KYCStatus.APPROVED,
            tier=KYCTier.TIER_1,
            blockpass_id="bp_tier1_test",
            approved_at=datetime.now(timezone.utc),
        )
        test_db.add(kyc_record)
        await test_db.commit()

        # Query KYC status
        token = create_access_token({"sub": test_user.address})
        response = await async_client.get(
            f"/api/kyc/status/{test_user.address}",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["tier"] == 1
        assert data["status"] == "approved"

    async def test_tier_2_for_advanced_kyc(self, async_client, test_db, test_user):
        """Advanced KYC should grant Tier 2."""
        # Create Tier 2 KYC record
        kyc_record = KYC(
            user_id=test_user.id,
            status=KYCStatus.APPROVED,
            tier=KYCTier.TIER_2,
            blockpass_id="bp_tier2_test",
            approved_at=datetime.now(timezone.utc),
        )
        test_db.add(kyc_record)
        await test_db.commit()

        # Query KYC status
        token = create_access_token({"sub": test_user.address})
        response = await async_client.get(
            f"/api/kyc/status/{test_user.address}",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["tier"] == 2
        assert data["status"] == "approved"

    async def test_tier_downgrade_on_rejection(self, async_client, test_db, test_user):
        """Rejected KYC should reset to Tier 0."""
        # Create rejected KYC record
        kyc_record = KYC(
            user_id=test_user.id,
            status=KYCStatus.REJECTED,
            tier=KYCTier.TIER_0,
            blockpass_id="bp_rejected_test",
        )
        test_db.add(kyc_record)
        await test_db.commit()

        # Query KYC status
        token = create_access_token({"sub": test_user.address})
        response = await async_client.get(
            f"/api/kyc/status/{test_user.address}",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["tier"] == 0
        assert data["status"] == "rejected"


@pytest.mark.asyncio
class TestTierPermissions:
    """Test tier-based permission enforcement."""

    async def test_tier_0_cannot_access_tier_1_features(self, async_client, test_db, test_user):
        """Tier 0 users should be blocked from Tier 1 features."""
        # No KYC record (defaults to Tier 0)

        token = create_access_token({"sub": test_user.address})

        # Try to access Tier 1 feature (example: advanced trading)
        response = await async_client.get(
            "/api/features/tier1-only",
            headers={"Authorization": f"Bearer {token}"}
        )

        # Should return 403 Forbidden with clear message
        assert response.status_code == status.HTTP_403_FORBIDDEN
        data = response.json()
        assert "tier" in data["detail"].lower() or "kyc" in data["detail"].lower()

    async def test_tier_1_can_access_tier_1_features(self, async_client, test_db, test_user):
        """Tier 1 users should access Tier 1 features."""
        # Create Tier 1 KYC record
        kyc_record = KYC(
            user_id=test_user.id,
            status=KYCStatus.APPROVED,
            tier=KYCTier.TIER_1,
            blockpass_id="bp_tier1_access",
            approved_at=datetime.now(timezone.utc),
        )
        test_db.add(kyc_record)
        await test_db.commit()

        token = create_access_token({"sub": test_user.address})

        # Access Tier 1 feature
        response = await async_client.get(
            "/api/features/tier1-only",
            headers={"Authorization": f"Bearer {token}"}
        )

        # Should succeed
        assert response.status_code == status.HTTP_200_OK

    async def test_tier_1_cannot_access_tier_2_features(self, async_client, test_db, test_user):
        """Tier 1 users should be blocked from Tier 2 features."""
        # Create Tier 1 KYC record
        kyc_record = KYC(
            user_id=test_user.id,
            status=KYCStatus.APPROVED,
            tier=KYCTier.TIER_1,
            blockpass_id="bp_tier1_blocked",
            approved_at=datetime.now(timezone.utc),
        )
        test_db.add(kyc_record)
        await test_db.commit()

        token = create_access_token({"sub": test_user.address})

        # Try to access Tier 2 feature (example: high-value launchpad)
        response = await async_client.get(
            "/api/features/tier2-only",
            headers={"Authorization": f"Bearer {token}"}
        )

        # Should return 403 Forbidden
        assert response.status_code == status.HTTP_403_FORBIDDEN
        data = response.json()
        assert "tier 2" in data["detail"].lower() or "advanced" in data["detail"].lower()

    async def test_tier_2_can_access_all_features(self, async_client, test_db, test_user):
        """Tier 2 users should access all features."""
        # Create Tier 2 KYC record
        kyc_record = KYC(
            user_id=test_user.id,
            status=KYCStatus.APPROVED,
            tier=KYCTier.TIER_2,
            blockpass_id="bp_tier2_full_access",
            approved_at=datetime.now(timezone.utc),
        )
        test_db.add(kyc_record)
        await test_db.commit()

        token = create_access_token({"sub": test_user.address})

        # Access Tier 1 feature
        response1 = await async_client.get(
            "/api/features/tier1-only",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response1.status_code == status.HTTP_200_OK

        # Access Tier 2 feature
        response2 = await async_client.get(
            "/api/features/tier2-only",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response2.status_code == status.HTTP_200_OK


@pytest.mark.asyncio
class TestTierErrorMessages:
    """Test tier-related error messages."""

    async def test_tier_0_error_message_clarity(self, async_client, test_db, test_user):
        """Tier 0 users should see clear upgrade instructions."""
        # No KYC record

        token = create_access_token({"sub": test_user.address})
        response = await async_client.get(
            "/api/features/tier1-only",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        data = response.json()

        # Error message should be informative
        detail = data["detail"].lower()
        assert any(keyword in detail for keyword in ["kyc", "tier", "verification", "upgrade"])

    async def test_tier_1_upgrade_prompt_for_tier_2_features(self, async_client, test_db, test_user):
        """Tier 1 users should see Tier 2 upgrade prompt."""
        # Create Tier 1 KYC
        kyc_record = KYC(
            user_id=test_user.id,
            status=KYCStatus.APPROVED,
            tier=KYCTier.TIER_1,
            blockpass_id="bp_tier1_upgrade_prompt",
            approved_at=datetime.now(timezone.utc),
        )
        test_db.add(kyc_record)
        await test_db.commit()

        token = create_access_token({"sub": test_user.address})
        response = await async_client.get(
            "/api/features/tier2-only",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        data = response.json()

        # Should mention Tier 2 requirement
        detail = data["detail"].lower()
        assert "tier 2" in detail or "advanced" in detail


@pytest.mark.asyncio
class TestTierBoundaries:
    """Test tier boundary conditions."""

    async def test_pending_kyc_remains_tier_0(self, async_client, test_db, test_user):
        """Pending KYC should not grant tier upgrade."""
        # Create pending KYC record
        kyc_record = KYC(
            user_id=test_user.id,
            status=KYCStatus.PENDING,
            tier=KYCTier.TIER_0,
            blockpass_id="bp_pending",
        )
        test_db.add(kyc_record)
        await test_db.commit()

        token = create_access_token({"sub": test_user.address})
        response = await async_client.get(
            f"/api/kyc/status/{test_user.address}",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["tier"] == 0
        assert data["status"] == "pending"

    async def test_expired_kyc_resets_to_tier_0(self, async_client, test_db, test_user):
        """Expired KYC should reset to Tier 0."""
        # Create expired KYC record
        kyc_record = KYC(
            user_id=test_user.id,
            status=KYCStatus.EXPIRED,
            tier=KYCTier.TIER_0,
            blockpass_id="bp_expired",
            approved_at=datetime.now(timezone.utc),
        )
        test_db.add(kyc_record)
        await test_db.commit()

        token = create_access_token({"sub": test_user.address})
        response = await async_client.get(
            f"/api/kyc/status/{test_user.address}",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["tier"] == 0
        assert data["status"] == "expired"
