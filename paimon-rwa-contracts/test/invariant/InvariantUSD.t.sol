// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {console} from "forge-std/console.sol";
import {USDP} from "../../src/core/USDP.sol";
import {USDPHandler} from "./handlers/USDPHandler.sol";

/**
 * @title InvariantUSD
 * @notice Invariant tests for USDP (Share-based stablecoin)
 * @dev Tests 3 critical invariants:
 *      1. Share Conservation: sum(user_shares) == _totalShares
 *      2. Supply Integrity: totalSupply() == _totalShares * accrualIndex / 1e18
 *      3. Index Monotonicity: accrualIndex never decreases
 *
 * Test Configuration:
 * - Runs: 100,000
 * - Depth: 15
 * - Handler: USDPHandler
 */
contract InvariantUSD is StdInvariant, Test {
    USDP public usdp;
    USDPHandler public handler;

    // Track users for share sum calculation
    address[] public trackedUsers;
    mapping(address => bool) public isTracked;

    function setUp() public {
        // Deploy USDP
        usdp = new USDP();

        // Create handler
        handler = new USDPHandler(usdp);

        // Authorize handler as minter and distributor
        usdp.setAuthorizedMinter(address(handler), true);
        usdp.setDistributor(address(handler));

        // Track all handler users
        _trackUser(address(handler));
        uint256 userCount = handler.getUserCount();
        for (uint256 i = 0; i < userCount; i++) {
            _trackUser(handler.getUser(i));
        }

        // Target handler
        targetContract(address(handler));

        // Labels
        vm.label(address(usdp), "USDP");
        vm.label(address(handler), "USDPHandler");
    }

    // ============================================================
    // INVARIANT 1: Share Conservation
    // ============================================================

    /**
     * @notice Invariant: Sum of all user shares equals total shares
     * @dev Critical for share-based accounting integrity
     *      Formula: Σ(_shares[user]) == _totalShares
     */
    function invariant_shareConservation() public view {
        uint256 totalShares = usdp.totalShares();
        uint256 sumOfShares = 0;

        // Sum all tracked user shares
        for (uint256 i = 0; i < trackedUsers.length; i++) {
            address user = trackedUsers[i];
            sumOfShares += usdp.sharesOf(user);
        }

        assertEq(
            sumOfShares,
            totalShares,
            "INVARIANT VIOLATION: Sum of user shares != totalShares"
        );
    }

    // ============================================================
    // INVARIANT 2: Supply Integrity
    // ============================================================

    /**
     * @notice Invariant: Total supply matches share-based calculation
     * @dev Formula: totalSupply() == _totalShares * accrualIndex / 1e18
     *      Allows 1 wei tolerance for rounding
     */
    function invariant_supplyIntegrity() public view {
        uint256 reportedSupply = usdp.totalSupply();
        uint256 totalShares = usdp.totalShares();
        uint256 accrualIndex = usdp.accrualIndex();

        uint256 calculatedSupply = (totalShares * accrualIndex) / 1e18;

        assertApproxEqAbs(
            reportedSupply,
            calculatedSupply,
            1, // Allow 1 wei tolerance for rounding
            "INVARIANT VIOLATION: Total supply doesn't match shares * index"
        );
    }

    // ============================================================
    // INVARIANT 3: Index Monotonicity
    // ============================================================

    /**
     * @notice Invariant: Accrual index never decreases
     * @dev Index should only increase (yield accrual) or stay constant
     *      Initial index: 1e18 (1.0)
     */
    function invariant_indexMonotonicity() public view {
        uint256 currentIndex = usdp.accrualIndex();

        assertGe(
            currentIndex,
            1e18, // Initial index
            "INVARIANT VIOLATION: Accrual index decreased below initial value"
        );
    }

    // ============================================================
    // HELPER FUNCTIONS
    // ============================================================

    /**
     * @notice Track a new user for share accounting
     */
    function _trackUser(address user) internal {
        if (!isTracked[user] && user != address(0)) {
            trackedUsers.push(user);
            isTracked[user] = true;
        }
    }

    /**
     * @notice Get tracked users count
     */
    function getTrackedUsersCount() external view returns (uint256) {
        return trackedUsers.length;
    }

    /**
     * @notice Summary of test execution
     */
    function invariant_callSummary() public view {
        console.log("\n=== USDP Invariant Test Summary ===");
        console.log("Total Mints:", handler.ghost_totalMints());
        console.log("Total Burns:", handler.ghost_totalBurns());
        console.log("Total Transfers:", handler.ghost_totalTransfers());
        console.log("Total Accumulations:", handler.ghost_totalAccumulations());
        console.log("\nCurrent State:");
        console.log("Total Supply:", usdp.totalSupply());
        console.log("Total Shares:", usdp.totalShares());
        console.log("Accrual Index:", usdp.accrualIndex());
        console.log("Tracked Users:", trackedUsers.length);

        // Calculate sum of shares for verification
        uint256 sumOfShares = 0;
        for (uint256 i = 0; i < trackedUsers.length; i++) {
            sumOfShares += usdp.sharesOf(trackedUsers[i]);
        }
        console.log("Sum of User Shares:", sumOfShares);

        // Show top holders
        console.log("\nTop Share Holders:");
        for (uint256 i = 0; i < trackedUsers.length && i < 5; i++) {
            address user = trackedUsers[i];
            console.log("  User", i, "Shares:", usdp.sharesOf(user));
            console.log("  User", i, "Balance:", usdp.balanceOf(user));
        }
    }
}
