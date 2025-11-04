// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IStabilityPoolGauge
 * @notice Interface for StabilityPool to receive gauge rewards
 * @dev Task 53 - Interface for RewardDistributor to notify StabilityPool of rewards
 */
interface IStabilityPoolGauge {
    /**
     * @notice Notify StabilityPool of new rewards
     * @param rewardToken Reward token address
     * @param amount Amount of rewards
     * @dev Called by RewardDistributor after transferring tokens
     */
    function notifyRewardAmount(address rewardToken, uint256 amount) external;
}
