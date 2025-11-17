# 核心实体定义

## 概述

本文档详细定义 Paimon.dex 协议中的所有核心实体（Entity），包括链上合约 storage 和链下 The Graph schema 的完整映射。

---

## 1. User（用户实体）

### 链上数据（分散在多个合约）

用户数据在链上没有统一的结构，分散存储在各个合约中：

```solidity
// Treasury.sol - 用户抵押借贷数据
mapping(address => UserPosition) public userPositions;

struct UserPosition {
    Collateral[] collaterals;  // 抵押品数组
    uint256 totalDebt;         // 总债务（USDP）
    uint256 healthFactor;      // 健康因子（18位精度）
}

// VotingEscrowPaimon.sol - 用户 veNFT 持有
mapping(uint256 => address) public ownerOf;  // tokenId => owner

// GaugeController.sol - 用户投票记录
mapping(address => mapping(address => uint256)) public userVotes;
// user => gauge => vote weight

// RewardDistributor.sol - 用户奖励领取记录
mapping(uint256 => mapping(address => bool)) public hasClaimed;
// epoch => user => claimed
```

### 链下聚合（The Graph）

```graphql
type User @entity {
  # 基础信息
  id: ID!                              # 用户地址（0x...）
  address: Bytes!                      # 用户地址（冗余，便于查询）

  # 资产概览
  totalValueLocked: BigDecimal!        # 总锁定价值（USD）
  totalDebt: BigDecimal!               # 总债务（USDP）
  healthFactor: BigDecimal             # 健康因子（null表示无债务）

  # veNFT 治理
  veNFTs: [VeNFT!]! @derivedFrom(field: "owner")
  totalVotingPower: BigInt!            # 汇总所有 veNFT 的投票权

  # 流动性提供
  lpPositions: [LPPosition!]! @derivedFrom(field: "user")
  totalLPValue: BigDecimal!            # LP 总价值（USD）

  # 交易历史
  swaps: [Swap!]! @derivedFrom(field: "user")
  totalSwapVolume: BigDecimal!         # 累计交易量（USD）

  # 奖励
  rewards: [Reward!]! @derivedFrom(field: "user")
  totalRewardsClaimed: BigDecimal!     # 已领取奖励（PAIMON）
  totalRewardsPending: BigDecimal!     # 待领取奖励（PAIMON）

  # 时间戳
  createdAt: BigInt!                   # 首次交互时间
  updatedAt: BigInt!                   # 最后更新时间
}
```

**字段说明**：

| 字段 | 类型 | 计算方式 | 更新频率 |
|------|------|---------|---------|
| `totalValueLocked` | BigDecimal | Σ(collateral_i.value) + Σ(lp_i.value) | 每次抵押/LP操作 |
| `healthFactor` | BigDecimal | Σ(collateral.value × ltv) / totalDebt | 每次借贷/还款/价格更新 |
| `totalVotingPower` | BigInt | Σ(veNFT_i.votingPower) | 每次锁定/解锁/时间流逝 |
| `totalLPValue` | BigDecimal | Σ(lp_i.liquidity × price) | 每次添加/移除流动性 |

---

## 2. Token（代币实体）

### 链上数据

```solidity
// ERC20 标准接口
interface IERC20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
}

// 特殊代币扩展
// USDP.sol
uint256 public totalSupply;             // 总供应量
mapping(address => uint256) public balanceOf;

// PAIMON.sol
uint256 public constant MAX_SUPPLY = 10_000_000_000e18;  // 100亿上限
```

### 链下聚合

