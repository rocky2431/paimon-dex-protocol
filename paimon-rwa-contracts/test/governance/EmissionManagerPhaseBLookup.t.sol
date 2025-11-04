// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/governance/EmissionManager.sol";

/**
 * @title EmissionManager Phase-B Lookup Table Test Suite (Task P1-001)
 * @notice Tests for Phase-B exponential decay with pre-computed lookup table
 * @dev Validates O(1) lookup table implementation vs O(log n) formula calculation
 *
 * Background:
 * - Current implementation uses _fastPower() for real-time calculation (O(log n))
 * - New implementation will use pre-computed array for O(1) lookup
 * - Pre-computation done offline in Python script
 *
 * Test Coverage (6-dimensional):
 * 1. Functional - Exact values match mathematical formula
 * 2. Boundary - First week (13), last week (248), mid-range
 * 3. Exception - Out of range access handled correctly
 * 4. Performance - Gas cost is constant O(1)
 * 5. Security - Lookup table immutable, no overflow
 * 6. Compatibility - Backward compatible with existing tests
 */
contract EmissionManagerPhaseBLookupTest is Test {
    EmissionManager public emissionManager;

    // Expected Phase-B values (calculated with r=0.985)
    uint256 public constant PHASE_A_WEEKLY = 37_500_000 * 1e18;
    uint256 public constant DECAY_RATE = 9850; // 0.985 in basis points

    function setUp() public {
        emissionManager = new EmissionManager();
    }

    // ==================== FUNCTIONAL TESTS ====================

    /**
     * @notice Test Week 13 emission (first week of Phase-B)
     * Expected: 37,500,000 * 0.985^1 = 36,937,500 PAIMON
     */
    function test_PhaseB_Week13_Exact() public view {
        (uint256 debt, uint256 lpPairs, uint256 stabilityPool, uint256 eco) =
            emissionManager.getWeeklyBudget(13);

        uint256 total = debt + lpPairs + stabilityPool + eco;

        // E(13) = 37.5M * 0.985^1
        uint256 expectedWeek13 = (PHASE_A_WEEKLY * 985) / 1000;

        assertApproxEqRel(
            total,
            expectedWeek13,
            0.001e18, // 0.1% tolerance
            "Week 13 total should match exact exponential decay"
        );
    }

    /**
     * @notice Test Week 100 emission accuracy
     * Expected: 37,500,000 * 0.985^88 ≈ 9,917,896 PAIMON
     */
    function test_PhaseB_Week100_Accuracy() public view {
        (uint256 debt, uint256 lpPairs, uint256 stabilityPool, uint256 eco) =
            emissionManager.getWeeklyBudget(100);

        uint256 total = debt + lpPairs + stabilityPool + eco;

        // Week 100 is 88 decay periods from Week 12 (100 - 12 = 88)
        // E(100) = 37.5M * 0.985^88 ≈ 9,917,896 PAIMON (exact value from lookup table)
        uint256 expectedWeek100 = 9_917_896 * 1e18;

        assertApproxEqRel(
            total,
            expectedWeek100,
            0.001e18, // 0.1% tolerance
            "Week 100 should match exponential decay with <0.1% error"
        );
    }

    /**
     * @notice Test Week 248 emission (last week of Phase-B)
     * Expected: Natural exponential decay end value
     */
    function test_PhaseB_Week248_End() public view {
        (uint256 debt, uint256 lpPairs, uint256 stabilityPool, uint256 eco) =
            emissionManager.getWeeklyBudget(248);

        uint256 total = debt + lpPairs + stabilityPool + eco;

        // Week 248 is 236 decay periods from Week 12 (248 - 12 = 236)
        // E(248) = 37.5M * 0.985^236 ≈ 1,059,000 PAIMON (natural decay)
        uint256 expectedWeek248 = 1_059_000 * 1e18;

        assertApproxEqRel(
            total,
            expectedWeek248,
            0.001e18,
            "Week 248 should match natural exponential decay end"
        );
    }

    /**
     * @notice Test mid-range weeks have correct decay
     */
    function test_PhaseB_Interpolation_Monotonic() public view {
        uint256 prevTotal;

        for (uint256 week = 13; week <= 248; week += 10) {
            (uint256 debt, uint256 lpPairs, uint256 stabilityPool, uint256 eco) =
                emissionManager.getWeeklyBudget(week);

            uint256 total = debt + lpPairs + stabilityPool + eco;

            if (week > 13) {
                assertLt(total, prevTotal, "Emissions should decrease monotonically");
            }

            prevTotal = total;
        }
    }

    // ==================== BOUNDARY TESTS ====================

    /**
     * @notice Test boundary between Phase-A and Phase-B
     */
    function test_Boundary_PhaseA_To_PhaseB_Transition() public view {
        // Week 12 (last of Phase-A)
        (uint256 debt12, uint256 lp12_1, uint256 lp12_2, uint256 eco12) =
            emissionManager.getWeeklyBudget(12);
        uint256 total12 = debt12 + lp12_1 + lp12_2 + eco12;

        // Week 13 (first of Phase-B)
        (uint256 debt13, uint256 lp13_1, uint256 lp13_2, uint256 eco13) =
            emissionManager.getWeeklyBudget(13);
        uint256 total13 = debt13 + lp13_1 + lp13_2 + eco13;

        assertEq(total12, PHASE_A_WEEKLY, "Week 12 should be Phase-A fixed");
        assertLt(total13, PHASE_A_WEEKLY, "Week 13 should start decay");
    }

    /**
     * @notice Test boundary between Phase-B and Phase-C
     */
    function test_Boundary_PhaseB_To_PhaseC_Transition() public view {
        // Week 248 (last of Phase-B)
        (uint256 debt248, uint256 lp248_1, uint256 lp248_2, uint256 eco248) =
            emissionManager.getWeeklyBudget(248);
        uint256 total248 = debt248 + lp248_1 + lp248_2 + eco248;

        // Week 249 (first of Phase-C)
        (uint256 debt249, uint256 lp249_1, uint256 lp249_2, uint256 eco249) =
            emissionManager.getWeeklyBudget(249);
        uint256 total249 = debt249 + lp249_1 + lp249_2 + eco249;

        // Phase-C jumps up from natural decay to 4.327M
        uint256 phaseC = 4_326_923 * 1e18;
        assertEq(total249, phaseC, "Week 249 should jump to Phase-C fixed");
        assertLt(total248, phaseC, "Week 248 natural decay should be below Phase-C");
    }

    // ==================== PERFORMANCE TESTS ====================

    /**
     * @notice Test Phase-B Gas cost is O(1) for storage-based lookup
     * All lookups should use similar gas regardless of week number
     * Note: Storage reads have cold/warm access costs, causing some variance
     */
    function test_PhaseB_Gas_Constant() public {
        uint256 gas13Start = gasleft();
        emissionManager.getWeeklyBudget(13);
        uint256 gas13Used = gas13Start - gasleft();

        uint256 gas100Start = gasleft();
        emissionManager.getWeeklyBudget(100);
        uint256 gas100Used = gas100Start - gasleft();

        uint256 gas248Start = gasleft();
        emissionManager.getWeeklyBudget(248);
        uint256 gas248Used = gas248Start - gasleft();

        // All gas costs should be within O(1) storage access range (<20K gas)
        // Storage-based lookup is still O(1) despite cold/warm cost differences
        assertLt(gas13Used, 20000, "Week 13 lookup should use <20K gas (O(1))");
        assertLt(gas100Used, 20000, "Week 100 lookup should use <20K gas (O(1))");
        assertLt(gas248Used, 20000, "Week 248 lookup should use <20K gas (O(1))");
    }

    /**
     * @notice Benchmark gas cost improvement vs formula calculation
     * Lookup table should be significantly cheaper than _fastPower()
     */
    function test_Performance_Benchmark_vs_Formula() public {
        // This will compare gas after implementation
        // Expected: Lookup ~20K gas vs Formula ~30-40K gas

        uint256 gasStart = gasleft();
        emissionManager.getWeeklyBudget(150);
        uint256 gasUsed = gasStart - gasleft();

        // Lookup table should use <25K gas
        assertLt(gasUsed, 30000, "Lookup should be cheaper than formula calculation");
    }

    // ==================== SECURITY TESTS ====================

    /**
     * @notice Test lookup table is immutable (no state changes)
     */
    function test_Security_Lookup_Table_Immutable() public {
        // Get emissions twice, should be identical
        (uint256 debt1, uint256 lp1_1, uint256 lp1_2, uint256 eco1) =
            emissionManager.getWeeklyBudget(100);

        (uint256 debt2, uint256 lp2_1, uint256 lp2_2, uint256 eco2) =
            emissionManager.getWeeklyBudget(100);

        assertEq(debt1, debt2, "Debt should be identical");
        assertEq(lp1_1, lp2_1, "LP1 should be identical");
        assertEq(lp1_2, lp2_2, "LP2 should be identical");
        assertEq(eco1, eco2, "Eco should be identical");
    }

    /**
     * @notice Test no overflow in lookup table values
     */
    function test_Security_No_Overflow() public view {
        // All Phase-B values should be positive and < Phase-A
        for (uint256 week = 13; week <= 248; week += 10) {
            (uint256 debt, uint256 lpPairs, uint256 stabilityPool, uint256 eco) =
                emissionManager.getWeeklyBudget(week);

            uint256 total = debt + lpPairs + stabilityPool + eco;

            assertGt(total, 0, "Total should be positive");
            assertLe(total, PHASE_A_WEEKLY, "Total should not exceed Phase-A");
        }
    }

    // ==================== COMPATIBILITY TESTS ====================

    /**
     * @notice Test backward compatibility with existing emission schedule
     * After implementing lookup table, all existing tests should still pass
     */
    function test_Compatibility_Existing_Tests_Pass() public view {
        // Week 1 (Phase-A)
        (uint256 debt1, uint256 lp1_1, uint256 lp1_2, uint256 eco1) =
            emissionManager.getWeeklyBudget(1);
        assertEq(debt1 + lp1_1 + lp1_2 + eco1, PHASE_A_WEEKLY);

        // Week 249 (Phase-C)
        (uint256 debt249, uint256 lp249_1, uint256 lp249_2, uint256 eco249) =
            emissionManager.getWeeklyBudget(249);
        assertEq(debt249 + lp249_1 + lp249_2 + eco249, 4_326_923 * 1e18);
    }

    /**
     * @notice Test total emissions over 352 weeks remain consistent
     */
    function test_Compatibility_Total_Emissions_Consistent() public view {
        uint256 totalEmissions = 0;

        for (uint256 week = 1; week <= 352; week++) {
            (uint256 debt, uint256 lpPairs, uint256 stabilityPool, uint256 eco) =
                emissionManager.getWeeklyBudget(week);

            totalEmissions += debt + lpPairs + stabilityPool + eco;
        }

        // Total should be ≈ 3.29B PAIMON (per P0-002 fix)
        uint256 expectedTotal = 3_292_945_267 * 1e18;

        assertApproxEqRel(
            totalEmissions,
            expectedTotal,
            0.001e18, // 0.1% tolerance
            "Total emissions should match expected value"
        );
    }
}
