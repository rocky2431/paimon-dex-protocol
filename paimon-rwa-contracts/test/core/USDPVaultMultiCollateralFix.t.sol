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
 * @title USDPVault Multi-Collateral Fix Test Suite (Task P1-005)
 * @notice Tests for multi-collateral support short-term fix
 *
 * Problem: USDPVault uses collaterals[0] for valuation when multiple collaterals exist,
 *          leading to incorrect calculations.
 *
 * Short-term Solution:
 * - Detect multiple collaterals and revert with clear error message
 * - Document that only single collateral is currently supported
 *
 * Test Coverage (6 dimensions):
 * 1. Functional - Single collateral works, multiple collaterals revert
 * 2. Boundary - Edge cases with 0, 1, 2+ collaterals
 * 3. Exception - Proper error messages for unsupported scenarios
 * 4. Performance - Minimal gas overhead for the check
 * 5. Security - No way to bypass the restriction
 * 6. Compatibility - Existing single-collateral tests still pass
 */
contract USDPVaultMultiCollateralFixTest is Test {
    // Contracts
    USDPVault public vault;
    USDP public usdp;
    RWAPriceOracle public oracle;
    SavingRate public savingRate;
    MockERC20 public collateralToken;
    MockERC20 public secondCollateral;

    // Actors
    address public owner;
    address public alice;
    address public bob;
    address public liquidator;
    address public trustedOracle;

    // Mock Chainlink feeds
    MockChainlinkAggregator public chainlinkFeed;
    MockChainlinkAggregator public sequencerFeed;

    // Constants
    uint256 constant INITIAL_COLLATERAL = 10000 ether;
    int256 constant COLLATERAL_PRICE = 100e8; // $100 per token (Chainlink 8 decimals)
    uint256 constant T1_LTV = 8000; // 80% LTV
    uint256 constant LIQUIDATION_THRESHOLD = 8500; // 85%
    uint256 constant LIQUIDATION_PENALTY = 500; // 5%

    function setUp() public {
        // Set up actors
        owner = address(this);
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        liquidator = makeAddr("liquidator");
        trustedOracle = makeAddr("trustedOracle");

        // Deploy mock collateral tokens
        collateralToken = new MockERC20("Collateral Token", "COLL", 18);
        secondCollateral = new MockERC20("Second Collateral", "COLL2", 18);

        // Deploy mock Chainlink feeds
        chainlinkFeed = new MockChainlinkAggregator(8, "Collateral / USD");
        sequencerFeed = new MockChainlinkAggregator(0, "Sequencer Uptime");

        // Set initial prices
        chainlinkFeed.setLatestAnswer(COLLATERAL_PRICE); // $100
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

        // Deploy SavingRate (5% annual rate)
        savingRate = new SavingRate(address(usdp), 5e16);

        // Deploy USDPVault
        vault = new USDPVault(address(usdp), address(oracle), address(savingRate));

        // Set vault as authorized minter in USDP
        usdp.setAuthorizedMinter(address(vault), true);

        // Add first collateral
        vault.addCollateral(address(collateralToken), T1_LTV, LIQUIDATION_THRESHOLD, LIQUIDATION_PENALTY);

        // Mint collateral tokens to users
        collateralToken.mint(alice, INITIAL_COLLATERAL);
        collateralToken.mint(bob, INITIAL_COLLATERAL);
        collateralToken.mint(liquidator, INITIAL_COLLATERAL);
        secondCollateral.mint(alice, INITIAL_COLLATERAL);
        secondCollateral.mint(bob, INITIAL_COLLATERAL);

        // Approve vault to spend collateral
        vm.prank(alice);
        collateralToken.approve(address(vault), type(uint256).max);
        vm.prank(alice);
        secondCollateral.approve(address(vault), type(uint256).max);

        vm.prank(bob);
        collateralToken.approve(address(vault), type(uint256).max);
        vm.prank(bob);
        secondCollateral.approve(address(vault), type(uint256).max);

        vm.prank(liquidator);
        collateralToken.approve(address(vault), type(uint256).max);
    }

    // ===========================================
    // 1. FUNCTIONAL TESTS
    // ===========================================

    /**
     * @notice Baseline: Single collateral should work normally
     */
    function test_Functional_SingleCollateralWorksNormally() public {
        vm.startPrank(alice);

        // Deposit single collateral
        vault.deposit(address(collateralToken), 100 ether);

        // Borrow (triggers health factor check)
        vault.borrow(5000 ether);

        // Check health factor works
        uint256 hf = vault.healthFactor(alice);
        assertGt(hf, 1 ether, "Health factor should be > 1.0");

        vm.stopPrank();
    }

    /**
     * @notice Multiple collaterals: healthFactor() should revert
     */
    function test_Functional_MultiCollateralHealthFactorReverts() public {
        vm.startPrank(alice);

        // First, deposit single collateral and borrow
        vault.deposit(address(collateralToken), 100 ether);
        vault.borrow(5000 ether);

        vm.stopPrank();

        // Add second collateral type
        vault.addCollateral(address(secondCollateral), 6000, 6500, 1000);

        // Now deposit second collateral (creating multi-collateral position with debt)
        vm.prank(alice);
        vault.deposit(address(secondCollateral), 50 ether);

        // Health factor should revert with multi-collateral error
        vm.expectRevert("Multi-collateral not supported");
        vault.healthFactor(alice);
    }

    /**
     * @notice Multiple collaterals: borrow() should revert (uses health factor check)
     */
    function test_Functional_MultiCollateralBorrowReverts() public {
        // Add second collateral type
        vault.addCollateral(address(secondCollateral), 6000, 6500, 1000);

        vm.startPrank(alice);

        // Deposit both collaterals
        vault.deposit(address(collateralToken), 50 ether);
        vault.deposit(address(secondCollateral), 50 ether);

        // Attempt to borrow should revert
        vm.expectRevert("Multi-collateral not supported");
        vault.borrow(3000 ether);

        vm.stopPrank();
    }

    /**
     * @notice Multiple collaterals: Withdraw still works (doesn't depend on health factor)
     */
    function test_Functional_MultiCollateralWithdrawWorks() public {
        vault.addCollateral(address(secondCollateral), 6000, 6500, 1000);

        vm.startPrank(alice);

        // Deposit both collaterals
        vault.deposit(address(collateralToken), 100 ether);
        vault.deposit(address(secondCollateral), 50 ether);

        // Withdraw should still work (doesn't check health factor when no debt)
        vault.withdraw(address(collateralToken), 25 ether);

        assertEq(vault.getCollateralBalance(alice, address(collateralToken)), 75 ether,
                 "Withdraw should work with multi-collateral when no debt");

        vm.stopPrank();
    }

    // ===========================================
    // 2. BOUNDARY TESTS
    // ===========================================

    /**
     * @notice Edge case: Zero collaterals deposited (should handle gracefully)
     */
    function test_Boundary_ZeroCollaterals() public {
        // Health factor with no collateral and no debt
        uint256 hf = vault.healthFactor(alice);
        assertEq(hf, type(uint256).max, "Health factor should be max with no debt");
    }

    /**
     * @notice Edge case: Exactly one collateral type (should work)
     */
    function test_Boundary_ExactlyOneCollateral() public {
        vm.startPrank(alice);
        vault.deposit(address(collateralToken), 100 ether);
        vault.borrow(5000 ether);

        uint256 hf = vault.healthFactor(alice);
        assertGt(hf, 1 ether, "Health factor should be valid with single collateral");

        vm.stopPrank();
    }

    /**
     * @notice Edge case: Exactly two collateral types (should revert)
     */
    function test_Boundary_ExactlyTwoCollaterals() public {
        vm.startPrank(alice);
        // Single collateral first
        vault.deposit(address(collateralToken), 100 ether);
        vault.borrow(5000 ether);
        vm.stopPrank();

        // Add and deposit second collateral
        vault.addCollateral(address(secondCollateral), 6000, 6500, 1000);
        vm.prank(alice);
        vault.deposit(address(secondCollateral), 50 ether);

        vm.expectRevert("Multi-collateral not supported");
        vault.healthFactor(alice);
    }

    /**
     * @notice Edge case: Add second collateral but don't deposit (should still work)
     */
    function test_Boundary_SecondCollateralAddedButNotDeposited() public {
        vault.addCollateral(address(secondCollateral), 6000, 6500, 1000);

        vm.startPrank(alice);
        // Only deposit first collateral
        vault.deposit(address(collateralToken), 100 ether);
        vault.borrow(5000 ether);

        // Should work fine since user only has one collateral type
        uint256 hf = vault.healthFactor(alice);
        assertGt(hf, 1 ether, "Health factor should work with single active collateral");

        vm.stopPrank();
    }

    // ===========================================
    // 3. EXCEPTION TESTS
    // ===========================================

    /**
     * @notice Error message clarity: Verify exact error message
     */
    function test_Exception_ErrorMessageIsCorrect() public {
        vm.startPrank(alice);
        vault.deposit(address(collateralToken), 100 ether);
        vault.borrow(5000 ether);
        vm.stopPrank();

        vault.addCollateral(address(secondCollateral), 6000, 6500, 1000);
        vm.prank(alice);
        vault.deposit(address(secondCollateral), 50 ether);

        // Verify exact error message
        vm.expectRevert(bytes("Multi-collateral not supported"));
        vault.healthFactor(alice);
    }

    /**
     * @notice Withdraw one collateral to go back to single collateral
     */
    function test_Exception_WithdrawToSingleCollateralWorks() public {
        vault.addCollateral(address(secondCollateral), 6000, 6500, 1000);

        vm.startPrank(alice);
        vault.deposit(address(collateralToken), 100 ether);
        vault.deposit(address(secondCollateral), 50 ether);

        // Health factor should revert with two collaterals
        vm.expectRevert("Multi-collateral not supported");
        vault.healthFactor(alice);

        // Withdraw all of second collateral
        vault.withdraw(address(secondCollateral), 50 ether);

        // Now health factor should work (only one collateral remains)
        uint256 hf = vault.healthFactor(alice);
        assertEq(hf, type(uint256).max, "Health factor should work with single collateral");

        vm.stopPrank();
    }

    // ===========================================
    // 4. PERFORMANCE TESTS
    // ===========================================

    /**
     * @notice Gas benchmark: Single collateral health factor
     */
    function test_Performance_SingleCollateralHealthFactorGas() public {
        vm.startPrank(alice);
        vault.deposit(address(collateralToken), 100 ether);
        vault.borrow(5000 ether);
        vm.stopPrank();

        uint256 gasBefore = gasleft();
        vault.healthFactor(alice);
        uint256 gasUsed = gasBefore - gasleft();

        // Should be reasonable gas cost
        assertLt(gasUsed, 100000, "Health factor should use < 100K gas");
    }

    /**
     * @notice Gas benchmark: Multi-collateral check should have minimal overhead
     */
    function test_Performance_MultiCollateralCheckMinimalOverhead() public {
        vm.startPrank(alice);
        vault.deposit(address(collateralToken), 100 ether);
        vault.borrow(5000 ether);
        vm.stopPrank();

        vault.addCollateral(address(secondCollateral), 6000, 6500, 1000);
        vm.prank(alice);
        vault.deposit(address(secondCollateral), 50 ether);

        uint256 gasBefore = gasleft();
        try vault.healthFactor(alice) {
            // Should revert before reaching here
            fail("Should have reverted");
        } catch {
            uint256 gasUsed = gasBefore - gasleft();
            // Check should be fast (just counting collaterals)
            assertLt(gasUsed, 50000, "Multi-collateral check should use < 50K gas");
        }
    }

    // ===========================================
    // 5. SECURITY TESTS
    // ===========================================

    /**
     * @notice Security: Cannot bypass restriction by manipulating order
     */
    function test_Security_CannotBypassWithOrderManipulation() public {
        vm.startPrank(alice);
        vault.deposit(address(collateralToken), 100 ether);
        vault.borrow(5000 ether);
        vm.stopPrank();

        vault.addCollateral(address(secondCollateral), 6000, 6500, 1000);

        // Try depositing second collateral in different order
        vm.prank(alice);
        vault.deposit(address(secondCollateral), 50 ether);

        // Should still revert
        vm.expectRevert("Multi-collateral not supported");
        vault.healthFactor(alice);
    }

    /**
     * @notice Security: Cannot bypass by using very small amounts
     */
    function test_Security_CannotBypassWithSmallAmounts() public {
        vm.startPrank(alice);
        vault.deposit(address(collateralToken), 100 ether);
        vault.borrow(5000 ether);
        vm.stopPrank();

        vault.addCollateral(address(secondCollateral), 6000, 6500, 1000);

        vm.prank(alice);
        vault.deposit(address(secondCollateral), 1 wei); // Tiny amount

        // Should still revert even with tiny amount
        vm.expectRevert("Multi-collateral not supported");
        vault.healthFactor(alice);
    }

    // ===========================================
    // 6. COMPATIBILITY TESTS
    // ===========================================

    /**
     * @notice Compatibility: getCollateralValueUSD still works with multiple collaterals
     */
    function test_Compatibility_GetCollateralValueUSDWorksWithMultiCollateral() public {
        vault.addCollateral(address(secondCollateral), 6000, 6500, 1000);

        vm.startPrank(alice);
        vault.deposit(address(collateralToken), 50 ether);
        vault.deposit(address(secondCollateral), 50 ether);
        vm.stopPrank();

        // This function should still work (it correctly sums all collaterals)
        uint256 totalValue = vault.getCollateralValueUSD(alice);
        assertEq(totalValue, 10000 ether, "Total collateral value should be correct");
    }

    /**
     * @notice Compatibility: Deposit and withdraw still work with multiple collaterals
     */
    function test_Compatibility_DepositWithdrawWorkWithMultiCollateral() public {
        vault.addCollateral(address(secondCollateral), 6000, 6500, 1000);

        vm.startPrank(alice);

        // Deposit both
        vault.deposit(address(collateralToken), 50 ether);
        vault.deposit(address(secondCollateral), 50 ether);

        // Withdraw both
        vault.withdraw(address(collateralToken), 25 ether);
        vault.withdraw(address(secondCollateral), 25 ether);

        // Check balances
        assertEq(vault.getCollateralBalance(alice, address(collateralToken)), 25 ether);
        assertEq(vault.getCollateralBalance(alice, address(secondCollateral)), 25 ether);

        vm.stopPrank();
    }
}