```graphql
type Token @entity {
  # 基础信息
  id: ID!                              # 代币地址（0x...）
  address: Bytes!                      # 代币地址
  symbol: String!                      # 符号（USDP, PAIMON, ...）
  name: String!                        # 全称（Paimon USD, ...）
  decimals: Int!                       # 小数位数（6/18）

  # 供应量统计
  totalSupply: BigInt!                 # 总供应量（原始精度）
  totalSupplyUSD: BigDecimal!          # 总供应量（USD）
  circulatingSupply: BigInt!           # 流通量（排除锁定部分）

  # 持有者统计
  holderCount: Int!                    # 持有者数量
  holders: [TokenBalance!]! @derivedFrom(field: "token")

  # 价格信息
  priceUSD: BigDecimal!                # 当前美元价格
  priceUpdatedAt: BigInt!              # 价格更新时间

  # 交易统计
  volumeUSD: BigDecimal!               # 24h 交易量（USD）
  txCount: BigInt!                     # 总交易次数

  # 时间戳
  createdAt: BigInt!
  updatedAt: BigInt!
}

type TokenBalance @entity {
  id: ID!                              # token.id + "-" + user.id
  token: Token!
  user: User!
  balance: BigInt!
  balanceUSD: BigDecimal!
  updatedAt: BigInt!
}
```

**特殊代币说明**：

| 代币 | 符号 | 特性 | 计算规则 |
|------|------|------|---------|
| **USDP** | USDP | 合成稳定币 | 价格 = $1.00（固定） |
| **PAIMON** | PAIMON | 治理代币 | 价格 = DEX Pool TWAP |
| **esPAIMON** | esPAIMON | 归属代币 | 不可转让，价格继承 PAIMON |
| **vePAIMON** | - | 投票权 | NFT，无独立价格 |

---

## 3. Pair（交易对实体）

### 链上数据

```solidity
// DEXPair.sol
contract DEXPair {
    address public token0;              // 代币0地址（排序后较小）
    address public token1;              // 代币1地址（排序后较大）

    uint112 private reserve0;           // 储备量0
    uint112 private reserve1;           // 储备量1
    uint32 private blockTimestampLast;  // 最后更新时间

    uint256 public price0CumulativeLast;  // 累积价格0（TWAP）
    uint256 public price1CumulativeLast;  // 累积价格1（TWAP）

    uint256 public kLast;               // reserve0 * reserve1 (最后)

    uint256 public totalSupply;         // LP Token 总供应
    mapping(address => uint256) public balanceOf;  // LP 持有量
}
```

### 链下聚合

```graphql
type Pair @entity {
  # 基础信息
  id: ID!                              # Pair 地址（0x...）
  address: Bytes!
  token0: Token!                       # 代币0
  token1: Token!                       # 代币1
  name: String!                        # "USDP/USDC"

  # 储备量
  reserve0: BigInt!                    # 储备量0（原始精度）
  reserve1: BigInt!                    # 储备量1（原始精度）
  reserveUSD: BigDecimal!              # 总储备（USD）

  # LP Token
  totalSupply: BigInt!                 # LP Token 总量
  liquidityProviders: [LPPosition!]! @derivedFrom(field: "pair")
  lpHolderCount: Int!                  # LP 持有者数量

  # 价格
  token0Price: BigDecimal!             # token0/token1 价格
  token1Price: BigDecimal!             # token1/token0 价格

  # 交易统计
  volumeToken0: BigInt!                # 24h 交易量（token0）
  volumeToken1: BigInt!                # 24h 交易量（token1）
  volumeUSD: BigDecimal!               # 24h 交易量（USD）
  txCount: BigInt!                     # 总交易次数

  # TWAP 数据
  price0CumulativeLast: BigInt!
  price1CumulativeLast: BigInt!

  # 手续费统计
  feesUSD: BigDecimal!                 # 累计手续费（USD）

  # Gauge 关联
  gauge: Gauge                         # 对应的流动性挖矿池（可能为null）

  # 时间戳
  createdAt: BigInt!
  createdAtBlockNumber: BigInt!
  updatedAt: BigInt!
}
```

**计算公式**：

```typescript
// 储备量 USD 价值
reserveUSD = reserve0 * token0.priceUSD + reserve1 * token1.priceUSD

// token0/token1 价格
token0Price = reserve1 / reserve0

// LP Token 价值
lpTokenPrice = reserveUSD / totalSupply
```

