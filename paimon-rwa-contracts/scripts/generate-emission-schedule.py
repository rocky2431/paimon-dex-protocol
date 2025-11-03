#!/usr/bin/env python3
"""
Generate 352-week emission schedule JSON file.

This script generates a complete emission schedule based on EmissionManager.sol formula:
- Phase A (Week 1-12): Fixed 64.08M PAIMON/week
- Phase B (Week 13-248): Linear decay from 64.08M to 7.39M
- Phase C (Week 249-352): Fixed 7.39M PAIMON/week

Output format:
{
  "metadata": {
    "version": "1.0.0",
    "generatedAt": "ISO timestamp",
    "totalWeeks": 352,
    "totalEmission": "10000000000",
    "phases": {...}
  },
  "weeklySchedule": [
    {
      "week": 1,
      "phase": "A",
      "total": "64080000",
      "debt": "6408000",      // 10%
      "lpPairs": "26913600",  // 42%
      "stabilityPool": "17942400", // 28%
      "eco": "12816000"       // 20%
    },
    ...
  ],
  "phaseSummaries": {
    "phaseA": {...},
    "phaseB": {...},
    "phaseC": {...}
  }
}
"""

import json
import sys
from datetime import datetime, timezone
from typing import Dict, List, Tuple
from decimal import Decimal, getcontext

# Set high precision for accurate calculations
getcontext().prec = 50


