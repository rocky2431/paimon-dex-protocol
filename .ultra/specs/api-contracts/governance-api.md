# 治理模块 API 规范

**模块**: Governance (veNFT, GaugeController, EmissionManager)
**版本**: v1.0
**最后更新**: 2025-11-17

---

## 📋 合约列表

| 合约名称 | 地址 | 用途 |
|---------|------|------|
| **VotingEscrowPaimon** | `addresses.VotingEscrowPaimon` | veNFT (ERC721 可转移投票权) |
| **GaugeController** | `addresses.GaugeController` | Gauge 权重投票 |
| **EmissionManager** | `addresses.EmissionManager` | 三阶段发行调度 |
| **EmissionRouter** | `addresses.EmissionRouter` | 四通道分配路由 |

---

## 1. VotingEscrowPaimon (veNFT)

### 1.1 合约概述

VotingEscrowPaimon 实现可转移的 veNFT 治理模型，用户锁定 PAIMON 获得投票权和收益加成。

**核心特性**:
- ✅ ERC721 标准（veNFT 可交易）
- ✅ 线性衰减投票权（随时间递减）
- ✅ 最长锁定 4 年（208 周）
- ✅ 投票权继承（转移时保留）

### 1.2 核心函数

#### 1.2.1 createLock - 创建 veNFT

```solidity
/**
 * @notice 锁定 PAIMON，创建 veNFT
 * @param _value PAIMON 锁定数量（18 decimals）
 * @param _lockDuration 锁定时长（秒）
 * @return tokenId 铸造的 veNFT ID
 */
function createLock(uint256 _value, uint256 _lockDuration) external returns (uint256 tokenId);
```

**调用示例**:
```javascript
async function createVeNFT(paimonAmount, lockWeeks) {
  const lockDuration = lockWeeks * 7 * 24 * 3600; // 转换为秒
  const MIN_LOCK = 1 * 7 * 24 * 3600;  // 1 周
  const MAX_LOCK = 208 * 7 * 24 * 3600; // 208 周（4 年）

  // 验证锁定时长
  if (lockDuration < MIN_LOCK || lockDuration > MAX_LOCK) {
    throw new Error(`锁定时长必须在 1-208 周之间`);
  }

  // 1. 批准 PAIMON
  const approveHash = await walletClient.writeContract({
    address: addresses.PAIMON,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [addresses.VotingEscrowPaimon, parseUnits(paimonAmount, 18)]
  });

  await publicClient.waitForTransactionReceipt({ hash: approveHash });

  // 2. 创建锁定
  const { result: tokenId } = await publicClient.simulateContract({
    address: addresses.VotingEscrowPaimon,
    abi: veABI,
    functionName: 'createLock',
    args: [parseUnits(paimonAmount, 18), lockDuration]
  });

  const createHash = await walletClient.writeContract({
    address: addresses.VotingEscrowPaimon,
    abi: veABI,
    functionName: 'createLock',
    args: [parseUnits(paimonAmount, 18), lockDuration]
  });

  // 3. 等待确认并提取 tokenId
  const receipt = await publicClient.waitForTransactionReceipt({ hash: createHash });

  // 从 Transfer 事件提取 tokenId (from=0x0, to=user)
  const transferEvent = receipt.logs.find(log =>
    log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' && // Transfer topic
    log.topics[1] === '0x0000000000000000000000000000000000000000000000000000000000000000' // from = 0x0
  );

  const nftTokenId = BigInt(transferEvent.topics[3]);

  console.log(`✅ veNFT 已创建: #${nftTokenId}`);
  console.log(`📊 投票权: ${calculateVotingPower(paimonAmount, lockWeeks)} vePAIMON`);

  return { tokenId: nftTokenId, txHash: createHash };
}

// 投票权计算
function calculateVotingPower(paimonAmount, lockWeeks) {
  const MAX_LOCK_WEEKS = 208;
  return parseFloat(paimonAmount) * (lockWeeks / MAX_LOCK_WEEKS);
}
```

**事件**:
```solidity
event LockCreated(
    uint256 indexed tokenId,
    address indexed owner,
    uint256 value,     // 锁定的 PAIMON 数量
    uint256 lockEnd    // 锁定到期时间戳
);

// ERC721 Transfer 事件
event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
```

**可能的错误**:
```solidity
error LockDurationTooShort(uint256 duration, uint256 minimum); // 锁定时长 < 1 周
error LockDurationTooLong(uint256 duration, uint256 maximum);  // 锁定时长 > 208 周
error ZeroAmount();                                             // 锁定数量为 0
```

---

#### 1.2.2 increaseAmount - 增加锁定量

```solidity
/**
 * @notice 为现有 veNFT 增加锁定的 PAIMON 数量
 * @param _tokenId veNFT ID
 * @param _value 增加的 PAIMON 数量
 */
