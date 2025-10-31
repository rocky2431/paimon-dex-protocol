// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {VotingEscrow} from "../../../src/core/VotingEscrow.sol";
import {MockERC20} from "../../../src/mocks/MockERC20.sol";

/**
 * @title VotingEscrowHandler
 * @notice Handler contract for VotingEscrow invariant testing
 * @dev Handles random lock operations and tracks created NFTs
 */
contract VotingEscrowHandler is Test {
    VotingEscrow public votingEscrow;
    MockERC20 public hyd;

    // Track created NFT IDs
    uint256[] public createdTokenIds;

    // Ghost variables
    uint256 public ghost_totalLocksCreated;
    uint256 public ghost_totalAmountIncreases;
    uint256 public ghost_totalTimeIncreases;
    uint256 public ghost_totalWithdrawals;

    // Bounded randomness
    uint256 constant MAX_LOCK_AMOUNT = 1_000_000 ether;
    uint256 constant MIN_LOCK_DURATION = 1 weeks;
    uint256 constant MAX_LOCK_DURATION = 4 * 365 days;

    constructor(VotingEscrow _votingEscrow, MockERC20 _hyd) {
        votingEscrow = _votingEscrow;
        hyd = _hyd;

        // Approve VotingEscrow to spend HYD
        hyd.approve(address(votingEscrow), type(uint256).max);
    }

    /**
     * @notice Create random lock
     * @dev Bounds amount and duration to valid ranges
     */
    function createLock(uint256 amount, uint256 duration) external {
        // Bound parameters
        amount = bound(amount, 1 ether, MAX_LOCK_AMOUNT);
        duration = bound(duration, MIN_LOCK_DURATION, MAX_LOCK_DURATION);

        // Check if we have enough HYD
        if (hyd.balanceOf(address(this)) < amount) {
            return; // Skip if insufficient balance
        }

        try votingEscrow.createLock(amount, duration) returns (uint256 tokenId) {
            createdTokenIds.push(tokenId);
            ghost_totalLocksCreated++;
        } catch {
            // Ignore errors
        }
    }

    /**
     * @notice Increase lock amount for random NFT
     * @dev Selects random NFT from created tokens
     */
    function increaseLockAmount(uint256 tokenIdSeed, uint256 amount) external {
        if (createdTokenIds.length == 0) {
            return; // No NFTs to increase
        }

        // Select random token ID
        uint256 index = bound(tokenIdSeed, 0, createdTokenIds.length - 1);
        uint256 tokenId = createdTokenIds[index];

        // Bound amount
        amount = bound(amount, 1 ether, MAX_LOCK_AMOUNT);

        // Check if we have enough HYD
        if (hyd.balanceOf(address(this)) < amount) {
            return;
        }

        // Check if we own the NFT
        try votingEscrow.ownerOf(tokenId) returns (address owner) {
            if (owner != address(this)) {
                return; // We don't own this NFT
            }
        } catch {
            return; // NFT doesn't exist
        }

        try votingEscrow.increaseAmount(tokenId, amount) {
            ghost_totalAmountIncreases++;
        } catch {
            // Ignore errors (e.g., lock expired)
        }
    }

    /**
     * @notice Increase lock time for random NFT
     * @dev Selects random NFT and extends duration
     */
    function increaseLockTime(uint256 tokenIdSeed, uint256 newDuration) external {
        if (createdTokenIds.length == 0) {
            return; // No NFTs to increase
        }

        // Select random token ID
        uint256 index = bound(tokenIdSeed, 0, createdTokenIds.length - 1);
        uint256 tokenId = createdTokenIds[index];

        // Bound duration
        newDuration = bound(newDuration, MIN_LOCK_DURATION, MAX_LOCK_DURATION);

        // Check if we own the NFT
        try votingEscrow.ownerOf(tokenId) returns (address owner) {
            if (owner != address(this)) {
                return; // We don't own this NFT
            }
        } catch {
            return; // NFT doesn't exist
        }

        try votingEscrow.increaseUnlockTime(tokenId, newDuration) {
            ghost_totalTimeIncreases++;
        } catch {
            // Ignore errors (e.g., new duration not greater)
        }
    }

    /**
     * @notice Withdraw from random expired lock
     * @dev Warps time to expiry if needed
     */
    function withdraw(uint256 tokenIdSeed, bool shouldWarp) external {
        if (createdTokenIds.length == 0) {
            return; // No NFTs to withdraw
        }

        // Select random token ID
        uint256 index = bound(tokenIdSeed, 0, createdTokenIds.length - 1);
        uint256 tokenId = createdTokenIds[index];

        // Check if we own the NFT
        try votingEscrow.ownerOf(tokenId) returns (address owner) {
            if (owner != address(this)) {
                return; // We don't own this NFT
            }
        } catch {
            return; // NFT doesn't exist or already withdrawn
        }

        // Optionally warp to expiry
        if (shouldWarp) {
            try votingEscrow.getLockedBalance(tokenId) returns (
                VotingEscrow.LockedBalance memory locked
            ) {
                if (locked.end > block.timestamp) {
                    vm.warp(locked.end);
                }
            } catch {
                return;
            }
        }

        try votingEscrow.withdraw(tokenId) {
            ghost_totalWithdrawals++;
            // Remove from createdTokenIds (mark as withdrawn)
            // Note: We don't actually remove to avoid gas-intensive array operations
        } catch {
            // Ignore errors (e.g., lock not expired)
        }
    }

    /**
     * @notice Get total number of created NFTs
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
