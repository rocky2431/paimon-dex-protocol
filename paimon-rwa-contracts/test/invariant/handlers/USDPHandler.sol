// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {USDP} from "../../../src/core/USDP.sol";

/**
 * @title USDPHandler
 * @notice Handler for USDP invariant testing
 * @dev Performs random operations on USDP contract:
 *      - mint: Create new USDP (increases shares)
 *      - burn: Destroy USDP (decreases shares)
 *      - transfer: Move USDP between users
 *      - accumulate: Update accrualIndex (yield distribution)
 */
contract USDPHandler is Test {
    USDP public usdp;

    // Ghost variables for tracking
    uint256 public ghost_totalMints;
    uint256 public ghost_totalBurns;
    uint256 public ghost_totalTransfers;
    uint256 public ghost_totalAccumulations;

    // Test users pool
    address[] public users;
    uint256 constant USER_COUNT = 10;

    constructor(USDP _usdp) {
        usdp = _usdp;

        // Create test users
        for (uint256 i = 0; i < USER_COUNT; i++) {
            address user = address(uint160(uint256(keccak256(abi.encodePacked("user", i)))));
            users.push(user);
            vm.label(user, string(abi.encodePacked("User", vm.toString(i))));
        }
    }

    // ============================================================
    // HANDLER FUNCTIONS
    // ============================================================

    /**
     * @notice Mint USDP to a random user
     * @param seed Random seed for user and amount selection
     */
    function mint(uint256 seed) external {
        // Select random user
        address to = users[seed % USER_COUNT];

        // Select random amount (1 to 1M USDP)
        uint256 amount = bound(seed, 1 ether, 1_000_000 ether);

        // Mint
        try usdp.mint(to, amount) {
            ghost_totalMints++;
        } catch {
            // Mint may fail if not authorized
        }
    }

    /**
     * @notice Burn USDP from a random user
     * @param seed Random seed for user and amount selection
     */
    function burn(uint256 seed) external {
        // Select random user
        address from = users[seed % USER_COUNT];

        // Get user balance
        uint256 balance = usdp.balanceOf(from);
        if (balance == 0) return;

        // Select random amount (up to balance)
        uint256 amount = bound(seed, 1, balance);

        // Burn (using burnFrom as handler is authorized minter)
        try usdp.burnFrom(from, amount) {
            ghost_totalBurns++;
        } catch {
            // Burn may fail if insufficient balance or not authorized
        }
    }

    /**
     * @notice Transfer USDP between random users
     * @param seed Random seed for user and amount selection
     */
    function transfer(uint256 seed) external {
        // Select random from/to users
        address from = users[seed % USER_COUNT];
        address to = users[(seed / USER_COUNT) % USER_COUNT];

        if (from == to) return; // Skip self-transfer

        // Get from balance
        uint256 balance = usdp.balanceOf(from);
        if (balance == 0) return;

        // Select random amount (up to balance)
        uint256 amount = bound(seed, 1, balance);

        // Transfer
        vm.prank(from);
        try usdp.transfer(to, amount) {
            ghost_totalTransfers++;
        } catch {
            // Transfer may fail if insufficient balance
        }
    }

    /**
     * @notice Accumulate yield by updating accrualIndex
     * @param seed Random seed for index increment
     */
    function accumulate(uint256 seed) external {
        // Calculate new index (1.0% to 5.0% increase)
        uint256 currentIndex = usdp.accrualIndex();
        uint256 incrementBps = bound(seed, 100, 500); // 1% to 5%
        uint256 newIndex = currentIndex + (currentIndex * incrementBps) / 10000;

        // Cap at 10x initial index (prevent extreme values)
        if (newIndex > 10e18) {
            newIndex = 10e18;
        }

        // Accumulate
        try usdp.accumulate(newIndex) {
            ghost_totalAccumulations++;
        } catch {
            // Accumulate may fail if not authorized or index decreases
        }
    }

    // ============================================================
    // HELPER FUNCTIONS
    // ============================================================

    /**
     * @notice Get user count for testing
     */
    function getUserCount() external pure returns (uint256) {
        return USER_COUNT;
    }

    /**
     * @notice Get user address by index
     */
    function getUser(uint256 index) external view returns (address) {
        require(index < USER_COUNT, "Index out of bounds");
        return users[index];
    }
}
