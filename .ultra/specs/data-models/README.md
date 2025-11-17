# Paimon.dex 数据模型文档

## 概述

本文档详细描述 Paimon.dex 协议的数据结构，包括：
- **链上数据**：合约 storage 布局、状态变量
- **链下数据**：The Graph schema、数据库设计
- **数据关系**：实体关系图（ERD）
- **查询模式**：常见查询示例

**目标受众**：后端开发者、数据分析师、The Graph 开发者

---

## 快速导航

| 模块 | 文档 | 说明 |
|------|------|------|
| 📊 **核心实体** | [core-entities.md](./core-entities.md) | 用户、代币、池子等核心实体 |
| 🔗 **数据关系** | [entity-relationships.md](./entity-relationships.md) | ER图、关系说明 |
| 📈 **The Graph Schema** | [subgraph-schema.md](./subgraph-schema.md) | GraphQL schema定义 |
| 💾 **链下数据库** | [offchain-database.md](./offchain-database.md) | PostgreSQL schema设计 |
| 🔍 **常见查询** | [query-patterns.md](./query-patterns.md) | SQL/GraphQL查询示例 |

---

## 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                      前端 DApp                               │
└───────────┬─────────────────────────────────┬───────────────┘
            │                                 │
            │ (读写)                          │ (只读)
            ▼                                 ▼
┌─────────────────────┐           ┌─────────────────────┐
│   BSC 主网/测试网    │           │   The Graph 节点     │
│   (链上数据)         │──────────▶│   (链下索引)         │
│                     │  Event    │                     │
│ • 合约 Storage      │  Logs     │ • GraphQL API       │
│ • Transaction Data  │           │ • 聚合数据          │
│ • Event Logs        │           │ • 历史快照          │
└─────────────────────┘           └─────────────────────┘
            │                                 │
            │ (历史数据)                       │ (分析查询)
            ▼                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    后端服务 (可选)                            │
│                                                              │
│ • PostgreSQL 数据库（用户KYC、项目元数据）                    │
│ • Merkle Tree 生成服务（奖励分发）                            │
│ • NAV Oracle 聚合服务（RWA价格）                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 核心数据流

### 1. 用户交互流

```
用户操作 (前端)
    ↓
生成交易 (Viem)
    ↓
提交到 BSC (链上)
    ↓
合约执行 & 更新 Storage
    ↓
发出事件日志 (Event)
    ↓
The Graph 监听 & 索引
    ↓
GraphQL API 提供查询
    ↓
前端刷新 UI
```

### 2. 奖励分发流

```
用户操作记录 (链上事件)
    ↓
后端服务订阅事件
    ↓
计算奖励 (链下)
    ↓
生成 Merkle Tree
    ↓
提交 Merkle Root (链上)
    ↓
用户领取 (Merkle Proof 验证)
```

### 3. RWA 价格更新流

```
Chainlink Oracle (链上)
    ↓                    ↓
                NAV Oracle (链下)
    ↓                    ↓
RWAPriceOracle 合约聚合
    ↓
双源价格 + 偏差检测
    ↓
价格更新事件
    ↓
前端/The Graph 同步
```

---

## 数据层次结构

### 链上数据（Source of Truth）

```
合约层
├── PSMParameterized (稳定币兑换)
│   ├── totalUSDCReserve: uint256
│   ├── totalUSDPSupply: uint256
│   └── swapHistory: mapping(address => SwapRecord[])
│
├── Treasury (抵押借贷)
│   ├── userCollaterals: mapping(address => Collateral[])
│   ├── userDebts: mapping(address => uint256)
│   └── healthFactors: mapping(address => uint256)
│
├── VotingEscrowPaimon (veNFT治理)
│   ├── locked: mapping(uint256 => LockedBalance)
│   ├── ownerOf: mapping(uint256 => address)
│   └── votingPower: mapping(uint256 => uint256)
│
├── DEXPair (AMM流动性)
│   ├── reserves: (uint112, uint112, uint32)
│   ├── totalSupply: uint256
│   └── lpBalances: mapping(address => uint256)
│
├── GaugeController (流动性挖矿)
│   ├── gaugeWeights: mapping(address => uint256)
│   ├── userVotes: mapping(address => mapping(address => uint256))
│   └── rewardsPerEpoch: mapping(uint256 => uint256)
│
└── RewardDistributor (奖励分发)
    ├── merkleRoots: mapping(uint256 => bytes32)
    ├── claimed: mapping(uint256 => mapping(address => bool))
    └── claimAmounts: mapping(uint256 => mapping(address => uint256))
```

