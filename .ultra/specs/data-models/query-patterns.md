# 常见查询模式

## 概述

本文档提供 Paimon.dex 协议数据查询的常见模式和最佳实践，包括 GraphQL（The Graph）和 SQL（PostgreSQL）查询示例。

---

## GraphQL 查询模式（The Graph）

### 1. 用户资产查询

#### 1.1 完整资产概览

```graphql
query GetUserFullProfile($userAddress: Bytes!) {
  user(id: $userAddress) {
    # 基础信息
    address
    totalValueLocked
    totalDebt
    healthFactor

    # veNFT 持仓
    veNFTs(orderBy: votingPower, orderDirection: desc) {
      tokenId
      lockedAmount
      lockedAmountUSD
      unlockTime
      votingPower
      votes {
        gauge {
          pair { name }
          weight
        }
      }
    }

    # LP 持仓
    lpPositions(orderBy: liquidityUSD, orderDirection: desc) {
      pair {
        name
        token0 { symbol priceUSD }
        token1 { symbol priceUSD }
      }
      liquidity
      liquidityUSD
    }

    # 抵押持仓
    collateralPositions {
      asset {
        name
        tier
        ltvRatio
      }
      amount
      valueUSD
      effectiveValueUSD
    }

    # 债务状态
    debtPosition {
      totalDebt
      totalCollateralValue
      healthFactor
      isAtRisk
      isLiquidatable
    }
  }
}
```

#### 1.2 用户奖励汇总

```graphql
query GetUserRewards($userAddress: Bytes!) {
  # 待领取奖励
  rewards(
    where: {
      user: $userAddress,
      isClaimed: false
    }
    orderBy: epoch,
    orderDirection: desc
  ) {
    epoch { epoch startTime endTime }
    amount
    amountUSD
    source
  }

  # 已领取奖励
  claimedRewards: rewards(
    where: {
      user: $userAddress,
      isClaimed: true
    }
    first: 10,
    orderBy: claimedAt,
    orderDirection: desc
  ) {
    epoch { epoch }
    amount
    amountUSD
    claimedAt
    claimedTxHash
  }
}
```

### 2. Gauge 与投票查询

#### 2.1 Gauge 排行榜（多维度）

```graphql
query GetGaugeRankings {
  # 按 APR 排序
  topAPRGauges: gauges(
    first: 10,
    orderBy: rewardRateAPR,
    orderDirection: desc,
    where: { totalStakedUSD_gt: "10000" }
  ) {
    id
    pair {
      name
      reserveUSD
    }
    rewardRateAPR
    totalStakedUSD
  }

  # 按 TVL 排序
  topTVLGauges: gauges(
    first: 10,
    orderBy: totalStakedUSD,
    orderDirection: desc
  ) {
    id
    pair { name }
    totalStakedUSD
    rewardRateAPR
    weightPercentage
  }

  # 按投票权重排序
  topVotedGauges: gauges(
    first: 10,
    orderBy: weight,
    orderDirection: desc
  ) {
    id
    pair { name }
    weight
    weightPercentage
    totalVotes
  }
}
```

#### 2.2 用户投票历史

```graphql
query GetUserVotes($veNFTId: ID!) {
  veNFT(id: $veNFTId) {
    tokenId
    votingPower

    votes(
      orderBy: epoch,
      orderDirection: desc,
      first: 50
    ) {
      gauge {
        pair {
          name
          token0 { symbol }
          token1 { symbol }
        }
      }
      weight
      epoch
      timestamp
    }
  }
}
```

### 3. 交易与流动性查询

#### 3.1 最近交易（多类型）

