# 链上数据索引器架构设计

**版本**: v1.0
**日期**: 2025-11-15
**作者**: Claude Code + Rocky
**状态**: 设计中

---

## 1. 问题陈述

### 1.1 当前痛点

前端 `useUserPortfolio` hook 需要执行 **10+ 次合约调用** 才能加载一个用户的完整投资组合：

```typescript
// 当前实现（串行查询，5-10秒延迟）
useReadContract: debtOf(user)           // 1
useReadContract: healthFactor(user)     // 2
useReadContract: stabilityPool.balanceOf // 3
useReadContract: vePaimon.balanceOf     // 4
useReadContracts: [
  pair1.balanceOf(user),                // 5
  pair2.balanceOf(user),                // 6
  pair3.balanceOf(user),                // 7
]
useReadContract: savingRate.deposits    // 8
useReadContract: savingRate.accruedInterest // 9

// 缺失数据（TODO 注释）:
// - LP 仓位: share %, APR, pending rewards
// - Vault 仓位: collateral balance per asset, LTV, liquidation price
// - veNFT 仓位: 每个 NFT 的详细信息 (需要 N 次额外查询)
```

**问题**：
1. **性能差**：首次加载 5-10 秒（每次调用 ~500ms RPC 延迟）
2. **不完整**：很多关键数据因为查询成本太高而被标记为 TODO
3. **无历史**：无法显示 APR 趋势、收益历史
4. **无实时性**：用户需要手动刷新才能看到最新数据

### 1.2 目标

构建 **链上数据索引器（Blockchain Indexer）**，实现：

- ✅ **快速查询**：Portfolio API 响应时间 <500ms（vs 当前 5-10s）
- ✅ **完整数据**：所有 TODO 数据全部实现（APR, rewards, veNFT 详情等）
- ✅ **历史追踪**：记录历史 APR、收益、TVL 等时序数据
- ✅ **实时更新**：监听链上事件，自动更新数据库

---

## 2. 架构设计

### 2.1 三层架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                       │
│   Portfolio Page, User Center, Dashboard, Charts           │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/REST API
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend API (FastAPI)                          │
│  GET /api/portfolio/{address}  - 快速查询缓存数据           │
│  GET /api/portfolio/{address}/history - 历史数据            │
│  WebSocket /ws/portfolio - 实时数据推送                     │
└────────────────────┬────────────────────────────────────────┘
                     │ 查询 PostgreSQL
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL Database                            │
│  - portfolio_cache 表 (用户仓位快照)                        │
│  - lp_positions 表 (LP 仓位详情)                            │
│  - vault_positions 表 (Vault 仓位详情)                      │
│  - venft_positions 表 (veNFT 仓位详情)                      │
│  - historical_data 表 (时序数据 - TimescaleDB)              │
└────────────────────┬────────────────────────────────────────┘
                     │ 写入数据
                     ▲
┌─────────────────────────────────────────────────────────────┐
│         Blockchain Indexer (Python Worker)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Event        │→ │ Event        │→ │ Data         │      │
│  │ Listener     │  │ Handler      │  │ Aggregator   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  Scheduler (APScheduler/Celery Beat):                       │
│  - 每 30s: 扫描最新区块事件                                  │
│  - 每 1min: 更新 APR/Rewards                                │
│  - 每 5min: 清理过期缓存                                     │
└────────────────────┬────────────────────────────────────────┘
                     │ Web3.py RPC 调用
                     ▼
┌─────────────────────────────────────────────────────────────┐
│          BSC Testnet (Blockchain Layer)                     │
│  Smart Contracts: DEXPair, Vault, VePaimon, SavingRate      │
│  Events: AddLiquidity, Deposit, Lock, Borrow, Withdraw      │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 核心组件

#### 2.2.1 Event Listener（事件监听器）

**职责**：监听链上合约事件，触发数据更新

**监听事件列表**：

