# 事件监听指南

**专题**: Event Listening & Indexing
**版本**: v1.0
**最后更新**: 2025-11-17
**目标读者**: 链下索引服务开发者、前端开发者、数据分析师

---

## 📋 目录

1. [事件分类索引](#1-事件分类索引)
2. [Viem 监听示例](#2-viem-监听示例)
3. [The Graph 集成](#3-the-graph-集成)
4. [事件过滤与批量处理](#4-事件过滤与批量处理)
5. [实时通知系统](#5-实时通知系统)
6. [历史事件查询](#6-历史事件查询)

---

## 1. 事件分类索引

### 1.1 稳定币模块事件

#### PSMParameterized
```solidity
// USDC → USDP 兑换
event SwapUSDCForUSDP(
    address indexed user,
    uint256 usdcIn,   // USDC 输入（6 decimals）
    uint256 usdpOut   // USDP 输出（18 decimals）
);

// USDP → USDC 兑换
event SwapUSDPForUSDC(
    address indexed user,
    uint256 usdpIn,   // USDP 输入（18 decimals）
    uint256 usdcOut   // USDC 输出（6 decimals）
);
```

**用途**: 追踪稳定币兑换量、计算 PSM 储备变化

---

#### USDPSavingRate (ERC4626)
```solidity
// 存入
event Deposit(
    address indexed sender,
    address indexed owner,
    uint256 assets,  // USDP 数量
    uint256 shares   // 份额数量
);

// 提取
event Withdraw(
    address indexed sender,
    address indexed receiver,
    address indexed owner,
    uint256 assets,  // USDP 数量
    uint256 shares   // 份额数量
);
```

**用途**: 追踪储蓄池 TVL 变化、计算 APR

---

#### Treasury
```solidity
// 存入抵押品
event CollateralDeposited(
    address indexed user,
    address indexed collateralToken,
    uint256 amount,
    uint256 newHealthFactor
);

// 铸造 USDP
event USDPMinted(
    address indexed user,
    uint256 amount,
    uint256 totalDebt,
    uint256 newHealthFactor
);

// 偿还 USDP
event USDPBurned(
    address indexed user,
    uint256 amount,
    uint256 remainingDebt,
    uint256 newHealthFactor
);

// 提取抵押品
event CollateralWithdrawn(
    address indexed user,
    address indexed collateralToken,
    uint256 amount,
    uint256 newHealthFactor
);
```

**用途**: 追踪用户仓位变化、监控清算风险

---

### 1.2 治理模块事件

#### VotingEscrowPaimon
```solidity
// 创建 veNFT
event LockCreated(
    uint256 indexed tokenId,
    address indexed owner,
    uint256 value,     // 锁定的 PAIMON 数量
    uint256 lockEnd    // 锁定到期时间戳
);

// 增加锁定量
event LockIncreased(
    uint256 indexed tokenId,
    uint256 value
);

// 延长锁定期
event LockExtended(
    uint256 indexed tokenId,
    uint256 lockEnd
);

// 提取（销毁 veNFT）
event Withdraw(
    uint256 indexed tokenId,
    uint256 value
);

// ERC721 转移
event Transfer(
    address indexed from,
    address indexed to,
    uint256 indexed tokenId
);
```

**用途**: 追踪 veNFT 生命周期、计算总投票权

---

#### GaugeController
```solidity
// Gauge 投票
event VotedForGauge(
    address indexed user,
    address indexed gauge,
    uint256 weight    // Basis points (10000 = 100%)
);

// 新增 Gauge
event NewGauge(
    address indexed gauge,
    address indexed pool
);
```

**用途**: 追踪投票权分布、计算各池权重

---

#### EmissionRouter
```solidity
// 每周发行分配
event WeeklyDistribution(
    uint256 indexed week,
    uint256 debtAmount,   // Debt Mining
    uint256 lpAmount,     // LP Pairs
    uint256 stabAmount,   // Stability Pool
    uint256 ecoAmount     // Ecosystem
);
```

**用途**: 追踪 PAIMON 发行分配、验证通道比例

---

### 1.3 DEX 模块事件

#### DEXFactory
```solidity
// 创建交易对
event PairCreated(
    address indexed token0,
    address indexed token1,
    address pair,
    uint256 allPairsLength
);
```

**用途**: 发现新交易对、更新交易对列表

---

#### DEXPair
```solidity
// 添加流动性
event Mint(
    address indexed sender,
    uint256 amount0,
    uint256 amount1
);

// 移除流动性
event Burn(
    address indexed sender,
    uint256 amount0,
    uint256 amount1,
    address indexed to
);

// 交换
event Swap(
    address indexed sender,
    uint256 amount0In,
    uint256 amount1In,
    uint256 amount0Out,
    uint256 amount1Out,
    address indexed to
);

// 储备同步
event Sync(
    uint112 reserve0,
    uint112 reserve1
);
```

**用途**: 追踪交易量、计算价格、监控流动性变化

---

### 1.4 激励模块事件

#### RewardDistributor
```solidity
// 奖励领取
event RewardClaimed(
    address indexed user,
    uint256 indexed epoch,
    uint256 amountBase,      // 原始数量
    uint256 amountBoosted,   // Boost 后数量
    uint256 boostMultiplier  // 倍数
);

// Merkle Root 更新
event MerkleRootUpdated(
    uint256 indexed epoch,
    bytes32 merkleRoot
);
```

**用途**: 追踪奖励领取情况、验证 Merkle Root

---

#### BoostStaking
```solidity
// 质押
event Staked(
    address indexed user,
    uint256 amount,
    uint256 lockDuration,
    uint256 lockEnd,
    uint256 boostMultiplier
);

// 解除质押
event Unstaked(
    address indexed user,
    uint256 amount
);

// 紧急解锁
event EmergencyUnstaked(
    address indexed user,
    uint256 amountRequested,
    uint256 amountReceived,
    uint256 penalty
);
```

**用途**: 追踪 Boost 质押量、计算平均倍数

---

### 1.5 Launchpad 模块事件

#### ProjectRegistry
```solidity
// 项目注册
event ProjectRegistered(
    uint256 indexed projectId,
    address indexed issuer,
    string name,
    AssetTier tier,
    uint256 targetRaise,
    string metadataURI
);

// 项目批准
event ProjectApproved(
    uint256 indexed projectId,
    uint256 timestamp
);

// 项目拒绝
event ProjectRejected(
    uint256 indexed projectId,
    string reason,
    uint256 timestamp
);
```

**用途**: 追踪项目状态、通知用户审批结果

---

#### IssuanceController
```solidity
// 参与认购
event ParticipationReceived(
    uint256 indexed projectId,
    address indexed participant,
    uint256 usdcAmount,
    uint256 tokenAmount
);

// 分红发放
event DividendPaid(
    uint256 indexed projectId,
    uint256 round,
    uint256 totalAmount
);

// 分红领取
event DividendClaimed(
    uint256 indexed projectId,
    address indexed participant,
    uint256 round,
    uint256 amount
);

// 赎回
event Redeemed(
    uint256 indexed projectId,
    address indexed participant,
    uint256 pTokenAmount,
    uint256 usdcAmount
);
```

**用途**: 追踪募资进度、分红发放、到期赎回

---

### 1.6 Treasury 模块事件

#### RWAPriceOracle
```solidity
// 价格更新
event PriceUpdated(
    address indexed asset,
    uint256 oldPrice,
    uint256 newPrice,
    uint256 timestamp
);

// 价格偏差检测
event PriceDeviationDetected(
    address indexed asset,
    uint256 chainlinkPrice,
    uint256 navPrice,
    uint256 deviationPercent
);
```

**用途**: 追踪 RWA 资产价格变化、监控价格异常

---

## 2. Viem 监听示例

### 2.1 单个事件监听

```javascript
import { createPublicClient, http } from 'viem';
import { bscTestnet } from 'viem/chains';

const publicClient = createPublicClient({
  chain: bscTestnet,
  transport: http('https://data-seed-prebsc-1-s1.binance.org:8545/')
});

// 监听 PSM 兑换事件
const unwatchSwap = publicClient.watchContractEvent({
  address: addresses.PSM,
  abi: psmABI,
  eventName: 'SwapUSDCForUSDP',
  onLogs: (logs) => {
    logs.forEach(log => {
      console.log(`🔄 USDC → USDP 兑换:`);
      console.log(`  用户: ${log.args.user}`);
      console.log(`  USDC: ${formatUnits(log.args.usdcIn, 6)}`);
      console.log(`  USDP: ${formatUnits(log.args.usdpOut, 18)}`);
      console.log(`  区块: ${log.blockNumber}`);
      console.log(`  交易: ${log.transactionHash}`);

      // 存储到数据库
      saveSwapToDB({
        user: log.args.user,
        usdcIn: log.args.usdcIn,
        usdpOut: log.args.usdpOut,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        timestamp: Date.now()
      });
    });
  }
});

// 停止监听
// unwatchSwap();
```

---

### 2.2 多个事件并行监听

```javascript
// 同时监听多个合约事件
const watchers = [
  // PSM 兑换
  publicClient.watchContractEvent({
    address: addresses.PSM,
    abi: psmABI,
    eventName: 'SwapUSDCForUSDP',
    onLogs: handlePSMSwap
  }),

  // veNFT 创建
  publicClient.watchContractEvent({
    address: addresses.VotingEscrowPaimon,
    abi: veABI,
    eventName: 'LockCreated',
    onLogs: handleVeNFTCreation
  }),

  // Gauge 投票
  publicClient.watchContractEvent({
    address: addresses.GaugeController,
    abi: gaugeControllerABI,
    eventName: 'VotedForGauge',
    onLogs: handleGaugeVote
  }),

  // 奖励领取
  publicClient.watchContractEvent({
    address: addresses.RewardDistributor,
    abi: distributorABI,
    eventName: 'RewardClaimed',
    onLogs: handleRewardClaim
  })
];

// 停止所有监听
function stopAllWatchers() {
  watchers.forEach(unwatch => unwatch());
}
```

---

### 2.3 事件过滤（indexed 参数）

```javascript
// 仅监听特定用户的奖励领取
const userAddress = '0x1234...abcd';

publicClient.watchContractEvent({
  address: addresses.RewardDistributor,
  abi: distributorABI,
  eventName: 'RewardClaimed',
  args: {
    user: userAddress  // 过滤 indexed 参数
  },
  onLogs: (logs) => {
    logs.forEach(log => {
      console.log(`💰 ${userAddress} 领取了 ${formatUnits(log.args.amountBoosted, 18)} PAIMON`);

      // 发送通知
      sendNotification(userAddress, {
        type: 'reward_claimed',
        amount: log.args.amountBoosted,
        epoch: log.args.epoch
      });
    });
  }
});
```

---

### 2.4 批量事件监听（WebSocket）

```javascript
import { createPublicClient, webSocket } from 'viem';

// 使用 WebSocket 连接（更低延迟）
const wsClient = createPublicClient({
  chain: bscTestnet,
  transport: webSocket('wss://bsc-testnet.publicnode.com')
});

// 批量监听所有 DEXPair Swap 事件
async function watchAllPairSwaps() {
  // 1. 获取所有交易对
  const pairCount = await publicClient.readContract({
    address: addresses.DEXFactory,
    abi: factoryABI,
    functionName: 'allPairsLength'
  });

  // 2. 为每个交易对创建监听器
  for (let i = 0; i < Number(pairCount); i++) {
    const pairAddress = await publicClient.readContract({
      address: addresses.DEXFactory,
      abi: factoryABI,
      functionName: 'allPairs',
      args: [i]
    });

    wsClient.watchContractEvent({
      address: pairAddress,
      abi: pairABI,
      eventName: 'Swap',
      onLogs: (logs) => {
        logs.forEach(log => {
          // 计算交易量和价格
          const volume = calculateVolume(log.args);
          const price = calculatePrice(log.args);

          // 更新实时价格数据库
          updatePriceDB(pairAddress, price, volume);
        });
      }
    });
  }
}
```

---

## 3. The Graph 集成

### 3.1 Subgraph Schema 定义

```graphql
# schema.graphql

type Swap @entity {
  id: ID!                        # txHash-logIndex
  user: Bytes!                   # 用户地址
  usdcIn: BigInt!                # USDC 输入
  usdpOut: BigInt!               # USDP 输出
  blockNumber: BigInt!
  blockTimestamp: BigInt!
  transactionHash: Bytes!
}

type VeNFT @entity {
  id: ID!                        # tokenId
  owner: Bytes!
  value: BigInt!                 # 锁定的 PAIMON 数量
  lockEnd: BigInt!               # 锁定到期时间
  createdAt: BigInt!
  currentVotingPower: BigInt!    # 计算值
  transfers: [VeNFTTransfer!]! @derivedFrom(field: "veNFT")
}

type VeNFTTransfer @entity {
  id: ID!
  veNFT: VeNFT!
  from: Bytes!
  to: Bytes!
  blockTimestamp: BigInt!
  transactionHash: Bytes!
}

type GaugeVote @entity {
  id: ID!                        # txHash-logIndex
  user: Bytes!
  gauge: Bytes!
  weight: BigInt!                # Basis points
  blockTimestamp: BigInt!
  transactionHash: Bytes!
}

type DailySwapVolume @entity {
  id: ID!                        # date (YYYY-MM-DD)
  totalUSDC: BigInt!
  totalUSDP: BigInt!
  swapCount: Int!
}

type UserPosition @entity {
  id: ID!                        # user address
  user: Bytes!
  totalCollateralValue: BigInt!
  totalDebt: BigInt!
  healthFactor: BigInt!
  lastUpdated: BigInt!
}
```

---

### 3.2 Subgraph Manifest (subgraph.yaml)

```yaml
specVersion: 0.0.5
schema:
  file: ./schema.graphql
dataSources:
  # PSM
  - kind: ethereum/contract
    name: PSMParameterized
    network: bsc-testnet
    source:
      address: "0x..." # PSM 地址
      abi: PSMParameterized
      startBlock: 12345678
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - Swap
        - DailySwapVolume
      abis:
        - name: PSMParameterized
          file: ./abis/PSMParameterized.json
      eventHandlers:
        - event: SwapUSDCForUSDP(indexed address,uint256,uint256)
          handler: handleSwapUSDCForUSDP
        - event: SwapUSDPForUSDC(indexed address,uint256,uint256)
          handler: handleSwapUSDPForUSDC
      file: ./src/psm.ts

  # VotingEscrowPaimon
  - kind: ethereum/contract
    name: VotingEscrowPaimon
    network: bsc-testnet
    source:
      address: "0x..." # VotingEscrowPaimon 地址
      abi: VotingEscrowPaimon
      startBlock: 12345678
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - VeNFT
        - VeNFTTransfer
      abis:
        - name: VotingEscrowPaimon
          file: ./abis/VotingEscrowPaimon.json
      eventHandlers:
        - event: LockCreated(indexed uint256,indexed address,uint256,uint256)
          handler: handleLockCreated
        - event: Transfer(indexed address,indexed address,indexed uint256)
          handler: handleTransfer
      file: ./src/voting-escrow.ts

  # Treasury
  - kind: ethereum/contract
    name: Treasury
    network: bsc-testnet
    source:
      address: "0x..."
      abi: Treasury
      startBlock: 12345678
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - UserPosition
      abis:
        - name: Treasury
          file: ./abis/Treasury.json
      eventHandlers:
        - event: CollateralDeposited(indexed address,indexed address,uint256,uint256)
          handler: handleCollateralDeposited
        - event: USDPMinted(indexed address,uint256,uint256,uint256)
          handler: handleUSDPMinted
      file: ./src/treasury.ts
```

---

### 3.3 Mapping 函数 (src/psm.ts)

```typescript
import { BigInt } from "@graphprotocol/graph-ts";
import { SwapUSDCForUSDP } from "../generated/PSMParameterized/PSMParameterized";
import { Swap, DailySwapVolume } from "../generated/schema";

export function handleSwapUSDCForUSDP(event: SwapUSDCForUSDP): void {
  // 1. 创建 Swap 实体
  let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let swap = new Swap(id);

  swap.user = event.params.user;
  swap.usdcIn = event.params.usdcIn;
  swap.usdpOut = event.params.usdpOut;
  swap.blockNumber = event.block.number;
  swap.blockTimestamp = event.block.timestamp;
  swap.transactionHash = event.transaction.hash;

  swap.save();

  // 2. 更新每日交易量
  let dayID = event.block.timestamp.toI32() / 86400;
  let dailyVolume = DailySwapVolume.load(dayID.toString());

  if (dailyVolume == null) {
    dailyVolume = new DailySwapVolume(dayID.toString());
    dailyVolume.totalUSDC = BigInt.fromI32(0);
    dailyVolume.totalUSDP = BigInt.fromI32(0);
    dailyVolume.swapCount = 0;
  }

  dailyVolume.totalUSDC = dailyVolume.totalUSDC.plus(event.params.usdcIn);
  dailyVolume.totalUSDP = dailyVolume.totalUSDP.plus(event.params.usdpOut);
  dailyVolume.swapCount = dailyVolume.swapCount + 1;

  dailyVolume.save();
}
```

---

### 3.4 GraphQL 查询示例

```graphql
# 查询最近 10 笔兑换
query RecentSwaps {
  swaps(first: 10, orderBy: blockTimestamp, orderDirection: desc) {
    id
    user
    usdcIn
    usdpOut
    blockTimestamp
    transactionHash
  }
}

# 查询特定用户的所有兑换
query UserSwaps($user: Bytes!) {
  swaps(where: { user: $user }, orderBy: blockTimestamp, orderDirection: desc) {
    id
    usdcIn
    usdpOut
    blockTimestamp
  }
}

# 查询每日交易量
query DailyVolumes {
  dailySwapVolumes(first: 30, orderBy: id, orderDirection: desc) {
    id
    totalUSDC
    totalUSDP
    swapCount
  }
}

# 查询用户仓位
query UserPosition($user: Bytes!) {
  userPosition(id: $user) {
    totalCollateralValue
    totalDebt
    healthFactor
    lastUpdated
  }
}

# 查询 veNFT 详情
query VeNFTDetails($tokenId: ID!) {
  veNFT(id: $tokenId) {
    id
    owner
    value
    lockEnd
    currentVotingPower
    transfers {
      from
      to
      blockTimestamp
    }
  }
}
```

---

## 4. 事件过滤与批量处理

### 4.1 时间范围过滤

```javascript
// 查询过去 24 小时的所有兑换事件
const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;

const logs = await publicClient.getContractEvents({
  address: addresses.PSM,
  abi: psmABI,
  eventName: 'SwapUSDCForUSDP',
  fromBlock: 'earliest',
  toBlock: 'latest',
  args: {
    // 可选: 过滤特定用户
    // user: '0x...'
  }
});

// 过滤时间戳
const recentLogs = logs.filter(log => {
  const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
  return Number(block.timestamp) > oneDayAgo;
});

console.log(`过去 24 小时兑换次数: ${recentLogs.length}`);
```

---

### 4.2 批量事件聚合

```javascript
// 批量计算每日交易量
async function calculateDailyVolume(date) {
  const startOfDay = new Date(date).setUTCHours(0, 0, 0, 0) / 1000;
  const endOfDay = startOfDay + 86400;

  // 获取时间范围内的区块
  const startBlock = await getBlockByTimestamp(startOfDay);
  const endBlock = await getBlockByTimestamp(endOfDay);

  // 获取所有事件
  const logs = await publicClient.getContractEvents({
    address: addresses.PSM,
    abi: psmABI,
    eventName: 'SwapUSDCForUSDP',
    fromBlock: startBlock,
    toBlock: endBlock
  });

  // 聚合数据
  const totalUSDC = logs.reduce((sum, log) => sum + Number(log.args.usdcIn), 0);
  const totalUSDP = logs.reduce((sum, log) => sum + Number(log.args.usdpOut), 0);

  return {
    date,
    totalUSDC: formatUnits(totalUSDC.toString(), 6),
    totalUSDP: formatUnits(totalUSDP.toString(), 18),
    swapCount: logs.length
  };
}
```

---

### 4.3 分页查询大量事件

```javascript
async function getAllSwapsInChunks(startBlock, endBlock, chunkSize = 5000) {
  const allLogs = [];

  for (let fromBlock = startBlock; fromBlock <= endBlock; fromBlock += chunkSize) {
    const toBlock = Math.min(fromBlock + chunkSize - 1, endBlock);

    console.log(`查询区块 ${fromBlock} - ${toBlock}...`);

    const logs = await publicClient.getContractEvents({
      address: addresses.PSM,
      abi: psmABI,
      eventName: 'SwapUSDCForUSDP',
      fromBlock: BigInt(fromBlock),
      toBlock: BigInt(toBlock)
    });

    allLogs.push(...logs);

    // 避免 RPC 速率限制
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return allLogs;
}

// 使用
const logs = await getAllSwapsInChunks(10000000, 10100000);
console.log(`总共找到 ${logs.length} 笔兑换`);
```

---

## 5. 实时通知系统

### 5.1 用户活动通知

```javascript
// 监控特定用户的所有活动
class UserActivityMonitor {
  constructor(userAddress) {
    this.userAddress = userAddress;
    this.watchers = [];
  }

  start() {
    // 1. PSM 兑换通知
    this.watchers.push(
      publicClient.watchContractEvent({
        address: addresses.PSM,
        abi: psmABI,
        eventName: 'SwapUSDCForUSDP',
        args: { user: this.userAddress },
        onLogs: (logs) => {
          logs.forEach(log => {
            this.notify('PSM 兑换', {
              type: 'swap',
              usdcIn: formatUnits(log.args.usdcIn, 6),
              usdpOut: formatUnits(log.args.usdpOut, 18),
              txHash: log.transactionHash
            });
          });
        }
      })
    );

    // 2. 奖励领取通知
    this.watchers.push(
      publicClient.watchContractEvent({
        address: addresses.RewardDistributor,
        abi: distributorABI,
        eventName: 'RewardClaimed',
        args: { user: this.userAddress },
        onLogs: (logs) => {
          logs.forEach(log => {
            this.notify('奖励领取', {
              type: 'reward',
              amount: formatUnits(log.args.amountBoosted, 18),
              epoch: log.args.epoch,
              txHash: log.transactionHash
            });
          });
        }
      })
    );

    // 3. 健康因子预警
    this.watchers.push(
      publicClient.watchContractEvent({
        address: addresses.Treasury,
        abi: treasuryABI,
        eventName: 'USDPMinted',
        args: { user: this.userAddress },
        onLogs: async (logs) => {
          for (const log of logs) {
            const hf = Number(formatUnits(log.args.newHealthFactor, 18));

            if (hf < 1.5) {
              this.notify('健康因子预警', {
                type: 'health_factor_warning',
                healthFactor: hf.toFixed(3),
                severity: hf < 1.3 ? 'critical' : 'warning',
                txHash: log.transactionHash
              });
            }
          }
        }
      })
    );
  }

  stop() {
    this.watchers.forEach(unwatch => unwatch());
    this.watchers = [];
  }

  notify(title, data) {
    console.log(`🔔 ${title}:`, data);

    // 发送推送通知（集成 Firebase, Telegram Bot, Email 等）
    sendPushNotification(this.userAddress, title, data);
  }
}

// 使用
const monitor = new UserActivityMonitor('0x1234...abcd');
monitor.start();
```

---

### 5.2 价格预警系统

```javascript
// 监控 RWA 资产价格异常
publicClient.watchContractEvent({
  address: addresses.RWAPriceOracle,
  abi: oracleABI,
  eventName: 'PriceDeviationDetected',
  onLogs: (logs) => {
    logs.forEach(log => {
      const deviation = Number(log.args.deviationPercent) / 100;

      console.error(`🚨 价格偏差预警:`);
      console.error(`  资产: ${log.args.asset}`);
      console.error(`  Chainlink: ${formatUnits(log.args.chainlinkPrice, 6)} USDC`);
      console.error(`  NAV: ${formatUnits(log.args.navPrice, 6)} USDC`);
      console.error(`  偏差: ${deviation.toFixed(2)}%`);

      // 发送警报给风控团队
      sendAlertToRiskTeam({
        asset: log.args.asset,
        deviation,
        timestamp: Date.now()
      });
    });
  }
});
```

---

## 6. 历史事件查询

### 6.1 用户交易历史

```javascript
async function getUserTradingHistory(userAddress, startDate, endDate) {
  const startBlock = await getBlockByTimestamp(startDate);
  const endBlock = await getBlockByTimestamp(endDate);

  // 获取所有 Swap 事件
  const swaps = await publicClient.getContractEvents({
    address: addresses.PSM,
    abi: psmABI,
    eventName: 'SwapUSDCForUSDP',
    args: { user: userAddress },
    fromBlock: startBlock,
    toBlock: endBlock
  });

  // 格式化数据
  const history = await Promise.all(
    swaps.map(async (log) => {
      const block = await publicClient.getBlock({ blockNumber: log.blockNumber });

      return {
        timestamp: new Date(Number(block.timestamp) * 1000),
        usdcIn: formatUnits(log.args.usdcIn, 6),
        usdpOut: formatUnits(log.args.usdpOut, 18),
        txHash: log.transactionHash
      };
    })
  );

  return history;
}

// 使用
const history = await getUserTradingHistory(
  '0x1234...abcd',
  new Date('2025-01-01').getTime() / 1000,
  new Date('2025-11-17').getTime() / 1000
);

console.log(`用户交易记录: ${history.length} 笔`);
```

---

### 6.2 项目募资进度查询

```javascript
async function getProjectFundraisingProgress(projectId) {
  // 获取所有参与事件
  const logs = await publicClient.getContractEvents({
    address: addresses.IssuanceController,
    abi: issuanceABI,
    eventName: 'ParticipationReceived',
    args: { projectId },
    fromBlock: 'earliest',
    toBlock: 'latest'
  });

  // 聚合数据
  const totalRaised = logs.reduce((sum, log) => {
    return sum + Number(log.args.usdcAmount);
  }, 0);

  const participantCount = new Set(logs.map(log => log.args.participant)).size;

  return {
    projectId,
    totalRaised: formatUnits(totalRaised.toString(), 6),
    participantCount,
    participations: logs.length
  };
}
```

---

## 📚 总结

### 关键事件优先级

**P0 (必须监听)**:
- `SwapUSDCForUSDP` / `SwapUSDPForUSDC` - 稳定币兑换
- `USDPMinted` / `USDPBurned` - 债务变化
- `RewardClaimed` - 奖励领取
- `PriceUpdated` - 价格更新

**P1 (重要)**:
- `LockCreated` / `Transfer` - veNFT 生命周期
- `VotedForGauge` - 治理投票
- `Swap` (DEXPair) - DEX 交易

**P2 (可选)**:
- `ProjectRegistered` / `ProjectApproved` - Launchpad
- `Staked` / `Unstaked` - Boost 质押

### 最佳实践

1. **使用 WebSocket** - 更低延迟（<1s vs HTTP 3-5s）
2. **批量处理** - 避免 RPC 速率限制
3. **The Graph** - 复杂查询和聚合数据
4. **错误重试** - 网络不稳定时自动重连
5. **数据验证** - 验证 indexed 参数一致性

---

**下一步**: [错误处理指南](./error-handling.md) - 所有自定义错误及处理建议