### 链下数据（索引与聚合）

```
The Graph 实体
├── User
│   ├── address: Bytes!
│   ├── totalValueLocked: BigInt!
│   ├── veNFTs: [VeNFT!]! @derivedFrom(field: "owner")
│   └── lpPositions: [LPPosition!]! @derivedFrom(field: "user")
│
├── Token
│   ├── address: Bytes!
│   ├── symbol: String!
│   ├── totalSupply: BigInt!
│   └── holders: [TokenBalance!]! @derivedFrom(field: "token")
│
├── Pair
│   ├── id: ID!
│   ├── token0: Token!
│   ├── token1: Token!
│   ├── reserve0: BigInt!
│   ├── reserve1: BigInt!
│   ├── totalSupply: BigInt!
│   ├── volumeUSD: BigDecimal!
│   └── liquidityProviders: [LPPosition!]! @derivedFrom(field: "pair")
│
├── VeNFT
│   ├── tokenId: BigInt!
│   ├── owner: User!
│   ├── lockedAmount: BigInt!
│   ├── unlockTime: BigInt!
│   ├── votingPower: BigInt!
│   └── votes: [GaugeVote!]! @derivedFrom(field: "veNFT")
│
└── Epoch
    ├── epoch: BigInt!
    ├── startTime: BigInt!
    ├── endTime: BigInt!
    ├── totalEmission: BigInt!
    ├── debtMiningAllocation: BigInt!
    ├── lpAllocation: BigInt!
    └── rewards: [Reward!]! @derivedFrom(field: "epoch")
```

---

## 关键数据类型

### 1. 地址类型（Solidity vs The Graph）

| Solidity | The Graph | TypeScript | 说明 |
|----------|-----------|------------|------|
| `address` | `Bytes` | `0x${string}` | 20字节以太坊地址 |
| `address payable` | `Bytes` | `0x${string}` | 可接收ETH的地址 |

### 2. 数值类型

| Solidity | The Graph | TypeScript | 精度 |
|----------|-----------|------------|------|
| `uint256` | `BigInt` | `bigint` | 任意大整数 |
| `uint128` | `BigInt` | `bigint` | 0 ~ 2^128-1 |
| `uint112` | `BigInt` | `bigint` | 用于 Pair reserves |
| `uint32` | `Int` | `number` | Unix 时间戳 |
| `uint8` | `Int` | `number` | 小数位数 |

### 3. 自定义结构体

#### LockedBalance (VotingEscrowPaimon)

```solidity
struct LockedBalance {
    uint256 amount;      // 锁定的 PAIMON 数量
    uint256 end;         // 解锁时间戳
}
```

```graphql
type VeNFT @entity {
  id: ID!
  tokenId: BigInt!
  lockedAmount: BigInt!    # 对应 amount
  unlockTime: BigInt!      # 对应 end
  votingPower: BigInt!     # 计算值：amount * (end - now) / MAX_LOCK
}
```

#### Collateral (Treasury)

```solidity
struct Collateral {
    address token;           // RWA代币地址
    uint256 amount;          // 抵押数量
    uint256 value;           // 美元价值（18位精度）
    uint8 tier;              // 抵押品等级（T1/T2/T3）
    uint256 ltvRatio;        // 贷款价值比（基点）
}
```

```graphql
type CollateralPosition @entity {
  id: ID!
  user: User!
  token: Token!
  amount: BigInt!
  valueUSD: BigDecimal!    # 18位精度转为 Decimal
  tier: Int!               # 1/2/3
  ltvRatio: Int!           # 基点 (8000 = 80%)
  healthFactor: BigDecimal!
}
```

---

## 精度处理规范

### Token 精度

| Token | Decimals | Solidity 存储 | The Graph 显示 | 前端显示 |
|-------|----------|--------------|---------------|---------|
| USDP | 18 | `1000000000000000000` (1e18) | `BigInt("1000000000000000000")` | `formatUnits(value, 18)` |
| USDC (BSC主网) | 18 | `1000000000000000000` (1e18) | `BigInt("1000000000000000000")` | `formatUnits(value, 18)` |
| USDC (测试网) | 6 | `1000000` (1e6) | `BigInt("1000000")` | `formatUnits(value, 6)` |
| PAIMON | 18 | `1000000000000000000` (1e18) | `BigInt("1000000000000000000")` | `formatUnits(value, 18)` |
| BNB | 18 | `1000000000000000000` (1e18) | `BigInt("1000000000000000000")` | `formatUnits(value, 18)` |

### 价格精度

