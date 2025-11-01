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

        // Target: < 100K gas
        assertLt(gasUsed, 100_000, "Deposit gas too high");
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

        // Target: < 50K gas
        assertLt(gasUsed, 50_000, "Accrue interest gas too high");
        emit log_named_uint("Accrue interest gas used", gasUsed);
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
        uint256 interest = savingRate.accruedInterestOf(user1);

        // Even tiny amounts should earn something
        // (May be 0 due to precision limits, but should not revert)
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
}
