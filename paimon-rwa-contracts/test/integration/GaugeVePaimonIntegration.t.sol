// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";
import {GaugeController} from "../../src/governance/GaugeController.sol";
import {VotingEscrowPaimon} from "../../src/core/VotingEscrowPaimon.sol";
import {MockERC20} from "../../src/mocks/MockERC20.sol";

/**
 * @title GaugeVePaimonIntegration
 * @notice Integration tests for GaugeController ↔ VotingEscrowPaimon compatibility
 * @dev Tests Task 14 acceptance criteria:
 *      1. Interface compatibility (balanceOfNFT, ownerOf)
 *      2. Epoch alignment (7-day periods)
 *      3. Snapshot mechanism and voting power queries
 *      4. Full voting workflow integration
 */
contract GaugeVePaimonIntegration is Test {
    GaugeController public gaugeController;
    VotingEscrowPaimon public vePaimon;
    MockERC20 public paimon;

    address public owner = address(this);
    address public alice = address(0x1);
    address public bob = address(0x2);
    address public gauge1 = address(0x1001); // Mock DEX pair 1
    address public gauge2 = address(0x1002); // Mock DEX pair 2

    uint256 public constant WEEK = 7 days;
    uint256 public constant MAXTIME = 4 * 365 days; // 4 years
    uint256 public constant WEIGHT_PRECISION = 10000; // 100% = 10000 basis points

    function setUp() public {
        // Deploy PAIMON token
        paimon = new MockERC20("Paimon", "PAIMON", 18);

        // Deploy VotingEscrowPaimon
        vePaimon = new VotingEscrowPaimon(address(paimon));

        // Deploy GaugeController with VotingEscrowPaimon
        gaugeController = new GaugeController(address(vePaimon));

        // Add test gauges
        gaugeController.addGauge(gauge1);
        gaugeController.addGauge(gauge2);

        // Fund test accounts
        paimon.mint(alice, 100_000 ether);
        paimon.mint(bob, 100_000 ether);

        // Labels
        vm.label(alice, "Alice");
        vm.label(bob, "Bob");
        vm.label(gauge1, "Gauge1");
        vm.label(gauge2, "Gauge2");
    }

    // ============================================================
    // TEST 1: INTERFACE COMPATIBILITY
    // ============================================================

    /**
     * @notice Test that GaugeController can query vePaimon.balanceOfNFT()
     * @dev Acceptance Criteria 1: Interface compatibility
     */
    function test_InterfaceCompatibility_BalanceOfNFT() public {
        // Alice creates lock
        vm.startPrank(alice);
        paimon.approve(address(vePaimon), 10_000 ether);
        uint256 tokenId = vePaimon.createLock(10_000 ether, 365 days);
        vm.stopPrank();

        // GaugeController queries voting power via balanceOfNFT()
        uint256 votingPower = vePaimon.balanceOfNFT(tokenId);

        // Verify voting power calculation
        // Formula: power = amount * (lockEnd - now) / MAXTIME
        // Lock 1 year out of 4 years max = 25% weight
        uint256 expectedPower = (10_000 ether * 365 days) / MAXTIME;

        assertApproxEqAbs(
            votingPower,
            expectedPower,
            1 ether, // Allow 1 PAIMON tolerance for timestamp rounding
            "Voting power calculation incorrect"
        );

        assertGt(votingPower, 0, "Voting power should be > 0");
        assertLe(votingPower, 10_000 ether, "Voting power should be <= locked amount");
    }

    /**
     * @notice Test that GaugeController can verify ownership via vePaimon.ownerOf()
     * @dev Acceptance Criteria 1: Interface compatibility
     */
    function test_InterfaceCompatibility_OwnerOf() public {
        // Alice creates lock
        vm.startPrank(alice);
        paimon.approve(address(vePaimon), 10_000 ether);
        uint256 tokenId = vePaimon.createLock(10_000 ether, 365 days);
        vm.stopPrank();

        // GaugeController verifies ownership
        address tokenOwner = vePaimon.ownerOf(tokenId);

        assertEq(tokenOwner, alice, "Owner should be Alice");
    }

    /**
     * @notice Test that GaugeController can query lock details via vePaimon.locked()
     * @dev Acceptance Criteria 1: Interface compatibility
     */
    function test_InterfaceCompatibility_LockedQuery() public {
        // Alice creates lock
        vm.startPrank(alice);
        paimon.approve(address(vePaimon), 10_000 ether);
        uint256 tokenId = vePaimon.createLock(10_000 ether, 365 days);
        vm.stopPrank();

        // Query lock details
        (uint128 amount, uint128 end) = vePaimon.locked(tokenId);

        assertEq(amount, 10_000 ether, "Locked amount should match");
        assertGt(end, block.timestamp, "Lock end should be in future");
        assertApproxEqAbs(
            end,
            block.timestamp + 365 days,
            1 days, // Allow 1 day tolerance for rounding to weeks
            "Lock end should be ~1 year from now"
        );
    }

    // ============================================================
    // TEST 2: EPOCH ALIGNMENT
    // ============================================================

    /**
     * @notice Test that both contracts use 7-day periods
     * @dev Acceptance Criteria 2: Epoch alignment
     */
    function test_EpochAlignment_SevenDayPeriod() public {
        // Verify GaugeController uses 7-day epochs
        assertEq(
            gaugeController.EPOCH_DURATION(),
            7 days,
            "GaugeController should use 7-day epochs"
        );

        // Verify VotingEscrowPaimon uses 7-day weeks
        assertEq(
            vePaimon.WEEK(),
            7 days,
            "VotingEscrowPaimon should use 7-day weeks"
        );

        // Verify constants match
        assertEq(
            gaugeController.EPOCH_DURATION(),
            vePaimon.WEEK(),
            "Epoch durations should match"
        );
    }

    /**
     * @notice Test epoch advancement in GaugeController
     * @dev Acceptance Criteria 2: Epoch alignment
     */
    function test_EpochAlignment_AutoAdvance() public {
        uint256 initialEpoch = gaugeController.getCurrentEpoch();
        assertEq(initialEpoch, 0, "Initial epoch should be 0");

        // Advance time by 7 days
        vm.warp(block.timestamp + 7 days);

        uint256 newEpoch = gaugeController.getCurrentEpoch();
        assertEq(newEpoch, 1, "Epoch should advance to 1 after 7 days");

        // Advance time by another 14 days (2 more epochs)
        vm.warp(block.timestamp + 14 days);

        uint256 latestEpoch = gaugeController.getCurrentEpoch();
        assertEq(latestEpoch, 3, "Epoch should advance to 3 after 21 days total");
    }

    // ============================================================
    // TEST 3: VOTING POWER SNAPSHOT MECHANISM
    // ============================================================

    /**
     * @notice Test that voting power decays linearly over time
     * @dev Acceptance Criteria 3: Snapshot mechanism
     */
    function test_SnapshotMechanism_VotingPowerDecay() public {
        // Alice creates 1-year lock
        vm.startPrank(alice);
        paimon.approve(address(vePaimon), 10_000 ether);
        uint256 tokenId = vePaimon.createLock(10_000 ether, 365 days);
        vm.stopPrank();

        // Initial voting power (~25% of locked amount for 1-year lock)
        uint256 initialPower = vePaimon.balanceOfNFT(tokenId);
        assertGt(initialPower, 0, "Initial power should be > 0");

        // Advance time by 6 months (50% of lock duration)
        vm.warp(block.timestamp + 182.5 days);

        // Voting power should decay to ~50% of initial
        uint256 midPower = vePaimon.balanceOfNFT(tokenId);
        assertApproxEqRel(
            midPower,
            initialPower / 2,
            0.05e18, // 5% tolerance
            "Voting power should decay to ~50% after 6 months"
        );

        // Advance past lock expiry (need to go beyond, not exactly at expiry)
        vm.warp(block.timestamp + 183 days);

        // Voting power should be 0 after expiry
        uint256 finalPower = vePaimon.balanceOfNFT(tokenId);
        assertEq(finalPower, 0, "Voting power should be 0 after expiry");
    }

    /**
     * @notice Test that GaugeController uses real-time voting power
     * @dev Acceptance Criteria 3: Snapshot mechanism
     */
    function test_SnapshotMechanism_GaugeVotingPower() public {
        // Alice creates lock and votes
        vm.startPrank(alice);
        paimon.approve(address(vePaimon), 10_000 ether);
        uint256 tokenId = vePaimon.createLock(10_000 ether, 365 days);

        // Vote 100% for gauge1
        gaugeController.vote(tokenId, 0, WEIGHT_PRECISION); // gaugeId=0
        vm.stopPrank();

        uint256 epoch = gaugeController.getCurrentEpoch();
        uint256 initialGaugeWeight = gaugeController.gaugeWeights(epoch, 0);
        assertGt(initialGaugeWeight, 0, "Initial gauge weight should be > 0");

        // Advance time by 6 months
        vm.warp(block.timestamp + 182.5 days);

        // Vote again in new epoch
        vm.prank(alice);
        gaugeController.vote(tokenId, 0, WEIGHT_PRECISION);

        uint256 newEpoch = gaugeController.getCurrentEpoch();
        uint256 newGaugeWeight = gaugeController.gaugeWeights(newEpoch, 0);

        // New gauge weight should be ~50% of initial (due to voting power decay)
        assertLt(
            newGaugeWeight,
            initialGaugeWeight,
            "Gauge weight should decrease due to voting power decay"
        );
        assertApproxEqRel(
            newGaugeWeight,
            initialGaugeWeight / 2,
            0.1e18, // 10% tolerance
            "New gauge weight should be ~50% of initial"
        );
    }

    // ============================================================
    // TEST 4: FULL VOTING WORKFLOW INTEGRATION
    // ============================================================

    /**
     * @notice Test complete voting workflow: lock → vote → claim bribe
     * @dev Acceptance Criteria: Full integration test
     */
    function test_FullWorkflow_LockVoteQuery() public {
        // Alice creates 2-year lock
        vm.startPrank(alice);
        paimon.approve(address(vePaimon), 50_000 ether);
        uint256 aliceTokenId = vePaimon.createLock(50_000 ether, 2 * 365 days);
        vm.stopPrank();

        // Bob creates 1-year lock
        vm.startPrank(bob);
        paimon.approve(address(vePaimon), 20_000 ether);
        uint256 bobTokenId = vePaimon.createLock(20_000 ether, 365 days);
        vm.stopPrank();

        // Verify voting power
        uint256 alicePower = vePaimon.balanceOfNFT(aliceTokenId);
        uint256 bobPower = vePaimon.balanceOfNFT(bobTokenId);

        assertGt(alicePower, bobPower, "Alice should have more voting power");

        // Alice votes 60% for gauge1, 40% for gauge2
        vm.startPrank(alice);
        uint256[] memory gaugeIds = new uint256[](2);
        gaugeIds[0] = 0; // gauge1
        gaugeIds[1] = 1; // gauge2
        uint256[] memory weights = new uint256[](2);
        weights[0] = 6000; // 60%
        weights[1] = 4000; // 40%
        gaugeController.batchVote(aliceTokenId, gaugeIds, weights);
        vm.stopPrank();

        // Bob votes 100% for gauge2
        vm.prank(bob);
        gaugeController.vote(bobTokenId, 1, WEIGHT_PRECISION);

        // Verify gauge weights
        uint256 epoch = gaugeController.getCurrentEpoch();
        uint256 gauge1Weight = gaugeController.gaugeWeights(epoch, 0);
        uint256 gauge2Weight = gaugeController.gaugeWeights(epoch, 1);

        // Gauge1 should have 60% of Alice's voting power
        uint256 expectedGauge1Weight = (alicePower * 6000) / WEIGHT_PRECISION;
        assertApproxEqAbs(
            gauge1Weight,
            expectedGauge1Weight,
            1 ether,
            "Gauge1 weight should match Alice's 60% allocation"
        );

        // Gauge2 should have 40% of Alice's + 100% of Bob's voting power
        uint256 expectedGauge2Weight = (alicePower * 4000) / WEIGHT_PRECISION + bobPower;
        assertApproxEqAbs(
            gauge2Weight,
            expectedGauge2Weight,
            1 ether,
            "Gauge2 weight should match combined allocations"
        );

        // Verify total allocation is correct
        // Alice: 50k PAIMON * 2yr lock = ~25k voting power
        // Bob: 20k PAIMON * 1yr lock = ~5k voting power
        // Gauge1: 25k * 60% = 15k
        // Gauge2: 25k * 40% + 5k * 100% = 10k + 5k = 15k
        // So gauge1 and gauge2 should be approximately equal
        assertApproxEqRel(
            gauge2Weight,
            gauge1Weight,
            0.01e18, // 1% tolerance
            "Gauge weights should be approximately equal"
        );
    }

    /**
     * @notice Test voting power after NFT transfer
     * @dev Verify that voting power transfers with NFT
     */
    function test_FullWorkflow_NFTTransferVotingPower() public {
        // Alice creates lock
        vm.startPrank(alice);
        paimon.approve(address(vePaimon), 10_000 ether);
        uint256 tokenId = vePaimon.createLock(10_000 ether, 365 days);

        // Alice votes
        gaugeController.vote(tokenId, 0, WEIGHT_PRECISION);
        vm.stopPrank();

        // Verify Alice owns NFT
        assertEq(vePaimon.ownerOf(tokenId), alice, "Alice should own NFT");

        // Transfer NFT to Bob
        vm.prank(alice);
        vePaimon.transferFrom(alice, bob, tokenId);

        // Verify Bob now owns NFT
        assertEq(vePaimon.ownerOf(tokenId), bob, "Bob should own NFT after transfer");

        // Verify voting power unchanged
        uint256 votingPower = vePaimon.balanceOfNFT(tokenId);
        assertGt(votingPower, 0, "Voting power should remain after transfer");

        // Bob can now vote with the NFT (new epoch required)
        vm.warp(block.timestamp + 7 days);
        vm.prank(bob);
        gaugeController.vote(tokenId, 1, WEIGHT_PRECISION);

        // Verify vote succeeded
        uint256 newEpoch = gaugeController.getCurrentEpoch();
        uint256 gauge2Weight = gaugeController.gaugeWeights(newEpoch, 1);
        assertGt(gauge2Weight, 0, "Bob's vote should register");
    }

    /**
     * @notice Test voting across multiple epochs
     * @dev Verify epoch-based voting system
     */
    function test_FullWorkflow_MultiEpochVoting() public {
        // Alice creates lock
        vm.startPrank(alice);
        paimon.approve(address(vePaimon), 10_000 ether);
        uint256 tokenId = vePaimon.createLock(10_000 ether, 365 days);
        vm.stopPrank();

        // Epoch 0: Vote for gauge1
        vm.prank(alice);
        gaugeController.vote(tokenId, 0, WEIGHT_PRECISION);

        uint256 epoch0 = gaugeController.getCurrentEpoch();
        uint256 gauge1WeightEpoch0 = gaugeController.gaugeWeights(epoch0, 0);
        assertGt(gauge1WeightEpoch0, 0, "Gauge1 weight should be > 0 in epoch 0");

        // Advance to Epoch 1
        vm.warp(block.timestamp + 7 days);

        // Epoch 1: Vote for gauge2 (switch)
        vm.prank(alice);
        gaugeController.vote(tokenId, 1, WEIGHT_PRECISION);

        uint256 epoch1 = gaugeController.getCurrentEpoch();
        assertEq(epoch1, epoch0 + 1, "Epoch should advance");

        uint256 gauge2WeightEpoch1 = gaugeController.gaugeWeights(epoch1, 1);
        assertGt(gauge2WeightEpoch1, 0, "Gauge2 weight should be > 0 in epoch 1");

        // Epoch 0 weights should remain unchanged
        uint256 gauge1WeightEpoch0After = gaugeController.gaugeWeights(epoch0, 0);
        assertEq(
            gauge1WeightEpoch0After,
            gauge1WeightEpoch0,
            "Epoch 0 weights should be immutable"
        );
    }

    // ============================================================
    // TEST 5: EDGE CASES AND BOUNDARY CONDITIONS
    // ============================================================

    /**
     * @notice Test voting with expired lock (should have 0 power)
     * @dev Boundary test
     */
    function test_EdgeCase_ExpiredLockZeroPower() public {
        // Alice creates 1-week lock
        vm.startPrank(alice);
        paimon.approve(address(vePaimon), 10_000 ether);
        uint256 tokenId = vePaimon.createLock(10_000 ether, 7 days);
        vm.stopPrank();

        // Advance time past expiry
        vm.warp(block.timestamp + 8 days);

        // Voting power should be 0
        uint256 votingPower = vePaimon.balanceOfNFT(tokenId);
        assertEq(votingPower, 0, "Expired lock should have 0 voting power");

        // Voting should fail (or register 0 weight)
        vm.prank(alice);
        gaugeController.vote(tokenId, 0, WEIGHT_PRECISION);

        uint256 epoch = gaugeController.getCurrentEpoch();
        uint256 gaugeWeight = gaugeController.gaugeWeights(epoch, 0);
        assertEq(gaugeWeight, 0, "Gauge weight should be 0 for expired lock");
    }

    /**
     * @notice Test maximum lock duration (4 years)
     * @dev Boundary test
     */
    function test_EdgeCase_MaxLockDuration() public {
        // Alice creates max 4-year lock
        vm.startPrank(alice);
        paimon.approve(address(vePaimon), 100_000 ether);
        uint256 tokenId = vePaimon.createLock(100_000 ether, MAXTIME);
        vm.stopPrank();

        // Voting power should be ~100% of locked amount
        uint256 votingPower = vePaimon.balanceOfNFT(tokenId);
        assertApproxEqRel(
            votingPower,
            100_000 ether,
            0.01e18, // 1% tolerance (due to WEEK rounding)
            "Max lock should give ~100% voting power"
        );

        // Vote with max power
        vm.prank(alice);
        gaugeController.vote(tokenId, 0, WEIGHT_PRECISION);

        uint256 epoch = gaugeController.getCurrentEpoch();
        uint256 gaugeWeight = gaugeController.gaugeWeights(epoch, 0);

        assertApproxEqRel(
            gaugeWeight,
            100_000 ether,
            0.01e18,
            "Gauge weight should be ~100k with max lock"
        );
    }

    /**
     * @notice Test updating vote in same epoch
     * @dev Edge case: vote modification within epoch
     */
    function test_EdgeCase_UpdateVoteInSameEpoch() public {
        // Alice creates lock
        vm.startPrank(alice);
        paimon.approve(address(vePaimon), 10_000 ether);
        uint256 tokenId = vePaimon.createLock(10_000 ether, 365 days);

        // Initial vote: 100% for gauge1
        gaugeController.vote(tokenId, 0, WEIGHT_PRECISION);
        vm.stopPrank();

        uint256 epoch = gaugeController.getCurrentEpoch();
        uint256 initialGauge1Weight = gaugeController.gaugeWeights(epoch, 0);
        assertGt(initialGauge1Weight, 0, "Initial gauge1 weight should be > 0");

        // Update vote: 60% gauge1, 40% gauge2 (same epoch)
        vm.startPrank(alice);
        uint256[] memory gaugeIds = new uint256[](2);
        gaugeIds[0] = 0; // gauge1
        gaugeIds[1] = 1; // gauge2
        uint256[] memory weights = new uint256[](2);
        weights[0] = 6000; // 60%
        weights[1] = 4000; // 40%
        gaugeController.batchVote(tokenId, gaugeIds, weights);
        vm.stopPrank();

        // Verify weights updated
        uint256 newGauge1Weight = gaugeController.gaugeWeights(epoch, 0);
        uint256 newGauge2Weight = gaugeController.gaugeWeights(epoch, 1);

        uint256 votingPower = vePaimon.balanceOfNFT(tokenId);
        uint256 expectedGauge1Weight = (votingPower * 6000) / WEIGHT_PRECISION;
        uint256 expectedGauge2Weight = (votingPower * 4000) / WEIGHT_PRECISION;

        assertApproxEqAbs(
            newGauge1Weight,
            expectedGauge1Weight,
            1 ether,
            "Gauge1 weight should update to 60%"
        );
        assertApproxEqAbs(
            newGauge2Weight,
            expectedGauge2Weight,
            1 ether,
            "Gauge2 weight should be 40%"
        );
        assertLt(newGauge1Weight, initialGauge1Weight, "Gauge1 weight should decrease");
    }
}
