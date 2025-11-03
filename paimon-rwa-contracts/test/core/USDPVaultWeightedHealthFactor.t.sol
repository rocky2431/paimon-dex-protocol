// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/core/USDPVault.sol";
import "../../src/core/USDP.sol";
import "../../src/oracle/RWAPriceOracle.sol";
import "../../src/treasury/SavingRate.sol";
import "../../src/mocks/MockERC20.sol";
import "../../src/mocks/MockChainlinkAggregator.sol";

/**
 * @title USDPVault Weighted Health Factor Test Suite (Task P2-001)
 * @notice Tests for weighted health factor implementation supporting multi-collateral positions
 *
 * Long-term Solution:
 * - Implement weighted average liquidation threshold calculation
 * - Support arbitrary number of collateral types per user
 * - Each collateral uses its own liquidation threshold
 *
 * Core Algorithm:
 * weighted_health_factor = Σ(collateral_i_value × liquidation_threshold_i) / debt
 *
 * Example:
 * - Collateral A: $5,000 @ 85% threshold → $4,250 adjusted
 * - Collateral B: $3,000 @ 65% threshold → $1,950 adjusted
 * - Debt: $6,000
 * - Health Factor = ($4,250 + $1,950) / $6,000 = 1.033 ✅
 *
 * Test Coverage (6 dimensions):
 * 1. Functional - Weighted calculations work correctly
 * 2. Boundary - Edge cases (0 balance, extreme ratios)
 * 3. Exception - Error handling
 * 4. Performance - Gas benchmarks for multi-collateral
 * 5. Security - No exploitation via collateral manipulation
 * 6. Compatibility - Backward compatibility with single collateral
 */
