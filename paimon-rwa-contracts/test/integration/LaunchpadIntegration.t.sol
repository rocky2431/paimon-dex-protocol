// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/launchpad/ProjectRegistry.sol";
import "../../src/launchpad/IssuanceController.sol";
import "../../src/core/VotingEscrow.sol";
import "../../src/treasury/Treasury.sol";
import "../../src/mocks/MockERC20.sol";

/**
 * @title Launchpad Integration Test Suite
 * @notice End-to-end integration tests for ProjectRegistry + IssuanceController
 * @dev Tests the complete Launchpad workflow
 *
 * Task: RWA-006 (Launchpad Testing & Integration)
 * Priority: P0
 */
contract LaunchpadIntegrationTest is Test {
    // Contracts
    ProjectRegistry public registry;
    IssuanceController public controller;
    VotingEscrow public votingEscrow;
    Treasury public treasury;
    MockERC20 public hyd;
    MockERC20 public usdc;
    MockERC20 public rwaToken;

    // Test accounts
    address public owner = address(0x1);
    address public issuer = address(0x2);
    address public voter1 = address(0x3);
    address public voter2 = address(0x4);
    address public participant1 = address(0x5);
    address public vePool = address(0x7);

    // Constants
    uint256 public constant TARGET_RAISE = 1_000_000 * 1e6;
    uint256 public constant MINIMUM_RAISE = 500_000 * 1e6;
    uint256 public constant SALE_DURATION = 30 days;
    uint256 public constant MIN_CONTRIBUTION = 100 * 1e6;
    uint256 public constant MAX_CONTRIBUTION = 50_000 * 1e6;

    string public constant COMPLIANCE_DOC_URI = "ipfs://QmComplianceDoc123";
    string public constant AUDIT_REPORT_URI = "ipfs://QmAuditReport456";
    string public constant DISCLOSURE_URI = "ipfs://QmDisclosure789";

    // Test variables
    uint256 public projectId;
    uint256 public voter1TokenId;
    uint256 public voter2TokenId;

    function setUp() public {
        // Deploy tokens
        hyd = new MockERC20("Hydra Token", "HYD", 18);
        usdc = new MockERC20("USD Coin", "USDC", 6);
        rwaToken = new MockERC20("RWA Token", "RWA", 6);

        // Deploy VotingEscrow
        vm.prank(owner);
        votingEscrow = new VotingEscrow(address(hyd));

        // Deploy Treasury
        vm.prank(owner);
        treasury = new Treasury(owner, address(usdc));

        // Deploy ProjectRegistry
        vm.prank(owner);
        registry = new ProjectRegistry(address(votingEscrow));

        // Deploy IssuanceController
        vm.prank(owner);
        controller = new IssuanceController(
            address(registry),
            address(usdc),
            address(treasury),
            vePool
        );

        // Approve issuer
        vm.prank(owner);
        registry.approveIssuer(issuer);

        // Setup voters with veNFT locks
        _createVeNFTLocks();

        // Fund participants
        usdc.mint(participant1, 100_000 * 1e6);

        // Mint RWA tokens to issuer
        rwaToken.mint(issuer, 2_000_000 * 1e6);
    }

    function _createVeNFTLocks() internal {
        // Voter 1: 4 years lock (max)
        hyd.mint(voter1, 100_000 * 1e18);
        vm.startPrank(voter1);
        hyd.approve(address(votingEscrow), type(uint256).max);
        voter1TokenId = votingEscrow.createLock(100_000 * 1e18, 4 * 365 days);
        vm.stopPrank();

        // Voter 2: 2 years lock
        hyd.mint(voter2, 50_000 * 1e18);
        vm.startPrank(voter2);
        hyd.approve(address(votingEscrow), type(uint256).max);
        voter2TokenId = votingEscrow.createLock(50_000 * 1e18, 2 * 365 days);
        vm.stopPrank();
    }

    /**
     * @notice Test: Complete Happy Path
     */
    function testIntegration_CompleteHappyPath() public {
        // Phase 1: Submit Project
        vm.prank(issuer);
        projectId = registry.submitProject(
            address(rwaToken),
            TARGET_RAISE,
            SALE_DURATION,
            COMPLIANCE_DOC_URI,
            AUDIT_REPORT_URI,
            DISCLOSURE_URI
        );

        // Verify project created
        (
            address _issuer,
            address _rwaToken,
            uint256 _targetRaise,
            ,
            ,
            ,
            ,
            ,
            ,
            ProjectRegistry.ProjectStatus status,
            ,
        ) = registry.projects(projectId);

        assertEq(_issuer, issuer);
        assertEq(_rwaToken, address(rwaToken));
        assertEq(_targetRaise, TARGET_RAISE);
        assertTrue(status == ProjectRegistry.ProjectStatus.Voting);

        // Phase 2: Vote
        vm.prank(voter1);
        registry.vote(projectId, voter1TokenId, true);

        vm.prank(voter2);
        registry.vote(projectId, voter2TokenId, true);

        // Phase 3: Execute Vote (after voting period ends, owner-only)
        vm.warp(block.timestamp + 7 days + 1); // Wait for voting period to end
        vm.prank(owner);
        registry.executeVote(projectId);

        // Verify approved (status becomes Active)
        (, , , , , , , , , status, , ) = registry.projects(projectId);
        assertTrue(status == ProjectRegistry.ProjectStatus.Active);

        // Phase 4: Create Sale (use lower minimum that single participant can reach)
        uint256 testMinimumRaise = 40_000 * 1e6; // Within MAX_CONTRIBUTION
        vm.startPrank(issuer);
        rwaToken.approve(address(controller), TARGET_RAISE);
        controller.createSale(
            projectId,
            testMinimumRaise,
            TARGET_RAISE,
            MIN_CONTRIBUTION,
            MAX_CONTRIBUTION,
            false  // isWhitelisted
        );
        vm.stopPrank();

        // Verify sale created
        IssuanceController.Sale memory sale = controller.getSale(projectId);
        assertEq(sale.maximumRaise, TARGET_RAISE);
        assertFalse(sale.isFinalized);

        // Phase 5: Participate (reach minimum raise for successful sale)
        // participant1 already has 100,000 USDC from setUp, which is enough for 40,000
        uint256 participantAmount = testMinimumRaise; // 40,000 USDC
        vm.startPrank(participant1);
        usdc.approve(address(controller), participantAmount);
        controller.participate(projectId, participantAmount);
        vm.stopPrank();

        // Verify contribution
        uint256 contribution = controller.getContribution(projectId, participant1);
        assertEq(contribution, participantAmount);

        // Phase 6: Finalize Sale (owner-only)
        vm.warp(block.timestamp + SALE_DURATION + 1);
        vm.prank(owner);
        controller.finalizeSale(projectId);

        // Verify finalized
        sale = controller.getSale(projectId);
        assertTrue(sale.isFinalized);

        // Phase 7: Claim Tokens
        uint256 balanceBefore = rwaToken.balanceOf(participant1);
        vm.prank(participant1);
        controller.claim(projectId);

        assertEq(
            rwaToken.balanceOf(participant1) - balanceBefore,
            participantAmount
        );
    }

    /**
     * @notice Test: Rejected Project Cannot Create Sale
     */
    function testIntegration_RejectedProject() public {
        // Submit project
        vm.prank(issuer);
        projectId = registry.submitProject(
            address(rwaToken),
            TARGET_RAISE,
            SALE_DURATION,
            COMPLIANCE_DOC_URI,
            AUDIT_REPORT_URI,
            DISCLOSURE_URI
        );

        // Vote reject
        vm.prank(voter1);
        registry.vote(projectId, voter1TokenId, false);

        vm.prank(voter2);
        registry.vote(projectId, voter2TokenId, false);

        // Execute vote (after voting period ends, owner-only)
        vm.warp(block.timestamp + 7 days + 1);
        vm.prank(owner);
        registry.executeVote(projectId);

        // Verify rejected
        (, , , , , , , , , ProjectRegistry.ProjectStatus status, , ) = registry.projects(projectId);
        assertTrue(status == ProjectRegistry.ProjectStatus.Rejected);

        // Attempt to create sale (should fail)
        vm.startPrank(issuer);
        rwaToken.approve(address(controller), TARGET_RAISE);
        vm.expectRevert("Project not Active");
        controller.createSale(
            projectId,
            MINIMUM_RAISE,
            TARGET_RAISE,
            MIN_CONTRIBUTION,
            MAX_CONTRIBUTION,
            false
        );
        vm.stopPrank();
    }

    /**
     * @notice Test: Cross-Contract State Consistency
     */
    function testIntegration_StateConsistency() public {
        // Submit and approve project
        vm.prank(issuer);
        projectId = registry.submitProject(
            address(rwaToken),
            TARGET_RAISE,
            SALE_DURATION,
            COMPLIANCE_DOC_URI,
            AUDIT_REPORT_URI,
            DISCLOSURE_URI
        );

        vm.prank(voter1);
        registry.vote(projectId, voter1TokenId, true);

        // Execute vote (after voting period ends, owner-only)
        vm.warp(block.timestamp + 7 days + 1);
        vm.prank(owner);
        registry.executeVote(projectId);

        // Create sale with lower minimum for single participant test
        uint256 testMinimumRaise = 40_000 * 1e6; // Lower than MAX_CONTRIBUTION
        vm.startPrank(issuer);
        rwaToken.approve(address(controller), TARGET_RAISE);
        controller.createSale(
            projectId,
            testMinimumRaise,
            TARGET_RAISE,
            MIN_CONTRIBUTION,
            MAX_CONTRIBUTION,
            false
        );
        vm.stopPrank();

        // Verify consistent state
        (, , , , , , , , , ProjectRegistry.ProjectStatus registryStatus, , ) = registry.projects(projectId);
        IssuanceController.Sale memory controllerSale = controller.getSale(projectId);

        assertTrue(registryStatus == ProjectRegistry.ProjectStatus.Active);
        assertFalse(controllerSale.isFinalized);

        // Complete sale (within MAX_CONTRIBUTION)
        // participant1 already has 100,000 USDC from setUp, which is enough for 40,000
        uint256 participantAmount = testMinimumRaise;
        vm.startPrank(participant1);
        usdc.approve(address(controller), participantAmount);
        controller.participate(projectId, participantAmount);
        vm.stopPrank();

        vm.warp(block.timestamp + SALE_DURATION + 1);
        vm.prank(owner);
        controller.finalizeSale(projectId);

        // Verify consistent completed state
        // Note: ProjectRegistry status remains Active (finalizeSale doesn't update registry)
        (, , , , , , , , , registryStatus, , ) = registry.projects(projectId);
        controllerSale = controller.getSale(projectId);

        assertTrue(registryStatus == ProjectRegistry.ProjectStatus.Active);
        assertTrue(controllerSale.isFinalized);
    }
}
