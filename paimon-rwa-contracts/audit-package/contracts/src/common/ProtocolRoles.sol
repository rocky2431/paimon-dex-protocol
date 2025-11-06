// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ProtocolRoles
/// @notice 全局角色常量定义，统一治理权限标识。
library ProtocolRoles {
    /// @notice 治理管理员（默认 Timelock / Multi-sig）。
    bytes32 internal constant GOVERNANCE_ADMIN_ROLE = keccak256("GOVERNANCE_ADMIN_ROLE");

    /// @notice 排放策略管理员，负责配置排放曲线与预算分流。
    bytes32 internal constant EMISSION_POLICY_ROLE = keccak256("EMISSION_POLICY_ROLE");

    /// @notice 激励分发管理员，负责奖励路由与 Merkle 根更新。
    bytes32 internal constant INCENTIVE_MANAGER_ROLE = keccak256("INCENTIVE_MANAGER_ROLE");

    /// @notice 国库管理角色，控制资金调度与紧急提款。
    bytes32 internal constant TREASURY_MANAGER_ROLE = keccak256("TREASURY_MANAGER_ROLE");
}