---

## 4. VeNFT（投票托管 NFT）

### 链上数据

```solidity
// VotingEscrowPaimon.sol
contract VotingEscrowPaimon {
    struct LockedBalance {
        uint256 amount;       // 锁定的 PAIMON 数量
        uint256 end;          // 解锁时间戳
    }

    // tokenId => LockedBalance
    mapping(uint256 => LockedBalance) public locked;

    // tokenId => owner
    mapping(uint256 => address) public ownerOf;

    // 投票权计算（链下）
    function votingPower(uint256 tokenId) public view returns (uint256) {
        LockedBalance memory _locked = locked[tokenId];
        if (block.timestamp >= _locked.end) return 0;

        uint256 timeLeft = _locked.end - block.timestamp;
        return _locked.amount * timeLeft / MAX_LOCK_DURATION;
    }
}
```

### 链下聚合

```graphql
type VeNFT @entity {
  # NFT 信息
  id: ID!                              # tokenId (字符串)
  tokenId: BigInt!                     # NFT ID
  owner: User!                         # 当前持有者

  # 锁定信息
  lockedAmount: BigInt!                # 锁定的 PAIMON 数量
  lockedAmountUSD: BigDecimal!         # USD 价值
  unlockTime: BigInt!                  # 解锁时间戳
  lockDuration: BigInt!                # 锁定时长（秒）

  # 投票权
  votingPower: BigInt!                 # 当前投票权（线性衰减）
  votingPowerPercentage: BigDecimal!   # 占总投票权的百分比

  # 投票记录
  votes: [GaugeVote!]! @derivedFrom(field: "veNFT")
  totalVoteWeight: BigInt!             # 已使用的投票权重

  # 奖励
  rewards: [Reward!]! @derivedFrom(field: "veNFT")
  totalRewardsClaimed: BigDecimal!
  totalBribesReceived: BigDecimal!     # 收到的贿赂（USD）

  # 状态
  isExpired: Boolean!                  # 是否已过期

  # 时间戳
  createdAt: BigInt!
  createdAtBlockNumber: BigInt!
  updatedAt: BigInt!
}
```

**投票权衰减示例**：

```
锁定数量：10,000 PAIMON
锁定时长：208 周（最大锁定时间）
初始投票权：10,000 vePAIMON

时间流逝：
- 104 周后（50%时间）：5,000 vePAIMON
- 156 周后（75%时间）：2,500 vePAIMON
- 208 周后（100%时间）：0 vePAIMON（过期）
```

---

## 5. Gauge（流动性挖矿池）

### 链上数据

```solidity
// Gauge.sol (简化)
contract Gauge {
    address public lpToken;              // LP Token 地址
    uint256 public totalSupply;          // 质押的 LP 总量
    mapping(address => uint256) public balanceOf;  // 用户质押量

    // 奖励分配（由 GaugeController 控制）
    uint256 public rewardRate;           // 每秒奖励率
    uint256 public lastUpdateTime;       // 最后更新时间
    uint256 public rewardPerTokenStored; // 累积每 LP 奖励
}

// GaugeController.sol
contract GaugeController {
    mapping(address => uint256) public gaugeWeights;  // Gauge 权重
    uint256 public totalWeight;          // 总权重

    // 用户投票
    mapping(address => mapping(address => uint256)) public voteUserWeight;
    // veNFT => gauge => weight
}
```

### 链下聚合

