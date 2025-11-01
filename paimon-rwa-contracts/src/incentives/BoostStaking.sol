// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title BoostStaking - PAIMON Staking for Reward Boost
 * @notice Stake PAIMON tokens to earn Boost multipliers (1.0x - 1.5x) for reward distribution
 * @dev Integrates with RewardDistributor to amplify user rewards based on staking commitment
 *
 * Key Features:
 * - Minimum lock: 7 days (prevents flash loan attacks)
 * - Boost formula: 10000 + (amount / 1000) × 100, capped at 15000 (1.5x)
 * - Single stake per user (must unstake before re-staking)
 * - Owner emergency unstake (protocol safety)
 *
 * Examples:
 * - Stake 1,000 PAIMON → 1.01x boost (10100)
 * - Stake 10,000 PAIMON → 1.10x boost (11000)
 * - Stake 50,000+ PAIMON → 1.50x boost (15000, capped)
 *
 * Security:
 * - ReentrancyGuard on all state-changing functions
 * - SafeERC20 for token transfers
 * - MIN_STAKE_DURATION prevents same-block unstake exploits
 */
contract BoostStaking is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ==================== State Variables ====================

    /// @notice PAIMON token contract
    IERC20 public immutable paimonToken;

    /// @notice Minimum stake duration (7 days, prevents flash loans)
    uint256 public constant MIN_STAKE_DURATION = 7 days;

    /// @notice Base multiplier (1.0x = 10000 basis points)
    uint256 public constant BASE_MULTIPLIER = 10000;

    /// @notice Maximum multiplier (1.5x = 15000 basis points)
    uint256 public constant MAX_MULTIPLIER = 15000;

    /// @notice Multiplier increment per 1000 tokens (100 = 0.01x)
    uint256 public constant MULTIPLIER_INCREMENT = 100;

    /// @notice Tokens per increment (1000 tokens)
    uint256 public constant TOKENS_PER_INCREMENT = 1000e18;

    /// @notice User stake information
    struct StakeInfo {
        uint256 amount; // Staked amount
        uint256 stakeTime; // Stake timestamp
    }

    /// @notice Mapping of user address to stake info
    mapping(address => StakeInfo) public stakes;

    // ==================== Events ====================

    /// @notice Emitted when user stakes PAIMON
    event Staked(address indexed user, uint256 amount, uint256 lockUntil);

    /// @notice Emitted when user unstakes PAIMON
    event Unstaked(address indexed user, uint256 amount);

    /// @notice Emitted when boost multiplier is calculated
    event BoostCalculated(address indexed user, uint256 multiplier);

    /// @notice Emitted when owner performs emergency unstake
    event EmergencyUnstaked(address indexed user, address indexed owner, uint256 amount);

    // ==================== Constructor ====================

    /**
     * @notice Initialize BoostStaking contract
     * @param _paimonToken PAIMON token address
     */
    constructor(address _paimonToken) Ownable(msg.sender) {
        require(_paimonToken != address(0), "BoostStaking: Zero address");
        paimonToken = IERC20(_paimonToken);
    }

    // ==================== Core Functions ====================

    /**
     * @notice Stake PAIMON tokens to earn boost multiplier
     * @param amount Amount of PAIMON to stake
     */
    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "BoostStaking: Cannot stake zero");
        require(stakes[msg.sender].amount == 0, "BoostStaking: Already staked");

        // Transfer PAIMON from user to contract
        paimonToken.safeTransferFrom(msg.sender, address(this), amount);

        // Record stake
        stakes[msg.sender] = StakeInfo({amount: amount, stakeTime: block.timestamp});

        emit Staked(msg.sender, amount, block.timestamp + MIN_STAKE_DURATION);
    }

    /**
     * @notice Unstake PAIMON tokens after minimum lock period
     */
    function unstake() external nonReentrant {
        StakeInfo memory stakeInfo = stakes[msg.sender];

        require(stakeInfo.amount > 0, "BoostStaking: No stake");
        require(
            block.timestamp >= stakeInfo.stakeTime + MIN_STAKE_DURATION, "BoostStaking: Still locked"
        );

        uint256 amount = stakeInfo.amount;

        // Clear stake first (CEI pattern)
        delete stakes[msg.sender];

        // Transfer PAIMON back to user
        paimonToken.safeTransfer(msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    /**
     * @notice Emergency unstake by owner (protocol safety mechanism)
     * @param user Address to unstake for
     */
    function emergencyUnstake(address user) external onlyOwner nonReentrant {
        StakeInfo memory stakeInfo = stakes[user];

        require(stakeInfo.amount > 0, "BoostStaking: No stake");

        uint256 amount = stakeInfo.amount;

        // Clear stake first (CEI pattern)
        delete stakes[user];

        // Transfer PAIMON back to user
        paimonToken.safeTransfer(user, amount);

        emit EmergencyUnstaked(user, msg.sender, amount);
    }

    // ==================== View Functions ====================

    /**
     * @notice Calculate boost multiplier for a user
     * @param user User address
     * @return multiplier Boost multiplier in basis points (10000 = 1.0x, 15000 = 1.5x)
     *
     * @dev Formula: boostMultiplier = 10000 + (amount / 1000) × 100, capped at 15000
     *
     * Examples:
     * - 0 staked → 10000 (1.0x)
     * - 1,000 staked → 10100 (1.01x)
     * - 10,000 staked → 11000 (1.10x)
     * - 50,000+ staked → 15000 (1.50x, capped)
     */
    function getBoostMultiplier(address user) external view returns (uint256 multiplier) {
        uint256 amount = stakes[user].amount;

        if (amount == 0) {
            return BASE_MULTIPLIER;
        }

        // Calculate boost: BASE + (amount / 1000e18) * 100
        // Using safe math: (amount * 100) / 1000e18
        uint256 boost = (amount * MULTIPLIER_INCREMENT) / TOKENS_PER_INCREMENT;

        // Add to base multiplier and cap at MAX_MULTIPLIER
        multiplier = BASE_MULTIPLIER + boost;

        if (multiplier > MAX_MULTIPLIER) {
            multiplier = MAX_MULTIPLIER;
        }

        return multiplier;
    }

    /**
     * @notice Get staked amount for a user
     * @param user User address
     * @return amount Staked amount
     */
    function stakedAmount(address user) external view returns (uint256 amount) {
        return stakes[user].amount;
    }

    /**
     * @notice Get stake timestamp for a user
     * @param user User address
     * @return timestamp Stake timestamp
     */
    function stakeTime(address user) external view returns (uint256 timestamp) {
        return stakes[user].stakeTime;
    }

    /**
     * @notice Check if user's stake is unlocked
     * @param user User address
     * @return unlocked True if stake can be unstaked
     */
    function isUnlocked(address user) external view returns (bool unlocked) {
        StakeInfo memory stakeInfo = stakes[user];

        if (stakeInfo.amount == 0) {
            return false;
        }

        return block.timestamp >= stakeInfo.stakeTime + MIN_STAKE_DURATION;
    }

    /**
     * @notice Get remaining lock time for a user
     * @param user User address
     * @return remainingTime Remaining lock time in seconds (0 if unlocked)
     */
    function remainingLockTime(address user) external view returns (uint256 remainingTime) {
        StakeInfo memory stakeInfo = stakes[user];

        if (stakeInfo.amount == 0) {
            return 0;
        }

        uint256 unlockTime = stakeInfo.stakeTime + MIN_STAKE_DURATION;

        if (block.timestamp >= unlockTime) {
            return 0;
        }

        return unlockTime - block.timestamp;
    }
}
