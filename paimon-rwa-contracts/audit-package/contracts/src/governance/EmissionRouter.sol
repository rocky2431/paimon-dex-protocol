// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../common/Governable.sol";
import "../common/ProtocolRoles.sol";
import "./EmissionManager.sol";

/// @title EmissionRouter
/// @notice 根据 EmissionManager 周预算，将排放额度路由到指定的资金池/模块。
contract EmissionRouter is Governable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    EmissionManager public immutable emissionManager;
    IERC20 public immutable emissionToken;

    struct ChannelSinks {
        address debt;
        address lpPairs;
        address stabilityPool;
        address eco;
    }

    ChannelSinks public sinks;
    mapping(uint256 => bool) public routedWeek;

    event SinksUpdated(address debt, address lpPairs, address stabilityPool, address eco);
    event BudgetRouted(
        uint256 indexed week,
        uint256 debt,
        uint256 lpPairs,
        uint256 stabilityPool,
        uint256 eco
    );
    event TokensRecovered(address indexed token, address indexed recipient, uint256 amount);

    modifier onlyEmissionPolicy() {
        _checkRole(ProtocolRoles.EMISSION_POLICY_ROLE, _msgSender());
        _;
    }

    constructor(address _emissionManager, address _emissionToken) Governable(msg.sender) {
        require(_emissionManager != address(0), "EmissionRouter: manager zero");
        require(_emissionToken != address(0), "EmissionRouter: token zero");

        emissionManager = EmissionManager(_emissionManager);
        emissionToken = IERC20(_emissionToken);

        _grantRole(ProtocolRoles.EMISSION_POLICY_ROLE, msg.sender);
    }

    /// @notice 治理设置各个渠道的接收地址。
    function setSinks(address debt, address lpPairs, address stabilityPool, address eco) external onlyGovernance {
        sinks = ChannelSinks({debt: debt, lpPairs: lpPairs, stabilityPool: stabilityPool, eco: eco});
        emit SinksUpdated(debt, lpPairs, stabilityPool, eco);
    }

    /// @notice 将指定周的排放预算路由到已配置的渠道。
    function routeWeek(uint256 week) external onlyEmissionPolicy nonReentrant {
        require(!routedWeek[week], "EmissionRouter: already routed");

        (uint256 debtAmount, uint256 lpPairsAmount, uint256 stabilityAmount, uint256 ecoAmount) =
            emissionManager.getWeeklyBudget(week);

        uint256 totalBudget = debtAmount + lpPairsAmount + stabilityAmount + ecoAmount;
        require(totalBudget > 0, "EmissionRouter: zero budget");

        require(emissionToken.balanceOf(address(this)) >= totalBudget, "EmissionRouter: insufficient balance");

        _transferChannel(sinks.debt, debtAmount, "debt");
        _transferChannel(sinks.lpPairs, lpPairsAmount, "lpPairs");
        _transferChannel(sinks.stabilityPool, stabilityAmount, "stability");
        _transferChannel(sinks.eco, ecoAmount, "eco");

        routedWeek[week] = true;
        emit BudgetRouted(week, debtAmount, lpPairsAmount, stabilityAmount, ecoAmount);
    }

    /// @notice 治理赐予额外的排放策略管理员。
    function grantEmissionPolicy(address account) external onlyGovernance {
        require(account != address(0), "EmissionRouter: account is zero");
        _grantRole(ProtocolRoles.EMISSION_POLICY_ROLE, account);
    }

    /// @notice 治理移除排放策略管理员。
    function revokeEmissionPolicy(address account) external onlyGovernance {
        require(account != address(0), "EmissionRouter: account is zero");
        _revokeRole(ProtocolRoles.EMISSION_POLICY_ROLE, account);
    }

    /// @inheritdoc Governable
    function _afterGovernanceTransfer(address previousGovernor, address newGovernor)
        internal
        override
    {
        if (hasRole(ProtocolRoles.EMISSION_POLICY_ROLE, previousGovernor)) {
            _revokeRole(ProtocolRoles.EMISSION_POLICY_ROLE, previousGovernor);
        }
        _grantRole(ProtocolRoles.EMISSION_POLICY_ROLE, newGovernor);
    }

    /// @notice 回收多余代币，防止卡资金。
    function recoverToken(address token, address recipient, uint256 amount) external onlyGovernance {
        require(token != address(0), "EmissionRouter: token zero");
        require(recipient != address(0), "EmissionRouter: recipient zero");

        IERC20(token).safeTransfer(recipient, amount);
        emit TokensRecovered(token, recipient, amount);
    }

    function _transferChannel(address sink, uint256 amount, string memory channel) private {
        if (amount == 0) {
            return;
        }
        require(sink != address(0), string.concat("EmissionRouter: ", channel, " sink not set"));
        emissionToken.safeTransfer(sink, amount);
    }
}

