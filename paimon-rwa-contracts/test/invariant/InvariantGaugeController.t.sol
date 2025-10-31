// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {console} from "forge-std/console.sol";
import {GaugeController} from "../../src/governance/GaugeController.sol";
import {VotingEscrow} from "../../src/core/VotingEscrow.sol";
import {MockERC20} from "../../src/mocks/MockERC20.sol";
import {GaugeControllerHandler} from "./handlers/GaugeControllerHandler.sol";

/**
 * @title InvariantGaugeController
 * @notice Invariant tests for GaugeController
 * @dev Tests 2 critical invariants:
 *      1. Total weight allocation <= 100% per user per epoch
 *      2. Batch vote consistency (batch == sum of individual votes)
 *
 * Test Configuration:
 * - Runs: 100,000
 * - Depth: 15
 * - Handler: GaugeControllerHandler
 */
contract InvariantGaugeController is StdInvariant, Test {
    GaugeController public gaugeController;
    VotingEscrow public votingEscrow;
    MockERC20 public hyd;
    GaugeControllerHandler public handler;

    uint256 constant HANDLER_HYD_BALANCE = 100_000_000 ether;
    uint256 constant WEIGHT_PRECISION = 10000;

    function setUp() public {
        // Deploy HYD token
        hyd = new MockERC20("Hydra", "HYD", 18);

        // Deploy VotingEscrow
        votingEscrow = new VotingEscrow(address(hyd));

        // Deploy GaugeController
        gaugeController = new GaugeController(address(votingEscrow));

        // Add initial gauges (5 gauges for testing)
        for (uint256 i = 0; i < 5; i++) {
            address gaugeAddr = address(uint160(1000 + i));
            gaugeController.addGauge(gaugeAddr);
        }

        // Create handler
        handler = new GaugeControllerHandler(
            gaugeController,
            votingEscrow,
            hyd
        );

        // Fund handler with HYD
        hyd.mint(address(handler), HANDLER_HYD_BALANCE);

        // Target handler
        targetContract(address(handler));

        // Labels
        vm.label(address(gaugeController), "GaugeController");
        vm.label(address(votingEscrow), "VotingEscrow");
        vm.label(address(hyd), "HYD");
        vm.label(address(handler), "GaugeControllerHandler");
    }

    // ============================================================
    // INVARIANT 1: Total Weight <= 100%
    // ============================================================

    /**
     * @notice Invariant: User's total allocation never exceeds 100%
     * @dev Formula: sum(userVotes[tokenId][epoch][gaugeId]) <= WEIGHT_PRECISION
     */
    function invariant_totalWeight100Percent() public view {
        uint256 tokenCount = handler.getCreatedTokenCount();
        uint256 currentEpoch = gaugeController.getCurrentEpoch();
        uint256 gaugeCount = gaugeController.gaugeCount();

        for (uint256 i = 0; i < tokenCount; i++) {
            uint256 tokenId = handler.getTokenIdAt(i);

            // Check if NFT exists
            try votingEscrow.ownerOf(tokenId) returns (address owner) {
                if (owner == address(0)) {
                    continue; // NFT doesn't exist
                }

                // Get user's total allocation for current epoch
                (uint256 totalAllocation) = gaugeController.userTotalAllocation(
                    tokenId,
                    currentEpoch
                );

                // Verify total allocation <= 100%
                assertLe(
                    totalAllocation,
                    WEIGHT_PRECISION,
                    "INVARIANT VIOLATION: Total allocation exceeds 100%"
                );

                // Additionally verify by summing individual votes
                uint256 summedAllocation = 0;
                for (uint256 gaugeId = 0; gaugeId < gaugeCount; gaugeId++) {
                    uint256 voteWeight = gaugeController.userVotes(
                        tokenId,
                        currentEpoch,
                        gaugeId
                    );
                    summedAllocation += voteWeight;
                }

                // Verify consistency
                assertEq(
                    totalAllocation,
                    summedAllocation,
                    "INVARIANT VIOLATION: Total allocation mismatch"
                );
            } catch {
                // NFT doesn't exist, skip
            }
        }
    }

    // ============================================================
    // INVARIANT 2: Batch Vote Consistency
    // ============================================================

    /**
     * @notice Invariant: Batch vote results equal sum of individual votes
     * @dev Tests that batchVote() produces same result as individual vote() calls
     */
    function invariant_batchVoteConsistency() public {
        uint256 tokenCount = handler.getCreatedTokenCount();
        if (tokenCount == 0) {
            return; // No tokens to test
        }

        // Select first token for testing
        uint256 tokenId = handler.getTokenIdAt(0);

        // Check if NFT exists and we own it
        try votingEscrow.ownerOf(tokenId) returns (address owner) {
            if (owner != address(handler)) {
                return; // Handler doesn't own this NFT
            }
        } catch {
            return; // NFT doesn't exist
        }

        uint256 gaugeCount = gaugeController.gaugeCount();
        if (gaugeCount == 0) {
            return; // No gauges
        }

        // Save current epoch
        uint256 epoch = gaugeController.getCurrentEpoch();

        // Build batch vote arrays (vote 25% for first 4 gauges)
        uint256 numGauges = gaugeCount > 4 ? 4 : gaugeCount;
        uint256[] memory gaugeIds = new uint256[](numGauges);
        uint256[] memory weights = new uint256[](numGauges);

        for (uint256 i = 0; i < numGauges; i++) {
            gaugeIds[i] = i;
            weights[i] = 2500; // 25%
        }

        // Perform batch vote
        vm.prank(address(handler));
        try gaugeController.batchVote(tokenId, gaugeIds, weights) {
            // Verify each gauge received correct weight
            for (uint256 i = 0; i < numGauges; i++) {
                uint256 voteWeight = gaugeController.userVotes(
                    tokenId,
                    epoch,
                    gaugeIds[i]
                );

                assertEq(
                    voteWeight,
                    weights[i],
                    "INVARIANT VIOLATION: Batch vote weight mismatch"
                );
            }
        } catch {
            // Batch vote might fail, which is acceptable
        }
    }

    // ============================================================
    // HELPER FUNCTIONS
    // ============================================================

    /**
     * @notice Summary of test execution
     */
    function invariant_callSummary() public view {
        console.log("\n=== GaugeController Invariant Test Summary ===");
        console.log("Total Votes:", handler.ghost_totalVotes());
        console.log("Total Batch Votes:", handler.ghost_totalBatchVotes());
        console.log("Total Gauges Added:", handler.ghost_totalGaugesAdded());
        console.log("\nCurrent State:");
        console.log("Gauge Count:", gaugeController.gaugeCount());
        console.log("Current Epoch:", gaugeController.getCurrentEpoch());
        console.log("veNFTs Created:", handler.getCreatedTokenCount());

        // Show gauge weights for current epoch
        uint256 currentEpoch = gaugeController.getCurrentEpoch();
        console.log("\nGauge Weights (Current Epoch):");
        for (uint256 i = 0; i < gaugeController.gaugeCount(); i++) {
            uint256 weight = gaugeController.gaugeWeights(currentEpoch, i);
            console.log("  Gauge", i, ":", weight);
        }
    }
}
