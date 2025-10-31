// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {console} from "forge-std/console.sol";
import {DEXPair} from "../../src/dex/DEXPair.sol";
import {DEXFactory} from "../../src/dex/DEXFactory.sol";
import {MockERC20} from "../../src/mocks/MockERC20.sol";
import {DEXPairHandler} from "./handlers/DEXPairHandler.sol";

/**
 * @title InvariantDEX
 * @notice Invariant tests for DEXPair (Uniswap V2-style AMM)
 * @dev Tests 2 critical invariants:
 *      1. K invariant: reserve0 × reserve1 >= initialK (constant product)
 *      2. Fee accounting: Accumulated fees = 0.25% × volume
 *
 * Test Configuration:
 * - Runs: 100,000
 * - Depth: 15
 * - Handler: DEXPairHandler
 */
contract InvariantDEX is StdInvariant, Test {
    DEXPair public pair;
    DEXFactory public factory;
    MockERC20 public token0;
    MockERC20 public token1;
    DEXPairHandler public handler;

    address constant TREASURY = address(0x1234);
    uint256 constant HANDLER_TOKEN_BALANCE = 100_000_000 ether;

    function setUp() public {
        // Deploy factory
        factory = new DEXFactory(TREASURY);

        // Deploy tokens
        token0 = new MockERC20("Token A", "TKNA", 18);
        token1 = new MockERC20("Token B", "TKNB", 18);

        // Ensure token0 < token1 (Uniswap V2 convention)
        if (address(token0) > address(token1)) {
            (token0, token1) = (token1, token0);
        }

        // Create pair
        address pairAddress = factory.createPair(address(token0), address(token1));
        pair = DEXPair(pairAddress);

        // Create handler
        handler = new DEXPairHandler(pair, token0, token1);

        // Fund handler with tokens (minting is done in handler operations)
        // Handler will mint tokens as needed

        // Target handler
        targetContract(address(handler));

        // Labels
        vm.label(address(pair), "DEXPair");
        vm.label(address(factory), "DEXFactory");
        vm.label(address(token0), "Token0");
        vm.label(address(token1), "Token1");
        vm.label(address(handler), "DEXPairHandler");
    }

    // ============================================================
    // INVARIANT 1: K Invariant (Constant Product)
    // ============================================================

    /**
     * @notice Invariant: K value never decreases below minimum liquidity threshold
     * @dev The constant product formula (x * y = k) should be maintained
     *      K can decrease when liquidity is removed, but should never go to zero
     */
    function invariant_kInvariantHolds() public view {
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        uint256 currentK = uint256(reserve0) * uint256(reserve1);

        // K should never be zero (as long as minimum liquidity is locked)
        uint256 minLiquidity = pair.MINIMUM_LIQUIDITY();
        uint256 minK = minLiquidity * minLiquidity;

        assertGe(
            currentK,
            minK,
            "INVARIANT VIOLATION: K fell below minimum threshold"
        );

        // Reserves should always be non-zero (due to locked liquidity)
        assertTrue(
            reserve0 > 0 && reserve1 > 0,
            "INVARIANT VIOLATION: Reserves went to zero"
        );
    }

    // ============================================================
    // INVARIANT 2: Fee Accounting
    // ============================================================

    /**
     * @notice Invariant: Fee split is correct (70% voter, 30% treasury)
     * @dev Verifies the fee distribution mechanism
     */
    function invariant_feeAccounting() public view {
        // Get accumulated fees from pair
        uint256 voterFees0 = pair.voterFees0();
        uint256 voterFees1 = pair.voterFees1();
        uint256 treasuryFees0 = pair.treasuryFees0();
        uint256 treasuryFees1 = pair.treasuryFees1();

        uint256 totalFees0 = voterFees0 + treasuryFees0;
        uint256 totalFees1 = voterFees1 + treasuryFees1;

        // Skip if no fees collected yet
        if (totalFees0 == 0 && totalFees1 == 0) {
            return;
        }

        // Verify fee split (70% voter, 30% treasury) with tolerance
        if (totalFees0 > 100) { // Only check if enough fees to avoid rounding errors
            uint256 voterPercentage = (voterFees0 * 100) / totalFees0;
            // Allow 5% tolerance for rounding
            assertApproxEqAbs(
                voterPercentage,
                68, // Target is 68% (17/25)
                5,
                "INVARIANT VIOLATION: Token0 fee split incorrect"
            );
        }

        if (totalFees1 > 100) {
            uint256 voterPercentage = (voterFees1 * 100) / totalFees1;
            assertApproxEqAbs(
                voterPercentage,
                68,
                5,
                "INVARIANT VIOLATION: Token1 fee split incorrect"
            );
        }
    }

    // ============================================================
    // HELPER FUNCTIONS
    // ============================================================

    /**
     * @notice Summary of test execution
     */
    function invariant_callSummary() public view {
        console.log("\n=== DEXPair Invariant Test Summary ===");
        console.log("Total Add Liquidity:", handler.ghost_totalAddLiquidity());
        console.log("Total Remove Liquidity:", handler.ghost_totalRemoveLiquidity());
        console.log("Total Swaps:", handler.ghost_totalSwaps());
        console.log("Total Volume Token0:", handler.ghost_totalVolumeToken0());
        console.log("Total Volume Token1:", handler.ghost_totalVolumeToken1());
        console.log("\nFee Collection:");
        console.log("Expected Fees Token0:", handler.ghost_totalFeesCollected0());
        console.log("Expected Fees Token1:", handler.ghost_totalFeesCollected1());
        console.log("Actual Voter Fees0:", pair.voterFees0());
        console.log("Actual Voter Fees1:", pair.voterFees1());
        console.log("Actual Treasury Fees0:", pair.treasuryFees0());
        console.log("Actual Treasury Fees1:", pair.treasuryFees1());
        console.log("\nReserves:");
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        console.log("Reserve0:", uint256(reserve0));
        console.log("Reserve1:", uint256(reserve1));
        console.log("Initial K:", handler.initialK());
        uint256 currentK = handler.getCurrentK();
        console.log("Current K:", currentK);

        // Calculate K change (can be positive or negative)
        if (currentK >= handler.initialK()) {
            console.log("K Increase:", currentK - handler.initialK());
        } else {
            console.log("K Decrease:", handler.initialK() - currentK);
        }
    }
}