| 合约 | 事件 | 触发条件 | 更新数据 |
|------|------|---------|---------|
| **DEXPair** | `Mint(address indexed sender, uint amount0, uint amount1)` | 用户添加流动性 | LP 仓位 balance, total liquidity |
| **DEXPair** | `Burn(address indexed sender, uint amount0, uint amount1, address indexed to)` | 用户移除流动性 | LP 仓位 balance |
| **DEXPair** | `Swap(...)` | 发生交易 | 更新 reserves, 重新计算 APR |
| **USDPVault** | `Deposit(address indexed user, address indexed collateral, uint amount)` | 用户存入抵押品 | Vault 仓位 collateral balance |
| **USDPVault** | `Borrow(address indexed user, uint amount)` | 用户借出 USDP | Vault 仓位 debt |
| **USDPVault** | `Repay(address indexed user, uint amount)` | 用户还款 | Vault 仓位 debt |
| **USDPVault** | `Withdraw(address indexed user, address indexed collateral, uint amount)` | 用户提取抵押品 | Vault 仓位 collateral balance |
| **VotingEscrowPaimon** | `LockCreated(address indexed user, uint indexed tokenId, uint amount, uint lockEnd)` | 用户创建锁仓 | veNFT 仓位新增 |
| **VotingEscrowPaimon** | `LockIncreased(uint indexed tokenId, uint amount, uint lockEnd)` | 增加锁仓 | veNFT 仓位 locked amount, lock end |
| **VotingEscrowPaimon** | `Withdraw(uint indexed tokenId, uint amount)` | 解锁提取 | veNFT 仓位删除或更新 |
| **SavingRate** | `Deposit(address indexed user, uint amount)` | 用户存入 Savings | Savings 仓位 principal |
| **SavingRate** | `Withdraw(address indexed user, uint amount)` | 用户提取 Savings | Savings 仓位 principal |
| **StabilityPool** | `UserDepositChanged(address indexed depositor, uint newDeposit)` | Stability Pool 存取 | Stability Pool 仓位 |
| **GaugeController** | `VoteForGauge(...)` | 用户投票 | 重新计算 LP APR |
| **RewardDistributor** | `RewardsClaimed(address indexed user, uint amount)` | 用户领取奖励 | 清空 pending rewards |

**实现方式**：

```python
# app/indexer/event_listener.py

from web3 import Web3
from web3.contract import Contract

class EventListener:
    """监听链上事件并触发 handler"""

    def __init__(self, w3: Web3, contracts: dict[str, Contract]):
        self.w3 = w3
        self.contracts = contracts
        self.last_scanned_block = 0  # 从数据库读取

    async def scan_events(self, from_block: int, to_block: int):
        """扫描指定区块范围的事件"""

        # DEXPair events
        for pair_name, pair_contract in self.contracts['dex_pairs'].items():
            mint_events = pair_contract.events.Mint.get_logs(
                fromBlock=from_block,
                toBlock=to_block
            )
            for event in mint_events:
                await self.handle_event('dex_mint', event)

            burn_events = pair_contract.events.Burn.get_logs(
                fromBlock=from_block,
                toBlock=to_block
            )
            for event in burn_events:
                await self.handle_event('dex_burn', event)

        # USDPVault events
        vault = self.contracts['vault']
        deposit_events = vault.events.Deposit.get_logs(
            fromBlock=from_block,
            toBlock=to_block
        )
        for event in deposit_events:
            await self.handle_event('vault_deposit', event)

        # ... 其他合约事件

        # 更新扫描进度
        await self.update_last_scanned_block(to_block)

    async def handle_event(self, event_type: str, event):
        """将事件发送给对应的 handler"""
        handler = get_event_handler(event_type)
        await handler.process(event)
```

#### 2.2.2 Event Handler（事件处理器）

**职责**：解析事件数据，更新数据库

**处理流程**：

```python
# app/indexer/handlers/dex_handler.py

class DEXEventHandler:
    """处理 DEX 相关事件"""

    async def process_mint_event(self, event):
        """处理 Mint 事件（添加流动性）"""
        user_address = event['args']['sender']
        amount0 = event['args']['amount0']
        amount1 = event['args']['amount1']
        pair_address = event['address']

        # 查询链上最新数据
        pair_contract = get_contract(pair_address)
        user_balance = pair_contract.functions.balanceOf(user_address).call()
        total_supply = pair_contract.functions.totalSupply().call()
        reserves = pair_contract.functions.getReserves().call()

        # 计算 share %
        share_percentage = (user_balance / total_supply) * 100 if total_supply > 0 else 0

        # 查询 GaugeController APR
        apr = await self.calculate_apr(pair_address)

        # 查询 pending rewards
        pending_rewards = await self.get_pending_rewards(user_address, pair_address)

        # 更新数据库
        await self.update_lp_position(
            user_address=user_address,
            pair_address=pair_address,
            balance=user_balance,
            share_percentage=share_percentage,
            apr=apr,
            pending_rewards=pending_rewards,
            liquidity_usd=self.calculate_liquidity_usd(reserves),
        )

    async def calculate_apr(self, pair_address: str) -> float:
        """计算 LP APR（从 GaugeController）"""
        gauge_controller = get_contract('GaugeController')

        # 获取该 pair 的 gauge 地址
        gauge_address = gauge_controller.functions.gauges(pair_address).call()
        if gauge_address == ZERO_ADDRESS:
            return 0.0

        # 获取 emission rate
        emission_rate = gauge_controller.functions.gaugeRelativeWeight(gauge_address).call()

        # 获取 total supply
        pair_contract = get_contract(pair_address)
        total_supply = pair_contract.functions.totalSupply().call()

        # 计算年化收益
        # APR = (weekly_emission * 52 * PAIMON_price) / (total_supply * LP_price) * 100
        # 简化版本，实际需要查询价格
        return emission_rate * 10  # Placeholder
```

