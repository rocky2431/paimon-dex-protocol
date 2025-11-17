# Treasury 模块 API 规范

**模块**: Treasury (Treasury, RWAPriceOracle)
**版本**: v1.0
**最后更新**: 2025-11-17

---

## 📋 合约列表

| 合约名称 | 地址 | 用途 |
|---------|------|------|
| **Treasury** | `addresses.Treasury` | RWA 抵押品金库 |
| **RWAPriceOracle** | `addresses.RWAPriceOracle` | RWA 资产价格预言机 |

---

## 1. Treasury (RWA 金库)

### 1.1 合约概述

Treasury 管理 RWA 抵押品，支持多种资产分级和动态健康因子计算。

**核心特性**:
- ✅ 多抵押品支持（T1/T2/T3）
- ✅ 动态 LTV 比率（T1=80%, T2=65%, T3=50%）
- ✅ 加权健康因子计算
- ✅ 清算保护（HF < 1.15 触发）

### 1.2 核心函数

#### 1.2.1 depositCollateral - 存入抵押品

```solidity
/**
 * @notice 存入 RWA 抵押品
 * @param collateralToken RWA token 地址（如 pUST125）
 * @param amount 抵押品数量（18 decimals）
 */
function depositCollateral(address collateralToken, uint256 amount) external;
```

**调用示例**:
```javascript
async function depositRWACollateral(rwaTokenAddress, amount) {
  // 1. 查询抵押品信息
  const collateralInfo = await publicClient.readContract({
    address: addresses.Treasury,
    abi: treasuryABI,
    functionName: 'collateralTypes',
    args: [rwaTokenAddress]
  });

  if (!collateralInfo.isSupported) {
    throw new Error('❌ 不支持的抵押品类型');
  }

  console.log(`📊 抵押品信息:`);
  console.log(`  资产: ${rwaTokenAddress}`);
  console.log(`  分级: T${collateralInfo.tier + 1}`);
  console.log(`  LTV: ${Number(collateralInfo.ltvRatio) / 100}%`);

  // 2. 批准 RWA token
  const approveHash = await walletClient.writeContract({
    address: rwaTokenAddress,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [addresses.Treasury, parseUnits(amount, 18)]
  });

  await publicClient.waitForTransactionReceipt({ hash: approveHash });

  // 3. 存入抵押品
  const depositHash = await walletClient.writeContract({
    address: addresses.Treasury,
    abi: treasuryABI,
    functionName: 'depositCollateral',
    args: [rwaTokenAddress, parseUnits(amount, 18)]
  });

  console.log(`✅ 抵押品已存入: ${amount} tokens`);

  return depositHash;
}

// 示例: 存入 1000 pUST125 (T1 美债 token)
await depositRWACollateral(addresses.pUST125, '1000');
```

**事件**:
```solidity
event CollateralDeposited(
    address indexed user,
    address indexed collateralToken,
    uint256 amount,
    uint256 newHealthFactor
);
```

**可能的错误**:
```solidity
error UnsupportedCollateralType(address asset);  // 不支持的抵押品
error ZeroAmount();                               // 存入数量为 0
error OraclePriceStale(address oracle);           // 预言机价格过期
```

---

#### 1.2.2 mintUSDP - 铸造 USDP

```solidity
/**
 * @notice 基于抵押品铸造 USDP
 * @param amount USDP 铸造数量（18 decimals）
 */
function mintUSDP(uint256 amount) external;
```

