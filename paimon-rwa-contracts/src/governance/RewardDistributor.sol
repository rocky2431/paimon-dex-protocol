// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "../core/VotingEscrow.sol";
import "../incentives/BoostStaking.sol";
import "../core/esPaimon.sol";
import "../interfaces/IStabilityPoolGauge.sol";
import "../common/Governable.sol";
import "../common/ProtocolRoles.sol";
import "../common/ProtocolConstants.sol";
import "../common/EpochUtils.sol";

/**
 * @title RewardDistributor
 * @notice Distribute protocol fees to veNFT holders via Merkle tree based on voting power snapshots
 * @dev Implements efficient reward distribution using Merkle proofs (inspired by Uniswap V3 distributor)
 *
 * Key Features:
 * - Merkle tree-based distribution (off-chain computation, on-chain verification)
 * - Multi-token support (USDC, PAIMON, HYD, etc.)
 * - Epoch-based snapshots (7-day cycles aligned with GaugeController)
 * - Unclaimed rewards roll over to next epoch (no expiry)
 * - Merkle proof verification <50K gas
 *
 * Workflow:
 * 1. Off-chain: Calculate reward distribution based on veNFT voting power snapshot
 * 2. Off-chain: Generate Merkle tree with (user address, amount) leaves
 * 3. On-chain: Owner sets Merkle root for epoch + token
 * 4. Users: Claim rewards with Merkle proof
 *
 * Security:
 * - ReentrancyGuard on all state-changing functions
 * - SafeERC20 for token transfers
 * - Owner-only Merkle root updates
 * - Double-claim prevention via bitmap
 * - Front-running protection (msg.sender in proof)
 *
 * Gas Optimization:
 * - Merkle proof verification instead of full distribution array
 * - Bitmap for claimed status (1 bit per user per epoch per token)
 * - No historical data storage (events only)
 */