```python
# app/indexer/handlers/vault_handler.py

class VaultEventHandler:
    """处理 Vault 相关事件"""

    async def process_deposit_event(self, event):
        """处理 Deposit 事件（存入抵押品）"""
        user_address = event['args']['user']
        collateral_address = event['args']['collateral']
        amount = event['args']['amount']

        # 查询链上最新数据
        vault = get_contract('USDPVault')

        # 获取用户的所有抵押品（多种 collateral）
        collaterals = await self.get_user_collaterals(user_address)

        for coll in collaterals:
            balance = vault.functions.getCollateralBalance(user_address, coll).call()
            value_usd = vault.functions.getCollateralValueUSD(user_address, coll).call()

            if balance > 0:
                await self.update_vault_position(
                    user_address=user_address,
                    collateral_address=coll,
                    balance=balance,
                    value_usd=value_usd,
                )

        # 更新用户总债务和健康因子
        total_debt = vault.functions.debtOf(user_address).call()
        health_factor = vault.functions.healthFactor(user_address).call()

        await self.update_vault_summary(
            user_address=user_address,
            total_debt=total_debt,
            health_factor=health_factor,
        )
```

#### 2.2.3 Data Aggregator（数据聚合器）

**职责**：定期聚合数据，生成 portfolio 快照

```python
# app/indexer/aggregator.py

class PortfolioAggregator:
    """聚合用户投资组合数据"""

    async def aggregate_user_portfolio(self, user_address: str):
        """聚合单个用户的完整 portfolio"""

        # 查询数据库中的缓存数据
        lp_positions = await db.query(LPPosition).filter_by(user_address=user_address).all()
        vault_positions = await db.query(VaultPosition).filter_by(user_address=user_address).all()
        venft_positions = await db.query(VeNFTPosition).filter_by(user_address=user_address).all()
        savings_position = await db.query(SavingsPosition).filter_by(user_address=user_address).first()

        # 计算汇总数据
        total_lp_value = sum(pos.liquidity_usd for pos in lp_positions)
        total_collateral_value = sum(pos.value_usd for pos in vault_positions)
        total_debt = sum(pos.debt for pos in vault_positions)
        total_locked_paimon = sum(pos.locked_amount for pos in venft_positions)
        total_pending_rewards = sum(pos.pending_rewards for pos in lp_positions)

        # 计算净值
        net_worth = (
            total_lp_value +
            total_collateral_value +
            total_locked_paimon +
            (savings_position.total_value if savings_position else 0) -
            total_debt
        )

        # 生成风险警告
        risk_alerts = []
        for pos in vault_positions:
            if pos.ltv > 80:
                risk_alerts.append({
                    'type': 'liquidation',
                    'severity': 'high',
                    'message': f'{pos.asset_name} vault at {pos.ltv}% LTV - immediate action required'
                })

        # 保存到 portfolio_cache 表
        await db.execute(
            insert(PortfolioCache).values(
                user_address=user_address,
                total_net_worth=net_worth,
                total_lp_value=total_lp_value,
                total_collateral_value=total_collateral_value,
                total_debt=total_debt,
                total_locked_paimon=total_locked_paimon,
                total_pending_rewards=total_pending_rewards,
                risk_alerts=risk_alerts,
                updated_at=datetime.now(UTC),
            ).on_conflict_do_update(
                index_elements=['user_address'],
                set_={'updated_at': datetime.now(UTC), ...}
            )
        )
```

---

## 3. 数据模型设计

### 3.1 LP 仓位表