class EmissionScheduleGenerator:
    """Generate emission schedule matching EmissionManager.sol logic."""

    # Phase boundaries (matching EmissionManager.sol)
    PHASE_A_END = 12
    PHASE_B_END = 248
    PHASE_C_END = 352

    # Phase emissions (matching EmissionManager.sol constants)
    PHASE_A_WEEKLY = Decimal("64080000")  # 64.08M PAIMON
    PHASE_C_WEEKLY = Decimal("7390000")   # 7.39M PAIMON

    # Allocation percentages (basis points)
    DEBT_BPS = 1000      # 10%
    LP_TOTAL_BPS = 7000  # 70%
    ECO_BPS = 2000       # 20%

    # LP secondary split (default values)
    LP_PAIRS_BPS = 6000      # 60% of LP total = 42% of total
    STABILITY_POOL_BPS = 4000  # 40% of LP total = 28% of total

    BASIS_POINTS = 10000

    def __init__(self):
        self.weekly_schedule: List[Dict] = []
        self.phase_summaries: Dict = {}

    def calculate_phase_b_emission(self, week: int) -> Decimal:
        """
        Calculate Phase B emission using linear interpolation.

        Matches EmissionManager.sol _calculatePhaseBEmission logic:
        E(w) = E_A - (E_A - E_C) * (decayWeeks / totalDecayWeeks)

        Args:
            week: Week number (must be in [13, 248])

        Returns:
            Weekly emission amount
        """
        assert 13 <= week <= 248, f"Week {week} not in Phase B"

        decay_weeks = week - self.PHASE_A_END  # 0 to 235
        total_decay_weeks = self.PHASE_B_END - self.PHASE_A_END  # 236 weeks

        decay_amount = self.PHASE_A_WEEKLY - self.PHASE_C_WEEKLY

        # Linear interpolation
        emission = self.PHASE_A_WEEKLY - (decay_amount * decay_weeks / total_decay_weeks)

        return emission

    def allocate_budget(self, total_budget: Decimal) -> Tuple[Decimal, Decimal, Decimal, Decimal]:
        """
        Allocate total budget to four channels.

        Matches EmissionManager.sol _allocateBudget logic:
        - debt: 10%
        - lpPairs: 42% (60% of 70%)
        - stabilityPool: 28% (40% of 70%)
        - eco: 20%

        Args:
            total_budget: Total weekly budget

        Returns:
            Tuple of (debt, lpPairs, stabilityPool, eco)
        """
        # Debt channel: 10% of total
        debt = total_budget * self.DEBT_BPS / self.BASIS_POINTS

        # Eco channel: 20% of total
        eco = total_budget * self.ECO_BPS / self.BASIS_POINTS

        # LP total: 70% of total
        lp_total = total_budget * self.LP_TOTAL_BPS / self.BASIS_POINTS

        # LP secondary split
        lp_pairs = lp_total * self.LP_PAIRS_BPS / self.BASIS_POINTS
        stability_pool = lp_total * self.STABILITY_POOL_BPS / self.BASIS_POINTS

        return debt, lp_pairs, stability_pool, eco

    def get_phase_name(self, week: int) -> str:
        """Get phase name for a given week."""
        if week <= self.PHASE_A_END:
            return "A"
        elif week <= self.PHASE_B_END:
            return "B"
        else:
            return "C"

    def calculate_weekly_emission(self, week: int) -> Decimal:
        """Calculate total weekly emission for a given week."""
        if week <= self.PHASE_A_END:
            return self.PHASE_A_WEEKLY
        elif week <= self.PHASE_B_END:
            return self.calculate_phase_b_emission(week)
        else:
            return self.PHASE_C_WEEKLY

    def generate_schedule(self) -> Dict:
        """
        Generate complete 352-week emission schedule.

        Returns:
            Complete schedule with weekly data and phase summaries
        """
        # Initialize phase accumulators
        phase_accum = {
            "A": {"total": Decimal(0), "debt": Decimal(0), "lpPairs": Decimal(0),
                  "stabilityPool": Decimal(0), "eco": Decimal(0), "weeks": 0},
            "B": {"total": Decimal(0), "debt": Decimal(0), "lpPairs": Decimal(0),
                  "stabilityPool": Decimal(0), "eco": Decimal(0), "weeks": 0},
            "C": {"total": Decimal(0), "debt": Decimal(0), "lpPairs": Decimal(0),
                  "stabilityPool": Decimal(0), "eco": Decimal(0), "weeks": 0}
        }

        # Generate weekly schedule
        for week in range(1, self.PHASE_C_END + 1):
            phase = self.get_phase_name(week)
            total_budget = self.calculate_weekly_emission(week)
            debt, lp_pairs, stability_pool, eco = self.allocate_budget(total_budget)

            weekly_data = {
                "week": week,
                "phase": phase,
                "total": str(int(total_budget)),
                "debt": str(int(debt)),
                "lpPairs": str(int(lp_pairs)),
                "stabilityPool": str(int(stability_pool)),
                "eco": str(int(eco))
            }

            self.weekly_schedule.append(weekly_data)

            # Accumulate phase totals
            phase_accum[phase]["total"] += total_budget
            phase_accum[phase]["debt"] += debt
            phase_accum[phase]["lpPairs"] += lp_pairs
            phase_accum[phase]["stabilityPool"] += stability_pool
            phase_accum[phase]["eco"] += eco
            phase_accum[phase]["weeks"] += 1

        # Generate phase summaries
        self.phase_summaries = {
            f"phase{phase}": {
                "weeks": data["weeks"],
                "weekRange": self._get_week_range(phase),
                "totalEmission": str(int(data["total"])),
                "debt": str(int(data["debt"])),
                "lpPairs": str(int(data["lpPairs"])),
                "stabilityPool": str(int(data["stabilityPool"])),
                "eco": str(int(data["eco"]))
            }
            for phase, data in phase_accum.items()
        }

        # Calculate grand total
        grand_total = sum(Decimal(data["total"]) for data in self.weekly_schedule)

        # Verify invariant: phase totals == grand total
        # Note: Allow small tolerance due to integer division rounding
        phase_total_sum = sum(Decimal(self.phase_summaries[f"phase{phase}"]["totalEmission"])
                              for phase in ["A", "B", "C"])

        tolerance = Decimal("1000")  # 1000 wei tolerance (negligible for 10B scale)
        assert abs(phase_total_sum - grand_total) < tolerance, \
            f"Conservation check failed: phase_sum={phase_total_sum}, grand_total={grand_total}, diff={abs(phase_total_sum - grand_total)}"

        # Build final output
        output = {
            "metadata": {
                "version": "1.0.0",
                "generatedAt": datetime.now(timezone.utc).isoformat(),
                "totalWeeks": self.PHASE_C_END,
                "totalEmission": str(int(grand_total)),
                "description": "352-week PAIMON emission schedule generated from EmissionManager.sol formula",
                "contract": "EmissionManager.sol",
                "phases": {
                    "A": f"Week 1-{self.PHASE_A_END}: Fixed {self.PHASE_A_WEEKLY}M/week",
                    "B": f"Week {self.PHASE_A_END + 1}-{self.PHASE_B_END}: Linear decay",
                    "C": f"Week {self.PHASE_B_END + 1}-{self.PHASE_C_END}: Fixed {self.PHASE_C_WEEKLY}M/week"
                }
            },
            "allocation": {
                "debt": f"{self.DEBT_BPS / 100}%",
                "lpPairs": f"{self.LP_PAIRS_BPS * self.LP_TOTAL_BPS / self.BASIS_POINTS / 100}%",
                "stabilityPool": f"{self.STABILITY_POOL_BPS * self.LP_TOTAL_BPS / self.BASIS_POINTS / 100}%",
                "eco": f"{self.ECO_BPS / 100}%"
            },
            "weeklySchedule": self.weekly_schedule,
            "phaseSummaries": self.phase_summaries
        }

        return output

    def _get_week_range(self, phase: str) -> str:
        """Get human-readable week range for a phase."""
        if phase == "A":
            return f"1-{self.PHASE_A_END}"
        elif phase == "B":
            return f"{self.PHASE_A_END + 1}-{self.PHASE_B_END}"
        else:
            return f"{self.PHASE_B_END + 1}-{self.PHASE_C_END}"


def main():
    """Main entry point."""
    print("🚀 Generating 352-week emission schedule...")

    generator = EmissionScheduleGenerator()
    schedule = generator.generate_schedule()

    # Output path
    output_path = "../.ultra/docs/emission-schedule.json"

    # Write JSON file
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(schedule, f, indent=2, ensure_ascii=False)

    print(f"✅ Emission schedule generated successfully")
    print(f"📄 Output: {output_path}")
    print(f"📊 Total emission: {schedule['metadata']['totalEmission']} PAIMON")
    print(f"📅 Total weeks: {schedule['metadata']['totalWeeks']}")
    print(f"\nPhase summaries:")
    for phase_key, phase_data in schedule['phaseSummaries'].items():
        print(f"  {phase_key}: {phase_data['totalEmission']} PAIMON ({phase_data['weekRange']})")

    return 0


if __name__ == "__main__":
    sys.exit(main())
