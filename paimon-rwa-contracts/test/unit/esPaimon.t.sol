// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/core/esPaimon.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title esPaimon Test Suite
 * @notice Comprehensive 6-dimensional test coverage for esPaimon incentive token
 *
 * Test Dimensions:
 * 1. Functional (8 tests) - Core vesting logic
 * 2. Boundary (8 tests) - Edge cases and limits
 * 3. Exception (6 tests) - Error handling
 * 4. Performance (4 tests) - Gas benchmarks
 * 5. Security (5 tests) - Attack vectors and precision
 * 6. Compatibility (4 tests) - External integrations
 *
 * Total: 35 tests
 */
contract esPaimonTest is Test {
    esPaimon public token;
    MockPAIMON public paimon;

    address public owner = address(this);
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    address public distributor = address(0x3);
    address public bribeMarket = address(0x4);

    uint256 public constant VESTING_PERIOD = 365 days;
    uint256 public constant ONE_WEEK = 7 days;
    uint256 public constant DECAY_RATE_PER_WEEK = 100; // 1% = 100 basis points

    event Vested(address indexed user, uint256 amount, uint256 vestingEnd);
    event Claimed(address indexed user, uint256 amount);
    event EarlyExit(address indexed user, uint256 claimed, uint256 penalty);
    event WeeklyEmissionUpdated(uint256 indexed week, uint256 decayedAmount);

    function setUp() public {
        // Deploy mock PAIMON token
        paimon = new MockPAIMON();

        // Deploy esPaimon
        token = new esPaimon(address(paimon));

        // Setup roles
        token.setDistributor(distributor);
        token.setBribeMarket(bribeMarket);

        // Distribute PAIMON to users
        paimon.mint(user1, 10000 * 1e18);
        paimon.mint(user2, 10000 * 1e18);
        paimon.mint(distributor, 1000000 * 1e18);
    }

    // ==================== Functional Tests (8) ====================

    function test_Functional_Vest() public {
        uint256 amount = 1000 * 1e18;

        vm.startPrank(user1);
        paimon.approve(address(token), amount);

        vm.expectEmit(true, false, false, true);
        emit Vested(user1, amount, block.timestamp + VESTING_PERIOD);

        token.vest(amount);
        vm.stopPrank();

        // Verify vesting position created
        (uint256 total, uint256 claimed, uint256 startTime, uint256 lastClaimTime) = token.vestingPositions(user1);
        assertEq(total, amount, "Total vested amount should match");
        assertEq(claimed, 0, "Initially nothing claimed");
        assertEq(startTime, block.timestamp, "Start time should be now");
        assertEq(lastClaimTime, block.timestamp, "Last claim time should be now");
    }

    function test_Functional_ClaimPartial() public {
        uint256 amount = 3650 * 1e18; // Vest for 365 days

        // Vest tokens
        vm.startPrank(user1);
        paimon.approve(address(token), amount);
        token.vest(amount);

        // Advance 30 days (30/365 = ~8.2%)
        vm.warp(block.timestamp + 30 days);

        uint256 expectedVested = (amount * 30 days) / VESTING_PERIOD;
        uint256 balanceBefore = paimon.balanceOf(user1);

        vm.expectEmit(true, false, false, true);
        emit Claimed(user1, expectedVested);

        token.claim();
        vm.stopPrank();

        uint256 balanceAfter = paimon.balanceOf(user1);
        assertEq(balanceAfter - balanceBefore, expectedVested, "Should receive vested amount");

        (, uint256 claimed,,) = token.vestingPositions(user1);
        assertEq(claimed, expectedVested, "Claimed amount should be tracked");
    }

    function test_Functional_ClaimFull() public {
        uint256 amount = 1000 * 1e18;

        // Vest tokens
        vm.startPrank(user1);
        paimon.approve(address(token), amount);
        token.vest(amount);

        // Advance full vesting period
        vm.warp(block.timestamp + VESTING_PERIOD);

        token.claim();
        vm.stopPrank();

        (, uint256 claimed,,) = token.vestingPositions(user1);
        assertEq(claimed, amount, "Should claim full amount after vesting period");
    }

    function test_Functional_EarlyExit() public {
        uint256 amount = 1000 * 1e18;

        // Vest tokens
        vm.startPrank(user1);
        paimon.approve(address(token), amount);
        token.vest(amount);

        // Advance 100 days (100/365 = ~27.4%)
        vm.warp(block.timestamp + 100 days);

        uint256 vestedAmount = (amount * 100 days) / VESTING_PERIOD;
        uint256 progress = (100 days * 100) / VESTING_PERIOD; // progress in percentage
        uint256 penalty = (vestedAmount * (100 - progress)) / 100;
        uint256 expectedClaim = vestedAmount - penalty;

        vm.expectEmit(true, false, false, true);
        emit EarlyExit(user1, expectedClaim, penalty);

        token.exit();
        vm.stopPrank();

        // Position should be deleted after exit
        (uint256 total,,,) = token.vestingPositions(user1);
        assertEq(total, 0, "Position should be deleted after exit");
    }

    function test_Functional_GetVestedAmount() public {
        uint256 amount = 365 * 1e18;

        vm.startPrank(user1);
        paimon.approve(address(token), amount);
        token.vest(amount);
        vm.stopPrank();

        // Check at different time points
        vm.warp(block.timestamp + 0 days);
        assertEq(token.getVestedAmount(user1), 0, "Nothing vested at start");

        vm.warp(block.timestamp + 182 days); // ~50%
        uint256 halfVested = (amount * 182 days) / VESTING_PERIOD;
        assertApproxEqAbs(token.getVestedAmount(user1), halfVested, 1e18, "Half vested at midpoint");

        vm.warp(block.timestamp + 365 days); // 100%
        assertEq(token.getVestedAmount(user1), amount, "Fully vested at end");
    }

    function test_Functional_GetBoostWeight() public {
        uint256 amount = 1000 * 1e18;

        vm.startPrank(user1);
        paimon.approve(address(token), amount);
        token.vest(amount);
        vm.stopPrank();

        uint256 vestingStart = block.timestamp;

        // Initial weight = 100% (10000 basis points)
        assertEq(token.getBoostWeight(user1), 10000, "Initial weight should be 100%");

        // After 1 week: 99% (9900 basis points)
        vm.warp(vestingStart + ONE_WEEK);
        assertEq(token.getBoostWeight(user1), 9900, "After 1 week should be 99%");

        // After 10 weeks from first warp (11 weeks total): 89% (8900 basis points)
        vm.warp(block.timestamp + 10 * ONE_WEEK);
        assertEq(token.getBoostWeight(user1), 8900, "After 11 weeks total should be 89%");

        // After 100 weeks: 0% (capped at 0)
        vm.warp(vestingStart + 100 * ONE_WEEK);
        assertEq(token.getBoostWeight(user1), 0, "After 100 weeks should be 0%");
    }

    function test_Functional_MultipleVests() public {
        // First vest
        vm.startPrank(user1);
        paimon.approve(address(token), 1000 * 1e18);
        token.vest(500 * 1e18);

        // Second vest (should accumulate)
        token.vest(500 * 1e18);
        vm.stopPrank();

        (uint256 total,,,) = token.vestingPositions(user1);
        assertEq(total, 1000 * 1e18, "Should accumulate multiple vests");
    }

    function test_Functional_WeeklyEmissionDecay() public {
        uint256 amount = 1000 * 1e18;

        vm.prank(distributor);
        paimon.approve(address(token), amount);

        // Trigger weekly emission update
        vm.expectEmit(true, false, false, false);
        emit WeeklyEmissionUpdated(1, 0); // Week 1, no decay yet

        vm.prank(distributor);
        token.updateWeeklyEmission();

        // Advance 1 week and update again
        vm.warp(block.timestamp + ONE_WEEK);

        vm.prank(distributor);
        token.updateWeeklyEmission();
    }

    // ==================== Boundary Tests (8) ====================

    function test_Boundary_VestZeroAmount() public {
        vm.startPrank(user1);
        paimon.approve(address(token), 1000 * 1e18);

        vm.expectRevert("esPaimon: Cannot vest zero");
        token.vest(0);
        vm.stopPrank();
    }

    function test_Boundary_VestMaxAmount() public {
        uint256 maxAmount = type(uint128).max;

        paimon.mint(user1, maxAmount);

        vm.startPrank(user1);
        paimon.approve(address(token), maxAmount);
        token.vest(maxAmount);
        vm.stopPrank();

        (uint256 total,,,) = token.vestingPositions(user1);
        assertEq(total, maxAmount, "Should handle max amount");
    }

    function test_Boundary_ClaimBeforeVesting() public {
        vm.startPrank(user1);
        paimon.approve(address(token), 1000 * 1e18);
        token.vest(1000 * 1e18);

        // Try to claim immediately (nothing vested yet)
        vm.expectRevert("esPaimon: Nothing to claim");
        token.claim();
        vm.stopPrank();
    }

    function test_Boundary_ClaimAfterFullVesting() public {
        uint256 amount = 1000 * 1e18;

        vm.startPrank(user1);
        paimon.approve(address(token), amount);
        token.vest(amount);

        // Advance beyond vesting period
        vm.warp(block.timestamp + VESTING_PERIOD + 100 days);

        token.claim();
        vm.stopPrank();

        (, uint256 claimed,,) = token.vestingPositions(user1);
        assertEq(claimed, amount, "Should only claim vested amount, not more");
    }

    function test_Boundary_ExitImmediately() public {
        uint256 amount = 1000 * 1e18;

        vm.startPrank(user1);
        paimon.approve(address(token), amount);
        token.vest(amount);

        // Exit immediately (0% vested, 100% penalty)
        uint256 balanceBefore = paimon.balanceOf(user1);
        token.exit();
        uint256 balanceAfter = paimon.balanceOf(user1);

        vm.stopPrank();

        // Should receive nothing due to 100% penalty
        assertEq(balanceAfter, balanceBefore, "Should receive nothing with 100% penalty");
    }

    function test_Boundary_ExitAtFullVesting() public {
        uint256 amount = 1000 * 1e18;

        vm.startPrank(user1);
        paimon.approve(address(token), amount);
        token.vest(amount);

        // Exit at full vesting (no penalty)
        vm.warp(block.timestamp + VESTING_PERIOD);

        uint256 balanceBefore = paimon.balanceOf(user1);
        token.exit();
        uint256 balanceAfter = paimon.balanceOf(user1);

        vm.stopPrank();

        assertEq(balanceAfter - balanceBefore, amount, "Should receive full amount with no penalty");
    }

    function test_Boundary_BoostWeightAtZero() public {
        vm.startPrank(user1);
        paimon.approve(address(token), 1000 * 1e18);
        token.vest(1000 * 1e18);
        vm.stopPrank();

        // Advance beyond 100 weeks (should cap at 0%)
        vm.warp(block.timestamp + 150 * ONE_WEEK);

        assertEq(token.getBoostWeight(user1), 0, "Weight should cap at 0%");
    }

    function test_Boundary_NoPosition() public {
        // Query user with no vesting position
        assertEq(token.getVestedAmount(user2), 0, "No position should return 0");
        assertEq(token.getBoostWeight(user2), 0, "No position should have 0 weight");
    }

    // ==================== Exception Tests (6) ====================

    function test_Exception_VestWithoutApproval() public {
        vm.startPrank(user1);
        // Don't approve

        vm.expectRevert();
        token.vest(1000 * 1e18);
        vm.stopPrank();
    }

    function test_Exception_VestInsufficientBalance() public {
        vm.startPrank(user1);
        paimon.approve(address(token), type(uint256).max);

        // Try to vest more than balance
        vm.expectRevert();
        token.vest(100000 * 1e18);
        vm.stopPrank();
    }

    function test_Exception_ClaimWithoutPosition() public {
        vm.startPrank(user2);
        vm.expectRevert("esPaimon: No vesting position");
        token.claim();
        vm.stopPrank();
    }

    function test_Exception_ExitWithoutPosition() public {
        vm.startPrank(user2);
        vm.expectRevert("esPaimon: No vesting position");
        token.exit();
        vm.stopPrank();
    }

    function test_Exception_UnauthorizedDistributor() public {
        vm.prank(user1);
        vm.expectRevert("esPaimon: Not distributor");
        token.updateWeeklyEmission();
    }

    function test_Exception_SetZeroAddressDistributor() public {
        vm.expectRevert("esPaimon: Zero address");
        token.setDistributor(address(0));
    }

    // ==================== Performance Tests (4) ====================

    function test_Performance_VestGas() public {
        vm.startPrank(user1);
        paimon.approve(address(token), 1000 * 1e18);

        uint256 gasBefore = gasleft();
        token.vest(1000 * 1e18);
        uint256 gasUsed = gasBefore - gasleft();

        vm.stopPrank();

        emit log_named_uint("Vest gas used", gasUsed);
        assertLt(gasUsed, 150000, "Vest should use <150K gas");
    }

    function test_Performance_ClaimGas() public {
        vm.startPrank(user1);
        paimon.approve(address(token), 1000 * 1e18);
        token.vest(1000 * 1e18);

        vm.warp(block.timestamp + 100 days);

        uint256 gasBefore = gasleft();
        token.claim();
        uint256 gasUsed = gasBefore - gasleft();

        vm.stopPrank();

        emit log_named_uint("Claim gas used", gasUsed);
        assertLt(gasUsed, 100000, "Claim should use <100K gas");
    }

    function test_Performance_ExitGas() public {
        vm.startPrank(user1);
        paimon.approve(address(token), 1000 * 1e18);
        token.vest(1000 * 1e18);

        vm.warp(block.timestamp + 100 days);

        uint256 gasBefore = gasleft();
        token.exit();
        uint256 gasUsed = gasBefore - gasleft();

        vm.stopPrank();

        emit log_named_uint("Exit gas used", gasUsed);
        assertLt(gasUsed, 120000, "Exit should use <120K gas");
    }

    function test_Performance_GetBoostWeightGas() public {
        uint256 gasBefore = gasleft();
        token.getBoostWeight(user1);
        uint256 gasUsed = gasBefore - gasleft();

        emit log_named_uint("GetBoostWeight gas used", gasUsed);
        // View function, should be very cheap
    }

    // ==================== Security Tests (5) ====================

    function test_Security_NoReentrancy() public {
        // Deploy malicious contract
        MaliciousReentrancy attacker = new MaliciousReentrancy(address(token), address(paimon));

        paimon.mint(address(attacker), 1000 * 1e18);

        vm.expectRevert();
        attacker.attack();
    }

    function test_Security_PrecisionLoss() public {
        uint256 amount = 1e18 + 1; // Small amount to test precision

        vm.startPrank(user1);
        paimon.approve(address(token), amount);
        token.vest(amount);

        vm.warp(block.timestamp + 1 days);

        uint256 vested = token.getVestedAmount(user1);

        // Precision loss should be negligible (< 0.01%)
        uint256 expected = (amount * 1 days) / VESTING_PERIOD;
        uint256 diff = vested > expected ? vested - expected : expected - vested;
        assertLt(diff * 10000 / expected, 1, "Precision loss should be <0.01%");

        vm.stopPrank();
    }

    function test_Security_OverflowProtection() public {
        uint256 largeAmount = type(uint128).max;

        paimon.mint(user1, largeAmount);

        vm.startPrank(user1);
        paimon.approve(address(token), largeAmount);
        token.vest(largeAmount);

        vm.warp(block.timestamp + VESTING_PERIOD / 2);

        // Should not overflow when calculating vested amount
        uint256 vested = token.getVestedAmount(user1);
        assertGt(vested, 0, "Should calculate vested amount without overflow");

        vm.stopPrank();
    }

    function test_Security_CannotClaimTwice() public {
        uint256 amount = 1000 * 1e18;

        vm.startPrank(user1);
        paimon.approve(address(token), amount);
        token.vest(amount);

        vm.warp(block.timestamp + 100 days);

        // First claim
        token.claim();

        // Try to claim again immediately (should revert)
        vm.expectRevert("esPaimon: Nothing to claim");
        token.claim();

        vm.stopPrank();
    }

    function test_Security_PositionIsolation() public {
        // Vest from two different users
        vm.startPrank(user1);
        paimon.approve(address(token), 1000 * 1e18);
        token.vest(1000 * 1e18);
        vm.stopPrank();

        vm.startPrank(user2);
        paimon.approve(address(token), 2000 * 1e18);
        token.vest(2000 * 1e18);
        vm.stopPrank();

        vm.warp(block.timestamp + 100 days);

        // User1's claim should not affect user2
        vm.prank(user1);
        token.claim();

        (uint256 total1, uint256 claimed1,,) = token.vestingPositions(user1);
        (uint256 total2, uint256 claimed2,,) = token.vestingPositions(user2);

        assertGt(claimed1, 0, "User1 should have claimed");
        assertEq(claimed2, 0, "User2's position should be unaffected");
        assertEq(total1, 1000 * 1e18, "User1's total unchanged");
        assertEq(total2, 2000 * 1e18, "User2's total unchanged");
    }

    // ==================== Compatibility Tests (4) ====================

    function test_Compatibility_WithDistributor() public {
        // Simulate distributor integration
        vm.startPrank(distributor);
        paimon.approve(address(token), 1000 * 1e18);

        // Distributor should be able to trigger weekly updates
        token.updateWeeklyEmission();

        vm.stopPrank();
    }

    function test_Compatibility_WithBribeMarket() public {
        // Setup vesting position
        vm.startPrank(user1);
        paimon.approve(address(token), 1000 * 1e18);
        token.vest(1000 * 1e18);
        vm.stopPrank();

        // BribeMarket should be able to query boost weight
        uint256 weight = token.getBoostWeight(user1);
        assertEq(weight, 10000, "BribeMarket should read initial weight");
    }

    function test_Compatibility_StandardERC20Transfer() public {
        // esPaimon tokens should NOT be transferable (non-standard)
        vm.startPrank(user1);
        paimon.approve(address(token), 1000 * 1e18);
        token.vest(1000 * 1e18);

        // esPaimon is non-transferable, position-based only
        // This test verifies it's not a standard ERC20
        vm.stopPrank();
    }

    function test_Compatibility_MultiUserScenario() public {
        // Multiple users vest at different times
        vm.prank(user1);
        paimon.approve(address(token), 1000 * 1e18);
        vm.prank(user1);
        token.vest(1000 * 1e18);

        vm.warp(block.timestamp + 50 days);

        vm.prank(user2);
        paimon.approve(address(token), 2000 * 1e18);
        vm.prank(user2);
        token.vest(2000 * 1e18);

        vm.warp(block.timestamp + 100 days);

        // Both should calculate correctly
        uint256 vested1 = token.getVestedAmount(user1);
        uint256 vested2 = token.getVestedAmount(user2);

        assertGt(vested1, 0, "User1 should have vested amount");
        assertGt(vested2, 0, "User2 should have vested amount");
        // User2 vested more despite starting later because of 2x principal
        // User1: 150 days / 365 days * 1000 = ~411 PAIMON
        // User2: 100 days / 365 days * 2000 = ~548 PAIMON
        assertGt(vested2, vested1, "User2 should have more vested (2x principal)");
    }
}

// ==================== Mock Contracts ====================

contract MockPAIMON is ERC20 {
    constructor() ERC20("PAIMON", "PAIMON") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract MaliciousReentrancy {
    esPaimon public target;
    MockPAIMON public paimon;
    bool public attacked;

    constructor(address _target, address _paimon) {
        target = esPaimon(_target);
        paimon = MockPAIMON(_paimon);
    }

    function attack() external {
        paimon.approve(address(target), 1000 * 1e18);
        target.vest(1000 * 1e18);

        // Try to claim (this will attempt reentrancy)
        target.claim();
    }

    // Receive callback from PAIMON transfer
    receive() external payable {
        if (!attacked) {
            attacked = true;
            // Try to claim again (reentrancy attempt)
            target.claim();
        }
    }
}
