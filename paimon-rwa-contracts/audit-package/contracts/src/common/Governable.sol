// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";
import "./ProtocolRoles.sol";

/// @title Governable
/// @notice 提供统一的治理访问控制逻辑（基于 AccessControl + 枚举能力）。
/// @dev 默认授予部署者治理权限，可通过 add/remove/transfer 维护治理主体。
abstract contract Governable is AccessControlEnumerable {
    /// @dev 初始化并设置首个治理管理员。
    constructor(address initialGovernor) {
        require(initialGovernor != address(0), "Governable: governor is zero");

        _grantRole(DEFAULT_ADMIN_ROLE, initialGovernor);
        _grantRole(ProtocolRoles.GOVERNANCE_ADMIN_ROLE, initialGovernor);
    }

    /// @notice 仅允许治理管理员调用。
    modifier onlyGovernance() {
        _checkRole(ProtocolRoles.GOVERNANCE_ADMIN_ROLE, _msgSender());
        _;
    }

    /// @notice 添加新的治理管理员（例如 Timelock、Multi-sig）。
    function addGovernance(address account) public onlyGovernance {
        require(account != address(0), "Governable: account is zero");
        _grantRole(DEFAULT_ADMIN_ROLE, account);
        _grantRole(ProtocolRoles.GOVERNANCE_ADMIN_ROLE, account);
    }

    /// @notice 移除治理管理员（至少保留 1 个）。
    function removeGovernance(address account) public onlyGovernance {
        require(account != address(0), "Governable: account is zero");
        require(hasRole(ProtocolRoles.GOVERNANCE_ADMIN_ROLE, account), "Governable: not a governor");

        uint256 currentCount = getRoleMemberCount(ProtocolRoles.GOVERNANCE_ADMIN_ROLE);
        require(currentCount > 1, "Governable: at least one governor required");

        _revokeRole(ProtocolRoles.GOVERNANCE_ADMIN_ROLE, account);
        _revokeRole(DEFAULT_ADMIN_ROLE, account);
    }

    /// @notice 将治理权整体转移给新的地址（常用于部署 -> 多签）。
    function transferGovernance(address newGovernor) public virtual onlyGovernance {
        address previousGovernor = _msgSender();
        require(newGovernor != address(0), "Governable: governor is zero");
        require(newGovernor != previousGovernor, "Governable: new governor is current");

        addGovernance(newGovernor);
        _afterGovernanceTransfer(previousGovernor, newGovernor);
        removeGovernance(previousGovernor);
    }

    /// @notice 兼容 Ownable 的命名接口。
    function transferOwnership(address newOwner) public onlyGovernance {
        transferGovernance(newOwner);
    }

    /// @notice 留给子类在治理转移时执行附加逻辑。
    function _afterGovernanceTransfer(address /*previousGovernor*/, address /*newGovernor*/)
        internal
        virtual
    {}

    /// @notice 查询治理管理员数量（便于 off-chain 监控）。
    function governanceCount() public view returns (uint256) {
        return getRoleMemberCount(ProtocolRoles.GOVERNANCE_ADMIN_ROLE);
    }

    /// @notice 判断指定地址是否拥有治理权限。
    function isGovernance(address account) public view returns (bool) {
        return hasRole(ProtocolRoles.GOVERNANCE_ADMIN_ROLE, account);
    }

    /// @notice 兼容旧版 Ownable 接口，返回首个治理管理员地址。
    function owner() public view returns (address) {
        return getRoleMember(ProtocolRoles.GOVERNANCE_ADMIN_ROLE, 0);
    }
}
