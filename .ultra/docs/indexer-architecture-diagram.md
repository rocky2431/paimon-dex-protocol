# 链上数据索引器架构图

## 系统架构总览

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[Portfolio Page<br/>User Center<br/>Dashboard]
    end

    subgraph "Backend API Layer"
        B[FastAPI Server]
        B1[GET /api/portfolio/:address]
        B2[GET /api/portfolio/:address/history]
        B3[WebSocket /ws/portfolio]
    end

    subgraph "Database Layer"
        C[(PostgreSQL + TimescaleDB)]
        C1[portfolio_cache]
        C2[lp_positions]
        C3[vault_positions]
        C4[venft_positions]
        C5[portfolio_history]
        C6[apr_history]
    end

    subgraph "Indexer Worker Layer"
        D[Event Listener]
        E[Event Handler]
        F[Data Aggregator]
        G[APScheduler]
    end

    subgraph "Blockchain Layer"
        H[BSC Testnet]
        H1[DEXPair Contracts]
        H2[USDPVault Contract]
        H3[VePaimon Contract]
        H4[SavingRate Contract]
        H5[GaugeController]
    end

    A -->|HTTP/REST<br/>响应<500ms| B
    B -->|查询缓存| C
    C1 -.->|读取| B
    C2 -.->|读取| B
    C3 -.->|读取| B
    C4 -.->|读取| B
    C5 -.->|读取| B2

    D -->|监听事件| H
    H1 -->|Mint/Burn/Swap| D
    H2 -->|Deposit/Borrow/Repay| D
    H3 -->|LockCreated/Withdraw| D
    H4 -->|Deposit/Withdraw| D

    D -->|解析事件| E
    E -->|更新数据| C2
    E -->|更新数据| C3
    E -->|更新数据| C4

    F -->|聚合数据| C1
    F -->|记录历史| C5
    F -->|记录历史| C6

    G -->|每30s| D
    G -->|每1min| F
    G -->|每5min| F
```

## 数据流详细图

### 用户操作 → 数据更新流程

```mermaid
sequenceDiagram
    participant User
    participant Contract as Smart Contract
    participant Listener as Event Listener
    participant Handler as Event Handler
    participant DB as PostgreSQL
    participant Aggregator as Data Aggregator
    participant API as FastAPI
    participant Frontend

    User->>Contract: 添加流动性 (addLiquidity)
    Contract->>Contract: 发出 Mint 事件

    Note over Listener: 每30s扫描一次
    Listener->>Contract: getLogs (fromBlock, toBlock)
    Contract-->>Listener: Mint事件列表

    Listener->>Handler: 处理 Mint 事件
    Handler->>Contract: 查询 balanceOf(user)
    Handler->>Contract: 查询 totalSupply()
    Handler->>Contract: 查询 getReserves()
    Contract-->>Handler: 返回数据

    Handler->>Handler: 计算 share %, liquidity_usd
    Handler->>Handler: 查询 GaugeController APR
    Handler->>Handler: 查询 pending rewards

    Handler->>DB: UPDATE lp_positions
    DB-->>Handler: OK

    Note over Aggregator: 每5min聚合一次
    Aggregator->>DB: 查询 lp_positions
    Aggregator->>DB: 查询 vault_positions
    Aggregator->>DB: 查询 venft_positions
    DB-->>Aggregator: 返回所有仓位

    Aggregator->>Aggregator: 计算总净值
    Aggregator->>Aggregator: 生成风险警告
    Aggregator->>DB: UPDATE portfolio_cache
    DB-->>Aggregator: OK

    Frontend->>API: GET /api/portfolio/:address
    API->>DB: SELECT FROM portfolio_cache
    API->>DB: SELECT FROM lp_positions
    API->>DB: SELECT FROM vault_positions
    DB-->>API: 返回缓存数据
    API-->>Frontend: PortfolioResponse (<500ms)
    Frontend->>User: 显示投资组合
```

### 历史数据记录流程

```mermaid
sequenceDiagram
    participant Scheduler as APScheduler
    participant Recorder as Historical Recorder
    participant DB as PostgreSQL
    participant Cache as portfolio_cache
    participant History as portfolio_history (TimescaleDB)

    Note over Scheduler: 每小时触发
    Scheduler->>Recorder: record_portfolio_snapshots()

    Recorder->>DB: SELECT * FROM portfolio_cache
    DB-->>Recorder: 所有用户当前快照

    loop 每个用户
        Recorder->>History: INSERT INTO portfolio_history
        Note right of Recorder: time, user_address, net_worth,<br/>lp_value, vault_collateral, etc.
    end

    History-->>Recorder: OK

    Scheduler->>Recorder: record_apr_snapshots()
    Recorder->>DB: SELECT * FROM lp_positions
    DB-->>Recorder: 所有 LP 仓位的当前 APR

    loop 每个 LP pool
        Recorder->>History: INSERT INTO apr_history
        Note right of Recorder: time, pair_address, apr
    end

    History-->>Recorder: OK
