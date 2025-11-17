# The Graph Subgraph Schema

## 概述

本文档提供 Paimon.dex 协议的完整 The Graph subgraph schema 定义，包括所有实体、字段、关系和索引优化。

**Subgraph Repository**: https://github.com/paimon-dex/subgraph
**GraphQL Endpoint**: https://api.thegraph.com/subgraphs/name/paimon-dex/bsc-testnet

---

## 完整 Schema 定义

### schema.graphql

```graphql
# ============================================
# 用户与账户
# ============================================

type User @entity {
  id: ID!
  address: Bytes!

  # 资产概览
  totalValueLocked: BigDecimal!
  totalDebt: BigDecimal!
  healthFactor: BigDecimal

  # veNFT 治理
  veNFTs: [VeNFT!]! @derivedFrom(field: "owner")
  totalVotingPower: BigInt!

  # 流动性
  lpPositions: [LPPosition!]! @derivedFrom(field: "user")
  totalLPValue: BigDecimal!

  # 抵押借贷
  collateralPositions: [CollateralPosition!]! @derivedFrom(field: "user")
  debtPosition: DebtPosition @derivedFrom(field: "user")

  # 交易历史
  swaps: [Swap!]! @derivedFrom(field: "user")
  totalSwapVolume: BigDecimal!

  # 奖励
  rewards: [Reward!]! @derivedFrom(field: "user")
  totalRewardsClaimed: BigDecimal!
  totalRewardsPending: BigDecimal!

  # 时间戳
  createdAt: BigInt!
  updatedAt: BigInt!
}

# ============================================
# 代币
# ============================================

type Token @entity {
  id: ID!
  address: Bytes!
  symbol: String!
  name: String!
  decimals: Int!

  # 供应量
  totalSupply: BigInt!
  totalSupplyUSD: BigDecimal!
  circulatingSupply: BigInt!

  # 持有者
  holderCount: Int!
  holders: [TokenBalance!]! @derivedFrom(field: "token")

  # 价格
  priceUSD: BigDecimal!
  priceUpdatedAt: BigInt!

  # 交易统计
  volumeUSD: BigDecimal!
  txCount: BigInt!

  # 时间戳
  createdAt: BigInt!
  updatedAt: BigInt!
}

type TokenBalance @entity {
  id: ID!
  token: Token!
  user: User!
  balance: BigInt!
  balanceUSD: BigDecimal!
  updatedAt: BigInt!
}

# ============================================
# DEX 交易对
# ============================================

type Pair @entity {
  id: ID!
  address: Bytes!
  token0: Token!
  token1: Token!
  name: String!

  # 储备量
  reserve0: BigInt!
  reserve1: BigInt!
  reserveUSD: BigDecimal!

  # LP Token
  totalSupply: BigInt!
  liquidityProviders: [LPPosition!]! @derivedFrom(field: "pair")
  lpHolderCount: Int!

  # 价格
  token0Price: BigDecimal!
  token1Price: BigDecimal!

  # 交易统计
  volumeToken0: BigInt!
  volumeToken1: BigInt!
  volumeUSD: BigDecimal!
  txCount: BigInt!

  # TWAP
  price0CumulativeLast: BigInt!
  price1CumulativeLast: BigInt!

  # 手续费
  feesUSD: BigDecimal!

  # Gauge
  gauge: Gauge @derivedFrom(field: "pair")

  # 时间戳
  createdAt: BigInt!
  createdAtBlockNumber: BigInt!
  updatedAt: BigInt!
}

type LPPosition @entity {
  id: ID!
  user: User!
  pair: Pair!
  liquidity: BigInt!
  liquidityUSD: BigDecimal!
  createdAt: BigInt!
  updatedAt: BigInt!
}

# ============================================
# 交易记录
# ============================================

type Swap @entity {
  id: ID!
  transactionHash: Bytes!
  user: User!

  # 交易详情
  tokenIn: Token!
  tokenOut: Token!
  amountIn: BigInt!
  amountOut: BigInt!
  amountInUSD: BigDecimal!
  amountOutUSD: BigDecimal!

  # 价格
  priceUSD: BigDecimal!

  # 手续费
  feeAmount: BigInt!
  feeAmountUSD: BigDecimal!

  # 区块信息
  blockNumber: BigInt!
  blockTimestamp: BigInt!
  gasUsed: BigInt!
  gasPrice: BigInt!
}

type LiquidityEvent @entity {
  id: ID!
  transactionHash: Bytes!
  user: User!
  pair: Pair!

  type: String!  # "ADD" / "REMOVE"

  amount0: BigInt!
  amount1: BigInt!
  liquidity: BigInt!

  amount0USD: BigDecimal!
  amount1USD: BigDecimal!
  liquidityUSD: BigDecimal!

  blockNumber: BigInt!
  blockTimestamp: BigInt!
}

# ============================================
# veNFT 治理
# ============================================

type VeNFT @entity {
  id: ID!
  tokenId: BigInt!
  owner: User!

  # 锁定信息
  lockedAmount: BigInt!
  lockedAmountUSD: BigDecimal!
  unlockTime: BigInt!
  lockDuration: BigInt!

  # 投票权
  votingPower: BigInt!
  votingPowerPercentage: BigDecimal!

  # 投票记录
  votes: [GaugeVote!]! @derivedFrom(field: "veNFT")
  totalVoteWeight: BigInt!

  # 奖励
  rewards: [Reward!]! @derivedFrom(field: "veNFT")
  totalRewardsClaimed: BigDecimal!
  totalBribesReceived: BigDecimal!

  # 状态
  isExpired: Boolean!

  # 时间戳
  createdAt: BigInt!
  createdAtBlockNumber: BigInt!
  updatedAt: BigInt!
}

# ============================================
# Gauge & 投票
# ============================================

type Gauge @entity {
  id: ID!
  address: Bytes!
  pair: Pair!
  lpToken: Token!

  # 质押统计
  totalStaked: BigInt!
  totalStakedUSD: BigDecimal!
  stakerCount: Int!
  stakers: [GaugeStake!]! @derivedFrom(field: "gauge")

  # 权重与投票
  weight: BigInt!
  weightPercentage: BigDecimal!
  votes: [GaugeVote!]! @derivedFrom(field: "gauge")
  totalVotes: BigInt!

  # 奖励
  rewardRate: BigInt!
  rewardRateAPR: BigDecimal!
  totalRewardsDistributed: BigDecimal!

  # 贿赂
  bribes: [Bribe!]! @derivedFrom(field: "gauge")
  totalBribesOffered: BigDecimal!

  # 时间戳
  createdAt: BigInt!
  updatedAt: BigInt!
}

type GaugeStake @entity {
  id: ID!
  gauge: Gauge!
  user: User!
  amount: BigInt!
  amountUSD: BigDecimal!
  pendingRewards: BigDecimal!
  createdAt: BigInt!
  updatedAt: BigInt!
}

type GaugeVote @entity {
  id: ID!
  veNFT: VeNFT!
  gauge: Gauge!
  weight: BigInt!
  epoch: BigInt!
  timestamp: BigInt!
}

type Bribe @entity {
  id: ID!
  gauge: Gauge!
  token: Token!
  amount: BigInt!
  amountUSD: BigDecimal!
  provider: User!
  epoch: BigInt!
  createdAt: BigInt!
}

# ============================================
# 抵押借贷
# ============================================

type CollateralAsset @entity {
  id: ID!
  address: Bytes!
  token: Token!
  name: String!
  tier: Int!
  ltvRatio: Int!
  isActive: Boolean!

  # Oracle
  priceUSD: BigDecimal!
  priceUpdatedAt: BigInt!
  priceSource: String!

  # 统计
  totalDeposited: BigInt!
  totalDepositedUSD: BigDecimal!
  depositorCount: Int!

  # 时间戳
  createdAt: BigInt!
  updatedAt: BigInt!
}

type CollateralPosition @entity {
  id: ID!
  user: User!
  asset: CollateralAsset!
  amount: BigInt!
  valueUSD: BigDecimal!
  effectiveValueUSD: BigDecimal!
  createdAt: BigInt!
  updatedAt: BigInt!
}

type DebtPosition @entity {
  id: ID!
  user: User!

  # 债务
  totalDebt: BigDecimal!
  totalCollateralValue: BigDecimal!
  effectiveCollateralValue: BigDecimal!

  # 健康因子
  healthFactor: BigDecimal!
  liquidationThreshold: BigDecimal!

  # 状态
  isAtRisk: Boolean!
  isLiquidatable: Boolean!

  # 清算
  liquidations: [Liquidation!]! @derivedFrom(field: "position")

  # 时间戳
  createdAt: BigInt!
  updatedAt: BigInt!
}

type Liquidation @entity {
  id: ID!
  transactionHash: Bytes!
  position: DebtPosition!
  liquidator: User!

  # 清算信息
  collateralSeized: BigInt!
  collateralSeizedUSD: BigDecimal!
  debtRepaid: BigDecimal!

  # 健康因子
  healthFactorBefore: BigDecimal!
  healthFactorAfter: BigDecimal!

  # 奖励
  liquidatorReward: BigDecimal!

  # 区块信息
  blockNumber: BigInt!
  blockTimestamp: BigInt!
}

# ============================================
# 奖励系统
# ============================================

type Epoch @entity {
  id: ID!
  epoch: BigInt!
  startTime: BigInt!
  endTime: BigInt!

  # 排放量
  totalEmission: BigDecimal!
  debtMiningAllocation: BigDecimal!
  lpAllocation: BigDecimal!
  stabilityPoolAllocation: BigDecimal!
  ecosystemAllocation: BigDecimal!

  # 分发
  merkleRoot: Bytes
  rewardsCount: Int!
  rewards: [Reward!]! @derivedFrom(field: "epoch")

  # 统计
  claimCount: Int!
  totalClaimed: BigDecimal!
  totalUnclaimed: BigDecimal!

  # 时间戳
  createdAt: BigInt!
}

type Reward @entity {
  id: ID!
  epoch: Epoch!
  user: User!
  veNFT: VeNFT

  # 奖励信息
  amount: BigDecimal!
  amountUSD: BigDecimal!
  source: String!  # "DebtMining" / "LP" / "Stability" / "Ecosystem"

  # 领取状态
  isClaimed: Boolean!
  claimedAt: BigInt
  claimedTxHash: Bytes

  # 时间戳
  createdAt: BigInt!
}

# ============================================
# 协议统计（全局单例）
# ============================================

type ProtocolStats @entity {
  id: ID!  # "1"

  # TVL
  totalValueLocked: BigDecimal!
  totalValueLockedUSD: BigDecimal!

  # 稳定币
  usdpTotalSupply: BigDecimal!
  psmReserveRatio: BigDecimal!

  # DEX
  totalLiquidity: BigDecimal!
  totalVolume24h: BigDecimal!
  totalFees24h: BigDecimal!

  # 治理
  totalVotingPower: BigInt!
  activeVeNFTCount: Int!

  # 抵押借贷
  totalCollateralValue: BigDecimal!
  totalDebt: BigDecimal!
  avgHealthFactor: BigDecimal!

  # 用户
  totalUsers: Int!
  activeUsers24h: Int!

  # 时间戳
  updatedAt: BigInt!
}
```

