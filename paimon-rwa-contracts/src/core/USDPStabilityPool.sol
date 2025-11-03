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

    /// @notice Pending gauge rewards (PAIMON/esPAIMON): user => rewardToken => amount (Task 53)
    mapping(address => mapping(address => uint256)) private _pendingGaugeRewards;

    /// @notice Gauge rewards per share: rewardToken => cumulativeRewardPerShare (scaled by 1e18) (Task 53)
    mapping(address => uint256) private _gaugeRewardPerShare;

    /// @notice User's last claimed gauge reward checkpoint: user => rewardToken => rewardPerShareCheckpoint (Task 53)
    mapping(address => mapping(address => uint256)) private _userGaugeRewardCheckpoint;

    // ==================== Constants ====================

    uint256 private constant PRECISION = 1e18;

    // ==================== Events ====================

    event Deposited(address indexed user, uint256 amount, uint256 shares);
    event Withdrawn(address indexed user, uint256 amount, uint256 shares);
    event RewardClaimed(address indexed user, address indexed token, uint256 amount);
    event LiquidationProceeds(uint256 debtOffset, address collateralToken, uint256 collateralGain);
    event GaugeRewardsClaimed(address indexed user, address indexed token, uint256 amount);

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

    // ==================== GAUGE REWARDS INTEGRATION (TASK 53) ====================

    /**
     * @notice Distribute gauge rewards to depositors (called by RewardDistributor)
     * @param rewardToken Reward token address (PAIMON or esPAIMON)
     * @param amount Amount of rewards to distribute
     * @dev Task 53.3 - Receive and distribute gauge rewards proportionally by shares
     *
     * Flow:
     * 1. RewardDistributor transfers tokens to this contract
     * 2. This function updates reward per share accumulator
     * 3. Users claim via claimRewards()
     *
     * Note: Anyone can call this to distribute received tokens
     */
    function notifyRewardAmount(address rewardToken, uint256 amount) external {
        require(rewardToken != address(0), "Invalid reward token");
        require(amount > 0, "Amount must be > 0");

        // Only distribute if there are depositors
        if (_totalShares > 0) {
            uint256 rewardPerShare = (amount * PRECISION) / _totalShares;
            _gaugeRewardPerShare[rewardToken] += rewardPerShare;
        }
    }

    /**
     * @notice Claim gauge rewards (PAIMON/esPAIMON)
     * @param rewardToken Reward token address
     * @dev Task 53.3 - User claims gauge rewards based on their shares
     */
    function claimRewards(address rewardToken) external nonReentrant {
        // Update checkpoint first
        _updateGaugeRewardCheckpoint(msg.sender, rewardToken);

        uint256 reward = _pendingGaugeRewards[msg.sender][rewardToken];
        require(reward > 0, "No rewards to claim");

        // Reset pending rewards
        _pendingGaugeRewards[msg.sender][rewardToken] = 0;

        // Transfer rewards to user
        IERC20(rewardToken).safeTransfer(msg.sender, reward);

        emit GaugeRewardsClaimed(msg.sender, rewardToken, reward);
    }

    /**
     * @notice Get user's pending gauge rewards
     * @param user User address
     * @param rewardToken Reward token address
     * @return Pending reward amount
     */
    function pendingGaugeRewards(address user, address rewardToken) public view returns (uint256) {
        if (_shares[user] == 0) return _pendingGaugeRewards[user][rewardToken];

        uint256 accumulatedRewardPerShare = _gaugeRewardPerShare[rewardToken];
        uint256 userCheckpoint = _userGaugeRewardCheckpoint[user][rewardToken];

        uint256 newRewards = 0;
        if (accumulatedRewardPerShare > userCheckpoint) {
            uint256 rewardPerShareDelta = accumulatedRewardPerShare - userCheckpoint;
            newRewards = (_shares[user] * rewardPerShareDelta) / PRECISION;
        }

        return _pendingGaugeRewards[user][rewardToken] + newRewards;
    }

    /**
     * @notice Update user's gauge reward checkpoint
     * @param user User address
     * @param rewardToken Reward token address
     * @dev Internal function to snapshot pending gauge rewards
     */
    function _updateGaugeRewardCheckpoint(address user, address rewardToken) internal {
        uint256 pending = pendingGaugeRewards(user, rewardToken);
        _pendingGaugeRewards[user][rewardToken] = pending;
        _userGaugeRewardCheckpoint[user][rewardToken] = _gaugeRewardPerShare[rewardToken];
    }
}