```graphql
query GetRecentActivity {
  # 最近兑换
  recentSwaps: swaps(
    first: 20,
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

  # 最近流动性添加
  recentAdds: liquidityEvents(
    first: 20,
    where: { type: "ADD" },
    orderBy: blockTimestamp,
    orderDirection: desc
  ) {
    transactionHash
    user { address }
    pair {
      name
      token0 { symbol }
      token1 { symbol }
    }
    liquidityUSD
    blockTimestamp
  }

  # 最近清算
  recentLiquidations: liquidations(
    first: 10,
    orderBy: blockTimestamp,
    orderDirection: desc
  ) {
    transactionHash
    position {
      user { address }
    }
    collateralSeizedUSD
    debtRepaid
    healthFactorBefore
    blockTimestamp
  }
}
```

#### 3.2 交易对深度分析

```graphql
query GetPairAnalytics($pairAddress: ID!) {
  pair(id: $pairAddress) {
    name
    token0 { symbol priceUSD }
    token1 { symbol priceUSD }

    # 储备量
    reserve0
    reserve1
    reserveUSD

    # 24h 统计
    volumeUSD
    feesUSD

    # LP 分布
    liquidityProviders(
      first: 10,
      orderBy: liquidityUSD,
      orderDirection: desc
    ) {
      user { address }
      liquidityUSD
    }

    # Gauge 信息
    gauge {
      rewardRateAPR
      totalStakedUSD
      weightPercentage
    }
  }
}
```

### 4. 协议统计查询

#### 4.1 协议概览

```graphql
query GetProtocolOverview {
  protocolStats(id: "1") {
    # TVL
    totalValueLocked
    totalValueLockedUSD

    # 稳定币
    usdpTotalSupply
    psmReserveRatio

    # DEX
    totalLiquidity
    totalVolume24h
    totalFees24h

    # 治理
    totalVotingPower
    activeVeNFTCount

    # 抵押借贷
    totalCollateralValue
    totalDebt
    avgHealthFactor

    # 用户
    totalUsers
    activeUsers24h

    updatedAt
  }
}
```

#### 4.2 Top 用户排行

```graphql
query GetTopUsers {
  # TVL 排行
  topByTVL: users(
    first: 50,
    orderBy: totalValueLocked,
    orderDirection: desc
  ) {
    address
    totalValueLocked
    totalDebt
  }

  # 投票权排行
  topByVotingPower: users(
    first: 50,
    orderBy: totalVotingPower,
    orderDirection: desc
  ) {
    address
    totalVotingPower
    veNFTs { tokenId lockedAmount }
  }

  # 交易量排行
  topByVolume: users(
    first: 50,
    orderBy: totalSwapVolume,
    orderDirection: desc
  ) {
    address
    totalSwapVolume
  }
}
```

### 5. 时间序列查询

#### 5.1 历史数据（分页）

```graphql
query GetHistoricalSwaps($startTime: BigInt!, $endTime: BigInt!, $skip: Int!, $first: Int!) {
  swaps(
    where: {
      blockTimestamp_gte: $startTime,
      blockTimestamp_lte: $endTime
    }
    orderBy: blockTimestamp,
    orderDirection: desc,
    skip: $skip,
    first: $first
  ) {
    transactionHash
    user { address }
    tokenIn { symbol }
    tokenOut { symbol }
    amountInUSD
    blockTimestamp
  }
}

# 使用示例：
# variables:
# {
#   "startTime": "1700000000",
#   "endTime": "1700086400",
#   "skip": 0,
#   "first": 100
# }
```

---

## SQL 查询模式（PostgreSQL 后端）

### 1. 用户 KYC 查询

```sql
-- 查询用户 KYC 状态
SELECT
    address,
    status,
    kyc_provider,
    verified_at,
    created_at
FROM user_kyc
WHERE address = LOWER('0x...')
  AND status = 'verified';

-- 批量查询 KYC 状态
SELECT
    address,
    status,
    verified_at
FROM user_kyc
WHERE address = ANY(ARRAY[
    LOWER('0x123...'),
    LOWER('0x456...'),
    LOWER('0x789...')
]);
```

### 2. RWA 项目查询

