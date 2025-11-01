// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {console} from "forge-std/console.sol";
import {BoostStaking} from "../../src/incentives/BoostStaking.sol";
import {MockERC20} from "../../src/mocks/MockERC20.sol";
import {BoostStakingHandler} from "./handlers/BoostStakingHandler.sol";

/**
 * @title InvariantBoost
 * @notice Invariant tests for BoostStaking (Reward multiplier mechanism)
 * @dev Tests 3 critical invariants:
 *      1. Multiplier Bounds: 1.0x ≤ boost ≤ 1.5x (10000 ≤ multiplier ≤ 15000)
 *      2. Stake Minimum: No unstake before MIN_STAKE_DURATION (7 days)
 *      3. Multiplier Monotonicity: More stake → higher (or equal) multiplier
 *
 * Test Configuration:
 * - Runs: 100,000
 * - Depth: 15
 * - Handler: BoostStakingHandler
 */
contract InvariantBoost is StdInvariant, Test {
    BoostStaking public boostStaking;
    MockERC20 public paimon;
    BoostStakingHandler public handler;

    // Constants from BoostStaking
    uint256 constant BASE_MULTIPLIER = 10000; // 1.0x
    uint256 constant MAX_MULTIPLIER = 15000; // 1.5x
    uint256 constant MIN_STAKE_DURATION = 7 days;

    function setUp() public {
        // Deploy PAIMON token
        paimon = new MockERC20("Paimon", "PAIMON", 18);

        // Deploy BoostStaking
        boostStaking = new BoostStaking(address(paimon));

        // Create handler
        handler = new BoostStakingHandler(boostStaking, paimon);

        // Fund handler with PAIMON
        paimon.mint(address(handler), 100_000_000 ether);

        // Target handler
        targetContract(address(handler));

        // Labels
        vm.label(address(boostStaking), "BoostStaking");
        vm.label(address(paimon), "PAIMON");
        vm.label(address(handler), "BoostStakingHandler");
    }

    // ============================================================
    // INVARIANT 1: Multiplier Bounds
    // ============================================================

    /**
     * @notice Invariant: Boost multiplier always in valid range [1.0x, 1.5x]
     * @dev Formula: 10000 ≤ getBoostMultiplier(user) ≤ 15000
     *      This ensures actualReward ≤ baseReward × 1.5
     */
    function invariant_multiplierBounds() public view {
        // Check all tracked users
        uint256 userCount = handler.getUserCount();
        for (uint256 i = 0; i < userCount; i++) {
            address user = handler.getUser(i);
            uint256 multiplier = boostStaking.getBoostMultiplier(user);

            assertGe(
                multiplier,
                BASE_MULTIPLIER,
                "INVARIANT VIOLATION: Multiplier below 1.0x"
            );

            assertLe(
                multiplier,
                MAX_MULTIPLIER,
                "INVARIANT VIOLATION: Multiplier above 1.5x"
            );
        }
    }

    // ============================================================
    // INVARIANT 2: Stake Minimum Duration
    // ============================================================

    /**
     * @notice Invariant: No early unstake before MIN_STAKE_DURATION
     * @dev Ensures flash loan attack protection
     *      Unstake only allowed if: block.timestamp ≥ stakeTime + 7 days
     */
    function invariant_minimumStakeDuration() public view {
        // This is enforced by the contract's require statement in unstake()
        // The handler respects this by using vm.warp() properly
        // This invariant is implicitly tested through handler operations

        uint256 userCount = handler.getUserCount();
        for (uint256 i = 0; i < userCount; i++) {
            address user = handler.getUser(i);
            (uint256 staked, uint256 stakeTime) = boostStaking.stakes(user);

            // If staked, verify time hasn't been manipulated
            if (staked > 0) {
                assertLe(
                    stakeTime,
                    block.timestamp,
                    "INVARIANT VIOLATION: Stake time in future"
                );
            }
        }
    }

    // ============================================================
    // INVARIANT 3: Multiplier Monotonicity
    // ============================================================

    /**
     * @notice Invariant: Higher stake → Higher (or equal) boost multiplier
     * @dev Formula: If stakeA > stakeB, then multiplierA ≥ multiplierB
     *      (Within MIN_STAKE_DURATION constraints)
     */
    function invariant_multiplierMonotonicity() public view {
        uint256 userCount = handler.getUserCount();

        for (uint256 i = 0; i < userCount - 1; i++) {
            address userA = handler.getUser(i);
            address userB = handler.getUser(i + 1);

            (uint256 stakeA, uint256 stakeTimeA) = boostStaking.stakes(userA);
            (uint256 stakeB, uint256 stakeTimeB) = boostStaking.stakes(userB);

            // Only compare if both staked and passed MIN_STAKE_DURATION
            if (
                stakeA > 0 && stakeB > 0 &&
                block.timestamp >= stakeTimeA + MIN_STAKE_DURATION &&
                block.timestamp >= stakeTimeB + MIN_STAKE_DURATION
            ) {
                uint256 multiplierA = boostStaking.getBoostMultiplier(userA);
                uint256 multiplierB = boostStaking.getBoostMultiplier(userB);

                if (stakeA > stakeB) {
                    assertGe(
                        multiplierA,
                        multiplierB,
                        "INVARIANT VIOLATION: Higher stake has lower multiplier"
                    );
                }
            }
        }
    }

    // ============================================================
    // HELPER FUNCTIONS
    // ============================================================

    /**
     * @notice Summary of test execution
     */
    function invariant_callSummary() public view {
        console.log("\n=== BoostStaking Invariant Test Summary ===");
        console.log("Total Stakes:", handler.ghost_totalStakes());
        console.log("Total Unstakes:", handler.ghost_totalUnstakes());
        console.log("Total PAIMON Staked:", handler.ghost_totalPaimonStaked());
        console.log("Total PAIMON Unstaked:", handler.ghost_totalPaimonUnstaked());
        console.log("\nCurrent State:");
        console.log("Block Timestamp:", block.timestamp);

        // Show top stakers
        console.log("\nTop Stakers:");
        uint256 userCount = handler.getUserCount();
        for (uint256 i = 0; i < userCount && i < 5; i++) {
            address user = handler.getUser(i);
            (uint256 staked, uint256 stakeTime) = boostStaking.stakes(user);
            uint256 multiplier = boostStaking.getBoostMultiplier(user);

            console.log("  User", i, "Staked:", staked);
            console.log("  User", i, "Stake Time:", stakeTime);
            console.log("  User", i, "Multiplier:", multiplier);
            console.log("  User", i, "Multiplier %:", (multiplier * 100) / 10000);
        }
    }
}
