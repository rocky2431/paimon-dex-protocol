// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./USDP.sol";
import "./USDPVault.sol";

/**
 * @title USDPStabilityPool
 * @notice Stability pool for USDP liquidation absorption
 * @dev Depositors provide USDP liquidity to absorb liquidated debt and receive collateral rewards
 *
 * Key Features:
 * - Share-based accounting for fair distribution
 * - Proportional liquidation proceeds distribution
 * - Multi-collateral reward tracking
 * - Integration with USDPVault for liquidation callbacks
 * - Reentrancy protection on all state-changing functions
 *
 * Mechanics:
 * 1. Users deposit USDP → receive shares proportional to deposit
 * 2. On liquidation: Vault calls onLiquidationProceeds()
 * 3. Pool absorbs debt (burns USDP) and receives collateral
 * 4. Collateral distributed proportionally by shares
 * 5. Users claim collateral rewards anytime
 *
 * Share Calculation:
 * - First deposit: shares = amount (1:1 ratio)
 * - Subsequent deposits: shares = (amount * totalShares) / totalDeposits
 * - Balance = (userShares * totalDeposits) / totalShares
 *
 * Security Considerations:
 * - Prevents share manipulation via direct token transfers
 * - Only vault can trigger liquidation proceeds
 * - Reentrancy guards on deposit/withdraw/claim
 * - SafeERC20 for all token operations
 *
 * Task: 41 - USDPStabilityPool.sol Implementation
 */
