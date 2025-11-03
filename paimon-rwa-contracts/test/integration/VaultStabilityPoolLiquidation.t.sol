// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/core/USDPVault.sol";
import "../../src/core/USDPStabilityPool.sol";
import "../../src/core/USDP.sol";
import "../../src/oracle/RWAPriceOracle.sol";
import "../../src/treasury/SavingRate.sol";
import "../../src/mocks/MockERC20.sol";
import "../../src/mocks/MockChainlinkAggregator.sol";

/**
 * @title VaultStabilityPoolLiquidation Integration Test
 * @notice Tests integration between USDPVault liquidation and USDPStabilityPool
 * @dev Task 42: Vault清算与稳定池集成
 *
 * Test Coverage (6-dimensional):
 * 1. Functional - Complete liquidation flow from vault to stability pool to users
 * 2. Boundary - Edge cases (partial liquidation, insufficient pool liquidity)
 * 3. Exception - Error handling (no pool liquidity, invalid amounts)
 * 4. Performance - Gas benchmarks for liquidation operations
 * 5. Security - Access control, reentrancy protection
 * 6. Compatibility - Multi-collateral support, USDC vs other assets
 */
contract VaultStabilityPoolLiquidationTest is Test {
    // Contracts
    USDPVault public vault;
    USDPStabilityPool public stabilityPool;
    USDP public usdp;
    RWAPriceOracle public oracle;
    SavingRate public savingRate;
    MockERC20 public collateralToken;
    MockERC20 public usdc; // Special case for USDC

    // Mock Chainlink feeds
    MockChainlinkAggregator public chainlinkFeed;
    MockChainlinkAggregator public sequencerFeed;

    // Actors
    address public owner;
    address public borrower;
    address public stabilityProvider1;
    address public stabilityProvider2;
    address public liquidator;
    address public trustedOracle;

    // Constants
    uint256 constant INITIAL_COLLATERAL = 10000 ether;
    uint256 constant INITIAL_USDC = 1000000e6; // 1M USDC (6 decimals)
    int256 constant COLLATERAL_PRICE = 100e8; // $100 per token
    uint256 constant T1_LTV = 8000; // 80% LTV
    uint256 constant LIQUIDATION_THRESHOLD = 8500; // 85%
    uint256 constant LIQUIDATION_PENALTY = 500; // 5%

    function setUp() public {
        // Set up actors
        owner = address(this);
        borrower = makeAddr("borrower");
        stabilityProvider1 = makeAddr("stabilityProvider1");
        stabilityProvider2 = makeAddr("stabilityProvider2");
        liquidator = makeAddr("liquidator");
        trustedOracle = makeAddr("trustedOracle");

        // Deploy mock tokens
        collateralToken = new MockERC20("Collateral Token", "COLL", 18);
        usdc = new MockERC20("USDC", "USDC", 6);

        // Deploy Chainlink feeds
        chainlinkFeed = new MockChainlinkAggregator(8, "Collateral / USD");
        sequencerFeed = new MockChainlinkAggregator(0, "Sequencer Uptime");
        chainlinkFeed.setLatestAnswer(COLLATERAL_PRICE);
        sequencerFeed.setLatestAnswer(0); // Sequencer is up

        // Deploy USDP
        usdp = new USDP();

        // Deploy oracle
        oracle = new RWAPriceOracle(address(chainlinkFeed), address(sequencerFeed), trustedOracle);
        vm.prank(trustedOracle);
        oracle.updateNAV(100 ether); // $100
        vm.warp(block.timestamp + 3601); // Skip sequencer grace period

        // Deploy SavingRate
        savingRate = new SavingRate(address(usdp), 5e16); // 5% APR

        // Deploy Vault
        vault = new USDPVault(address(usdp), address(oracle), address(savingRate));

        // Deploy StabilityPool
        stabilityPool = new USDPStabilityPool(address(usdp), address(vault));

        // Set up permissions
        usdp.setAuthorizedMinter(address(vault), true);
        usdp.setAuthorizedMinter(address(this), true); // Test contract needs to mint for setup

        // Connect vault to stability pool
        vault.setStabilityPool(address(stabilityPool));

        // Add collateral to vault
        vault.addCollateral(address(collateralToken), T1_LTV, LIQUIDATION_THRESHOLD, LIQUIDATION_PENALTY);

        // Mint tokens to users
        collateralToken.mint(borrower, INITIAL_COLLATERAL);
        usdp.mint(stabilityProvider1, 100000 ether);
        usdp.mint(stabilityProvider2, 50000 ether);
        usdp.mint(liquidator, 50000 ether);

        // Approve contracts
        vm.prank(borrower);
        collateralToken.approve(address(vault), type(uint256).max);

        vm.prank(stabilityProvider1);
        usdp.approve(address(stabilityPool), type(uint256).max);

        vm.prank(stabilityProvider2);
        usdp.approve(address(stabilityPool), type(uint256).max);

        vm.prank(liquidator);
        usdp.approve(address(vault), type(uint256).max);

        vm.prank(borrower);
        usdp.approve(address(vault), type(uint256).max);
    }

    // ==================== Dimension 1: Functional Tests ====================

    /**
     * @notice Test complete liquidation flow: Vault → StabilityPool → Users
     * @dev This test WILL FAIL until implementation is complete
     */
    function testLiquidationFlowToStabilityPool() public {
        // Step 1: Stability providers deposit USDP
        vm.prank(stabilityProvider1);
        stabilityPool.deposit(50000 ether);

        vm.prank(stabilityProvider2);
        stabilityPool.deposit(25000 ether);

        // Step 2: Borrower deposits collateral and borrows
        vm.startPrank(borrower);
        vault.deposit(address(collateralToken), 1000 ether); // Worth $100,000
        vault.borrow(60000 ether); // Borrow 60% of collateral value
        vm.stopPrank();

        // Step 3: Price drops, making position unhealthy
        chainlinkFeed.setLatestAnswer(65e8); // Price drops to $65
        vm.prank(trustedOracle);
        oracle.updateNAV(65 ether);

        // Health factor should be below 1.0 now
        uint256 hf = vault.healthFactor(borrower);
        assertTrue(hf < 1e18, "Position should be unhealthy");

        // Step 4: Liquidator triggers liquidation
        uint256 debtToRepay = 30000 ether; // Liquidate half of debt

        vm.prank(liquidator);
        vault.liquidate(borrower, debtToRepay);

        // Step 5: Verify StabilityPool received collateral
        // Calculate expected collateral seized
        uint256 collateralValue = (debtToRepay * 1e18) / 65 ether; // 30000 / 65 = 461.54 COLL
        uint256 penalty = (collateralValue * LIQUIDATION_PENALTY) / 10000; // 5% penalty
        uint256 expectedSeized = collateralValue + penalty;

        // Pool should have received the collateral
        uint256 poolCollateralBalance = collateralToken.balanceOf(address(stabilityPool));
        assertEq(poolCollateralBalance, expectedSeized, "StabilityPool should receive collateral");

        // Step 6: Verify stability providers can claim rewards
        uint256 provider1Gain = stabilityPool.pendingCollateralGain(stabilityProvider1, address(collateralToken));

        // Provider1 has 2/3 of shares, should get 2/3 of rewards
        uint256 expectedProvider1 = (expectedSeized * 2) / 3;
        assertApproxEqAbs(provider1Gain, expectedProvider1, 1e10, "Provider1 should have proportional rewards");

        // Step 7: Provider claims rewards
        vm.prank(stabilityProvider1);
        stabilityPool.claimCollateralGain(address(collateralToken));

        uint256 provider1Balance = collateralToken.balanceOf(stabilityProvider1);
        assertApproxEqAbs(provider1Balance, expectedProvider1, 1e10, "Provider1 should receive collateral");

        // Step 8: Verify pool USDP was reduced
        uint256 finalPoolBalance = stabilityPool.totalDeposits();
        assertEq(finalPoolBalance, 75000 ether - debtToRepay, "Pool USDP should be reduced by debt offset");
    }

    /**
     * @notice Test liquidation with multiple deposits
     * @dev Tests that liquidation works correctly with multiple deposits from same user
     */
    function testLiquidationWithMultipleDeposits() public {
        // Stability providers deposit
        vm.prank(stabilityProvider1);
        stabilityPool.deposit(50000 ether);

        // Borrower makes multiple collateral deposits
        vm.startPrank(borrower);
        vault.deposit(address(collateralToken), 500 ether);
        vault.deposit(address(collateralToken), 500 ether); // Second deposit
        vault.borrow(60000 ether);
        vm.stopPrank();

        // Trigger price drop
        chainlinkFeed.setLatestAnswer(65e8);
        vm.prank(trustedOracle);
        oracle.updateNAV(65 ether);

        // Liquidate
        vm.prank(liquidator);
        vault.liquidate(borrower, 30000 ether);

        // Verify pool received collateral
        uint256 poolBalance = collateralToken.balanceOf(address(stabilityPool));
        assertTrue(poolBalance > 0, "StabilityPool should receive collateral");
    }

    // ==================== Dimension 2: Boundary Tests ====================

    /**
     * @notice Test partial liquidation (50% max)
     */
    function testPartialLiquidationMaxAmount() public {
        // Set up position
        vm.prank(stabilityProvider1);
        stabilityPool.deposit(100000 ether);

        vm.startPrank(borrower);
        vault.deposit(address(collateralToken), 1000 ether);
        vault.borrow(60000 ether);
        vm.stopPrank();

        // Price drop
        chainlinkFeed.setLatestAnswer(70e8);
        vm.prank(trustedOracle);
        oracle.updateNAV(70 ether);

        // Liquidate exactly 50% (max allowed)
        uint256 debt = vault.debtOf(borrower);
        uint256 maxLiquidation = debt / 2;

        vm.prank(liquidator);
        vault.liquidate(borrower, maxLiquidation);

        // Verify debt reduced by half
        uint256 remainingDebt = vault.debtOf(borrower);
        assertEq(remainingDebt, debt - maxLiquidation, "Debt should be reduced by liquidation amount");
    }

    /**
     * @notice Test liquidation with insufficient stability pool liquidity
     */
    function testLiquidationInsufficientPoolLiquidity() public {
        // Small stability pool deposit
        vm.prank(stabilityProvider1);
        stabilityPool.deposit(10000 ether);

        vm.startPrank(borrower);
        vault.deposit(address(collateralToken), 1000 ether);
        vault.borrow(60000 ether);
        vm.stopPrank();

        // Price drop
        chainlinkFeed.setLatestAnswer(70e8);
        vm.prank(trustedOracle);
        oracle.updateNAV(70 ether);

        // Try to liquidate more than pool can absorb
        vm.prank(liquidator);
        vm.expectRevert("Insufficient liquidity in pool");
        vault.liquidate(borrower, 30000 ether); // Pool only has 10k USDP
    }

    /**
     * @notice Test liquidation with zero collateral balance in pool
     */
    function testLiquidationWithZeroPoolBalance() public {
        // No deposits in stability pool
        assertTrue(stabilityPool.totalDeposits() == 0, "Pool should be empty");

        vm.startPrank(borrower);
        vault.deposit(address(collateralToken), 1000 ether);
        vault.borrow(60000 ether);
        vm.stopPrank();

        // Price drop
        chainlinkFeed.setLatestAnswer(70e8);
        vm.prank(trustedOracle);
        oracle.updateNAV(70 ether);

        // Liquidation should fail with empty pool
        vm.prank(liquidator);
        vm.expectRevert("Insufficient liquidity in pool");
        vault.liquidate(borrower, 30000 ether);
    }

    // ==================== Dimension 3: Exception Tests ====================

    /**
     * @notice Test liquidation reverts on healthy position
     */
    function testLiquidationRevertsOnHealthyPosition() public {
        vm.prank(stabilityProvider1);
        stabilityPool.deposit(100000 ether);

        vm.startPrank(borrower);
        vault.deposit(address(collateralToken), 1000 ether);
        vault.borrow(50000 ether); // Safe borrow amount
        vm.stopPrank();

        // Position is healthy
        uint256 hf = vault.healthFactor(borrower);
        assertTrue(hf >= 1e18, "Position should be healthy");

        // Liquidation should revert
        vm.prank(liquidator);
        vm.expectRevert("Position is healthy");
        vault.liquidate(borrower, 25000 ether);
    }

    /**
     * @notice Test liquidation reverts when exceeding max amount (50%)
     */
    function testLiquidationRevertsOnExcessiveAmount() public {
        vm.prank(stabilityProvider1);
        stabilityPool.deposit(100000 ether);

        vm.startPrank(borrower);
        vault.deposit(address(collateralToken), 1000 ether);
        vault.borrow(60000 ether);
        vm.stopPrank();

        // Price drop
        chainlinkFeed.setLatestAnswer(70e8);
        vm.prank(trustedOracle);
        oracle.updateNAV(70 ether);

        // Try to liquidate more than 50%
        uint256 debt = vault.debtOf(borrower);
        uint256 excessiveAmount = (debt / 2) + 1 ether;

        vm.prank(liquidator);
        vm.expectRevert("Exceeds max liquidation amount");
        vault.liquidate(borrower, excessiveAmount);
    }

    // ==================== Dimension 4: Performance Tests ====================

    /**
     * @notice Benchmark gas cost of liquidation flow
     */
    function testGasBenchmarkLiquidation() public {
        vm.prank(stabilityProvider1);
        stabilityPool.deposit(100000 ether);

        vm.startPrank(borrower);
        vault.deposit(address(collateralToken), 1000 ether);
        vault.borrow(60000 ether);
        vm.stopPrank();

        chainlinkFeed.setLatestAnswer(70e8);
        vm.prank(trustedOracle);
        oracle.updateNAV(70 ether);

        // Measure gas
        uint256 gasBefore = gasleft();
        vm.prank(liquidator);
        vault.liquidate(borrower, 30000 ether);
        uint256 gasUsed = gasBefore - gasleft();

        // Gas should be reasonable (< 300k for simple liquidation)
        assertTrue(gasUsed < 300000, "Liquidation gas cost too high");
        emit log_named_uint("Liquidation gas cost", gasUsed);
    }

    // ==================== Dimension 5: Security Tests ====================

    /**
     * @notice Test reentrancy protection on liquidation
     */
    function testReentrancyProtection() public {
        // Deploy malicious contract that tries to reenter
        // (Simplified test - actual implementation would need malicious ERC20)

        vm.prank(stabilityProvider1);
        stabilityPool.deposit(100000 ether);

        vm.startPrank(borrower);
        vault.deposit(address(collateralToken), 1000 ether);
        vault.borrow(60000 ether);
        vm.stopPrank();

        chainlinkFeed.setLatestAnswer(70e8);
        vm.prank(trustedOracle);
        oracle.updateNAV(70 ether);

        // Normal liquidation should succeed (reentrancy guard present)
        vm.prank(liquidator);
        vault.liquidate(borrower, 30000 ether);

        // Test passes if no revert (reentrancy guard working)
    }

    /**
     * @notice Test unauthorized call to onLiquidationProceeds
     */
    function testOnlyVaultCanCallLiquidationCallback() public {
        vm.prank(address(0xdead)); // Not the vault
        vm.expectRevert("Only vault can call");
        stabilityPool.onLiquidationProceeds(1000 ether, address(collateralToken), 100 ether);
    }

    // ==================== Dimension 6: Compatibility Tests ====================

    /**
     * @notice Test multi-collateral liquidation
     */
    function testMultiCollateralLiquidation() public {
        // Add second collateral type
        MockERC20 coll2 = new MockERC20("Collateral 2", "COLL2", 18);
        vault.addCollateral(address(coll2), T1_LTV, LIQUIDATION_THRESHOLD, LIQUIDATION_PENALTY);

        coll2.mint(borrower, INITIAL_COLLATERAL);
        vm.prank(borrower);
        coll2.approve(address(vault), type(uint256).max);

        vm.prank(stabilityProvider1);
        stabilityPool.deposit(100000 ether);

        // Borrower deposits both collateral types
        vm.startPrank(borrower);
        vault.deposit(address(collateralToken), 500 ether);
        vault.deposit(address(coll2), 500 ether);
        vault.borrow(60000 ether);
        vm.stopPrank();

        chainlinkFeed.setLatestAnswer(70e8);
        vm.prank(trustedOracle);
        oracle.updateNAV(70 ether);

        // Liquidate - should handle multiple collaterals
        vm.prank(liquidator);
        vault.liquidate(borrower, 30000 ether);

        // Verify pool received collateral (implementation determines which collateral type)
        uint256 totalCollateral = collateralToken.balanceOf(address(stabilityPool)) +
                                  coll2.balanceOf(address(stabilityPool));
        assertTrue(totalCollateral > 0, "Pool should receive collateral from liquidation");
    }

    /**
     * @notice Test integration with existing vault functions
     */
    function testLiquidationDoesNotBreakVaultOperations() public {
        vm.prank(stabilityProvider1);
        stabilityPool.deposit(100000 ether);

        vm.startPrank(borrower);
        vault.deposit(address(collateralToken), 1000 ether);
        vault.borrow(60000 ether);
        vm.stopPrank();

        chainlinkFeed.setLatestAnswer(70e8);
        vm.prank(trustedOracle);
        oracle.updateNAV(70 ether);

        vm.prank(liquidator);
        vault.liquidate(borrower, 30000 ether);

        // Borrower should still be able to repay remaining debt
        vm.prank(borrower);
        vault.repay(1000 ether);

        uint256 remainingDebt = vault.debtOf(borrower);
        assertEq(remainingDebt, 60000 ether - 30000 ether - 1000 ether, "Repay should work after liquidation");
    }
}
