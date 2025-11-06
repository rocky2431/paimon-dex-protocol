// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title EpochUtils
/// @notice 通用 Epoch 计算工具库，统一各模块的周度/周期推导逻辑。
library EpochUtils {
    error EpochDurationZero();

    /// @notice 根据起始时间与周期长度计算当前 Epoch（向下取整）。
    /// @param epochStart 起始时间戳
    /// @param epochDuration 单个 Epoch 时长
    /// @param timestamp 目标时间戳（通常为 block.timestamp）
    function computeEpoch(uint256 epochStart, uint256 epochDuration, uint256 timestamp)
        internal
        pure
        returns (uint256)
    {
        if (epochDuration == 0) revert EpochDurationZero();
        if (timestamp <= epochStart) {
            return 0;
        }
        return (timestamp - epochStart) / epochDuration;
    }

    /// @notice 便捷封装：使用当前区块时间计算 Epoch。
    function currentEpoch(uint256 epochStart, uint256 epochDuration) internal view returns (uint256) {
        return computeEpoch(epochStart, epochDuration, block.timestamp);
    }
}