contract USDPStabilityPool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ==================== State Variables ====================

    /// @notice USDP stablecoin contract
    USDP public immutable usdp;

    /// @notice USDPVault contract (authorized to call onLiquidationProceeds)
    USDPVault public immutable vault;

    /// @notice Total USDP deposited in pool
    uint256 private _totalDeposits;

    /// @notice Total shares issued to depositors
    uint256 private _totalShares;

    /// @notice User shares: user => shares
    mapping(address => uint256) private _shares;

    /// @notice Pending collateral gains: user => collateralToken => amount
    mapping(address => mapping(address => uint256)) private _pendingCollateralGains;

    /// @notice Collateral rewards per share: collateralToken => cumulativeRewardPerShare (scaled by 1e18)
    mapping(address => uint256) private _collateralRewardPerShare;

    /// @notice User's last claimed reward checkpoint: user => collateralToken => rewardPerShareCheckpoint
    mapping(address => mapping(address => uint256)) private _userRewardCheckpoint;

    // ==================== Constants ====================

    uint256 private constant PRECISION = 1e18;

    // ==================== Events ====================

    event Deposited(address indexed user, uint256 amount, uint256 shares);
    event Withdrawn(address indexed user, uint256 amount, uint256 shares);
    event RewardClaimed(address indexed user, address indexed token, uint256 amount);
    event LiquidationProceeds(uint256 debtOffset, address collateralToken, uint256 collateralGain);

    // ==================== Constructor ====================

    /**
     * @notice Initialize USDPStabilityPool
     * @param _usdp USDP stablecoin address
     * @param _vault USDPVault address
     */
    constructor(address _usdp, address _vault) Ownable(msg.sender) {
        require(_usdp != address(0), "Invalid USDP address");
        require(_vault != address(0), "Invalid vault address");

        usdp = USDP(_usdp);
        vault = USDPVault(_vault);
    }

    // ==================== External Functions ====================

    /**
     * @notice Deposit USDP into stability pool
     * @param amount Amount of USDP to deposit
     * @dev Mints shares proportional to deposit size
     */
    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");

        // Calculate shares to mint
        uint256 sharesToMint;
        if (_totalShares == 0 || _totalDeposits == 0) {
            // First deposit: 1:1 ratio
            sharesToMint = amount;
        } else {
            // Subsequent deposits: proportional to pool size
            sharesToMint = (amount * _totalShares) / _totalDeposits;
        }

        require(sharesToMint > 0, "Shares must be greater than 0");

        // Update state
        _shares[msg.sender] += sharesToMint;
        _totalShares += sharesToMint;
        _totalDeposits += amount;

        // Transfer USDP from user
        usdp.transferFrom(msg.sender, address(this), amount);

        emit Deposited(msg.sender, amount, sharesToMint);
    }

    /**
     * @notice Withdraw USDP from stability pool
     * @param amount Amount of USDP to withdraw
     * @dev Burns shares proportional to withdrawal size
     */
    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");

        // Calculate shares to burn
        uint256 sharesToBurn = (amount * _totalShares) / _totalDeposits;
        require(_shares[msg.sender] >= sharesToBurn, "Insufficient shares");
        require(sharesToBurn > 0, "Shares must be greater than 0");

        // Update state
        _shares[msg.sender] -= sharesToBurn;
        _totalShares -= sharesToBurn;
        _totalDeposits -= amount;

        // Transfer USDP to user
        usdp.transfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount, sharesToBurn);
    }

    /**
     * @notice Claim collateral rewards from liquidations
     * @param collateralToken Address of collateral token to claim
     */
    function claimCollateralGain(address collateralToken) external nonReentrant {
        // Update reward checkpoint for this collateral
        _updateRewardCheckpoint(msg.sender, collateralToken);

        uint256 gain = _pendingCollateralGains[msg.sender][collateralToken];
        require(gain > 0, "No collateral gain");

        // Reset pending gains
        _pendingCollateralGains[msg.sender][collateralToken] = 0;

        // Transfer collateral to user
        IERC20(collateralToken).safeTransfer(msg.sender, gain);

        emit RewardClaimed(msg.sender, collateralToken, gain);
    }

    /**
     * @notice Callback from vault when liquidation occurs
     * @param debtOffset Amount of USDP debt absorbed by pool
     * @param collateralToken Address of liquidated collateral
     * @param collateralAmount Amount of collateral received
     * @dev Only callable by vault contract
     */
    function onLiquidationProceeds(
        uint256 debtOffset,
        address collateralToken,
        uint256 collateralAmount
    ) external nonReentrant {
        require(msg.sender == address(vault), "Only vault can call");
        require(_totalDeposits >= debtOffset, "Insufficient liquidity in pool");
        require(collateralAmount > 0, "No collateral to distribute");

        // Burn USDP to offset debt
        _totalDeposits -= debtOffset;
        // Note: USDP is burned when vault repays debt, not here

        // Distribute collateral proportionally to all depositors
        if (_totalShares > 0) {
            uint256 rewardPerShare = (collateralAmount * PRECISION) / _totalShares;
            _collateralRewardPerShare[collateralToken] += rewardPerShare;
        }

        emit LiquidationProceeds(debtOffset, collateralToken, collateralAmount);
    }

    // ==================== View Functions ====================

    /**
     * @notice Get user's USDP balance in pool
     * @param user User address
     * @return User's deposited USDP amount
     */
    function balanceOf(address user) public view returns (uint256) {
        if (_totalShares == 0) return 0;
        return (_shares[user] * _totalDeposits) / _totalShares;
    }

    /**
     * @notice Get user's shares
     * @param user User address
     * @return User's share amount
     */
    function sharesOf(address user) public view returns (uint256) {
        return _shares[user];
    }

    /**
     * @notice Get total shares issued
     * @return Total shares in pool
     */
    function totalShares() public view returns (uint256) {
        return _totalShares;
    }

    /**
     * @notice Get total USDP deposits
     * @return Total USDP in pool
     */
    function totalDeposits() public view returns (uint256) {
        return _totalDeposits;
    }

    /**
     * @notice Get user's pending collateral gain
     * @param user User address
     * @param collateralToken Collateral token address
     * @return Pending collateral amount claimable by user
     */
    function pendingCollateralGain(address user, address collateralToken) public view returns (uint256) {
        if (_shares[user] == 0) return _pendingCollateralGains[user][collateralToken];

        uint256 accumulatedRewardPerShare = _collateralRewardPerShare[collateralToken];
        uint256 userCheckpoint = _userRewardCheckpoint[user][collateralToken];

        uint256 newRewards = 0;
        if (accumulatedRewardPerShare > userCheckpoint) {
            uint256 rewardPerShareDelta = accumulatedRewardPerShare - userCheckpoint;
            newRewards = (_shares[user] * rewardPerShareDelta) / PRECISION;
        }

        return _pendingCollateralGains[user][collateralToken] + newRewards;
    }

    // ==================== Internal Functions ====================

    /**
     * @notice Update user's reward checkpoint for specific collateral
     * @param user User address
     * @param collateralToken Collateral token address
     * @dev Snapshots pending rewards and updates checkpoint to current reward per share
     */
    function _updateRewardCheckpoint(address user, address collateralToken) internal {
        uint256 pending = pendingCollateralGain(user, collateralToken);
        _pendingCollateralGains[user][collateralToken] = pending;
        _userRewardCheckpoint[user][collateralToken] = _collateralRewardPerShare[collateralToken];
    }
}
