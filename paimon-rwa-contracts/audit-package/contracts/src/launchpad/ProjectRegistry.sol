// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../core/VotingEscrow.sol";

/**
 * @title ProjectRegistry
 * @notice RWA Project Registry for asset issuance platform (Launchpad)
 * @dev Implements veNFT-weighted governance voting for project approval
 *
 * Key Features:
 * - Project submission with compliance documents (IPFS/HTTP links)
 * - veNFT governance voting (voting power = balanceOfNFT)
 * - 50%+ approval threshold for project activation
 * - 7-day voting period
 * - Access control for approved issuers only
 *
 * Workflow:
 * 1. Owner approves issuer addresses
 * 2. Issuer submits project with compliance docs → Voting status
 * 3. veNFT holders vote (approve/reject) during 7-day period
 * 4. After period: Execute vote → Active (if >50%) or Rejected
 * 5. Active projects can proceed with token sale
 *
 * Compliance Documents:
 * - complianceDocURI: Offering memorandum (required)
 * - auditReportURI: Asset audit report (optional)
 * - disclosureURI: Risk disclosure (optional)
 *
 * Gas Optimization:
 * - Storage packing where possible
 * - Minimal external calls during voting
 * - Event-based state tracking
 */
contract ProjectRegistry is Ownable, ReentrancyGuard {
    // ==================== State Variables ====================

    /// @notice VotingEscrow contract for governance
    VotingEscrow public immutable votingEscrow;

    /// @notice Total number of projects submitted
    uint256 public projectCount;

    /// @notice Voting period duration (7 days)
    uint256 public constant VOTING_PERIOD = 7 days;

    /// @notice Approval threshold (50%)
    uint256 public constant APPROVAL_THRESHOLD = 50;

    /// @notice Project status enum
    enum ProjectStatus {
        Voting,     // Initial state, voting in progress
        Active,     // Approved, sale can proceed
        Rejected,   // Rejected by governance
        Completed   // Sale completed
    }

    /// @notice Project structure with compliance document links
    struct Project {
        address issuer;                 // Project issuer address
        address rwaToken;               // RWA token address
        uint256 targetRaise;            // Target raise amount (USDC)
        uint256 totalRaised;            // Current raised amount
        uint256 votingEndTime;          // Voting period end timestamp
        uint256 saleEndTime;            // Sale end timestamp (after approval)
        string complianceDocURI;        // Offering memorandum (IPFS/HTTP)
        string auditReportURI;          // Asset audit report (IPFS/HTTP)
        string disclosureURI;           // Risk disclosure (IPFS/HTTP)
        ProjectStatus status;           // Current project status
        uint256 approveVotes;           // Total approve voting power
        uint256 rejectVotes;            // Total reject voting power
    }

    /// @notice Mapping of project ID to Project struct
    mapping(uint256 => Project) public projects;

    /// @notice Mapping of approved issuer addresses
    mapping(address => bool) public approvedIssuers;

    /// @notice Mapping of vote records: projectId => veNFT tokenId => hasVoted
    mapping(uint256 => mapping(uint256 => bool)) public hasVoted;

    /// @notice Mapping of veNFT owner to prevent transfer during voting
    mapping(uint256 => mapping(uint256 => address)) public voteNFTOwner;

    // ==================== Events ====================

    /// @notice Emitted when a project is submitted
    event ProjectSubmitted(
        uint256 indexed projectId,
        address indexed issuer,
        address rwaToken,
        uint256 targetRaise,
        string complianceDocURI
    );

    /// @notice Emitted when a vote is cast
    event VoteCast(
        uint256 indexed projectId,
        address indexed voter,
        uint256 indexed tokenId,
        bool approve,
        uint256 votingPower
    );

    /// @notice Emitted when vote is executed
    event VoteExecuted(uint256 indexed projectId, bool approved);

    /// @notice Emitted when issuer is approved
    event IssuerApproved(address indexed issuer);

    /// @notice Emitted when issuer is revoked
    event IssuerRevoked(address indexed issuer);

    // ==================== Constructor ====================

    /**
     * @notice Initialize ProjectRegistry with VotingEscrow address
     * @param _votingEscrow Address of VotingEscrow contract
     */
    constructor(address _votingEscrow) Ownable(msg.sender) {
        require(_votingEscrow != address(0), "Invalid VotingEscrow address");
        votingEscrow = VotingEscrow(_votingEscrow);
    }

    // ==================== External Functions ====================

    /**
     * @notice Submit a new RWA project for governance approval
     * @param _rwaToken RWA token address
     * @param _targetRaise Target raise amount (USDC)
     * @param _saleDuration Sale duration after approval (seconds)
     * @param _complianceDocURI Offering memorandum URI (IPFS/HTTP)
     * @param _auditReportURI Asset audit report URI (optional)
     * @param _disclosureURI Risk disclosure URI (optional)
     * @return projectId Newly created project ID
     */
    function submitProject(
        address _rwaToken,
        uint256 _targetRaise,
        uint256 _saleDuration,
        string memory _complianceDocURI,
        string memory _auditReportURI,
        string memory _disclosureURI
    ) external nonReentrant returns (uint256 projectId) {
        require(approvedIssuers[msg.sender], "Not approved issuer");
        require(_rwaToken != address(0), "Invalid RWA token address");
        require(_targetRaise > 0, "Target raise must be > 0");
        require(_saleDuration > 0, "Sale duration must be > 0");
        require(bytes(_complianceDocURI).length > 0, "Compliance doc required");

        projectCount++;
        projectId = projectCount;

        projects[projectId] = Project({
            issuer: msg.sender,
            rwaToken: _rwaToken,
            targetRaise: _targetRaise,
            totalRaised: 0,
            votingEndTime: block.timestamp + VOTING_PERIOD,
            saleEndTime: block.timestamp + VOTING_PERIOD + _saleDuration,
            complianceDocURI: _complianceDocURI,
            auditReportURI: _auditReportURI,
            disclosureURI: _disclosureURI,
            status: ProjectStatus.Voting,
            approveVotes: 0,
            rejectVotes: 0
        });

        emit ProjectSubmitted(
            projectId,
            msg.sender,
            _rwaToken,
            _targetRaise,
            _complianceDocURI
        );
    }

    /**
     * @notice Cast a vote on a project using veNFT
     * @param _projectId Project ID to vote on
     * @param _tokenId veNFT token ID
     * @param _approve True to approve, false to reject
     */
    function vote(
        uint256 _projectId,
        uint256 _tokenId,
        bool _approve
    ) external nonReentrant {
        require(_projectId > 0 && _projectId <= projectCount, "Project does not exist");
        require(votingEscrow.ownerOf(_tokenId) == msg.sender, "Not veNFT owner");
        require(!hasVoted[_projectId][_tokenId], "Already voted");

        Project storage project = projects[_projectId];
        require(project.status == ProjectStatus.Voting, "Not in voting period");
        require(block.timestamp < project.votingEndTime, "Voting period ended");

        // Get voting power from veNFT
        uint256 votingPower = votingEscrow.balanceOfNFT(_tokenId);
        require(votingPower > 0, "No voting power");

        // Record vote
        hasVoted[_projectId][_tokenId] = true;
        voteNFTOwner[_projectId][_tokenId] = msg.sender;

        // Update vote tallies
        if (_approve) {
            project.approveVotes += votingPower;
        } else {
            project.rejectVotes += votingPower;
        }

        emit VoteCast(_projectId, msg.sender, _tokenId, _approve, votingPower);
    }

    /**
     * @notice Execute vote after voting period ends
     * @param _projectId Project ID to execute vote for
     * @dev Only callable by owner after voting period ends
     */
    function executeVote(uint256 _projectId) external onlyOwner nonReentrant {
        require(_projectId > 0 && _projectId <= projectCount, "Project does not exist");

        Project storage project = projects[_projectId];
        require(project.status == ProjectStatus.Voting, "Already executed");
        require(block.timestamp >= project.votingEndTime, "Voting period not ended");

        // Calculate approval percentage
        uint256 totalVotes = project.approveVotes + project.rejectVotes;
        bool approved = false;

        if (totalVotes > 0) {
            uint256 approvalPercentage = (project.approveVotes * 100) / totalVotes;
            approved = approvalPercentage > APPROVAL_THRESHOLD;
        }

        // Update project status
        project.status = approved ? ProjectStatus.Active : ProjectStatus.Rejected;

        emit VoteExecuted(_projectId, approved);
    }

    /**
     * @notice Approve an issuer address
     * @param _issuer Address to approve
     */
    function approveIssuer(address _issuer) external onlyOwner {
        require(_issuer != address(0), "Invalid issuer address");
        require(!approvedIssuers[_issuer], "Already approved");

        approvedIssuers[_issuer] = true;

        emit IssuerApproved(_issuer);
    }

    /**
     * @notice Revoke an issuer address
     * @param _issuer Address to revoke
     */
    function revokeIssuer(address _issuer) external onlyOwner {
        require(approvedIssuers[_issuer], "Not approved");

        approvedIssuers[_issuer] = false;

        emit IssuerRevoked(_issuer);
    }

    // ==================== View Functions ====================

    /**
     * @notice Get total voting power for a project
     * @param _projectId Project ID
     * @return Total voting power (approve + reject)
     */
    function getTotalVotingPower(uint256 _projectId) external view returns (uint256) {
        require(_projectId > 0 && _projectId <= projectCount, "Project does not exist");

        Project storage project = projects[_projectId];
        return project.approveVotes + project.rejectVotes;
    }

    /**
     * @notice Get project details
     * @param _projectId Project ID
     * @return issuer Project issuer address
     * @return rwaToken RWA token address
     * @return targetRaise Target raise amount
     * @return totalRaised Current raised amount
     * @return saleEndTime Sale end timestamp
     * @return complianceDocURI Compliance document URI
     * @return auditReportURI Audit report URI
     * @return disclosureURI Disclosure URI
     * @return status Project status
     */
    function getProject(uint256 _projectId)
        external
        view
        returns (
            address issuer,
            address rwaToken,
            uint256 targetRaise,
            uint256 totalRaised,
            uint256 saleEndTime,
            string memory complianceDocURI,
            string memory auditReportURI,
            string memory disclosureURI,
            ProjectStatus status
        )
    {
        require(_projectId > 0 && _projectId <= projectCount, "Project does not exist");

        Project storage project = projects[_projectId];

        return (
            project.issuer,
            project.rwaToken,
            project.targetRaise,
            project.totalRaised,
            project.saleEndTime,
            project.complianceDocURI,
            project.auditReportURI,
            project.disclosureURI,
            project.status
        );
    }

    /**
     * @notice Check if a veNFT has voted on a project
     * @param _projectId Project ID
     * @param _tokenId veNFT token ID
     * @return True if already voted, false otherwise
     */
    function hasVotedOnProject(uint256 _projectId, uint256 _tokenId)
        external
        view
        returns (bool)
    {
        return hasVoted[_projectId][_tokenId];
    }
}
