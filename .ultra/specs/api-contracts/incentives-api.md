# 激励模块 API 规范

**模块**: Incentives (RewardDistributor, BoostStaking, NitroPool, Bribe)
**版本**: v1.0
**最后更新**: 2025-11-17

---

## 📋 合约列表

| 合约名称 | 地址 | 用途 |
|---------|------|------|
| **RewardDistributor** | `addresses.RewardDistributor` | Merkle 树奖励分配 |
| **BoostStaking** | `addresses.BoostStaking` | PAIMON 质押获取 Boost 倍数 |
| **NitroPool** | `addresses.NitroPool` | 限时加速挖矿池 |
| **BribeMarketplace** | `addresses.BribeMarketplace` | Gauge 投票贿赂市场 |

---

## 1. RewardDistributor (Merkle 奖励分配)

### 1.1 合约概述

RewardDistributor 使用 Merkle Tree 实现链下计算、链上验证的高效奖励分配。

**核心特性**:
- ✅ Gas 高效（O(log n) 验证）
- ✅ 支持多 epoch 累积领取
- ✅ 自动应用 Boost 倍数
- ✅ 防重复领取（bitmap 机制）

### 1.2 核心函数

#### 1.2.1 claim - 领取奖励

```solidity
/**
 * @notice 领取指定 epoch 的奖励（使用 Merkle 证明）
 * @param epoch 奖励周期编号
 * @param amount 原始奖励数量（未应用 Boost）
 * @param merkleProof Merkle 证明路径
 */
function claim(
    uint256 epoch,
    uint256 amount,
    bytes32[] calldata merkleProof
) external;
```

**调用示例**:
```javascript
async function claimRewards(epoch, proof, amount) {
  // 1. 检查是否已领取
  const claimed = await publicClient.readContract({
    address: addresses.RewardDistributor,
    abi: distributorABI,
    functionName: 'hasClaimed',
    args: [epoch, walletClient.account.address]
  });

  if (claimed) {
    console.log(`⚠️ Epoch ${epoch} 已领取`);
    return null;
  }

  // 2. 查询 Boost 倍数
  const boostMultiplier = await publicClient.readContract({
    address: addresses.BoostStaking,
    abi: boostStakingABI,
    functionName: 'getBoostMultiplier',
    args: [walletClient.account.address]
  });

  const finalAmount = BigInt(amount) * boostMultiplier / BigInt(10000);
  console.log(`📊 原始奖励: ${formatUnits(amount, 18)} PAIMON`);
  console.log(`📈 Boost 倍数: ${Number(boostMultiplier) / 10000}x`);
  console.log(`💰 实际到账: ${formatUnits(finalAmount, 18)} PAIMON`);

  // 3. 领取
  const claimHash = await walletClient.writeContract({
    address: addresses.RewardDistributor,
    abi: distributorABI,
    functionName: 'claim',
    args: [epoch, amount, proof]
  });

  return claimHash;
}

// 示例: 从链下 API 获取证明后领取
const response = await fetch(`https://api.paimon.dex/rewards/${userAddress}/${epoch}`);
const { amount, proof } = await response.json();
await claimRewards(epoch, proof, amount);
```

**事件**:
```solidity
event RewardClaimed(
    address indexed user,
    uint256 indexed epoch,
    uint256 amountBase,      // 原始数量
    uint256 amountBoosted,   // Boost 后数量
    uint256 boostMultiplier  // 倍数（basis points）
);
```

**可能的错误**:
```solidity
error InvalidProof();                              // Merkle 证明无效
error AlreadyClaimed(uint256 epoch, address user); // 已领取
error MerkleRootNotSet(uint256 epoch);             // 未设置 Merkle Root
error EpochNotStarted(uint256 epoch);              // Epoch 未开始
```

---

#### 1.2.2 claimMultiple - 批量领取

```solidity
/**
 * @notice 批量领取多个 epoch 的奖励
 * @param epochs Epoch 数组
 * @param amounts 原始奖励数组
 * @param merkleProofs Merkle 证明数组
 */