function increaseAmount(uint256 _tokenId, uint256 _value) external;
```

**调用示例**:
```javascript
async function increaseVeNFTAmount(tokenId, additionalPaimon) {
  // 1. 批准 PAIMON
  const approveHash = await walletClient.writeContract({
    address: addresses.PAIMON,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [addresses.VotingEscrowPaimon, parseUnits(additionalPaimon, 18)]
  });

  await publicClient.waitForTransactionReceipt({ hash: approveHash });

  // 2. 增加锁定量
  const increaseHash = await walletClient.writeContract({
    address: addresses.VotingEscrowPaimon,
    abi: veABI,
    functionName: 'increaseAmount',
    args: [tokenId, parseUnits(additionalPaimon, 18)]
  });

  return increaseHash;
}
```

**事件**:
```solidity
event LockIncreased(uint256 indexed tokenId, uint256 value);
```

---

#### 1.2.3 increaseUnlockTime - 延长锁定期

```solidity
/**
 * @notice 延长 veNFT 的锁定到期时间
 * @param _tokenId veNFT ID
 * @param _lockDuration 新的锁定时长（从当前时间开始）
 */
function increaseUnlockTime(uint256 _tokenId, uint256 _lockDuration) external;
```

**调用示例**:
```javascript
async function extendVeNFTLock(tokenId, newLockWeeks) {
  const newLockDuration = newLockWeeks * 7 * 24 * 3600;

  const extendHash = await walletClient.writeContract({
    address: addresses.VotingEscrowPaimon,
    abi: veABI,
    functionName: 'increaseUnlockTime',
    args: [tokenId, newLockDuration]
  });

  return extendHash;
}
```

**事件**:
```solidity
event LockExtended(uint256 indexed tokenId, uint256 lockEnd);
```

---

#### 1.2.4 withdraw - 解锁提取

```solidity
/**
 * @notice 锁定期结束后，提取 PAIMON（销毁 veNFT）
 * @param _tokenId veNFT ID
 */
function withdraw(uint256 _tokenId) external;
```

**调用示例**:
```javascript
async function withdrawVeNFT(tokenId) {
  // 1. 检查锁定是否到期
  const lockEnd = await publicClient.readContract({
    address: addresses.VotingEscrowPaimon,
    abi: veABI,
    functionName: 'locked',
    args: [tokenId]
  });

  const now = Math.floor(Date.now() / 1000);
  if (lockEnd.end > now) {
    throw new Error(`锁定尚未到期，剩余 ${Math.floor((lockEnd.end - now) / 86400)} 天`);
  }

  // 2. 提取
  const withdrawHash = await walletClient.writeContract({
    address: addresses.VotingEscrowPaimon,
    abi: veABI,
    functionName: 'withdraw',
    args: [tokenId]
  });

  return withdrawHash;
}
```

**事件**:
```solidity
event Withdraw(uint256 indexed tokenId, uint256 value);

// ERC721 Transfer (to=0x0 表示销毁)
event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
```

**可能的错误**:
```solidity
error LockNotExpired(uint256 tokenId, uint256 lockEnd); // 锁定未到期
error NotOwner(uint256 tokenId);                        // 非 veNFT 持有者
```

---

#### 1.2.5 balanceOfNFT - 查询投票权

```solidity
/**
 * @notice 查询 veNFT 的当前投票权（随时间线性衰减）
 * @param _tokenId veNFT ID
 * @return Current voting power (18 decimals)
 */
function balanceOfNFT(uint256 _tokenId) external view returns (uint256);
```

**调用示例**:
```javascript
async function getVotingPower(tokenId) {
  const votingPower = await publicClient.readContract({
    address: addresses.VotingEscrowPaimon,
    abi: veABI,
    functionName: 'balanceOfNFT',
    args: [tokenId]
  });

  console.log(`veNFT #${tokenId} 当前投票权: ${formatUnits(votingPower, 18)} vePAIMON`);

  return votingPower;
}
```

---

#### 1.2.6 transferFrom - 转移 veNFT (ERC721)

```solidity
/**
 * @notice 转移 veNFT（符合 ERC721 标准）
 * @param from 当前持有者
 * @param to 新持有者
 * @param tokenId veNFT ID
 */