```graphql
type Gauge @entity {
  # 基础信息
  id: ID!                              # Gauge 地址（0x...）
  address: Bytes!
  pair: Pair!                          # 关联的交易对
  lpToken: Token!                      # LP Token

  # 质押统计
  totalStaked: BigInt!                 # 质押的 LP 总量
  totalStakedUSD: BigDecimal!          # USD 价值
  stakerCount: Int!                    # 质押者数量
  stakers: [GaugeStake!]! @derivedFrom(field: "gauge")

  # 权重与投票
  weight: BigInt!                      # 当前权重（基点）
  weightPercentage: BigDecimal!        # 占总权重的百分比
  votes: [GaugeVote!]! @derivedFrom(field: "gauge")
  totalVotes: BigInt!                  # 总投票数

  # 奖励
  rewardRate: BigInt!                  # 每秒奖励率（PAIMON）
  rewardRateAPR: BigDecimal!           # 年化收益率（%）
  totalRewardsDistributed: BigDecimal! # 累计已分发奖励

  # 贿赂市场
  bribes: [Bribe!]! @derivedFrom(field: "gauge")
  totalBribesOffered: BigDecimal!      # 累计贿赂金额（USD）

  # 时间戳
  createdAt: BigInt!
  updatedAt: BigInt!
}

type GaugeStake @entity {
  id: ID!                              # gauge.id + "-" + user.id
  gauge: Gauge!
  user: User!
  amount: BigInt!                      # 质押数量（LP）
  amountUSD: BigDecimal!               # USD 价值
  pendingRewards: BigDecimal!          # 待领取奖励（PAIMON）
  createdAt: BigInt!
  updatedAt: BigInt!
}

type GaugeVote @entity {
  id: ID!                              # veNFT.id + "-" + gauge.id + "-" + epoch
  veNFT: VeNFT!
  gauge: Gauge!
  weight: BigInt!                      # 投票权重
  epoch: BigInt!                       # 投票周期
  timestamp: BigInt!
}
```

**APR 计算公式**：

```typescript
// 年化收益率
const weeklyEmission = rewardRate * SECONDS_PER_WEEK;
const annualEmission = weeklyEmission * 52;
const annualRewardUSD = annualEmission * paimonPrice;

const apr = (annualRewardUSD / totalStakedUSD) * 100;
```

---

## 6. Collateral（抵押品）

### 链上数据

```solidity
// Treasury.sol
struct Collateral {
    address token;           // RWA代币地址
    uint256 amount;          // 抵押数量
    uint256 value;           // 美元价值（18位精度）
    uint8 tier;              // 抵押品等级（1/2/3）
    uint256 ltvRatio;        // 贷款价值比（基点，如 8000 = 80%）
}

struct UserPosition {
    Collateral[] collaterals;  // 用户的所有抵押品
    uint256 totalDebt;         // 总债务（USDP）
    uint256 healthFactor;      // 健康因子（18位精度）
}
```

### 链下聚合

```graphql
type CollateralAsset @entity {
  # 抵押品资产定义
  id: ID!                              # 资产地址（0x...）
  address: Bytes!
  token: Token!
  name: String!                        # "US Treasury 6-Month T-Bill"
  tier: Int!                           # 1/2/3
  ltvRatio: Int!                       # 基点（8000 = 80%）
  isActive: Boolean!                   # 是否启用

  # Oracle 价格
  priceUSD: BigDecimal!
  priceUpdatedAt: BigInt!
  priceSource: String!                 # "Chainlink" / "NAV" / "Hybrid"

  # 统计
  totalDeposited: BigInt!              # 总存款量
  totalDepositedUSD: BigDecimal!
  depositorCount: Int!

  # 时间戳
  createdAt: BigInt!
  updatedAt: BigInt!
}

type CollateralPosition @entity {
  id: ID!                              # user.id + "-" + asset.id
  user: User!
  asset: CollateralAsset!

  # 抵押数量
  amount: BigInt!                      # 抵押数量（原始精度）
  valueUSD: BigDecimal!                # 美元价值
  effectiveValueUSD: BigDecimal!       # 有效价值（value × ltv）

  # 时间戳
  createdAt: BigInt!
  updatedAt: BigInt!
}

type DebtPosition @entity {
  id: ID!                              # user.id
  user: User!

  # 债务信息
  totalDebt: BigDecimal!               # 总债务（USDP）
  totalCollateralValue: BigDecimal!    # 总抵押品价值（USD）
  effectiveCollateralValue: BigDecimal! # 有效抵押价值（加权）

  # 健康因子
  healthFactor: BigDecimal!            # HF = effectiveCollateral / totalDebt
  liquidationThreshold: BigDecimal!    # 清算线（通常 1.15）

  # 状态
  isAtRisk: Boolean!                   # HF < 1.20（警告）
  isLiquidatable: Boolean!             # HF < 1.15（可清算）

  # 清算记录
  liquidations: [Liquidation!]! @derivedFrom(field: "position")

  # 时间戳
  createdAt: BigInt!
  updatedAt: BigInt!
}
```