function claimMultiple(
    uint256[] calldata epochs,
    uint256[] calldata amounts,
    bytes32[][] calldata merkleProofs
) external;
```

**调用示例**:
```javascript
async function claimMultipleEpochs(epochs) {
  // 1. 从 API 获取所有 epoch 的证明
  const responses = await Promise.all(
    epochs.map(epoch =>
      fetch(`https://api.paimon.dex/rewards/${userAddress}/${epoch}`)
        .then(r => r.json())
    )
  );

  const amounts = responses.map(r => r.amount);
  const proofs = responses.map(r => r.proof);

  // 2. 批量领取（单次交易）
  const claimHash = await walletClient.writeContract({
    address: addresses.RewardDistributor,
    abi: distributorABI,
    functionName: 'claimMultiple',
    args: [epochs, amounts, proofs]
  });

  console.log(`✅ 已领取 ${epochs.length} 个 epoch 奖励`);
  return claimHash;
}

// 示例: 领取 Epoch 10-15 的累积奖励
await claimMultipleEpochs([10, 11, 12, 13, 14, 15]);
```

---

#### 1.2.3 hasClaimed - 查询领取状态

```solidity
/**
 * @notice 查询用户是否已领取指定 epoch 的奖励
 * @param epoch Epoch 编号
 * @param user 用户地址
 * @return True if claimed, false otherwise
 */
function hasClaimed(uint256 epoch, address user) external view returns (bool);
```

**调用示例**:
```javascript
async function checkClaimStatus(user, epochStart, epochEnd) {
  const statuses = await Promise.all(
    Array.from({ length: epochEnd - epochStart + 1 }, (_, i) => epochStart + i)
      .map(epoch =>
        publicClient.readContract({
          address: addresses.RewardDistributor,
          abi: distributorABI,
          functionName: 'hasClaimed',
          args: [epoch, user]
        })
      )
  );

  console.log('📊 领取状态:');
  statuses.forEach((claimed, i) => {
    const epoch = epochStart + i;
    console.log(`  Epoch ${epoch}: ${claimed ? '✅ 已领取' : '⏳ 待领取'}`);
  });

  return statuses;
}
```

---

#### 1.2.4 merkleRoots - 查询 Merkle Root

```solidity
/**
 * @notice 查询指定 epoch 的 Merkle Root
 * @param epoch Epoch 编号
 * @return Merkle Root（0x0 表示未设置）
 */