```sql
-- 查询活跃的 RWA 项目
SELECT
    p.project_id,
    p.name,
    p.tier,
    p.target_raise,
    p.total_raised,
    p.status,
    p.start_time,
    p.end_time,
    COUNT(DISTINCT pr.user_address) AS participant_count
FROM rwa_projects p
LEFT JOIN project_participations pr ON p.project_id = pr.project_id
WHERE p.status = 'active'
  AND p.start_time <= NOW()
  AND p.end_time >= NOW()
GROUP BY p.project_id
ORDER BY p.total_raised DESC;

-- 用户参与的项目
SELECT
    p.project_id,
    p.name,
    pr.usdc_amount,
    pr.token_amount,
    pr.participated_at
FROM project_participations pr
JOIN rwa_projects p ON pr.project_id = p.project_id
WHERE pr.user_address = LOWER('0x...')
ORDER BY pr.participated_at DESC;
```

### 3. Merkle Tree 数据查询

```sql
-- 查询用户在特定周期的奖励
SELECT
    epoch,
    user_address,
    reward_amount,
    merkle_proof,
    is_claimed
FROM reward_merkle_data
WHERE user_address = LOWER('0x...')
  AND epoch = 12
LIMIT 1;

-- 查询未领取的奖励
SELECT
    epoch,
    reward_amount,
    source
FROM reward_merkle_data
WHERE user_address = LOWER('0x...')
  AND is_claimed = false
ORDER BY epoch DESC;
```

### 4. 聚合统计查询

```sql
-- 每日 TVL 统计
SELECT
    DATE(timestamp) AS date,
    AVG(total_value_locked) AS avg_tvl,
    MAX(total_value_locked) AS max_tvl,
    MIN(total_value_locked) AS min_tvl
FROM protocol_snapshots
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- 用户增长统计
SELECT
    DATE(created_at) AS date,
    COUNT(*) AS new_users,
    SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) AS cumulative_users
FROM users
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## 复合查询模式（The Graph + PostgreSQL）

### 场景：用户完整档案（链上+链下）

```javascript
async function getUserCompleteProfile(userAddress) {
  // 1. The Graph 查询链上数据
  const onchainData = await graphClient.query({
    query: gql`
      query GetUserOnchain($address: Bytes!) {
        user(id: $address) {
          totalValueLocked
          totalDebt
          healthFactor
          veNFTs { tokenId lockedAmount }
          lpPositions { liquidityUSD }
        }
      }
    `,
    variables: { address: userAddress.toLowerCase() }
  });

  // 2. PostgreSQL 查询链下数据
  const offchainData = await db.query(`
    SELECT
      uk.status AS kyc_status,
      uk.verified_at AS kyc_verified_at,
      COALESCE(SUM(pp.usdc_amount), 0) AS total_launchpad_invested
    FROM user_kyc uk
    LEFT JOIN project_participations pp ON uk.address = pp.user_address
    WHERE uk.address = $1
    GROUP BY uk.address, uk.status, uk.verified_at
  `, [userAddress.toLowerCase()]);

  // 3. 合并数据
  return {
    address: userAddress,
    onchain: onchainData.data.user,
    offchain: offchainData.rows[0],
    riskLevel: calculateRiskLevel(onchainData.data.user.healthFactor)
  };
}
```

---

## 查询优化技巧

### 1. 使用索引过滤

```graphql
# ✅ 好：利用索引字段过滤
query {
  swaps(
    where: {
      blockTimestamp_gt: "1700000000",
      user: "0x..."
    }
  ) {
    id
  }
}

