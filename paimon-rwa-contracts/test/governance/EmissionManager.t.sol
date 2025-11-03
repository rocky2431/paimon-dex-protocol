// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/governance/EmissionManager.sol";

/**
 * @title EmissionManager Test Suite
 * @notice Comprehensive 6-dimensional test coverage for EmissionManager contract
 * @dev Tests cover:
 *      - Functional: Core emission logic, 3-phase model, 4-channel budget
 *      - Boundary: Edge cases at phase transitions (weeks 1, 12, 13, 248, 249, 352)
 *      - Exception: Invalid inputs, access control, parameter validation
 *      - Performance: Gas benchmarks for getWeeklyBudget calls
 *      - Security: Access control, governance safety
 *      - Compatibility: Integration with other protocol contracts
 */
contract EmissionManagerTest is Test {
    EmissionManager public emissionManager;

    // Test accounts
    address public owner;
    address public user;
    address public governance;

    // Constants (per whitepaper specification)
    uint256 public constant PHASE_A_WEEKLY = 37_500_000 * 1e18; // 37.5M per week
    uint256 public constant PHASE_C_WEEKLY = 4_326_923 * 1e18; // 4.327M per week
    uint256 public constant PHASE_A_END = 12; // Week 12 is last week of Phase A
    uint256 public constant PHASE_B_END = 248; // Week 248 is last week of Phase B
    uint256 public constant PHASE_C_END = 352; // Week 352 is last week of Phase C

    // Default LP split parameters (basis points)
    uint16 public constant DEFAULT_LP_PAIRS_BPS = 6000; // 60%
    uint16 public constant DEFAULT_STABILITY_POOL_BPS = 4000; // 40%

    function setUp() public {
        owner = address(this);
        user = makeAddr("user");
        governance = makeAddr("governance");

        // Deploy EmissionManager
        emissionManager = new EmissionManager();
    }

    // ==================== Dimension 1: Functional Tests ====================

    /**
     * @notice Test Phase A emission (Week 1-12): Fixed 37.5M per week
     */
    function test_Functional_PhaseA_FixedEmission() public view {
        for (uint256 week = 1; week <= PHASE_A_END; week++) {
            (uint256 debt, uint256 lpPairs, uint256 stabilityPool, uint256 eco) =
                emissionManager.getWeeklyBudget(week);

            uint256 totalBudget = debt + lpPairs + stabilityPool + eco;
            assertEq(totalBudget, PHASE_A_WEEKLY, "Phase A weekly budget should be 37.5M");
        }
    }

    /**
     * @notice Test Phase C emission (Week 249-352): Fixed 4.327M per week
     */
    function test_Functional_PhaseC_FixedEmission() public view {
        for (uint256 week = 249; week <= PHASE_C_END; week++) {
            (uint256 debt, uint256 lpPairs, uint256 stabilityPool, uint256 eco) =
                emissionManager.getWeeklyBudget(week);

            uint256 totalBudget = debt + lpPairs + stabilityPool + eco;
            assertEq(totalBudget, PHASE_C_WEEKLY, "Phase C weekly budget should be 4.327M");
        }
    }

    /**
     * @notice Test Phase B emission (Week 13-248): Exponential decay
     */
    function test_Functional_PhaseB_ExponentialDecay() public view {
        uint256 prevBudget = PHASE_A_WEEKLY;

        for (uint256 week = 13; week <= PHASE_B_END; week++) {
            (uint256 debt, uint256 lpPairs, uint256 stabilityPool, uint256 eco) =
                emissionManager.getWeeklyBudget(week);

            uint256 currentBudget = debt + lpPairs + stabilityPool + eco;

            // Budget should be monotonically decreasing
            assertLt(currentBudget, prevBudget, "Phase B budget should decay");

            // Budget eventually falls below Phase C level (natural decay result)
            // Week 248: ~1.059M < Phase C: 4.327M

            prevBudget = currentBudget;
        }
    }

    /**
     * @notice Test four-channel budget allocation
     */
    function test_Functional_FourChannelBudgetAllocation() public view {
        (uint256 debt, uint256 lpPairs, uint256 stabilityPool, uint256 eco) = emissionManager.getWeeklyBudget(1);

        // All channels should be non-zero
        assertGt(debt, 0, "Debt channel should be non-zero");
        assertGt(lpPairs, 0, "LP Pairs channel should be non-zero");
        assertGt(stabilityPool, 0, "Stability Pool channel should be non-zero");
        assertGt(eco, 0, "Eco channel should be non-zero");

        // Total should equal weekly budget
        uint256 total = debt + lpPairs + stabilityPool + eco;
        assertEq(total, PHASE_A_WEEKLY, "Four channels should sum to total budget");
    }

    /**
     * @notice Test LP secondary split adjustment
     */
    function test_Functional_LpSplitAdjustment() public {
        // Get initial budget
        (, uint256 initialLpPairs, uint256 initialStabilityPool,) = emissionManager.getWeeklyBudget(1);

        uint256 initialLpTotal = initialLpPairs + initialStabilityPool;

        // Adjust LP split to 70/30
        emissionManager.setLpSplitParams(7000, 3000);

        // Get new budget
        (, uint256 newLpPairs, uint256 newStabilityPool,) = emissionManager.getWeeklyBudget(1);

        uint256 newLpTotal = newLpPairs + newStabilityPool;

        // Total LP allocation should remain the same
        assertEq(newLpTotal, initialLpTotal, "Total LP allocation should remain constant");

        // Check proportions (allowing 1% tolerance for rounding)
        uint256 lpPairsRatio = (newLpPairs * 10000) / newLpTotal;
        assertApproxEqRel(lpPairsRatio, 7000, 0.01e18, "LP Pairs should be 70%");

        uint256 stabilityPoolRatio = (newStabilityPool * 10000) / newLpTotal;
        assertApproxEqRel(stabilityPoolRatio, 3000, 0.01e18, "Stability Pool should be 30%");
    }

    /**
     * @notice Test total emission across all 352 weeks
     */
    function test_Functional_TotalEmissionAcrossAllWeeks() public view {
        uint256 totalEmission = 0;

        for (uint256 week = 1; week <= PHASE_C_END; week++) {
            (uint256 debt, uint256 lpPairs, uint256 stabilityPool, uint256 eco) =
                emissionManager.getWeeklyBudget(week);

            totalEmission += (debt + lpPairs + stabilityPool + eco);
        }

        // Expected total with exponential decay r=0.985: ~3.29B
        uint256 expectedTotal = 3_292_945_267 * 1e18;

        // Allow 1% tolerance for decay calculations
        assertApproxEqRel(totalEmission, expectedTotal, 0.01e18, "Total emission should be ~3.29B");
    }

    // ==================== Dimension 2: Boundary Tests ====================

    /**
     * @notice Test Week 0 (should revert or return zero)
     */
    function test_Boundary_Week0_Reverts() public {
        vm.expectRevert();
        emissionManager.getWeeklyBudget(0);
    }

    /**
     * @notice Test Week 1 (first week of Phase A)
     */
    function test_Boundary_Week1_PhaseAStart() public view {
        (uint256 debt, uint256 lpPairs, uint256 stabilityPool, uint256 eco) = emissionManager.getWeeklyBudget(1);

        uint256 total = debt + lpPairs + stabilityPool + eco;
        assertEq(total, PHASE_A_WEEKLY, "Week 1 should emit 37.5M");
    }

    /**
     * @notice Test Week 12 (last week of Phase A)
     */
    function test_Boundary_Week12_PhaseAEnd() public view {
        (uint256 debt, uint256 lpPairs, uint256 stabilityPool, uint256 eco) = emissionManager.getWeeklyBudget(12);

        uint256 total = debt + lpPairs + stabilityPool + eco;
        assertEq(total, PHASE_A_WEEKLY, "Week 12 should emit 37.5M");
    }

    /**
     * @notice Test Week 13 (first week of Phase B - decay starts)
     */
    function test_Boundary_Week13_PhaseBStart() public view {
        (uint256 debt12, uint256 lpPairs12, uint256 stabilityPool12, uint256 eco12) =
            emissionManager.getWeeklyBudget(12);
        (uint256 debt13, uint256 lpPairs13, uint256 stabilityPool13, uint256 eco13) =
            emissionManager.getWeeklyBudget(13);

        uint256 total12 = debt12 + lpPairs12 + stabilityPool12 + eco12;
        uint256 total13 = debt13 + lpPairs13 + stabilityPool13 + eco13;

        // Week 13 should be less than Week 12 (decay starts)
        assertLt(total13, total12, "Week 13 should have lower emission than Week 12");
    }

    /**
     * @notice Test Week 248 (last week of Phase B)
     */
    function test_Boundary_Week248_PhaseBEnd() public view {
        (uint256 debt, uint256 lpPairs, uint256 stabilityPool, uint256 eco) = emissionManager.getWeeklyBudget(248);

        uint256 total = debt + lpPairs + stabilityPool + eco;

        // Exponential decay result: E(248) = 37.5M * 0.985^236 ≈ 1.059M
        uint256 expectedWeek248 = 1_059_209 * 1e18;
        assertApproxEqRel(total, expectedWeek248, 0.01e18, "Week 248 should equal decay result ~1.059M");
    }

    /**
     * @notice Test Week 249 (first week of Phase C)
     */
    function test_Boundary_Week249_PhaseCStart() public view {
        (uint256 debt, uint256 lpPairs, uint256 stabilityPool, uint256 eco) = emissionManager.getWeeklyBudget(249);

        uint256 total = debt + lpPairs + stabilityPool + eco;
        assertEq(total, PHASE_C_WEEKLY, "Week 249 should emit 4.327M");
    }

    /**
     * @notice Test Week 352 (last week of Phase C)
     */
    function test_Boundary_Week352_PhaseCEnd() public view {
        (uint256 debt, uint256 lpPairs, uint256 stabilityPool, uint256 eco) = emissionManager.getWeeklyBudget(352);

        uint256 total = debt + lpPairs + stabilityPool + eco;
        assertEq(total, PHASE_C_WEEKLY, "Week 352 should emit 4.327M");
    }

    /**
     * @notice Test Week 353 (beyond emission schedule - should revert or return zero)
     */
    function test_Boundary_Week353_BeyondSchedule() public {
        vm.expectRevert();
        emissionManager.getWeeklyBudget(353);
    }

    /**
     * @notice Test maximum week number
     */
    function test_Boundary_MaxWeek_ReturnsZero() public {
        vm.expectRevert();
        emissionManager.getWeeklyBudget(type(uint256).max);
    }

    /**
     * @notice Test LP split parameters at boundary values
     */
    function test_Boundary_LpSplitParams_ZeroValues() public {
        // Setting 100/0 split should work
        emissionManager.setLpSplitParams(10000, 0);

        (, uint256 lpPairs, uint256 stabilityPool,) = emissionManager.getWeeklyBudget(1);

        assertGt(lpPairs, 0, "LP Pairs should get 100%");
        assertEq(stabilityPool, 0, "Stability Pool should get 0%");
    }

    /**
     * @notice Test LP split parameters at maximum values
     */
    function test_Boundary_LpSplitParams_MaxValues() public {
        // Setting 0/100 split should work
        emissionManager.setLpSplitParams(0, 10000);

        (, uint256 lpPairs, uint256 stabilityPool,) = emissionManager.getWeeklyBudget(1);

        assertEq(lpPairs, 0, "LP Pairs should get 0%");
        assertGt(stabilityPool, 0, "Stability Pool should get 100%");
    }

    // ==================== Dimension 3: Exception Tests ====================

    /**
     * @notice Test setLpSplitParams with invalid sum (not 100%)
     */
    function test_Exception_SetLpSplitParams_InvalidSum() public {
        vm.expectRevert();
        emissionManager.setLpSplitParams(6000, 3000); // Sum = 9000, not 10000
    }

    /**
     * @notice Test setLpSplitParams with sum exceeding 100%
     */
    function test_Exception_SetLpSplitParams_SumExceeds100Percent() public {
        vm.expectRevert();
        emissionManager.setLpSplitParams(6000, 5000); // Sum = 11000 > 10000
    }

    /**
     * @notice Test setLpSplitParams with unauthorized caller
     */
    function test_Exception_SetLpSplitParams_OnlyOwner() public {
        vm.prank(user);
        vm.expectRevert();
        emissionManager.setLpSplitParams(7000, 3000);
    }

    /**
     * @notice Test getWeeklyBudget with week = 0
     */
    function test_Exception_GetWeeklyBudget_WeekZero() public {
        vm.expectRevert();
        emissionManager.getWeeklyBudget(0);
    }

    /**
     * @notice Test getWeeklyBudget with week > 352
     */
    function test_Exception_GetWeeklyBudget_WeekTooHigh() public {
        vm.expectRevert();
        emissionManager.getWeeklyBudget(353);
    }

    // ==================== Dimension 4: Performance Tests ====================

    /**
     * @notice Benchmark gas cost for Phase A getWeeklyBudget
     */
    function test_Performance_GetWeeklyBudget_PhaseA_GasCost() public view {
        uint256 gasBefore = gasleft();
        emissionManager.getWeeklyBudget(1);
        uint256 gasUsed = gasBefore - gasleft();

        // Should be < 10K gas (very cheap read operation)
        assertLt(gasUsed, 10_000, "Phase A getWeeklyBudget should use < 10K gas");
    }

    /**
     * @notice Benchmark gas cost for Phase B getWeeklyBudget
     */
    function test_Performance_GetWeeklyBudget_PhaseB_GasCost() public view {
        uint256 gasBefore = gasleft();
        emissionManager.getWeeklyBudget(100);
        uint256 gasUsed = gasBefore - gasleft();

        // Should be < 20K gas (array lookup)
        assertLt(gasUsed, 20_000, "Phase B getWeeklyBudget should use < 20K gas");
    }

    /**
     * @notice Benchmark gas cost for Phase C getWeeklyBudget
     */
    function test_Performance_GetWeeklyBudget_PhaseC_GasCost() public view {
        uint256 gasBefore = gasleft();
        emissionManager.getWeeklyBudget(300);
        uint256 gasUsed = gasBefore - gasleft();

        // Should be < 10K gas (very cheap read operation)
        assertLt(gasUsed, 10_000, "Phase C getWeeklyBudget should use < 10K gas");
    }

    /**
     * @notice Benchmark gas cost for setLpSplitParams
     */
    function test_Performance_SetLpSplitParams_GasCost() public {
        uint256 gasBefore = gasleft();
        emissionManager.setLpSplitParams(7000, 3000);
        uint256 gasUsed = gasBefore - gasleft();

        // Should be < 50K gas (2 storage writes + validation)
        assertLt(gasUsed, 50_000, "setLpSplitParams should use < 50K gas");
    }

    // ==================== Dimension 5: Security Tests ====================

    /**
     * @notice Test that only owner can call setLpSplitParams
     */
    function test_Security_OnlyOwnerCanSetLpSplitParams() public {
        // Owner should succeed
        emissionManager.setLpSplitParams(7000, 3000);

        // Non-owner should fail
        vm.prank(user);
        vm.expectRevert();
        emissionManager.setLpSplitParams(8000, 2000);
    }

    /**
     * @notice Test that getWeeklyBudget is a view function (no state changes)
     */
    function test_Security_GetWeeklyBudget_NoStateChange() public view {
        // Call multiple times - should not change state
        emissionManager.getWeeklyBudget(1);
        emissionManager.getWeeklyBudget(1);
        emissionManager.getWeeklyBudget(1);

        // If this compiles and runs, it's a view function
    }

    /**
     * @notice Test parameter validation in setLpSplitParams
     */
    function test_Security_SetLpSplitParams_ValidatesSum() public {
        // Valid: sum = 10000
        emissionManager.setLpSplitParams(5000, 5000);

        // Invalid: sum != 10000
        vm.expectRevert();
        emissionManager.setLpSplitParams(4000, 5000);
    }

    // ==================== Dimension 6: Compatibility Tests ====================

    /**
     * @notice Test integration with RewardDistributor (interface compatibility)
     */
    function test_Compatibility_RewardDistributor_Integration() public view {
        // RewardDistributor would call getWeeklyBudget to determine epoch rewards
        (uint256 debt, uint256 lpPairs, uint256 stabilityPool, uint256 eco) = emissionManager.getWeeklyBudget(1);

        // All values should be non-zero and reasonable
        assertGt(debt, 0, "Debt channel should be available for RewardDistributor");
        assertGt(lpPairs + stabilityPool, 0, "LP channels should be available for GaugeController");
        assertGt(eco, 0, "Eco channel should be available for Treasury");
    }

    /**
     * @notice Test that emission schedule is deterministic (same inputs = same outputs)
     */
    function test_Compatibility_DeterministicEmission() public view {
        (uint256 debt1, uint256 lpPairs1, uint256 stabilityPool1, uint256 eco1) =
            emissionManager.getWeeklyBudget(100);

        (uint256 debt2, uint256 lpPairs2, uint256 stabilityPool2, uint256 eco2) =
            emissionManager.getWeeklyBudget(100);

        assertEq(debt1, debt2, "Debt should be deterministic");
        assertEq(lpPairs1, lpPairs2, "LP Pairs should be deterministic");
        assertEq(stabilityPool1, stabilityPool2, "Stability Pool should be deterministic");
        assertEq(eco1, eco2, "Eco should be deterministic");
    }

    /**
     * @notice Test that LP split changes are applied immediately
     */
    function test_Compatibility_LpSplitChanges_AppliedImmediately() public {
        (, uint256 lpPairs1, uint256 stabilityPool1,) = emissionManager.getWeeklyBudget(1);

        emissionManager.setLpSplitParams(8000, 2000);

        (, uint256 lpPairs2, uint256 stabilityPool2,) = emissionManager.getWeeklyBudget(1);

        // Values should be different after parameter change
        assertNotEq(lpPairs1, lpPairs2, "LP Pairs should change after parameter update");
        assertNotEq(stabilityPool1, stabilityPool2, "Stability Pool should change after parameter update");
    }

    /**
     * @notice Test fuzz: random weeks return valid budgets
     */
    function testFuzz_Compatibility_RandomWeeks_ValidBudgets(uint256 week) public view {
        // Bound week to valid range [1, 352]
        week = bound(week, 1, 352);

        (uint256 debt, uint256 lpPairs, uint256 stabilityPool, uint256 eco) = emissionManager.getWeeklyBudget(week);

        // All channels should be non-negative
        assertGe(debt, 0, "Debt should be non-negative");
        assertGe(lpPairs, 0, "LP Pairs should be non-negative");
        assertGe(stabilityPool, 0, "Stability Pool should be non-negative");
        assertGe(eco, 0, "Eco should be non-negative");

        // Total should be within reasonable range (decay can go below Phase C)
        uint256 total = debt + lpPairs + stabilityPool + eco;
        assertGt(total, 0, "Total should be positive");
        assertLe(total, PHASE_A_WEEKLY, "Total should not exceed Phase A level");
    }

    /**
     * @notice Test fuzz: random LP split parameters work correctly
     */
    function testFuzz_Compatibility_RandomLpSplitParams(uint16 lpPairsBps) public {
        // Bound to valid range [0, 10000]
        lpPairsBps = uint16(bound(lpPairsBps, 0, 10000));
        uint16 stabilityPoolBps = 10000 - lpPairsBps;

        emissionManager.setLpSplitParams(lpPairsBps, stabilityPoolBps);

        (, uint256 lpPairs, uint256 stabilityPool,) = emissionManager.getWeeklyBudget(1);

        uint256 lpTotal = lpPairs + stabilityPool;

        // Check proportions match (within 1% tolerance)
        if (lpTotal > 0) {
            uint256 actualLpPairsBps = (lpPairs * 10000) / lpTotal;
            assertApproxEqRel(actualLpPairsBps, lpPairsBps, 0.01e18, "LP Pairs proportion should match");
        }
    }
}