---

## Mapping 函数示例

### handlers.ts

```typescript
import {
  SwapUSDCForUSDP as SwapEvent,
  PSMParameterized
} from "../generated/PSMParameterized/PSMParameterized";
import { Swap, User, Token } from "../generated/schema";
import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";

export function handleSwap(event: SwapEvent): void {
  // 加载或创建 Swap 实体
  let swapId = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let swap = new Swap(swapId);

  // 基础信息
  swap.transactionHash = event.transaction.hash;
  swap.user = loadOrCreateUser(event.params.user).id;

  // 交易详情
  swap.tokenIn = loadOrCreateToken(event.address.toHexString()).id;
  swap.tokenOut = loadOrCreateToken(USDP_ADDRESS).id;
  swap.amountIn = event.params.usdcIn;
  swap.amountOut = event.params.usdpOut;

  // 计算 USD 价值
  let usdcPrice = getTokenPrice(USDC_ADDRESS);
  swap.amountInUSD = convertToDecimal(event.params.usdcIn, 6).times(usdcPrice);
  swap.amountOutUSD = convertToDecimal(event.params.usdpOut, 18);  // USDP = $1

  // 价格
  swap.priceUSD = swap.amountInUSD.div(convertToDecimal(event.params.usdcIn, 6));

  // 手续费（0 for PSM）
  swap.feeAmount = BigInt.fromI32(0);
  swap.feeAmountUSD = BigDecimal.fromString("0");

  // 区块信息
  swap.blockNumber = event.block.number;
  swap.blockTimestamp = event.block.timestamp;
  swap.gasUsed = event.transaction.gasUsed;
  swap.gasPrice = event.transaction.gasPrice;

  swap.save();

  // 更新用户统计
  let user = loadOrCreateUser(event.params.user);
  user.totalSwapVolume = user.totalSwapVolume.plus(swap.amountInUSD);
  user.updatedAt = event.block.timestamp;
  user.save();

  // 更新协议统计
  updateProtocolStats(event.block.timestamp);
}

function loadOrCreateUser(address: Address): User {
  let user = User.load(address.toHex());

  if (user == null) {
    user = new User(address.toHex());
    user.address = address;
    user.totalValueLocked = BigDecimal.fromString("0");
    user.totalDebt = BigDecimal.fromString("0");
    user.totalVotingPower = BigInt.fromI32(0);
    user.totalLPValue = BigDecimal.fromString("0");
    user.totalSwapVolume = BigDecimal.fromString("0");
    user.totalRewardsClaimed = BigDecimal.fromString("0");
    user.totalRewardsPending = BigDecimal.fromString("0");
    user.createdAt = event.block.timestamp;
    user.updatedAt = event.block.timestamp;
    user.save();
  }

  return user as User;
}
```