**调用示例**:
```javascript
async function mintUSDPFromCollateral(usdpAmount) {
  // 1. 查询当前健康因子
  const currentHF = await publicClient.readContract({
    address: addresses.Treasury,
    abi: treasuryABI,
    functionName: 'getHealthFactor',
    args: [walletClient.account.address]
  });

  console.log(`📊 当前健康因子: ${formatUnits(currentHF, 18)}`);

  // 2. 模拟铸造后的健康因子
  const afterHF = await publicClient.readContract({
    address: addresses.Treasury,
    abi: treasuryABI,
    functionName: 'simulateHealthFactor',
    args: [
      walletClient.account.address,
      0, // 不增加抵押品
      parseUnits(usdpAmount, 18) // 增加债务
    ]
  });

  console.log(`📉 铸造后健康因子: ${formatUnits(afterHF, 18)}`);

  const MIN_SAFE_HF = parseUnits('1.5', 18);
  if (afterHF < MIN_SAFE_HF) {
    console.warn(`⚠️ 健康因子将低于安全线 (1.5)，建议减少铸造数量`);
  }

  const LIQUIDATION_HF = parseUnits('1.15', 18);
  if (afterHF < LIQUIDATION_HF) {
    throw new Error(`❌ 健康因子将低于清算线 (1.15)，无法铸造`);
  }

  // 3. 铸造 USDP
  const mintHash = await walletClient.writeContract({
    address: addresses.Treasury,
    abi: treasuryABI,
    functionName: 'mintUSDP',
    args: [parseUnits(usdpAmount, 18)]
  });

  console.log(`✅ 已铸造 ${usdpAmount} USDP`);

  return mintHash;
}

// 示例: 铸造 500 USDP
await mintUSDPFromCollateral('500');
```

**健康因子计算公式**:
```
HF = Σ(抵押品价值_i × LTV_i) / 总债务

其中:
- 抵押品价值_i = 数量 × Oracle价格
- LTV_i = 抵押率（T1=80%, T2=65%, T3=50%）
- HF < 1.15 触发清算
```

**事件**:
```solidity
event USDPMinted(
    address indexed user,
    uint256 amount,
    uint256 totalDebt,
    uint256 newHealthFactor
);
```

**可能的错误**:
```solidity
error InsufficientCollateral(uint256 healthFactor);  // 抵押品不足
error ExceedsDebtCeiling(uint256 amount, uint256 ceiling);
```

---

#### 1.2.3 burnUSDP - 偿还 USDP

```solidity
/**
 * @notice 偿还 USDP，减少债务
 * @param amount USDP 偿还数量（18 decimals）
 */
function burnUSDP(uint256 amount) external;
```

**调用示例**:
```javascript
async function repayUSDPDebt(amount) {
  // 1. 查询当前债务
  const debt = await publicClient.readContract({
    address: addresses.Treasury,
    abi: treasuryABI,
    functionName: 'getUserDebt',
    args: [walletClient.account.address]
  });

  console.log(`💳 当前债务: ${formatUnits(debt, 18)} USDP`);

  if (parseUnits(amount, 18) > debt) {
    console.warn(`⚠️ 偿还数量超过债务，将偿还全部债务: ${formatUnits(debt, 18)} USDP`);
  }

  // 2. 批准 USDP
  const approveHash = await walletClient.writeContract({
    address: addresses.USDP,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [addresses.Treasury, parseUnits(amount, 18)]
  });

  await publicClient.waitForTransactionReceipt({ hash: approveHash });

  // 3. 偿还债务
  const burnHash = await walletClient.writeContract({
    address: addresses.Treasury,
    abi: treasuryABI,
    functionName: 'burnUSDP',
    args: [parseUnits(amount, 18)]
  });

  console.log(`✅ 已偿还 ${amount} USDP`);

  return burnHash;
}
```

**事件**:
```solidity
event USDPBurned(
    address indexed user,
    uint256 amount,
    uint256 remainingDebt,
    uint256 newHealthFactor
);
```

---

#### 1.2.4 withdrawCollateral - 提取抵押品

```solidity
/**
 * @notice 提取抵押品（需保持健康因子 > 1.15）
 * @param collateralToken RWA token 地址
 * @param amount 提取数量
 */
function withdrawCollateral(address collateralToken, uint256 amount) external;
```