**健康因子计算**：

```typescript
// 有效抵押价值（加权）
effectiveCollateralValue = Σ(collateral_i.value × collateral_i.ltv)

// 健康因子
healthFactor = effectiveCollateralValue / totalDebt

// 示例：
// 抵押品A：$10,000 × 80% LTV = $8,000
// 抵押品B：$5,000 × 65% LTV = $3,250
// 总有效抵押：$11,250
// 总债务：$9,000
// 健康因子：11,250 / 9,000 = 1.25 ✅ 安全
```

---

## 7. Reward（奖励）

### 链上数据

```solidity
// RewardDistributor.sol
contract RewardDistributor {
    // epoch => Merkle Root
    mapping(uint256 => bytes32) public merkleRoots;

    // epoch => user => claimed
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    // 用户领取奖励
    function claim(
        uint256 epoch,
        uint256 amount,
        bytes32[] calldata proof
    ) external;
}
```

### 链下聚合

```graphql
type Epoch @entity {
  # 周期信息
  id: ID!                              # epoch 编号（字符串）
  epoch: BigInt!                       # 周期编号
  startTime: BigInt!                   # 开始时间
  endTime: BigInt!                     # 结束时间

  # 排放量
  totalEmission: BigDecimal!           # 总排放（PAIMON）
  debtMiningAllocation: BigDecimal!    # 债务挖矿分配
  lpAllocation: BigDecimal!            # LP挖矿分配
  stabilityPoolAllocation: BigDecimal! # 稳定池分配
  ecosystemAllocation: BigDecimal!     # 生态分配

  # 分发
  merkleRoot: Bytes                    # Merkle Root（32字节）
  rewardsCount: Int!                   # 奖励记录数
  rewards: [Reward!]! @derivedFrom(field: "epoch")

  # 统计
  claimCount: Int!                     # 已领取数量
  totalClaimed: BigDecimal!            # 已领取总额
  totalUnclaimed: BigDecimal!          # 未领取总额

  # 时间戳
  createdAt: BigInt!
}

type Reward @entity {
  id: ID!                              # epoch + "-" + user.id
  epoch: Epoch!
  user: User!

  # 奖励信息
  amount: BigDecimal!                  # 奖励数量（PAIMON）
  amountUSD: BigDecimal!               # USD 价值
  source: String!                      # "DebtMining" / "LP" / "Stability" / "Ecosystem"

  # 领取状态
  isClaimed: Boolean!
  claimedAt: BigInt
  claimedTxHash: Bytes

  # Merkle Proof（不存储在链下，由API动态生成）

  # 时间戳
  createdAt: BigInt!
}
```

**奖励分配流程**：

```
1. 链下计算（distribution-service）
   ├─ 快照用户活动（链上事件）
   ├─ 计算各用户奖励份额
   └─ 生成 Merkle Tree

2. 提交 Merkle Root（链上）
   └─ RewardDistributor.setMerkleRoot(epoch, root)

3. 用户领取（链上）
   ├─ 前端查询 API 获取 Merkle Proof
   ├─ 调用 RewardDistributor.claim(epoch, amount, proof)
   └─ 合约验证 Proof 并发放奖励

4. 链下同步（The Graph）
   └─ 监听 Claimed 事件，更新 Reward.isClaimed
```