# ❌ 差：客户端过滤（获取所有数据）
query {
  swaps {
    id
    blockTimestamp
    user
  }
}
# 然后在代码中过滤
```

### 2. 分页策略

```javascript
// 递归分页获取所有数据
async function getAllSwaps() {
  let allSwaps = [];
  let skip = 0;
  const first = 1000;  // The Graph 限制

  while (true) {
    const batch = await client.query({
      query: gql`
        query GetSwaps($skip: Int!, $first: Int!) {
          swaps(skip: $skip, first: $first, orderBy: blockTimestamp) {
            id
            amountInUSD
          }
        }
      `,
      variables: { skip, first }
    });

    if (batch.data.swaps.length === 0) break;

    allSwaps = allSwaps.concat(batch.data.swaps);
    skip += first;
  }

  return allSwaps;
}
```

### 3. 缓存策略

```javascript
// 使用 Apollo Client 缓存
const client = new ApolloClient({
  uri: 'https://api.thegraph.com/subgraphs/name/paimon-dex/bsc-testnet',
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          users: {
            keyArgs: false,
            merge(existing = [], incoming) {
              return [...existing, ...incoming];
            }
          }
        }
      }
    }
  })
});

// 带缓存的查询
await client.query({
  query: GET_USER_QUERY,
  variables: { address },
  fetchPolicy: 'cache-first'  // 优先使用缓存
});
```

---

## 实时订阅模式（WebSocket）

### The Graph Subscriptions

```javascript
import { useSubscription } from '@apollo/client';
import { gql } from '@apollo/client';

const NEW_SWAPS_SUBSCRIPTION = gql`
  subscription OnNewSwap {
    swaps(
      orderBy: blockTimestamp,
      orderDirection: desc,
      first: 1
    ) {
      id
      user { address }
      amountInUSD
      blockTimestamp
    }
  }
`;

function RealtimeSwapFeed() {
  const { data, loading } = useSubscription(NEW_SWAPS_SUBSCRIPTION);

  if (loading) return <p>等待新交易...</p>;

  return (
    <div>
      <h3>最新交易</h3>
      {data.swaps.map(swap => (
        <div key={swap.id}>
          {swap.user.address}: ${swap.amountInUSD}
        </div>
      ))}
    </div>
  );
}
```

---

## 错误处理最佳实践

```javascript
async function safeQuery(query, variables) {
  try {
    const result = await client.query({ query, variables });
    return { success: true, data: result.data };
  } catch (error) {
    console.error('GraphQL 查询失败:', error);

    // 分类错误
    if (error.message.includes('timeout')) {
      return { success: false, error: 'TIMEOUT', retry: true };
    } else if (error.message.includes('rate limit')) {
      return { success: false, error: 'RATE_LIMIT', retry: true, delay: 60000 };
    } else {
      return { success: false, error: 'UNKNOWN', retry: false };
    }
  }
}

// 使用示例
const result = await safeQuery(GET_USER_QUERY, { address });
if (!result.success) {
  if (result.retry) {
    // 延迟后重试
    await new Promise(resolve => setTimeout(resolve, result.delay || 5000));
    return await safeQuery(GET_USER_QUERY, { address });
  } else {
    // 无法恢复的错误
    throw new Error('查询失败: ' + result.error);
  }
}
```

---

## 总结

### 查询性能排行

| 查询类型 | 响应时间 | 适用场景 |
|---------|---------|---------|
| The Graph 单实体查询 | <100ms | 用户详情、交易对信息 |
| The Graph 列表查询（分页） | 100-500ms | 交易历史、排行榜 |
| PostgreSQL 单表查询 | <50ms | KYC状态、项目参与 |
| PostgreSQL 聚合查询 | 200-1000ms | 统计报表、日报 |
| 复合查询（The Graph + SQL） | 500-2000ms | 用户完整档案 |

### 最佳实践总结

1. **优先使用 The Graph** - 链上数据查询
2. **合理分页** - first: 100-1000，避免超时
3. **善用索引** - 在 where 条件中使用索引字段
4. **缓存策略** - 静态数据使用 cache-first
5. **错误处理** - 实现重试机制和降级方案
6. **批量查询** - 减少往返次数
7. **监控性能** - 记录查询耗时，优化慢查询

---

**相关文档**：
- [The Graph Schema](./subgraph-schema.md) - GraphQL schema 定义
- [核心实体](./core-entities.md) - 实体字段详解

**最后更新**：2025-11-17