---

## 查询示例

### 1. 查询用户资产概览

```graphql
query GetUserAssets($userAddress: Bytes!) {
  user(id: $userAddress) {
    address
    totalValueLocked
    totalDebt
    healthFactor

    # veNFT
    veNFTs {
      tokenId
      lockedAmount
      votingPower
      unlockTime
    }

    # LP 持仓
    lpPositions {
      pair {
        name
        token0 { symbol }
        token1 { symbol }
      }
      liquidity
      liquidityUSD
    }

    # 抵押持仓
    collateralPositions {
      asset {
        name
        tier
      }
      amount
      valueUSD
    }
  }
}
```

### 2. 查询 Gauge 排行榜（按 APR）

```graphql
query GetTopGauges {
  gauges(
    first: 10,
    orderBy: rewardRateAPR,
    orderDirection: desc,
    where: { totalStakedUSD_gt: "10000" }
  ) {
    address
    pair {
      name
      token0 { symbol }
      token1 { symbol }
    }
    rewardRateAPR
    totalStakedUSD
    weight
    weightPercentage
  }
}
```

### 3. 查询最近交易

```graphql
query GetRecentSwaps {
  swaps(
    first: 50,
    orderBy: blockTimestamp,
    orderDirection: desc
  ) {
    transactionHash
    user { address }
    tokenIn { symbol }
    tokenOut { symbol }
    amountInUSD
    amountOutUSD
    blockTimestamp
  }
}
```

