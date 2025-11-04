// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../core/VotingEscrowPaimon.sol";

/**
 * @title NitroPool - External Incentive Pools with Governance Approval
 * @notice Allows external projects to create additional incentive pools for LP stakers
 * @dev Requires vePaimon governance voting to approve new pools
 *
 * Key Features:
 * - Governance-gated pool creation (vePaimon voting required)
 * - Configurable lock duration (7 days - 365 days)
 * - Minimum liquidity requirements
 * - Multi-token reward support
 * - Platform fee (2% on reward deposits)
 * - Malicious token protection via SafeERC20
 *
 * Security:
 * - ReentrancyGuard on all state-changing functions
 * - SafeERC20 for token transfers
 * - Owner emergency controls (deactivate/reactivate pools)
 * - Minimum voting power requirement for approval (100 vePaimon)
 *
 * Economics:
 * - Platform fee: 200 basis points (2%)
 * - Fee destination: Protocol treasury
 * - No fee on LP token deposits/withdrawals
 *
 * Example Flow:
 * 1. External project creates Nitro pool proposal
 * 2. vePaimon holders vote to approve
 * 3. Pool becomes active
 * 4. Users stake LP tokens with lock period
 * 5. Project deposits reward tokens (2% platform fee)
 * 6. Users claim rewards after staking
 * 7. Users unstake LP after lock expires
 */
