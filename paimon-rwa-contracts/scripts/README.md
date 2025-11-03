# Emission Schedule Scripts

This directory contains scripts for generating and validating the 352-week PAIMON emission schedule.

## Scripts

### 1. `generate-emission-schedule.py`

Generates the complete 352-week emission schedule JSON file based on EmissionManager.sol formula.

**Usage:**
```bash
cd scripts
python3 generate-emission-schedule.py
```

**Output:**
- File: `../.ultra/docs/emission-schedule.json`
- Total emission: ~9.94B PAIMON over 352 weeks (6.77 years)

**Emission Formula:**
- **Phase A (Week 1-12)**: Fixed 64.08M PAIMON/week
- **Phase B (Week 13-248)**: Linear decay from 64.08M to 7.39M
- **Phase C (Week 249-352)**: Fixed 7.39M PAIMON/week

**Channel Allocation:**
- Debt: 10%
- LP Pairs: 42% (60% of 70% LP total)
- Stability Pool: 28% (40% of 70% LP total)
- Eco: 20%

### 2. `test-emission-schedule.py`

Validates the generated emission schedule against 6-dimensional test coverage:

1. **Functional**: Core logic correctness
2. **Boundary**: Edge cases (week 1, 12, 13, 248, 249, 352)
3. **Conservation**: Phase totals == grand total
4. **Allocation**: Channel percentages
5. **Security**: No negative values, no overflow
6. **Compatibility**: Valid JSON schema

**Usage:**
```bash
cd scripts
python3 test-emission-schedule.py
```

**Expected Output:**
```
============================================================
🧪 Emission Schedule Validation Test Suite
============================================================

📋 Test 1: Functional - Core logic correctness
✅ Total emission: 9942634884 PAIMON (within 0.5737% of target)
✅ Functional tests passed

📋 Test 2: Boundary - Edge cases
✅ Boundary tests passed

📋 Test 3: Conservation - Phase totals match grand total
✅ Conservation verified

📋 Test 4: Allocation - Channel percentages
✅ Allocation tests passed

📋 Test 5: Security - No negative values, no overflow
✅ Security tests passed

📋 Test 6: Compatibility - JSON schema
✅ Compatibility tests passed

============================================================
📊 Test Summary
============================================================
Total tests: 6
Passed: 6
Failed: 0

✅ All tests passed!
```

## TDD Workflow

These scripts were developed using Test-Driven Development:

1. **RED**: Write tests first (`test-emission-schedule.py`) - Tests fail
2. **GREEN**: Implement logic (`generate-emission-schedule.py`) - Tests pass
3. **REFACTOR**: Optimize code quality (SOLID/DRY/KISS/YAGNI)

## Output Schema

```json
{
  "metadata": {
    "version": "1.0.0",
    "generatedAt": "ISO timestamp",
    "totalWeeks": 352,
    "totalEmission": "9942634884",
    "description": "...",
    "contract": "EmissionManager.sol",
    "phases": {...}
  },
  "allocation": {
    "debt": "10.0%",
    "lpPairs": "42.0%",
    "stabilityPool": "28.0%",
    "eco": "20.0%"
  },
  "weeklySchedule": [
    {
      "week": 1,
      "phase": "A",
      "total": "64080000",
      "debt": "6408000",
      "lpPairs": "26913600",
      "stabilityPool": "17942400",
      "eco": "12816000"
    },
    ...
  ],
  "phaseSummaries": {
    "phaseA": {...},
    "phaseB": {...},
    "phaseC": {...}
  }
}
```

## Integration

This JSON file is used by:
- **Frontend**: Emission visualization page (displays weekly/phase data)
- **Contracts**: EmissionManager.sol validation
- **Auditors**: Off-chain verification of emission logic

## Dependencies

- Python 3.8+
- Standard library only (no external dependencies)

## Notes

- Emission values calibrated by 1.7088x scale factor to achieve 10B target
- Linear interpolation used for Phase B (production-ready, gas-efficient)
- Maintains original ratio: Phase A / Phase C ≈ 8.67:1
- Small rounding errors (<1000 wei) due to integer division are expected
