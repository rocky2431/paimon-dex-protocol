// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {GaugeController} from "../../../src/governance/GaugeController.sol";
import {VotingEscrow} from "../../../src/core/VotingEscrow.sol";
import {MockERC20} from "../../../src/mocks/MockERC20.sol";

/**
 * @title GaugeControllerHandler
 * @notice Handler contract for GaugeController invariant testing
 * @dev Manages voting operations and tracks gauge state
 */
contract GaugeControllerHandler is Test {
    GaugeController public gaugeController;
    VotingEscrow public votingEscrow;
    MockERC20 public hyd;

    // Track created veNFTs
    uint256[] public createdTokenIds;

    // Ghost variables
    uint256 public ghost_totalVotes;
    uint256 public ghost_totalBatchVotes;
    uint256 public ghost_totalGaugesAdded;

    // Bounded randomness
    uint256 constant MAX_LOCK_AMOUNT = 1_000_000 ether;
    uint256 constant LOCK_DURATION = 365 days; // 1 year locks for testing
    uint256 constant WEIGHT_PRECISION = 10000;

    constructor(
        GaugeController _gaugeController,
        VotingEscrow _votingEscrow,
        MockERC20 _hyd
    ) {
        gaugeController = _gaugeController;
        votingEscrow = _votingEscrow;
        hyd = _hyd;

        // Approve VotingEscrow
        hyd.approve(address(votingEscrow), type(uint256).max);

        // Create initial veNFT for testing
        if (hyd.balanceOf(address(this)) >= 10000 ether) {
            uint256 tokenId = votingEscrow.createLock(10000 ether, LOCK_DURATION);
            createdTokenIds.push(tokenId);
        }
    }

    /**
     * @notice Create veNFT for voting
     * @dev Ensures handler has voting power
     */
    function createVeNFT(uint256 amount) external {
        // Bound amount
        amount = bound(amount, 1000 ether, MAX_LOCK_AMOUNT);

        // Check balance
        if (hyd.balanceOf(address(this)) < amount) {
            return;
        }

        try votingEscrow.createLock(amount, LOCK_DURATION) returns (uint256 tokenId) {
            createdTokenIds.push(tokenId);
        } catch {
            // Ignore errors
        }
    }

    /**
     * @notice Random single vote
     * @dev Selects random tokenId and gauge
     */
    function vote(uint256 tokenIdSeed, uint256 gaugeIdSeed, uint256 weight) external {
        if (createdTokenIds.length == 0) {
            return; // No veNFTs
        }

        // Select random tokenId
        uint256 index = bound(tokenIdSeed, 0, createdTokenIds.length - 1);
        uint256 tokenId = createdTokenIds[index];

        // Check if we own the NFT
        try votingEscrow.ownerOf(tokenId) returns (address owner) {
            if (owner != address(this)) {
                return;
            }
        } catch {
            return;
        }

        // Bound gaugeId and weight
        uint256 gaugeCount = gaugeController.gaugeCount();
        if (gaugeCount == 0) {
            return; // No gauges
        }

        uint256 gaugeId = bound(gaugeIdSeed, 0, gaugeCount - 1);
        weight = bound(weight, 0, WEIGHT_PRECISION);

        try gaugeController.vote(tokenId, gaugeId, weight) {
            ghost_totalVotes++;
        } catch {
            // Ignore errors (e.g., allocation exceeds 100%)
        }
    }

    /**
     * @notice Random batch vote
     * @dev Votes for multiple gauges with random weights
     */
    function batchVote(
        uint256 tokenIdSeed,
        uint256 numGauges,
        uint256 weightSeed
    ) external {
        if (createdTokenIds.length == 0) {
            return; // No veNFTs
        }

        // Select random tokenId
        uint256 index = bound(tokenIdSeed, 0, createdTokenIds.length - 1);
        uint256 tokenId = createdTokenIds[index];

        // Check if we own the NFT
        try votingEscrow.ownerOf(tokenId) returns (address owner) {
            if (owner != address(this)) {
                return;
            }
        } catch {
            return;
        }

        uint256 gaugeCount = gaugeController.gaugeCount();
        if (gaugeCount == 0) {
            return; // No gauges
        }

        // Bound number of gauges to vote for
        numGauges = bound(numGauges, 1, gaugeCount > 5 ? 5 : gaugeCount);

        // Build arrays
        uint256[] memory gaugeIds = new uint256[](numGauges);
        uint256[] memory weights = new uint256[](numGauges);

        // Distribute weights evenly (ensure total <= 100%)
        uint256 weightPerGauge = WEIGHT_PRECISION / numGauges;

        for (uint256 i = 0; i < numGauges; i++) {
            gaugeIds[i] = i % gaugeCount;
            weights[i] = weightPerGauge;
        }

        try gaugeController.batchVote(tokenId, gaugeIds, weights) {
            ghost_totalBatchVotes++;
        } catch {
            // Ignore errors
        }
    }

    /**
     * @notice Add random gauge
     * @dev Only owner can add gauges
     */
    function addGauge(uint256 gaugeSeed) external {
        // Create mock gauge address
        address gaugeAddress = address(uint160(gaugeSeed));

        // Ensure non-zero address
        if (gaugeAddress == address(0)) {
            return;
        }

        vm.prank(gaugeController.owner());
        try gaugeController.addGauge(gaugeAddress) {
            ghost_totalGaugesAdded++;
        } catch {
            // Ignore errors (e.g., gauge already exists)
        }
    }

    /**
     * @notice Get created token count
     */
    function getCreatedTokenCount() external view returns (uint256) {
        return createdTokenIds.length;
    }

    /**
     * @notice Get token ID at index
     */
    function getTokenIdAt(uint256 index) external view returns (uint256) {
        require(index < createdTokenIds.length, "Index out of bounds");
        return createdTokenIds[index];
    }
}
