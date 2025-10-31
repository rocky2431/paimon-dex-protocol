// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title esPaimon - Escrowed PAIMON Incentive Token
 * @notice Linear vesting contract (365 days) with early exit penalties and weekly Boost weight decay
 * @dev Compatible with RewardDistributor and BribeMarketplace
 *
 * Key Features:
 * - Linear vesting: vestedAmount = totalAmount × (elapsed / VESTING_PERIOD)
 * - Early exit penalty: penalty = vestedAmount × (100 - progress) / 100
 * - Boost weight decay: 1% per week (affects staking multiplier)
 * - Non-transferable: Position-based, not ERC20
 *
 * Example:
 * - User vests 1000 esPAIMON
 * - After 100 days (27.4%): vested = 274 esPAIMON
 * - If exit early: penalty = 274 × (100 - 27.4) / 100 = 199 esPAIMON
 * - User receives: 274 - 199 = 75 PAIMON
 */
contract esPaimon is Ownable, ReentrancyGuard {
    // ==================== State Variables ====================

    /// @notice PAIMON token address
    IERC20 public immutable paimonToken;

    /// @notice Vesting period (365 days)
    uint256 public constant VESTING_PERIOD = 365 days;

    /// @notice One week duration
    uint256 public constant ONE_WEEK = 7 days;

    /// @notice Decay rate per week (1% = 100 basis points)
    uint256 public constant DECAY_RATE_PER_WEEK = 100;

    /// @notice Vesting position structure
    struct VestingPosition {
        uint256 totalAmount; // Total vested amount
        uint256 claimedAmount; // Already claimed amount
        uint256 startTime; // Vesting start timestamp
        uint256 lastClaimTime; // Last claim timestamp
    }

    /// @notice User vesting positions
    mapping(address => VestingPosition) public vestingPositions;

    /// @notice Authorized distributor (RewardDistributor)
    address public distributor;

    /// @notice Authorized bribe market
    address public bribeMarket;

    /// @notice Current week number (for emission tracking)
    uint256 public currentWeek;

    // ==================== Events ====================

    event Vested(address indexed user, uint256 amount, uint256 vestingEnd);
    event Claimed(address indexed user, uint256 amount);
    event EarlyExit(address indexed user, uint256 claimed, uint256 penalty);
    event WeeklyEmissionUpdated(uint256 indexed week, uint256 decayedAmount);
    event DistributorUpdated(address indexed oldDistributor, address indexed newDistributor);
    event BribeMarketUpdated(address indexed oldBribeMarket, address indexed newBribeMarket);

    // ==================== Constructor ====================

    /**
     * @notice Initialize esPaimon contract
     * @param _paimonToken PAIMON token address
     */
    constructor(address _paimonToken) Ownable(msg.sender) {
        require(_paimonToken != address(0), "esPaimon: Zero address");
        paimonToken = IERC20(_paimonToken);
        currentWeek = 0;
    }

    // ==================== Core Functions ====================

    /**
     * @notice Vest PAIMON tokens to start linear release
     * @param amount Amount to vest
     */
    function vest(uint256 amount) external nonReentrant {
        require(amount > 0, "esPaimon: Cannot vest zero");

        VestingPosition storage position = vestingPositions[msg.sender];

        // If existing position, claim if there's anything to claim
        if (position.totalAmount > 0) {
            uint256 elapsed = block.timestamp - position.startTime;
            uint256 vestedAmount = _calculateVestedAmount(position.totalAmount, elapsed);
            uint256 claimable = vestedAmount - position.claimedAmount;

            if (claimable > 0) {
                _claimInternal(msg.sender);
            }
        }

        // Transfer PAIMON from user
        require(
            paimonToken.transferFrom(msg.sender, address(this), amount), "esPaimon: Transfer failed"
        );

        // Update position
        if (position.totalAmount == 0) {
            // New position
            position.startTime = block.timestamp;
            position.lastClaimTime = block.timestamp;
        }

        position.totalAmount += amount;

        emit Vested(msg.sender, amount, block.timestamp + VESTING_PERIOD);
    }

    /**
     * @notice Claim vested PAIMON tokens
     */
    function claim() external nonReentrant {
        _claimInternal(msg.sender);
    }

    /**
     * @notice Exit early with penalty
     * @dev Penalty = vestedAmount × (100 - progress) / 100
     */
    function exit() external nonReentrant {
        VestingPosition storage position = vestingPositions[msg.sender];
        require(position.totalAmount > 0, "esPaimon: No vesting position");

        uint256 elapsed = block.timestamp - position.startTime;
        uint256 vestedAmount = _calculateVestedAmount(position.totalAmount, elapsed);
        uint256 claimable = vestedAmount - position.claimedAmount;

        // Calculate penalty and final amount
        uint256 progress = elapsed >= VESTING_PERIOD ? 100 : (elapsed * 100) / VESTING_PERIOD; // Progress in percentage
        uint256 penalty = (claimable * (100 - progress)) / 100;
        uint256 finalAmount = claimable - penalty;

        // Delete position
        delete vestingPositions[msg.sender];

        // Transfer final amount (if any)
        if (finalAmount > 0) {
            require(paimonToken.transfer(msg.sender, finalAmount), "esPaimon: Transfer failed");
        }

        emit EarlyExit(msg.sender, finalAmount, penalty);
    }

    // ==================== View Functions ====================

    /**
     * @notice Get vested amount for a user
     * @param user User address
     * @return Vested amount (minus already claimed)
     */
    function getVestedAmount(address user) external view returns (uint256) {
        VestingPosition memory position = vestingPositions[user];

        if (position.totalAmount == 0) {
            return 0;
        }

        uint256 elapsed = block.timestamp - position.startTime;
        uint256 totalVested = _calculateVestedAmount(position.totalAmount, elapsed);

        return totalVested - position.claimedAmount;
    }

    /**
     * @notice Get Boost weight for a user (decays 1% per week)
     * @param user User address
     * @return Boost weight in basis points (10000 = 100%, 9900 = 99%, etc.)
     */
    function getBoostWeight(address user) external view returns (uint256) {
        VestingPosition memory position = vestingPositions[user];

        if (position.totalAmount == 0) {
            return 0;
        }

        uint256 elapsed = block.timestamp - position.startTime;
        uint256 weeksPassed = elapsed / ONE_WEEK;

        // Weight starts at 10000 (100%), decays 100 basis points per week
        uint256 decayAmount = weeksPassed * DECAY_RATE_PER_WEEK;

        if (decayAmount >= 10000) {
            return 0; // Fully decayed after 100 weeks
        }

        return 10000 - decayAmount;
    }

    // ==================== Distributor Functions ====================

    /**
     * @notice Update weekly emission (called by distributor)
     * @dev Tracks week number and emits event for decay tracking
     */
    function updateWeeklyEmission() external {
        require(msg.sender == distributor, "esPaimon: Not distributor");

        currentWeek++;

        // Emit event for tracking (decay amount can be calculated off-chain)
        emit WeeklyEmissionUpdated(currentWeek, 0);
    }

    // ==================== Admin Functions ====================

    /**
     * @notice Set distributor address
     * @param _distributor New distributor address
     */
    function setDistributor(address _distributor) external onlyOwner {
        require(_distributor != address(0), "esPaimon: Zero address");
        address oldDistributor = distributor;
        distributor = _distributor;
        emit DistributorUpdated(oldDistributor, _distributor);
    }

    /**
     * @notice Set bribe market address
     * @param _bribeMarket New bribe market address
     */
    function setBribeMarket(address _bribeMarket) external onlyOwner {
        require(_bribeMarket != address(0), "esPaimon: Zero address");
        address oldBribeMarket = bribeMarket;
        bribeMarket = _bribeMarket;
        emit BribeMarketUpdated(oldBribeMarket, _bribeMarket);
    }

    // ==================== Internal Functions ====================

    /**
     * @notice Calculate vested amount for a position
     * @param totalAmount Total vested amount
     * @param elapsed Time elapsed since vesting started
     * @return Vested amount
     */
    function _calculateVestedAmount(uint256 totalAmount, uint256 elapsed) internal pure returns (uint256) {
        return elapsed >= VESTING_PERIOD ? totalAmount : (totalAmount * elapsed) / VESTING_PERIOD;
    }

    /**
     * @notice Internal claim function
     * @param user User address
     */
    function _claimInternal(address user) internal {
        VestingPosition storage position = vestingPositions[user];
        require(position.totalAmount > 0, "esPaimon: No vesting position");

        uint256 elapsed = block.timestamp - position.startTime;
        uint256 vestedAmount = _calculateVestedAmount(position.totalAmount, elapsed);
        uint256 claimable = vestedAmount - position.claimedAmount;
        require(claimable > 0, "esPaimon: Nothing to claim");

        position.claimedAmount += claimable;
        position.lastClaimTime = block.timestamp;

        // Transfer PAIMON to user
        require(paimonToken.transfer(user, claimable), "esPaimon: Transfer failed");

        emit Claimed(user, claimable);
    }
}
