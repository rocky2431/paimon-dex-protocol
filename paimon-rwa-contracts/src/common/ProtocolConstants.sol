// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ProtocolConstants
/// @notice Centralized constants shared across the Paimon RWA protocol.
/// @dev 保证所有模块使用同一组基础常量，避免魔法数字重复定义。
library ProtocolConstants {
    /// @notice 百分比基数（100% = 10_000 bps）。
    uint256 internal constant BASIS_POINTS = 10_000;

    /// @notice 单个治理周期（7 天）。
    uint256 internal constant WEEK = 7 days;

    /// @notice 默认的 Epoch 周期长度（与 WEEK 对齐）。
    uint256 internal constant EPOCH_DURATION = WEEK;
}