### 4. 查询用户奖励

```graphql
query GetUserRewards($userAddress: Bytes!) {
  rewards(
    where: {
      user: $userAddress,
      isClaimed: false
    }
  ) {
    epoch { epoch }
    amount
    amountUSD
    source
  }
}
```

### 5. 查询协议统计

```graphql
query GetProtocolStats {
  protocolStats(id: "1") {
    totalValueLocked
    totalValueLockedUSD
    usdpTotalSupply
    psmReserveRatio
    totalLiquidity
    totalVolume24h
    avgHealthFactor
    totalUsers
    activeUsers24h
  }
}
```

---

## 性能优化

### 索引策略

在 schema.graphql 中添加 `@index` 指令（Graph Node v0.27.0+）：

```graphql
type Swap @entity {
  id: ID!
  user: Bytes! @index
  blockTimestamp: BigInt! @index
  # ... 其他字段
}
```

### 分页最佳实践

```graphql
# ❌ 不推荐：可能超时
query {
  swaps {
    id
    user
  }
}

# ✅ 推荐：使用分页
query {
  swaps(
    first: 100,
    skip: 0,
    orderBy: blockTimestamp,
    orderDirection: desc
  ) {
    id
    user
    blockTimestamp
  }
}
```

### 过滤优化

```graphql
# ✅ 在链下过滤（推荐）
query {
  swaps(
    where: {
      blockTimestamp_gt: "1700000000",
      amountInUSD_gt: "1000"
    }
    first: 100
  ) {
    id
    amountInUSD
  }
}
```

