"""
Test suite for RWA Task Verification Engine (Task 25).

Tests the RWA task verification service with 6-dimensional coverage:
1. Functional - Core logic works correctly
2. Boundary - Edge cases (zero amounts, expired tasks)
3. Exception - Error handling (RPC failures, invalid contracts)
4. Performance - < 2s verification time
5. Security - Address validation, config validation
6. Compatibility - Different task types, contract versions
"""

import pytest
import time
from datetime import datetime, UTC, timedelta
from decimal import Decimal
from unittest.mock import Mock, AsyncMock, patch
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.task import TaskProgress, TaskType, TaskStatus
from app.services.rwa_task.web3_provider import Web3Provider
from app.services.rwa_task.contract_manager import ContractManager
from app.services.rwa_task.cache_manager import CacheManager
from app.services.rwa_task.verification_service import VerificationService
from app.services.rwa_task.verifiers.hold_rwa_asset import HoldRWAAssetVerifier


@pytest.fixture
def mock_web3_provider():
    """Mock Web3Provider for testing."""
    provider = Mock(spec=Web3Provider)
    provider.chain_id = 97
    provider.get_block = AsyncMock(return_value={
        "timestamp": int(datetime.now(UTC).timestamp()),
        "number": 1000000
    })
    provider.get_logs = AsyncMock(return_value=[])
    return provider


@pytest.fixture
def mock_contract_manager(mock_web3_provider):
    """Mock ContractManager for testing."""
    manager = Mock(spec=ContractManager)

    # Mock Treasury contract
    treasury_contract = Mock()
    treasury_contract.functions = Mock()
    treasury_contract.functions.getUserDebt = Mock(return_value=Mock(
        call=AsyncMock(return_value=1000 * 10**18)  # 1000 USDP debt
    ))
    treasury_contract.functions.getCollateralBalance = Mock(return_value=Mock(
        call=AsyncMock(return_value=2000 * 10**18)  # 2000 USD worth collateral
    ))
    treasury_contract.functions.getHealthFactor = Mock(return_value=Mock(
        call=AsyncMock(return_value=int(1.8 * 10**18))  # 1.8 health factor
    ))

    manager.get_contract = Mock(return_value=treasury_contract)
    return manager


@pytest.fixture
def cache_manager():
    """Real CacheManager for testing."""
    from app.core.cache import cache
    return CacheManager(cache)


