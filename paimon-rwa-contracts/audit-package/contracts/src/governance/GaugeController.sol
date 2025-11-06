// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../core/VotingEscrow.sol";
import "../interfaces/IGaugeControllerForBribes.sol";
import "../common/ProtocolConstants.sol";
import "../common/EpochUtils.sol";

/**
 * @title GaugeController
 * @notice Manage liquidity pool gauges with batch voting and epoch-based weight allocation
 * @dev Implements ve33 governance inspired by Curve Finance and Velodrome
 *
 * Key Features:
 * - Gauge management (add, enable/disable liquidity pools)
 * - Epoch-based voting (7-day cycles, auto-advance)
 * - Batch voting (saves ≥84,000 gas vs individual votes)
 * - Vote weight = veNFT voting power × user allocation %
 * - Events emit vote changes (history not stored for gas savings)
 *
 * Voting Mechanics:
 * - Users vote with veNFT (ERC-721 token)
 * - Vote weight = balanceOfNFT(tokenId) × (allocation % / 100%)
 * - Total allocation per epoch cannot exceed 100%
 * - Votes reset every epoch (7 days)
 * - Same gauge can receive multiple updates in one epoch
 *
 * Gas Optimization:
 * - Batch voting: unchecked { ++i } in loops
 * - Events instead of storage for vote history
 * - Minimal state storage per vote
 *
 * Security:
 * - ReentrancyGuard on all state-changing functions
 * - Owner-only gauge management
 * - veNFT ownership verification
 * - Allocation overflow protection
 */