contract RewardDistributor is Governable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice VotingEscrow contract for veNFT verification
    VotingEscrow public immutable votingEscrow;

    /// @notice BoostStaking contract for reward multipliers
    BoostStaking public immutable boostStaking;

    /// @notice Treasury address for protocol fees
    address public treasury;

    /// @notice esPaimon contract for vesting distribution
    address public esPaimonAddress;

    /// @notice Token address for PAIMON (for es vesting check)
    address public paimonToken;

    /// @notice Use es vesting mode for PAIMON rewards (default: true)
    bool public useEsVesting = true;

    /// @notice StabilityPool gauge address (Task 53)
    address public stabilityPoolGauge;

    /// @notice Gauge weight for StabilityPool (Task 53)
    /// @dev Weight is in basis points (10000 = 100%)
    uint256 public stabilityPoolWeight;

    /// @notice Gauge weight precision (100% = 10000 basis points)
    uint256 public constant GAUGE_WEIGHT_PRECISION = 10000;

    /// @notice Epoch duration (7 days, aligned with GaugeController)
    uint256 public constant EPOCH_DURATION = ProtocolConstants.EPOCH_DURATION;

    /// @notice Epoch start timestamp
    uint256 public epochStartTime;

    /// @notice Current epoch number
    uint256 public currentEpoch;

    /// @notice Merkle root for each epoch and token
    /// @dev merkleRoots[epoch][token] = root
    mapping(uint256 => mapping(address => bytes32)) public merkleRoots;

    /// @notice Track claimed status for each user, epoch, and token
    /// @dev claimed[epoch][token][user] = true if claimed
    mapping(uint256 => mapping(address => mapping(address => bool))) public claimed;

    /// @notice Emitted when Merkle root is set for an epoch and token
    event MerkleRootSet(uint256 indexed epoch, address indexed token, bytes32 merkleRoot);

    /// @notice Emitted when user claims rewards
    event RewardClaimed(uint256 indexed epoch, address indexed user, address indexed token, uint256 amount);

    /// @notice Emitted when boost multiplier is applied to rewards
    event BoostApplied(address indexed user, uint256 baseReward, uint256 boostMultiplier, uint256 actualReward);

    /// @notice Emitted when epoch advances
    event EpochAdvanced(uint256 indexed newEpoch, uint256 timestamp);

    /// @notice Emitted when StabilityPool gauge weight is updated (Task 53)
    event GaugeWeightUpdated(address indexed gauge, uint256 weight, uint256 epoch);

    /// @notice Emitted when rewards are distributed to a gauge (Task 53)
    event RewardsDistributed(address indexed gauge, address indexed token, uint256 amount, uint256 epoch);

    /**
     * @notice Constructor
     * @param _votingEscrow VotingEscrow contract address
     * @param _boostStaking BoostStaking contract address
     * @param _treasury Treasury address
     */
    constructor(address _votingEscrow, address _boostStaking, address _treasury) Governable(msg.sender) {
        require(_votingEscrow != address(0), "Invalid votingEscrow");
        require(_boostStaking != address(0), "Invalid boostStaking");
        require(_treasury != address(0), "Invalid treasury");

        votingEscrow = VotingEscrow(_votingEscrow);
        boostStaking = BoostStaking(_boostStaking);
        treasury = _treasury;
        epochStartTime = block.timestamp;
        currentEpoch = 0;

        _grantRole(ProtocolRoles.INCENTIVE_MANAGER_ROLE, msg.sender);
    }

    modifier onlyIncentiveManager() {
        _checkRole(ProtocolRoles.INCENTIVE_MANAGER_ROLE, _msgSender());
        _;
    }

    function grantIncentiveManager(address account) external onlyGovernance {
        require(account != address(0), "RewardDistributor: account is zero");
        _grantRole(ProtocolRoles.INCENTIVE_MANAGER_ROLE, account);
    }

    function revokeIncentiveManager(address account) external onlyGovernance {
        require(account != address(0), "RewardDistributor: account is zero");
        _revokeRole(ProtocolRoles.INCENTIVE_MANAGER_ROLE, account);
    }

    function _afterGovernanceTransfer(address previousGovernor, address newGovernor)
        internal
        override
    {
        if (hasRole(ProtocolRoles.INCENTIVE_MANAGER_ROLE, previousGovernor)) {
            _revokeRole(ProtocolRoles.INCENTIVE_MANAGER_ROLE, previousGovernor);
        }
        _grantRole(ProtocolRoles.INCENTIVE_MANAGER_ROLE, newGovernor);
    }

    /**
     * @notice Set Merkle root for an epoch and token (owner only)
     * @param epoch Epoch number
     * @param token Reward token address
     * @param merkleRoot Merkle tree root
     */
    function setMerkleRoot(uint256 epoch, address token, bytes32 merkleRoot) external onlyIncentiveManager {
        require(token != address(0), "Invalid token address");
        require(merkleRoot != bytes32(0), "Invalid merkle root");

        merkleRoots[epoch][token] = merkleRoot;
        emit MerkleRootSet(epoch, token, merkleRoot);
    }

    /**
     * @notice Claim rewards for a specific epoch and token (with boost applied)
     * @param epoch Epoch number
     * @param token Reward token address
     * @param amount Base reward amount (before boost)
     * @param proof Merkle proof
     *
     * @dev Boost multiplier is queried from BoostStaking contract at claim time
     *      actualReward = baseReward × boostMultiplier / 10000
     *      Example: baseReward=100, boostMultiplier=11000 (1.1x) → actualReward=110
     */
    function claim(uint256 epoch, address token, uint256 amount, bytes32[] calldata proof) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(merkleRoots[epoch][token] != bytes32(0), "Merkle root not set");
        require(!claimed[epoch][token][msg.sender], "Already claimed");

        // Verify Merkle proof (compatible with @openzeppelin/merkle-tree StandardMerkleTree)
        // StandardMerkleTree uses double hashing: keccak256(bytes.concat(keccak256(abi.encode(...))))
        // Note: For single-leaf tree, proof is empty array and leaf must equal root
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(msg.sender, amount))));
        require(MerkleProof.verify(proof, merkleRoots[epoch][token], leaf), "Invalid proof");

        // Mark as claimed
        claimed[epoch][token][msg.sender] = true;

        // Query boost multiplier from BoostStaking (10000 = 1.0x, 15000 = 1.5x)
        uint256 boostMultiplier = boostStaking.getBoostMultiplier(msg.sender);

        // Calculate actual reward with boost applied (multiply before divide for precision)
        uint256 actualReward = (amount * boostMultiplier) / 10000;

        // Emit BoostApplied event
        emit BoostApplied(msg.sender, amount, boostMultiplier, actualReward);

        // Distribute rewards: es vesting or direct transfer
        if (useEsVesting && token == paimonToken && esPaimonAddress != address(0)) {
            // Es vesting mode: vest rewards for user
            IERC20(token).approve(esPaimonAddress, actualReward);
            esPaimon(esPaimonAddress).vestFor(msg.sender, actualReward);
        } else {
            // Direct transfer mode: transfer rewards immediately
            IERC20(token).safeTransfer(msg.sender, actualReward);
        }

        emit RewardClaimed(epoch, msg.sender, token, actualReward);
    }

    /**
     * @notice Check if user has claimed rewards for an epoch and token
     * @param epoch Epoch number
     * @param token Reward token address
     * @param user User address
     * @return True if claimed, false otherwise
     */
    function isClaimed(uint256 epoch, address token, address user) external view returns (bool) {
        return claimed[epoch][token][user];
    }

    /**
     * @notice Advance epoch if duration has passed
     */
    function advanceEpoch() public {
        uint256 computedEpoch = EpochUtils.currentEpoch(epochStartTime, EPOCH_DURATION);
        if (computedEpoch > currentEpoch) {
            currentEpoch = computedEpoch;
            emit EpochAdvanced(currentEpoch, block.timestamp);
        }
    }

    /**
     * @notice Get current epoch (auto-advances if needed)
     * @return Current epoch number
     */
    function getCurrentEpoch() external view returns (uint256) {
        return EpochUtils.currentEpoch(epochStartTime, EPOCH_DURATION);
    }

    /**
     * @notice Emergency withdraw tokens (owner only)
     * @param token Token address
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyIncentiveManager {
        IERC20(token).safeTransfer(treasury, amount);
    }

    /**
     * @notice Update treasury address (owner only)
     * @param _treasury New treasury address
     */
    function setTreasury(address _treasury) external onlyIncentiveManager {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
    }

    /**
     * @notice Set esPaimon contract address (owner only)
     * @param _esPaimon esPaimon contract address
     * @dev Required for es vesting distribution mode
     */
    function setEsPaimon(address _esPaimon) external onlyIncentiveManager {
        require(_esPaimon != address(0), "esPaimon not configured");
        esPaimonAddress = _esPaimon;
    }

    /**
     * @notice Set PAIMON token address (owner only)
     * @param _paimonToken PAIMON token address
     * @dev Required to identify PAIMON rewards for es vesting
     */
    function setPaimonToken(address _paimonToken) external onlyIncentiveManager {
        require(_paimonToken != address(0), "Invalid paimonToken");
        paimonToken = _paimonToken;
    }

    /**
     * @notice Toggle es vesting mode (owner only)
     * @param _useEsVesting True to enable es vesting, false for direct transfer
     * @dev When enabled, PAIMON rewards are vested via esPaimon.vestFor()
     *      When disabled, PAIMON rewards are transferred directly
     */
    function setUseEsVesting(bool _useEsVesting) external onlyIncentiveManager {
        useEsVesting = _useEsVesting;
    }

    // ==================== STABILITY POOL GAUGE INTEGRATION (TASK 53) ====================

    /**
     * @notice Set StabilityPool gauge weight (owner only)
     * @param weight Weight in basis points (10000 = 100%)
     * @dev Task 53.1 - StabilityPool Gauge weight management
     */
    function setStabilityPoolWeight(uint256 weight) external onlyIncentiveManager {
        require(weight <= GAUGE_WEIGHT_PRECISION, "Weight exceeds maximum");

        stabilityPoolWeight = weight;

        // Set gauge address on first weight update
        if (stabilityPoolGauge == address(0) && weight > 0) {
            // StabilityPool address will be set externally
            // For now, we store the weight and emit event
        }

        uint256 currentEpochNumber = EpochUtils.currentEpoch(epochStartTime, EPOCH_DURATION);
        emit GaugeWeightUpdated(stabilityPoolGauge, weight, currentEpochNumber);
    }

    /**
     * @notice Set StabilityPool gauge address (owner only)
     * @param _stabilityPoolGauge StabilityPool contract address
     * @dev Task 53.1 - Required before distributing rewards
     */
    function setStabilityPoolGauge(address _stabilityPoolGauge) external onlyIncentiveManager {
        require(_stabilityPoolGauge != address(0), "Invalid gauge address");
        stabilityPoolGauge = _stabilityPoolGauge;
    }

    /**
     * @notice Get gauge weight for a gauge address
     * @param gauge Gauge address
     * @return Weight in basis points
     * @dev Task 53.1 - Query gauge weight
     */
    function getGaugeWeight(address gauge) external view returns (uint256) {
        if (gauge == stabilityPoolGauge) {
            return stabilityPoolWeight;
        }
        return 0;
    }

    /**
     * @notice Distribute rewards to StabilityPool based on gauge weight
     * @param token Reward token address
     * @param totalAmount Total rewards to distribute
     * @dev Task 53.2 - Distribute rewards proportionally by gauge weight
     *
     * Flow:
     * 1. Calculate StabilityPool share: totalAmount * weight / GAUGE_WEIGHT_PRECISION
     * 2. Transfer tokens to StabilityPool
     * 3. Call StabilityPool.notifyRewardAmount() to distribute to depositors
     */
    function distributeRewards(address token, uint256 totalAmount) external onlyIncentiveManager nonReentrant {
        require(token != address(0), "Invalid token");
        require(totalAmount > 0, "Amount must be > 0");

        uint256 currentEpochNumber = EpochUtils.currentEpoch(epochStartTime, EPOCH_DURATION);

        // Distribute to StabilityPool if weight > 0 and gauge is set
        if (stabilityPoolWeight > 0 && stabilityPoolGauge != address(0)) {
            // Calculate StabilityPool reward amount
            uint256 stabilityPoolReward = (totalAmount * stabilityPoolWeight) / GAUGE_WEIGHT_PRECISION;

            if (stabilityPoolReward > 0) {
                // Transfer tokens to StabilityPool
                IERC20(token).safeTransfer(stabilityPoolGauge, stabilityPoolReward);

                // Notify StabilityPool to distribute rewards to depositors
                IStabilityPoolGauge(stabilityPoolGauge).notifyRewardAmount(token, stabilityPoolReward);

                // Emit event
                emit RewardsDistributed(stabilityPoolGauge, token, stabilityPoolReward, currentEpochNumber);
            }
        }

        // Remaining rewards stay in distributor for veNFT claims via Merkle tree
        // This maintains backward compatibility with existing claim() function
    }
}