---

## 部署流程

### 1. 安装依赖

```bash
npm install -g @graphprotocol/graph-cli
cd subgraph
npm install
```

### 2. 配置 subgraph.yaml

```yaml
specVersion: 0.0.5
schema:
  file: ./schema.graphql
dataSources:
  - kind: ethereum/contract
    name: PSMParameterized
    network: bsc-testnet
    source:
      address: "0x..."  # PSM 合约地址
      abi: PSMParameterized
      startBlock: 35000000
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - Swap
        - User
        - Token
      abis:
        - name: PSMParameterized
          file: ./abis/PSMParameterized.json
      eventHandlers:
        - event: SwapUSDCForUSDP(indexed address,uint256,uint256)
          handler: handleSwap
      file: ./src/mappings/psm.ts
```

### 3. 生成代码

```bash
graph codegen
graph build
```

### 4. 部署到 The Graph

```bash
# 创建子图
graph create paimon-dex/bsc-testnet --node https://api.thegraph.com/deploy/

# 部署
graph deploy paimon-dex/bsc-testnet \
  --ipfs https://api.thegraph.com/ipfs/ \
  --node https://api.thegraph.com/deploy/ \
  --access-token YOUR_ACCESS_TOKEN
```

---

## 监控与维护

### 健康检查

```bash
# 查询子图状态
curl https://api.thegraph.com/index-node/graphql \
  -X POST \
  -d '{"query": "{ indexingStatusForCurrentVersion(subgraphName: \"paimon-dex/bsc-testnet\") { synced health chains { latestBlock { number } chainHeadBlock { number } } fatalError { message } } }"}'
```

### 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 同步缓慢 | startBlock 设置过早 | 设置为部署区块 |
| 查询超时 | 未使用分页 | 添加 first/skip 参数 |
| 数据缺失 | Event handler 未覆盖 | 检查 eventHandlers 配置 |
| 实体冲突 | ID 生成冲突 | 使用 txHash + logIndex |

---

**下一步阅读**：
- [查询模式](./query-patterns.md) - 更多查询示例
- [核心实体](./core-entities.md) - 实体字段详解

**最后更新**：2025-11-17
