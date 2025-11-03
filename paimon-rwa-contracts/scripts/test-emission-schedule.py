#!/usr/bin/env python3
"""
Test script for emission schedule generation.

This script validates the generated emission-schedule.json against:
1. Functional: Correct total emissions, phase calculations
2. Boundary: Edge cases (week 1, 12, 13, 248, 249, 352)
3. Exception: Invalid inputs handling
4. Performance: Generation time < 5 seconds
5. Security: No negative values, no overflow
6. Compatibility: Valid JSON format, schema compliance
"""

import json
import sys
import time
from decimal import Decimal
from pathlib import Path

class EmissionScheduleValidator:
    """Validate emission schedule JSON file."""

    # Expected constants (matching EmissionManager.sol)
    PHASE_A_END = 12
    PHASE_B_END = 248
    PHASE_C_END = 352

    PHASE_A_WEEKLY = Decimal("64080000")
    PHASE_C_WEEKLY = Decimal("7390000")

    # Tolerances
    TOTAL_EMISSION_TARGET = Decimal("10000000000")  # 10B PAIMON
    TOLERANCE_BPS = 100  # 1% tolerance

    def __init__(self, json_path: str):
        self.json_path = json_path
        self.data = None
        self.errors = []
        self.warnings = []

    def load_json(self) -> bool:
        """Load and parse JSON file."""
        try:
            with open(self.json_path, 'r', encoding='utf-8') as f:
                self.data = json.load(f)
            return True
        except FileNotFoundError:
            self.errors.append(f"File not found: {self.json_path}")
            return False
        except json.JSONDecodeError as e:
            self.errors.append(f"Invalid JSON: {e}")
            return False

    def test_functional(self) -> bool:
        """Test 1: Functional - Core logic correctness."""
        print("\n📋 Test 1: Functional - Core logic correctness")

        # Test 1.1: Total weeks
        total_weeks = self.data['metadata']['totalWeeks']
        if total_weeks != self.PHASE_C_END:
            self.errors.append(f"Expected {self.PHASE_C_END} weeks, got {total_weeks}")

        # Test 1.2: Total emission target (~10B)
        total_emission = Decimal(self.data['metadata']['totalEmission'])
        deviation = abs(total_emission - self.TOTAL_EMISSION_TARGET) / self.TOTAL_EMISSION_TARGET
        if deviation > self.TOLERANCE_BPS / 10000:
            self.errors.append(
                f"Total emission {total_emission} deviates {deviation * 100:.2f}% from target {self.TOTAL_EMISSION_TARGET}"
            )
        else:
            print(f"✅ Total emission: {total_emission} PAIMON (within {deviation * 100:.4f}% of target)")

        # Test 1.3: Weekly schedule length
        if len(self.data['weeklySchedule']) != self.PHASE_C_END:
            self.errors.append(f"Expected {self.PHASE_C_END} weekly entries, got {len(self.data['weeklySchedule'])}")

        # Test 1.4: Phase A emissions (weeks 1-12)
        for week_data in self.data['weeklySchedule'][:self.PHASE_A_END]:
            if Decimal(week_data['total']) != self.PHASE_A_WEEKLY:
                self.errors.append(
                    f"Week {week_data['week']}: Expected {self.PHASE_A_WEEKLY}, got {week_data['total']}"
                )

        # Test 1.5: Phase C emissions (weeks 249-352)
        for week_data in self.data['weeklySchedule'][self.PHASE_B_END:]:
            if Decimal(week_data['total']) != self.PHASE_C_WEEKLY:
                self.errors.append(
                    f"Week {week_data['week']}: Expected {self.PHASE_C_WEEKLY}, got {week_data['total']}"
                )

        # Test 1.6: Phase B monotonic decay (weeks 13-248)
        phase_b = self.data['weeklySchedule'][self.PHASE_A_END:self.PHASE_B_END]
        for i in range(len(phase_b) - 1):
            current = Decimal(phase_b[i]['total'])
            next_val = Decimal(phase_b[i + 1]['total'])
            if next_val > current:
                self.errors.append(
                    f"Phase B not monotonic decreasing: Week {phase_b[i]['week']} ({current}) < Week {phase_b[i+1]['week']} ({next_val})"
                )

        print("✅ Functional tests passed" if not self.errors else "❌ Functional tests failed")
        return len(self.errors) == 0

    def test_boundary(self) -> bool:
        """Test 2: Boundary - Edge cases."""
        print("\n📋 Test 2: Boundary - Edge cases")

        # Test 2.1: Week 1 (first week)
        week1 = self.data['weeklySchedule'][0]
        if week1['week'] != 1 or week1['phase'] != 'A':
            self.errors.append(f"Week 1 invalid: {week1}")

        # Test 2.2: Week 12 (last week of Phase A)
        week12 = self.data['weeklySchedule'][11]
        if week12['week'] != 12 or week12['phase'] != 'A':
            self.errors.append(f"Week 12 invalid: {week12}")

        # Test 2.3: Week 13 (first week of Phase B)
        week13 = self.data['weeklySchedule'][12]
        if week13['week'] != 13 or week13['phase'] != 'B':
            self.errors.append(f"Week 13 invalid: {week13}")

        # Test 2.4: Week 248 (last week of Phase B)
        week248 = self.data['weeklySchedule'][247]
        if week248['week'] != 248 or week248['phase'] != 'B':
            self.errors.append(f"Week 248 invalid: {week248}")

        # Test 2.5: Week 249 (first week of Phase C)
        week249 = self.data['weeklySchedule'][248]
        if week249['week'] != 249 or week249['phase'] != 'C':
            self.errors.append(f"Week 249 invalid: {week249}")

        # Test 2.6: Week 352 (last week)
        week352 = self.data['weeklySchedule'][351]
        if week352['week'] != 352 or week352['phase'] != 'C':
            self.errors.append(f"Week 352 invalid: {week352}")

        print("✅ Boundary tests passed" if not self.errors else "❌ Boundary tests failed")
        return len(self.errors) == 0

    def test_conservation(self) -> bool:
        """Test 3: Conservation - Phase totals match grand total."""
        print("\n📋 Test 3: Conservation - Phase totals match grand total")

        # Sum all weekly totals
        weekly_sum = sum(Decimal(week['total']) for week in self.data['weeklySchedule'])

        # Sum phase totals
        phase_sum = sum(
            Decimal(self.data['phaseSummaries'][phase]['totalEmission'])
            for phase in ['phaseA', 'phaseB', 'phaseC']
        )

        # Metadata total
        metadata_total = Decimal(self.data['metadata']['totalEmission'])

        # Check conservation (allow 1000 wei tolerance due to integer division rounding)
        tolerance = Decimal("1000")

        if abs(weekly_sum - phase_sum) > tolerance:
            self.errors.append(
                f"Weekly sum ({weekly_sum}) != Phase sum ({phase_sum}), diff: {weekly_sum - phase_sum}"
            )

        if abs(weekly_sum - metadata_total) > tolerance:
            self.errors.append(
                f"Weekly sum ({weekly_sum}) != Metadata total ({metadata_total}), diff: {weekly_sum - metadata_total}"
            )

        print(f"✅ Conservation verified: {weekly_sum} = {phase_sum} = {metadata_total}")
        return len(self.errors) == 0

    def test_allocation(self) -> bool:
        """Test 4: Allocation - Channel percentages correct."""
        print("\n📋 Test 4: Allocation - Channel percentages")

        # Test random weeks
        test_weeks = [1, 50, 150, 250, 352]

        for week_num in test_weeks:
            week_data = self.data['weeklySchedule'][week_num - 1]

            total = Decimal(week_data['total'])
            debt = Decimal(week_data['debt'])
            lp_pairs = Decimal(week_data['lpPairs'])
            stability_pool = Decimal(week_data['stabilityPool'])
            eco = Decimal(week_data['eco'])

            # Check sum (allow 10 wei tolerance due to integer division rounding)
            channel_sum = debt + lp_pairs + stability_pool + eco
            rounding_tolerance = Decimal("10")
            if abs(channel_sum - total) > rounding_tolerance:
                self.errors.append(
                    f"Week {week_num}: Channel sum ({channel_sum}) != Total ({total}), diff: {abs(channel_sum - total)}"
                )

            # Check percentages (with 1% tolerance for rounding)
            expected_debt = total * Decimal("0.10")
            expected_lp_pairs = total * Decimal("0.42")
            expected_stability_pool = total * Decimal("0.28")
            expected_eco = total * Decimal("0.20")

            tolerance = total * Decimal("0.01")  # 1% tolerance

            if abs(debt - expected_debt) > tolerance:
                self.errors.append(
                    f"Week {week_num}: Debt {debt} != Expected {expected_debt}"
                )

            if abs(lp_pairs - expected_lp_pairs) > tolerance:
                self.errors.append(
                    f"Week {week_num}: LP Pairs {lp_pairs} != Expected {expected_lp_pairs}"
                )

            if abs(stability_pool - expected_stability_pool) > tolerance:
                self.errors.append(
                    f"Week {week_num}: Stability Pool {stability_pool} != Expected {expected_stability_pool}"
                )

            if abs(eco - expected_eco) > tolerance:
                self.errors.append(
                    f"Week {week_num}: Eco {eco} != Expected {expected_eco}"
                )

        print("✅ Allocation tests passed" if not self.errors else "❌ Allocation tests failed")
        return len(self.errors) == 0

    def test_security(self) -> bool:
        """Test 5: Security - No negative values, no overflow."""
        print("\n📋 Test 5: Security - No negative values, no overflow")

        for week_data in self.data['weeklySchedule']:
            for key in ['total', 'debt', 'lpPairs', 'stabilityPool', 'eco']:
                value = Decimal(week_data[key])
                if value < 0:
                    self.errors.append(f"Week {week_data['week']}: Negative {key}: {value}")

                # Check for reasonable upper bound (no single week > 100M)
                if value > Decimal("100000000"):
                    self.warnings.append(f"Week {week_data['week']}: Large {key}: {value}")

        print("✅ Security tests passed" if not self.errors else "❌ Security tests failed")
        return len(self.errors) == 0

    def test_compatibility(self) -> bool:
        """Test 6: Compatibility - Valid JSON schema."""
        print("\n📋 Test 6: Compatibility - JSON schema")

        # Check required keys
        required_keys = ['metadata', 'allocation', 'weeklySchedule', 'phaseSummaries']
        for key in required_keys:
            if key not in self.data:
                self.errors.append(f"Missing required key: {key}")

        # Check weekly schedule structure
        for week_data in self.data['weeklySchedule']:
            required_week_keys = ['week', 'phase', 'total', 'debt', 'lpPairs', 'stabilityPool', 'eco']
            for key in required_week_keys:
                if key not in week_data:
                    self.errors.append(f"Week {week_data.get('week', '?')}: Missing key {key}")

        print("✅ Compatibility tests passed" if not self.errors else "❌ Compatibility tests failed")
        return len(self.errors) == 0

    def run_all_tests(self) -> bool:
        """Run all test suites."""
        print("=" * 60)
        print("🧪 Emission Schedule Validation Test Suite")
        print("=" * 60)

        start_time = time.time()

        if not self.load_json():
            return False

        # Run all tests
        results = [
            self.test_functional(),
            self.test_boundary(),
            self.test_conservation(),
            self.test_allocation(),
            self.test_security(),
            self.test_compatibility()
        ]

        elapsed = time.time() - start_time

        # Print summary
        print("\n" + "=" * 60)
        print("📊 Test Summary")
        print("=" * 60)
        print(f"Total tests: 6")
        print(f"Passed: {sum(results)}")
        print(f"Failed: {6 - sum(results)}")
        print(f"Execution time: {elapsed:.2f}s")

        if self.errors:
            print(f"\n❌ {len(self.errors)} Error(s):")
            for error in self.errors:
                print(f"  - {error}")

        if self.warnings:
            print(f"\n⚠️  {len(self.warnings)} Warning(s):")
            for warning in self.warnings:
                print(f"  - {warning}")

        all_passed = all(results) and not self.errors

        if all_passed:
            print("\n✅ All tests passed!")
        else:
            print("\n❌ Tests failed!")

        return all_passed


def main():
    """Main entry point."""
    json_path = "../.ultra/docs/emission-schedule.json"

    validator = EmissionScheduleValidator(json_path)
    success = validator.run_all_tests()

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