```sql
CREATE TABLE lp_positions (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL,
    pair_address VARCHAR(42) NOT NULL,
    pool_name VARCHAR(50) NOT NULL,  -- e.g., "USDP/USDC"

    -- 余额数据
    lp_token_balance NUMERIC(78, 18) NOT NULL,
    share_percentage NUMERIC(10, 6) NOT NULL,

    -- 价值数据
    liquidity_usd NUMERIC(20, 2) NOT NULL,
    token0_amount NUMERIC(78, 18) NOT NULL,
    token1_amount NUMERIC(78, 18) NOT NULL,

    -- APR 和奖励
    current_apr NUMERIC(10, 4) NOT NULL,
    pending_rewards NUMERIC(78, 18) DEFAULT 0,

    -- 时间戳
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 索引
    INDEX idx_lp_user (user_address),
    INDEX idx_lp_pair (pair_address),
    UNIQUE (user_address, pair_address)
);
```

### 3.2 Vault 仓位表

```sql
CREATE TABLE vault_positions (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL,
    collateral_address VARCHAR(42) NOT NULL,
    asset_name VARCHAR(20) NOT NULL,  -- e.g., "HYD", "USDC"

    -- 抵押品数据
    collateral_amount NUMERIC(78, 18) NOT NULL,
    collateral_value_usd NUMERIC(20, 2) NOT NULL,

    -- 债务数据
    debt_amount NUMERIC(78, 18) NOT NULL,

    -- 风险指标
    ltv_ratio NUMERIC(10, 4) NOT NULL,
    health_factor NUMERIC(20, 6) NOT NULL,
    liquidation_price NUMERIC(20, 8) NOT NULL,

    -- 时间戳
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 索引
    INDEX idx_vault_user (user_address),
    INDEX idx_vault_health (health_factor),  -- 用于查询风险仓位
    UNIQUE (user_address, collateral_address)
);
```

### 3.3 veNFT 仓位表

```sql
CREATE TABLE venft_positions (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL,
    token_id BIGINT NOT NULL,

    -- 锁仓数据
    locked_amount NUMERIC(78, 18) NOT NULL,
    lock_end BIGINT NOT NULL,  -- Unix timestamp

    -- 投票权重
    voting_power NUMERIC(78, 18) NOT NULL,

    -- 计算字段
    remaining_days INTEGER NOT NULL,
    is_expired BOOLEAN DEFAULT FALSE,

    -- 时间戳
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 索引
    INDEX idx_venft_user (user_address),
    INDEX idx_venft_expiry (lock_end),
    UNIQUE (token_id)
);
```

### 3.4 Portfolio 缓存表

```sql
CREATE TABLE portfolio_cache (
    user_address VARCHAR(42) PRIMARY KEY,

    -- 汇总值
    total_net_worth NUMERIC(20, 2) NOT NULL,
    total_lp_value NUMERIC(20, 2) NOT NULL,
    total_collateral_value NUMERIC(20, 2) NOT NULL,
    total_debt NUMERIC(20, 2) NOT NULL,
    total_locked_paimon NUMERIC(20, 2) NOT NULL,
    total_pending_rewards NUMERIC(20, 2) NOT NULL,

    -- 风险警告（JSON）
    risk_alerts JSONB DEFAULT '[]',

    -- 缓存控制
    cache_version INTEGER DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 索引
    INDEX idx_portfolio_updated (updated_at)
);
```

### 3.5 历史数据表（TimescaleDB）

```sql
-- 启用 TimescaleDB 扩展
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 创建时序数据表
CREATE TABLE portfolio_history (
    time TIMESTAMPTZ NOT NULL,
    user_address VARCHAR(42) NOT NULL,

    -- 快照数据
    net_worth NUMERIC(20, 2),
    lp_value NUMERIC(20, 2),
    vault_collateral NUMERIC(20, 2),
    vault_debt NUMERIC(20, 2),
    health_factor NUMERIC(20, 6),

    -- 转换为 hypertable（时序表）
    PRIMARY KEY (time, user_address)
);

SELECT create_hypertable('portfolio_history', 'time');

-- APR 历史表
CREATE TABLE apr_history (
    time TIMESTAMPTZ NOT NULL,
    pair_address VARCHAR(42) NOT NULL,
    pool_name VARCHAR(50) NOT NULL,
    apr NUMERIC(10, 4) NOT NULL,

    PRIMARY KEY (time, pair_address)
);

SELECT create_hypertable('apr_history', 'time');
```

### 3.6 扫描进度表