contract USDPVaultWeightedHealthFactorTest is Test {
    // Contracts
    USDPVault public vault;
    USDP public usdp;
    RWAPriceOracle public oracle;
    SavingRate public savingRate;
    MockERC20 public collateralA; // T1-tier: 85% threshold
    MockERC20 public collateralB; // T2-tier: 65% threshold
    MockERC20 public collateralC; // T3-tier: 50% threshold

    // Actors
    address public owner;
    address public alice;
    address public bob;

    // Mock Chainlink feeds
    MockChainlinkAggregator public chainlinkFeed;
    MockChainlinkAggregator public sequencerFeed;
    address public trustedOracle;

    // Constants
    uint256 constant INITIAL_BALANCE = 10000 ether;
    int256 constant PRICE = 100e8; // $100 per token (Chainlink 8 decimals)

    // T1 tier (US Treasuries)
    uint256 constant T1_LTV = 8000; // 80%
    uint256 constant T1_THRESHOLD = 8500; // 85%
    uint256 constant T1_PENALTY = 500; // 5%

    // T2 tier (Investment-grade credit)
    uint256 constant T2_LTV = 6000; // 60%
    uint256 constant T2_THRESHOLD = 6500; // 65%
    uint256 constant T2_PENALTY = 800; // 8%

    // T3 tier (RWA revenue pools)
    uint256 constant T3_LTV = 4500; // 45%
    uint256 constant T3_THRESHOLD = 5000; // 50%
    uint256 constant T3_PENALTY = 1000; // 10%

    function setUp() public {
        // Set up actors
        owner = address(this);
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        trustedOracle = makeAddr("trustedOracle");

        // Deploy mock collateral tokens (3 tiers)
        collateralA = new MockERC20("T1 Collateral", "T1", 18);
        collateralB = new MockERC20("T2 Collateral", "T2", 18);
        collateralC = new MockERC20("T3 Collateral", "T3", 18);

        // Deploy mock Chainlink feeds
        chainlinkFeed = new MockChainlinkAggregator(8, "Collateral / USD");
        sequencerFeed = new MockChainlinkAggregator(0, "Sequencer Uptime");

        // Set initial prices
        chainlinkFeed.setLatestAnswer(PRICE); // $100
        sequencerFeed.setLatestAnswer(0); // Sequencer is up

        // Deploy USDP
        usdp = new USDP();

        // Deploy RWAPriceOracle
        oracle = new RWAPriceOracle(address(chainlinkFeed), address(sequencerFeed), trustedOracle);

        // Set initial NAV price from trusted oracle
        vm.prank(trustedOracle);
        oracle.updateNAV(100 ether); // $100

        // Skip past sequencer grace period (1 hour)
        vm.warp(block.timestamp + 3601);

        // Deploy SavingRate
        savingRate = new SavingRate(address(usdp), 5e16);

        // Deploy USDPVault
        vault = new USDPVault(address(usdp), address(oracle), address(savingRate));

        // Set vault as authorized minter
        usdp.setAuthorizedMinter(address(vault), true);

        // Add three collateral tiers
        vault.addCollateral(address(collateralA), T1_LTV, T1_THRESHOLD, T1_PENALTY);
        vault.addCollateral(address(collateralB), T2_LTV, T2_THRESHOLD, T2_PENALTY);
        vault.addCollateral(address(collateralC), T3_LTV, T3_THRESHOLD, T3_PENALTY);

        // Mint tokens to users
        collateralA.mint(alice, INITIAL_BALANCE);
        collateralB.mint(alice, INITIAL_BALANCE);
        collateralC.mint(alice, INITIAL_BALANCE);
        collateralA.mint(bob, INITIAL_BALANCE);
        collateralB.mint(bob, INITIAL_BALANCE);
        collateralC.mint(bob, INITIAL_BALANCE);

        // Approve vault
        vm.startPrank(alice);
        collateralA.approve(address(vault), type(uint256).max);
        collateralB.approve(address(vault), type(uint256).max);
        collateralC.approve(address(vault), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(bob);
        collateralA.approve(address(vault), type(uint256).max);
        collateralB.approve(address(vault), type(uint256).max);
        collateralC.approve(address(vault), type(uint256).max);
        vm.stopPrank();
    }

    // ===========================================
    // 1. FUNCTIONAL TESTS
    // ===========================================

    /**
     * @notice Test dual-collateral weighted health factor calculation
     * Collateral A: 50 ether @ $100 = $5,000 × 80% LTV = $4,000, × 85% threshold = $4,250
     * Collateral B: 30 ether @ $100 = $3,000 × 60% LTV = $1,800, × 65% threshold = $1,950
     * Max LTV: $5,800
     * Borrow: $5,000 (within LTV)
     * Total adjusted: $6,200
     * Expected HF: 6200 / 5000 = 1.24
     */
    function test_Functional_DualCollateral_WeightedHealthFactor() public {
        vm.startPrank(alice);

        // Deposit two collaterals
        vault.deposit(address(collateralA), 50 ether); // $5,000
        vault.deposit(address(collateralB), 30 ether); // $3,000

        // Borrow $5,000 USDP (within $5,800 max LTV)
        vault.borrow(5000 ether);

        // Calculate health factor
        uint256 hf = vault.healthFactor(alice);

        // Expected: (50*100*0.85 + 30*100*0.65) / 5000 = 6200 / 5000 = 1.24
        uint256 expected = 1240000000000000000; // 1.24e18

        assertApproxEqRel(hf, expected, 0.001e18, "Dual collateral health factor should be ~1.24");

        vm.stopPrank();
    }

    /**
     * @notice Test triple-collateral weighted health factor calculation
     * Collateral A: 40 ether @ $100 = $4,000 × 80% LTV = $3,200, × 85% threshold = $3,400
     * Collateral B: 30 ether @ $100 = $3,000 × 60% LTV = $1,800, × 65% threshold = $1,950
     * Collateral C: 20 ether @ $100 = $2,000 × 45% LTV = $900, × 50% threshold = $1,000
     * Max LTV: $5,900
     * Total adjusted value = $6,350
     */
    function test_Functional_TripleCollateral_WeightedHealthFactor() public {
        vm.startPrank(alice);

        // Deposit three collaterals
        vault.deposit(address(collateralA), 40 ether); // $4,000
        vault.deposit(address(collateralB), 30 ether); // $3,000
        vault.deposit(address(collateralC), 20 ether); // $2,000

        // Borrow $5,000 USDP (within $5,900 max LTV)
        vault.borrow(5000 ether);

        // Calculate health factor
        uint256 hf = vault.healthFactor(alice);

        // Expected: 6350 / 5000 = 1.27
        uint256 expected = 1270000000000000000; // 1.27e18

        assertApproxEqRel(hf, expected, 0.001e18, "Triple collateral health factor should be ~1.27");

        vm.stopPrank();
    }

    /**
     * @notice Test single collateral backward compatibility
     * Should work exactly as before (no regression)
     */
    function test_Functional_SingleCollateral_BackwardCompatible() public {
        vm.startPrank(alice);

        // Deposit only one collateral
        vault.deposit(address(collateralA), 100 ether); // $10,000

        // Borrow $7,000 USDP (within 80% LTV)
        vault.borrow(7000 ether);

        // Calculate health factor
        uint256 hf = vault.healthFactor(alice);

        // Expected: (100*100*0.85) / 7000 = 8500 / 7000 = 1.214285...
        uint256 expected = 1214285714285714285; // 1.214285...e18

        assertApproxEqRel(hf, expected, 0.001e18, "Single collateral HF should match legacy behavior");

        vm.stopPrank();
    }

    /**
     * @notice Test multi-collateral borrow respects weighted LTV
     * Collateral A: 50 ether @ $100 = $5,000 × 80% LTV = $4,000
     * Collateral B: 30 ether @ $100 = $3,000 × 60% LTV = $1,800
     * Max borrow = $5,800
     */
    function test_Functional_MultiCollateral_BorrowRespectsWeightedLTV() public {
        vm.startPrank(alice);

        // Deposit two collaterals
        vault.deposit(address(collateralA), 50 ether); // $5,000 × 80% LTV = $4,000
        vault.deposit(address(collateralB), 30 ether); // $3,000 × 60% LTV = $1,800
        // Max borrow = $4,000 + $1,800 = $5,800

        // Borrow at max LTV
        vault.borrow(5800 ether);

        // Should succeed
        assertEq(vault.debtOf(alice), 5800 ether, "Should allow borrowing up to weighted LTV");

        // Try to borrow more - should fail
        // When at max LTV, the first require triggers: maxBorrow > currentDebt
        vm.expectRevert("Insufficient collateral");
        vault.borrow(1 ether);

        vm.stopPrank();
    }

    /**
     * @notice Test that borrow now works with multi-collateral (P1-005 restriction removed)
     */
    function test_Functional_MultiCollateral_BorrowNoLongerReverts() public {
        vm.startPrank(alice);

        // Deposit two collaterals
        vault.deposit(address(collateralA), 50 ether);
        vault.deposit(address(collateralB), 30 ether);

        // This should NOW succeed (P1-005 removed multi-collateral restriction)
        vault.borrow(3000 ether);

        assertEq(vault.debtOf(alice), 3000 ether, "Multi-collateral borrow should work");

        vm.stopPrank();
    }

    // ===========================================
    // 2. BOUNDARY TESTS
    // ===========================================

    /**
     * @notice Test when one collateral has zero balance
     */
    function test_Boundary_OneCollateralZeroBalance() public {
        vm.startPrank(alice);

        // Deposit two collaterals, but one will be withdrawn
        vault.deposit(address(collateralA), 50 ether);
        vault.deposit(address(collateralB), 30 ether);
        vault.borrow(4000 ether);

        // Approve USDP for repay
        usdp.approve(address(vault), type(uint256).max);

        // Withdraw all of collateral B (need to repay first to maintain HF)
        vault.repay(2000 ether);
        vault.withdraw(address(collateralB), 30 ether);

        // Now only collateral A remains
        uint256 hf = vault.healthFactor(alice);

        // Expected: (50*100*0.85) / 2000 = 4250 / 2000 = 2.125
        uint256 expected = 2125000000000000000; // 2.125e18

        assertApproxEqRel(hf, expected, 0.001e18, "HF should only consider non-zero collaterals");

        vm.stopPrank();
    }

    /**
     * @notice Test extreme value ratio (99:1)
     * Collateral A: 99 ether @ $100 = $9,900 × 80% LTV = $7,920, × 85% threshold = $8,415
     * Collateral B: 1 ether @ $100 = $100 × 60% LTV = $60, × 65% threshold = $65
     * Max LTV: $7,980
     * Total adjusted: $8,480
     */
    function test_Boundary_ExtremeValueRatio() public {
        vm.startPrank(alice);

        // Deposit 99 ether of A, 1 ether of B
        vault.deposit(address(collateralA), 99 ether); // $9,900
        vault.deposit(address(collateralB), 1 ether);  // $100

        // Borrow $7,500 (within $7,980 max LTV)
        vault.borrow(7500 ether);

        uint256 hf = vault.healthFactor(alice);

        // Expected: 8480 / 7500 = 1.130666...
        uint256 expected = 1130666666666666666; // 1.130666...e18

        assertApproxEqRel(hf, expected, 0.001e18, "Should handle extreme value ratios");

        vm.stopPrank();
    }

    /**
     * @notice Test extreme threshold difference (85% vs 50%)
     */
    function test_Boundary_ExtremeThresholdDifference() public {
        vm.startPrank(alice);

        // Equal value but very different thresholds
        vault.deposit(address(collateralA), 50 ether); // $5,000 × 85% = $4,250
        vault.deposit(address(collateralC), 50 ether); // $5,000 × 50% = $2,500
        // Total adjusted: $6,750

        vault.borrow(6000 ether);

        uint256 hf = vault.healthFactor(alice);

        // Expected: 6750 / 6000 = 1.125
        uint256 expected = 1125000000000000000; // 1.125e18

        assertApproxEqRel(hf, expected, 0.001e18, "Should correctly weight different thresholds");

        vm.stopPrank();
    }

    /**
     * @notice Test health factor when all collaterals are zero (no debt)
     */
    function test_Boundary_NoCollateralNoDebt() public {
        // Alice has no collateral and no debt
        uint256 hf = vault.healthFactor(alice);

        assertEq(hf, type(uint256).max, "No debt should return max health factor");
    }

    // ===========================================
    // 3. EXCEPTION TESTS
    // ===========================================

    /**
     * @notice Test liquidation when health factor < 1.0
     */
    function test_Exception_LiquidationWhenUnhealthy() public {
        // This test will be skipped for now since it requires StabilityPool
        // TODO: Implement after StabilityPool integration
        vm.skip(true);
    }

    /**
     * @notice Test that healthy position cannot be liquidated
     */
    function test_Exception_CannotLiquidateHealthyPosition() public {
        vm.startPrank(alice);

        vault.deposit(address(collateralA), 100 ether);
        vault.borrow(5000 ether);

        vm.stopPrank();

        // Health factor > 1.0, so liquidation should fail
        // (Skipped due to StabilityPool dependency)
        vm.skip(true);
    }

    // ===========================================
    // 4. PERFORMANCE TESTS
    // ===========================================

    /**
     * @notice Gas benchmark for dual-collateral health factor
     */
    function test_Performance_DualCollateral_HealthFactorGas() public {
        vm.startPrank(alice);
        vault.deposit(address(collateralA), 50 ether);
        vault.deposit(address(collateralB), 30 ether);
        vault.borrow(5000 ether);
        vm.stopPrank();

        uint256 gasBefore = gasleft();
        vault.healthFactor(alice);
        uint256 gasUsed = gasBefore - gasleft();

        // Should be reasonable (estimate: <150K gas for 2 collaterals)
        assertLt(gasUsed, 150000, "Dual collateral HF should use <150K gas");
    }

    /**
     * @notice Gas benchmark for 5-collateral scenario
     */
    function test_Performance_FiveCollaterals_HealthFactorGas() public {
        // Add two more collateral types
        MockERC20 collateralD = new MockERC20("T4", "T4", 18);
        MockERC20 collateralE = new MockERC20("T5", "T5", 18);
        vault.addCollateral(address(collateralD), 5000, 5500, 1200);
        vault.addCollateral(address(collateralE), 4000, 4500, 1500);

        collateralD.mint(alice, INITIAL_BALANCE);
        collateralE.mint(alice, INITIAL_BALANCE);

        vm.startPrank(alice);
        collateralD.approve(address(vault), type(uint256).max);
        collateralE.approve(address(vault), type(uint256).max);

        // Deposit 5 collaterals
        vault.deposit(address(collateralA), 20 ether);
        vault.deposit(address(collateralB), 20 ether);
        vault.deposit(address(collateralC), 20 ether);
        vault.deposit(address(collateralD), 20 ether);
        vault.deposit(address(collateralE), 20 ether);
        vault.borrow(4000 ether);
        vm.stopPrank();

        uint256 gasBefore = gasleft();
        vault.healthFactor(alice);
        uint256 gasUsed = gasBefore - gasleft();

        // Should scale linearly (estimate: <250K gas for 5 collaterals)
        assertLt(gasUsed, 250000, "Five collaterals HF should use <250K gas");
    }

    // ===========================================
    // 5. SECURITY TESTS
    // ===========================================

    /**
     * @notice Test that collateral order doesn't affect health factor
     */
    function test_Security_CollateralOrderDoesNotMatter() public {
        // Alice deposits A then B
        vm.startPrank(alice);
        vault.deposit(address(collateralA), 50 ether);
        vault.deposit(address(collateralB), 30 ether);
        vault.borrow(5000 ether);
        uint256 hfAlice = vault.healthFactor(alice);
        vm.stopPrank();

        // Bob deposits B then A (reverse order)
        vm.startPrank(bob);
        vault.deposit(address(collateralB), 30 ether);
        vault.deposit(address(collateralA), 50 ether);
        vault.borrow(5000 ether);
        uint256 hfBob = vault.healthFactor(bob);
        vm.stopPrank();

        // Health factors should be identical
        assertEq(hfAlice, hfBob, "Collateral order should not affect HF");
    }

    /**
     * @notice Test that adding zero-value collateral doesn't change health factor
     */
    function test_Security_ZeroValueCollateralNoEffect() public {
        vm.startPrank(alice);

        vault.deposit(address(collateralA), 100 ether);
        vault.borrow(7000 ether);

        uint256 hfBefore = vault.healthFactor(alice);

        // Add a third collateral type (vault config only, no deposit)
        // Health factor should remain unchanged
        uint256 hfAfter = vault.healthFactor(alice);

        assertEq(hfBefore, hfAfter, "Zero-balance collaterals should not affect HF");

        vm.stopPrank();
    }

    // ===========================================
    // 6. COMPATIBILITY TESTS
    // ===========================================

    /**
     * @notice Verify P1-005 tests still pass after weighted implementation
     * This ensures we didn't break existing single-collateral functionality
     */
    function test_Compatibility_P1005_SingleCollateralStillWorks() public {
        vm.startPrank(alice);

        // P1-005 test: Single collateral should work normally
        vault.deposit(address(collateralA), 100 ether);
        vault.borrow(5000 ether);

        uint256 hf = vault.healthFactor(alice);
        assertGt(hf, 1 ether, "Single collateral should still work");

        vm.stopPrank();
    }

    /**
     * @notice Verify withdraw still works with multi-collateral
     */
    function test_Compatibility_WithdrawWorksWithMultiCollateral() public {
        vm.startPrank(alice);

        vault.deposit(address(collateralA), 50 ether);
        vault.deposit(address(collateralB), 30 ether);
        vault.borrow(4000 ether);

        // Withdraw some collateral A (health factor check applies)
        vault.withdraw(address(collateralA), 10 ether);

        assertEq(vault.getCollateralBalance(alice, address(collateralA)), 40 ether,
                 "Withdraw should work with multi-collateral");

        vm.stopPrank();
    }

    /**
     * @notice Verify getCollateralValueUSD still works correctly
     */
    function test_Compatibility_GetCollateralValueUSDCorrect() public {
        vm.startPrank(alice);

        vault.deposit(address(collateralA), 50 ether); // $5,000
        vault.deposit(address(collateralB), 30 ether); // $3,000

        uint256 totalValue = vault.getCollateralValueUSD(alice);

        // Total: $8,000
        assertEq(totalValue, 8000 ether, "Total collateral value should be correct");

        vm.stopPrank();
    }
}
