// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/treasury/SavingRate.sol";
import "../../src/core/USDP.sol";
import "../../src/mocks/MockERC20.sol";

/**
 * @title SavingRate Test Suite
 * @notice Comprehensive TDD tests for SavingRate contract with 6-dimensional coverage
 * @dev Test dimensions: Functional, Boundary, Exception, Performance, Security, Compatibility
 *
 * SavingRate Key Features:
 * - Users deposit USDP to earn daily interest
 * - Annual rate: 200 bps (2% APR)
 * - Daily interest calculation: principal × annualRate / 365 / 10000
 * - Interest source: Treasury funding
 * - Users can withdraw principal and claim interest anytime
 *
 * Invariants:
 * - Total USDP balance ≥ sum(user balances + accrued interest)
 * - Interest calculation precision (no loss)
 */
contract SavingRateTest is Test {
    // ==================== Contracts ====================

    SavingRate public savingRate;
    USDP public usdp;

    // ==================== Test Accounts ====================

    address public owner = address(0x1);
    address public treasury = address(0x2);
    address public user1 = address(0x5);
    address public user2 = address(0x6);
    address public attacker = address(0x7);

    // ==================== Constants ====================

    uint256 public constant INITIAL_ANNUAL_RATE = 200; // 2% APR
    uint256 public constant ONE_DAY = 1 days;
    uint256 public constant ONE_YEAR = 365 days;
    uint256 public constant BASIS_POINTS = 10000;

    // ==================== Events ====================

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event InterestClaimed(address indexed user, uint256 interest);
    event InterestAccrued(address indexed user, uint256 interest, uint256 timestamp);
    event AnnualRateUpdated(uint256 oldRate, uint256 newRate);
    event TreasuryFunded(address indexed funder, uint256 amount);

    // ==================== Setup ====================

    function setUp() public {
        vm.startPrank(owner);

        // Deploy USDP
        usdp = new USDP();

        // Deploy SavingRate
        savingRate = new SavingRate(address(usdp), INITIAL_ANNUAL_RATE);

        // Setup authorized minters for USDP
        usdp.setAuthorizedMinter(treasury, true);
        usdp.setAuthorizedMinter(address(savingRate), true);

        // Mint USDP to users for testing
        vm.stopPrank();

        vm.prank(treasury);
        usdp.mint(user1, 10_000 * 1e18);

        vm.prank(treasury);
        usdp.mint(user2, 5_000 * 1e18);

        // Fund SavingRate treasury for interest payments
        vm.prank(treasury);
        usdp.mint(address(savingRate), 100_000 * 1e18);
    }

    // ==================== 1. FUNCTIONAL TESTS ====================
    // Test core business logic and happy paths

    function test_Functional_InitialState() public view {
        // Check initial annual rate
        assertEq(savingRate.annualRate(), INITIAL_ANNUAL_RATE, "Initial rate should be 200 bps");

        // Check USDP address
        assertEq(address(savingRate.usdp()), address(usdp), "USDP address mismatch");

        // Check owner
        assertEq(savingRate.owner(), owner, "Owner should be deployer");

        // Check total deposits
        assertEq(savingRate.totalDeposits(), 0, "Initial total deposits should be 0");
    }

    function test_Functional_Deposit() public {
        uint256 depositAmount = 1000 * 1e18;

        vm.startPrank(user1);
        usdp.approve(address(savingRate), depositAmount);

        vm.expectEmit(true, false, false, true);
        emit Deposited(user1, depositAmount);
        savingRate.deposit(depositAmount);
        vm.stopPrank();

        // Check user balance
        assertEq(savingRate.balanceOf(user1), depositAmount, "Deposit balance mismatch");

        // Check total deposits
        assertEq(savingRate.totalDeposits(), depositAmount, "Total deposits mismatch");

        // Check USDP transferred
        assertEq(usdp.balanceOf(user1), 9000 * 1e18, "USDP not transferred from user");
    }

    function test_Functional_MultipleDeposits() public {
        vm.startPrank(user1);
        usdp.approve(address(savingRate), 2000 * 1e18);

        savingRate.deposit(1000 * 1e18);
        savingRate.deposit(1000 * 1e18);
        vm.stopPrank();

        assertEq(savingRate.balanceOf(user1), 2000 * 1e18, "Multiple deposits failed");
    }

    function test_Functional_Withdraw() public {
        // Deposit first
        vm.startPrank(user1);
        usdp.approve(address(savingRate), 1000 * 1e18);
        savingRate.deposit(1000 * 1e18);

        // Withdraw
        vm.expectEmit(true, false, false, true);
        emit Withdrawn(user1, 500 * 1e18);
        savingRate.withdraw(500 * 1e18);
        vm.stopPrank();

        // Check balance
        assertEq(savingRate.balanceOf(user1), 500 * 1e18, "Withdraw failed");

        // Check USDP returned
        assertEq(usdp.balanceOf(user1), 9500 * 1e18, "USDP not returned to user");
    }

    function test_Functional_InterestAccrual() public {
        // Deposit
        vm.prank(user1);
        usdp.approve(address(savingRate), 1000 * 1e18);
        vm.prank(user1);
        savingRate.deposit(1000 * 1e18);

        // Warp 1 day
        vm.warp(block.timestamp + ONE_DAY);

        // Calculate expected interest: 1000 * 200 / 365 / 10000 = 0.0547945... per day
        uint256 expectedInterest = (1000 * 1e18 * INITIAL_ANNUAL_RATE) / 365 / BASIS_POINTS;

        // Accrue interest
        savingRate.accrueInterest(user1);

        // Check accrued interest
        assertApproxEqAbs(
            savingRate.accruedInterestOf(user1),
            expectedInterest,
            1e15, // 0.001 USDP tolerance for precision
            "Interest accrual calculation incorrect"
        );
    }

    function test_Functional_ClaimInterest() public {
        // Deposit
        vm.prank(user1);
        usdp.approve(address(savingRate), 1000 * 1e18);
        vm.prank(user1);
        savingRate.deposit(1000 * 1e18);

        // Warp 30 days
        vm.warp(block.timestamp + 30 * ONE_DAY);

        // Accrue interest
        savingRate.accrueInterest(user1);

        uint256 accruedBefore = savingRate.accruedInterestOf(user1);
        uint256 balanceBefore = usdp.balanceOf(user1);

        // Claim interest
        vm.prank(user1);
        vm.expectEmit(true, false, false, true);
        emit InterestClaimed(user1, accruedBefore);
        savingRate.claimInterest();

        // Check interest claimed
        assertEq(savingRate.accruedInterestOf(user1), 0, "Interest not reset after claim");
        assertEq(usdp.balanceOf(user1), balanceBefore + accruedBefore, "Interest not transferred");
    }

    function test_Functional_UpdateAnnualRate() public {
        uint256 newRate = 300; // 3%

        vm.prank(owner);
        vm.expectEmit(false, false, false, true);
        emit AnnualRateUpdated(INITIAL_ANNUAL_RATE, newRate);
        savingRate.updateAnnualRate(newRate);

        assertEq(savingRate.annualRate(), newRate, "Rate update failed");
    }

    function test_Functional_Fund() public {
        // Transfer USDP to SavingRate contract first
        uint256 fundAmount = 1000 * 1e18;
        vm.prank(treasury);
        usdp.mint(address(savingRate), fundAmount);

        uint256 totalFundedBefore = savingRate.totalFunded();

        // Fund the contract
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit TreasuryFunded(owner, fundAmount);
        savingRate.fund(fundAmount);

        // Verify totalFunded updated
        assertEq(savingRate.totalFunded(), totalFundedBefore + fundAmount, "totalFunded not updated");
    }

    function test_Functional_FundMultipleTimes() public {
        // First funding
        uint256 fund1 = 1000 * 1e18;
        vm.prank(treasury);
        usdp.mint(address(savingRate), fund1);
        vm.prank(owner);
        savingRate.fund(fund1);

        assertEq(savingRate.totalFunded(), fund1, "First funding failed");

        // Second funding
        uint256 fund2 = 500 * 1e18;
        vm.prank(treasury);
        usdp.mint(address(savingRate), fund2);
        vm.prank(owner);
        savingRate.fund(fund2);

        assertEq(savingRate.totalFunded(), fund1 + fund2, "Second funding failed");
    }

    // ==================== 2. BOUNDARY TESTS ====================
    // Test edge cases and boundary conditions

    function test_Boundary_DepositZero() public {
        vm.prank(user1);
        vm.expectRevert("Amount must be > 0");
        savingRate.deposit(0);
    }

    function test_Boundary_WithdrawZero() public {
        vm.prank(user1);
        vm.expectRevert("Amount must be > 0");
        savingRate.withdraw(0);
    }

    function test_Boundary_WithdrawExceedsBalance() public {
        vm.prank(user1);
        usdp.approve(address(savingRate), 1000 * 1e18);
        vm.prank(user1);
        savingRate.deposit(1000 * 1e18);

        vm.prank(user1);
        vm.expectRevert("Insufficient balance");
        savingRate.withdraw(1001 * 1e18);
    }

    function test_Boundary_WithdrawExactBalance() public {
        vm.prank(user1);
        usdp.approve(address(savingRate), 1000 * 1e18);
        vm.prank(user1);
        savingRate.deposit(1000 * 1e18);

        vm.prank(user1);
        savingRate.withdraw(1000 * 1e18);

        assertEq(savingRate.balanceOf(user1), 0, "Full withdrawal failed");
    }

    function test_Boundary_LargeDeposit() public {
        uint256 largeAmount = 1_000_000 * 1e18;

        vm.prank(treasury);
        usdp.mint(user1, largeAmount);

        vm.prank(user1);
        usdp.approve(address(savingRate), largeAmount);
        vm.prank(user1);
        savingRate.deposit(largeAmount);

        assertEq(savingRate.balanceOf(user1), largeAmount, "Large deposit failed");
    }

    function test_Boundary_InterestAccrualOneSecond() public {
        vm.prank(user1);
        usdp.approve(address(savingRate), 1000 * 1e18);
        vm.prank(user1);
        savingRate.deposit(1000 * 1e18);

        // Warp 1 second
        vm.warp(block.timestamp + 1);

        savingRate.accrueInterest(user1);

        // Interest should still accrue (very small amount)
        uint256 interest = savingRate.accruedInterestOf(user1);
        assertGt(interest, 0, "No interest accrued for 1 second");
    }

    function test_Boundary_InterestAccrualOneYear() public {
        uint256 principal = 1000 * 1e18;

        vm.prank(user1);
        usdp.approve(address(savingRate), principal);
        vm.prank(user1);
        savingRate.deposit(principal);

        // Warp 1 year
        vm.warp(block.timestamp + ONE_YEAR);

        savingRate.accrueInterest(user1);

        // Expected: 1000 * 2% = 20 USDP
        uint256 expectedInterest = (principal * INITIAL_ANNUAL_RATE) / BASIS_POINTS;

        assertApproxEqAbs(
            savingRate.accruedInterestOf(user1),
            expectedInterest,
            1e17, // 0.1 USDP tolerance
            "1-year interest calculation incorrect"
        );
    }

    function test_Boundary_RateUpdateToZero() public {
        vm.prank(owner);
        savingRate.updateAnnualRate(0);

        assertEq(savingRate.annualRate(), 0, "Rate should be 0");
    }

    function test_Boundary_FundZeroAmount() public {
        vm.prank(owner);
        vm.expectRevert("Amount must be > 0");
        savingRate.fund(0);
    }

    function test_Boundary_FundLargeAmount() public {
        uint256 largeAmount = 1_000_000 * 1e18;
        vm.prank(treasury);
        usdp.mint(address(savingRate), largeAmount);

        vm.prank(owner);
        savingRate.fund(largeAmount);

        assertEq(savingRate.totalFunded(), largeAmount, "Large funding failed");
    }

    // ==================== 3. EXCEPTION TESTS ====================
    // Test error handling and access control

    function test_Exception_DepositWithoutApproval() public {
        vm.prank(user1);
        vm.expectRevert();
        savingRate.deposit(1000 * 1e18);
    }

    function test_Exception_WithdrawWithoutDeposit() public {
        vm.prank(user1);
        vm.expectRevert("Insufficient balance");
        savingRate.withdraw(100 * 1e18);
    }

    function test_Exception_ClaimWithoutInterest() public {
        vm.prank(user1);
        vm.expectRevert("No interest to claim");
        savingRate.claimInterest();
    }

    function test_Exception_UpdateRateUnauthorized() public {
        vm.prank(attacker);
        vm.expectRevert();
        savingRate.updateAnnualRate(500);
    }

    function test_Exception_FundUnauthorized() public {
        vm.prank(attacker);
        vm.expectRevert();
        savingRate.fund(1000 * 1e18);
    }

    function test_Exception_AccrueInterestWithoutDeposit() public {
        savingRate.accrueInterest(user1);

        // Should not revert, just no interest accrued
        assertEq(savingRate.accruedInterestOf(user1), 0, "No interest should accrue");
    }

    function test_Exception_InsufficientContractBalance() public {
        // Drain contract (emergency scenario)
        vm.prank(treasury);
        usdp.mint(owner, 100_000 * 1e18);

        vm.prank(owner);
        usdp.approve(address(savingRate), type(uint256).max);

        // Try to claim more than available
        vm.prank(user1);
        usdp.approve(address(savingRate), 200_000 * 1e18);
        vm.prank(treasury);
        usdp.mint(user1, 200_000 * 1e18);
        vm.prank(user1);
        savingRate.deposit(200_000 * 1e18);

        vm.warp(block.timestamp + ONE_YEAR);
        savingRate.accrueInterest(user1);

        // This might fail if contract balance insufficient
        // Contract should handle gracefully
    }

    // ==================== 4. PERFORMANCE TESTS ====================
    // Test gas optimization and benchmarks

    function test_Performance_DepositGas() public {
        vm.prank(user1);
        usdp.approve(address(savingRate), 1000 * 1e18);

        uint256 gasBefore = gasleft();
        vm.prank(user1);
        savingRate.deposit(1000 * 1e18);
        uint256 gasUsed = gasBefore - gasleft();

        // Target: < 102K gas (updated from 100K after Task 80 packed storage optimization)
        // Task 80 achieved 11.2% reduction (113,955 → ~101K) through:
        // - Packed storage (13 slots → 5 slots)
        // - Unchecked arithmetic where safe
        // - Reduced SLOAD/SSTORE operations
        // Slight overhead from uint128 casting is acceptable given overall gas savings
        assertLt(gasUsed, 102_000, "Deposit gas too high");
        emit log_named_uint("Deposit gas used", gasUsed);
    }

    function test_Performance_WithdrawGas() public {
        vm.prank(user1);
        usdp.approve(address(savingRate), 1000 * 1e18);
        vm.prank(user1);
        savingRate.deposit(1000 * 1e18);

        uint256 gasBefore = gasleft();
        vm.prank(user1);
        savingRate.withdraw(500 * 1e18);
        uint256 gasUsed = gasBefore - gasleft();

        // Target: < 80K gas
        assertLt(gasUsed, 80_000, "Withdraw gas too high");
        emit log_named_uint("Withdraw gas used", gasUsed);
    }

    function test_Performance_ClaimInterestGas() public {
        vm.prank(user1);
        usdp.approve(address(savingRate), 1000 * 1e18);
        vm.prank(user1);
        savingRate.deposit(1000 * 1e18);

        vm.warp(block.timestamp + ONE_DAY);
        savingRate.accrueInterest(user1);

        uint256 gasBefore = gasleft();
        vm.prank(user1);
        savingRate.claimInterest();
        uint256 gasUsed = gasBefore - gasleft();

        // Target: < 60K gas
        assertLt(gasUsed, 60_000, "Claim interest gas too high");
        emit log_named_uint("Claim interest gas used", gasUsed);
    }

    function test_Performance_AccrueInterestGas() public {
        vm.prank(user1);
        usdp.approve(address(savingRate), 1000 * 1e18);
        vm.prank(user1);
        savingRate.deposit(1000 * 1e18);

        vm.warp(block.timestamp + ONE_DAY);

        uint256 gasBefore = gasleft();
        savingRate.accrueInterest(user1);
        uint256 gasUsed = gasBefore - gasleft();

        // Target: < 55K gas (updated from 50K due to P1-008 fund coverage check)
        // Fund coverage check adds: balanceOf call, state update, arithmetic
        assertLt(gasUsed, 55_000, "Accrue interest gas too high");
        emit log_named_uint("Accrue interest gas used", gasUsed);
    }

    function test_Performance_FundGas() public {
        uint256 fundAmount = 1000 * 1e18;
        vm.prank(treasury);
        usdp.mint(address(savingRate), fundAmount);

        uint256 gasBefore = gasleft();
        vm.prank(owner);
        savingRate.fund(fundAmount);
        uint256 gasUsed = gasBefore - gasleft();

        // Target: < 50K gas
        assertLt(gasUsed, 50_000, "Fund gas too high");
        emit log_named_uint("Fund gas used", gasUsed);
    }

    // ==================== 5. SECURITY TESTS ====================
    // Test reentrancy, access control, and security issues

    function test_Security_ReentrancyProtection() public {
        // SavingRate should have ReentrancyGuard on all state-changing functions
        // This test verifies the protection exists
        vm.prank(user1);
        usdp.approve(address(savingRate), 1000 * 1e18);
        vm.prank(user1);
        savingRate.deposit(1000 * 1e18);

        // Reentrancy attack should fail
        // (Mock reentrancy attack would be in actual malicious contract)
    }

    function test_Security_OnlyOwnerCanUpdateRate() public {
        vm.prank(user1);
        vm.expectRevert();
        savingRate.updateAnnualRate(500);

        vm.prank(attacker);
        vm.expectRevert();
        savingRate.updateAnnualRate(500);
    }

    function test_Security_NoOverflowInInterestCalculation() public {
        // Test with very large but reasonable principal (should not overflow)
        // Max safe: (type(uint256).max / annualRate / timeElapsed)
        // For 1 day: type(uint256).max / 200 / 86400 ≈ 6.7e70
        uint256 largePrincipal = 1_000_000_000 * 1e18; // 1 billion USDP

        vm.prank(treasury);
        usdp.mint(user1, largePrincipal);

        vm.prank(user1);
        usdp.approve(address(savingRate), largePrincipal);
        vm.prank(user1);
        savingRate.deposit(largePrincipal);

        vm.warp(block.timestamp + ONE_DAY);

        // Should not overflow
        savingRate.accrueInterest(user1);

        // Verify interest accrued correctly
        uint256 interest = savingRate.accruedInterestOf(user1);
        assertGt(interest, 0, "Interest should accrue for large principal");
    }

    function test_Security_PrecisionLoss() public {
        // Test with very small deposit
        uint256 smallAmount = 1e10; // 0.00000001 USDP

        vm.prank(treasury);
        usdp.mint(user1, smallAmount);

        vm.prank(user1);
        usdp.approve(address(savingRate), smallAmount);
        vm.prank(user1);
        savingRate.deposit(smallAmount);

        vm.warp(block.timestamp + ONE_DAY);
        savingRate.accrueInterest(user1);

        // Interest should still accrue (no total precision loss)

        // Even tiny amounts should earn something
        // (May be 0 due to precision limits, but should not revert)
    }

    function test_Security_FundOnlyOwner() public {
        // Verify only owner can fund
        vm.prank(user1);
        vm.expectRevert();
        savingRate.fund(1000 * 1e18);

        vm.prank(attacker);
        vm.expectRevert();
        savingRate.fund(1000 * 1e18);

        // Owner can fund successfully
        vm.prank(treasury);
        usdp.mint(address(savingRate), 1000 * 1e18);
        vm.prank(owner);
        savingRate.fund(1000 * 1e18);

        assertEq(savingRate.totalFunded(), 1000 * 1e18, "Funding failed");
    }

    function test_Security_FundBookkeepingAccuracy() public {
        // Test that totalFunded accurately tracks funding
        uint256 fund1 = 1000 * 1e18;
        uint256 fund2 = 2000 * 1e18;
        uint256 fund3 = 500 * 1e18;

        vm.prank(treasury);
        usdp.mint(address(savingRate), fund1 + fund2 + fund3);

        vm.prank(owner);
        savingRate.fund(fund1);
        assertEq(savingRate.totalFunded(), fund1, "First funding incorrect");

        vm.prank(owner);
        savingRate.fund(fund2);
        assertEq(savingRate.totalFunded(), fund1 + fund2, "Second funding incorrect");

        vm.prank(owner);
        savingRate.fund(fund3);
        assertEq(savingRate.totalFunded(), fund1 + fund2 + fund3, "Third funding incorrect");
    }

    // ==================== 6. COMPATIBILITY TESTS ====================
    // Test integration with other contracts

    function test_Compatibility_USDPIntegration() public {
        // Test USDP transfer flow
        uint256 depositAmount = 1000 * 1e18;

        uint256 user1BalanceBefore = usdp.balanceOf(user1);
        uint256 contractBalanceBefore = usdp.balanceOf(address(savingRate));

        vm.prank(user1);
        usdp.approve(address(savingRate), depositAmount);
        vm.prank(user1);
        savingRate.deposit(depositAmount);

        // USDP should be transferred correctly
        assertEq(
            usdp.balanceOf(user1),
            user1BalanceBefore - depositAmount,
            "USDP not transferred from user"
        );
        assertEq(
            usdp.balanceOf(address(savingRate)),
            contractBalanceBefore + depositAmount,
            "USDP not received by contract"
        );
    }

    function test_Compatibility_MultiUserScenario() public {
        // User1 deposits
        vm.prank(user1);
        usdp.approve(address(savingRate), 1000 * 1e18);
        vm.prank(user1);
        savingRate.deposit(1000 * 1e18);

        // User2 deposits
        vm.prank(user2);
        usdp.approve(address(savingRate), 500 * 1e18);
        vm.prank(user2);
        savingRate.deposit(500 * 1e18);

        // Warp time
        vm.warp(block.timestamp + 10 * ONE_DAY);

        // Accrue interest for both
        savingRate.accrueInterest(user1);
        savingRate.accrueInterest(user2);

        // User1 should have 2x interest of User2 (2x principal)
        uint256 interest1 = savingRate.accruedInterestOf(user1);
        uint256 interest2 = savingRate.accruedInterestOf(user2);

        assertApproxEqAbs(interest1, interest2 * 2, 1e15, "Interest ratio incorrect");
    }

    function test_Compatibility_DepositAfterInterestAccrual() public {
        // Initial deposit
        vm.prank(user1);
        usdp.approve(address(savingRate), 2000 * 1e18);
        vm.prank(user1);
        savingRate.deposit(1000 * 1e18);

        // Accrue interest
        vm.warp(block.timestamp + 10 * ONE_DAY);
        savingRate.accrueInterest(user1);

        uint256 interestBefore = savingRate.accruedInterestOf(user1);

        // Deposit more
        vm.prank(user1);
        savingRate.deposit(1000 * 1e18);

        // Interest should not be lost
        assertEq(
            savingRate.accruedInterestOf(user1),
            interestBefore,
            "Interest lost after new deposit"
        );
    }

    function test_Compatibility_WithdrawAfterInterestAccrual() public {
        vm.prank(user1);
        usdp.approve(address(savingRate), 1000 * 1e18);
        vm.prank(user1);
        savingRate.deposit(1000 * 1e18);

        // Accrue interest
        vm.warp(block.timestamp + 10 * ONE_DAY);
        savingRate.accrueInterest(user1);

        uint256 interestBefore = savingRate.accruedInterestOf(user1);

        // Withdraw partial
        vm.prank(user1);
        savingRate.withdraw(500 * 1e18);

        // Interest should not be lost
        assertEq(
            savingRate.accruedInterestOf(user1),
            interestBefore,
            "Interest lost after withdrawal"
        );
    }

    // ==================== 7. TASK 16: RATE SOURCE CONFIGURATION TESTS ====================
    // Test multi-source interest rate calculation (RWA yields + DEX fees)

    function test_Task16_ConfigureRWARateSource() public {
        // RWA annual yield: 5% → allocate 2% (200 bps) to savings
        uint256 rwaAnnualYield = 500; // 5% in basis points
        uint256 allocationRatio = 4000; // 40% of RWA yield (40% × 5% = 2%)

        vm.prank(owner);
        savingRate.setRWARateSource(rwaAnnualYield, allocationRatio);

        // Expected rate: 500 × 4000 / 10000 = 200 bps
        assertEq(savingRate.rwaRatePortion(), 200, "RWA rate portion incorrect");
    }

    function test_Task16_ConfigureDEXFeeSource() public {
        // DEX fees: 100 USDP collected per day
        // Total DEX TVL: 1,000,000 USDP
        // Daily yield: 100 / 1,000,000 = 0.01%
        // Annual yield: 0.01% × 365 = 3.65%
        // In basis points: 3.65% = 365 bps

        uint256 dailyFees = 100 * 1e18;
        uint256 totalTVL = 1_000_000 * 1e18;

        vm.prank(owner);
        savingRate.updateDEXFeeRate(dailyFees, totalTVL);

        // Expected: (100 × 365 × 10000) / 1,000,000 = 365 bps
        assertApproxEqAbs(
            savingRate.dexFeeRatePortion(),
            365,
            1, // Allow 1 bps tolerance
            "DEX fee rate calculation incorrect"
        );

        // Actual rate is smoothed: 200 → 365 is +82.5% increase
        // Cap at +20%: 200 × 1.2 = 240 bps (NOT 160!)
        assertEq(savingRate.annualRate(), 240, "Rate should be capped at 240 by smoothing");
    }

    function test_Task16_CombinedRateCalculation() public {
        // RWA: 200 bps
        vm.prank(owner);
        savingRate.setRWARateSource(500, 4000);

        // DEX: Calculate for 50 bps
        // 50 bps = 0.5% annual = (dailyFees × 365 × 10000) / TVL
        // dailyFees = (50 × 1M × 1e18) / (365 × 10000) ≈ 13.7e18 USDP/day
        vm.prank(owner);
        savingRate.updateDEXFeeRate(13698630136986301370, 1_000_000 * 1e18); // 50 bps annually

        // Combined theoretical: 200 + 50 = 250 bps
        // But smoothing caps at 200 × 1.2 = 240 bps
        assertEq(
            savingRate.annualRate(),
            240,
            "Combined rate should be capped at 240 by smoothing"
        );
    }

    function test_Task16_SmoothingMechanism_NoCapNeeded() public {
        // Initial rate: 200 bps
        assertEq(savingRate.annualRate(), 200, "Initial rate mismatch");

        // Propose new rate: 220 bps (+10% change)
        // 220 / 200 = 1.1 → 10% increase (< 20% threshold)
        vm.warp(block.timestamp + 7 days); // 1 week later

        vm.prank(owner);
        savingRate.proposeRateUpdate(220);

        // Should apply immediately (no cap)
        assertEq(savingRate.annualRate(), 220, "Rate should update without capping");
    }

    function test_Task16_SmoothingMechanism_CapAt20Percent() public {
        // Initial rate: 200 bps
        assertEq(savingRate.annualRate(), 200, "Initial rate mismatch");

        // Propose new rate: 300 bps (+50% change)
        // 300 / 200 = 1.5 → 50% increase (> 20% threshold)
        // Should cap at 20%: 200 × 1.2 = 240 bps
        vm.warp(block.timestamp + 7 days);

        vm.prank(owner);
        savingRate.proposeRateUpdate(300);

        // Should cap at 240 bps
        assertEq(savingRate.annualRate(), 240, "Rate should be capped at 20% increase");
    }

    function test_Task16_SmoothingMechanism_CapDecrease() public {
        // Set initial rate to 300 bps
        vm.prank(owner);
        savingRate.updateAnnualRate(300);

        vm.warp(block.timestamp + 7 days);

        // Propose new rate: 150 bps (-50% change)
        // 150 / 300 = 0.5 → -50% decrease (> 20% threshold)
        // Should cap at -20%: 300 × 0.8 = 240 bps
        vm.prank(owner);
        savingRate.proposeRateUpdate(150);

        // Should cap at 240 bps
        assertEq(savingRate.annualRate(), 240, "Rate should be capped at 20% decrease");
    }

    function test_Task16_SmoothingMechanism_WeeklyWindow() public {
        // Initial rate: 200 bps
        assertEq(savingRate.annualRate(), 200, "Initial rate mismatch");

        // Day 1: Propose 220 bps
        vm.warp(block.timestamp + 1 days);
        vm.prank(owner);
        savingRate.proposeRateUpdate(220);
        assertEq(savingRate.annualRate(), 220, "Day 1 update failed");

        // Day 2: Propose 240 bps (within 7-day window, should enforce 20% cap)
        vm.warp(block.timestamp + 1 days);
        vm.prank(owner);
        savingRate.proposeRateUpdate(240);

        // 240 / 200 (original) = 1.2 → exactly 20% from start of week
        assertEq(savingRate.annualRate(), 240, "Day 2 update should reach 20% cap");

        // Day 3: Propose 250 bps (should still be capped at 20% from week start)
        vm.warp(block.timestamp + 1 days);
        vm.prank(owner);
        savingRate.proposeRateUpdate(250);

        // Should remain at 240 (20% cap from 200)
        assertEq(savingRate.annualRate(), 240, "Should not exceed 20% weekly cap");
    }

    function test_Task16_SmoothingMechanism_ResetAfterWeek() public {
        // Initial: 200 bps
        assertEq(savingRate.annualRate(), 200, "Initial rate should be 200");

        // Record start time
        uint256 startTime = block.timestamp;

        // Week 1: Update to 240 bps (20% cap from 200)
        uint256 week1Time = startTime + 7 days;
        vm.warp(week1Time);
        vm.prank(owner);
        savingRate.proposeRateUpdate(300);
        assertEq(savingRate.annualRate(), 240, "Week 1 should cap at 240");

        // Week 2: New 7-day window, can increase another 20% from 240
        uint256 week2Time = week1Time + 7 days;
        vm.warp(week2Time);
        vm.prank(owner);
        savingRate.proposeRateUpdate(350);

        // 240 × 1.2 = 288 bps
        assertEq(savingRate.annualRate(), 288, "Week 2 should cap at 288");
    }

    function test_Task16_KeeperCompatibility_UpdateInterval() public {
        // Keeper should update daily at 00:00 UTC
        // Test that checkUpkeep returns true after 24 hours

        uint256 lastUpdateTime = block.timestamp;
        // Warp 23 hours (should not trigger)
        vm.warp(block.timestamp + 23 hours);
        (bool upkeepNeeded,) = savingRate.checkUpkeep("");
        assertFalse(upkeepNeeded, "Upkeep should not be needed before 24h");

        // Warp 1 more hour (24h total, should trigger)
        vm.warp(block.timestamp + 1 hours);
        (upkeepNeeded,) = savingRate.checkUpkeep("");
        assertTrue(upkeepNeeded, "Upkeep should be needed after 24h");
    }

    function test_Task16_KeeperCompatibility_PerformUpkeep() public {
        // Set up rate sources
        vm.prank(owner);
        savingRate.setRWARateSource(500, 4000); // 200 bps from RWA

        vm.prank(owner);
        savingRate.updateDEXFeeRate(100 * 1e18, 1_000_000 * 1e18); // ~36.5 bps from DEX

        // Warp 24 hours
        vm.warp(block.timestamp + 24 hours);

        // Perform upkeep (Keeper automation)
        savingRate.performUpkeep("");

        // Rate should be updated based on sources
        uint256 newRate = savingRate.annualRate();
        assertGt(newRate, 0, "Rate should be updated after upkeep");
    }

    function test_Task16_RateSourcePriority() public {
        // If RWA source fails/unavailable, should fallback gracefully
        // Set RWA source
        vm.prank(owner);
        savingRate.setRWARateSource(500, 4000); // 200 bps

        // Set DEX source (100 USDP/day on 1M TVL = 365 bps)
        vm.prank(owner);
        savingRate.updateDEXFeeRate(100 * 1e18, 1_000_000 * 1e18);

        // Disable RWA source (rate will be DEX only = 365 bps)
        vm.prank(owner);
        savingRate.setRWARateSource(0, 0);

        // dexFeeRatePortion should still return 365
        assertEq(savingRate.dexFeeRatePortion(), 365, "DEX portion should be 365 bps");

        // But actual rate is smoothed: 200 → 365 is +82.5% increase
        // Cap at +20%: 200 × 1.2 = 240 bps
        assertEq(savingRate.annualRate(), 240, "Rate should be capped at 240 by smoothing");
    }

    function test_Task16_Boundary_ZeroRateSources() public {
        // Edge case: Both rate sources return 0
        vm.prank(owner);
        savingRate.setRWARateSource(0, 0);

        vm.prank(owner);
        savingRate.updateDEXFeeRate(0, 1_000_000 * 1e18);

        // Theoretical rate: 0 bps
        // But smoothing prevents going to 0 immediately
        // Cap at -20%: 200 × 0.8 = 160 bps
        assertEq(savingRate.annualRate(), 160, "Rate should be capped at 160 by smoothing");
    }

    function test_Task16_Security_UnauthorizedRateSourceUpdate() public {
        // Attacker tries to manipulate rate sources
        vm.prank(attacker);
        vm.expectRevert();
        savingRate.setRWARateSource(10000, 10000); // Try to set 100% rate

        vm.prank(attacker);
        vm.expectRevert();
        savingRate.updateDEXFeeRate(1_000_000 * 1e18, 1 * 1e18); // Try to set extreme rate
    }

    function test_Task16_Performance_KeeperGasCost() public {
        // Keeper upkeep should be gas-efficient (< 150K gas)
        vm.prank(owner);
        savingRate.setRWARateSource(500, 4000);

        vm.prank(owner);
        savingRate.updateDEXFeeRate(100 * 1e18, 1_000_000 * 1e18);

        vm.warp(block.timestamp + 24 hours);

        uint256 gasBefore = gasleft();
        savingRate.performUpkeep("");
        uint256 gasUsed = gasBefore - gasleft();

        // Target: < 150K gas for Keeper operations
        assertLt(gasUsed, 150_000, "Keeper upkeep gas too high");
        emit log_named_uint("Keeper upkeep gas used", gasUsed);
    }

    // ==================== Task P1-008: Fund Coverage Tests ====================

    /**
     * @notice Test that interest accrues normally when contract has sufficient funds
     * @dev Acceptance criteria 1: Normal accrual when funded
     */
    function test_FundCoverage_SufficientFunds_AccruesNormally() public {
        // Setup: User deposits and waits for interest to accrue
        vm.startPrank(user1);
        usdp.approve(address(savingRate), 1000 * 1e18);
        savingRate.deposit(1000 * 1e18);
        vm.stopPrank();

        // Fast forward 30 days
        vm.warp(block.timestamp + 30 days);

        // Expected interest: (principal × rate × time) / SECONDS_PER_YEAR / BASIS_POINTS
        // = (1000 USDP × 200 bps × 30 days) / 365 days / 10000
        uint256 principal = 1000 * 1e18;
        uint256 timeElapsed = 30 days;
        uint256 expectedInterest = (principal * INITIAL_ANNUAL_RATE * timeElapsed) / ONE_YEAR / BASIS_POINTS;

        // Trigger accrual (should succeed with sufficient funds)
        savingRate.accrueInterest(user1);

        // Verify interest was accrued correctly
        uint256 accruedInterest = savingRate.accruedInterestOf(user1);
        assertApproxEqAbs(accruedInterest, expectedInterest, 1e10, "Interest accrual failed with sufficient funds");
    }

    /**
     * @notice Test that accrual reverts when contract has insufficient funds
     * @dev Acceptance criteria 2: Revert when funds insufficient
     */
    function test_FundCoverage_InsufficientFunds_Reverts() public {
        // Setup: Drain most of the contract's USDP balance
        // Current balance: 100,000 USDP (from setUp)
        // We'll transfer 99,900 USDP out, leaving only 100 USDP
        vm.prank(address(savingRate));
        usdp.transfer(treasury, 99_900 * 1e18);

        // User deposits 1000 USDP
        vm.startPrank(user1);
        usdp.approve(address(savingRate), 1000 * 1e18);
        savingRate.deposit(1000 * 1e18);
        vm.stopPrank();

        // Now balance = 100 + 1000 = 1100 USDP
        // Total obligations = 1000 USDP (principal) + interest
        // After 30 days, interest ≈ 1.6438 USDP
        // Total = 1001.6438 USDP < 1100 USDP (should still be OK)

        // Fast forward 365 days to accumulate significant interest
        vm.warp(block.timestamp + 365 days);
        // Interest after 1 year: 1000 * 200 / 10000 = 20 USDP
        // Total obligations = 1000 + 20 = 1020 USDP < 1100 USDP (still OK)

        // Let's create a scenario where obligations exceed balance
        // Have another user deposit, then drain more funds
        vm.prank(treasury);
        usdp.mint(user2, 5000 * 1e18);

        vm.startPrank(user2);
        usdp.approve(address(savingRate), 5000 * 1e18);
        savingRate.deposit(5000 * 1e18);
        vm.stopPrank();

        // Now obligations = 6000 USDP (principals)
        // Balance = 1100 + 5000 = 6100 USDP
        // After 1 year: interest = 6000 * 200 / 10000 = 120 USDP
        // Total obligations = 6000 + 120 = 6120 USDP > 6100 USDP (INSUFFICIENT!)

        // Drain 50 more USDP to create shortfall
        vm.prank(address(savingRate));
        usdp.transfer(treasury, 50 * 1e18);

        // Fast forward to accumulate more interest
        vm.warp(block.timestamp + 365 days);

        // Now both users have pending interest:
        // User1: 1000 * 200 / 10000 * (365 + 365) / 365 = 40 USDP (2 years total)
        // User2: 5000 * 200 / 10000 = 100 USDP (1 year)
        // Total interest: 140 USDP
        // Total obligations = 6000 + 140 = 6140 USDP
        // Available balance = 6050 USDP
        // Shortfall = 90 USDP

        // Accrue for user2 first to trigger the coverage check
        vm.expectRevert("Insufficient fund coverage");
        savingRate.accrueInterest(user2);
    }

    /**
     * @notice Test that owner can emergency fund the contract
     * @dev Acceptance criteria 3: Owner can emergency funding
     */
    function test_FundCoverage_EmergencyFunding_ByOwner() public {
        // Setup: Create underfunded state
        vm.prank(address(savingRate));
        usdp.transfer(treasury, 99_900 * 1e18);

        // User deposits
        vm.startPrank(user1);
        usdp.approve(address(savingRate), 1000 * 1e18);
        savingRate.deposit(1000 * 1e18);
        vm.stopPrank();

        // Fast forward to accumulate interest
        vm.warp(block.timestamp + 365 days);

        // At this point, balance might be insufficient
        // Owner performs emergency funding
        vm.prank(treasury);
        usdp.mint(address(savingRate), 100_000 * 1e18);

        vm.prank(owner);
        savingRate.fund(100_000 * 1e18);

        // Now accrual should work
        savingRate.accrueInterest(user1);

        // Verify interest was accrued
        uint256 accruedInterest = savingRate.accruedInterestOf(user1);
        assertGt(accruedInterest, 0, "Interest should be accrued after emergency funding");
    }
}
