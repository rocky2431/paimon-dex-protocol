# Task 43: 创建时序数据表（TimescaleDB）

## Task Breakdown

- [ ] **Subtask 43.1**: Create database models
  - Create `app/models/historical.py`
  - Define `HistoricalAPR` model
  - Define `HistoricalRewards` model
  - Add timezone-aware DateTime columns
  - Add proper indexes

- [ ] **Subtask 43.2**: Create Alembic migration
  - Generate migration file
  - Add PostgreSQL detection logic
  - Create tables with conditional hypertable setup
  - Add retention policies
  - Test upgrade/downgrade

- [ ] **Subtask 43.3**: Write tests
  - Unit tests for models
  - Integration tests for hypertable creation
  - Performance benchmarks

- [ ] **Subtask 43.4**: Documentation
  - Update schema documentation
  - Add TimescaleDB setup guide
  - Document retention policy

## Implementation Notes

### TimescaleDB vs SQLite Compatibility

**PostgreSQL** (Production):
```python
# Migration will execute:
op.execute("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;")
op.execute("SELECT create_hypertable('historical_apr', 'timestamp');")
op.execute("SELECT add_retention_policy('historical_apr', INTERVAL '90 days');")
```

**SQLite** (Development):
```python
# Migration will skip TimescaleDB commands
# Tables created as regular tables with timestamp index
op.create_index('idx_historical_apr_timestamp', 'historical_apr', ['timestamp'])
```

### Model Design Pattern

```python
from sqlalchemy import DateTime
from sqlalchemy.sql import func

class HistoricalAPR(Base):
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now()
    )
```

### Query Performance Tips

```python
# Good: Use time-range queries with indexes
stmt = select(HistoricalAPR).where(
    HistoricalAPR.timestamp >= start_date,
    HistoricalAPR.timestamp < end_date
).order_by(HistoricalAPR.timestamp.desc())

# Bad: Full table scan
stmt = select(HistoricalAPR).order_by(HistoricalAPR.timestamp.desc())
```

## Estimated Time

- Subtask 43.1: 1 hour
- Subtask 43.2: 2 hours
- Subtask 43.3: 2 hours
- Subtask 43.4: 1 hour
- **Total**: 6 hours (within 2-day estimate)

## Dependencies

- PostgreSQL 12+ (with TimescaleDB extension for production)
- Alembic migration tool
- SQLAlchemy 2.0+