@pytest.fixture
async def test_user(test_db: AsyncSession):
    """Create test user."""
    user = User(
        address="0x1234567890123456789012345678901234567890",
        referral_code="TEST_RWA_001"
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    return user


class TestWeb3Provider:
    """Test Web3Provider functionality."""

    @pytest.mark.asyncio
    async def test_initialization(self):
        """FUNCTIONAL: Web3Provider should initialize correctly."""
        provider = Web3Provider(
            rpc_url="https://data-seed-prebsc-1-s1.binance.org:8545",
            chain_id=97
        )

        assert provider.chain_id == 97
        assert provider.w3 is not None
        assert provider.w3.is_connected() is True

    @pytest.mark.asyncio
    async def test_get_current_block(self):
        """FUNCTIONAL: Should retrieve current block info."""
        provider = Web3Provider(
            rpc_url="https://data-seed-prebsc-1-s1.binance.org:8545",
            chain_id=97
        )

        block = await provider.get_block("latest")

        assert "timestamp" in block
        assert "number" in block
        assert block["number"] > 0

    @pytest.mark.asyncio
    async def test_connection_failure_handling(self):
        """EXCEPTION: Should handle RPC connection failures."""
        # Should raise ConnectionError during initialization for invalid RPC
        with pytest.raises(ConnectionError):
            provider = Web3Provider(
                rpc_url="http://invalid-rpc-url:8545",
                chain_id=97
            )


class TestHoldRWAAssetVerifier:
    """Test HOLD_RWA_ASSET task verifier."""

    @pytest.mark.asyncio
    async def test_verify_holding_success(
        self,
        mock_web3_provider,
        mock_contract_manager,
        cache_manager
    ):
        """FUNCTIONAL: User holding RWA asset for required duration should pass."""
        verifier = HoldRWAAssetVerifier(
            mock_web3_provider,
            mock_contract_manager,
            cache_manager
        )

        # Mock deposit event from 31 days ago
        first_deposit_time = datetime.now(UTC) - timedelta(days=31)
        mock_web3_provider.get_logs = AsyncMock(return_value=[
            {
                "blockNumber": 900000,
                "transactionHash": "0xabc...",
                "args": {
                    "user": "0x1234567890123456789012345678901234567890",
                    "amount": 2000 * 10**18,
                    "timestamp": int(first_deposit_time.timestamp())
                }
            }
        ])

        # Task config: hold 1000 USD worth for 30 days
        config = {
            "type": "HOLD_RWA_ASSET",
            "collateralType": "T1_US_TREASURY",
            "minimumAmount": str(1000 * 10**18),
            "holdDays": 30
        }

        verified, verification_data = await verifier.verify(
            address="0x1234567890123456789012345678901234567890",
            config=config
        )

        assert verified is True
        assert verification_data["currentBalance"] == str(2000 * 10**18)
        assert verification_data["holdDuration"] >= 30

    @pytest.mark.asyncio
    async def test_verify_insufficient_hold_duration(
        self,
        mock_web3_provider,
        mock_contract_manager,
        cache_manager
    ):
        """BOUNDARY: User holding for less than required days should fail."""
        verifier = HoldRWAAssetVerifier(
            mock_web3_provider,
            mock_contract_manager,
            cache_manager
        )

        # Mock deposit event from only 10 days ago
        first_deposit_time = datetime.now(UTC) - timedelta(days=10)
        mock_web3_provider.get_logs = AsyncMock(return_value=[
            {
                "blockNumber": 990000,
                "transactionHash": "0xdef...",
                "args": {
                    "user": "0x1234567890123456789012345678901234567890",
                    "amount": 2000 * 10**18,
                    "timestamp": int(first_deposit_time.timestamp())
                }
            }
        ])

        config = {
            "type": "HOLD_RWA_ASSET",
            "collateralType": "T1_US_TREASURY",
            "minimumAmount": str(1000 * 10**18),
            "holdDays": 30
        }

        verified, verification_data = await verifier.verify(
            address="0x1234567890123456789012345678901234567890",
            config=config
        )

        assert verified is False
        assert verification_data["holdDuration"] < 30

    @pytest.mark.asyncio
    async def test_verify_no_deposit_history(
        self,
        mock_web3_provider,
        mock_contract_manager,
        cache_manager
    ):
        """BOUNDARY: User with no deposit history should fail."""
        verifier = HoldRWAAssetVerifier(
            mock_web3_provider,
            mock_contract_manager,
            cache_manager
        )

        # No deposit events
        mock_web3_provider.get_logs = AsyncMock(return_value=[])

        config = {
            "type": "HOLD_RWA_ASSET",
            "collateralType": "T1_US_TREASURY",
            "minimumAmount": str(1000 * 10**18),
            "holdDays": 30
        }

        verified, verification_data = await verifier.verify(
            address="0x1234567890123456789012345678901234567890",
            config=config
        )

        assert verified is False
        assert "error" in verification_data or verification_data.get("holdDuration") == 0


class TestVerificationService:
    """Test VerificationService integration."""

    @pytest.mark.asyncio
    async def test_verify_task_with_cache(
        self,
        test_db: AsyncSession,
        test_user,
        mock_web3_provider,
        mock_contract_manager,
        cache_manager
    ):
        """FUNCTIONAL: Should use cache for repeated verifications."""
        service = VerificationService(
            w3_provider=mock_web3_provider,
            contract_mgr=mock_contract_manager,
            cache_mgr=cache_manager,
            db=test_db
        )

        # Create task progress
        task_progress = TaskProgress(
            user_id=test_user.id,
            task_id="rwa_hold_test_001",
            task_type=TaskType.ONCHAIN_COMPLEX,
            status=TaskStatus.PENDING,
            config={
                "type": "HOLD_RWA_ASSET",
                "collateralType": "T1_US_TREASURY",
                "minimumAmount": str(1000 * 10**18),
                "holdDays": 30
            }
        )
        test_db.add(task_progress)
        await test_db.commit()

        # First verification (cache miss)
        start_time = time.time()
        verified1, data1 = await service.verify_task(
            address=test_user.address,
            task_id="rwa_hold_test_001",
            task_config=task_progress.config
        )
        first_duration = time.time() - start_time

        # Second verification (cache hit)
        start_time = time.time()
        verified2, data2 = await service.verify_task(
            address=test_user.address,
            task_id="rwa_hold_test_001",
            task_config=task_progress.config
        )
        second_duration = time.time() - start_time

        # Cache hit should be faster
        assert second_duration < first_duration
        assert verified1 == verified2
        assert data1 == data2

    @pytest.mark.asyncio
    async def test_verify_task_updates_database(
        self,
        test_db: AsyncSession,
        test_user,
        mock_web3_provider,
        mock_contract_manager,
        cache_manager
    ):
        """FUNCTIONAL: Successful verification should update TaskProgress."""
        service = VerificationService(
            w3_provider=mock_web3_provider,
            contract_mgr=mock_contract_manager,
            cache_mgr=cache_manager,
            db=test_db
        )

        # Create task progress
        task_progress = TaskProgress(
            user_id=test_user.id,
            task_id="rwa_hold_test_002",
            task_type=TaskType.ONCHAIN_COMPLEX,
            status=TaskStatus.PENDING,
            config={
                "type": "HOLD_RWA_ASSET",
                "collateralType": "T1_US_TREASURY",
                "minimumAmount": str(1000 * 10**18),
                "holdDays": 30
            }
        )
        test_db.add(task_progress)
        await test_db.commit()
        await test_db.refresh(task_progress)

        # Mock successful verification
        first_deposit_time = datetime.now(UTC) - timedelta(days=35)
        mock_web3_provider.get_logs = AsyncMock(return_value=[
            {
                "blockNumber": 900000,
                "transactionHash": "0xabc...",
                "args": {
                    "user": test_user.address,
                    "amount": 2000 * 10**18,
                    "timestamp": int(first_deposit_time.timestamp())
                }
            }
        ])

        # Verify
        verified, data = await service.verify_task(
            address=test_user.address,
            task_id="rwa_hold_test_002",
            task_config=task_progress.config
        )

        # Refresh task progress from DB
        await test_db.refresh(task_progress)

        assert verified is True
        assert task_progress.status == TaskStatus.COMPLETED
        assert task_progress.verification_data is not None
        assert task_progress.completed_at is not None


class TestPerformance:
    """Test performance requirements."""

    @pytest.mark.asyncio
    async def test_verification_performance_under_2s(
        self,
        test_db: AsyncSession,
        test_user,
        mock_web3_provider,
        mock_contract_manager,
        cache_manager
    ):
        """PERFORMANCE: Task verification should complete in < 2s."""
        service = VerificationService(
            w3_provider=mock_web3_provider,
            contract_mgr=mock_contract_manager,
            cache_mgr=cache_manager,
            db=test_db
        )

        config = {
            "type": "HOLD_RWA_ASSET",
            "collateralType": "T1_US_TREASURY",
            "minimumAmount": str(1000 * 10**18),
            "holdDays": 30
        }

        # Mock data
        first_deposit_time = datetime.now(UTC) - timedelta(days=35)
        mock_web3_provider.get_logs = AsyncMock(return_value=[
            {
                "blockNumber": 900000,
                "transactionHash": "0xabc...",
                "args": {
                    "user": test_user.address,
                    "amount": 2000 * 10**18,
                    "timestamp": int(first_deposit_time.timestamp())
                }
            }
        ])

        # Measure verification time
        start_time = time.time()
        verified, data = await service.verify_task(
            address=test_user.address,
            task_id="perf_test_001",
            task_config=config
        )
        duration = time.time() - start_time

        assert duration < 2.0  # < 2 seconds requirement

    @pytest.mark.asyncio
    async def test_cache_hit_performance(
        self,
        test_db: AsyncSession,
        test_user,
        mock_web3_provider,
        mock_contract_manager,
        cache_manager
    ):
        """PERFORMANCE: Cache hit should be < 100ms."""
        service = VerificationService(
            w3_provider=mock_web3_provider,
            contract_mgr=mock_contract_manager,
            cache_mgr=cache_manager,
            db=test_db
        )

        config = {
            "type": "HOLD_RWA_ASSET",
            "collateralType": "T1_US_TREASURY",
            "minimumAmount": str(1000 * 10**18),
            "holdDays": 30
        }

        # First call to populate cache
        await service.verify_task(
            address=test_user.address,
            task_id="cache_perf_001",
            task_config=config
        )

        # Second call should hit cache
        start_time = time.time()
        await service.verify_task(
            address=test_user.address,
            task_id="cache_perf_001",
            task_config=config
        )
        duration = time.time() - start_time

        assert duration < 0.1  # < 100ms for cache hit


class TestSecurity:
    """Test security and validation."""

    @pytest.mark.asyncio
    async def test_invalid_address_rejection(
        self,
        mock_web3_provider,
        mock_contract_manager,
        cache_manager
    ):
        """SECURITY: Invalid Ethereum addresses should be rejected."""
        verifier = HoldRWAAssetVerifier(
            mock_web3_provider,
            mock_contract_manager,
            cache_manager
        )

        config = {
            "type": "HOLD_RWA_ASSET",
            "collateralType": "T1_US_TREASURY",
            "minimumAmount": str(1000 * 10**18),
            "holdDays": 30
        }

        # Test invalid addresses
        invalid_addresses = [
            "0xinvalid",
            "not_an_address",
            "0x123",  # Too short
            ""
        ]

        for invalid_addr in invalid_addresses:
            verified, data = await verifier.verify(
                address=invalid_addr,
                config=config
            )

            assert verified is False
            assert "error" in data or "invalid" in str(data).lower()

    @pytest.mark.asyncio
    async def test_config_validation(
        self,
        mock_web3_provider,
        mock_contract_manager,
        cache_manager
    ):
        """SECURITY: Invalid task configs should be rejected."""
        verifier = HoldRWAAssetVerifier(
            mock_web3_provider,
            mock_contract_manager,
            cache_manager
        )

        # Missing required fields
        invalid_config = {
            "type": "HOLD_RWA_ASSET"
            # Missing: minimumAmount, holdDays
        }

        verified, data = await verifier.verify(
            address="0x1234567890123456789012345678901234567890",
            config=invalid_config
        )

        assert verified is False
        assert "error" in data or "invalid" in str(data).lower()


class TestMaintainHealthFactorVerifier:
    """Test MAINTAIN_HEALTH_FACTOR task verifier."""

    @pytest.mark.asyncio
    async def test_verify_health_factor_success(
        self,
        mock_web3_provider,
        mock_contract_manager,
        cache_manager
    ):
        """FUNCTIONAL: User maintaining health factor above threshold should pass."""
        from app.services.rwa_task.verifiers.maintain_health_factor import MaintainHealthFactorVerifier

        verifier = MaintainHealthFactorVerifier(
            mock_web3_provider,
            mock_contract_manager,
            cache_manager
        )

        config = {
            "type": "MAINTAIN_HEALTH_FACTOR",
            "minimumHealthFactor": "1.5",
            "durationDays": 7,
            "snapshotIntervalHours": 24
        }

        verified, verification_data = await verifier.verify(
            address="0x1234567890123456789012345678901234567890",
            config=config
        )

        # Should pass since mock returns 1.8 health factor
        assert verified is True
        assert verification_data["currentHealthFactor"] == "1.8"
        assert verification_data["allAboveThreshold"] is True

    @pytest.mark.asyncio
    async def test_verify_insufficient_health_factor(
        self,
        mock_web3_provider,
        mock_contract_manager,
        cache_manager
    ):
        """BOUNDARY: Health factor below threshold should fail."""
        from app.services.rwa_task.verifiers.maintain_health_factor import MaintainHealthFactorVerifier

        # Mock returns 1.8, but we require 2.0
        verifier = MaintainHealthFactorVerifier(
            mock_web3_provider,
            mock_contract_manager,
            cache_manager
        )

        config = {
            "type": "MAINTAIN_HEALTH_FACTOR",
            "minimumHealthFactor": "2.0",  # Higher than mock's 1.8
            "durationDays": 7,
            "snapshotIntervalHours": 24
        }

        verified, verification_data = await verifier.verify(
            address="0x1234567890123456789012345678901234567890",
            config=config
        )

        assert verified is False
        assert verification_data["allAboveThreshold"] is False


class TestMintUSDPAmountVerifier:
    """Test MINT_USDP_AMOUNT task verifier."""

    @pytest.mark.asyncio
    async def test_verify_mint_amount_success(
        self,
        mock_web3_provider,
        mock_contract_manager,
        cache_manager
    ):
        """FUNCTIONAL: User minting USDP above target should pass."""
        from app.services.rwa_task.verifiers.mint_usdp import MintUSDPAmountVerifier

        verifier = MintUSDPAmountVerifier(
            mock_web3_provider,
            mock_contract_manager,
            cache_manager
        )

        # Mock USDPVault contract
        vault_contract = Mock()
        vault_contract.functions = Mock()
        vault_contract.functions.getUserDebt = Mock(return_value=Mock(
            call=AsyncMock(return_value=2000 * 10**18)  # 2000 USDP debt
        ))
        mock_contract_manager.get_contract = Mock(return_value=vault_contract)

        config = {
            "type": "MINT_USDP_AMOUNT",
            "targetAmount": str(1000 * 10**18),  # Target 1000 USDP
        }

        verified, verification_data = await verifier.verify(
            address="0x1234567890123456789012345678901234567890",
            config=config
        )

        assert verified is True
        assert int(verification_data["totalMinted"]) >= int(config["targetAmount"])

    @pytest.mark.asyncio
    async def test_verify_insufficient_mint_amount(
        self,
        mock_web3_provider,
        mock_contract_manager,
        cache_manager
    ):
        """BOUNDARY: User minting below target should fail."""
        from app.services.rwa_task.verifiers.mint_usdp import MintUSDPAmountVerifier

        verifier = MintUSDPAmountVerifier(
            mock_web3_provider,
            mock_contract_manager,
            cache_manager
        )

        # Mock USDPVault contract with low debt
        vault_contract = Mock()
        vault_contract.functions = Mock()
        vault_contract.functions.getUserDebt = Mock(return_value=Mock(
            call=AsyncMock(return_value=500 * 10**18)  # Only 500 USDP debt
        ))
        mock_contract_manager.get_contract = Mock(return_value=vault_contract)

        config = {
            "type": "MINT_USDP_AMOUNT",
            "targetAmount": str(1000 * 10**18),  # Target 1000 USDP
        }

        verified, verification_data = await verifier.verify(
            address="0x1234567890123456789012345678901234567890",
            config=config
        )

        assert verified is False
        assert int(verification_data["totalMinted"]) < int(config["targetAmount"])


class TestProvideLiquidityVerifier:
    """Test PROVIDE_LIQUIDITY task verifier."""

    @pytest.mark.asyncio
    async def test_verify_liquidity_provision_success(
        self,
        mock_web3_provider,
        mock_contract_manager,
        cache_manager
    ):
        """FUNCTIONAL: User providing sufficient liquidity for required duration should pass."""
        from app.services.rwa_task.verifiers.provide_liquidity import ProvideLiquidityVerifier

        verifier = ProvideLiquidityVerifier(
            mock_web3_provider,
            mock_contract_manager,
            cache_manager
        )

        # Mock DEXPair contract
        pair_abi = []  # Simplified
        mock_contract_manager.load_abi = Mock(return_value=pair_abi)

        pair_contract = Mock()
        pair_contract.functions = Mock()
        pair_contract.functions.balanceOf = Mock(return_value=Mock(
            call=AsyncMock(return_value=2000 * 10**18)  # 2000 LP tokens
        ))
        mock_web3_provider.eth = Mock()
        mock_web3_provider.eth.contract = Mock(return_value=pair_contract)

        # Mock provision time from 20 days ago
        first_provision_time = datetime.now(UTC) - timedelta(days=20)
        mock_web3_provider.get_logs = AsyncMock(return_value=[
            {
                "blockNumber": 900000,
                "transactionHash": "0xabc...",
                "args": {
                    "timestamp": int(first_provision_time.timestamp())
                }
            }
        ])

        config = {
            "type": "PROVIDE_LIQUIDITY",
            "poolAddress": "0x1234567890123456789012345678901234567890",
            "minimumLiquidity": str(1000 * 10**18),
            "minimumDays": 14
        }

        verified, verification_data = await verifier.verify(
            address="0x9876543210987654321098765432109876543210",
            config=config
        )

        assert verified is True
        assert verification_data["provisionDuration"] >= 14

    @pytest.mark.asyncio
    async def test_verify_insufficient_liquidity_duration(
        self,
        mock_web3_provider,
        mock_contract_manager,
        cache_manager
    ):
        """BOUNDARY: Insufficient provision duration should fail."""
        from app.services.rwa_task.verifiers.provide_liquidity import ProvideLiquidityVerifier

        verifier = ProvideLiquidityVerifier(
            mock_web3_provider,
            mock_contract_manager,
            cache_manager
        )

        # Mock DEXPair contract
        pair_abi = []
        mock_contract_manager.load_abi = Mock(return_value=pair_abi)

        pair_contract = Mock()
        pair_contract.functions = Mock()
        pair_contract.functions.balanceOf = Mock(return_value=Mock(
            call=AsyncMock(return_value=2000 * 10**18)
        ))
        mock_web3_provider.eth = Mock()
        mock_web3_provider.eth.contract = Mock(return_value=pair_contract)

        # Mock provision time from only 5 days ago
        first_provision_time = datetime.now(UTC) - timedelta(days=5)
        mock_web3_provider.get_logs = AsyncMock(return_value=[
            {
                "blockNumber": 900000,
                "args": {
                    "timestamp": int(first_provision_time.timestamp())
                }
            }
        ])

        config = {
            "type": "PROVIDE_LIQUIDITY",
            "poolAddress": "0x1234567890123456789012345678901234567890",
            "minimumLiquidity": str(1000 * 10**18),
            "minimumDays": 14
        }

        verified, verification_data = await verifier.verify(
            address="0x9876543210987654321098765432109876543210",
            config=config
        )

        assert verified is False
        assert verification_data["provisionDuration"] < 14


class TestEarnStabilityPoolVerifier:
    """Test EARN_STABILITY_POOL task verifier."""

    @pytest.mark.asyncio
    async def test_verify_stability_pool_earnings_success(
        self,
        mock_web3_provider,
        mock_contract_manager,
        cache_manager
    ):
        """FUNCTIONAL: User earning sufficient rewards should pass."""
        from app.services.rwa_task.verifiers.earn_stability_pool import EarnStabilityPoolVerifier

        verifier = EarnStabilityPoolVerifier(
            mock_web3_provider,
            mock_contract_manager,
            cache_manager
        )

        # Mock USDPStabilityPool contract
        pool_contract = Mock()
        pool_contract.functions = Mock()
        pool_contract.functions.getClaimableReward = Mock(return_value=Mock(
            call=AsyncMock(return_value=600 * 10**18)  # 600 PAIMON claimable
        ))
        mock_contract_manager.get_contract = Mock(return_value=pool_contract)
        mock_contract_manager._get_address = Mock(return_value="0x...")

        # Mock empty claim history
        mock_web3_provider.get_logs = AsyncMock(return_value=[])

        config = {
            "type": "EARN_STABILITY_POOL",
            "targetEarnings": str(500 * 10**18),  # Target 500 PAIMON
        }

        verified, verification_data = await verifier.verify(
            address="0x1234567890123456789012345678901234567890",
            config=config
        )

        assert verified is True
        assert int(verification_data["totalEarned"]) >= int(config["targetEarnings"])

    @pytest.mark.asyncio
    async def test_verify_insufficient_earnings(
        self,
        mock_web3_provider,
        mock_contract_manager,
        cache_manager
    ):
        """BOUNDARY: Insufficient earnings should fail."""
        from app.services.rwa_task.verifiers.earn_stability_pool import EarnStabilityPoolVerifier

        verifier = EarnStabilityPoolVerifier(
            mock_web3_provider,
            mock_contract_manager,
            cache_manager
        )

        # Mock USDPStabilityPool contract with low rewards
        pool_contract = Mock()
        pool_contract.functions = Mock()
        pool_contract.functions.getClaimableReward = Mock(return_value=Mock(
            call=AsyncMock(return_value=300 * 10**18)  # Only 300 PAIMON
        ))
        mock_contract_manager.get_contract = Mock(return_value=pool_contract)
        mock_contract_manager._get_address = Mock(return_value="0x...")

        mock_web3_provider.get_logs = AsyncMock(return_value=[])

        config = {
            "type": "EARN_STABILITY_POOL",
            "targetEarnings": str(500 * 10**18),  # Target 500 PAIMON
        }

        verified, verification_data = await verifier.verify(
            address="0x1234567890123456789012345678901234567890",
            config=config
        )

        assert verified is False
        assert int(verification_data["totalEarned"]) < int(config["targetEarnings"])