contract NitroPool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ==================== State Variables ====================

    /// @notice VotingEscrowPaimon contract for governance
    VotingEscrowPaimon public immutable vePaimon;

    /// @notice Protocol treasury address
    address public immutable treasury;

    /// @notice Platform fee in basis points (200 = 2%)
    uint256 public immutable platformFeeBps;

    /// @notice Minimum voting power required to approve pool (100 vePaimon)
    uint256 public constant MIN_VOTING_POWER = 100e18;

    /// @notice Minimum lock duration (7 days)
    uint256 public constant MIN_LOCK_DURATION = 7 days;

    /// @notice Maximum lock duration (365 days)
    uint256 public constant MAX_LOCK_DURATION = 365 days;

    /// @notice Pool counter
    uint256 public poolCount;

    /// @notice Nitro pool information
    struct NitroPoolInfo {
        address lpToken; // LP token address
        uint256 lockDuration; // Lock duration in seconds
        uint256 minLiquidity; // Minimum liquidity requirement
        address[] rewardTokens; // Reward tokens whitelist
        address creator; // Pool creator (external project)
        bool approved; // Governance approval status
        bool active; // Pool active status
        uint256 totalStaked; // Total LP tokens staked
        mapping(address => uint256) rewardPerShare; // Reward per share for each token
    }

    /// @notice User stake information
    struct UserStake {
        uint256 amount; // Staked LP amount
        uint256 stakeTime; // Stake timestamp
        uint256 unlockTime; // Unlock timestamp
    }

    /// @notice Mapping of pool ID to pool info
    mapping(uint256 => NitroPoolInfo) public pools;

    /// @notice Mapping of pool ID => user => stake info
    mapping(uint256 => mapping(address => UserStake)) public userStakes;

    /// @notice Mapping of pool ID => user => reward token => claimed amount
    mapping(uint256 => mapping(address => mapping(address => uint256))) public userRewardDebt;

    // ==================== Events ====================

    event NitroPoolCreated(
        uint256 indexed poolId,
        address indexed creator,
        address lpToken,
        uint256 lockDuration,
        uint256 minLiquidity,
        address[] rewardTokens
    );

    event NitroPoolApproved(uint256 indexed poolId, address indexed approver);

    event NitroPoolEntered(uint256 indexed poolId, address indexed user, uint256 amount);

    event NitroPoolExited(uint256 indexed poolId, address indexed user, uint256 amount);

    event NitroRewardClaimed(
        uint256 indexed poolId, address indexed user, address indexed rewardToken, uint256 amount
    );

    event RewardDeposited(
        uint256 indexed poolId, address indexed depositor, address indexed rewardToken, uint256 amount
    );

    event NitroPoolDeactivated(uint256 indexed poolId);

    event NitroPoolReactivated(uint256 indexed poolId);

    // ==================== Constructor ====================

    /**
     * @notice Initialize NitroPool contract
     * @param _vePaimon VotingEscrowPaimon contract address
     * @param _treasury Protocol treasury address
     * @param _platformFeeBps Platform fee in basis points (200 = 2%)
     */
    constructor(address _vePaimon, address _treasury, uint256 _platformFeeBps)
        Ownable(msg.sender)
    {
        require(_vePaimon != address(0), "NitroPool: Zero vePaimon");
        require(_treasury != address(0), "NitroPool: Zero treasury");
        require(_platformFeeBps <= 1000, "NitroPool: Fee too high"); // Max 10%

        vePaimon = VotingEscrowPaimon(_vePaimon);
        treasury = _treasury;
        platformFeeBps = _platformFeeBps;
    }

    // ==================== Core Functions ====================

    /**
     * @notice Create new Nitro pool (pending governance approval)
     * @param lpToken LP token address
     * @param lockDuration Lock duration in seconds
     * @param minLiquidity Minimum liquidity requirement
     * @param rewardTokens Array of reward token addresses
     * @return poolId Created pool ID
     */
    function createNitroPool(
        address lpToken,
        uint256 lockDuration,
        uint256 minLiquidity,
        address[] calldata rewardTokens
    ) external nonReentrant returns (uint256 poolId) {
        require(lpToken != address(0), "NitroPool: Zero LP token");
        require(lockDuration >= MIN_LOCK_DURATION, "NitroPool: Lock too short");
        require(lockDuration <= MAX_LOCK_DURATION, "NitroPool: Lock too long");
        require(rewardTokens.length > 0, "NitroPool: No reward tokens");
        require(rewardTokens.length <= 10, "NitroPool: Too many reward tokens");

        poolId = poolCount++;

        NitroPoolInfo storage pool = pools[poolId];
        pool.lpToken = lpToken;
        pool.lockDuration = lockDuration;
        pool.minLiquidity = minLiquidity;
        pool.rewardTokens = rewardTokens;
        pool.creator = msg.sender;
        pool.approved = false;
        pool.active = false;
        pool.totalStaked = 0;

        emit NitroPoolCreated(poolId, msg.sender, lpToken, lockDuration, minLiquidity, rewardTokens);
    }

    /**
     * @notice Approve Nitro pool via vePaimon governance
     * @param poolId Pool ID to approve
     * @param veTokenId vePaimon NFT token ID (proof of voting power)
     */
    function approveNitroPool(uint256 poolId, uint256 veTokenId) external nonReentrant {
        NitroPoolInfo storage pool = pools[poolId];

        require(pool.lpToken != address(0), "NitroPool: Pool not exist");
        require(!pool.approved, "NitroPool: Already approved");

        // Verify caller owns vePaimon NFT
        require(vePaimon.ownerOf(veTokenId) == msg.sender, "NitroPool: Not NFT owner");

        // Verify sufficient voting power
        uint256 votingPower = vePaimon.balanceOfNFT(veTokenId);
        require(votingPower >= MIN_VOTING_POWER, "NitroPool: Insufficient voting power");

        // Approve and activate pool
        pool.approved = true;
        pool.active = true;

        emit NitroPoolApproved(poolId, msg.sender);
    }

    /**
     * @notice Enter Nitro pool by staking LP tokens
     * @param poolId Pool ID
     * @param amount LP token amount to stake
     */
    function enterNitroPool(uint256 poolId, uint256 amount) external nonReentrant {
        NitroPoolInfo storage pool = pools[poolId];
        UserStake storage stake = userStakes[poolId][msg.sender];

        require(pool.approved, "NitroPool: Not approved");
        require(pool.active, "NitroPool: Not active");
        require(amount > 0, "NitroPool: Zero amount");
        require(amount >= pool.minLiquidity, "NitroPool: Below min liquidity");
        require(stake.amount == 0, "NitroPool: Already staked");

        // Transfer LP tokens to contract
        IERC20(pool.lpToken).safeTransferFrom(msg.sender, address(this), amount);

        // Record stake
        stake.amount = amount;
        stake.stakeTime = block.timestamp;
        stake.unlockTime = block.timestamp + pool.lockDuration;

        pool.totalStaked += amount;

        // Initialize reward debt for all reward tokens
        for (uint256 i = 0; i < pool.rewardTokens.length; i++) {
            address rewardToken = pool.rewardTokens[i];
            userRewardDebt[poolId][msg.sender][rewardToken] = pool.rewardPerShare[rewardToken];
        }

        emit NitroPoolEntered(poolId, msg.sender, amount);
    }

    /**
     * @notice Exit Nitro pool after lock expires
     * @param poolId Pool ID
     */
    function exitNitroPool(uint256 poolId) external nonReentrant {
        NitroPoolInfo storage pool = pools[poolId];
        UserStake storage stake = userStakes[poolId][msg.sender];

        require(stake.amount > 0, "NitroPool: No stake");
        require(block.timestamp >= stake.unlockTime, "NitroPool: Still locked");

        uint256 amount = stake.amount;

        // Clear stake first (CEI pattern)
        stake.amount = 0;
        stake.stakeTime = 0;
        stake.unlockTime = 0;

        pool.totalStaked -= amount;

        // Transfer LP tokens back to user
        IERC20(pool.lpToken).safeTransfer(msg.sender, amount);

        emit NitroPoolExited(poolId, msg.sender, amount);
    }

    /**
     * @notice Claim accumulated rewards from Nitro pool
     * @param poolId Pool ID
     */
    function claimRewards(uint256 poolId) external nonReentrant {
        NitroPoolInfo storage pool = pools[poolId];
        UserStake storage stake = userStakes[poolId][msg.sender];

        require(stake.amount > 0, "NitroPool: No stake");

        // Claim rewards for all reward tokens
        for (uint256 i = 0; i < pool.rewardTokens.length; i++) {
            address rewardToken = pool.rewardTokens[i];
            uint256 pending = _calculatePendingReward(poolId, msg.sender, rewardToken);

            if (pending > 0) {
                userRewardDebt[poolId][msg.sender][rewardToken] = pool.rewardPerShare[rewardToken];
                IERC20(rewardToken).safeTransfer(msg.sender, pending);

                emit NitroRewardClaimed(poolId, msg.sender, rewardToken, pending);
            }
        }
    }

    /**
     * @notice Deposit reward tokens to Nitro pool
     * @param poolId Pool ID
     * @param rewardToken Reward token address
     * @param amount Reward amount
     */
    function depositReward(uint256 poolId, address rewardToken, uint256 amount)
        external
        nonReentrant
    {
        NitroPoolInfo storage pool = pools[poolId];

        require(pool.approved, "NitroPool: Not approved");
        require(_isValidRewardToken(poolId, rewardToken), "NitroPool: Invalid reward token");
        require(amount > 0, "NitroPool: Zero amount");

        // Calculate platform fee
        uint256 platformFee = (amount * platformFeeBps) / 10000;
        uint256 rewardAmount = amount - platformFee;

        // Transfer reward tokens from depositor
        IERC20(rewardToken).safeTransferFrom(msg.sender, address(this), amount);

        // Transfer platform fee to treasury
        if (platformFee > 0) {
            IERC20(rewardToken).safeTransfer(treasury, platformFee);
        }

        // Update reward per share
        if (pool.totalStaked > 0) {
            pool.rewardPerShare[rewardToken] += (rewardAmount * 1e18) / pool.totalStaked;
        }

        emit RewardDeposited(poolId, msg.sender, rewardToken, rewardAmount);
    }

    /**
     * @notice Deactivate Nitro pool (owner only)
     * @param poolId Pool ID
     */
    function deactivateNitroPool(uint256 poolId) external onlyOwner {
        NitroPoolInfo storage pool = pools[poolId];
        require(pool.approved, "NitroPool: Not approved");
        require(pool.active, "NitroPool: Already inactive");

        pool.active = false;

        emit NitroPoolDeactivated(poolId);
    }

    /**
     * @notice Reactivate Nitro pool (owner only)
     * @param poolId Pool ID
     */
    function reactivateNitroPool(uint256 poolId) external onlyOwner {
        NitroPoolInfo storage pool = pools[poolId];
        require(pool.approved, "NitroPool: Not approved");
        require(!pool.active, "NitroPool: Already active");

        pool.active = true;

        emit NitroPoolReactivated(poolId);
    }

    // ==================== View Functions ====================

    /**
     * @notice Get pool information
     * @param poolId Pool ID
     * @return lpToken LP token address
     * @return lockDuration Lock duration
     * @return minLiquidity Minimum liquidity
     * @return rewardTokens Reward tokens array
     * @return creator Pool creator
     * @return approved Approval status
     * @return active Active status
     * @return totalStaked Total staked amount
     * @return platformFee Platform fee basis points
     */
    function getPoolInfo(uint256 poolId)
        external
        view
        returns (
            address lpToken,
            uint256 lockDuration,
            uint256 minLiquidity,
            address[] memory rewardTokens,
            address creator,
            bool approved,
            bool active,
            uint256 totalStaked,
            uint256 platformFee
        )
    {
        NitroPoolInfo storage pool = pools[poolId];
        return (
            pool.lpToken,
            pool.lockDuration,
            pool.minLiquidity,
            pool.rewardTokens,
            pool.creator,
            pool.approved,
            pool.active,
            pool.totalStaked,
            platformFeeBps
        );
    }

    /**
     * @notice Calculate pending rewards for user
     * @param poolId Pool ID
     * @param user User address
     * @param rewardToken Reward token address
     * @return pending Pending reward amount
     */
    function pendingReward(uint256 poolId, address user, address rewardToken)
        external
        view
        returns (uint256 pending)
    {
        return _calculatePendingReward(poolId, user, rewardToken);
    }

    /**
     * @notice Get user stake information
     * @param poolId Pool ID
     * @param user User address
     * @return amount Staked amount
     * @return stakeTime Stake timestamp
     * @return unlockTime Unlock timestamp
     */
    function getUserStake(uint256 poolId, address user)
        external
        view
        returns (uint256 amount, uint256 stakeTime, uint256 unlockTime)
    {
        UserStake storage stake = userStakes[poolId][user];
        return (stake.amount, stake.stakeTime, stake.unlockTime);
    }

    /**
     * @notice Check if user's stake is unlocked
     * @param poolId Pool ID
     * @param user User address
     * @return unlocked True if unlocked
     */
    function isUnlocked(uint256 poolId, address user) external view returns (bool unlocked) {
        UserStake storage stake = userStakes[poolId][user];

        if (stake.amount == 0) {
            return false;
        }

        return block.timestamp >= stake.unlockTime;
    }

    // ==================== Internal Functions ====================

    /**
     * @notice Calculate pending reward for user
     * @param poolId Pool ID
     * @param user User address
     * @param rewardToken Reward token address
     * @return pending Pending reward amount
     */
    function _calculatePendingReward(uint256 poolId, address user, address rewardToken)
        internal
        view
        returns (uint256 pending)
    {
        NitroPoolInfo storage pool = pools[poolId];
        UserStake storage stake = userStakes[poolId][user];

        if (stake.amount == 0) {
            return 0;
        }

        uint256 rewardPerShare = pool.rewardPerShare[rewardToken];
        uint256 userDebt = userRewardDebt[poolId][user][rewardToken];

        pending = (stake.amount * (rewardPerShare - userDebt)) / 1e18;
    }

    /**
     * @notice Check if reward token is valid for pool
     * @param poolId Pool ID
     * @param rewardToken Reward token address
     * @return valid True if valid
     */
    function _isValidRewardToken(uint256 poolId, address rewardToken)
        internal
        view
        returns (bool valid)
    {
        NitroPoolInfo storage pool = pools[poolId];

        for (uint256 i = 0; i < pool.rewardTokens.length; i++) {
            if (pool.rewardTokens[i] == rewardToken) {
                return true;
            }
        }

        return false;
    }
}