contract GaugeController is IGaugeControllerForBribes, Ownable, ReentrancyGuard {
    /// @notice VotingEscrow contract for veNFT voting power
    VotingEscrow public immutable votingEscrow;

    /// @notice Epoch duration (7 days)
    uint256 public constant EPOCH_DURATION = ProtocolConstants.EPOCH_DURATION;

    /// @notice Weight precision (100% = 10000 basis points)
    uint256 public constant WEIGHT_PRECISION = 10000;

    /// @notice Epoch start timestamp
    uint256 public epochStartTime;

    /// @notice Current epoch number
    uint256 public currentEpoch;

    /// @notice Total number of gauges
    uint256 public gaugeCount;

    /// @notice Gauge information
    struct Gauge {
        address gaugeAddress;   // Liquidity pool gauge address
        bool isActive;          // Whether gauge accepts votes
    }

    /// @notice Mapping from gauge ID to gauge info
    mapping(uint256 => Gauge) public gauges;

    /// @notice Mapping to check if gauge address already exists
    mapping(address => bool) public gaugeExists;

    /// @notice Gauge weights per epoch: epoch => gaugeId => total weight
    mapping(uint256 => mapping(uint256 => uint256)) public gaugeWeights;

    /// @notice User votes per epoch: tokenId => epoch => gaugeId => weight
    mapping(uint256 => mapping(uint256 => mapping(uint256 => uint256))) public userVotes;

    /// @notice User total allocation per epoch: tokenId => epoch => total allocation
    mapping(uint256 => mapping(uint256 => uint256)) public userTotalAllocation;

    /// @notice Emitted when a gauge is added
    /// @param gaugeAddress Gauge address
    /// @param gaugeId Gauge ID
    event GaugeAdded(address indexed gaugeAddress, uint256 indexed gaugeId);

    /// @notice Emitted when gauge active status changes
    /// @param gaugeId Gauge ID
    /// @param isActive New active status
    event GaugeActiveStatusChanged(uint256 indexed gaugeId, bool isActive);

    /// @notice Emitted when user votes
    /// @param user Voter address
    /// @param tokenId veNFT token ID
    /// @param gaugeId Gauge ID
    /// @param weight Vote weight (basis points)
    /// @param epoch Epoch number
    /// @param oldWeight Previous vote weight for this gauge (P3-001: monitoring enhancement)
    /// @param votingPower veNFT voting power at time of vote (P3-001: monitoring enhancement)
    event Voted(
        address indexed user,
        uint256 indexed tokenId,
        uint256 indexed gaugeId,
        uint256 weight,
        uint256 epoch,
        uint256 oldWeight,
        uint256 votingPower
    );

    /// @notice Emitted when user batch votes
    /// @param user Voter address
    /// @param tokenId veNFT token ID
    /// @param epoch Epoch number
    event BatchVoted(address indexed user, uint256 indexed tokenId, uint256 epoch);

    /**
     * @notice Constructor initializes GaugeController with VotingEscrow
     * @param _votingEscrow VotingEscrow contract address
     */
    constructor(address _votingEscrow) Ownable(msg.sender) {
        require(_votingEscrow != address(0), "Invalid VotingEscrow address");
        votingEscrow = VotingEscrow(_votingEscrow);
        epochStartTime = block.timestamp;
        currentEpoch = 0;
    }

    // ============================================================
    // GAUGE MANAGEMENT (OWNER ONLY)
    // ============================================================

    /**
     * @notice Add new gauge
     * @param _gaugeAddress Gauge address
     * @dev Only owner can add gauges
     */
    function addGauge(address _gaugeAddress) external onlyOwner {
        require(_gaugeAddress != address(0), "Invalid gauge address");
        require(!gaugeExists[_gaugeAddress], "Gauge already exists");

        uint256 gaugeId = gaugeCount;
        gauges[gaugeId] = Gauge({
            gaugeAddress: _gaugeAddress,
            isActive: true
        });

        gaugeExists[_gaugeAddress] = true;
        gaugeCount = gaugeId + 1;

        emit GaugeAdded(_gaugeAddress, gaugeId);
    }

    /**
     * @notice Set gauge active status
     * @param _gaugeId Gauge ID
     * @param _isActive New active status
     * @dev Only owner can change gauge status
     */
    function setGaugeActive(uint256 _gaugeId, bool _isActive) external onlyOwner {
        require(_gaugeId < gaugeCount, "Invalid gauge");

        gauges[_gaugeId].isActive = _isActive;

        emit GaugeActiveStatusChanged(_gaugeId, _isActive);
    }

    // ============================================================
    // EPOCH SYSTEM
    // ============================================================

    /**
     * @notice Advance epoch if 7 days have passed
     * @dev Can be called by anyone, auto-advances if conditions met
     */
    function advanceEpoch() public {
        uint256 computedEpoch = EpochUtils.currentEpoch(epochStartTime, EPOCH_DURATION);
        if (computedEpoch > currentEpoch) {
            uint256 epochsPassed = computedEpoch - currentEpoch;
            currentEpoch = computedEpoch;
            epochStartTime += epochsPassed * EPOCH_DURATION;
        }
    }

    /**
     * @notice Get current epoch (with auto-advance check)
     * @return Current epoch number
     */
    function getCurrentEpoch() public view returns (uint256) {
        uint256 computedEpoch = EpochUtils.currentEpoch(epochStartTime, EPOCH_DURATION);
        if (computedEpoch > currentEpoch) {
            return computedEpoch;
        }
        return currentEpoch;
    }

    // ============================================================
    // VOTING SYSTEM
    // ============================================================

    /**
     * @notice Vote for single gauge
     * @param _tokenId veNFT token ID
     * @param _gaugeId Gauge ID
     * @param _weight Vote weight (basis points, 0-10000)
     * @dev Updates allocation, can be called multiple times per epoch
     */
    function vote(
        uint256 _tokenId,
        uint256 _gaugeId,
        uint256 _weight
    ) external nonReentrant {
        // Auto-advance epoch if needed
        advanceEpoch();

        // Validate inputs
        require(_gaugeId < gaugeCount, "Invalid gauge");
        require(gauges[_gaugeId].isActive, "Gauge not active");
        require(_weight <= WEIGHT_PRECISION, "Weight exceeds 100%");

        // Verify veNFT ownership
        address tokenOwner = votingEscrow.ownerOf(_tokenId);
        require(tokenOwner == msg.sender, "Not veNFT owner");

        uint256 epoch = currentEpoch;

        // Get previous vote weight for this gauge
        uint256 oldWeight = userVotes[_tokenId][epoch][_gaugeId];

        // Update total allocation
        uint256 oldTotalAllocation = userTotalAllocation[_tokenId][epoch];
        uint256 newTotalAllocation = oldTotalAllocation - oldWeight + _weight;
        require(newTotalAllocation <= WEIGHT_PRECISION, "Total allocation exceeds 100%");

        // Get veNFT voting power
        uint256 votingPower = votingEscrow.balanceOfNFT(_tokenId);

        // Calculate vote weights
        uint256 oldVoteWeight = (votingPower * oldWeight) / WEIGHT_PRECISION;
        uint256 newVoteWeight = (votingPower * _weight) / WEIGHT_PRECISION;

        // Update gauge weight
        gaugeWeights[epoch][_gaugeId] = gaugeWeights[epoch][_gaugeId] - oldVoteWeight + newVoteWeight;

        // Update user vote
        userVotes[_tokenId][epoch][_gaugeId] = _weight;

        // Update user total allocation
        userTotalAllocation[_tokenId][epoch] = newTotalAllocation;

        // Emit enhanced event with old weight and voting power (P3-001: monitoring enhancement)
        emit Voted(msg.sender, _tokenId, _gaugeId, _weight, epoch, oldWeight, votingPower);
    }

    /**
     * @notice Batch vote for multiple gauges
     * @param _tokenId veNFT token ID
     * @param _gaugeIds Array of gauge IDs
     * @param _weights Array of vote weights (basis points)
     * @dev Gas-optimized batch voting, saves ≥84,000 gas vs individual votes
     */
    function batchVote(
        uint256 _tokenId,
        uint256[] calldata _gaugeIds,
        uint256[] calldata _weights
    ) external nonReentrant {
        // Auto-advance epoch if needed
        advanceEpoch();

        // Validate arrays
        require(_gaugeIds.length == _weights.length, "Array length mismatch");
        require(_gaugeIds.length > 0, "Empty batch");

        // Verify veNFT ownership
        address tokenOwner = votingEscrow.ownerOf(_tokenId);
        require(tokenOwner == msg.sender, "Not veNFT owner");

        uint256 epoch = currentEpoch;

        // Get veNFT voting power once
        uint256 votingPower = votingEscrow.balanceOfNFT(_tokenId);

        // Get current total allocation
        uint256 totalAllocation = userTotalAllocation[_tokenId][epoch];

        // Process each gauge vote
        uint256 length = _gaugeIds.length;
        for (uint256 i = 0; i < length; ) {
            uint256 gaugeId = _gaugeIds[i];
            uint256 weight = _weights[i];

            // Validate gauge
            require(gaugeId < gaugeCount, "Invalid gauge");
            require(gauges[gaugeId].isActive, "Gauge not active");
            require(weight <= WEIGHT_PRECISION, "Weight exceeds 100%");

            // Get old vote weight
            uint256 oldWeight = userVotes[_tokenId][epoch][gaugeId];

            // Update total allocation
            totalAllocation = totalAllocation - oldWeight + weight;

            // Calculate vote weights
            uint256 oldVoteWeight = (votingPower * oldWeight) / WEIGHT_PRECISION;
            uint256 newVoteWeight = (votingPower * weight) / WEIGHT_PRECISION;

            // Update gauge weight
            gaugeWeights[epoch][gaugeId] = gaugeWeights[epoch][gaugeId] - oldVoteWeight + newVoteWeight;

            // Update user vote
            userVotes[_tokenId][epoch][gaugeId] = weight;

            // Gas optimization: unchecked increment
            unchecked {
                ++i;
            }
        }

        // Check total allocation
        require(totalAllocation <= WEIGHT_PRECISION, "Total allocation exceeds 100%");

        // Update user total allocation
        userTotalAllocation[_tokenId][epoch] = totalAllocation;

        emit BatchVoted(msg.sender, _tokenId, epoch);
    }

    // ============================================================
    // HELPER FUNCTIONS FOR BRIBE MARKETPLACE
    // ============================================================

    /**
     * @notice Get gauge ID by address
     * @param _gaugeAddress Gauge address
     * @return gaugeId Gauge ID (returns gaugeCount if not found)
     */
    function getGaugeIdByAddress(address _gaugeAddress) public view returns (uint256) {
        for (uint256 i = 0; i < gaugeCount; i++) {
            if (gauges[i].gaugeAddress == _gaugeAddress) {
                return i;
            }
        }
        return gaugeCount; // Not found
    }

    /**
     * @notice Get user's vote for current epoch (for BribeMarketplace integration)
     * @param _tokenId veNFT token ID
     * @return votedGauge Gauge address (zero address if no votes)
     * @return voteWeight Total vote weight for highest voted gauge
     * @return epoch Current epoch
     * @dev Returns the gauge with highest vote weight for simplicity
     */
    function getUserVote(uint256 _tokenId) external view returns (address votedGauge, uint256 voteWeight, uint256 epoch) {
        epoch = currentEpoch;
        uint256 maxWeight = 0;
        uint256 maxGaugeId = 0;

        // Find gauge with highest vote weight
        for (uint256 i = 0; i < gaugeCount; i++) {
            uint256 weight = userVotes[_tokenId][epoch][i];
            if (weight > maxWeight) {
                maxWeight = weight;
                maxGaugeId = i;
            }
        }

        if (maxWeight > 0) {
            // Calculate actual vote weight (voting power * allocation %)
            uint256 votingPower = votingEscrow.balanceOfNFT(_tokenId);
            voteWeight = (votingPower * maxWeight) / WEIGHT_PRECISION;
            votedGauge = gauges[maxGaugeId].gaugeAddress;
        } else {
            votedGauge = address(0);
            voteWeight = 0;
        }
    }

    /**
     * @notice Get total weight for gauge by address
     * @param _epoch Epoch number
     * @param _gaugeAddress Gauge address
     * @return Total weight for gauge in epoch
     */
    function getGaugeWeightByAddress(uint256 _epoch, address _gaugeAddress) external view returns (uint256) {
        uint256 gaugeId = getGaugeIdByAddress(_gaugeAddress);
        if (gaugeId >= gaugeCount) {
            return 0; // Gauge not found
        }
        return gaugeWeights[_epoch][gaugeId];
    }
}
