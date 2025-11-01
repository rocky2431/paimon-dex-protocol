// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {BoostStaking} from "../../../src/incentives/BoostStaking.sol";
import {MockERC20} from "../../../src/mocks/MockERC20.sol";

/**
 * @title BoostStakingHandler
 * @notice Handler for BoostStaking invariant testing
 * @dev Performs random operations on BoostStaking contract:
 *      - stake: Stake PAIMON tokens
 *      - unstake: Unstake PAIMON tokens (after MIN_STAKE_DURATION)
 *      - timeWarp: Advance block.timestamp
 */
contract BoostStakingHandler is Test {
    BoostStaking public boostStaking;
    MockERC20 public paimon;

    // Ghost variables for tracking
    uint256 public ghost_totalStakes;
    uint256 public ghost_totalUnstakes;
    uint256 public ghost_totalPaimonStaked;
    uint256 public ghost_totalPaimonUnstaked;

    // Test users pool
    address[] public users;
    uint256 constant USER_COUNT = 10;

    constructor(BoostStaking _boostStaking, MockERC20 _paimon) {
        boostStaking = _boostStaking;
        paimon = _paimon;

        // Create test users
        for (uint256 i = 0; i < USER_COUNT; i++) {
            address user = address(uint160(uint256(keccak256(abi.encodePacked("boostuser", i)))));
            users.push(user);
            vm.label(user, string(abi.encodePacked("BoostUser", vm.toString(i))));

            // Give each user PAIMON tokens
            paimon.mint(user, 10_000_000 ether);
        }
    }

    // ============================================================
    // HANDLER FUNCTIONS
    // ============================================================

    /**
     * @notice Stake PAIMON for a random user
     * @param seed Random seed for user and amount selection
     */
    function stake(uint256 seed) external {
        // Select random user
        address user = users[seed % USER_COUNT];

        // Select random amount (1000 to 1M PAIMON)
        uint256 amount = bound(seed, 1000 ether, 1_000_000 ether);

        // Check if user has enough balance
        uint256 balance = paimon.balanceOf(user);
        if (balance < amount) {
            amount = balance;
        }

        if (amount == 0) return;

        // Approve and stake
        vm.startPrank(user);
        paimon.approve(address(boostStaking), amount);
        try boostStaking.stake(amount) {
            ghost_totalStakes++;
            ghost_totalPaimonStaked += amount;
        } catch {
            // Stake may fail if already staked
        }
        vm.stopPrank();
    }

    /**
     * @notice Unstake PAIMON for a random user
     * @param seed Random seed for user selection
     */
    function unstake(uint256 seed) external {
        // Select random user
        address user = users[seed % USER_COUNT];

        // Get user stake
        (uint256 staked, uint256 stakeTime) = boostStaking.stakes(user);
        if (staked == 0) return;

        // Check if MIN_STAKE_DURATION passed
        if (block.timestamp < stakeTime + 7 days) {
            // Warp time forward to allow unstake
            vm.warp(stakeTime + 7 days + 1);
        }

        // Unstake
        vm.prank(user);
        try boostStaking.unstake() {
            ghost_totalUnstakes++;
            ghost_totalPaimonUnstaked += staked;
        } catch {
            // Unstake may fail if not yet staked or duration not met
        }
    }

    /**
     * @notice Advance time forward
     * @param seed Random seed for time increment
     */
    function timeWarp(uint256 seed) external {
        // Warp forward 1 hour to 30 days
        uint256 increment = bound(seed, 1 hours, 30 days);
        vm.warp(block.timestamp + increment);
    }

    // ============================================================
    // HELPER FUNCTIONS
    // ============================================================

    /**
     * @notice Get user count for testing
     */
    function getUserCount() external pure returns (uint256) {
        return USER_COUNT;
    }

    /**
     * @notice Get user address by index
     */
    function getUser(uint256 index) external view returns (address) {
        require(index < USER_COUNT, "Index out of bounds");
        return users[index];
    }
}