```

## 核心组件关系图

```mermaid
classDiagram
    class EventListener {
        +Web3 w3
        +dict contracts
        +int last_scanned_block
        +scan_events(from_block, to_block)
        +handle_event(event_type, event)
    }

    class DEXEventHandler {
        +process_mint_event(event)
        +process_burn_event(event)
        +process_swap_event(event)
        +calculate_apr(pair_address)
        +get_pending_rewards(user, pair)
        +update_lp_position(user, pair, data)
    }

    class VaultEventHandler {
        +process_deposit_event(event)
        +process_borrow_event(event)
        +process_repay_event(event)
        +get_user_collaterals(user)
        +update_vault_position(user, collateral, data)
        +update_vault_summary(user, debt, health_factor)
    }

    class VeNFTEventHandler {
        +process_lock_created_event(event)
        +process_lock_increased_event(event)
        +process_withdraw_event(event)
        +query_nft_details(token_id)
        +update_venft_position(token_id, data)
    }

    class PortfolioAggregator {
        +aggregate_user_portfolio(user_address)
        +calculate_total_net_worth(positions)
        +generate_risk_alerts(positions)
        +update_portfolio_cache(user, data)
    }

    class HistoricalRecorder {
        +record_portfolio_snapshots()
        +record_apr_snapshots()
        +query_time_series_data(user, timeframe)
    }

    class TaskScheduler {
        +AsyncIOScheduler scheduler
        +scan_latest_events() [every 30s]
        +update_apr_and_rewards() [every 1min]
        +aggregate_portfolios() [every 5min]
        +record_historical_data() [every 1hr]
    }

    EventListener --> DEXEventHandler: dispatches DEX events
    EventListener --> VaultEventHandler: dispatches Vault events
    EventListener --> VeNFTEventHandler: dispatches veNFT events

    DEXEventHandler --> PortfolioAggregator: triggers aggregation
    VaultEventHandler --> PortfolioAggregator: triggers aggregation
    VeNFTEventHandler --> PortfolioAggregator: triggers aggregation

    PortfolioAggregator --> HistoricalRecorder: provides snapshot data

    TaskScheduler --> EventListener: schedules event scanning
    TaskScheduler --> PortfolioAggregator: schedules aggregation
    TaskScheduler --> HistoricalRecorder: schedules historical recording
```

## 数据库 ER 图

```mermaid
erDiagram
    portfolio_cache ||--o{ lp_positions : "aggregates"
    portfolio_cache ||--o{ vault_positions : "aggregates"
    portfolio_cache ||--o{ venft_positions : "aggregates"
    portfolio_cache ||--o{ savings_position : "aggregates"
    portfolio_cache ||--o{ portfolio_history : "records to"

    lp_positions ||--o{ apr_history : "records APR to"

    portfolio_cache {
        varchar user_address PK
        numeric total_net_worth
        numeric total_lp_value
        numeric total_collateral_value
        numeric total_debt
        jsonb risk_alerts
        timestamp updated_at
    }

    lp_positions {
        int id PK
        varchar user_address FK
        varchar pair_address
        varchar pool_name
        numeric lp_token_balance
        numeric share_percentage
        numeric liquidity_usd
        numeric current_apr
        numeric pending_rewards
        timestamp last_updated
    }

    vault_positions {
        int id PK
        varchar user_address FK
        varchar collateral_address
        varchar asset_name
        numeric collateral_amount
        numeric collateral_value_usd
        numeric debt_amount
        numeric ltv_ratio
        numeric health_factor
        numeric liquidation_price
        timestamp last_updated
    }

    venft_positions {
        int id PK
        varchar user_address FK
        bigint token_id UK
        numeric locked_amount
        bigint lock_end
        numeric voting_power
        int remaining_days
        boolean is_expired
        timestamp last_updated
    }

    portfolio_history {
        timestamptz time PK
        varchar user_address PK
        numeric net_worth
        numeric lp_value
        numeric vault_collateral
        numeric vault_debt
        numeric health_factor
    }

    apr_history {
        timestamptz time PK
        varchar pair_address PK
        varchar pool_name
        numeric apr
    }
```

## 性能对比图

```mermaid
graph LR
    subgraph "当前架构 (无索引器)"
        A1[Frontend] -->|10+ RPC calls| B1[BSC RPC]
        B1 -->|5-10秒| A1
        style A1 fill:#ff6b6b
        style B1 fill:#ff6b6b
    end

    subgraph "新架构 (有索引器)"
        A2[Frontend] -->|1 API call| B2[FastAPI]
        B2 -->|查询缓存| C2[(PostgreSQL)]
        C2 -->|<500ms| B2
        B2 -->|<500ms| A2
        style A2 fill:#51cf66
        style B2 fill:#51cf66
        style C2 fill:#51cf66
    end

    D[提升 10-20x]
```

---

**性能提升总结**：

| 指标 | 当前架构 | 新架构（索引器） | 提升 |
|------|---------|----------------|------|
| **响应时间** | 5-10秒 | <500ms | **10-20x** |
| **RPC 调用次数** | 10+ 次/请求 | 0 次（查缓存） | **100%减少** |
| **数据完整性** | 部分 (TODO) | 完整 | **100%覆盖** |
| **历史数据** | 无 | 有 (TimescaleDB) | **新增功能** |
| **实时更新** | 手动刷新 | 自动（30s延迟） | **新增功能** |
| **并发能力** | 受限于 RPC | 数据库查询 | **10x+** |
