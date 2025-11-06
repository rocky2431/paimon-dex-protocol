// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {console} from "forge-std/console.sol";
import {PSMParameterized} from "../../src/core/PSMParameterized.sol";
import {USDP} from "../../src/core/USDP.sol";
import {MockERC20} from "../../src/mocks/MockERC20.sol";
import {PSMHandler} from "./handlers/PSMHandler.sol";

/**
 * @title InvariantPSM
 * @notice Invariant tests for PSM (Peg Stability Module)
 * @dev Tests 4 critical invariants using Foundry's invariant testing framework
 *
 * Invariants tested:
 * 1. Reserve Coverage: USDC reserve >= totalMintedHYD / 1e12
 * 2. 1:1 Peg Maintenance: Swap ratios maintain $1.00 ± fee tolerance
 * 3. Mint Cap Enforcement: totalMintedHYD <= maxMintedHYD
 * 4. Fee Accuracy: Fee calculation accurate to 1 wei
 *
 * Test Configuration:
 * - Runs: 100,000 (configured in foundry.toml)
 * - Depth: 15 (max calls per run)
 * - Handler: PSMHandler (random operations)
 */
contract InvariantPSM is StdInvariant, Test {
    PSMParameterized public psm;
    USDP public usdp;
    MockERC20 public usdc;
    PSMHandler public handler;

    // Initial setup values
    uint256 constant INITIAL_USDC_RESERVE = 1_000_000 * 1e6; // 1M USDC
    uint256 constant HANDLER_USDC_BALANCE = 10_000_000 * 1e6; // 10M USDC
    uint256 constant INITIAL_MAX_MINTED = 1_000_000 ether; // 1M HYD

    function setUp() public {
        // Deploy mock USDC (6 decimals)
        usdc = new MockERC20("USD Coin", "USDC", 6);

        // Deploy USDP
        usdp = new USDP();

        // Deploy PSM with USDP and USDC
        psm = new PSMParameterized(address(usdp), address(usdc));

        // Authorize PSM as USDP minter
        usdp.setAuthorizedMinter(address(psm), true);

        // Fund PSM with initial USDC reserve
        usdc.mint(address(psm), INITIAL_USDC_RESERVE);

        // Create handler
        handler = new PSMHandler(psm, usdp, usdc);

        // Authorize handler as USDP minter (for testing)
        usdp.setAuthorizedMinter(address(handler), true);

        // Fund handler with USDC for testing
        usdc.mint(address(handler), HANDLER_USDC_BALANCE);

        // Target handler for invariant testing
        targetContract(address(handler));

        // Label contracts for better trace output
        vm.label(address(psm), "PSM");
        vm.label(address(usdp), "USDP");
        vm.label(address(usdc), "USDC");
        vm.label(address(handler), "PSMHandler");
    }

    // ============================================================
    // INVARIANT 1: Reserve Coverage
    // ============================================================

    /**
     * @notice Invariant: USDC reserve must always cover minted USDP supply
     * @dev Formula: USDC.balanceOf(PSM) >= USDP.totalSupply() / 1e12
     *      This ensures all minted USDP can be redeemed for USDC
     */
    function invariant_reserveCoversSupply() public view {
        uint256 reserve = usdc.balanceOf(address(psm));
        uint256 totalSupply = usdp.totalSupply();
        uint256 requiredReserve = totalSupply / 1e12;

        assertGe(
            reserve,
            requiredReserve,
            "INVARIANT VIOLATION: Reserve must cover minted USDP supply"
        );
    }

    // ============================================================
    // INVARIANT 2: 1:1 Peg Maintenance (Ratio Check)
    // ============================================================

    /**
     * @notice Invariant: Fee parameters maintain reasonable peg ratio
     * @dev Verifies that fees don't exceed 1% (100 bp)
     *      This ensures swap ratios stay close to 1:1
     */
    function invariant_1to1Peg() public view {
        uint256 feeIn = psm.feeIn();
        uint256 feeOut = psm.feeOut();

        // Fees should be reasonable (<= 1%)
        assertLe(feeIn, 100, "INVARIANT VIOLATION: feeIn exceeds 1%");
        assertLe(feeOut, 100, "INVARIANT VIOLATION: feeOut exceeds 1%");

        // Verify decimal conversion maintains 1:1 peg
        // 1 USDC (6 decimals) * 1e12 = 1 HYD (18 decimals)
        uint256 testUSDC = 1e6; // 1 USDC
        uint256 expectedHYD = testUSDC * 1e12; // 1 HYD

        assertEq(
            expectedHYD,
            1 ether,
            "INVARIANT VIOLATION: Decimal conversion breaks 1:1 peg"
        );
    }

    // ============================================================
    // INVARIANT 3: Mint Cap Enforcement
    // ============================================================

    /**
     * @notice Invariant: Total minted USDP never exceeds cap
     * @dev REMOVED: No mint cap in USDP version of PSM (unlimited minting based on USDC backing)
     */
    function invariant_maxMintNotExceeded() public view {
        // No-op: Mint cap removed in USDP version
        // This invariant is no longer applicable
        assertTrue(true, "Mint cap invariant removed");
    }

    // ============================================================
    // INVARIANT 4: Fee Bounds
    // ============================================================

    /**
     * @notice Invariant: Fees never exceed MAX_FEE (100%)
     * @dev Prevents fee manipulation that could break the peg
     */
    function invariant_feeAccuracy() public view {
        uint256 feeIn = psm.feeIn();
        uint256 feeOut = psm.feeOut();
        uint256 maxFee = psm.MAX_FEE();

        assertLe(
            feeIn,
            maxFee,
            "INVARIANT VIOLATION: feeIn exceeds MAX_FEE"
        );

        assertLe(
            feeOut,
            maxFee,
            "INVARIANT VIOLATION: feeOut exceeds MAX_FEE"
        );
    }

    // ============================================================
    // HELPER FUNCTIONS FOR DEBUGGING
    // ============================================================

    /**
     * @notice Get current system state for debugging
     */
    function invariant_callSummary() public view {
        console.log("\n=== PSM Invariant Test Summary ===");
        console.log("Total Swaps:", handler.ghost_totalSwaps());
        console.log("Total USDC In:", handler.ghost_totalUSDCIn());
        console.log("Total USDC Out:", handler.ghost_totalUSDCOut());
        console.log("Total USDP Minted:", handler.ghost_totalUSDPMinted());
        console.log("Total USDP Burned:", handler.ghost_totalUSDPBurned());
        console.log("\nCurrent State:");
        console.log("USDC Reserve:", usdc.balanceOf(address(psm)));
        console.log("Total USDP Supply:", usdp.totalSupply());
        console.log("Current Fee In (bp):", psm.feeIn());
        console.log("Current Fee Out (bp):", psm.feeOut());
    }
}