function merkleRoots(uint256 epoch) external view returns (bytes32);
```

**调用示例**:
```javascript
async function getMerkleRoot(epoch) {
  const root = await publicClient.readContract({
    address: addresses.RewardDistributor,
    abi: distributorABI,
    functionName: 'merkleRoots',
    args: [epoch]
  });

  if (root === '0x0000000000000000000000000000000000000000000000000000000000000000') {
    console.log(`⚠️ Epoch ${epoch} Merkle Root 未设置`);
  } else {
    console.log(`✅ Epoch ${epoch} Merkle Root: ${root}`);
  }

  return root;
}
```

---

### 1.3 完整 RewardDistributor ABI

```javascript
const REWARD_DISTRIBUTOR_ABI = [
  // Read functions
  {
    name: 'hasClaimed',
    type: 'function',
    inputs: [
      { name: 'epoch', type: 'uint256' },
      { name: 'user', type: 'address' }
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view'
  },
  {
    name: 'merkleRoots',
    type: 'function',
    inputs: [{ name: 'epoch', type: 'uint256' }],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view'
  },
  {
    name: 'currentEpoch',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },

  // Write functions
  {
    name: 'claim',
    type: 'function',
    inputs: [
      { name: 'epoch', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'merkleProof', type: 'bytes32[]' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'claimMultiple',
    type: 'function',
    inputs: [
      { name: 'epochs', type: 'uint256[]' },
      { name: 'amounts', type: 'uint256[]' },
      { name: 'merkleProofs', type: 'bytes32[][]' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },

  // Events
  {
    name: 'RewardClaimed',
    type: 'event',
    inputs: [
      { indexed: true, name: 'user', type: 'address' },
      { indexed: true, name: 'epoch', type: 'uint256' },
      { indexed: false, name: 'amountBase', type: 'uint256' },
      { indexed: false, name: 'amountBoosted', type: 'uint256' },
      { indexed: false, name: 'boostMultiplier', type: 'uint256' }
    ]
  },
  {
    name: 'MerkleRootUpdated',
    type: 'event',
    inputs: [
      { indexed: true, name: 'epoch', type: 'uint256' },
      { indexed: false, name: 'merkleRoot', type: 'bytes32' }
    ]
  },

  // Errors
  {
    name: 'InvalidProof',
    type: 'error',
    inputs: []
  },
  {
    name: 'AlreadyClaimed',
    type: 'error',
    inputs: [
      { name: 'epoch', type: 'uint256' },
      { name: 'user', type: 'address' }
    ]
  },
  {
    name: 'MerkleRootNotSet',
    type: 'error',
    inputs: [{ name: 'epoch', type: 'uint256' }]
  }
];
```

---

## 2. BoostStaking (倍数质押)

### 2.1 合约概述

BoostStaking 允许用户质押 PAIMON 获取 1.0x - 1.5x 奖励倍数，应用于所有奖励类型。

**核心特性**:
- ✅ 倍数范围: 1.0x - 1.5x
- ✅ 锁定期越长，倍数越高
- ✅ 应用于 Debt Mining、LP、Ecosystem 所有奖励
- ✅ 提前解锁罚金 50%

### 2.2 核心函数

#### 2.2.1 stake - 质押 PAIMON

```solidity
/**
 * @notice 质押 PAIMON 以获取 Boost 倍数
 * @param amount 质押数量（18 decimals）
 * @param lockDuration 锁定时长（秒）
 */
function stake(uint256 amount, uint256 lockDuration) external;
```

**调用示例**:
```javascript
async function stakeForBoost(amount, lockWeeks) {
  const lockDuration = lockWeeks * 7 * 24 * 3600;
  const MIN_LOCK = 1 * 7 * 24 * 3600;  // 1 周
  const MAX_LOCK = 208 * 7 * 24 * 3600; // 208 周（4 年）

  if (lockDuration < MIN_LOCK || lockDuration > MAX_LOCK) {
    throw new Error('锁定时长必须在 1-208 周之间');
  }

  // 1. 预览 Boost 倍数
  const multiplier = await publicClient.readContract({
    address: addresses.BoostStaking,
    abi: boostStakingABI,
    functionName: 'calculateBoostMultiplier',
    args: [parseUnits(amount, 18), lockDuration]
  });

  console.log(`📈 预计 Boost 倍数: ${Number(multiplier) / 10000}x`);

  // 2. 批准 PAIMON
  const approveHash = await walletClient.writeContract({
    address: addresses.PAIMON,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [addresses.BoostStaking, parseUnits(amount, 18)]
  });

  await publicClient.waitForTransactionReceipt({ hash: approveHash });

  // 3. 质押
  const stakeHash = await walletClient.writeContract({
    address: addresses.BoostStaking,
    abi: boostStakingABI,
    functionName: 'stake',
    args: [parseUnits(amount, 18), lockDuration]
  });

  return stakeHash;
}

// 示例: 质押 1000 PAIMON，锁定 52 周
await stakeForBoost('1000', 52);
```

**Boost 倍数计算公式**:
```
multiplier = 10000 + (stakedAmount * lockDuration) / (maxStake * maxLockDuration) * 5000

其中:
- 10000 = 1.0x（基础倍数）
- 5000 = 0.5x（最大额外倍数）
- maxStake = 全局质押上限（治理配置）
- maxLockDuration = 208 周
```

**事件**:
```solidity
event Staked(
    address indexed user,
    uint256 amount,
    uint256 lockDuration,
    uint256 lockEnd,
    uint256 boostMultiplier  // Basis points (10000 = 1.0x)
);
```

---

#### 2.2.2 unstake - 解除质押

```solidity
/**
 * @notice 解除质押（锁定期结束后）
 * @param amount 解除质押数量
 */
function unstake(uint256 amount) external;
```

**调用示例**:
```javascript
async function unstake(amount) {
  // 1. 查询质押信息
  const stakeInfo = await publicClient.readContract({
    address: addresses.BoostStaking,
    abi: boostStakingABI,
    functionName: 'stakes',
    args: [walletClient.account.address]
  });

  const now = Math.floor(Date.now() / 1000);
  if (stakeInfo.lockEnd > now) {
    const daysRemaining = Math.floor((stakeInfo.lockEnd - now) / 86400);
    throw new Error(`锁定未到期，剩余 ${daysRemaining} 天`);
  }

  // 2. 解除质押
  const unstakeHash = await walletClient.writeContract({
    address: addresses.BoostStaking,
    abi: boostStakingABI,
    functionName: 'unstake',
    args: [parseUnits(amount, 18)]
  });

  return unstakeHash;
}
```

**事件**:
```solidity
event Unstaked(
    address indexed user,
    uint256 amount
);
```

---

#### 2.2.3 emergencyUnstake - 紧急解锁（罚金 50%）

```solidity
/**
 * @notice 紧急提前解锁（扣除 50% 罚金）
 * @param amount 解除质押数量
 */
function emergencyUnstake(uint256 amount) external;
```

**调用示例**:
```javascript
async function emergencyUnstake(amount) {
  const penalty = parseFloat(amount) * 0.5;

  console.warn(`⚠️ 提前解锁将扣除 50% 罚金`);
  console.warn(`  解锁数量: ${amount} PAIMON`);
  console.warn(`  罚金: ${penalty} PAIMON`);
  console.warn(`  实际到账: ${amount - penalty} PAIMON`);

  const confirmed = confirm('确认提前解锁？');
  if (!confirmed) return null;

  const emergencyHash = await walletClient.writeContract({
    address: addresses.BoostStaking,
    abi: boostStakingABI,
    functionName: 'emergencyUnstake',
    args: [parseUnits(amount, 18)]
  });

  return emergencyHash;
}
```

**事件**:
```solidity
event EmergencyUnstaked(
    address indexed user,
    uint256 amountRequested,
    uint256 amountReceived,  // 50% of requested
    uint256 penalty          // 50% penalty
);
```

---

#### 2.2.4 getBoostMultiplier - 查询当前倍数

```solidity
/**
 * @notice 查询用户的当前 Boost 倍数
 * @param user 用户地址
 * @return multiplier Boost 倍数（basis points, 10000 = 1.0x）
 */
function getBoostMultiplier(address user) external view returns (uint256 multiplier);
```

**调用示例**:
```javascript
async function getUserBoost(userAddress) {
  const multiplier = await publicClient.readContract({
    address: addresses.BoostStaking,
    abi: boostStakingABI,
    functionName: 'getBoostMultiplier',
    args: [userAddress]
  });

  const boost = Number(multiplier) / 10000;
  console.log(`📈 Boost 倍数: ${boost.toFixed(2)}x`);

  // 计算实际收益提升
  const baseReward = 1000; // 假设基础奖励 1000 PAIMON
  const boostedReward = baseReward * boost;
  const extraReward = boostedReward - baseReward;

  console.log(`💰 基础奖励: ${baseReward} PAIMON`);
  console.log(`🚀 Boost 后: ${boostedReward.toFixed(2)} PAIMON`);
  console.log(`➕ 额外收益: ${extraReward.toFixed(2)} PAIMON (+${((boost - 1) * 100).toFixed(1)}%)`);

  return { multiplier, boost };
}
```

---

### 2.3 完整 BoostStaking ABI

```javascript
const BOOST_STAKING_ABI = [
  // Read functions
  {
    name: 'stakes',
    type: 'function',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'lockEnd', type: 'uint256' },
      { name: 'boostMultiplier', type: 'uint256' }
    ],
    stateMutability: 'view'
  },
  {
    name: 'getBoostMultiplier',
    type: 'function',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: 'multiplier', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'calculateBoostMultiplier',
    type: 'function',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'lockDuration', type: 'uint256' }
    ],
    outputs: [{ name: 'multiplier', type: 'uint256' }],
    stateMutability: 'view'
  },

  // Write functions
  {
    name: 'stake',
    type: 'function',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'lockDuration', type: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'unstake',
    type: 'function',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'emergencyUnstake',
    type: 'function',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },

  // Events
  {
    name: 'Staked',
    type: 'event',
    inputs: [
      { indexed: true, name: 'user', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'lockDuration', type: 'uint256' },
      { indexed: false, name: 'lockEnd', type: 'uint256' },
      { indexed: false, name: 'boostMultiplier', type: 'uint256' }
    ]
  },
  {
    name: 'Unstaked',
    type: 'event',
    inputs: [
      { indexed: true, name: 'user', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' }
    ]
  },
  {
    name: 'EmergencyUnstaked',
    type: 'event',
    inputs: [
      { indexed: true, name: 'user', type: 'address' },
      { indexed: false, name: 'amountRequested', type: 'uint256' },
      { indexed: false, name: 'amountReceived', type: 'uint256' },
      { indexed: false, name: 'penalty', type: 'uint256' }
    ]
  }
];
```

---

## 3. NitroPool (限时加速池)

### 3.1 合约概述

NitroPool 提供限时高 APR 挖矿活动，用于冷启动新交易对流动性。

**核心特性**:
- ✅ 限时活动（通常 2-4 周）
- ✅ 高额奖励（APR 100-500%）
- ✅ 支持多种 LP token
- ✅ 无锁定期，随时进出

### 3.2 核心函数

#### 3.2.1 deposit - 存入 LP token

```solidity
/**
 * @notice 存入 LP token 到 Nitro Pool
 * @param amount LP token 数量
 */
function deposit(uint256 amount) external;
```

**调用示例**:
```javascript
async function depositToNitro(lpTokenAddress, amount) {
  // 1. 查询池子信息
  const poolInfo = await publicClient.readContract({
    address: addresses.NitroPool,
    abi: nitroPoolABI,
    functionName: 'poolInfo'
  });

  const now = Math.floor(Date.now() / 1000);
  if (now > poolInfo.endTime) {
    throw new Error('Nitro Pool 已结束');
  }

  // 2. 计算预期 APR
  const totalStaked = poolInfo.totalStaked;
  const rewardRate = poolInfo.rewardPerSecond;
  const secondsInYear = 365 * 24 * 3600;
  const annualReward = Number(rewardRate) * secondsInYear;
  const apr = totalStaked > 0
    ? (annualReward / Number(totalStaked)) * 100
    : 0;

  console.log(`📊 Nitro Pool APR: ${apr.toFixed(2)}%`);
  console.log(`⏰ 剩余时间: ${Math.floor((poolInfo.endTime - now) / 86400)} 天`);

  // 3. 批准 LP token
  const approveHash = await walletClient.writeContract({
    address: lpTokenAddress,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [addresses.NitroPool, parseUnits(amount, 18)]
  });

  await publicClient.waitForTransactionReceipt({ hash: approveHash });

  // 4. 存入
  const depositHash = await walletClient.writeContract({
    address: addresses.NitroPool,
    abi: nitroPoolABI,
    functionName: 'deposit',
    args: [parseUnits(amount, 18)]
  });

  return depositHash;
}
```

**事件**:
```solidity
event Deposited(
    address indexed user,
    uint256 amount,
    uint256 totalStaked
);
```

---

#### 3.2.2 withdraw - 提取 LP token

```solidity
/**
 * @notice 提取 LP token（自动领取奖励）
 * @param amount LP token 数量
 */
function withdraw(uint256 amount) external;
```

**调用示例**:
```javascript
async function withdrawFromNitro(amount) {
  // 1. 查询当前质押和待领取奖励
  const [staked, pending] = await Promise.all([
    publicClient.readContract({
      address: addresses.NitroPool,
      abi: nitroPoolABI,
      functionName: 'balanceOf',
      args: [walletClient.account.address]
    }),
    publicClient.readContract({
      address: addresses.NitroPool,
      abi: nitroPoolABI,
      functionName: 'pendingRewards',
      args: [walletClient.account.address]
    })
  ]);

  console.log(`💼 当前质押: ${formatUnits(staked, 18)} LP`);
  console.log(`💰 待领取奖励: ${formatUnits(pending, 18)} PAIMON`);

  // 2. 提取（会自动领取奖励）
  const withdrawHash = await walletClient.writeContract({
    address: addresses.NitroPool,
    abi: nitroPoolABI,
    functionName: 'withdraw',
    args: [parseUnits(amount, 18)]
  });

  return withdrawHash;
}
```

**事件**:
```solidity
event Withdrawn(
    address indexed user,
    uint256 amount,
    uint256 rewards  // 自动领取的奖励
);
```

---

#### 3.2.3 harvest - 仅领取奖励

```solidity
/**
 * @notice 领取奖励（不提取 LP token）
 */
function harvest() external;
```

**调用示例**:
```javascript
async function harvestNitroRewards() {
  // 1. 查询待领取奖励
  const pending = await publicClient.readContract({
    address: addresses.NitroPool,
    abi: nitroPoolABI,
    functionName: 'pendingRewards',
    args: [walletClient.account.address]
  });

  console.log(`💰 待领取奖励: ${formatUnits(pending, 18)} PAIMON`);

  // 2. 领取
  const harvestHash = await walletClient.writeContract({
    address: addresses.NitroPool,
    abi: nitroPoolABI,
    functionName: 'harvest'
  });

  return harvestHash;
}
```

---

## 4. BribeMarketplace (贿赂市场)

### 4.1 合约概述

BribeMarketplace 允许项目方/协议向 vePAIMON 持有者支付贿赂，引导投票到特定 Gauge。

**核心特性**:
- ✅ 去中心化贿赂机制
- ✅ 支持任意 ERC20 代币作为贿赂
- ✅ Pro-rata 分配（按投票权比例）
- ✅ 7 天投票周期

### 4.2 核心函数

#### 4.2.1 createBribe - 创建贿赂

```solidity
/**
 * @notice 为指定 Gauge 创建贿赂
 * @param gauge Gauge 地址
 * @param rewardToken 贿赂代币地址
 * @param amount 贿赂总额
 * @param epoch 目标 Epoch
 */
function createBribe(
    address gauge,
    address rewardToken,
    uint256 amount,
    uint256 epoch
) external;
```

**调用示例**:
```javascript
async function createBribeOffer(gaugeAddress, tokenAddress, amount, targetEpoch) {
  // 1. 批准贿赂代币
  const approveHash = await walletClient.writeContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [addresses.BribeMarketplace, parseUnits(amount, 18)]
  });

  await publicClient.waitForTransactionReceipt({ hash: approveHash });

  // 2. 创建贿赂
  const createHash = await walletClient.writeContract({
    address: addresses.BribeMarketplace,
    abi: bribeABI,
    functionName: 'createBribe',
    args: [gaugeAddress, tokenAddress, parseUnits(amount, 18), targetEpoch]
  });

  console.log(`✅ 贿赂已创建: ${amount} tokens for Epoch ${targetEpoch}`);

  return createHash;
}