| 类型 | 精度 | 示例 | 说明 |
|------|------|------|------|
| Oracle 价格 | 18位 | `1000000000000000000` | = $1.00 |
| 汇率 | 18位 | `1050000000000000000` | = 1.05 (1 tokenA = 1.05 tokenB) |
| LTV 比率 | 基点 (10000) | `8000` | = 80% |
| 健康因子 | 18位 | `1500000000000000000` | = 1.5 |
| 百分比 | 基点 (10000) | `250` | = 2.5% |

### 时间精度

| 类型 | 单位 | Solidity | The Graph |
|------|------|----------|-----------|
| 区块时间戳 | 秒 | `uint256` (block.timestamp) | `BigInt` |
| 持续时间 | 秒 | `uint256` (1 week = 604800) | `BigInt` |
| Epoch | 编号 | `uint256` (0, 1, 2, ...) | `BigInt` |

---

## 数据一致性保证

### 链上一致性（合约层面）

1. **原子性** - 所有状态变更在单个交易中完成
   ```solidity
   function swapUSDCForUSDP(uint256 usdcAmount) external {
       // ✅ 原子操作：转账 + 铸币
       usdc.transferFrom(msg.sender, address(this), usdcAmount);
       usdp.mint(msg.sender, usdpAmount);
       // 要么全成功，要么全回滚
   }
   ```

2. **不变量检查** - 关键不变量在每次操作后验证
   ```solidity
   // PSM 不变量：USDC储备 >= USDP总供应
   assert(usdc.balanceOf(address(this)) >= usdp.totalSupply());

   // DEX 不变量：K = reserve0 * reserve1 只能增加
   assert(reserve0 * reserve1 >= k_before);
   ```

3. **访问控制** - 敏感操作需要权限验证
   ```solidity
   function updateGaugeWeights() external onlyRole(GAUGE_ADMIN_ROLE) {
       // 只有管理员可执行
   }
   ```

### 链下一致性（The Graph）

1. **事件驱动索引** - 所有状态变更通过事件同步
   ```typescript
   export function handleSwap(event: SwapUSDCForUSDP): void {
       let swap = new Swap(event.transaction.hash.toHex());
       swap.user = event.params.user;
       swap.usdcIn = event.params.usdcIn;
       swap.usdpOut = event.params.usdpOut;
       swap.save();

       // 更新用户统计
       let user = loadOrCreateUser(event.params.user);
       user.totalSwapVolume = user.totalSwapVolume.plus(event.params.usdcIn);
       user.save();
   }
   ```

2. **派生字段** - 自动计算聚合数据
   ```graphql
   type User @entity {
     id: ID!
     veNFTs: [VeNFT!]! @derivedFrom(field: "owner")
     totalVotingPower: BigInt!  # 自动从 veNFTs 汇总
   }
   ```

3. **区块重组处理** - 支持链重组回滚
   ```yaml
   dataSources:
     - kind: ethereum/contract
       network: bsc-testnet
       source:
         startBlock: 35000000
       mapping:
         abis:
           - name: PSM
             file: ./abis/PSMParameterized.json
   ```

---

## 查询性能优化

### 索引策略

#### The Graph 索引

```graphql
type Swap @entity {
  id: ID!
  user: Bytes! @index  # ← 为 user 创建索引（常用查询条件）
  usdcIn: BigInt!
  usdpOut: BigInt!
  blockNumber: BigInt! @index  # ← 时间范围查询优化
  timestamp: BigInt! @index
}

type LPPosition @entity {
  id: ID!
  user: User! @index
  pair: Pair! @index
  liquidity: BigInt!
}
```

#### PostgreSQL 索引（后端数据库）

```sql
-- 用户KYC表
CREATE TABLE user_kyc (
    address VARCHAR(42) PRIMARY KEY,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_kyc_status ON user_kyc(status);
CREATE INDEX idx_kyc_created ON user_kyc(created_at);

-- RWA项目表
CREATE TABLE rwa_projects (
    project_id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tier INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_project_status ON rwa_projects(status);
CREATE INDEX idx_project_tier ON rwa_projects(tier);
```

### 查询优化技巧

#### 1. 分页查询（避免大结果集）

```graphql
# ❌ 错误：不分页（可能返回数百万条记录）
query {
  swaps {
    id
    user
    usdcIn
  }
}

# ✅ 正确：使用分页
query {
  swaps(
    first: 100,
    skip: 0,
    orderBy: timestamp,
    orderDirection: desc
  ) {
    id
    user
    usdcIn
    timestamp
  }
}
```

