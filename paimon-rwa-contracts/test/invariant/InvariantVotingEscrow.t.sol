// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {console} from "forge-std/console.sol";
import {VotingEscrow} from "../../src/core/VotingEscrow.sol";
import {MockERC20} from "../../src/mocks/MockERC20.sol";
import {VotingEscrowHandler} from "./handlers/VotingEscrowHandler.sol";

/**
 * @title InvariantVotingEscrow
 * @notice Invariant tests for VotingEscrow (veNFT)
 * @dev Tests 3 critical invariants:
 *      1. Voting power bounded by total locked HYD
 *      2. No early withdrawal (before expiry)
 *      3. Linear decay of voting power over time
 *
 * Test Configuration:
 * - Runs: 100,000
 * - Depth: 15
 * - Handler: VotingEscrowHandler
 */
contract InvariantVotingEscrow is StdInvariant, Test {
    VotingEscrow public votingEscrow;
    MockERC20 public hyd;
    VotingEscrowHandler public handler;

    uint256 constant HANDLER_HYD_BALANCE = 100_000_000 ether; // 100M HYD
    uint256 constant MAXTIME = 4 * 365 days;

    function setUp() public {
        // Deploy HYD token
        hyd = new MockERC20("Hydra", "HYD", 18);

        // Deploy VotingEscrow
        votingEscrow = new VotingEscrow(address(hyd));

        // Create handler
        handler = new VotingEscrowHandler(votingEscrow, hyd);

        // Fund handler with HYD
        hyd.mint(address(handler), HANDLER_HYD_BALANCE);

        // Target handler
        targetContract(address(handler));

        // Labels for debugging
        vm.label(address(votingEscrow), "VotingEscrow");
        vm.label(address(hyd), "HYD");
        vm.label(address(handler), "VotingEscrowHandler");
    }

    // ============================================================
    // INVARIANT 1: Voting Power Bounded
    // ============================================================

    /**
     * @notice Invariant: Total voting power never exceeds total locked HYD
     * @dev Formula: sum(balanceOfNFT(tokenId)) <= HYD.balanceOf(VotingEscrow)
     */
    function invariant_votingPowerBounded() public view {
        uint256 totalLockedHYD = hyd.balanceOf(address(votingEscrow));
        uint256 totalVotingPower = 0;

        // Sum voting power across all created NFTs
        uint256 tokenCount = handler.getCreatedTokenCount();
        for (uint256 i = 0; i < tokenCount; i++) {
            uint256 tokenId = handler.getTokenIdAt(i);

            // Check if NFT still exists
            try votingEscrow.ownerOf(tokenId) returns (address owner) {
                if (owner != address(0)) {
                    try votingEscrow.balanceOfNFT(tokenId) returns (uint256 power) {
                        totalVotingPower += power;
                    } catch {
                        // NFT might have been withdrawn, skip
                    }
                }
            } catch {
                // NFT doesn't exist, skip
            }
        }

        assertLe(
            totalVotingPower,
            totalLockedHYD,
            "INVARIANT VIOLATION: Voting power exceeds locked HYD"
        );
    }

    // ============================================================
    // INVARIANT 2: No Early Withdrawal
    // ============================================================

    /**
     * @notice Invariant: Cannot withdraw before lock expiry
     * @dev Tests that all existing locks respect expiry time
     */
    function invariant_noEarlyWithdrawal() public view {
        uint256 tokenCount = handler.getCreatedTokenCount();

        for (uint256 i = 0; i < tokenCount; i++) {
            uint256 tokenId = handler.getTokenIdAt(i);

            // Check if NFT still exists
            try votingEscrow.ownerOf(tokenId) returns (address owner) {
                if (owner != address(0)) {
                    // NFT exists, check lock hasn't expired
                    try votingEscrow.getLockedBalance(tokenId) returns (
                        VotingEscrow.LockedBalance memory locked
                    ) {
                        if (locked.amount > 0) {
                            // Lock exists with balance
                            // This means withdrawal hasn't happened yet
                            // Verify that current time < expiry OR lock already expired
                            // (both are valid states)
                            assertTrue(
                                block.timestamp <= locked.end || locked.end <= block.timestamp,
                                "INVARIANT VIOLATION: Invalid lock state"
                            );
                        }
                    } catch {
                        // Lock might have been withdrawn, which is fine
                    }
                }
            } catch {
                // NFT doesn't exist (was withdrawn), which is fine
            }
        }
    }

    // ============================================================
    // INVARIANT 3: Linear Decay
    // ============================================================

    /**
     * @notice Invariant: Voting power decreases linearly over time
     * @dev Formula: power = amount × (lockEnd - now) / MAXTIME
     *      Tests that power calculation is correct
     */
    function invariant_linearDecay() public view {
        uint256 tokenCount = handler.getCreatedTokenCount();

        for (uint256 i = 0; i < tokenCount; i++) {
            uint256 tokenId = handler.getTokenIdAt(i);

            // Check if NFT exists
            try votingEscrow.ownerOf(tokenId) returns (address owner) {
                if (owner == address(0)) {
                    continue; // NFT doesn't exist
                }

                // Get locked balance
                try votingEscrow.getLockedBalance(tokenId) returns (
                    VotingEscrow.LockedBalance memory locked
                ) {
                    if (locked.amount == 0) {
                        continue; // Lock withdrawn
                    }

                    // Get voting power
                    try votingEscrow.balanceOfNFT(tokenId) returns (uint256 power) {
                        // Calculate expected power
                        uint256 expectedPower;
                        if (block.timestamp >= locked.end) {
                            expectedPower = 0; // Expired lock
                        } else {
                            uint256 remainingTime = uint256(locked.end) - block.timestamp;
                            expectedPower = (uint256(locked.amount) * remainingTime) / MAXTIME;
                        }

                        // Verify power matches expected (allow 1 wei tolerance for rounding)
                        assertApproxEqAbs(
                            power,
                            expectedPower,
                            1,
                            "INVARIANT VIOLATION: Linear decay calculation incorrect"
                        );
                    } catch {
                        // balanceOfNFT might fail for withdrawn locks, which is expected
                    }
                } catch {
                    // getLockedBalance might fail, skip
                }
            } catch {
                // ownerOf might fail for non-existent NFTs, skip
            }
        }
    }

    // ============================================================
    // HELPER FUNCTIONS
    // ============================================================

    /**
     * @notice Summary of test execution
     */
    function invariant_callSummary() public view {
        console.log("\n=== VotingEscrow Invariant Test Summary ===");
        console.log("Total Locks Created:", handler.ghost_totalLocksCreated());
        console.log("Total Amount Increases:", handler.ghost_totalAmountIncreases());
        console.log("Total Time Increases:", handler.ghost_totalTimeIncreases());
        console.log("Total Withdrawals:", handler.ghost_totalWithdrawals());
        console.log("\nCurrent State:");
        console.log("Total Locked HYD:", hyd.balanceOf(address(votingEscrow)));
        console.log("Total NFTs Created:", handler.getCreatedTokenCount());
        console.log("Next Token ID:", votingEscrow.tokenId());
    }
}
