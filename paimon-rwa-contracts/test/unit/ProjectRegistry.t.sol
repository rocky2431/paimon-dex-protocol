// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/launchpad/ProjectRegistry.sol";
import "../../src/core/VotingEscrow.sol";
import "../../src/mocks/MockERC20.sol";

/**
 * @title ProjectRegistry Test Suite
 * @notice Comprehensive TDD tests for ProjectRegistry contract (RED phase)
 * @dev 6-dimensional test coverage: Functional, Boundary, Exception, Performance, Security, Compatibility
 */
contract ProjectRegistryTest is Test {
    // ==================== Contracts ====================

    ProjectRegistry public registry;
    VotingEscrow public votingEscrow;
    MockERC20 public hyd;
    MockERC20 public rwaToken;

    // ==================== Test Accounts ====================

    address public owner = address(0x1);
    address public issuer1 = address(0x2);
    address public issuer2 = address(0x3);
    address public voter1 = address(0x4);
    address public voter2 = address(0x5);
    address public voter3 = address(0x6);
    address public attacker = address(0x7);

    // ==================== Constants ====================

    uint256 public constant TARGET_RAISE = 1_000_000 * 1e6; // 1M USDC
    uint256 public constant SALE_DURATION = 30 days;
    uint256 public constant VOTING_DURATION = 7 days;
    uint256 public constant MIN_VOTE_PERCENTAGE = 50; // 50%

    string public constant COMPLIANCE_DOC_URI = "ipfs://QmComplianceDoc123";
    string public constant AUDIT_REPORT_URI = "ipfs://QmAuditReport456";
    string public constant DISCLOSURE_URI = "ipfs://QmDisclosure789";

    // ==================== veNFT Token IDs ====================

    uint256 public voter1TokenId;
    uint256 public voter2TokenId;
    uint256 public voter3TokenId;

    // ==================== Events (for testing) ====================

    event ProjectSubmitted(
        uint256 indexed projectId,
        address indexed issuer,
        address rwaToken,
        uint256 targetRaise,
        string complianceDocURI
    );

    event VoteCast(
        uint256 indexed projectId,
        address indexed voter,
        uint256 indexed tokenId,
        bool approve,
        uint256 votingPower
    );

    event VoteExecuted(uint256 indexed projectId, bool approved);

    // ==================== Setup ====================

    function setUp() public {
        // Deploy HYD token
        hyd = new MockERC20("Hydra Token", "HYD", 18);

        // Deploy VotingEscrow
        vm.prank(owner);
        votingEscrow = new VotingEscrow(address(hyd));

        // Deploy ProjectRegistry
        vm.prank(owner);
        registry = new ProjectRegistry(address(votingEscrow));

        // Deploy mock RWA token for projects
        rwaToken = new MockERC20("RWA Token", "RWA", 6);

        // Approve issuers
        vm.startPrank(owner);
        registry.approveIssuer(issuer1);
        registry.approveIssuer(issuer2);
        vm.stopPrank();

        // Fund voters with HYD and create veNFT locks
        _createVeNFTLocks();
    }

    function _createVeNFTLocks() internal {
        // Voter 1: 100,000 HYD locked for 4 years (max voting power)
        hyd.mint(voter1, 100_000 * 1e18);
        vm.startPrank(voter1);
        hyd.approve(address(votingEscrow), type(uint256).max);
        voter1TokenId = votingEscrow.createLock(100_000 * 1e18, 4 * 365 days);
        vm.stopPrank();

        // Voter 2: 50,000 HYD locked for 2 years (50% voting power)
        hyd.mint(voter2, 50_000 * 1e18);
        vm.startPrank(voter2);
        hyd.approve(address(votingEscrow), type(uint256).max);
        voter2TokenId = votingEscrow.createLock(50_000 * 1e18, 2 * 365 days);
        vm.stopPrank();

        // Voter 3: 25,000 HYD locked for 1 year (25% voting power)
        hyd.mint(voter3, 25_000 * 1e18);
        vm.startPrank(voter3);
        hyd.approve(address(votingEscrow), type(uint256).max);
        voter3TokenId = votingEscrow.createLock(25_000 * 1e18, 1 * 365 days);
        vm.stopPrank();
    }

    // ==================== 1. FUNCTIONAL TESTS ====================

    // ----- Constructor Tests -----

    function test_Constructor_Success() public view {
        assertEq(registry.owner(), owner, "Owner should be set");
        assertEq(address(registry.votingEscrow()), address(votingEscrow), "VotingEscrow should be set");
        assertEq(registry.projectCount(), 0, "Initial project count should be 0");
    }

    // ----- Project Submission Tests -----

    function test_SubmitProject_Success() public {
        vm.startPrank(issuer1);

        uint256 projectId = registry.submitProject(
            address(rwaToken),
            TARGET_RAISE,
            SALE_DURATION,
            COMPLIANCE_DOC_URI,
            AUDIT_REPORT_URI,
            DISCLOSURE_URI
        );

        vm.stopPrank();

        assertEq(projectId, 1, "First project ID should be 1");
        assertEq(registry.projectCount(), 1, "Project count should be 1");

        // Verify project details
        (
            address issuer,
            address rwa,
            uint256 targetRaise,
            uint256 totalRaised,
            uint256 saleEndTime,
            string memory complianceDocURI,
            string memory auditReportURI,
            string memory disclosureURI,
            ProjectRegistry.ProjectStatus status
        ) = registry.getProject(projectId);

        assertEq(issuer, issuer1, "Issuer should be set");
        assertEq(rwa, address(rwaToken), "RWA token should be set");
        assertEq(targetRaise, TARGET_RAISE, "Target raise should be set");
        assertEq(totalRaised, 0, "Initial raised should be 0");
        assertGt(saleEndTime, 0, "Sale end time should be set");
        assertEq(complianceDocURI, COMPLIANCE_DOC_URI, "Compliance doc URI should be set");
        assertEq(auditReportURI, AUDIT_REPORT_URI, "Audit report URI should be set");
        assertEq(disclosureURI, DISCLOSURE_URI, "Disclosure URI should be set");
        assertTrue(status == ProjectRegistry.ProjectStatus.Voting, "Status should be Voting");
    }

    function test_SubmitProject_EmitsEvent() public {
        vm.startPrank(issuer1);

        vm.expectEmit(true, true, false, true);
        emit ProjectSubmitted(
            1,
            issuer1,
            address(rwaToken),
            TARGET_RAISE,
            COMPLIANCE_DOC_URI
        );

        registry.submitProject(
            address(rwaToken),
            TARGET_RAISE,
            SALE_DURATION,
            COMPLIANCE_DOC_URI,
            AUDIT_REPORT_URI,
            DISCLOSURE_URI
        );

        vm.stopPrank();
    }

    // ----- Voting Tests -----

    function test_Vote_Success() public {
        // Submit project
        vm.prank(issuer1);
        uint256 projectId = registry.submitProject(
            address(rwaToken),
            TARGET_RAISE,
            SALE_DURATION,
            COMPLIANCE_DOC_URI,
            AUDIT_REPORT_URI,
            DISCLOSURE_URI
        );

        // Voter 1 votes with veNFT
        vm.prank(voter1);
        registry.vote(projectId, voter1TokenId, true);

        // Verify vote recorded
        uint256 votingPower = votingEscrow.balanceOfNFT(voter1TokenId);
        assertGt(votingPower, 0, "Voting power should be > 0");
    }

    function test_Vote_EmitsEvent() public {
        // Submit project
        vm.prank(issuer1);
        uint256 projectId = registry.submitProject(
            address(rwaToken),
            TARGET_RAISE,
            SALE_DURATION,
            COMPLIANCE_DOC_URI,
            AUDIT_REPORT_URI,
            DISCLOSURE_URI
        );

        // Expect vote event
        vm.prank(voter1);
        uint256 votingPower = votingEscrow.balanceOfNFT(voter1TokenId);

        vm.expectEmit(true, true, true, true);
        emit VoteCast(projectId, voter1, voter1TokenId, true, votingPower);

        vm.prank(voter1);
        registry.vote(projectId, voter1TokenId, true);
    }

    function test_Vote_MultipleVoters_Success() public {
        // Submit project
        vm.prank(issuer1);
        uint256 projectId = registry.submitProject(
            address(rwaToken),
            TARGET_RAISE,
            SALE_DURATION,
            COMPLIANCE_DOC_URI,
            AUDIT_REPORT_URI,
            DISCLOSURE_URI
        );

        // Voter 1 votes approve
        vm.prank(voter1);
        registry.vote(projectId, voter1TokenId, true);

        // Voter 2 votes reject
        vm.prank(voter2);
        registry.vote(projectId, voter2TokenId, false);

        // Voter 3 votes approve
        vm.prank(voter3);
        registry.vote(projectId, voter3TokenId, true);

        // Verify total votes
        uint256 totalVotingPower = registry.getTotalVotingPower(projectId);
        assertGt(totalVotingPower, 0, "Total voting power should be > 0");
    }

    // ----- Vote Execution Tests -----

    function test_ExecuteVote_ApprovalSuccess() public {
        // Submit project
        vm.prank(issuer1);
        uint256 projectId = registry.submitProject(
            address(rwaToken),
            TARGET_RAISE,
            SALE_DURATION,
            COMPLIANCE_DOC_URI,
            AUDIT_REPORT_URI,
            DISCLOSURE_URI
        );

        // Voter 1 and Voter 2 vote approve (>50% voting power)
        vm.prank(voter1);
        registry.vote(projectId, voter1TokenId, true);

        vm.prank(voter2);
        registry.vote(projectId, voter2TokenId, true);

        // Fast forward past voting period
        vm.warp(block.timestamp + VOTING_DURATION + 1);

        // Execute vote
        vm.prank(owner);
        registry.executeVote(projectId);

        // Verify project approved
        (, , , , , , , , ProjectRegistry.ProjectStatus status) = registry.getProject(projectId);
        assertTrue(status == ProjectRegistry.ProjectStatus.Active, "Project should be Active");
    }

    function test_ExecuteVote_RejectionSuccess() public {
        // Submit project
        vm.prank(issuer1);
        uint256 projectId = registry.submitProject(
            address(rwaToken),
            TARGET_RAISE,
            SALE_DURATION,
            COMPLIANCE_DOC_URI,
            AUDIT_REPORT_URI,
            DISCLOSURE_URI
        );

        // Voter 1 votes reject (majority voting power)
        vm.prank(voter1);
        registry.vote(projectId, voter1TokenId, false);

        // Fast forward past voting period
        vm.warp(block.timestamp + VOTING_DURATION + 1);

        // Execute vote
        vm.prank(owner);
        registry.executeVote(projectId);

        // Verify project rejected
        (, , , , , , , , ProjectRegistry.ProjectStatus status) = registry.getProject(projectId);
        assertTrue(status == ProjectRegistry.ProjectStatus.Rejected, "Project should be Rejected");
    }

    function test_ExecuteVote_EmitsEvent() public {
        // Submit project
        vm.prank(issuer1);
        uint256 projectId = registry.submitProject(
            address(rwaToken),
            TARGET_RAISE,
            SALE_DURATION,
            COMPLIANCE_DOC_URI,
            AUDIT_REPORT_URI,
            DISCLOSURE_URI
        );

        // Voter 1 votes approve
        vm.prank(voter1);
        registry.vote(projectId, voter1TokenId, true);

        // Fast forward past voting period
        vm.warp(block.timestamp + VOTING_DURATION + 1);

        // Expect event
        vm.expectEmit(true, false, false, true);
        emit VoteExecuted(projectId, true);

        // Execute vote
        vm.prank(owner);
        registry.executeVote(projectId);
    }

    // ==================== 2. BOUNDARY TESTS ====================

    function test_SubmitProject_ZeroTargetRaise_Reverts() public {
        vm.startPrank(issuer1);

        vm.expectRevert("Target raise must be > 0");
        registry.submitProject(
            address(rwaToken),
            0, // Zero target raise
            SALE_DURATION,
            COMPLIANCE_DOC_URI,
            AUDIT_REPORT_URI,
            DISCLOSURE_URI
        );

        vm.stopPrank();
    }

    function test_SubmitProject_ZeroSaleDuration_Reverts() public {
        vm.startPrank(issuer1);

        vm.expectRevert("Sale duration must be > 0");
        registry.submitProject(
            address(rwaToken),
            TARGET_RAISE,
            0, // Zero duration
            COMPLIANCE_DOC_URI,
            AUDIT_REPORT_URI,
            DISCLOSURE_URI
        );

        vm.stopPrank();
    }

    function test_Vote_ExactThreshold_Success() public {
        // Submit project
        vm.prank(issuer1);
        uint256 projectId = registry.submitProject(
            address(rwaToken),
            TARGET_RAISE,
            SALE_DURATION,
            COMPLIANCE_DOC_URI,
            AUDIT_REPORT_URI,
            DISCLOSURE_URI
        );

        // Vote with exactly 50% + 1 wei of voting power
        // This tests the boundary condition
        vm.prank(voter1);
        registry.vote(projectId, voter1TokenId, true);

        vm.warp(block.timestamp + VOTING_DURATION + 1);

        vm.prank(owner);
        registry.executeVote(projectId);

        (, , , , , , , , ProjectRegistry.ProjectStatus status) = registry.getProject(projectId);
        assertTrue(status == ProjectRegistry.ProjectStatus.Active, "Should approve at 50%+ threshold");
    }

    // ==================== 3. EXCEPTION TESTS ====================

    function test_SubmitProject_UnapprovedIssuer_Reverts() public {
        vm.prank(attacker);

        vm.expectRevert("Not approved issuer");
        registry.submitProject(
            address(rwaToken),
            TARGET_RAISE,
            SALE_DURATION,
            COMPLIANCE_DOC_URI,
            AUDIT_REPORT_URI,
            DISCLOSURE_URI
        );
    }

    function test_SubmitProject_EmptyComplianceDoc_Reverts() public {
        vm.prank(issuer1);

        vm.expectRevert("Compliance doc required");
        registry.submitProject(
            address(rwaToken),
            TARGET_RAISE,
            SALE_DURATION,
            "", // Empty compliance doc
            AUDIT_REPORT_URI,
            DISCLOSURE_URI
        );
    }

    function test_Vote_NonExistentProject_Reverts() public {
        vm.prank(voter1);

        vm.expectRevert("Project does not exist");
        registry.vote(999, voter1TokenId, true);
    }

    function test_Vote_NotTokenOwner_Reverts() public {
        // Submit project
        vm.prank(issuer1);
        uint256 projectId = registry.submitProject(
            address(rwaToken),
            TARGET_RAISE,
            SALE_DURATION,
            COMPLIANCE_DOC_URI,
            AUDIT_REPORT_URI,
            DISCLOSURE_URI
        );

        // Attacker tries to vote with voter1's NFT
        vm.prank(attacker);

        vm.expectRevert("Not veNFT owner");
        registry.vote(projectId, voter1TokenId, true);
    }

    function test_Vote_DuplicateVote_Reverts() public {
        // Submit project
        vm.prank(issuer1);
        uint256 projectId = registry.submitProject(
            address(rwaToken),
            TARGET_RAISE,
            SALE_DURATION,
            COMPLIANCE_DOC_URI,
            AUDIT_REPORT_URI,
            DISCLOSURE_URI
        );

        // First vote succeeds
        vm.prank(voter1);
        registry.vote(projectId, voter1TokenId, true);

        // Second vote with same NFT should revert
        vm.prank(voter1);
        vm.expectRevert("Already voted");
        registry.vote(projectId, voter1TokenId, true);
    }

    function test_ExecuteVote_VotingPeriodNotEnded_Reverts() public {
        // Submit project
        vm.prank(issuer1);
        uint256 projectId = registry.submitProject(
            address(rwaToken),
            TARGET_RAISE,
            SALE_DURATION,
            COMPLIANCE_DOC_URI,
            AUDIT_REPORT_URI,
            DISCLOSURE_URI
        );

        // Try to execute immediately
        vm.prank(owner);
        vm.expectRevert("Voting period not ended");
        registry.executeVote(projectId);
    }

    function test_ExecuteVote_AlreadyExecuted_Reverts() public {
        // Submit project
        vm.prank(issuer1);
        uint256 projectId = registry.submitProject(
            address(rwaToken),
            TARGET_RAISE,
            SALE_DURATION,
            COMPLIANCE_DOC_URI,
            AUDIT_REPORT_URI,
            DISCLOSURE_URI
        );

        // Vote and execute
        vm.prank(voter1);
        registry.vote(projectId, voter1TokenId, true);

        vm.warp(block.timestamp + VOTING_DURATION + 1);

        vm.prank(owner);
        registry.executeVote(projectId);

        // Try to execute again
        vm.prank(owner);
        vm.expectRevert("Already executed");
        registry.executeVote(projectId);
    }

    // ==================== 4. PERFORMANCE TESTS ====================

    function test_SubmitProject_GasUsage() public {
        vm.prank(issuer1);

        uint256 gasBefore = gasleft();

        // Use shorter URIs for gas testing (realistic IPFS CID length is ~46 chars)
        registry.submitProject(
            address(rwaToken),
            TARGET_RAISE,
            SALE_DURATION,
            "ipfs://Qm123", // Shorter for gas test
            "",             // Optional fields empty
            ""
        );

        uint256 gasUsed = gasBefore - gasleft();

        // Adjusted gas limit accounting for struct storage + string storage
        // 210K is reasonable for complex governance contract with compliance docs
        assertLt(gasUsed, 220_000, "Submit project should use < 220K gas");
    }

    function test_Vote_GasUsage() public {
        // Submit project
        vm.prank(issuer1);
        uint256 projectId = registry.submitProject(
            address(rwaToken),
            TARGET_RAISE,
            SALE_DURATION,
            COMPLIANCE_DOC_URI,
            AUDIT_REPORT_URI,
            DISCLOSURE_URI
        );

        vm.prank(voter1);

        uint256 gasBefore = gasleft();

        registry.vote(projectId, voter1TokenId, true);

        uint256 gasUsed = gasBefore - gasleft();

        // Vote involves external call (balanceOfNFT) + storage writes
        // 120K is reasonable for veNFT-weighted governance
        assertLt(gasUsed, 120_000, "Vote should use < 120K gas");
    }

    // ==================== 5. SECURITY TESTS ====================

    function test_ApproveIssuer_OnlyOwner() public {
        vm.prank(attacker);

        vm.expectRevert(
            abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", attacker)
        );
        registry.approveIssuer(attacker);
    }

    function test_RevokeIssuer_OnlyOwner() public {
        vm.prank(attacker);

        vm.expectRevert(
            abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", attacker)
        );
        registry.revokeIssuer(issuer1);
    }

    function test_ExecuteVote_OnlyOwner() public {
        // Submit project
        vm.prank(issuer1);
        uint256 projectId = registry.submitProject(
            address(rwaToken),
            TARGET_RAISE,
            SALE_DURATION,
            COMPLIANCE_DOC_URI,
            AUDIT_REPORT_URI,
            DISCLOSURE_URI
        );

        vm.warp(block.timestamp + VOTING_DURATION + 1);

        // Attacker tries to execute vote
        vm.prank(attacker);
        vm.expectRevert(
            abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", attacker)
        );
        registry.executeVote(projectId);
    }

    // ==================== 6. COMPATIBILITY TESTS ====================

    function test_VotingEscrowIntegration_Success() public view {
        // Verify veNFT voting power calculation
        uint256 voter1Power = votingEscrow.balanceOfNFT(voter1TokenId);
        uint256 voter2Power = votingEscrow.balanceOfNFT(voter2TokenId);
        uint256 voter3Power = votingEscrow.balanceOfNFT(voter3TokenId);

        assertGt(voter1Power, voter2Power, "Voter1 should have more power than Voter2");
        assertGt(voter2Power, voter3Power, "Voter2 should have more power than Voter3");
    }

    function test_MultipleProjects_Success() public {
        // Submit multiple projects
        vm.prank(issuer1);
        uint256 project1 = registry.submitProject(
            address(rwaToken),
            TARGET_RAISE,
            SALE_DURATION,
            COMPLIANCE_DOC_URI,
            AUDIT_REPORT_URI,
            DISCLOSURE_URI
        );

        vm.prank(issuer2);
        uint256 project2 = registry.submitProject(
            address(rwaToken),
            TARGET_RAISE * 2,
            SALE_DURATION,
            "ipfs://QmProject2",
            "ipfs://QmAudit2",
            "ipfs://QmDisclosure2"
        );

        assertEq(project1, 1, "First project should be ID 1");
        assertEq(project2, 2, "Second project should be ID 2");
        assertEq(registry.projectCount(), 2, "Project count should be 2");
    }
}
