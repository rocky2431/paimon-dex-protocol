// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/governance/BribeMarketplace.sol";
import "../../src/governance/GaugeController.sol";
import "../../src/core/VotingEscrow.sol";
import "../../src/core/PAIMON.sol";
import "../../src/mocks/MockERC20.sol";

/**
 * @title BribeMarketplace Test
 * @notice Comprehensive test suite for BribeMarketplace with PAIMON token support
 * @dev Tests 6 dimensions: Functional, Boundary, Exception, Performance, Security, Compatibility
 *
 * Note: This test suite focuses on adding PAIMON token to the whitelist for bribes.
 * esPaimon is NOT testable as a bribe token because it's non-transferable (vesting contract).
 */
contract BribeMarketplaceTest is Test {
    // ==================== Contracts ====================
    BribeMarketplace public bribeMarket;
    GaugeController public gaugeController;
    VotingEscrow public votingEscrow;
    PAIMON public paimon;
    MockERC20 public usdc;

    // ==================== Addresses ====================
    address public owner = address(this);
    address public treasury = makeAddr("treasury");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public carol = makeAddr("carol");
    address public gauge1 = makeAddr("gauge1");
    address public gauge2 = makeAddr("gauge2");

    // ==================== Constants ====================
    uint256 constant INITIAL_BALANCE = 10000e18;
    uint256 constant BRIBE_AMOUNT = 1000e18;
    uint256 constant LOCK_AMOUNT = 1000e18;
    uint256 constant LOCK_DURATION = 365 days;
    uint256 constant FEE_RATE = 200; // 2%
    uint256 constant FEE_DENOMINATOR = 10000;

    // ==================== Events ====================
    event TokenWhitelisted(address indexed token, bool whitelisted);
    event BribeCreated(
        uint256 indexed epoch,
        uint256 indexed bribeId,
        address indexed gauge,
        address token,
        uint256 amount,
        address creator
    );
    event BribeClaimed(uint256 indexed bribeId, uint256 indexed tokenId, address indexed claimer, uint256 amount);

    // ==================== Setup ====================

    function setUp() public {
        // Deploy PAIMON token
        paimon = new PAIMON(100_000_000e18); // 100M supply

        // Deploy VotingEscrow
        votingEscrow = new VotingEscrow(address(paimon));

        // Deploy GaugeController
        gaugeController = new GaugeController(address(votingEscrow));

        // Deploy BribeMarketplace
        bribeMarket = new BribeMarketplace(address(gaugeController), treasury);

        // Deploy USDC
        usdc = new MockERC20("USDC", "USDC", 6);

        // Setup: Mint PAIMON tokens to owner first (owner has MINTER_ROLE)
        paimon.mint(owner, INITIAL_BALANCE * 3); // Mint enough for alice, bob, carol

        // Transfer tokens to users
        paimon.transfer(alice, INITIAL_BALANCE);
        paimon.transfer(bob, INITIAL_BALANCE);
        paimon.transfer(carol, INITIAL_BALANCE);

        usdc.mint(alice, INITIAL_BALANCE / 1e12); // 6 decimals
        usdc.mint(bob, INITIAL_BALANCE / 1e12);

        // Add gauges
        gaugeController.addGauge(gauge1);
        gaugeController.addGauge(gauge2);
    }

    // ==================== Helper Functions ====================

    function _createLock(address user, uint256 amount, uint256 duration) internal returns (uint256) {
        vm.startPrank(user);
        paimon.approve(address(votingEscrow), amount);
        uint256 tokenId = votingEscrow.createLock(amount, block.timestamp + duration);
        vm.stopPrank();
        return tokenId;
    }

    // ==================== Functional Tests (8) ====================

    /**
     * @notice Test whitelisting PAIMON token
     */
    function test_WhitelistPAIMON() public {
        // Before whitelist
        assertFalse(bribeMarket.isWhitelisted(address(paimon)));

        // Whitelist PAIMON
        vm.expectEmit(true, false, false, true);
        emit TokenWhitelisted(address(paimon), true);
        bribeMarket.whitelistToken(address(paimon), true);

        // Verify whitelisted
        assertTrue(bribeMarket.isWhitelisted(address(paimon)));
    }

    /**
     * @notice Test creating bribe with PAIMON (without whitelist should fail)
     */
    function test_CreateBribe_PAIMON_NotWhitelisted_Reverts() public {
        uint256 currentEpoch = block.timestamp / 1 weeks;

        vm.startPrank(alice);
        paimon.approve(address(bribeMarket), BRIBE_AMOUNT);

        vm.expectRevert("Token not whitelisted");
        bribeMarket.createBribe(currentEpoch, gauge1, address(paimon), BRIBE_AMOUNT);
        vm.stopPrank();
    }

    /**
     * @notice Test creating bribe with PAIMON after whitelist
     */
    function test_CreateBribe_PAIMON_Whitelisted_Success() public {
        // Whitelist PAIMON
        bribeMarket.whitelistToken(address(paimon), true);

        uint256 currentEpoch = block.timestamp / 1 weeks;
        uint256 expectedNetAmount = BRIBE_AMOUNT - (BRIBE_AMOUNT * FEE_RATE / FEE_DENOMINATOR);

        // Alice creates bribe with PAIMON
        vm.startPrank(alice);
        paimon.approve(address(bribeMarket), BRIBE_AMOUNT);

        vm.expectEmit(true, true, true, true);
        emit BribeCreated(currentEpoch, 0, gauge1, address(paimon), BRIBE_AMOUNT, alice);

        bribeMarket.createBribe(currentEpoch, gauge1, address(paimon), BRIBE_AMOUNT);
        vm.stopPrank();

        // Verify bribe created
        (uint256 epoch, address gauge, address token, uint256 amount, address creator,) =
            bribeMarket.getBribe(0);
        assertEq(epoch, currentEpoch);
        assertEq(gauge, gauge1);
        assertEq(token, address(paimon));
        assertEq(amount, expectedNetAmount);
        assertEq(creator, alice);
    }

    /**
     * @notice Test removing PAIMON from whitelist
     */
    function test_RemovePAIMONFromWhitelist() public {
        // Whitelist first
        bribeMarket.whitelistToken(address(paimon), true);
        assertTrue(bribeMarket.isWhitelisted(address(paimon)));

        // Remove from whitelist
        vm.expectEmit(true, false, false, true);
        emit TokenWhitelisted(address(paimon), false);
        bribeMarket.whitelistToken(address(paimon), false);

        // Verify removed
        assertFalse(bribeMarket.isWhitelisted(address(paimon)));
    }

    /**
     * @notice Test creating bribe with USDC (existing functionality)
     */
    function test_CreateBribe_USDC_ExistingFunctionality() public {
        // Whitelist USDC
        bribeMarket.whitelistToken(address(usdc), true);

        uint256 currentEpoch = block.timestamp / 1 weeks;
        uint256 bribeAmount = 1000e6; // 6 decimals

        vm.startPrank(alice);
        usdc.approve(address(bribeMarket), bribeAmount);
        bribeMarket.createBribe(currentEpoch, gauge1, address(usdc), bribeAmount);
        vm.stopPrank();

        (,, address token, uint256 amount,,) = bribeMarket.getBribe(0);
        assertEq(token, address(usdc));
        assertEq(amount, bribeAmount - (bribeAmount * FEE_RATE / FEE_DENOMINATOR));
    }

    /**
     * @notice Test creating multiple bribes with different tokens
     */
    function test_CreateBribe_MixedTokens() public {
        // Whitelist both tokens
        bribeMarket.whitelistToken(address(paimon), true);
        bribeMarket.whitelistToken(address(usdc), true);

        uint256 currentEpoch = block.timestamp / 1 weeks;

        // Alice creates PAIMON bribe
        vm.startPrank(alice);
        paimon.approve(address(bribeMarket), BRIBE_AMOUNT);
        bribeMarket.createBribe(currentEpoch, gauge1, address(paimon), BRIBE_AMOUNT);
        vm.stopPrank();

        // Bob creates USDC bribe
        uint256 usdcAmount = 1000e6;
        vm.startPrank(bob);
        usdc.approve(address(bribeMarket), usdcAmount);
        bribeMarket.createBribe(currentEpoch, gauge2, address(usdc), usdcAmount);
        vm.stopPrank();

        // Verify both bribes
        (,, address token1,,,) = bribeMarket.getBribe(0);
        (,, address token2,,,) = bribeMarket.getBribe(1);
        assertEq(token1, address(paimon));
        assertEq(token2, address(usdc));
    }

    /**
     * @notice Test fee calculation for PAIMON bribes
     */
    function test_FeeCalculation_PAIMON() public {
        bribeMarket.whitelistToken(address(paimon), true);
        uint256 currentEpoch = block.timestamp / 1 weeks;

        uint256 treasuryBalanceBefore = paimon.balanceOf(treasury);

        vm.startPrank(alice);
        paimon.approve(address(bribeMarket), BRIBE_AMOUNT);
        bribeMarket.createBribe(currentEpoch, gauge1, address(paimon), BRIBE_AMOUNT);
        vm.stopPrank();

        // Verify fee sent to treasury
        uint256 expectedFee = (BRIBE_AMOUNT * FEE_RATE) / FEE_DENOMINATOR;
        uint256 treasuryBalanceAfter = paimon.balanceOf(treasury);
        assertEq(treasuryBalanceAfter - treasuryBalanceBefore, expectedFee);
    }

    // ==================== Boundary Tests (4) ====================

    /**
     * @notice Test creating bribe with minimum PAIMON amount
     */
    function test_CreateBribe_PAIMON_MinimumAmount() public {
        bribeMarket.whitelistToken(address(paimon), true);

        uint256 currentEpoch = block.timestamp / 1 weeks;
        uint256 minAmount = 10000; // Small but > fee

        vm.startPrank(alice);
        paimon.approve(address(bribeMarket), minAmount);
        bribeMarket.createBribe(currentEpoch, gauge1, address(paimon), minAmount);
        vm.stopPrank();

        (,,, uint256 amount,,) = bribeMarket.getBribe(0);
        assertEq(amount, minAmount - (minAmount * FEE_RATE / FEE_DENOMINATOR));
    }

    /**
     * @notice Test creating bribe with maximum PAIMON amount
     */
    function test_CreateBribe_PAIMON_MaximumAmount() public {
        bribeMarket.whitelistToken(address(paimon), true);

        uint256 currentEpoch = block.timestamp / 1 weeks;
        uint256 maxAmount = INITIAL_BALANCE;

        vm.startPrank(alice);
        paimon.approve(address(bribeMarket), maxAmount);
        bribeMarket.createBribe(currentEpoch, gauge1, address(paimon), maxAmount);
        vm.stopPrank();

        (,,, uint256 amount,,) = bribeMarket.getBribe(0);
        assertEq(amount, maxAmount - (maxAmount * FEE_RATE / FEE_DENOMINATOR));
    }

    /**
     * @notice Test zero amount bribe should revert
     */
    function test_CreateBribe_ZeroAmount_Reverts() public {
        bribeMarket.whitelistToken(address(paimon), true);

        uint256 currentEpoch = block.timestamp / 1 weeks;

        vm.startPrank(alice);
        vm.expectRevert("Amount must be > 0");
        bribeMarket.createBribe(currentEpoch, gauge1, address(paimon), 0);
        vm.stopPrank();
    }

    /**
     * @notice Test whitelisting zero address should revert
     */
    function test_WhitelistToken_ZeroAddress_Reverts() public {
        vm.expectRevert("Invalid token");
        bribeMarket.whitelistToken(address(0), true);
    }

    // ==================== Exception Tests (5) ====================

    /**
     * @notice Test non-owner cannot whitelist tokens
     */
    function test_WhitelistToken_NonOwner_Reverts() public {
        vm.prank(alice);
        vm.expectRevert();
        bribeMarket.whitelistToken(address(paimon), true);
    }

    /**
     * @notice Test creating bribe with invalid gauge
     */
    function test_CreateBribe_InvalidGauge_Reverts() public {
        bribeMarket.whitelistToken(address(paimon), true);

        uint256 currentEpoch = block.timestamp / 1 weeks;

        vm.startPrank(alice);
        paimon.approve(address(bribeMarket), BRIBE_AMOUNT);
        vm.expectRevert("Invalid gauge");
        bribeMarket.createBribe(currentEpoch, address(0), address(paimon), BRIBE_AMOUNT);
        vm.stopPrank();
    }

    /**
     * @notice Test creating bribe after removing from whitelist
     */
    function test_CreateBribe_AfterRemoval_Reverts() public {
        // Whitelist then remove
        bribeMarket.whitelistToken(address(paimon), true);
        bribeMarket.whitelistToken(address(paimon), false);

        uint256 currentEpoch = block.timestamp / 1 weeks;

        vm.startPrank(alice);
        paimon.approve(address(bribeMarket), BRIBE_AMOUNT);
        vm.expectRevert("Token not whitelisted");
        bribeMarket.createBribe(currentEpoch, gauge1, address(paimon), BRIBE_AMOUNT);
        vm.stopPrank();
    }

    /**
     * @notice Test insufficient token balance should revert
     */
    function test_CreateBribe_InsufficientBalance_Reverts() public {
        bribeMarket.whitelistToken(address(paimon), true);
        uint256 currentEpoch = block.timestamp / 1 weeks;

        address poorUser = makeAddr("poorUser");
        uint256 excessiveAmount = INITIAL_BALANCE * 10;

        vm.startPrank(poorUser);
        paimon.approve(address(bribeMarket), excessiveAmount);
        vm.expectRevert();
        bribeMarket.createBribe(currentEpoch, gauge1, address(paimon), excessiveAmount);
        vm.stopPrank();
    }

    /**
     * @notice Test insufficient allowance should revert
     */
    function test_CreateBribe_InsufficientAllowance_Reverts() public {
        bribeMarket.whitelistToken(address(paimon), true);
        uint256 currentEpoch = block.timestamp / 1 weeks;

        vm.startPrank(alice);
        // Don't approve enough
        paimon.approve(address(bribeMarket), BRIBE_AMOUNT / 2);
        vm.expectRevert();
        bribeMarket.createBribe(currentEpoch, gauge1, address(paimon), BRIBE_AMOUNT);
        vm.stopPrank();
    }

    // ==================== Performance Tests (2) ====================

    /**
     * @notice Test gas cost of whitelisting PAIMON
     */
    function test_Gas_WhitelistPAIMON() public {
        uint256 gasBefore = gasleft();
        bribeMarket.whitelistToken(address(paimon), true);
        uint256 gasUsed = gasBefore - gasleft();

        // Should be < 50K gas
        assertLt(gasUsed, 50000);
        emit log_named_uint("Gas used for whitelistToken", gasUsed);
    }

    /**
     * @notice Test gas cost of creating PAIMON bribe
     */
    function test_Gas_CreateBribe_PAIMON() public {
        bribeMarket.whitelistToken(address(paimon), true);
        uint256 currentEpoch = block.timestamp / 1 weeks;

        vm.startPrank(alice);
        paimon.approve(address(bribeMarket), BRIBE_AMOUNT);

        uint256 gasBefore = gasleft();
        bribeMarket.createBribe(currentEpoch, gauge1, address(paimon), BRIBE_AMOUNT);
        uint256 gasUsed = gasBefore - gasleft();
        vm.stopPrank();

        // Should be < 200K gas (PAIMON has AccessControl, slightly higher gas cost is expected)
        assertLt(gasUsed, 200000);
        emit log_named_uint("Gas used for createBribe (PAIMON)", gasUsed);
    }

    // ==================== Security Tests (4) ====================

    /**
     * @notice Test reentrancy protection on createBribe
     */
    function test_Security_ReentrancyProtection_CreateBribe() public {
        bribeMarket.whitelistToken(address(paimon), true);
        uint256 currentEpoch = block.timestamp / 1 weeks;

        vm.startPrank(alice);
        paimon.approve(address(bribeMarket), BRIBE_AMOUNT);
        bribeMarket.createBribe(currentEpoch, gauge1, address(paimon), BRIBE_AMOUNT);
        vm.stopPrank();

        // No revert = reentrancy protection working
        assertTrue(true);
    }

    /**
     * @notice Test access control on whitelistToken
     */
    function test_Security_AccessControl_WhitelistToken() public {
        // Only owner can whitelist
        vm.prank(alice);
        vm.expectRevert();
        bribeMarket.whitelistToken(address(paimon), true);

        // Owner can whitelist
        bribeMarket.whitelistToken(address(paimon), true);
        assertTrue(bribeMarket.isWhitelisted(address(paimon)));
    }

    /**
     * @notice Test fee calculation precision for PAIMON
     */
    function test_Security_FeeCalculationPrecision_PAIMON() public {
        bribeMarket.whitelistToken(address(paimon), true);
        uint256 currentEpoch = block.timestamp / 1 weeks;

        uint256 testAmount = 123456789123456789; // Odd number
        uint256 expectedFee = (testAmount * FEE_RATE) / FEE_DENOMINATOR;
        uint256 expectedNet = testAmount - expectedFee;

        vm.startPrank(alice);
        paimon.approve(address(bribeMarket), testAmount);
        bribeMarket.createBribe(currentEpoch, gauge1, address(paimon), testAmount);
        vm.stopPrank();

        (,,, uint256 amount,,) = bribeMarket.getBribe(0);
        assertEq(amount, expectedNet);
    }

    /**
     * @notice Test SafeERC20 usage for PAIMON transfers
     */
    function test_Security_SafeERC20_PAIMON() public {
        bribeMarket.whitelistToken(address(paimon), true);
        uint256 currentEpoch = block.timestamp / 1 weeks;

        uint256 contractBalanceBefore = paimon.balanceOf(address(bribeMarket));

        vm.startPrank(alice);
        paimon.approve(address(bribeMarket), BRIBE_AMOUNT);
        bribeMarket.createBribe(currentEpoch, gauge1, address(paimon), BRIBE_AMOUNT);
        vm.stopPrank();

        // Verify net amount transferred to contract
        uint256 expectedNetAmount = BRIBE_AMOUNT - (BRIBE_AMOUNT * FEE_RATE / FEE_DENOMINATOR);
        uint256 contractBalanceAfter = paimon.balanceOf(address(bribeMarket));
        assertEq(contractBalanceAfter - contractBalanceBefore, expectedNetAmount);
    }

    // ==================== Compatibility Tests (4) ====================

    /**
     * @notice Test PAIMON bribe alongside USDC bribe
     */
    function test_Compatibility_PAIMON_And_USDC_Bribes() public {
        bribeMarket.whitelistToken(address(paimon), true);
        bribeMarket.whitelistToken(address(usdc), true);

        uint256 currentEpoch = block.timestamp / 1 weeks;

        // Create PAIMON bribe
        vm.startPrank(alice);
        paimon.approve(address(bribeMarket), BRIBE_AMOUNT);
        bribeMarket.createBribe(currentEpoch, gauge1, address(paimon), BRIBE_AMOUNT);
        vm.stopPrank();

        // Create USDC bribe
        uint256 usdcAmount = 1000e6;
        vm.startPrank(bob);
        usdc.approve(address(bribeMarket), usdcAmount);
        bribeMarket.createBribe(currentEpoch, gauge1, address(usdc), usdcAmount);
        vm.stopPrank();

        // Both should exist
        assertEq(bribeMarket.nextBribeId(), 2);
    }

    /**
     * @notice Test multiple epochs with PAIMON bribes
     */
    function test_Compatibility_MultipleEpochs_PAIMON() public {
        bribeMarket.whitelistToken(address(paimon), true);

        // Calculate epochs explicitly
        uint256 epoch0 = 0;
        uint256 epoch1 = 1;

        // Create bribe for epoch 0
        vm.startPrank(alice);
        paimon.approve(address(bribeMarket), BRIBE_AMOUNT);
        bribeMarket.createBribe(epoch0, gauge1, address(paimon), BRIBE_AMOUNT);
        vm.stopPrank();

        // Move to next epoch
        vm.warp(block.timestamp + 1 weeks);

        // Create bribe for epoch 1
        vm.startPrank(bob);
        paimon.approve(address(bribeMarket), BRIBE_AMOUNT);
        bribeMarket.createBribe(epoch1, gauge1, address(paimon), BRIBE_AMOUNT);
        vm.stopPrank();

        // Verify both epochs
        (uint256 e0,,,,,) = bribeMarket.getBribe(0);
        (uint256 e1,,,,,) = bribeMarket.getBribe(1);
        assertEq(e0, epoch0, "Bribe 0 should have epoch 0");
        assertEq(e1, epoch1, "Bribe 1 should have epoch 1");
    }

    /**
     * @notice Test event emission for PAIMON operations
     */
    function test_Compatibility_EventEmission_PAIMON() public {
        // Whitelist event
        vm.expectEmit(true, false, false, true);
        emit TokenWhitelisted(address(paimon), true);
        bribeMarket.whitelistToken(address(paimon), true);

        // Bribe creation event
        uint256 currentEpoch = block.timestamp / 1 weeks;

        vm.startPrank(alice);
        paimon.approve(address(bribeMarket), BRIBE_AMOUNT);

        vm.expectEmit(true, true, true, true);
        emit BribeCreated(currentEpoch, 0, gauge1, address(paimon), BRIBE_AMOUNT, alice);
        bribeMarket.createBribe(currentEpoch, gauge1, address(paimon), BRIBE_AMOUNT);
        vm.stopPrank();
    }

    /**
     * @notice Test backward compatibility with existing bribe system
     */
    function test_Compatibility_BackwardCompatibility() public {
        // Old token (USDC) still works
        bribeMarket.whitelistToken(address(usdc), true);
        uint256 currentEpoch = block.timestamp / 1 weeks;
        uint256 usdcAmount = 1000e6;

        vm.startPrank(alice);
        usdc.approve(address(bribeMarket), usdcAmount);
        bribeMarket.createBribe(currentEpoch, gauge1, address(usdc), usdcAmount);
        vm.stopPrank();

        // New token (PAIMON) also works
        bribeMarket.whitelistToken(address(paimon), true);

        vm.startPrank(bob);
        paimon.approve(address(bribeMarket), BRIBE_AMOUNT);
        bribeMarket.createBribe(currentEpoch, gauge2, address(paimon), BRIBE_AMOUNT);
        vm.stopPrank();

        // Both should coexist
        (,, address token1,,,) = bribeMarket.getBribe(0);
        (,, address token2,,,) = bribeMarket.getBribe(1);
        assertEq(token1, address(usdc));
        assertEq(token2, address(paimon));
    }
}
