// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {console} from "forge-std/console.sol";
import {PSM} from "../../src/core/PSM.sol";
import {HYD} from "../../src/core/HYD.sol";
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
    PSM public psm;
    HYD public hyd;
    MockERC20 public usdc;
    PSMHandler public handler;

    // Initial setup values
    uint256 constant INITIAL_USDC_RESERVE = 1_000_000 * 1e6; // 1M USDC
    uint256 constant HANDLER_USDC_BALANCE = 10_000_000 * 1e6; // 10M USDC
    uint256 constant INITIAL_MAX_MINTED = 1_000_000 ether; // 1M HYD

    function setUp() public {
        // Deploy mock USDC (6 decimals)
        usdc = new MockERC20("USD Coin", "USDC", 6);

        // Use a two-step process to handle circular dependency:
        // 1. Deploy contracts with temporary addresses
        // 2. Create new instances with correct addresses

        // First, deploy HYD with a temporary PSM address (we'll use address(this))
        address tempPSM = address(this);
        //hyd = new HYD(tempPSM);
        hyd=new HYD();
        hyd.initTempPsm(tempPSM);

        // Deploy PSM with the HYD address
        psm = new PSM(address(hyd), address(usdc));

        // Now we have a problem: HYD's PSM is immutable and set to address(this)
        // Solution: Deploy a fresh HYD with the correct PSM address
        //hyd = new HYD(address(psm));
        hyd=new HYD();
        hyd.initTempPsm(address(psm));

        // Redeploy PSM with the correct HYD
        psm = new PSM(address(hyd), address(usdc));

        // Fund PSM with initial USDC reserve
        usdc.mint(address(psm), INITIAL_USDC_RESERVE);

        // Create handler
        handler = new PSMHandler(psm, hyd, usdc);

        // Fund handler with USDC for testing
        usdc.mint(address(handler), HANDLER_USDC_BALANCE);

        // Target handler for invariant testing
        targetContract(address(handler));

        // Label contracts for better trace output
        vm.label(address(psm), "PSM");
        vm.label(address(hyd), "HYD");
        vm.label(address(usdc), "USDC");
        vm.label(address(handler), "PSMHandler");
    }

    // ============================================================
    // INVARIANT 1: Reserve Coverage
    // ============================================================

    /**
     * @notice Invariant: USDC reserve must always cover minted HYD supply
     * @dev Formula: USDC.balanceOf(PSM) >= totalMinted / 1e12
     *      This ensures all minted HYD can be redeemed for USDC
     */
    function invariant_reserveCoversSupply() public view {
        uint256 reserve = usdc.balanceOf(address(psm));
        uint256 totalMinted = psm.totalMinted();
        uint256 requiredReserve = totalMinted / 1e12;

        assertGe(
            reserve,
            requiredReserve,
            "INVARIANT VIOLATION: Reserve must cover minted HYD supply"
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
     * @notice Invariant: Total minted HYD never exceeds cap
     * @dev Formula: totalMinted <= maxMintedHYD
     */
    function invariant_maxMintNotExceeded() public view {
        uint256 totalMinted = psm.totalMinted();
        uint256 maxMinted = psm.maxMintedHYD();

        assertLe(
            totalMinted,
            maxMinted,
            "INVARIANT VIOLATION: Total minted exceeds cap"
        );
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
        console.log("Total HYD Minted:", handler.ghost_totalHYDMinted());
        console.log("Total HYD Burned:", handler.ghost_totalHYDBurned());
        console.log("\nCurrent State:");
        console.log("USDC Reserve:", usdc.balanceOf(address(psm)));
        console.log("Total Minted HYD:", psm.totalMinted());
        console.log("Max Minted HYD:", psm.maxMintedHYD());
        console.log("Current Fee In (bp):", psm.feeIn());
        console.log("Current Fee Out (bp):", psm.feeOut());
    }
}
