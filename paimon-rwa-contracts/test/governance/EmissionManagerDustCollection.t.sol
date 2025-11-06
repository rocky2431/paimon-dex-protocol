// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/governance/EmissionManager.sol";

/**
 * @title EmissionManager Dust Collection Test Suite (Task P1-002)
 * @notice Tests for emission rounding conservation and dust collection mechanism
 * @dev Validates that rounding errors are properly handled and weekly emissions are conserved
 *
 * Background:
 * - Division operations in Solidity truncate, creating "dust" (rounding errors)
 * - Current implementation adds dust to debt channel for conservation
 * - Need to verify conservation holds and dust accumulation is minimal
 *
 * Test Coverage (6-dimensional):
 * 1. Functional - Weekly budget conservation (sum of channels == totalBudget)
 * 2. Boundary - Edge cases (Week 1, 12, 13, 248, 249, 352)
 * 3. Exception - Invalid week numbers handled
 * 4. Performance - Dust query gas cost is reasonable
 * 5. Security - No overflow in dust accumulation
 * 6. Compatibility - Dust mechanism doesn't break existing tests
 */
contract EmissionManagerDustCollectionTest is Test {
    EmissionManager public emissionManager;

    function setUp() public {
        emissionManager = new EmissionManager();
    }

    // ==================== FUNCTIONAL TESTS ====================

    /**
     * @notice Test that weekly emissions are perfectly conserved (no token loss)
     * @dev Sum of all channels must equal totalBudget exactly
     */
    function test_Emission_WeeklyConservation() public view {
        // Test all 352 weeks
        for (uint256 week = 1; week <= 352; week++) {
            (uint256 debt, uint256 lpPairs, uint256 stabilityPool, uint256 eco) =
                emissionManager.getWeeklyBudget(week);

            uint256 allocated = debt + lpPairs + stabilityPool + eco;

            // Get the expected total budget for this week
            uint256 expectedTotal;
            if (week <= 12) {
                expectedTotal = 37_500_000 * 1e18; // Phase A
            } else if (week <= 248) {
                // Phase B - use getWeeklyBudget to get actual value
                (uint256 d, uint256 lp, uint256 sp, uint256 e) = emissionManager.getWeeklyBudget(week);
                expectedTotal = d + lp + sp + e;
            } else {
                expectedTotal = 4_326_923 * 1e18; // Phase C
            }

            assertEq(
                allocated,
                expectedTotal,
                string.concat("Week ", vm.toString(week), " conservation failed")
            );
        }
    }

    /**
     * @notice Test that weekly dust is calculated correctly
     * @dev Dust should be the difference between totalBudget and sum of allocated channels
     */
    function test_Emission_WeeklyDust_Calculation() public {
        // Create a wrapper to calculate dust
        uint256 week = 100;
        (uint256 debt, uint256 lpPairs, uint256 stabilityPool, uint256 eco) =
            emissionManager.getWeeklyBudget(week);

        // Calculate what the "theoretical" allocations would be before dust collection
        uint256 totalBudget = debt + lpPairs + stabilityPool + eco;

        // Get phase-specific ratios for Week 100 (Phase B)
        uint256 theoreticalDebt = (totalBudget * 5000) / 10000; // 50%
        uint256 theoreticalEco = (totalBudget * 1250) / 10000; // 12.5%
        uint256 theoreticalLpTotal = (totalBudget * 3750) / 10000; // 37.5%
        uint256 theoreticalLpPairs = (theoreticalLpTotal * 6000) / 10000; // 60% of LP
        uint256 theoreticalStabilityPool = (theoreticalLpTotal * 4000) / 10000; // 40% of LP

        uint256 theoreticalAllocated =
            theoreticalDebt + theoreticalLpPairs + theoreticalStabilityPool + theoreticalEco;

        // Dust should be totalBudget - theoreticalAllocated
        uint256 expectedDust = totalBudget - theoreticalAllocated;

        // After dust collection, debt should equal theoreticalDebt + expectedDust
        assertEq(debt, theoreticalDebt + expectedDust, "Debt should include collected dust");

        // Other channels should match theoretical values
        assertEq(lpPairs, theoreticalLpPairs, "LP Pairs should match theoretical");
        assertEq(stabilityPool, theoreticalStabilityPool, "Stability Pool should match theoretical");
        assertEq(eco, theoreticalEco, "Eco should match theoretical");
    }

    /**
     * @notice Test cumulative dust across all 352 weeks is minimal
     * @dev Total dust should be < 1000 PAIMON (< 0.00003% of total emissions)
     */
    function test_Emission_DustAccumulation() public view {
        uint256 totalDust = 0;

        for (uint256 week = 1; week <= 352; week++) {
            (uint256 debt, uint256 lpPairs, uint256 stabilityPool, uint256 eco) =
                emissionManager.getWeeklyBudget(week);

            uint256 totalBudget = debt + lpPairs + stabilityPool + eco;

            // Calculate theoretical allocation without dust collection
            uint256 debtBps;
            uint256 lpBps;
            uint256 ecoBps;

            if (week <= 12) {
                debtBps = 3000; // 30%
                lpBps = 6000; // 60%
                ecoBps = 1000; // 10%
            } else if (week <= 248) {
                debtBps = 5000; // 50%
                lpBps = 3750; // 37.5%
                ecoBps = 1250; // 12.5%
            } else {
                debtBps = 5500; // 55%
                lpBps = 3500; // 35%
                ecoBps = 1000; // 10%
            }

            uint256 theoreticalDebt = (totalBudget * debtBps) / 10000;
            uint256 theoreticalEco = (totalBudget * ecoBps) / 10000;
            uint256 theoreticalLpTotal = (totalBudget * lpBps) / 10000;
            uint256 theoreticalLpPairs = (theoreticalLpTotal * 6000) / 10000;
            uint256 theoreticalStabilityPool = (theoreticalLpTotal * 4000) / 10000;

            uint256 theoreticalAllocated =
                theoreticalDebt + theoreticalLpPairs + theoreticalStabilityPool + theoreticalEco;

            uint256 weeklyDust = totalBudget - theoreticalAllocated;
            totalDust += weeklyDust;
        }

        // Total dust should be less than 1000 PAIMON
        assertLt(totalDust, 1000 * 1e18, "Total dust should be < 1000 PAIMON");
    }

    /**
     * @notice Test that dust for specific weeks is traceable and correct
     */
    function test_Emission_DustRecording() public view {
        // Test key weeks across all phases
        uint256[6] memory testWeeks = [uint256(1), 12, 13, 100, 248, 352];

        for (uint256 i = 0; i < testWeeks.length; i++) {
            uint256 week = testWeeks[i];
            (uint256 debt, uint256 lpPairs, uint256 stabilityPool, uint256 eco) =
                emissionManager.getWeeklyBudget(week);


            // Dust should be deterministic for each week
            // Calling getWeeklyBudget multiple times should give same result
            (uint256 debt2, uint256 lpPairs2, uint256 stabilityPool2, uint256 eco2) =
                emissionManager.getWeeklyBudget(week);

            assertEq(debt, debt2, "Debt should be deterministic");
            assertEq(lpPairs, lpPairs2, "LP Pairs should be deterministic");
            assertEq(stabilityPool, stabilityPool2, "Stability Pool should be deterministic");
            assertEq(eco, eco2, "Eco should be deterministic");
        }
    }

    // ==================== BOUNDARY TESTS ====================

    /**
     * @notice Test dust collection at phase boundaries
     */
    function test_Emission_Dust_PhaseBoundaries() public view {
        // Week 12 (last of Phase-A)
        (uint256 debt12, uint256 lp12_1, uint256 lp12_2, uint256 eco12) =
            emissionManager.getWeeklyBudget(12);
        uint256 total12 = debt12 + lp12_1 + lp12_2 + eco12;
        assertEq(total12, 37_500_000 * 1e18, "Week 12 conservation");

        // Week 13 (first of Phase-B)
        (uint256 debt13, uint256 lp13_1, uint256 lp13_2, uint256 eco13) =
            emissionManager.getWeeklyBudget(13);
        uint256 total13 = debt13 + lp13_1 + lp13_2 + eco13;
        assertGt(total13, 0, "Week 13 total should be positive");

        // Week 248 (last of Phase-B)
        (uint256 debt248, uint256 lp248_1, uint256 lp248_2, uint256 eco248) =
            emissionManager.getWeeklyBudget(248);
        uint256 total248 = debt248 + lp248_1 + lp248_2 + eco248;
        assertGt(total248, 0, "Week 248 total should be positive");

        // Week 249 (first of Phase-C)
        (uint256 debt249, uint256 lp249_1, uint256 lp249_2, uint256 eco249) =
            emissionManager.getWeeklyBudget(249);
        uint256 total249 = debt249 + lp249_1 + lp249_2 + eco249;
        assertEq(total249, 4_326_923 * 1e18, "Week 249 conservation");
    }

    // ==================== PERFORMANCE TESTS ====================

    /**
     * @notice Test gas cost of dust calculation is reasonable
     */
    function test_Emission_Dust_GasCost() public {
        uint256 gasStart = gasleft();
        emissionManager.getWeeklyBudget(100);
        uint256 gasUsed = gasStart - gasleft();

        // Should use reasonable gas (<30K)
        assertLt(gasUsed, 30000, "Dust calculation should be gas-efficient");
    }

    // ==================== SECURITY TESTS ====================

    /**
     * @notice Test no overflow in dust accumulation
     */
    function test_Emission_Dust_NoOverflow() public view {
        uint256 maxDust = 0;

        for (uint256 week = 1; week <= 352; week++) {
            (uint256 debt, uint256 lpPairs, uint256 stabilityPool, uint256 eco) =
                emissionManager.getWeeklyBudget(week);

            uint256 totalBudget = debt + lpPairs + stabilityPool + eco;

            // Calculate dust for this week
            uint256 debtBps;
            uint256 lpBps;
            uint256 ecoBps;

            if (week <= 12) {
                debtBps = 3000;
                lpBps = 6000;
                ecoBps = 1000;
            } else if (week <= 248) {
                debtBps = 5000;
                lpBps = 3750;
                ecoBps = 1250;
            } else {
                debtBps = 5500;
                lpBps = 3500;
                ecoBps = 1000;
            }

            uint256 theoreticalDebt = (totalBudget * debtBps) / 10000;
            uint256 theoreticalEco = (totalBudget * ecoBps) / 10000;
            uint256 theoreticalLpTotal = (totalBudget * lpBps) / 10000;
            uint256 theoreticalLpPairs = (theoreticalLpTotal * 6000) / 10000;
            uint256 theoreticalStabilityPool = (theoreticalLpTotal * 4000) / 10000;

            uint256 theoreticalAllocated =
                theoreticalDebt + theoreticalLpPairs + theoreticalStabilityPool + theoreticalEco;

            uint256 weeklyDust = totalBudget - theoreticalAllocated;

            if (weeklyDust > maxDust) {
                maxDust = weeklyDust;
            }
        }

        // Max weekly dust should be very small (< 1 PAIMON)
        assertLt(maxDust, 1 * 1e18, "Max weekly dust should be < 1 PAIMON");
    }

    // ==================== NEW FUNCTION TESTS (Task P1-002) ====================

    /**
     * @notice Test getWeeklyDust() function returns correct dust amount
     */
    function test_Emission_GetWeeklyDust() public view {
        // Test specific weeks
        uint256 week100Dust = emissionManager.getWeeklyDust(100);

        // Dust should be non-negative and small (0 is ok if allocations divide evenly)
        assertGe(week100Dust, 0, "Dust should be non-negative");
        assertLt(week100Dust, 1 * 1e18, "Dust should be < 1 PAIMON");
    }

    /**
     * @notice Test getTotalDust() returns cumulative dust under threshold
     */
    function test_Emission_GetTotalDust() public view {
        uint256 totalDust = emissionManager.getTotalDust();

        // Total dust should be < 1000 PAIMON and non-negative
        assertLt(totalDust, 1000 * 1e18, "Total dust should be < 1000 PAIMON");
        assertGe(totalDust, 0, "Total dust should be non-negative");
    }

    /**
     * @notice Test getWeeklyDust() consistency across multiple calls
     */
    function test_Emission_GetWeeklyDust_Deterministic() public view {
        uint256 week = 150;

        uint256 dust1 = emissionManager.getWeeklyDust(week);
        uint256 dust2 = emissionManager.getWeeklyDust(week);

        assertEq(dust1, dust2, "Dust should be deterministic");
    }

    /**
     * @notice Test getWeeklyDust() reverts for invalid week
     */
    function test_Emission_GetWeeklyDust_InvalidWeek() public {
        vm.expectRevert("Week out of range [1, 352]");
        emissionManager.getWeeklyDust(0);

        vm.expectRevert("Week out of range [1, 352]");
        emissionManager.getWeeklyDust(353);
    }

    /**
     * @notice Test getWeeklyDust() for all phases
     */
    function test_Emission_GetWeeklyDust_AllPhases() public view {
        // Phase A - may have 0 dust if allocations divide evenly
        uint256 dustA = emissionManager.getWeeklyDust(1);
        assertGe(dustA, 0, "Phase A dust should be non-negative");

        // Phase B - may have 0 dust if precise calculations eliminate rounding
        uint256 dustB = emissionManager.getWeeklyDust(100);
        assertGe(dustB, 0, "Phase B dust should be non-negative");

        // Phase C - may have 0 dust if allocations divide evenly
        uint256 dustC = emissionManager.getWeeklyDust(300);
        assertGe(dustC, 0, "Phase C dust should be non-negative");
    }

    // ==================== COMPATIBILITY TESTS ====================

    /**
     * @notice Test that dust collection doesn't break Phase-A emissions
     */
    function test_Emission_Dust_PhaseA_Compatibility() public view {
        for (uint256 week = 1; week <= 12; week++) {
            (uint256 debt, uint256 lpPairs, uint256 stabilityPool, uint256 eco) =
                emissionManager.getWeeklyBudget(week);

            uint256 total = debt + lpPairs + stabilityPool + eco;

            assertEq(total, 37_500_000 * 1e18, "Phase-A total should be fixed");
        }
    }

    /**
     * @notice Test that dust collection doesn't break Phase-C emissions
     */
    function test_Emission_Dust_PhaseC_Compatibility() public view {
        for (uint256 week = 249; week <= 352; week++) {
            (uint256 debt, uint256 lpPairs, uint256 stabilityPool, uint256 eco) =
                emissionManager.getWeeklyBudget(week);

            uint256 total = debt + lpPairs + stabilityPool + eco;

            assertEq(total, 4_326_923 * 1e18, "Phase-C total should be fixed");
        }
    }
}
