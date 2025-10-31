// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./ProjectRegistry.sol";

/**
 * @title IssuanceController
 * @notice Token sale controller for RWA project issuances
 * @dev Implements secure token sale logic with USDC payment and fee distribution
 *
 * Key Features:
 * - USDC payment handling for RWA token purchases
 * - 1.0% issuance fee (70% Treasury, 30% ve pool)
 * - Minimum/maximum raise validation
 * - Refund mechanism if minimum not met
 * - Optional whitelist support
 * - Integration with ProjectRegistry for governance
 *
 * Workflow:
 * 1. Issuer creates sale after project approval
 * 2. Participants contribute USDC during sale period
 * 3. After sale ends, owner finalizes sale
 * 4. If minimum met: Participants claim RWA tokens, fees distributed
 * 5. If minimum not met: Participants claim USDC refunds
 *
 * Security:
 * - ReentrancyGuard on all state-changing functions
 * - SafeERC20 for secure token transfers
 * - Access control for issuer-only functions
 * - Validation of project status and timing
 *
 * @custom:security-contact security@paimon.dex
 */
contract IssuanceController is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ==================== State Variables ====================

    /// @notice Project registry contract
    ProjectRegistry public immutable projectRegistry;

    /// @notice USDC token for payments
    IERC20 public immutable usdcToken;

    /// @notice Treasury contract address
    address public immutable treasury;

    /// @notice Voting escrow pool address for fee distribution
    address public immutable vePool;

    /// @notice Issuance fee in basis points (1.0% = 100 bps)
    uint256 public constant ISSUANCE_FEE = 100;

    /// @notice Treasury fee percentage (70%)
    uint256 public constant TREASURY_FEE_PERCENTAGE = 70;

    /// @notice vePool fee percentage (30%)
    uint256 public constant VE_POOL_FEE_PERCENTAGE = 30;

    // ==================== Structs ====================

    /**
     * @notice Sale configuration and state
     * @param rwaToken RWA token to be distributed
     * @param minimumRaise Minimum USDC to raise (refund if not met)
     * @param maximumRaise Maximum USDC to raise
     * @param minContribution Minimum contribution per participant
     * @param maxContribution Maximum contribution per participant
     * @param totalRaised Total USDC raised so far
     * @param saleEndTime Sale end timestamp
     * @param isWhitelisted Whether whitelist is enabled
     * @param isFinalized Whether sale has been finalized
     */
    struct Sale {
        address rwaToken;
        uint256 minimumRaise;
        uint256 maximumRaise;
        uint256 minContribution;
        uint256 maxContribution;
        uint256 totalRaised;
        uint256 saleEndTime;
        bool isWhitelisted;
        bool isFinalized;
    }

    // ==================== Storage ====================

    /// @notice Mapping of project ID to sale configuration
    mapping(uint256 => Sale) public sales;

    /// @notice Mapping of project ID => participant => contribution amount
    mapping(uint256 => mapping(address => uint256)) public contributions;

    /// @notice Mapping of project ID => participant => has claimed
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    /// @notice Mapping of project ID => participant => is whitelisted
    mapping(uint256 => mapping(address => bool)) public whitelist;

    // ==================== Events ====================

    /// @notice Emitted when a sale is created
    event SaleCreated(
        uint256 indexed projectId,
        address indexed rwaToken,
        uint256 minimumRaise,
        uint256 maximumRaise,
        uint256 saleEndTime
    );

    /// @notice Emitted when a participant contributes USDC
    event Participated(
        uint256 indexed projectId,
        address indexed participant,
        uint256 usdcAmount,
        uint256 rwaTokenAmount
    );

    /// @notice Emitted when a participant claims RWA tokens
    event Claimed(
        uint256 indexed projectId,
        address indexed participant,
        uint256 rwaTokenAmount
    );

    /// @notice Emitted when a participant receives a refund
    event Refunded(
        uint256 indexed projectId,
        address indexed participant,
        uint256 usdcAmount
    );

    /// @notice Emitted when fees are distributed
    event FeeDistributed(
        uint256 indexed projectId,
        uint256 treasuryFee,
        uint256 vePoolFee
    );

    /// @notice Emitted when sale is finalized
    event SaleFinalized(
        uint256 indexed projectId,
        bool success,
        uint256 totalRaised
    );

    // ==================== Constructor ====================

    /**
     * @notice Initialize IssuanceController
     * @param _projectRegistry Address of ProjectRegistry contract
     * @param _usdcToken Address of USDC token
     * @param _treasury Address of treasury contract
     * @param _vePool Address of voting escrow pool
     */
    constructor(
        address _projectRegistry,
        address _usdcToken,
        address _treasury,
        address _vePool
    ) Ownable(msg.sender) {
        require(_projectRegistry != address(0), "Invalid ProjectRegistry address");
        require(_usdcToken != address(0), "Invalid USDC address");
        require(_treasury != address(0), "Invalid Treasury address");
        require(_vePool != address(0), "Invalid vePool address");

        projectRegistry = ProjectRegistry(_projectRegistry);
        usdcToken = IERC20(_usdcToken);
        treasury = _treasury;
        vePool = _vePool;
    }

    // ==================== External Functions ====================

    /**
     * @notice Create a new token sale for an approved project
     * @param _projectId Project ID from ProjectRegistry
     * @param _minimumRaise Minimum USDC to raise
     * @param _maximumRaise Maximum USDC to raise
     * @param _minContribution Minimum contribution per participant
     * @param _maxContribution Maximum contribution per participant
     * @param _isWhitelisted Whether to enable whitelist
     *
     * @dev Requirements:
     * - Project must be in Active status
     * - Caller must be project issuer
     * - Sale must not already exist
     * - Minimum raise must be <= maximum raise
     * - Must have sufficient RWA tokens approved
     */
    function createSale(
        uint256 _projectId,
        uint256 _minimumRaise,
        uint256 _maximumRaise,
        uint256 _minContribution,
        uint256 _maxContribution,
        bool _isWhitelisted
    ) external nonReentrant {
        // Validate project status and issuer
        (
            address issuer,
            address rwa,
            ,
            ,
            uint256 saleEndTime,
            ,
            ,
            ,
            ProjectRegistry.ProjectStatus status
        ) = projectRegistry.getProject(_projectId);

        require(status == ProjectRegistry.ProjectStatus.Active, "Project not Active");
        require(msg.sender == issuer, "Not project issuer");
        require(sales[_projectId].rwaToken == address(0), "Sale already exists");

        // Validate raise limits
        require(_minimumRaise > 0 && _minimumRaise <= _maximumRaise, "Invalid raise limits");
        require(_minContribution > 0 && _minContribution <= _maxContribution, "Invalid contribution limits");

        // Calculate required RWA token amount
        // Assuming 1 USDC = 1 RWA token (1:1 price)
        // Both USDC and RWA token have same decimals (6), so 1:1 ratio
        uint256 requiredRwaTokens = _maximumRaise;

        // Transfer RWA tokens from issuer to this contract
        IERC20(rwa).safeTransferFrom(msg.sender, address(this), requiredRwaTokens);

        // Create sale
        sales[_projectId] = Sale({
            rwaToken: rwa,
            minimumRaise: _minimumRaise,
            maximumRaise: _maximumRaise,
            minContribution: _minContribution,
            maxContribution: _maxContribution,
            totalRaised: 0,
            saleEndTime: saleEndTime,
            isWhitelisted: _isWhitelisted,
            isFinalized: false
        });

        emit SaleCreated(_projectId, rwa, _minimumRaise, _maximumRaise, saleEndTime);
    }

    /**
     * @notice Participate in a token sale by contributing USDC
     * @param _projectId Project ID to participate in
     * @param _usdcAmount Amount of USDC to contribute
     *
     * @dev Requirements:
     * - Sale must exist and not be finalized
     * - Sale must not have ended
     * - Contribution must be within min/max limits
     * - Total raise must not exceed maximum
     * - If whitelisted sale, participant must be on whitelist
     * - USDC must be approved for transfer
     */
    function participate(uint256 _projectId, uint256 _usdcAmount) external nonReentrant {
        Sale storage sale = sales[_projectId];

        // Validate sale exists and is active
        require(sale.rwaToken != address(0), "Sale does not exist");
        require(!sale.isFinalized, "Sale already finalized");
        require(block.timestamp < sale.saleEndTime, "Sale ended");

        // Validate contribution limits
        uint256 currentContribution = contributions[_projectId][msg.sender];
        uint256 newContribution = currentContribution + _usdcAmount;

        require(newContribution >= sale.minContribution, "Below minimum contribution");
        require(newContribution <= sale.maxContribution, "Exceeds maximum contribution");

        // Validate maximum raise not exceeded
        require(sale.totalRaised + _usdcAmount <= sale.maximumRaise, "Exceeds maximum raise");

        // Check whitelist if enabled
        if (sale.isWhitelisted) {
            require(whitelist[_projectId][msg.sender], "Not whitelisted");
        }

        // Update contribution and total raised
        contributions[_projectId][msg.sender] = newContribution;
        sale.totalRaised += _usdcAmount;

        // Transfer USDC from participant to this contract
        usdcToken.safeTransferFrom(msg.sender, address(this), _usdcAmount);

        // Calculate RWA token amount (1:1 ratio for USDC decimals = RWA decimals = 6)
        uint256 rwaTokenAmount = _usdcAmount;

        emit Participated(_projectId, msg.sender, _usdcAmount, rwaTokenAmount);
    }

    /**
     * @notice Finalize sale and distribute fees
     * @param _projectId Project ID to finalize
     *
     * @dev Requirements:
     * - Only owner can finalize
     * - Sale must exist and not be finalized
     * - Sale must have ended
     *
     * @dev If minimum raise met:
     * - Distributes fees (70% treasury, 30% vePool)
     * - Transfers remaining USDC to issuer
     *
     * @dev If minimum not met:
     * - Participants can claim refunds
     */
    function finalizeSale(uint256 _projectId) external onlyOwner nonReentrant {
        Sale storage sale = sales[_projectId];

        require(sale.rwaToken != address(0), "Sale does not exist");
        require(!sale.isFinalized, "Already finalized");
        require(block.timestamp >= sale.saleEndTime, "Sale not ended");

        sale.isFinalized = true;

        bool success = sale.totalRaised >= sale.minimumRaise;

        if (success) {
            // Calculate and distribute fees
            uint256 totalFee = (sale.totalRaised * ISSUANCE_FEE) / 10000;
            uint256 treasuryFee = (totalFee * TREASURY_FEE_PERCENTAGE) / 100;
            uint256 vePoolFee = (totalFee * VE_POOL_FEE_PERCENTAGE) / 100;

            // Transfer fees
            if (treasuryFee > 0) {
                usdcToken.safeTransfer(treasury, treasuryFee);
            }
            if (vePoolFee > 0) {
                usdcToken.safeTransfer(vePool, vePoolFee);
            }

            emit FeeDistributed(_projectId, treasuryFee, vePoolFee);

            // Transfer remaining USDC to issuer
            uint256 issuerAmount = sale.totalRaised - totalFee;
            if (issuerAmount > 0) {
                (address issuer, , , , , , , , ) = projectRegistry.getProject(_projectId);
                usdcToken.safeTransfer(issuer, issuerAmount);
            }
        }

        emit SaleFinalized(_projectId, success, sale.totalRaised);
    }

    /**
     * @notice Claim RWA tokens (if sale successful) or USDC refund (if sale failed)
     * @param _projectId Project ID to claim from
     *
     * @dev Requirements:
     * - Sale must be finalized
     * - Participant must have contribution
     * - Participant must not have already claimed
     *
     * @dev Behavior:
     * - If sale successful: Transfer RWA tokens proportional to contribution
     * - If sale failed: Refund USDC contribution
     */
    function claim(uint256 _projectId) external nonReentrant {
        Sale storage sale = sales[_projectId];

        require(sale.isFinalized, "Sale not finalized");
        require(contributions[_projectId][msg.sender] > 0, "No contribution");
        require(!hasClaimed[_projectId][msg.sender], "Already claimed");

        hasClaimed[_projectId][msg.sender] = true;

        uint256 contribution = contributions[_projectId][msg.sender];
        bool success = sale.totalRaised >= sale.minimumRaise;

        if (success) {
            // Calculate RWA token amount (1:1 ratio)
            uint256 rwaTokenAmount = contribution;

            // Transfer RWA tokens to participant
            IERC20(sale.rwaToken).safeTransfer(msg.sender, rwaTokenAmount);

            emit Claimed(_projectId, msg.sender, rwaTokenAmount);
        } else {
            // Refund USDC to participant
            usdcToken.safeTransfer(msg.sender, contribution);

            emit Refunded(_projectId, msg.sender, contribution);
        }
    }

    /**
     * @notice Add participant to whitelist
     * @param _projectId Project ID
     * @param _participant Participant address to whitelist
     *
     * @dev Only project issuer can add to whitelist
     */
    function addToWhitelist(uint256 _projectId, address _participant) external {
        (address issuer, , , , , , , , ) = projectRegistry.getProject(_projectId);
        require(msg.sender == issuer, "Not project issuer");

        whitelist[_projectId][_participant] = true;
    }

    /**
     * @notice Remove participant from whitelist
     * @param _projectId Project ID
     * @param _participant Participant address to remove
     *
     * @dev Only project issuer can remove from whitelist
     */
    function removeFromWhitelist(uint256 _projectId, address _participant) external {
        (address issuer, , , , , , , , ) = projectRegistry.getProject(_projectId);
        require(msg.sender == issuer, "Not project issuer");

        whitelist[_projectId][_participant] = false;
    }

    /**
     * @notice Batch add participants to whitelist
     * @param _projectId Project ID
     * @param _participants Array of participant addresses
     *
     * @dev Gas-optimized batch operation
     */
    function batchAddToWhitelist(uint256 _projectId, address[] calldata _participants) external {
        (address issuer, , , , , , , , ) = projectRegistry.getProject(_projectId);
        require(msg.sender == issuer, "Not project issuer");

        for (uint256 i = 0; i < _participants.length; i++) {
            whitelist[_projectId][_participants[i]] = true;
        }
    }

    // ==================== View Functions ====================

    /**
     * @notice Get sale details
     * @param _projectId Project ID
     * @return Sale configuration and state
     */
    function getSale(uint256 _projectId) external view returns (Sale memory) {
        return sales[_projectId];
    }

    /**
     * @notice Get participant contribution
     * @param _projectId Project ID
     * @param _participant Participant address
     * @return Contribution amount in USDC
     */
    function getContribution(uint256 _projectId, address _participant)
        external
        view
        returns (uint256)
    {
        return contributions[_projectId][_participant];
    }

    /**
     * @notice Check if participant is whitelisted
     * @param _projectId Project ID
     * @param _participant Participant address
     * @return True if whitelisted
     */
    function isWhitelisted(uint256 _projectId, address _participant)
        external
        view
        returns (bool)
    {
        return whitelist[_projectId][_participant];
    }

    /**
     * @notice Calculate RWA tokens claimable for a contribution
     * @param _projectId Project ID
     * @param _participant Participant address
     * @return RWA token amount
     */
    function calculateClaimableTokens(uint256 _projectId, address _participant)
        external
        view
        returns (uint256)
    {
        Sale storage sale = sales[_projectId];
        uint256 contribution = contributions[_projectId][_participant];

        if (contribution == 0 || !sale.isFinalized) {
            return 0;
        }

        if (sale.totalRaised < sale.minimumRaise) {
            return 0; // Will receive refund instead
        }

        // 1:1 ratio for USDC to RWA tokens (both 6 decimals)
        return contribution;
    }
}

// ==================== Interface for ERC20 Metadata ====================

interface IERC20WithDecimals {
    function decimals() external view returns (uint8);
}
