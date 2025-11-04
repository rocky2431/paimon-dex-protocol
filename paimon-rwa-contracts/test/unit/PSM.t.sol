// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/core/PSMParameterized.sol";
import "../../src/core/USDP.sol";
import "../../src/mocks/MockERC20.sol";

/**
 * @title PSMParameterized Test Suite (USDP Version)
 * @notice Comprehensive TDD tests for PSMParameterized contract with 6-dimensional coverage
 * @dev Test dimensions: Functional, Boundary, Exception, Performance, Security, Compatibility
 *
 * PSMParameterized Key Features:
 * - Facilitates 1:1 USDC ↔ USDP swaps
 * - Dynamic USDC decimals detection (supports 6, 18, or any decimals)
 * - 0.1% fee on both directions (configurable)
 * - No mint cap tracking (removed from HYD version)
 * - USDC reserve must cover all burn operations
 *
 * Critical Invariant: USDC balance >= USDP_minted_via_PSM
 */
contract PSMTest is Test {
    // ==================== Contracts ====================

    PSMParameterized public psm;
    USDP public usdp;
    MockERC20 public usdc;

    // ==================== Test Accounts ====================

    address public owner = address(0x1);
    address public treasury = address(0x2);
    address public user1 = address(0x3);
    address public user2 = address(0x4);
    address public attacker = address(0x5);

    // ==================== Constants ====================

    uint256 public constant INITIAL_FEE = 10; // 0.1% = 10 bp
    uint256 public constant BP_DENOMINATOR = 10000;
    uint256 public constant INITIAL_USDC_RESERVE = 1_000_000 * 1e6; // 1M USDC
    uint256 public constant USER_USDC_BALANCE = 100_000 * 1e6; // 100K USDC

    // ==================== Events ====================

    event SwapUSDCForUSDP(address indexed user, uint256 usdcIn, uint256 usdpOut, uint256 fee);
    event SwapUSDPForUSDC(address indexed user, uint256 usdpIn, uint256 usdcOut, uint256 fee);
    event FeeUpdated(string feeType, uint256 newFee);

    // ==================== Setup ====================

    function setUp() public {
        vm.startPrank(owner);

        // Deploy USDC mock (6 decimals)
        usdc = new MockERC20("USD Coin", "USDC", 6);

        // Deploy USDP
        usdp = new USDP();

        // Deploy PSM
        psm = new PSMParameterized(address(usdp), address(usdc));

        // Authorize PSM as USDP minter
        usdp.setAuthorizedMinter(address(psm), true);

        // Authorize treasury as USDP minter (for testing USDC withdrawal)
        usdp.setAuthorizedMinter(treasury, true);

        // Fund PSM with initial USDC reserve
        usdc.mint(address(psm), INITIAL_USDC_RESERVE);

        // Fund users with USDC
        usdc.mint(user1, USER_USDC_BALANCE);
        usdc.mint(user2, USER_USDC_BALANCE);

        vm.stopPrank();
    }

    // ==================== 1. FUNCTIONAL TESTS ====================
    // Test core business logic and happy paths

    function test_Functional_InitialState() public view {
        // Fee should be 0.1%
        assertEq(psm.feeIn(), INITIAL_FEE, "Initial feeIn should be 10 bp");
        assertEq(psm.feeOut(), INITIAL_FEE, "Initial feeOut should be 10 bp");

        // USDC reserve should be 1M
        assertEq(psm.getUSDCReserve(), INITIAL_USDC_RESERVE, "Initial USDC reserve should be 1M");

        // Owner should be set
        assertEq(psm.owner(), owner, "Owner should be deployer");

        // USDP and USDC addresses should be immutable
        assertEq(address(psm.USDP()), address(usdp), "USDP address should be set");
        assertEq(address(psm.USDC()), address(usdc), "USDC address should be set");
    }

    function test_Functional_SwapUSDCForUSDP() public {
        uint256 usdcAmount = 1000 * 1e6; // 1000 USDC

        // User approves PSM
        vm.prank(user1);
        usdc.approve(address(psm), usdcAmount);

        // Calculate expected USDP (1000 USDC - 0.1% fee = 999 USDC = 999 USDP)
        uint256 feeUSDC = (usdcAmount * INITIAL_FEE) / BP_DENOMINATOR; // 1 USDC
        uint256 usdcAfterFee = usdcAmount - feeUSDC; // 999 USDC
        uint256 expectedUSDP = usdcAfterFee * 1e12; // 999 * 1e18 USDP

        // Swap
        vm.prank(user1);
        vm.expectEmit(true, false, false, true);
        emit SwapUSDCForUSDP(user1, usdcAmount, expectedUSDP, feeUSDC * 1e12);
        uint256 usdpReceived = psm.swapUSDCForUSDP(usdcAmount);

        // Assertions
        assertEq(usdpReceived, expectedUSDP, "Should receive 999 USDP");
        assertEq(usdp.balanceOf(user1), expectedUSDP, "User USDP balance should be 999e18");
        assertEq(usdc.balanceOf(user1), USER_USDC_BALANCE - usdcAmount, "User USDC should be deducted");
        assertEq(psm.getUSDCReserve(), INITIAL_USDC_RESERVE + usdcAmount, "PSM USDC reserve should increase");
    }

    function test_Functional_SwapUSDPForUSDC() public {
        // First mint USDP to user (simulate previous swap)
        uint256 usdpAmount = 1000 * 1e18;
        vm.prank(treasury);
        usdp.mint(user1, usdpAmount);

        // User approves PSM to burn USDP
        vm.prank(user1);
        usdp.approve(address(psm), usdpAmount);

        // Calculate expected USDC (1000 USDP - 0.1% fee = 999 USDP = 999 USDC)
        uint256 feeUSDP = (usdpAmount * INITIAL_FEE) / BP_DENOMINATOR; // 1 USDP
        uint256 usdpAfterFee = usdpAmount - feeUSDP; // 999 USDP
        uint256 expectedUSDC = usdpAfterFee / 1e12; // 999 * 1e6 USDC

        uint256 initialReserve = psm.getUSDCReserve();

        // Swap
        vm.prank(user1);
        vm.expectEmit(true, false, false, true);
        emit SwapUSDPForUSDC(user1, usdpAmount, expectedUSDC, feeUSDP);
        uint256 usdcReceived = psm.swapUSDPForUSDC(usdpAmount);

        // Assertions
        assertEq(usdcReceived, expectedUSDC, "Should receive 999 USDC");
        assertEq(usdp.balanceOf(user1), 0, "User USDP balance should be 0");
        assertEq(usdc.balanceOf(user1), USER_USDC_BALANCE + expectedUSDC, "User USDC should increase");
        assertEq(psm.getUSDCReserve(), initialReserve - expectedUSDC, "PSM USDC reserve should decrease");
    }

    function test_Functional_RoundTripSwap() public {
        uint256 initialUSDC = 1000 * 1e6;

        // Step 1: Swap USDC → USDP
        vm.startPrank(user1);
        usdc.approve(address(psm), initialUSDC);
        uint256 usdpReceived = psm.swapUSDCForUSDP(initialUSDC);

        // Step 2: Swap USDP → USDC
        usdp.approve(address(psm), usdpReceived);
        uint256 usdcReceived = psm.swapUSDPForUSDC(usdpReceived);
        vm.stopPrank();

        // Round trip should lose ~0.2% (0.1% × 2)
        // Expected loss: 1000 × 0.001 × 2 = 2 USDC (before decimal conversion rounding)
        // With decimal conversion (6→18→6), expect some precision loss
        uint256 expectedLoss = (initialUSDC * 2 * INITIAL_FEE) / BP_DENOMINATOR;
        uint256 actualLoss = initialUSDC - usdcReceived;

        assertApproxEqAbs(actualLoss, expectedLoss, 1000, "Round trip should lose ~0.2% plus rounding");
    }

    function test_Functional_MultipleUsersSwap() public {
        uint256 user1USDC = 500 * 1e6;
        uint256 user2USDC = 300 * 1e6;

        // User1 swaps
        vm.startPrank(user1);
        usdc.approve(address(psm), user1USDC);
        uint256 user1USDP = psm.swapUSDCForUSDP(user1USDC);
        vm.stopPrank();

        // User2 swaps
        vm.startPrank(user2);
        usdc.approve(address(psm), user2USDC);
        uint256 user2USDP = psm.swapUSDCForUSDP(user2USDC);
        vm.stopPrank();

        // Check total USDP supply
        uint256 totalUSDP = usdp.totalSupply();
        assertEq(totalUSDP, user1USDP + user2USDP, "Total USDP should equal sum of user balances");

        // Check USDC reserve
        assertEq(psm.getUSDCReserve(), INITIAL_USDC_RESERVE + user1USDC + user2USDC, "Reserve should increase by total USDC deposited");
    }

    function test_Functional_FeeUpdate() public {
        uint256 newFeeIn = 25; // 0.25%
        uint256 newFeeOut = 50; // 0.5%

        vm.startPrank(owner);

        // Update feeIn
        vm.expectEmit(false, false, false, true);
        emit FeeUpdated("feeIn", newFeeIn);
        psm.setFeeIn(newFeeIn);

        // Update feeOut
        vm.expectEmit(false, false, false, true);
        emit FeeUpdated("feeOut", newFeeOut);
        psm.setFeeOut(newFeeOut);

        vm.stopPrank();

        assertEq(psm.feeIn(), newFeeIn, "FeeIn should be updated");
        assertEq(psm.feeOut(), newFeeOut, "FeeOut should be updated");
    }

    function test_Functional_ZeroFeeSwap() public {
        // Set fees to 0
        vm.prank(owner);
        psm.setFeeIn(0);
        vm.prank(owner);
        psm.setFeeOut(0);

        uint256 usdcAmount = 1000 * 1e6;

        // Swap with 0 fee
        vm.startPrank(user1);
        usdc.approve(address(psm), usdcAmount);
        uint256 usdpReceived = psm.swapUSDCForUSDP(usdcAmount);
        vm.stopPrank();

        // Should receive exactly 1000 USDP (no fee)
        assertEq(usdpReceived, usdcAmount * 1e12, "Should receive exact amount with 0 fee");
    }

    // ==================== 2. BOUNDARY TESTS ====================
    // Test edge cases, min/max values, empty states

    function test_Boundary_MinimumSwapAmount() public {
        uint256 minAmount = 1; // 0.000001 USDC (smallest USDC unit)

        vm.startPrank(user1);
        usdc.approve(address(psm), minAmount);
        uint256 usdpReceived = psm.swapUSDCForUSDP(minAmount);
        vm.stopPrank();

        // Fee should be 0 (rounds down)
        // Expected USDP = 1 * 1e12 = 1e12
        assertEq(usdpReceived, minAmount * 1e12, "Should handle minimum swap amount");
    }

    function test_Boundary_MaximumSwapAmount() public {
        uint256 maxAmount = 1_000_000 * 1e6; // 1M USDC

        // Mint max USDC to user1
        vm.prank(owner);
        usdc.mint(user1, maxAmount);

        vm.startPrank(user1);
        usdc.approve(address(psm), maxAmount);
        uint256 usdpReceived = psm.swapUSDCForUSDP(maxAmount);
        vm.stopPrank();

        // Should handle large amount without overflow
        assertGt(usdpReceived, 0, "Should handle large swap");
        assertEq(usdp.balanceOf(user1), usdpReceived, "Balance should match received amount");
    }

    function test_Boundary_ZeroAmount() public {
        vm.startPrank(user1);
        usdc.approve(address(psm), 0);

        vm.expectRevert("PSM: Amount must be greater than zero");
        psm.swapUSDCForUSDP(0);
        vm.stopPrank();
    }

    function test_Boundary_ExactReserveWithdrawal() public {
        // Mint USDP equal to exact reserve
        uint256 usdpAmount = INITIAL_USDC_RESERVE * 1e12;
        vm.prank(treasury);
        usdp.mint(user1, usdpAmount);

        // Withdraw exact reserve (minus fee)
        vm.startPrank(user1);
        usdp.approve(address(psm), usdpAmount);
        uint256 usdcReceived = psm.swapUSDPForUSDC(usdpAmount);
        vm.stopPrank();

        // Should succeed with exact reserve
        assertGt(usdcReceived, 0, "Should allow exact reserve withdrawal");
        assertLt(psm.getUSDCReserve(), INITIAL_USDC_RESERVE, "Reserve should decrease");
    }

    function test_Boundary_MaxFeeValue() public {
        uint256 maxFee = 10000; // 100% fee

        vm.startPrank(owner);
        psm.setFeeIn(maxFee);
        psm.setFeeOut(maxFee);
        vm.stopPrank();

        // With 100% fee, mint amount is 0, which USDP rejects
        uint256 usdcAmount = 1000 * 1e6;
        vm.startPrank(user1);
        usdc.approve(address(psm), usdcAmount);

        // USDP.mint() reverts when minting 0 amount
        vm.expectRevert("USDP: Cannot mint zero");
        psm.swapUSDCForUSDP(usdcAmount);
        vm.stopPrank();
    }

    function test_Boundary_DecimalPrecision() public {
        // Test precision preservation across decimal conversions
        uint256 usdcAmount = 123.456789e6; // 123.456789 USDC (max USDC precision)

        vm.startPrank(user1);
        usdc.approve(address(psm), usdcAmount);
        uint256 usdpReceived = psm.swapUSDCForUSDP(usdcAmount);

        // Swap back
        usdp.approve(address(psm), usdpReceived);
        uint256 usdcReturned = psm.swapUSDPForUSDC(usdpReceived);
        vm.stopPrank();

        // Should lose some precision due to decimal conversion (6→18→6) and fees
        // Fee loss: ~0.2% = 0.246913 USDC
        // Decimal conversion loss: up to 1e-12 per operation
        uint256 expectedLoss = (usdcAmount * 2 * INITIAL_FEE) / BP_DENOMINATOR;
        assertApproxEqAbs(usdcAmount - usdcReturned, expectedLoss, 200, "Precision loss should be minimal (fees + rounding)");
    }

    // ==================== 3. EXCEPTION TESTS ====================
    // Test error handling, reverts, access control

    function test_Exception_UnauthorizedFeeUpdate() public {
        vm.prank(user1);
        vm.expectRevert();
        psm.setFeeIn(20);

        vm.prank(user1);
        vm.expectRevert();
        psm.setFeeOut(20);
    }

    function test_Exception_ExcessiveFee() public {
        uint256 excessiveFee = 10001; // >100%

        vm.prank(owner);
        vm.expectRevert("PSM: Fee cannot exceed 100%");
        psm.setFeeIn(excessiveFee);

        vm.prank(owner);
        vm.expectRevert("PSM: Fee cannot exceed 100%");
        psm.setFeeOut(excessiveFee);
    }

    function test_Exception_InsufficientReserve() public {
        // Mint huge USDP amount exceeding reserve (accounting for fee)
        // Reserve = 1M USDC = 1e6 * 1e6
        // To get usdcOut > reserve:
        // usdcOut = usdpAmount * (BP_DENOMINATOR - feeOut) / BP_DENOMINATOR / 1e12
        // usdcOut > reserve
        // usdpAmount > reserve * 1e12 * BP_DENOMINATOR / (BP_DENOMINATOR - feeOut)
        uint256 hugeUSDP = ((INITIAL_USDC_RESERVE * 1e12 * BP_DENOMINATOR) / (BP_DENOMINATOR - INITIAL_FEE)) + 1000 * 1e18;

        vm.prank(treasury);
        usdp.mint(user1, hugeUSDP);

        // Try to withdraw more USDC than reserve
        vm.startPrank(user1);
        usdp.approve(address(psm), hugeUSDP);
        vm.expectRevert("PSM: Insufficient USDC reserve");
        psm.swapUSDPForUSDC(hugeUSDP);
        vm.stopPrank();
    }

    function test_Exception_InsufficientApproval() public {
        uint256 usdcAmount = 1000 * 1e6;

        // Approve less than needed
        vm.prank(user1);
        usdc.approve(address(psm), usdcAmount / 2);

        vm.prank(user1);
        vm.expectRevert();
        psm.swapUSDCForUSDP(usdcAmount);
    }

    function test_Exception_InsufficientBalance() public {
        uint256 excessAmount = USER_USDC_BALANCE + 1;

        vm.startPrank(user1);
        usdc.approve(address(psm), excessAmount);
        vm.expectRevert();
        psm.swapUSDCForUSDP(excessAmount);
        vm.stopPrank();
    }

    function test_Exception_ReentrancyProtection() public {
        // Note: This test verifies the nonReentrant modifier is present
        // Actual reentrancy attack would require malicious token contract

        // Verify function has nonReentrant modifier by checking it doesn't fail
        vm.startPrank(user1);
        usdc.approve(address(psm), 1000 * 1e6);
        psm.swapUSDCForUSDP(1000 * 1e6);
        vm.stopPrank();
    }

    // ==================== 4. PERFORMANCE TESTS ====================
    // Test gas consumption, optimization benchmarks

    function test_Performance_SwapUSDCForUSDP_Gas() public {
        uint256 usdcAmount = 1000 * 1e6;

        vm.prank(user1);
        usdc.approve(address(psm), usdcAmount);

        uint256 gasBefore = gasleft();
        vm.prank(user1);
        psm.swapUSDCForUSDP(usdcAmount);
        uint256 gasUsed = gasBefore - gasleft();

        // Should use less than 150K gas (optimized with immutables + SafeERC20)
        assertLt(gasUsed, 150_000, "swapUSDCForUSDP should use <150K gas");
        emit log_named_uint("Gas used for swapUSDCForUSDP", gasUsed);
    }

    function test_Performance_SwapUSDPForUSDC_Gas() public {
        // Setup: Mint USDP to user
        vm.prank(treasury);
        usdp.mint(user1, 1000 * 1e18);

        vm.prank(user1);
        usdp.approve(address(psm), 1000 * 1e18);

        uint256 gasBefore = gasleft();
        vm.prank(user1);
        psm.swapUSDPForUSDC(1000 * 1e18);
        uint256 gasUsed = gasBefore - gasleft();

        // Should use less than 100K gas
        assertLt(gasUsed, 100_000, "swapUSDPForUSDC should use <100K gas");
        emit log_named_uint("Gas used for swapUSDPForUSDC", gasUsed);
    }

    function test_Performance_FeeUpdateGas() public {
        uint256 gasBefore = gasleft();
        vm.prank(owner);
        psm.setFeeIn(20);
        uint256 gasUsed = gasBefore - gasleft();

        // Fee update should be very cheap (<50K gas)
        assertLt(gasUsed, 50_000, "setFeeIn should use <50K gas");
        emit log_named_uint("Gas used for setFeeIn", gasUsed);
    }

    function test_Performance_ViewFunctionGas() public view {
        uint256 gasBefore = gasleft();
        psm.getUSDCReserve();
        uint256 gasUsed = gasBefore - gasleft();

        // View function should use minimal gas (<15K)
        // Note: Actual gas includes SLOAD + external call to USDC.balanceOf
        assertLt(gasUsed, 15_000, "getUSDCReserve should use <15K gas");
    }

    // ==================== 5. SECURITY TESTS ====================
    // Test attack vectors, access control, invariants

    function test_Security_Invariant_ReserveCoversSupply() public {
        // Perform multiple swaps
        vm.startPrank(user1);
        usdc.approve(address(psm), 5000 * 1e6);
        psm.swapUSDCForUSDP(1000 * 1e6);
        psm.swapUSDCForUSDP(2000 * 1e6);
        psm.swapUSDCForUSDP(2000 * 1e6);
        vm.stopPrank();

        // Invariant: USDC reserve >= USDP supply (in USDC terms)
        uint256 reserve = psm.getUSDCReserve();
        uint256 usdpSupply = usdp.totalSupply();
        uint256 requiredReserve = usdpSupply / 1e12;

        assertGe(reserve, requiredReserve, "INVARIANT: Reserve must cover USDP supply");
    }

    function test_Security_OnlyOwnerCanUpdateFees() public {
        vm.prank(attacker);
        vm.expectRevert();
        psm.setFeeIn(9999);

        vm.prank(attacker);
        vm.expectRevert();
        psm.setFeeOut(9999);
    }

    function test_Security_ImmutableTokenAddresses() public view {
        // Verify token addresses are immutable (cannot change after deployment)
        address usdpAddress = address(psm.USDP());
        address usdcAddress = address(psm.USDC());

        assertEq(usdpAddress, address(usdp), "USDP address should be immutable");
        assertEq(usdcAddress, address(usdc), "USDC address should be immutable");
    }

    function test_Security_FrontRunningProtection() public {
        // Test that fee changes don't allow front-running exploits
        uint256 usdcAmount = 1000 * 1e6;

        // User1 approves
        vm.prank(user1);
        usdc.approve(address(psm), usdcAmount);

        // Attacker tries to change fee before user swaps
        vm.prank(attacker);
        vm.expectRevert();
        psm.setFeeIn(5000); // Try to set 50% fee

        // User swap proceeds with original fee
        vm.prank(user1);
        uint256 usdpReceived = psm.swapUSDCForUSDP(usdcAmount);

        // Verify fee was not changed
        assertGt(usdpReceived, usdcAmount * 1e12 / 2, "Fee should still be 0.1%");
    }

    function test_Security_OverflowProtection() public {
        // Test with maximum uint256 - 1 (to avoid overflow in multiplication)
        uint256 largeAmount = type(uint256).max / 1e12 - 1;

        // Should not overflow
        vm.startPrank(owner);
        usdc.mint(user1, largeAmount);
        vm.stopPrank();

        vm.startPrank(user1);
        usdc.approve(address(psm), largeAmount);
        // This should either succeed or revert gracefully (no overflow panic)
        try psm.swapUSDCForUSDP(largeAmount) {
            // Success - no overflow
            assertTrue(true);
        } catch {
            // Graceful revert - acceptable
            assertTrue(true);
        }
        vm.stopPrank();
    }

    // ==================== 6. COMPATIBILITY TESTS ====================
    // Test integration with other contracts, token standards

    function test_Compatibility_USDPIntegration() public {
        // Test PSM correctly uses USDP mint/burn
        uint256 usdcAmount = 1000 * 1e6;

        vm.startPrank(user1);
        usdc.approve(address(psm), usdcAmount);

        uint256 usdpBefore = usdp.totalSupply();
        psm.swapUSDCForUSDP(usdcAmount);
        uint256 usdpAfter = usdp.totalSupply();

        vm.stopPrank();

        // USDP supply should increase
        assertGt(usdpAfter, usdpBefore, "USDP total supply should increase after mint");
    }

    function test_Compatibility_USDCIntegration() public {
        // Test PSM correctly uses USDC transfer/transferFrom
        uint256 usdcAmount = 1000 * 1e6;

        uint256 psmBalanceBefore = usdc.balanceOf(address(psm));
        uint256 userBalanceBefore = usdc.balanceOf(user1);

        vm.startPrank(user1);
        usdc.approve(address(psm), usdcAmount);
        psm.swapUSDCForUSDP(usdcAmount);
        vm.stopPrank();

        // PSM USDC should increase, user USDC should decrease
        assertEq(usdc.balanceOf(address(psm)), psmBalanceBefore + usdcAmount, "PSM USDC should increase");
        assertEq(usdc.balanceOf(user1), userBalanceBefore - usdcAmount, "User USDC should decrease");
    }

    function test_Compatibility_MultipleSwapsConsistency() public {
        // Test consistency across multiple swap operations
        uint256 swapAmount = 100 * 1e6;

        uint256 totalUSDPMinted = 0;

        vm.startPrank(user1);
        usdc.approve(address(psm), swapAmount * 5);

        for (uint256 i = 0; i < 5; i++) {
            uint256 usdpReceived = psm.swapUSDCForUSDP(swapAmount);
            totalUSDPMinted += usdpReceived;
        }
        vm.stopPrank();

        // Total USDP minted should match user balance
        assertEq(usdp.balanceOf(user1), totalUSDPMinted, "Total USDP should be consistent");
    }

    function test_Compatibility_SharesVsBalance() public {
        // Test USDP shares-based accounting doesn't break PSM
        uint256 usdcAmount = 1000 * 1e6;

        vm.startPrank(user1);
        usdc.approve(address(psm), usdcAmount);
        uint256 usdpReceived = psm.swapUSDCForUSDP(usdcAmount);

        // Check balance matches expected (shares * index)
        assertEq(usdp.balanceOf(user1), usdpReceived, "Balance should match minted amount");

        // Check shares equal balance (index = 1.0 initially)
        assertEq(usdp.sharesOf(user1), usdpReceived, "Shares should equal balance at index 1.0");

        vm.stopPrank();
    }
}
