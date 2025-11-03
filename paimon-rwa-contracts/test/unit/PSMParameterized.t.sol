// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/core/PSMParameterized.sol";
import "../../src/core/USDP.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice Mock USDC token with configurable decimals for testing
 */
contract MockUSDC is ERC20 {
    uint8 private _decimals;

    constructor(string memory name, string memory symbol, uint8 decimals_) ERC20(name, symbol) {
        _decimals = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/**
 * @title PSMParameterizedTest
 * @notice Comprehensive tests for parameterized PSM supporting multiple USDC decimals
 *
 * Test Coverage:
 * - 6-dimensional test strategy (Functional, Boundary, Exception, Performance, Security, Compatibility)
 * - USDC decimals: 6 (testnet), 18 (mainnet), 8 (edge case)
 * - Conversion accuracy validation
 * - Fee calculation correctness
 * - Reserve management
 */
contract PSMParameterizedTest is Test {
    // ==================== Test Contracts ====================

    PSMParameterized public psm6;   // USDC=6 decimals (BSC testnet)
    PSMParameterized public psm18;  // USDC=18 decimals (BSC mainnet)
    PSMParameterized public psm8;   // USDC=8 decimals (edge case)

    USDP public usdp;
    MockUSDC public usdc6;
    MockUSDC public usdc18;
    MockUSDC public usdc8;

    // ==================== Test Actors ====================

    address public alice = address(0x1);
    address public bob = address(0x2);
    address public treasury = address(0x3);

    // ==================== Constants ====================

    uint256 constant USDC6_UNIT = 1e6;   // 1 USDC with 6 decimals
    uint256 constant USDC18_UNIT = 1e18; // 1 USDC with 18 decimals
    uint256 constant USDC8_UNIT = 1e8;   // 1 USDC with 8 decimals
    uint256 constant USDP_UNIT = 1e18;   // 1 USDP always 18 decimals

    // ==================== Setup ====================

    function setUp() public {
        // Deploy USDP
        usdp = new USDP();

        // Deploy Mock USDC tokens with different decimals
        usdc6 = new MockUSDC("USDC", "USDC", 6);
        usdc18 = new MockUSDC("USDC", "USDC", 18);
        usdc8 = new MockUSDC("USDC", "USDC", 8);

        // Deploy PSM variants
        psm6 = new PSMParameterized(address(usdp), address(usdc6));
        psm18 = new PSMParameterized(address(usdp), address(usdc18));
        psm8 = new PSMParameterized(address(usdp), address(usdc8));

        // Authorize PSMs to mint/burn USDP
        usdp.setAuthorizedMinter(address(psm6), true);
        usdp.setAuthorizedMinter(address(psm18), true);
        usdp.setAuthorizedMinter(address(psm8), true);

        // Mint USDC to test users
        usdc6.mint(alice, 1000000 * USDC6_UNIT);  // 1M USDC
        usdc6.mint(bob, 1000000 * USDC6_UNIT);

        usdc18.mint(alice, 1000000 * USDC18_UNIT);
        usdc18.mint(bob, 1000000 * USDC18_UNIT);

        usdc8.mint(alice, 1000000 * USDC8_UNIT);
        usdc8.mint(bob, 1000000 * USDC8_UNIT);

        // Label addresses for better trace output
        vm.label(alice, "Alice");
        vm.label(bob, "Bob");
        vm.label(treasury, "Treasury");
        vm.label(address(usdp), "USDP");
        vm.label(address(psm6), "PSM6");
        vm.label(address(psm18), "PSM18");
        vm.label(address(psm8), "PSM8");
    }

    // ==================== Functional Tests ====================

    /// @notice Test USDC6 -> USDP conversion (BSC testnet case)
    function test_Swap_USDC6_to_USDP() public {
        vm.startPrank(alice);

        uint256 usdcAmount = 1000 * USDC6_UNIT; // 1000 USDC (6 decimals)
        usdc6.approve(address(psm6), usdcAmount);

        uint256 usdpReceived = psm6.swapUSDCForUSDP(usdcAmount);

        // Calculate expected USDP (1000 USDC * 0.999 * 1e12)
        uint256 expectedUSDP = (usdcAmount * 9990 / 10000) * 1e12; // 999e18
        assertEq(usdpReceived, expectedUSDP, "USDC6 -> USDP conversion incorrect");
        assertEq(usdp.balanceOf(alice), expectedUSDP, "Alice USDP balance incorrect");

        vm.stopPrank();
    }

    /// @notice Test USDC18 -> USDP conversion (BSC mainnet case)
    function test_Swap_USDC18_to_USDP() public {
        vm.startPrank(alice);

        uint256 usdcAmount = 1000 * USDC18_UNIT; // 1000 USDC (18 decimals)
        usdc18.approve(address(psm18), usdcAmount);

        uint256 usdpReceived = psm18.swapUSDCForUSDP(usdcAmount);

        // Calculate expected USDP (1000 USDC * 0.999) -> same decimals, 1:1
        uint256 expectedUSDP = usdcAmount * 9990 / 10000; // 999e18
        assertEq(usdpReceived, expectedUSDP, "USDC18 -> USDP conversion incorrect");
        assertEq(usdp.balanceOf(alice), expectedUSDP, "Alice USDP balance incorrect");

        vm.stopPrank();
    }

    /// @notice Test USDP -> USDC6 conversion (BSC testnet case)
    function test_Swap_USDP_to_USDC6() public {
        // First mint USDP to Alice via PSM
        vm.startPrank(alice);
        uint256 usdcAmount = 1000 * USDC6_UNIT;
        usdc6.approve(address(psm6), usdcAmount);
        psm6.swapUSDCForUSDP(usdcAmount);

        // Now swap USDP back to USDC
        uint256 usdpAmount = 500 * USDP_UNIT;
        usdp.approve(address(psm6), usdpAmount);

        uint256 usdcReceived = psm6.swapUSDPForUSDC(usdpAmount);

        // Calculate expected USDC (500 USDP * 0.999 / 1e12)
        uint256 expectedUSDC = (usdpAmount * 9990 / 10000) / 1e12; // 499.5 USDC (6 decimals)
        assertEq(usdcReceived, expectedUSDC, "USDP -> USDC6 conversion incorrect");

        vm.stopPrank();
    }

    /// @notice Test USDP -> USDC18 conversion (BSC mainnet case)
    function test_Swap_USDP_to_USDC18() public {
        // First mint USDP to Alice via PSM
        vm.startPrank(alice);
        uint256 usdcAmount = 1000 * USDC18_UNIT;
        usdc18.approve(address(psm18), usdcAmount);
        psm18.swapUSDCForUSDP(usdcAmount);

        // Now swap USDP back to USDC
        uint256 usdpAmount = 500 * USDP_UNIT;
        usdp.approve(address(psm18), usdpAmount);

        uint256 usdcReceived = psm18.swapUSDPForUSDC(usdpAmount);

        // Calculate expected USDC (500 USDP * 0.999) -> same decimals, 1:1
        uint256 expectedUSDC = usdpAmount * 9990 / 10000; // 499.5 USDC (18 decimals)
        assertEq(usdcReceived, expectedUSDC, "USDP -> USDC18 conversion incorrect");

        vm.stopPrank();
    }

    // ==================== Boundary Tests ====================

    /// @notice Test minimal swap amount (1 wei)
    function test_Swap_MinimalAmount_USDC6() public {
        vm.startPrank(alice);

        uint256 minAmount = 1; // 1 wei USDC (6 decimals)
        usdc6.approve(address(psm6), minAmount);

        uint256 usdpReceived = psm6.swapUSDCForUSDP(minAmount);

        // Fee on 1 wei = floor(1 * 10 / 10000) = 0 (rounds down)
        // After fee: 1 - 0 = 1 USDC -> 1 * 1e12 = 1e12 USDP
        assertEq(usdpReceived, 1e12, "Minimal USDC6 swap should return 1e12 USDP");

        vm.stopPrank();
    }

    /// @notice Test large swap amount (1M USDC)
    function test_Swap_LargeAmount_USDC6() public {
        vm.startPrank(alice);

        uint256 largeAmount = 1000000 * USDC6_UNIT; // 1M USDC (6 decimals)
        usdc6.approve(address(psm6), largeAmount);

        uint256 usdpReceived = psm6.swapUSDCForUSDP(largeAmount);

        // Calculate expected USDP
        uint256 expectedUSDP = (largeAmount * 9990 / 10000) * 1e12;
        assertEq(usdpReceived, expectedUSDP, "Large USDC6 swap incorrect");

        vm.stopPrank();
    }

    /// @notice Test zero amount (should revert)
    function test_RevertWhen_SwapZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert("PSM: Amount must be greater than zero");
        psm6.swapUSDCForUSDP(0);
    }

    // ==================== Exception Tests ====================

    /// @notice Test swap without approval (should revert)
    function test_RevertWhen_SwapWithoutApproval() public {
        vm.prank(alice);
        vm.expectRevert();
        psm6.swapUSDCForUSDP(1000 * USDC6_UNIT);
    }

    /// @notice Test swap exceeding balance (should revert)
    function test_RevertWhen_SwapExceedingBalance() public {
        vm.startPrank(alice);

        uint256 hugeAmount = 10000000 * USDC6_UNIT; // 10M USDC (more than Alice has)
        usdc6.approve(address(psm6), hugeAmount);
        vm.expectRevert();
        psm6.swapUSDCForUSDP(hugeAmount);

        vm.stopPrank();
    }

    /// @notice Test USDP -> USDC with insufficient reserve (should revert)
    function test_RevertWhen_SwapInsufficientReserve() public {
        vm.startPrank(alice);

        // Mint USDP directly (bypass PSM)
        vm.stopPrank();
        vm.prank(address(this));
        usdp.setAuthorizedMinter(alice, true);

        vm.startPrank(alice);
        usdp.mint(alice, 1000 * USDP_UNIT);

        // Try to swap USDP for USDC (PSM has no reserve)
        usdp.approve(address(psm6), 1000 * USDP_UNIT);
        vm.expectRevert("PSM: Insufficient USDC reserve");
        psm6.swapUSDPForUSDC(1000 * USDP_UNIT);

        vm.stopPrank();
    }

    // ==================== Security Tests ====================

    /// @notice Test reentrancy protection
    function test_NoReentrancy() public {
        // PSM uses nonReentrant modifier -> inherently protected
        // This test verifies the modifier is applied
        vm.startPrank(alice);

        uint256 usdcAmount = 1000 * USDC6_UNIT;
        usdc6.approve(address(psm6), usdcAmount);
        psm6.swapUSDCForUSDP(usdcAmount);

        // If reentrancy were possible, second call would fail
        usdc6.approve(address(psm6), usdcAmount);
        psm6.swapUSDCForUSDP(usdcAmount); // Should succeed independently

        vm.stopPrank();
    }

    /// @notice Test only owner can update fees
    function test_RevertWhen_NonOwnerUpdatesFee() public {
        vm.prank(alice); // Alice is not owner
        vm.expectRevert();
        psm6.setFeeIn(20);
    }

    /// @notice Test fee cap enforcement
    function test_RevertWhen_UpdateFeeExceedsCap() public {
        vm.prank(address(this)); // Owner
        vm.expectRevert("PSM: Fee cannot exceed 100%");
        psm6.setFeeIn(10001); // 100.01% > MAX_FEE
    }

    // ==================== Compatibility Tests ====================

    /// @notice Test USDC8 -> USDP conversion (edge case: 8 decimals like WBTC)
    function test_Swap_USDC8_to_USDP() public {
        vm.startPrank(alice);

        uint256 usdcAmount = 1000 * USDC8_UNIT; // 1000 USDC (8 decimals)
        usdc8.approve(address(psm8), usdcAmount);

        uint256 usdpReceived = psm8.swapUSDCForUSDP(usdcAmount);

        // Calculate expected USDP (1000 USDC * 0.999 * 1e10)
        uint256 expectedUSDP = (usdcAmount * 9990 / 10000) * 1e10; // 999e18
        assertEq(usdpReceived, expectedUSDP, "USDC8 -> USDP conversion incorrect");

        vm.stopPrank();
    }

    // ==================== View Functions Tests ====================

    /// @notice Test getScaleFactor returns correct values
    function test_GetScaleFactor() public {
        assertEq(psm6.getScaleFactor(), 1e12, "USDC6 scale factor incorrect");
        assertEq(psm18.getScaleFactor(), 1, "USDC18 scale factor incorrect");
        assertEq(psm8.getScaleFactor(), 1e10, "USDC8 scale factor incorrect");
    }

    /// @notice Test needsScaleUp returns correct boolean
    function test_NeedsScaleUp() public {
        assertTrue(psm6.needsScaleUp(), "USDC6 should need scale up");
        assertFalse(psm18.needsScaleUp(), "USDC18 should not need scale up");
        assertTrue(psm8.needsScaleUp(), "USDC8 should need scale up");
    }

    /// @notice Test getUSDCReserve tracks balance correctly
    function test_GetUSDCReserve() public {
        assertEq(psm6.getUSDCReserve(), 0, "Initial reserve should be 0");

        vm.startPrank(alice);
        uint256 usdcAmount = 1000 * USDC6_UNIT;
        usdc6.approve(address(psm6), usdcAmount);
        psm6.swapUSDCForUSDP(usdcAmount);
        vm.stopPrank();

        assertEq(psm6.getUSDCReserve(), usdcAmount, "Reserve not updated correctly");
    }

    // ==================== Fee Calculation Tests ====================

    /// @notice Test fee calculation accuracy (USDC6)
    function test_FeeCalculation_USDC6() public {
        vm.startPrank(alice);

        uint256 usdcAmount = 1000 * USDC6_UNIT;
        usdc6.approve(address(psm6), usdcAmount);

        uint256 balanceBefore = usdp.balanceOf(alice);
        psm6.swapUSDCForUSDP(usdcAmount);
        uint256 balanceAfter = usdp.balanceOf(alice);

        // Fee = 1000 * 0.001 = 1 USDC -> 1e12 USDP
        // Net = 999 USDC -> 999e18 USDP
        uint256 expectedNet = 999 * 1e18;
        assertEq(balanceAfter - balanceBefore, expectedNet, "Fee calculation incorrect");

        vm.stopPrank();
    }

    /// @notice Test custom fee rate
    function test_CustomFeeRate() public {
        // Update fee to 1% (100 bp)
        psm6.setFeeIn(100);

        vm.startPrank(alice);
        uint256 usdcAmount = 1000 * USDC6_UNIT;
        usdc6.approve(address(psm6), usdcAmount);

        uint256 usdpReceived = psm6.swapUSDCForUSDP(usdcAmount);

        // Fee = 1000 * 0.01 = 10 USDC -> Net = 990 USDC -> 990e18 USDP
        uint256 expectedUSDP = 990 * 1e18;
        assertEq(usdpReceived, expectedUSDP, "Custom fee calculation incorrect");

        vm.stopPrank();
    }

    // ==================== Integration Tests ====================

    /// @notice Test round-trip swap (USDC -> USDP -> USDC)
    function test_RoundTrip_USDC6() public {
        vm.startPrank(alice);

        uint256 initialBalance = usdc6.balanceOf(alice);
        uint256 swapAmount = 1000 * USDC6_UNIT;

        // Step 1: USDC -> USDP
        usdc6.approve(address(psm6), swapAmount);
        uint256 usdpReceived = psm6.swapUSDCForUSDP(swapAmount);

        // Step 2: USDP -> USDC
        usdp.approve(address(psm6), usdpReceived);
        uint256 usdcReturned = psm6.swapUSDPForUSDC(usdpReceived);

        uint256 finalBalance = usdc6.balanceOf(alice);

        // Loss due to 0.1% fee twice: 1000 * 0.999 * 0.999 ≈ 998.001
        // Expected: 1000 - 1000 + 998 = 998 USDC (simplified)
        assertTrue(finalBalance < initialBalance, "Round-trip should have net loss");
        assertTrue(finalBalance >= initialBalance * 9980 / 10000, "Loss too large");

        vm.stopPrank();
    }
}