function transferFrom(address from, address to, uint256 tokenId) external;
```

**调用示例**:
```javascript
async function transferVeNFT(tokenId, toAddress) {
  const transferHash = await walletClient.writeContract({
    address: addresses.VotingEscrowPaimon,
    abi: veABI, // ERC721 ABI
    functionName: 'transferFrom',
    args: [walletClient.account.address, toAddress, tokenId]
  });

  console.log(`✅ veNFT #${tokenId} 已转移至 ${toAddress}`);

  return transferHash;
}
```

**事件**:
```solidity
event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
```

---

### 1.3 完整 veNFT ABI

```javascript
const VENFT_ABI = [
  // Read functions
  {
    name: 'balanceOfNFT',
    type: 'function',
    inputs: [{ name: '_tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'locked',
    type: 'function',
    inputs: [{ name: '_tokenId', type: 'uint256' }],
    outputs: [
      { name: 'amount', type: 'int128' },
      { name: 'end', type: 'uint256' }
    ],
    stateMutability: 'view'
  },
  {
    name: 'ownerOf',
    type: 'function',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view'
  },

  // Write functions
  {
    name: 'createLock',
    type: 'function',
    inputs: [
      { name: '_value', type: 'uint256' },
      { name: '_lockDuration', type: 'uint256' }
    ],
    outputs: [{ name: 'tokenId', type: 'uint256' }],
    stateMutability: 'nonpayable'
  },
  {
    name: 'increaseAmount',
    type: 'function',
    inputs: [
      { name: '_tokenId', type: 'uint256' },
      { name: '_value', type: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'increaseUnlockTime',
    type: 'function',
    inputs: [
      { name: '_tokenId', type: 'uint256' },
      { name: '_lockDuration', type: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'withdraw',
    type: 'function',
    inputs: [{ name: '_tokenId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'transferFrom',
    type: 'function',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },

  // Events
  {
    name: 'LockCreated',
    type: 'event',
    inputs: [
      { indexed: true, name: 'tokenId', type: 'uint256' },
      { indexed: true, name: 'owner', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' },
      { indexed: false, name: 'lockEnd', type: 'uint256' }
    ]
  },
  {
    name: 'LockIncreased',
    type: 'event',
    inputs: [
      { indexed: true, name: 'tokenId', type: 'uint256' },
      { indexed: false, name: 'value', type: 'uint256' }
    ]
  },
  {
    name: 'LockExtended',
    type: 'event',
    inputs: [
      { indexed: true, name: 'tokenId', type: 'uint256' },
      { indexed: false, name: 'lockEnd', type: 'uint256' }
    ]
  },
  {
    name: 'Withdraw',
    type: 'event',
    inputs: [
      { indexed: true, name: 'tokenId', type: 'uint256' },
      { indexed: false, name: 'value', type: 'uint256' }
    ]
  },
  {
    name: 'Transfer',
    type: 'event',
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: true, name: 'tokenId', type: 'uint256' }
    ]
  },

  // Errors
  {
    name: 'LockDurationTooShort',
    type: 'error',
    inputs: [
      { name: 'duration', type: 'uint256' },
      { name: 'minimum', type: 'uint256' }
    ]
  },
  {
    name: 'LockDurationTooLong',
    type: 'error',
    inputs: [
      { name: 'duration', type: 'uint256' },
      { name: 'maximum', type: 'uint256' }
    ]
  },
  {
    name: 'LockNotExpired',
    type: 'error',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'lockEnd', type: 'uint256' }
    ]
  },
  {
    name: 'NotOwner',
    type: 'error',
    inputs: [{ name: 'tokenId', type: 'uint256' }]
  }
];
```

---

## 2. GaugeController (Gauge 投票)

### 2.1 合约概述

GaugeController 管理 LP 池的权重投票，决定 PAIMON 发行分配。

**核心特性**:
- ✅ 每 10 天重置投票周期
- ✅ 投票权 = veNFT 当前余额
- ✅ 支持多 Gauge 同时投票
- ✅ 权重归一化（总和 100%）

### 2.2 核心函数

#### 2.2.1 vote - 投票

```solidity
/**
 * @notice 为多个 Gauge 投票（分配 veNFT 投票权）
 * @param _tokenId veNFT ID
 * @param _poolVotes Gauge 地址数组
 * @param _weights 权重数组（总和 = 10000 = 100%）
 */
function vote(uint256 _tokenId, address[] calldata _poolVotes, uint256[] calldata _weights) external;
```

**调用示例**:
```javascript
async function voteForGauges(tokenId, gauges, weights) {
  // 验证权重总和 = 10000
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight !== 10000) {
    throw new Error(`权重总和必须为 10000，当前: ${totalWeight}`);
  }

  // 执行投票
  const voteHash = await walletClient.writeContract({
    address: addresses.GaugeController,
    abi: gaugeControllerABI,
    functionName: 'vote',
    args: [tokenId, gauges, weights]
  });

  console.log(`✅ 已投票: veNFT #${tokenId}`);
  gauges.forEach((gauge, i) => {
    console.log(`  ${gauge}: ${weights[i] / 100}%`);
  });

  return voteHash;
}

// 示例: 为 3 个池投票
await voteForGauges(
  42, // veNFT ID
  [
    '0x1111...aaaa', // USDC-USDP Gauge
    '0x2222...bbbb', // PAIMON-BNB Gauge
    '0x3333...cccc'  // pUST125-USDP Gauge
  ],
  [5000, 3000, 2000] // 50% + 30% + 20%
);
```

**事件**:
```solidity
event VotedForGauge(
    address indexed user,
    address indexed gauge,
    uint256 weight    // Basis points (10000 = 100%)
);
```

**可能的错误**:
```solidity
error VotingPowerInsufficient(uint256 required, uint256 available); // 投票权不足
error InvalidWeights(uint256 totalWeight);                          // 权重总和 ≠ 10000
error TooSoonToVote(uint256 nextVoteTime);                          // 距上次投票 < 10 天
error GaugeNotRegistered(address gauge);                            // Gauge 未注册
```

---

#### 2.2.2 gauges - 查询 Gauge 地址

```solidity
/**
 * @notice 查询 LP 池对应的 Gauge 地址
 * @param _pool LP token 地址
 * @return Gauge 合约地址
 */
function gauges(address _pool) external view returns (address);
```

**调用示例**:
```javascript
async function findGaugeForPool(poolAddress) {
  const gaugeAddress = await publicClient.readContract({
    address: addresses.GaugeController,
    abi: gaugeControllerABI,
    functionName: 'gauges',
    args: [poolAddress]
  });

  if (gaugeAddress === '0x0000000000000000000000000000000000000000') {
    console.log('⚠️ 该池暂无 Gauge');
  } else {
    console.log(`✅ Gauge 地址: ${gaugeAddress}`);
  }

  return gaugeAddress;
}
```

---

#### 2.2.3 weights - 查询 Gauge 权重

```solidity
/**
 * @notice 查询 Gauge 的当前权重（归一化后）
 * @param _gauge Gauge 地址
 * @return weight 权重（18 decimals, 0.0-1.0）
 */
function weights(address _gauge) external view returns (uint256 weight);
```

**调用示例**:
```javascript
async function getGaugeWeights() {
  const gauges = [
    addresses.USDC_USDP_Gauge,
    addresses.PAIMON_BNB_Gauge,
    addresses.pUST125_USDP_Gauge
  ];

  const weights = await Promise.all(
    gauges.map(gauge =>
      publicClient.readContract({
        address: addresses.GaugeController,
        abi: gaugeControllerABI,
        functionName: 'weights',
        args: [gauge]
      })
    )
  );

  console.log('🎯 当前 Gauge 权重:');
  gauges.forEach((gauge, i) => {
    const percentage = (Number(formatUnits(weights[i], 18)) * 100).toFixed(2);
    console.log(`  ${gauge}: ${percentage}%`);
  });

  return weights;
}
```

---

## 3. EmissionManager (发行调度)

### 3.1 合约概述

EmissionManager 实现三阶段确定性发行调度（10B PAIMON / 6.77 年）。

**核心特性**:
- ✅ Phase A (Week 1-12): 固定 37.5M/周
- ✅ Phase B (Week 13-248): 指数衰减 0.985^t
- ✅ Phase C (Week 249-352): 固定 4.327M/周
- ✅ 预计算查找表（O(1) gas）

### 3.2 核心函数

#### 3.2.1 getEmissionForWeek - 查询周发行量

```solidity
/**
 * @notice 查询指定周的 PAIMON 发行量
 * @param week 周数（1-352）
 * @return emission 该周的总发行量（18 decimals）
 */
function getEmissionForWeek(uint256 week) external view returns (uint256 emission);
```

**调用示例**:
```javascript
async function getWeeklyEmission(week) {
  const emission = await publicClient.readContract({
    address: addresses.EmissionManager,
    abi: emissionManagerABI,
    functionName: 'getEmissionForWeek',
    args: [week]
  });

  console.log(`第 ${week} 周发行量: ${formatUnits(emission, 18)} PAIMON`);

  return emission;
}

// 查询当前周
async function getCurrentWeekEmission() {
  const currentWeek = await publicClient.readContract({
    address: addresses.EmissionManager,
    abi: emissionManagerABI,
    functionName: 'currentWeek'
  });

  return await getWeeklyEmission(Number(currentWeek));
}
```

---

#### 3.2.2 getCurrentPhase - 查询当前阶段

```solidity
/**
 * @notice 查询当前所处的发行阶段
 * @return phase 阶段编号（0=A, 1=B, 2=C）
 */
function getCurrentPhase() external view returns (uint8 phase);
```

**调用示例**:
```javascript
async function getEmissionPhase() {
  const phase = await publicClient.readContract({
    address: addresses.EmissionManager,
    abi: emissionManagerABI,
    functionName: 'getCurrentPhase'
  });

  const phaseNames = ['Phase A (固定高发行)', 'Phase B (指数衰减)', 'Phase C (固定低发行)'];
  console.log(`📅 当前阶段: ${phaseNames[phase]}`);

  return phase;
}
```

---

## 4. EmissionRouter (分配路由)

### 4.1 合约概述

EmissionRouter 将每周发行量分配到 4 个通道（Debt, LP, Stab, Eco）。

**核心特性**:
- ✅ 一次性分配（each week executed once）
- ✅ 动态通道比例（阶段相关）
- ✅ LP 内部分割（Pairs vs Stability Pool）

### 4.2 核心函数

#### 4.2.1 routeWeeklyEmissions - 执行分配

```solidity
/**
 * @notice 执行本周发行分配（仅治理调用）
 * @param week 周数
 */
function routeWeeklyEmissions(uint256 week) external onlyGovernance;
```

**监听事件示例**:
```javascript
// 监听每周分配事件
publicClient.watchContractEvent({
  address: addresses.EmissionRouter,
  abi: emissionRouterABI,
  eventName: 'WeeklyDistribution',
  onLogs: (logs) => {
    logs.forEach(log => {
      const { week, debtAmount, lpAmount, stabAmount, ecoAmount } = log.args;
      const total = debtAmount + lpAmount + stabAmount + ecoAmount;

      console.log(`📊 第 ${week} 周分配完成:`);
      console.log(`  Debt Mining: ${formatUnits(debtAmount, 18)} (${(Number(debtAmount) / Number(total) * 100).toFixed(1)}%)`);
      console.log(`  LP Pairs:    ${formatUnits(lpAmount, 18)} (${(Number(lpAmount) / Number(total) * 100).toFixed(1)}%)`);
      console.log(`  Stab Pool:   ${formatUnits(stabAmount, 18)} (${(Number(stabAmount) / Number(total) * 100).toFixed(1)}%)`);
      console.log(`  Ecosystem:   ${formatUnits(ecoAmount, 18)} (${(Number(ecoAmount) / Number(total) * 100).toFixed(1)}%)`);
    });
  }
});
```

**事件**:
```solidity
event WeeklyDistribution(
    uint256 indexed week,
    uint256 debtAmount,   // Debt Mining 通道
    uint256 lpAmount,     // LP Pairs 通道
    uint256 stabAmount,   // Stability Pool 通道
    uint256 ecoAmount     // Ecosystem 通道
);
```

---

## 5. 集成示例：完整治理流程

```javascript
/**
 * 完整流程: 创建 veNFT → 投票 → 监控权重 → 收集奖励
 */
async function fullGovernanceJourney() {
  // Step 1: 创建 veNFT (锁定 10,000 PAIMON 2 年)
  console.log('Step 1: 创建 veNFT...');
  const { tokenId } = await createVeNFT('10000', 104);
  console.log(`✅ veNFT #${tokenId} 创建完成`);

  // Step 2: 查询投票权
  const votingPower = await getVotingPower(tokenId);
  console.log(`📊 投票权: ${formatUnits(votingPower, 18)} vePAIMON`);

  // Step 3: 为 Gauge 投票
  console.log('Step 3: 投票...');
  await voteForGauges(
    tokenId,
    [
      addresses.USDC_USDP_Gauge,
      addresses.PAIMON_BNB_Gauge
    ],
    [6000, 4000] // 60% + 40%
  );

  // Step 4: 监控 Gauge 权重变化
  setInterval(async () => {
    await getGaugeWeights();
  }, 3600 * 1000); // 每小时检查一次

  // Step 5: 查询当前发行阶段
  await getEmissionPhase();

  return { tokenId, votingPower };
}
```

---

**下一步**: [DEX 模块 API](./dex-api.md) - AMM 流动性池、Router、价格查询