**调用示例**:
```javascript
async function withdrawRWACollateral(rwaTokenAddress, amount) {
  // 1. 查询当前健康因子
  const currentHF = await publicClient.readContract({
    address: addresses.Treasury,
    abi: treasuryABI,
    functionName: 'getHealthFactor',
    args: [walletClient.account.address]
  });

  // 2. 模拟提取后的健康因子
  const afterHF = await publicClient.readContract({
    address: addresses.Treasury,
    abi: treasuryABI,
    functionName: 'simulateHealthFactor',
    args: [
      walletClient.account.address,
      -parseUnits(amount, 18), // 减少抵押品
      0 // 不增加债务
    ]
  });

  const LIQUIDATION_HF = parseUnits('1.15', 18);
  if (afterHF < LIQUIDATION_HF) {
    throw new Error(`❌ 提取后健康因子将低于 1.15，无法提取。请先偿还债务。`);
  }

  console.log(`📊 提取后健康因子: ${formatUnits(afterHF, 18)}`);

  // 3. 提取抵押品
  const withdrawHash = await walletClient.writeContract({
    address: addresses.Treasury,
    abi: treasuryABI,
    functionName: 'withdrawCollateral',
    args: [rwaTokenAddress, parseUnits(amount, 18)]
  });

  return withdrawHash;
}
```

**事件**:
```solidity
event CollateralWithdrawn(
    address indexed user,
    address indexed collateralToken,
    uint256 amount,
    uint256 newHealthFactor
);
```

**可能的错误**:
```solidity
error InsufficientCollateral(uint256 healthFactor);  // 提取后 HF 过低
error InsufficientBalance(uint256 requested, uint256 available);
```

---

#### 1.2.5 getHealthFactor - 查询健康因子

```solidity
/**
 * @notice 查询用户的健康因子
 * @param user 用户地址
 * @return healthFactor 健康因子（18 decimals）
 */
function getHealthFactor(address user) external view returns (uint256 healthFactor);
```

**调用示例**:
```javascript
async function monitorHealthFactor(userAddress) {
  const hf = await publicClient.readContract({
    address: addresses.Treasury,
    abi: treasuryABI,
    functionName: 'getHealthFactor',
    args: [userAddress]
  });

  const healthFactor = Number(formatUnits(hf, 18));

  console.log(`📊 健康因子: ${healthFactor.toFixed(3)}`);

  if (healthFactor < 1.15) {
    console.error(`🚨 清算风险！健康因子 < 1.15`);
    console.error(`👉 请立即增加抵押品或偿还债务`);
  } else if (healthFactor < 1.5) {
    console.warn(`⚠️ 健康因子偏低，建议优化仓位`);
  } else if (healthFactor < 2.0) {
    console.log(`✅ 健康因子正常`);
  } else {
    console.log(`💪 健康因子优秀，仓位安全`);
  }

  return { hf, healthFactor };
}

// 实时监控（每 5 分钟）
setInterval(async () => {
  await monitorHealthFactor(walletClient.account.address);
}, 5 * 60 * 1000);
```

---

#### 1.2.6 getUserPosition - 查询用户仓位

```solidity
/**
 * @notice 查询用户的完整仓位信息
 * @param user 用户地址
 * @return totalCollateralValue 总抵押品价值（USDC, 6 decimals）
 * @return totalDebt 总债务（USDP, 18 decimals）
 * @return healthFactor 健康因子（18 decimals）
 */
function getUserPosition(address user) external view returns (
    uint256 totalCollateralValue,
    uint256 totalDebt,
    uint256 healthFactor
);
```

**调用示例**:
```javascript
async function getUserPositionDetails(userAddress) {
  const position = await publicClient.readContract({
    address: addresses.Treasury,
    abi: treasuryABI,
    functionName: 'getUserPosition',
    args: [userAddress]
  });

  const [collateralValue, debt, hf] = position;

  console.log(`📊 用户仓位:`);
  console.log(`  抵押品总价值: ${formatUnits(collateralValue, 6)} USDC`);
  console.log(`  债务: ${formatUnits(debt, 18)} USDP`);
  console.log(`  健康因子: ${formatUnits(hf, 18)}`);

  // 计算可用铸造额度
  const utilization = Number(debt) / Number(collateralValue);
  const remainingCapacity = (Number(collateralValue) * 0.8) - Number(debt);

  console.log(`  利用率: ${(utilization * 100).toFixed(2)}%`);
  console.log(`  剩余铸造额度: ${formatUnits(remainingCapacity.toString(), 18)} USDP`);

  return { collateralValue, debt, hf, utilization, remainingCapacity };
}
```