// 示例: 为 USDC-USDP Gauge 创建 1000 USDC 贿赂
await createBribeOffer(
  addresses.USDC_USDP_Gauge,
  addresses.USDC,
  '1000',
  15 // Epoch 15
);
```

**事件**:
```solidity
event BribeCreated(
    uint256 indexed bribeId,
    address indexed gauge,
    address indexed rewardToken,
    uint256 amount,
    uint256 epoch
);
```

---

#### 4.2.2 claimBribe - 领取贿赂

```solidity
/**
 * @notice 领取已投票 Gauge 的贿赂奖励
 * @param bribeId 贿赂 ID
 */
function claimBribe(uint256 bribeId) external;
```

**调用示例**:
```javascript
async function claimBribeRewards(bribeId) {
  // 1. 查询可领取数量
  const claimable = await publicClient.readContract({
    address: addresses.BribeMarketplace,
    abi: bribeABI,
    functionName: 'claimableAmount',
    args: [bribeId, walletClient.account.address]
  });

  console.log(`💰 可领取贿赂: ${formatUnits(claimable, 18)}`);

  // 2. 领取
  const claimHash = await walletClient.writeContract({
    address: addresses.BribeMarketplace,
    abi: bribeABI,
    functionName: 'claimBribe',
    args: [bribeId]
  });

  return claimHash;
}
```

---

## 5. 集成示例：完整激励流程

```javascript
/**
 * 完整流程: Boost 质押 → LP 挖矿 → 领取奖励 → Nitro 加速
 */
