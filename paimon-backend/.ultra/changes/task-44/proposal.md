# Feature: 实现历史 APR 记录

**Task ID**: 44
**Status**: In Progress
**Branch**: feat/task-44-historical-apr-recording
**Developer**: Claude Code
**Started**: 2025-11-15

## Overview

Implement automated hourly APR snapshot recording for all liquidity pools using scheduler integration.

## Rationale

Historical APR data enables:
- APR trend charts (daily/weekly/monthly views)
- Pool performance comparisons
- Yield farming strategy optimization
- User analytics (best entry/exit timing)

Without historical data, users can only see current APR (real-time queries are expensive and don't show trends).

## Impact Assessment

- **User Stories Affected**: Portfolio analytics, pool selection, yield optimization
- **Architecture Changes**: Yes - Adding APR recording to scheduler
- **Breaking Changes**: No - New functionality
- **API Changes**: None (Task 46 will add query API)
- **Dependencies**: Task 43 (TimescaleDB tables) ✅, Task 41 (Scheduler) ✅

## Technical Approach

### 1. APR Calculation Logic

**Formula**:
```
APR = (Trading Fees APR) + (Gauge Emission APR)

Trading Fees APR = (24h_volume * fee_rate * 365 / TVL) * 100
Gauge Emission APR = (weekly_emission * PAIMON_price * 52 / TVL) * 100
```

**Data Sources**:
- Trading volume: DEXPair reserves + Swap event logs
- TVL: LP token total supply + reserves
- Emission: GaugeController weight + EmissionRouter weekly budget
- PAIMON price: Mock oracle (Task 44), real oracle (Phase 3)

### 2. Service Design

**APRRecorder** (`app/indexer/services/apr_recorder.py`):
```python
class APRRecorder:
    async def record_all_pools(self, session: AsyncSession):
        """Record APR snapshots for all active pools."""
        pairs = await self._get_active_pairs()
        for pair_address, pair_contract in pairs:
            apr_data = await self._calculate_apr(pair_address, pair_contract)
            await self._save_snapshot(apr_data, session)

    async def _calculate_apr(self, pair_address: str, pair: Contract) -> dict:
        """Calculate total APR from trading fees + emissions."""
        # Query reserves, volume, TVL
        # Calculate fee APR
        # Calculate emission APR
        # Return aggregated data

    async def _save_snapshot(self, apr_data: dict, session: AsyncSession):
        """Save APR snapshot to historical_apr table."""
        snapshot = HistoricalAPR(**apr_data)
        session.add(snapshot)
        await session.commit()
```

### 3. Scheduler Integration

Modify `app/indexer/scheduler.py`:
```python
from app.indexer.services.apr_recorder import APRRecorder

class IndexerScheduler:
    def __init__(self, ...):
        self.apr_recorder = APRRecorder(w3=self.w3)

    async def record_apr_snapshots(self):
        """Scheduled job: Record APR for all pools."""
        logger.info("Starting APR snapshot recording...")
        async with get_db_session() as session:
            await self.apr_recorder.record_all_pools(session)
        logger.info("APR recording completed")

    def start(self):
        # Add hourly APR recording job
        self.scheduler.add_job(
            self.record_apr_snapshots,
            "interval",
            hours=1,  # Every hour
            id="record_apr",
            name="Record APR snapshots"
        )
```

### 4. Mock Price Oracle

For Task 44, use fixed PAIMON price (Task 68 will add real oracle):
```python
MOCK_PAIMON_PRICE_USD = Decimal("0.50")  # $0.50 per PAIMON
```

## Acceptance Criteria

- [x] APRRecorder service created with calculation logic
- [x] Trading fee APR calculation (24h volume based)
- [x] Gauge emission APR calculation (weekly budget based)
- [x] Hourly scheduler job configured
- [x] APR snapshots saved to historical_apr table
- [x] Duplicate prevention (unique constraint handling)
- [x] Error handling (network failures, calculation errors)
- [x] Unit tests for APR calculation
- [x] Integration test with scheduler

## Testing Plan

### Unit Tests (`tests/test_apr_recorder.py`)
- Test trading fee APR calculation
- Test emission APR calculation
- Test total APR aggregation
- Test snapshot saving
- Test duplicate handling

### Integration Tests
- Test hourly recording with mock blockchain data
- Test scheduler job execution
- Verify data in historical_apr table

## Rollback Plan

```bash
# Remove APR recording job from scheduler
# Scheduler will continue other jobs (event scanning, aggregation)
# Historical data preserved (no deletion)
```

## Related Tasks

- **Depends on**: Task 43 (TimescaleDB tables) ✅, Task 41 (Scheduler) ✅
- **Enables**: Task 46 (Historical data query API)
- **Future**: Task 68 (Real price oracle integration)