---

### 1.3 完整 Treasury ABI

```javascript
const TREASURY_ABI = [
  // Read functions
  {
    name: 'collateralTypes',
    type: 'function',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'isSupported', type: 'bool' },
          { name: 'tier', type: 'uint8' },
          { name: 'ltvRatio', type: 'uint256' }
        ]
      }
    ],
    stateMutability: 'view'
  },
  {
    name: 'getHealthFactor',
    type: 'function',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: 'healthFactor', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'getUserPosition',
    type: 'function',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'totalCollateralValue', type: 'uint256' },
      { name: 'totalDebt', type: 'uint256' },
      { name: 'healthFactor', type: 'uint256' }
    ],
    stateMutability: 'view'
  },
  {
    name: 'getUserDebt',
    type: 'function',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: 'debt', type: 'uint256' }],
    stateMutability: 'view'
  },

  // Write functions
  {
    name: 'depositCollateral',
    type: 'function',
    inputs: [
      { name: 'collateralToken', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'withdrawCollateral',
    type: 'function',
    inputs: [
      { name: 'collateralToken', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'mintUSDP',
    type: 'function',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'burnUSDP',
    type: 'function',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },

  // Events
  {
    name: 'CollateralDeposited',
    type: 'event',
    inputs: [
      { indexed: true, name: 'user', type: 'address' },
      { indexed: true, name: 'collateralToken', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'newHealthFactor', type: 'uint256' }
    ]
  },
  {
    name: 'CollateralWithdrawn',
    type: 'event',
    inputs: [
      { indexed: true, name: 'user', type: 'address' },
      { indexed: true, name: 'collateralToken', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'newHealthFactor', type: 'uint256' }
    ]
  },
  {
    name: 'USDPMinted',
    type: 'event',
    inputs: [
      { indexed: true, name: 'user', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'totalDebt', type: 'uint256' },
      { indexed: false, name: 'newHealthFactor', type: 'uint256' }
    ]
  },
  {
    name: 'USDPBurned',
    type: 'event',
    inputs: [
      { indexed: true, name: 'user', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'remainingDebt', type: 'uint256' },
      { indexed: false, name: 'newHealthFactor', type: 'uint256' }
    ]
  }
];
```

---

## 2. RWAPriceOracle (价格预言机)

### 2.1 合约概述

RWAPriceOracle 提供 RWA 资产的实时定价，结合 Chainlink 和 NAV 数据。

**核心特性**:
- ✅ 双重数据源（Chainlink + NAV API）
- ✅ 20% 偏差熔断机制
- ✅ 价格过期检测（24 小时）
- ✅ Fallback 机制

### 2.2 核心函数

#### 2.2.1 getPrice - 查询价格

```solidity
/**
 * @notice 查询 RWA 资产价格（6 decimals USDC）
 * @param asset RWA token 地址
 * @return price 价格（USDC, 6 decimals）
 */
function getPrice(address asset) external view returns (uint256 price);
```

**调用示例**:
```javascript
async function getRWAPrice(assetAddress) {
  const price = await publicClient.readContract({
    address: addresses.RWAPriceOracle,
    abi: oracleABI,
    functionName: 'getPrice',
    args: [assetAddress]
  });

  console.log(`💵 ${assetAddress} 价格: ${formatUnits(price, 6)} USDC`);

  return price;
}

// 示例: 查询 pUST125 价格
const price = await getRWAPrice(addresses.pUST125);
// 预期输出: ~1.012 USDC (含累计利息)
```

---

#### 2.2.2 getPriceWithTimestamp - 带时间戳查询

```solidity
/**
 * @notice 查询价格及更新时间戳
 * @param asset RWA token 地址
 * @return price 价格（6 decimals）
 * @return timestamp 价格更新时间戳
 */
function getPriceWithTimestamp(address asset) external view returns (
    uint256 price,
    uint256 timestamp
);
```