async function fullIncentiveJourney() {
  // Step 1: 质押 PAIMON 获取 Boost
  console.log('Step 1: 质押 PAIMON...');
  await stakeForBoost('1000', 52); // 1000 PAIMON, 52 周
  const { boost } = await getUserBoost(walletClient.account.address);
  console.log(`✅ Boost 倍数: ${boost.toFixed(2)}x`);

  // Step 2: LP 挖矿（假设已有 LP token）
  console.log('Step 2: 质押 LP token...');
  // await stakeToGauge(pairAddress, lpAmount);

  // Step 3: 查询待领取奖励
  console.log('Step 3: 查询奖励...');
  const epochs = [10, 11, 12];
  await checkClaimStatus(walletClient.account.address, 10, 12);

  // Step 4: 批量领取奖励
  console.log('Step 4: 领取奖励...');
  await claimMultipleEpochs(epochs);

  // Step 5: Nitro Pool 加速
  console.log('Step 5: 参与 Nitro Pool...');
  await depositToNitro(pairAddress, '100');

  // Step 6: 领取 Bribe（如果已投票）
  console.log('Step 6: 领取 Bribe...');
  // await claimBribeRewards(bribeId);

  console.log('✅ 完整激励流程执行完毕');
}
```

---

**下一步**: [Launchpad 模块 API](./launchpad-api.md) - ProjectRegistry, IssuanceController