```sql
CREATE TABLE indexer_state (
    id SERIAL PRIMARY KEY,
    contract_name VARCHAR(50) NOT NULL UNIQUE,
    last_scanned_block BIGINT NOT NULL DEFAULT 0,
    last_scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_syncing BOOLEAN DEFAULT FALSE
);

-- 初始化索引器状态
INSERT INTO indexer_state (contract_name, last_scanned_block) VALUES
    ('DEXFactory', 0),
    ('USDPVault', 0),
    ('VotingEscrowPaimon', 0),
    ('SavingRate', 0),
    ('StabilityPool', 0),
    ('GaugeController', 0);
```

---

## 4. 定时任务调度

### 4.1 调度策略

使用 **APScheduler** 或 **Celery Beat** 实现定时任务：

```python
# app/indexer/scheduler.py

from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()

# 每 30 秒扫描最新区块事件
@scheduler.scheduled_job('interval', seconds=30)
async def scan_latest_events():
    """扫描最新区块的事件"""
    await event_listener.scan_latest_blocks()

# 每 1 分钟更新 APR 和 pending rewards
@scheduler.scheduled_job('interval', minutes=1)
async def update_apr_and_rewards():
    """更新所有 LP 的 APR 和 pending rewards"""
    await data_aggregator.update_all_aprs()
    await data_aggregator.update_all_pending_rewards()

# 每 5 分钟聚合 portfolio 数据
@scheduler.scheduled_job('interval', minutes=5)
async def aggregate_portfolios():
    """聚合所有活跃用户的 portfolio"""
    active_users = await get_active_users()
    for user in active_users:
        await portfolio_aggregator.aggregate_user_portfolio(user)

# 每小时记录历史数据
@scheduler.scheduled_job('interval', hours=1)
async def record_historical_data():
    """记录历史快照到 TimescaleDB"""
    await historical_recorder.record_portfolio_snapshots()
    await historical_recorder.record_apr_snapshots()

# 启动调度器
scheduler.start()
```

---

## 5. API 端点设计

### 5.1 Portfolio API（加速版）

```python
# app/routers/portfolio.py

@router.get("/portfolio/{address}", response_model=PortfolioResponse)
async def get_user_portfolio(
    address: str,
    db: AsyncSession = Depends(get_db),
):
    """
    获取用户投资组合（从缓存读取，<500ms）

    与前端 useUserPortfolio 返回相同结构，但数据来自数据库缓存。
    """
    # 查询 portfolio_cache
    cache = await db.execute(
        select(PortfolioCache).where(PortfolioCache.user_address == address.lower())
    )
    portfolio_cache = cache.scalar_one_or_none()

    if not portfolio_cache:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    # 查询详细仓位
    lp_positions = await db.execute(
        select(LPPosition).where(LPPosition.user_address == address.lower())
    )
    vault_positions = await db.execute(
        select(VaultPosition).where(VaultPosition.user_address == address.lower())
    )
    venft_positions = await db.execute(
        select(VeNFTPosition).where(VeNFTPosition.user_address == address.lower())
    )

    return PortfolioResponse(
        lpPositions=[serialize_lp(pos) for pos in lp_positions.scalars()],
        vaultPositions=[serialize_vault(pos) for pos in vault_positions.scalars()],
        veNFTPositions=[serialize_venft(pos) for pos in venft_positions.scalars()],
        totalNetWorth=portfolio_cache.total_net_worth,
        totalPendingRewards=portfolio_cache.total_pending_rewards,
        riskAlerts=portfolio_cache.risk_alerts,
        # ... 其他字段
    )
```

### 5.2 历史数据 API

```python
@router.get("/portfolio/{address}/history", response_model=HistoricalDataResponse)
async def get_portfolio_history(
    address: str,
    timeframe: str = Query("7d", regex="^(1d|7d|30d|90d|1y)$"),
    db: AsyncSession = Depends(get_db),
):
    """
    获取用户投资组合历史数据（用于图表）

    timeframe: 1d, 7d, 30d, 90d, 1y
    """
    # 计算时间范围
    now = datetime.now(UTC)
    time_delta = {
        '1d': timedelta(days=1),
        '7d': timedelta(days=7),
        '30d': timedelta(days=30),
        '90d': timedelta(days=90),
        '1y': timedelta(days=365),
    }[timeframe]

    start_time = now - time_delta

    # 查询 TimescaleDB
    query = select(PortfolioHistory).where(
        PortfolioHistory.user_address == address.lower(),
        PortfolioHistory.time >= start_time
    ).order_by(PortfolioHistory.time)

    result = await db.execute(query)
    history = result.scalars().all()

    return HistoricalDataResponse(
        dataPoints=[
            {
                'timestamp': h.time.isoformat(),
                'netWorth': h.net_worth,
                'lpValue': h.lp_value,
                'vaultCollateral': h.vault_collateral,
                'vaultDebt': h.vault_debt,
                'healthFactor': h.health_factor,
            }
            for h in history
        ]
    )
```