#### 2. 字段过滤（只查询需要的字段）

```graphql
# ❌ 错误：查询所有字段
query {
  users {
    id
    veNFTs { ... }
    lpPositions { ... }
    swaps { ... }
    rewards { ... }
  }
}

# ✅ 正确：只查询必要字段
query {
  users(where: { totalValueLocked_gt: "1000000000000000000" }) {
    id
    totalValueLocked
  }
}
```

#### 3. 时间范围过滤

```graphql
# 查询最近24小时的交易
query {
  swaps(
    where: {
      timestamp_gt: "1700000000"  # 当前时间 - 86400
    }
    orderBy: timestamp
    orderDirection: desc
  ) {
    id
    user
    usdcIn
    timestamp
  }
}
```

---

## 数据备份与恢复

### The Graph 数据备份

```bash
# 导出子图数据（PostgreSQL dump）
docker exec -t subgraph-postgres pg_dump -U graph-node -d graph-node > backup.sql

# 恢复数据
docker exec -i subgraph-postgres psql -U graph-node -d graph-node < backup.sql
```

### 链上数据归档（Archive Node）

```javascript
// 使用 Archive Node 查询历史状态
const provider = new ethers.providers.JsonRpcProvider(
  'https://bsc-mainnet.nodereal.io/v1/YOUR_API_KEY',
  {
    name: 'bsc',
    chainId: 56,
    _defaultProvider: (providers) => providers.ArchiveNodeProvider
  }
);

// 查询历史区块的合约状态
const historicalBalance = await contract.balanceOf(
  userAddress,
  { blockTag: 30000000 }  // 指定历史区块
);
```

---

## 数据监控与告警

### 关键指标监控

```javascript
// 监控脚本示例
const metrics = {
  // PSM 健康度
  psmReserveRatio: async () => {
    const usdcReserve = await usdc.balanceOf(psmAddress);
    const usdpSupply = await usdp.totalSupply();
    return (usdcReserve / usdpSupply) * 100;  // 应该 >= 100%
  },

  // Treasury 整体健康因子
  avgHealthFactor: async () => {
    const allUsers = await subgraph.query(`
      query {
        users(where: { debt_gt: "0" }) {
          healthFactor
        }
      }
    `);
    const avg = allUsers.reduce((sum, u) => sum + parseFloat(u.healthFactor), 0) / allUsers.length;
    return avg;  // 应该 > 1.5
  },

  // DEX TVL
  totalValueLocked: async () => {
    const pairs = await subgraph.query(`
      query {
        pairs {
          reserveUSD
        }
      }
    `);
    return pairs.reduce((sum, p) => sum + parseFloat(p.reserveUSD), 0);
  }
};

// 告警阈值
const alerts = {
  psmReserveRatio: { min: 100, critical: 95 },
  avgHealthFactor: { min: 1.5, critical: 1.2 },
  totalValueLocked: { min: 1000000, critical: 500000 }
};

// 定时检查
setInterval(async () => {
  for (const [metric, thresholds] of Object.entries(alerts)) {
    const value = await metrics[metric]();

    if (value < thresholds.critical) {
      sendAlert(`🔴 CRITICAL: ${metric} = ${value} (< ${thresholds.critical})`);
    } else if (value < thresholds.min) {
      sendAlert(`🟡 WARNING: ${metric} = ${value} (< ${thresholds.min})`);
    }
  }
}, 300000);  // 每5分钟检查
```

---

## 下一步阅读

1. **[核心实体定义](./core-entities.md)** - 详细的实体结构和字段说明
2. **[数据关系图](./entity-relationships.md)** - ER图和关系映射
3. **[The Graph Schema](./subgraph-schema.md)** - 完整的 GraphQL schema
4. **[链下数据库设计](./offchain-database.md)** - PostgreSQL表结构
5. **[查询模式](./query-patterns.md)** - 常见查询示例和最佳实践

---

## 附录：工具推荐

| 工具 | 用途 | 链接 |
|------|------|------|
| **The Graph Studio** | 子图开发与部署 | https://thegraph.com/studio |
| **pgAdmin** | PostgreSQL 管理 | https://www.pgadmin.org/ |
| **DBeaver** | 通用数据库工具 | https://dbeaver.io/ |
| **GraphiQL** | GraphQL 查询调试 | https://github.com/graphql/graphiql |
| **Tenderly** | 合约状态可视化 | https://tenderly.co/ |
| **Dune Analytics** | 链上数据分析 | https://dune.com/ |

---

**最后更新**：2025-11-17
