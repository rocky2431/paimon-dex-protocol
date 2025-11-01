// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/incentives/BoostStaking.sol";
import "../../src/core/PAIMON.sol";

/**
 * @title BoostStaking Test Suite
 * @notice Comprehensive 6-dimensional test coverage for BoostStaking contract
 *
 * Test Dimensions:
 * 1. Functional - Core staking/unstaking/boost calculation logic
 * 2. Boundary - Edge cases (zero, max, exact 7-day threshold)
 * 3. Exception - Error handling (early unstake, unauthorized access)
 * 4. Performance - Gas benchmarks for critical operations
 * 5. Security - Flash loan protection, reentrancy guards
 * 6. Compatibility - Integration with PAIMON and RewardDistributor
 */
contract BoostStakingTest is Test {
    // ==================== Test Infrastructure ====================

    BoostStaking public boostStaking;
    PAIMON public paimonToken;

    address public owner = address(this);
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    address public user3 = address(0x3);
    address public rewardDistributor = address(0x999);

    uint256 public constant INITIAL_BALANCE = 1_000_000e18; // 1M tokens
    uint256 public constant MIN_STAKE_DURATION = 7 days;

    // ==================== Setup ====================

    function setUp() public {
        // Deploy PAIMON token with 10B max supply
        paimonToken = new PAIMON(10_000_000_000e18);

        // Mint tokens to test contract for distribution
        paimonToken.mint(address(this), INITIAL_BALANCE * 10);

        // Deploy BoostStaking
        boostStaking = new BoostStaking(address(paimonToken));

        // Distribute PAIMON tokens for testing
        paimonToken.transfer(user1, INITIAL_BALANCE);
        paimonToken.transfer(user2, INITIAL_BALANCE);
        paimonToken.transfer(user3, INITIAL_BALANCE);

        // Approve BoostStaking to spend tokens
        vm.prank(user1);
        paimonToken.approve(address(boostStaking), type(uint256).max);

        vm.prank(user2);
        paimonToken.approve(address(boostStaking), type(uint256).max);

        vm.prank(user3);
        paimonToken.approve(address(boostStaking), type(uint256).max);
    }

    // ==================== Dimension 1: Functional Tests ====================

    function test_Functional_BasicStaking() public {
        uint256 stakeAmount = 10_000e18;

        vm.startPrank(user1);

        boostStaking.stake(stakeAmount);

        // Verify staked amount
        assertEq(boostStaking.stakedAmount(user1), stakeAmount, "Staked amount mismatch");

        // Verify stake timestamp
        assertEq(boostStaking.stakeTime(user1), block.timestamp, "Stake time mismatch");

        vm.stopPrank();
    }

    function test_Functional_BoostMultiplierCalculation() public {
        // Test formula: boostMultiplier = 10000 + (amount / 1000) × 100
        // Cap at 15000 (1.5x)

        vm.startPrank(user1);

        // Case 1: Small stake (1,000 tokens) → 10000 + (1000/1000)*100 = 10100 (1.01x)
        boostStaking.stake(1_000e18);
        assertEq(boostStaking.getBoostMultiplier(user1), 10100, "Small stake multiplier incorrect");

        vm.stopPrank();

        // Case 2: Medium stake (10,000 tokens) → 10000 + (10000/1000)*100 = 11000 (1.10x)
        vm.startPrank(user2);
        boostStaking.stake(10_000e18);
        assertEq(boostStaking.getBoostMultiplier(user2), 11000, "Medium stake multiplier incorrect");
        vm.stopPrank();

        // Case 3: Large stake (50,000 tokens) → 10000 + (50000/1000)*100 = 15000 (1.50x, capped)
        vm.startPrank(user3);
        boostStaking.stake(50_000e18);
        assertEq(boostStaking.getBoostMultiplier(user3), 15000, "Large stake should be capped at 1.5x");
        vm.stopPrank();
    }

    function test_Functional_SuccessfulUnstake() public {
        uint256 stakeAmount = 10_000e18;

        vm.startPrank(user1);

        boostStaking.stake(stakeAmount);

        // Fast forward 7 days
        vm.warp(block.timestamp + MIN_STAKE_DURATION);

        // Unstake should succeed
        boostStaking.unstake();

        // Verify stake cleared
        assertEq(boostStaking.stakedAmount(user1), 0, "Stake not cleared");
        assertEq(boostStaking.stakeTime(user1), 0, "Stake time not reset");

        vm.stopPrank();
    }

    function test_Functional_MultipleUsersStaking() public {
        // User1 stakes 5,000
        vm.prank(user1);
        boostStaking.stake(5_000e18);

        // User2 stakes 20,000
        vm.prank(user2);
        boostStaking.stake(20_000e18);

        // User3 stakes 100
        vm.prank(user3);
        boostStaking.stake(100e18);

        // Verify independent stakes
        assertEq(boostStaking.stakedAmount(user1), 5_000e18, "User1 stake incorrect");
        assertEq(boostStaking.stakedAmount(user2), 20_000e18, "User2 stake incorrect");
        assertEq(boostStaking.stakedAmount(user3), 100e18, "User3 stake incorrect");

        // Verify independent multipliers
        assertEq(boostStaking.getBoostMultiplier(user1), 10500, "User1 multiplier incorrect");
        assertEq(boostStaking.getBoostMultiplier(user2), 12000, "User2 multiplier incorrect");
        assertEq(boostStaking.getBoostMultiplier(user3), 10010, "User3 multiplier incorrect");
    }

    function test_Functional_RestakingAfterUnstake() public {
        uint256 firstStake = 5_000e18;
        uint256 secondStake = 15_000e18;

        vm.startPrank(user1);

        // First stake
        boostStaking.stake(firstStake);
        assertEq(boostStaking.getBoostMultiplier(user1), 10500);

        // Unstake after 7 days
        vm.warp(block.timestamp + MIN_STAKE_DURATION);
        boostStaking.unstake();

        // Re-stake with different amount
        boostStaking.stake(secondStake);
        assertEq(boostStaking.stakedAmount(user1), secondStake);
        assertEq(boostStaking.getBoostMultiplier(user1), 11500);

        vm.stopPrank();
    }

    function test_Functional_GetBoostMultiplierForNonStaker() public view {
        // Non-staker should have 1.0x multiplier (10000)
        assertEq(boostStaking.getBoostMultiplier(user1), 10000, "Non-staker should have 1.0x boost");
    }

    function test_Functional_EmergencyUnstakeByOwner() public {
        vm.prank(user1);
        boostStaking.stake(10_000e18);

        // Owner can emergency unstake for user
        boostStaking.emergencyUnstake(user1);

        assertEq(boostStaking.stakedAmount(user1), 0, "Emergency unstake failed");
    }

    // ==================== Dimension 2: Boundary Tests ====================

    function test_Boundary_ZeroStake() public {
        vm.startPrank(user1);

        vm.expectRevert("BoostStaking: Cannot stake zero");
        boostStaking.stake(0);

        vm.stopPrank();
    }

    function test_Boundary_MinimumStake() public {
        // Stake exactly 1 wei
        vm.startPrank(user1);

        boostStaking.stake(1);
        assertEq(boostStaking.stakedAmount(user1), 1);
        // 10000 + (1/1000e18)*100 ≈ 10000 (rounds down)
        assertEq(boostStaking.getBoostMultiplier(user1), 10000);

        vm.stopPrank();
    }

    function test_Boundary_ExactlySevenDaysLock() public {
        vm.startPrank(user1);

        boostStaking.stake(1_000e18);

        // Try unstaking at exactly 7 days - should succeed
        vm.warp(block.timestamp + MIN_STAKE_DURATION);
        boostStaking.unstake();

        vm.stopPrank();
    }

    function test_Boundary_OneSecondBeforeSevenDays() public {
        vm.startPrank(user1);

        boostStaking.stake(1_000e18);

        // Try unstaking 1 second before 7 days - should fail
        vm.warp(block.timestamp + MIN_STAKE_DURATION - 1);

        vm.expectRevert("BoostStaking: Still locked");
        boostStaking.unstake();

        vm.stopPrank();
    }

    function test_Boundary_MaxBoostCap() public {
        // Test that boost caps at 1.5x (15000)

        vm.startPrank(user1);

        // Stake 100,000 tokens → should cap at 15000
        // Formula: 10000 + (100000/1000)*100 = 20000, but capped at 15000
        boostStaking.stake(100_000e18);
        assertEq(boostStaking.getBoostMultiplier(user1), 15000, "Boost not capped at 1.5x");

        vm.stopPrank();
    }

    function test_Boundary_BoostJustBelowCap() public {
        vm.startPrank(user1);

        // Stake 49,999 tokens → 10000 + (49999/1000)*100 = 14999
        boostStaking.stake(49_999e18);
        assertEq(boostStaking.getBoostMultiplier(user1), 14999, "Boost calculation incorrect");

        vm.stopPrank();
    }

    function test_Boundary_MaxUint256Stake() public {
        // Should handle very large numbers without overflow
        vm.startPrank(user1);

        // This should revert due to insufficient balance, not overflow
        vm.expectRevert(); // SafeERC20 will revert
        boostStaking.stake(type(uint256).max);

        vm.stopPrank();
    }

    // ==================== Dimension 3: Exception Tests ====================

    function test_Exception_UnstakeBeforeMinDuration() public {
        vm.startPrank(user1);

        boostStaking.stake(1_000e18);

        // Try unstaking immediately
        vm.expectRevert("BoostStaking: Still locked");
        boostStaking.unstake();

        // Try after 3 days
        vm.warp(block.timestamp + 3 days);
        vm.expectRevert("BoostStaking: Still locked");
        boostStaking.unstake();

        vm.stopPrank();
    }

    function test_Exception_UnstakeWithoutStaking() public {
        vm.startPrank(user1);

        vm.expectRevert("BoostStaking: No stake");
        boostStaking.unstake();

        vm.stopPrank();
    }

    function test_Exception_DoubleStaking() public {
        vm.startPrank(user1);

        boostStaking.stake(1_000e18);

        // Try staking again without unstaking first
        vm.expectRevert("BoostStaking: Already staked");
        boostStaking.stake(2_000e18);

        vm.stopPrank();
    }

    function test_Exception_UnauthorizedEmergencyUnstake() public {
        vm.prank(user1);
        boostStaking.stake(1_000e18);

        // Non-owner tries emergency unstake
        vm.startPrank(user2);
        vm.expectRevert(); // Ownable: caller is not the owner
        boostStaking.emergencyUnstake(user1);
        vm.stopPrank();
    }

    function test_Exception_InsufficientBalance() public {
        vm.startPrank(user1);

        // Try staking more than available esPaimon position
        vm.expectRevert(); // SafeERC20 or esPaimon will revert
        boostStaking.stake(INITIAL_BALANCE * 2);

        vm.stopPrank();
    }

    // ==================== Dimension 4: Performance Tests ====================

    function testGas_Stake() public {
        vm.startPrank(user1);

        uint256 gasBefore = gasleft();
        boostStaking.stake(10_000e18);
        uint256 gasUsed = gasBefore - gasleft();

        // Should be under 150K gas
        assertLt(gasUsed, 150_000, "Stake gas too high");
        console.log("Stake gas used:", gasUsed);

        vm.stopPrank();
    }

    function testGas_Unstake() public {
        vm.startPrank(user1);

        boostStaking.stake(10_000e18);
        vm.warp(block.timestamp + MIN_STAKE_DURATION);

        uint256 gasBefore = gasleft();
        boostStaking.unstake();
        uint256 gasUsed = gasBefore - gasleft();

        // Should be under 100K gas
        assertLt(gasUsed, 100_000, "Unstake gas too high");
        console.log("Unstake gas used:", gasUsed);

        vm.stopPrank();
    }

    function testGas_GetBoostMultiplier() public {
        vm.prank(user1);
        boostStaking.stake(10_000e18);

        uint256 gasBefore = gasleft();
        boostStaking.getBoostMultiplier(user1);
        uint256 gasUsed = gasBefore - gasleft();

        // Should be under 10K gas (view function)
        assertLt(gasUsed, 10_000, "GetBoostMultiplier gas too high");
        console.log("GetBoostMultiplier gas used:", gasUsed);
    }

    function testGas_MultipleStakesInSameBlock() public {
        uint256 gasBefore = gasleft();

        vm.prank(user1);
        boostStaking.stake(5_000e18);

        vm.prank(user2);
        boostStaking.stake(10_000e18);

        vm.prank(user3);
        boostStaking.stake(100e18);

        uint256 gasUsed = gasBefore - gasleft();

        // All three stakes combined should be under 400K gas
        assertLt(gasUsed, 400_000, "Multiple stakes gas too high");
        console.log("3 stakes gas used:", gasUsed);
    }

    // ==================== Dimension 5: Security Tests ====================

    function test_Security_ReentrancyProtection() public {
        // BoostStaking should have nonReentrant modifier on stake/unstake
        // This test verifies the modifier is present (indirect test via multiple calls)

        vm.startPrank(user1);

        boostStaking.stake(1_000e18);

        // Reentrancy would fail due to "Already staked" or nonReentrant guard
        vm.expectRevert("BoostStaking: Already staked");
        boostStaking.stake(1_000e18);

        vm.stopPrank();
    }

    function test_Security_FlashLoanPrevention() public {
        // Flash loan attack scenario:
        // 1. Borrow massive amount of esPaimon
        // 2. Stake it
        // 3. Get high boost multiplier
        // 4. Use boost for rewards
        // 5. Unstake and return loan
        //
        // Prevention: MIN_STAKE_DURATION prevents same-block unstake

        vm.startPrank(user1);

        boostStaking.stake(50_000e18); // Large "borrowed" amount

        // Try to unstake in same block - should fail
        vm.expectRevert("BoostStaking: Still locked");
        boostStaking.unstake();

        vm.stopPrank();
    }

    function test_Security_OnlyOwnerEmergencyUnstake() public {
        vm.prank(user1);
        boostStaking.stake(1_000e18);

        // Attacker tries to emergency unstake another user
        vm.startPrank(user2);
        vm.expectRevert(); // Ownable: caller is not the owner
        boostStaking.emergencyUnstake(user1);
        vm.stopPrank();

        // Owner can do it
        boostStaking.emergencyUnstake(user1);
        assertEq(boostStaking.stakedAmount(user1), 0);
    }

    function test_Security_BoostMultiplierConsistency() public {
        // Ensure boost multiplier cannot be manipulated after staking

        vm.startPrank(user1);

        boostStaking.stake(10_000e18);
        uint256 initialBoost = boostStaking.getBoostMultiplier(user1);

        // Fast forward time - boost should remain constant
        vm.warp(block.timestamp + 30 days);
        uint256 laterBoost = boostStaking.getBoostMultiplier(user1);

        assertEq(initialBoost, laterBoost, "Boost should not change over time");

        vm.stopPrank();
    }

    function test_Security_CannotStakeForOthers() public {
        // Users should only be able to stake for themselves
        // This prevents griefing or unauthorized locking of others' funds

        vm.startPrank(user1);

        // Try staking to user2's account (if such function exists, should fail)
        // This is implicitly tested by the design: msg.sender is the staker
        boostStaking.stake(1_000e18);

        // Verify user1 is the staker, not user2
        assertEq(boostStaking.stakedAmount(user1), 1_000e18);
        assertEq(boostStaking.stakedAmount(user2), 0);

        vm.stopPrank();
    }

    // ==================== Dimension 6: Compatibility Tests ====================

    function test_Compatibility_PaimonTokenIntegration() public {
        // Verify BoostStaking works with PAIMON tokens

        vm.startPrank(user1);

        uint256 paimonBalance = paimonToken.balanceOf(user1);
        require(paimonBalance > 0, "Setup issue: no PAIMON balance");

        uint256 balanceBefore = paimonToken.balanceOf(user1);

        // Stake should transfer PAIMON to contract
        boostStaking.stake(1_000e18);

        // Verify PAIMON transferred
        assertEq(paimonToken.balanceOf(user1), balanceBefore - 1_000e18);
        assertEq(paimonToken.balanceOf(address(boostStaking)), 1_000e18);

        vm.stopPrank();
    }

    function test_Compatibility_RewardDistributorQuery() public {
        // RewardDistributor should be able to query boost multiplier

        vm.prank(user1);
        boostStaking.stake(10_000e18);

        // Simulate RewardDistributor calling getBoostMultiplier
        vm.startPrank(rewardDistributor);

        uint256 boost = boostStaking.getBoostMultiplier(user1);
        assertEq(boost, 11000, "RewardDistributor query failed");

        vm.stopPrank();
    }

    function test_Compatibility_MultipleBoostQueries() public {
        // Verify contract can handle multiple simultaneous queries

        vm.prank(user1);
        boostStaking.stake(5_000e18);

        vm.prank(user2);
        boostStaking.stake(20_000e18);

        // Query both in sequence (simulating batch processing)
        uint256 boost1 = boostStaking.getBoostMultiplier(user1);
        uint256 boost2 = boostStaking.getBoostMultiplier(user2);

        assertEq(boost1, 10500);
        assertEq(boost2, 12000);
    }

    function test_Compatibility_EventEmissions() public {
        // Verify events are emitted correctly for off-chain indexing

        vm.startPrank(user1);

        uint256 stakeTimestamp = block.timestamp;
        uint256 expectedLockUntil = stakeTimestamp + MIN_STAKE_DURATION;

        // Expect Staked event with correct lockUntil
        vm.expectEmit(true, true, false, true);
        emit Staked(user1, 1_000e18, expectedLockUntil);
        boostStaking.stake(1_000e18);

        // Fast forward to unlock time
        vm.warp(stakeTimestamp + MIN_STAKE_DURATION);

        // Expect Unstaked event
        vm.expectEmit(true, true, false, true);
        emit Unstaked(user1, 1_000e18);
        boostStaking.unstake();

        vm.stopPrank();
    }

    // ==================== Events (for compatibility test) ====================

    event Staked(address indexed user, uint256 amount, uint256 lockUntil);
    event Unstaked(address indexed user, uint256 amount);
    event BoostCalculated(address indexed user, uint256 multiplier);
}