---

## 6. 扩展性设计

### 6.1 水平扩展

- **多 Worker 实例**：部署多个 indexer worker，通过 Redis 分布式锁避免重复扫描
- **数据库读写分离**：主库写入，从库查询
- **缓存层**：Redis 缓存热点数据（前 1000 个活跃用户）

### 6.2 容错设计

- **断点续传**：indexer_state 表记录扫描进度，崩溃后从断点恢复
- **重试机制**：RPC 调用失败自动重试（最多 3 次，exponential backoff）
- **数据校验**：定期全量扫描，与链上数据对比，修正偏差

---

## 7. 性能优化

### 7.1 批量查询

```python
# 批量查询用户 LP 余额（避免 N 次 RPC 调用）
users = ['0x123...', '0x456...', ...]
pair_address = '0xABC...'

# 使用 Multicall 合约批量查询
multicall = get_contract('Multicall')
calls = [
    (pair_address, pair_contract.encodeABI(fn_name='balanceOf', args=[user]))
    for user in users
]
results = multicall.functions.aggregate(calls).call()

for i, user in enumerate(users):
    balance = decode_result(results[i])
    await update_lp_position(user, balance)
```

### 7.2 增量更新

- 只监听变更事件，不做全量扫描
- 仅更新有变化的用户数据
- 使用 `ON CONFLICT DO UPDATE` 实现 upsert

---

## 8. 部署架构

```
┌─────────────────────────────────────────┐
│         Production Deployment           │
├─────────────────────────────────────────┤
│  Frontend (Vercel)                      │
│      ↓ HTTPS                            │
│  Backend API (Railway/Render)           │
│    - FastAPI (4 instances)              │
│    - Gunicorn + Uvicorn workers         │
│      ↓                                  │
│  PostgreSQL (Supabase)                  │
│    - Primary (writes)                   │
│    - Replica (reads)                    │
│      ↓                                  │
│  Indexer Worker (Railway/Render)        │
│    - 2 instances (high availability)    │
│    - Redis distributed lock             │
│      ↓ Web3 RPC                         │
│  BSC Testnet RPC (Binance/Ankr)         │
└─────────────────────────────────────────┘
```

---

## 9. 交付物（Deliverables）

### 9.1 代码

- ✅ `app/indexer/event_listener.py` - 事件监听器
- ✅ `app/indexer/handlers/*.py` - 各合约事件处理器
- ✅ `app/indexer/aggregator.py` - 数据聚合器
- ✅ `app/indexer/scheduler.py` - 定时任务调度
- ✅ `app/models/portfolio_cache.py` - 数据模型
- ✅ `app/routers/portfolio.py` - Portfolio API 端点

### 9.2 数据库迁移

- ✅ Alembic 迁移：创建所有索引器相关表
- ✅ TimescaleDB 初始化脚本

### 9.3 文档

- ✅ 本架构设计文档
- ✅ API 文档（OpenAPI/Swagger）
- ✅ 部署指南
- ✅ 监控告警配置

---

## 10. 验收标准（Acceptance Criteria）

### Task 37（当前任务）- 架构设计

- ✅ 架构图完成（3 层架构：Frontend → Backend API → Indexer → Blockchain）
- ✅ 事件列表明确（10+ 合约事件定义）
- ✅ 数据流清晰（Event → Handler → Aggregator → Cache）
- ✅ 可扩展性良好（水平扩展、容错设计、性能优化方案）

### Task 38-42（后续任务）- 实现验证

- ✅ LP 仓位索引正确：APR, pending rewards 全部显示
- ✅ Vault 仓位索引正确：多抵押品支持，LTV 和清算价格准确
- ✅ veNFT 仓位索引正确：每个 NFT 详情完整
- ✅ Portfolio API 响应时间 <500ms（vs 当前 5-10s，提升 10-20x）
- ✅ 历史数据可查询：APR 趋势图、收益曲线图
- ✅ 实时更新：用户操作后 30s 内数据自动刷新

---

**状态**: ✅ Task 37 设计完成，待评审
**下一步**: Task 38 - 实现 LP 仓位索引（开始编码）
