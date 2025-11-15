# Task 44: 实现历史 APR 记录

## Task Breakdown

- [ ] **Subtask 44.1**: Create APRRecorder service
  - Create `app/indexer/services/apr_recorder.py`
  - Implement APR calculation logic
  - Add mock price oracle

- [ ] **Subtask 44.2**: Integrate with scheduler
  - Modify `app/indexer/scheduler.py`
  - Add hourly APR recording job
  - Handle errors gracefully

- [ ] **Subtask 44.3**: Write tests
  - Unit tests for APR calculations
  - Integration tests with scheduler
  - Verify database persistence

- [ ] **Subtask 44.4**: Documentation
  - Add APR calculation formula to docs
  - Update scheduler documentation

## Implementation Notes

### APR Calculation Details

**Trading Fee APR**:
```
Fee APR = (24h Volume × Fee Rate × 365 / TVL) × 100

Where:
- 24h Volume = Estimated from reserve changes + recent swaps
- Fee Rate = 0.003 (0.3% per swap)
- TVL = (reserve0 × price0 + reserve1 × price1)
```

**Emission APR**:
```
Emission APR = (Weekly Emission × PAIMON Price × 52 / TVL) × 100

Where:
- Weekly Emission = Gauge weight × Total weekly budget
- PAIMON Price = Mock $0.50 (Task 68 will add real oracle)
- 52 = Weeks per year
```

### Error Handling Strategy

1. **Network failures**: Retry with exponential backoff (max 3 attempts)
2. **Calculation errors**: Log error, skip pool, continue with others
3. **Database errors**: Rollback transaction, log error
4. **Duplicate snapshots**: Silently skip (unique constraint)

### Performance Considerations

- **Batch processing**: Record all pools in single scheduler run
- **Async operations**: Parallel RPC calls for pool data
- **Database optimization**: Bulk insert with `executemany()`
- **Cache**: Store pair list (refresh every 1 hour)

## Estimated Time

- Subtask 44.1: 2 hours
- Subtask 44.2: 1 hour
- Subtask 44.3: 2 hours
- Subtask 44.4: 0.5 hours
- **Total**: 5.5 hours

## Dependencies

- Task 43: HistoricalAPR model ✅
- Task 41: IndexerScheduler ✅
- Task 38: DEX event handlers ✅