**调用示例**:
```javascript
async function getRWAPriceWithStaleness(assetAddress) {
  const result = await publicClient.readContract({
    address: addresses.RWAPriceOracle,
    abi: oracleABI,
    functionName: 'getPriceWithTimestamp',
    args: [assetAddress]
  });

  const [price, timestamp] = result;
  const now = Math.floor(Date.now() / 1000);
  const ageInSeconds = now - Number(timestamp);
  const ageInHours = ageInSeconds / 3600;

  console.log(`💵 价格: ${formatUnits(price, 6)} USDC`);
  console.log(`🕐 更新时间: ${new Date(Number(timestamp) * 1000).toLocaleString()}`);
  console.log(`⏱️ 数据年龄: ${ageInHours.toFixed(1)} 小时`);

  if (ageInHours > 24) {
    console.warn(`⚠️ 价格数据过期 (>${24}h)，请谨慎使用`);
  }

  return { price, timestamp, ageInHours };
}
```

---

#### 2.2.3 updatePrice - 更新价格（仅 Oracle）

```solidity
/**
 * @notice 更新 RWA 资产价格（仅 Oracle 角色）
 * @param asset RWA token 地址
 * @param price 新价格（6 decimals）
 */
function updatePrice(address asset, uint256 price) external onlyOracle;
```

**调用示例（后端 Oracle 服务）**:
```javascript
// 后端定时任务（每小时）
async function oracleUpdatePrice() {
  // 1. 从 NAV API 获取最新价格
  const navResponse = await fetch('https://api.custodian.com/nav/pUST125');
  const navData = await navResponse.json();
  const navPrice = parseUnits(navData.price, 6);

  // 2. 从 Chainlink 获取参考价格
  const chainlinkPrice = await publicClient.readContract({
    address: CHAINLINK_FEED,
    abi: CHAINLINK_ABI,
    functionName: 'latestAnswer'
  });

  // 3. 验证偏差 < 20%
  const deviation = Math.abs(Number(navPrice) - Number(chainlinkPrice)) / Number(chainlinkPrice);
  if (deviation > 0.2) {
    console.error(`❌ 价格偏差过大: ${(deviation * 100).toFixed(2)}%`);
    return; // 熔断
  }

  // 4. 更新价格
  const updateHash = await walletClient.writeContract({
    address: addresses.RWAPriceOracle,
    abi: oracleABI,
    functionName: 'updatePrice',
    args: [addresses.pUST125, navPrice]
  });

  console.log(`✅ 价格已更新: ${formatUnits(navPrice, 6)} USDC`);
}

// 每小时执行
setInterval(oracleUpdatePrice, 3600 * 1000);
```

**事件**:
```solidity
event PriceUpdated(
    address indexed asset,
    uint256 oldPrice,
    uint256 newPrice,
    uint256 timestamp
);
```

---

### 2.3 完整 RWAPriceOracle ABI

```javascript
const RWA_PRICE_ORACLE_ABI = [
  // Read functions
  {
    name: 'getPrice',
    type: 'function',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [{ name: 'price', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'getPriceWithTimestamp',
    type: 'function',
    inputs: [{ name: 'asset', type: 'address' }],
    outputs: [
      { name: 'price', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' }
    ],
    stateMutability: 'view'
  },

  // Write functions
  {
    name: 'updatePrice',
    type: 'function',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'price', type: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },

  // Events
  {
    name: 'PriceUpdated',
    type: 'event',
    inputs: [
      { indexed: true, name: 'asset', type: 'address' },
      { indexed: false, name: 'oldPrice', type: 'uint256' },
      { indexed: false, name: 'newPrice', type: 'uint256' },
      { indexed: false, name: 'timestamp', type: 'uint256' }
    ]
  },
  {
    name: 'PriceDeviationDetected',
    type: 'event',
    inputs: [
      { indexed: true, name: 'asset', type: 'address' },
      { indexed: false, name: 'chainlinkPrice', type: 'uint256' },
      { indexed: false, name: 'navPrice', type: 'uint256' },
      { indexed: false, name: 'deviationPercent', type: 'uint256' }
    ]
  }
];
```