---

## 8. Transaction（交易记录）

### 链上数据（事件日志）

```solidity
// 各合约的事件
event SwapUSDCForUSDP(address indexed user, uint256 usdcIn, uint256 usdpOut);
event AddLiquidity(address indexed user, uint256 amount0, uint256 amount1, uint256 liquidity);
event RemoveLiquidity(address indexed user, uint256 liquidity, uint256 amount0, uint256 amount1);
event CreateLock(address indexed owner, uint256 indexed tokenId, uint256 amount, uint256 end);
event Vote(address indexed gauge, uint256 indexed tokenId, uint256 weight);
```

### 链下聚合

```graphql
type Swap @entity {
  id: ID!                              # txHash + "-" + logIndex
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
  priceUSD: BigDecimal!                # 交易价格

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
  id: ID!                              # txHash + "-" + logIndex
  transactionHash: Bytes!
  user: User!
  pair: Pair!

  # 事件类型
  type: String!                        # "ADD" / "REMOVE"

  # 数量
  amount0: BigInt!
  amount1: BigInt!
  liquidity: BigInt!

  # USD 价值
  amount0USD: BigDecimal!
  amount1USD: BigDecimal!
  liquidityUSD: BigDecimal!

  # 区块信息
  blockNumber: BigInt!
  blockTimestamp: BigInt!
}

type Liquidation @entity {
  id: ID!                              # txHash + "-" + logIndex
  transactionHash: Bytes!
  position: DebtPosition!
  liquidator: User!

  # 清算信息
  collateralSeized: BigInt!            # 没收的抵押品
  collateralSeizedUSD: BigDecimal!
  debtRepaid: BigDecimal!              # 偿还的债务（USDP）

  # 健康因子
  healthFactorBefore: BigDecimal!
  healthFactorAfter: BigDecimal!

  # 清算奖励
  liquidatorReward: BigDecimal!        # 清算者奖励（5%）

  # 区块信息
  blockNumber: BigInt!
  blockTimestamp: BigInt!
}
```

---

## 总结

### 实体关系总览

```
User (用户)
├─ VeNFT (veNFT) [1:N]
├─ LPPosition (LP持仓) [1:N]
├─ CollateralPosition (抵押持仓) [1:N]
├─ DebtPosition (债务) [1:1]
├─ Swap (交易记录) [1:N]
└─ Reward (奖励) [1:N]

Token (代币)
├─ Pair (交易对) [1:N]
├─ CollateralAsset (抵押资产) [1:1]
└─ TokenBalance (持有记录) [1:N]

Pair (交易对)
├─ LPPosition (LP持仓) [1:N]
├─ Gauge (挖矿池) [1:1]
└─ Swap (交易) [1:N]

VeNFT (veNFT)
├─ GaugeVote (投票记录) [1:N]
└─ Reward (奖励) [1:N]

Gauge (挖矿池)
├─ GaugeStake (质押记录) [1:N]
├─ GaugeVote (投票) [1:N]
└─ Bribe (贿赂) [1:N]

Epoch (周期)
└─ Reward (奖励分配) [1:N]
```

### 数据更新频率

| 实体 | 更新频率 | 触发条件 |
|------|---------|---------|
| User | 高频 | 每次交互 |
| Token | 中频 | 价格更新（每15分钟） |
| Pair | 高频 | 每次交易 |
| VeNFT | 低频 | 锁定/解锁/转让 |
| Gauge | 中频 | 投票/质押/奖励分发 |
| Reward | 低频 | 每周1次（epoch结束） |
| Swap | 高频 | 每次交易 |
| Liquidation | 极低频 | 清算发生时 |

---

**下一步阅读**：
- [数据关系图](./entity-relationships.md) - ER图可视化
- [The Graph Schema](./subgraph-schema.md) - 完整的 GraphQL schema
- [查询模式](./query-patterns.md) - 实际查询示例

**最后更新**：2025-11-17
