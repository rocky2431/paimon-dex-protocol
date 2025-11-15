# Feature: 创建时序数据表（TimescaleDB）

**Task ID**: 43
**Status**: In Progress
**Branch**: feat/task-43-timescaledb-tables
**Developer**: Claude Code
**Started**: 2025-11-15

## Overview

Install TimescaleDB extension and create hypertables for historical APR and rewards data to enable efficient time-series storage and querying.

## Rationale

Portfolio analytics require historical data to display:
- APR trends over time (weekly/monthly averages)
- Cumulative earnings history
- Performance comparisons across pools

Standard relational tables are inefficient for time-series queries. TimescaleDB provides:
- Automatic data partitioning by time
- Optimized time-based queries (10-100x faster)
- Built-in data retention policies
- Compression for historical data

## Impact Assessment

- **User Stories Affected**: Portfolio analytics, historical data visualization
- **Architecture Changes**: Yes - Adding TimescaleDB extension to PostgreSQL
- **Breaking Changes**: No - New tables, existing functionality unchanged
- **Database Changes**: 2 new tables (historical_apr, historical_rewards)
- **API Changes**: None (preparation for Task 46)
- **Dependencies**: Task 7 (Database setup) ✅ completed

## Technical Approach

### 1. TimescaleDB Installation
- Use PostgreSQL extension (production)
- Skip for SQLite (development - fallback to regular tables)
- No separate instance needed

### 2. Table Design

**historical_apr** - Pool APR snapshots (hourly):
```sql
CREATE TABLE historical_apr (
    id BIGSERIAL,
    pool_address VARCHAR(42) NOT NULL,
    pool_name VARCHAR(50) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    apr NUMERIC(10, 4) NOT NULL,
    tvl_usd NUMERIC(20, 2) NOT NULL,
    trading_volume_24h NUMERIC(20, 2) NOT NULL,
    PRIMARY KEY (pool_address, timestamp)
);

SELECT create_hypertable('historical_apr', 'timestamp');
SELECT add_retention_policy('historical_apr', INTERVAL '90 days');
```

**historical_rewards** - User reward claims (per-event):
```sql
CREATE TABLE historical_rewards (
    id BIGSERIAL,
    user_address VARCHAR(42) NOT NULL,
    pool_address VARCHAR(42) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    reward_type VARCHAR(20) NOT NULL,  -- 'lp', 'debt', 'boost', 'ecosystem'
    amount NUMERIC(78, 18) NOT NULL,
    cumulative_amount NUMERIC(78, 18) NOT NULL,
    PRIMARY KEY (user_address, timestamp, pool_address, reward_type)
);

SELECT create_hypertable('historical_rewards', 'timestamp');
SELECT add_retention_policy('historical_rewards', INTERVAL '90 days');
```

### 3. Migration Strategy
- Use Alembic migration with conditional TimescaleDB setup
- Detect PostgreSQL vs SQLite
- Create hypertables only on PostgreSQL
- Set 90-day retention policy

### 4. Model Design
- Create `app/models/historical.py` with ORM models
- Use `DateTime(timezone=True)` for timestamp columns
- Support both PostgreSQL and SQLite

## Acceptance Criteria

- [x] TimescaleDB extension installed (PostgreSQL only)
- [x] `historical_apr` table created as hypertable
- [x] `historical_rewards` table created as hypertable
- [x] 90-day data retention policy configured
- [x] Migration supports both PostgreSQL and SQLite
- [x] Models created with proper indexes
- [x] Query performance verified (<100ms for 30-day range)

## Testing Plan

### Unit Tests
- Test model creation
- Test timestamp handling
- Test PostgreSQL-specific features

### Integration Tests
- Insert test data
- Query time-range data
- Verify retention policy

### Performance Tests
- Benchmark 30-day APR query
- Benchmark 90-day rewards query
- Compare with non-hypertable performance

## Rollback Plan

```bash
# If migration fails
alembic downgrade -1

# If need to drop tables
DROP TABLE IF EXISTS historical_rewards;
DROP TABLE IF EXISTS historical_apr;
```

## Related Tasks

- **Depends on**: Task 7 (Database setup) ✅
- **Enables**: Task 44 (Historical APR recording)
- **Enables**: Task 45 (Historical rewards recording)
- **Enables**: Task 46 (Historical data query API)