---

## 3. 集成示例：完整 Treasury 流程

```javascript
/**
 * 完整流程: 存入 RWA → 铸造 USDP → 监控健康因子 → 偿还债务 → 提取抵押品
 */
async function fullTreasuryJourney() {
  const userAddress = walletClient.account.address;

  // Step 1: 存入 RWA 抵押品
  console.log('Step 1: 存入 RWA 抵押品...');
  await depositRWACollateral(addresses.pUST125, '1000');

  // Step 2: 查询可铸造额度
  console.log('\nStep 2: 查询仓位...');
  const position = await getUserPositionDetails(userAddress);
  console.log(`可铸造 USDP: ${formatUnits(position.remainingCapacity.toString(), 18)}`);

  // Step 3: 铸造 USDP（保守策略: 利用率 60%）
  console.log('\nStep 3: 铸造 USDP...');
  const mintAmount = position.remainingCapacity * 0.6;
  await mintUSDPFromCollateral(formatUnits(mintAmount.toString(), 18));

  // Step 4: 实时监控健康因子
  console.log('\nStep 4: 监控健康因子...');
  setInterval(async () => {
    const { healthFactor } = await monitorHealthFactor(userAddress);

    // 自动补仓策略
    if (healthFactor < 1.5) {
      console.log('🤖 触发自动补仓...');
      const addCollateral = '100'; // 增加 100 pUST125
      await depositRWACollateral(addresses.pUST125, addCollateral);
    }
  }, 5 * 60 * 1000); // 每 5 分钟

  // Step 5: 偿还债务
  console.log('\nStep 5: 偿还部分债务...');
  await repayUSDPDebt('200');

  // Step 6: 提取抵押品
  console.log('\nStep 6: 提取抵押品...');
  await withdrawRWACollateral(addresses.pUST125, '100');

  console.log('\n✅ 完整 Treasury 流程执行完毕');
}
```

---

## 4. 风险管理最佳实践

### 4.1 健康因子监控

```javascript
// 推荐监控频率
const MONITORING_INTERVALS = {
  CRITICAL: 1 * 60 * 1000,   // 1 分钟（HF < 1.3）
  WARNING: 5 * 60 * 1000,    // 5 分钟（HF 1.3-1.5）
  NORMAL: 30 * 60 * 1000     // 30 分钟（HF > 1.5）
};

async function adaptiveMonitoring(userAddress) {
  const { healthFactor } = await monitorHealthFactor(userAddress);

  let interval;
  if (healthFactor < 1.3) {
    interval = MONITORING_INTERVALS.CRITICAL;
    console.warn('🚨 启用高频监控（1分钟）');
  } else if (healthFactor < 1.5) {
    interval = MONITORING_INTERVALS.WARNING;
    console.log('⚠️ 启用中频监控（5分钟）');
  } else {
    interval = MONITORING_INTERVALS.NORMAL;
    console.log('✅ 正常监控（30分钟）');
  }

  setTimeout(() => adaptiveMonitoring(userAddress), interval);
}
```

### 4.2 自动止损策略

```javascript
async function autoStopLoss(userAddress, maxLossPercent = 10) {
  const position = await getUserPositionDetails(userAddress);

  // 计算当前净资产
  const netValue = Number(position.collateralValue) - Number(position.debt);
  const initialValue = netValue / (1 - maxLossPercent / 100);

  const currentLoss = ((initialValue - netValue) / initialValue) * 100;

  if (currentLoss >= maxLossPercent) {
    console.error(`🛑 触发止损！当前亏损: ${currentLoss.toFixed(2)}%`);
    console.log('执行清仓...');

    // 1. 偿还全部债务
    await repayUSDPDebt(formatUnits(position.debt, 18));

    // 2. 提取全部抵押品
    // await withdrawAll();

    console.log('✅ 止损完成');
  }
}
```

---

**恭喜！** 您已完成所有 6 个核心模块的 API 文档。

**下一步**: 继续创建专题指南（事件监听、错误处理、Gas 优化、安全集成）
