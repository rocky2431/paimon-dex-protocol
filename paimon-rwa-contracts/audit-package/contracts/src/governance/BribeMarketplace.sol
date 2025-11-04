// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IGaugeControllerForBribes.sol";

/**
 * @title BribeMarketplace
 * @notice Allow protocols to incentivize veNFT holders to vote for specific gauges via bribes
 * @dev Implements bribe marketplace pattern inspired by Thena Finance and Hidden Hand
 *
 * Key Features:
 * - Protocols create bribes for specific gauges and epochs
 * - veNFT holders vote for gauges and claim proportional bribes
 * - 2% platform fee collected on all bribes
 * - Token whitelist for security
 * - Vote verification via GaugeController integration
 *
 * Bribe Flow:
 * 1. Protocol creates bribe: deposits tokens (minus 2% fee) for gauge + epoch
 * 2. Users vote for gauge via GaugeController
 * 3. Users claim bribe proportional to their vote weight
 * 4. Claimed status tracked to prevent double-claiming
 *
 * Fee Structure:
 * - Platform fee: 2% (200 / 10000)
 * - Sent to treasury immediately on bribe creation
 * - Net bribe amount (98%) distributed to voters
 *
 * Security:
 * - ReentrancyGuard on all state-changing functions
 * - SafeERC20 for token transfers
 * - Owner-only token whitelist management
 * - NFT ownership verification for claims
 * - Vote verification (must have voted for gauge)
 */
contract BribeMarketplace is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice GaugeController contract for vote verification
    IGaugeControllerForBribes public immutable gaugeController;

    /// @notice Treasury address for fee collection
    address public treasury;

    /// @notice Platform fee rate (2% = 200 / 10000)
    uint256 public constant FEE_RATE = 200;

    /// @notice Fee denominator (10000 = 100%)
    uint256 public constant FEE_DENOMINATOR = 10000;

    /// @notice Current epoch (for tracking)
    uint256 public currentEpoch;

    /// @notice Next bribe ID
    uint256 public nextBribeId;

    /// @notice Bribe information
    struct Bribe {
        uint256 epoch;          // Target epoch
        address gauge;          // Target gauge address
        address token;          // Bribe token address
        uint256 amount;         // Net bribe amount (after fee)
        address creator;        // Bribe creator address
        uint256 totalVotes;     // Total votes for this gauge in epoch (cached)
    }

    /// @notice Mapping from bribe ID to bribe info
    mapping(uint256 => Bribe) public bribes;

    /// @notice Token whitelist
    mapping(address => bool) public isWhitelisted;

    /// @notice Claimed status: bribeId => tokenId => claimed
    mapping(uint256 => mapping(uint256 => bool)) public hasClaimed;

    /// @notice Emitted when token whitelist status changes
    event TokenWhitelisted(address indexed token, bool whitelisted);

    /// @notice Emitted when bribe is created
    event BribeCreated(
        uint256 indexed epoch,
        uint256 indexed bribeId,
        address indexed gauge,
        address token,
        uint256 amount,
        address creator
    );

    /// @notice Emitted when bribe is claimed
    event BribeClaimed(uint256 indexed bribeId, uint256 indexed tokenId, address indexed claimer, uint256 amount);

    /**
     * @notice Constructor
     * @param _gaugeController GaugeController contract address
     * @param _treasury Treasury address
     */
    constructor(address _gaugeController, address _treasury) Ownable(msg.sender) {
        require(_gaugeController != address(0), "Invalid gaugeController");
        require(_treasury != address(0), "Invalid treasury");

        gaugeController = IGaugeControllerForBribes(_gaugeController);
        treasury = _treasury;
        currentEpoch = 0;
        nextBribeId = 0;
    }

    /**
     * @notice Whitelist or remove token from whitelist (owner only)
     * @param token Token address
     * @param whitelisted True to whitelist, false to remove
     */
    function whitelistToken(address token, bool whitelisted) external onlyOwner {
        require(token != address(0), "Invalid token");
        isWhitelisted[token] = whitelisted;
        emit TokenWhitelisted(token, whitelisted);
    }

    /**
     * @notice Create bribe for a gauge
     * @param epoch Target epoch
     * @param gauge Target gauge address
     * @param token Bribe token address
     * @param amount Total bribe amount (including fee)
     */
    function createBribe(uint256 epoch, address gauge, address token, uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(gauge != address(0), "Invalid gauge");
        require(isWhitelisted[token], "Token not whitelisted");

        // Calculate fee and net amount
        uint256 fee = (amount * FEE_RATE) / FEE_DENOMINATOR;
        uint256 netAmount = amount - fee;

        // Transfer tokens from creator
        IERC20(token).safeTransferFrom(msg.sender, address(this), netAmount);
        IERC20(token).safeTransferFrom(msg.sender, treasury, fee);

        // Store bribe info
        uint256 bribeId = nextBribeId;
        bribes[bribeId] = Bribe({
            epoch: epoch,
            gauge: gauge,
            token: token,
            amount: netAmount,
            creator: msg.sender,
            totalVotes: 0 // Will be calculated on first claim
        });

        nextBribeId++;

        emit BribeCreated(epoch, bribeId, gauge, token, amount, msg.sender);
    }

    /**
     * @notice Claim bribe for a veNFT
     * @param bribeId Bribe ID
     * @param tokenId veNFT token ID
     */
    function claimBribe(uint256 bribeId, uint256 tokenId) external nonReentrant {
        require(bribeId < nextBribeId, "Invalid bribe ID");
        require(!hasClaimed[bribeId][tokenId], "Already claimed");

        Bribe storage bribe = bribes[bribeId];

        // Verify caller is NFT owner
        address nftOwner = gaugeController.votingEscrow().ownerOf(tokenId);
        require(msg.sender == nftOwner, "Not NFT owner");

        // Get user's vote for this gauge in this epoch
        (address votedGauge, uint256 voteWeight, uint256 votedEpoch) = gaugeController.getUserVote(tokenId);
        require(votedGauge == bribe.gauge, "No vote for this gauge");
        require(votedEpoch == bribe.epoch, "Vote not for this epoch");
        require(voteWeight > 0, "No voting power");

        // Calculate total votes for gauge (if not cached)
        if (bribe.totalVotes == 0) {
            bribe.totalVotes = gaugeController.getGaugeWeightByAddress(bribe.epoch, bribe.gauge);
            require(bribe.totalVotes > 0, "No votes for gauge");
        }

        // Calculate user's share
        uint256 userShare = (bribe.amount * voteWeight) / bribe.totalVotes;
        require(userShare > 0, "Share is zero");

        // Mark as claimed
        hasClaimed[bribeId][tokenId] = true;

        // Transfer bribe
        IERC20(bribe.token).safeTransfer(msg.sender, userShare);

        emit BribeClaimed(bribeId, tokenId, msg.sender, userShare);
    }

    /**
     * @notice Update treasury address (owner only)
     * @param _treasury New treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
    }

    /**
     * @notice Get bribe information
     * @param bribeId Bribe ID
     * @return epoch Target epoch
     * @return gauge Target gauge
     * @return token Bribe token
     * @return amount Net bribe amount
     * @return creator Bribe creator
     * @return totalVotes Total votes for gauge
     */
    function getBribe(uint256 bribeId)
        external
        view
        returns (uint256 epoch, address gauge, address token, uint256 amount, address creator, uint256 totalVotes)
    {
        Bribe storage bribe = bribes[bribeId];
        return (bribe.epoch, bribe.gauge, bribe.token, bribe.amount, bribe.creator, bribe.totalVotes);
    }
}
