# 稳定币模块 API 规范

**模块**: Stablecoin (USDP, PSM, Vault, SavingRate)
**版本**: v1.0
**最后更新**: 2025-11-17

---

## 📋 合约列表

| 合约名称 | 地址 | 用途 |
|---------|------|------|
| **USDP** | `addresses.USDP` | USDP 稳定币（ERC20, 18 decimals） |
| **PSMParameterized** | `addresses.PSM` | USDC ↔ USDP 1:1 兑换（零滑点） |
| **USDPVault** | `addresses.USDPVault` | USDP 铸造/销毁（RWA 抵押） |
| **USDPSavingRate** | `addresses.USDPSavingRate` | USDP 储蓄收益（ERC4626 Vault） |
| **USDPStabilityPool** | `addresses.USDPStabilityPool` | 清算缓冲池 |

---

## 1. PSMParameterized (Peg Stability Module)

### 1.1 合约概述

PSM 提供 USDC 和 USDP 之间的 1:1 零滑点兑换，支持 6-decimal 和 18-decimal USDC。

**核心特性**:
- ✅ 1:1 兑换比例（无需价格预言机）
- ✅ 自动小数位转换（6 ↔ 18）
- ✅ 零手续费（治理可配置）
- ✅ 储备池透明可查

### 1.2 状态变量

```solidity
contract PSMParameterized {
    // 核心代币
    IERC20Metadata public immutable usdc;        // USDC 合约地址
    IUSDP public immutable usdp;                 // USDP 合约地址
    uint8 public immutable usdcDecimals;         // USDC 小数位（6 或 18）
    uint256 private immutable scale;             // 小数位转换系数

    // 兑换限制
    uint256 public swapFee;                      // 兑换费率（basis points）
    uint256 public dailySwapLimit;               // 每日兑换限额
    mapping(uint256 => uint256) public dailySwapVolume; // 每日已兑换量（按天计）

    // 暂停控制
    bool public isPaused;                        // 紧急暂停开关
}
```

### 1.3 核心函数

#### 1.3.1 swapUSDCForUSDP - USDC → USDP

```solidity
/**
 * @notice 将 USDC 兑换为 USDP（1:1 比例，自动处理小数位）
 * @param usdcAmount USDC 数量（6 或 18 decimals，取决于 USDC 合约）
 * @return usdpAmount 兑换得到的 USDP 数量（18 decimals）
 */
function swapUSDCForUSDP(uint256 usdcAmount) external returns (uint256 usdpAmount);
```

**调用示例**:
```javascript
import { parseUnits, formatUnits } from 'viem';

async function swapUSDCtoUSDP(amount) {
  // 1. 查询 USDC 小数位
  const usdcDecimals = await publicClient.readContract({
    address: addresses.USDC,
    abi: ERC20_ABI,
    functionName: 'decimals'
  });

  // 2. 批准 USDC
  const approveHash = await walletClient.writeContract({
    address: addresses.USDC,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [addresses.PSM, parseUnits(amount, usdcDecimals)]
  });

  await publicClient.waitForTransactionReceipt({ hash: approveHash });

  // 3. 执行兑换
  const { result } = await publicClient.simulateContract({
    address: addresses.PSM,
    abi: psmABI,
    functionName: 'swapUSDCForUSDP',
    args: [parseUnits(amount, usdcDecimals)]
  });

  console.log(`预计收到: ${formatUnits(result, 18)} USDP`);

  const swapHash = await walletClient.writeContract({
    address: addresses.PSM,
    abi: psmABI,
    functionName: 'swapUSDCForUSDP',
    args: [parseUnits(amount, usdcDecimals)]
  });

  return swapHash;
}

// 使用
await swapUSDCtoUSDP('1000'); // 兑换 1000 USDC → ~1000 USDP
```

**事件**:
```solidity
event SwapUSDCForUSDP(
    address indexed user,
    uint256 usdcIn,   // USDC 输入量（原始小数位）
    uint256 usdpOut   // USDP 输出量（18 decimals）
);
```

**可能的错误**:
```solidity
error ZeroAmount();                                    // 兑换数量为 0
error InsufficientUSDCInReserve(uint256 requested, uint256 available); // PSM 储备不足
error ExceedsSwapLimit(uint256 amount, uint256 limit); // 超出每日限额
error Paused();                                        // PSM 已暂停
```

---

#### 1.3.2 swapUSDPForUSDC - USDP → USDC

```solidity
/**
 * @notice 将 USDP 兑换回 USDC（1:1 比例，自动处理小数位）
 * @param usdpAmount USDP 数量（18 decimals）
 * @return usdcAmount 兑换得到的 USDC 数量（6 或 18 decimals）
 */
function swapUSDPForUSDC(uint256 usdpAmount) external returns (uint256 usdcAmount);
```

**调用示例**:
```javascript
async function swapUSDPtoUSDC(amount) {
  // 1. 批准 USDP
  const approveHash = await walletClient.writeContract({
    address: addresses.USDP,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [addresses.PSM, parseUnits(amount, 18)]
  });

  await publicClient.waitForTransactionReceipt({ hash: approveHash });

  // 2. 执行兑换
  const swapHash = await walletClient.writeContract({
    address: addresses.PSM,
    abi: psmABI,
    functionName: 'swapUSDPForUSDC',
    args: [parseUnits(amount, 18)]
  });

  return swapHash;
}
```

**事件**:
```solidity
event SwapUSDPForUSDC(
    address indexed user,
    uint256 usdpIn,   // USDP 输入量（18 decimals）
    uint256 usdcOut   // USDC 输出量（原始小数位）
);
```

---

#### 1.3.3 getReserves - 查询储备

```solidity
/**
 * @notice 查询 PSM 当前的 USDC 储备量
 * @return usdcReserve USDC 储备（原始小数位）
 * @return usdpSupply USDP 总供应量（18 decimals）
 */
function getReserves() external view returns (uint256 usdcReserve, uint256 usdpSupply);
```

**调用示例**:
```javascript
async function checkPSMHealth() {
  const { result } = await publicClient.readContract({
    address: addresses.PSM,
    abi: psmABI,
    functionName: 'getReserves'
  });

  const [usdcReserve, usdpSupply] = result;
  const usdcDecimals = await publicClient.readContract({
    address: addresses.USDC,
    abi: ERC20_ABI,
    functionName: 'decimals'
  });

  const reserveRatio = formatUnits(usdcReserve, usdcDecimals) / formatUnits(usdpSupply, 18);

  console.log(`储备率: ${(reserveRatio * 100).toFixed(2)}%`);
  console.log(`USDC 储备: ${formatUnits(usdcReserve, usdcDecimals)}`);
  console.log(`USDP 供应: ${formatUnits(usdpSupply, 18)}`);

  if (reserveRatio < 1.0) {
    console.warn('⚠️ 储备不足，建议谨慎兑换');
  }

  return { usdcReserve, usdpSupply, reserveRatio };
}
```

---

### 1.4 完整 PSM ABI

```javascript
const PSM_ABI = [
  // Read functions
  {
    name: 'usdc',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view'
  },
  {
    name: 'usdp',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view'
  },
  {
    name: 'usdcDecimals',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view'
  },
  {
    name: 'getReserves',
    type: 'function',
    inputs: [],
    outputs: [
      { name: 'usdcReserve', type: 'uint256' },
      { name: 'usdpSupply', type: 'uint256' }
    ],
    stateMutability: 'view'
  },
  {
    name: 'swapFee',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'isPaused',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view'
  },

  // Write functions
  {
    name: 'swapUSDCForUSDP',
    type: 'function',
    inputs: [{ name: 'usdcAmount', type: 'uint256' }],
    outputs: [{ name: 'usdpAmount', type: 'uint256' }],
    stateMutability: 'nonpayable'
  },
  {
    name: 'swapUSDPForUSDC',
    type: 'function',
    inputs: [{ name: 'usdpAmount', type: 'uint256' }],
    outputs: [{ name: 'usdcAmount', type: 'uint256' }],
    stateMutability: 'nonpayable'
  },

  // Events
  {
    name: 'SwapUSDCForUSDP',
    type: 'event',
    inputs: [
      { indexed: true, name: 'user', type: 'address' },
      { indexed: false, name: 'usdcIn', type: 'uint256' },
      { indexed: false, name: 'usdpOut', type: 'uint256' }
    ]
  },
  {
    name: 'SwapUSDPForUSDC',
    type: 'event',
    inputs: [
      { indexed: true, name: 'user', type: 'address' },
      { indexed: false, name: 'usdpIn', type: 'uint256' },
      { indexed: false, name: 'usdcOut', type: 'uint256' }
    ]
  },

  // Errors
  {
    name: 'ZeroAmount',
    type: 'error',
    inputs: []
  },
  {
    name: 'InsufficientUSDCInReserve',
    type: 'error',
    inputs: [
      { name: 'requested', type: 'uint256' },
      { name: 'available', type: 'uint256' }
    ]
  },
  {
    name: 'ExceedsSwapLimit',
    type: 'error',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'limit', type: 'uint256' }
    ]
  },
  {
    name: 'Paused',
    type: 'error',
    inputs: []
  }
];
```

---

## 2. USDPSavingRate (ERC4626 Vault)

### 2.1 合约概述

USDPSavingRate 是符合 ERC4626 标准的收益金库，用户存入 USDP 赚取被动收益。

**核心特性**:
- ✅ ERC4626 标准（兼容所有 DeFi 聚合器）
- ✅ 份额制会计（Share-based Accounting）
- ✅ 实时复利累积
- ✅ 无锁定期，随时提款

### 2.2 核心函数

#### 2.2.1 deposit - 存入 USDP

```solidity
/**
 * @notice 存入 USDP，铸造份额（符合 ERC4626）
 * @param assets 存入的 USDP 数量（18 decimals）
 * @param receiver 份额接收地址
 * @return shares 铸造的份额数量
 */
function deposit(uint256 assets, address receiver) external returns (uint256 shares);
```

**调用示例**:
```javascript
async function depositToSavingRate(amount) {
  // 1. 批准 USDP
  const approveHash = await walletClient.writeContract({
    address: addresses.USDP,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [addresses.USDPSavingRate, parseUnits(amount, 18)]
  });

  await publicClient.waitForTransactionReceipt({ hash: approveHash });

  // 2. 预览份额数量
  const shares = await publicClient.readContract({
    address: addresses.USDPSavingRate,
    abi: savingRateABI,
    functionName: 'previewDeposit',
    args: [parseUnits(amount, 18)]
  });

  console.log(`预计获得份额: ${formatUnits(shares, 18)}`);

  // 3. 存入
  const depositHash = await walletClient.writeContract({
    address: addresses.USDPSavingRate,
    abi: savingRateABI,
    functionName: 'deposit',
    args: [parseUnits(amount, 18), walletClient.account.address]
  });

  return depositHash;
}
```

**事件**:
```solidity
event Deposit(
    address indexed sender,
    address indexed owner,
    uint256 assets,  // USDP 数量
    uint256 shares   // 份额数量
);
```

---

#### 2.2.2 withdraw - 提取 USDP

```solidity
/**
 * @notice 提取 USDP，销毁份额（符合 ERC4626）
 * @param assets 提取的 USDP 数量（18 decimals）
 * @param receiver USDP 接收地址
 * @param owner 份额持有者地址
 * @return shares 销毁的份额数量
 */
function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);
```

**调用示例**:
```javascript
async function withdrawFromSavingRate(amount) {
  // 1. 检查可提取余额
  const maxWithdraw = await publicClient.readContract({
    address: addresses.USDPSavingRate,
    abi: savingRateABI,
    functionName: 'maxWithdraw',
    args: [walletClient.account.address]
  });

  if (parseUnits(amount, 18) > maxWithdraw) {
    throw new Error(`可提取余额不足: ${formatUnits(maxWithdraw, 18)} USDP`);
  }

  // 2. 提取
  const withdrawHash = await walletClient.writeContract({
    address: addresses.USDPSavingRate,
    abi: savingRateABI,
    functionName: 'withdraw',
    args: [
      parseUnits(amount, 18),
      walletClient.account.address,
      walletClient.account.address
    ]
  });

  return withdrawHash;
}
```

**事件**:
```solidity
event Withdraw(
    address indexed sender,
    address indexed receiver,
    address indexed owner,
    uint256 assets,  // USDP 数量
    uint256 shares   // 份额数量
);
```

---

#### 2.2.3 totalAssets - 查询总资产

```solidity
/**
 * @notice 查询金库管理的总 USDP 资产（包括未分配收益）
 * @return Total USDP assets (18 decimals)
 */
function totalAssets() external view returns (uint256);
```

**调用示例**:
```javascript
async function getSavingRateAPR() {
  // 1. 查询总资产和总份额
  const [totalAssets, totalSupply] = await Promise.all([
    publicClient.readContract({
      address: addresses.USDPSavingRate,
      abi: savingRateABI,
      functionName: 'totalAssets'
    }),
    publicClient.readContract({
      address: addresses.USDPSavingRate,
      abi: ERC20_ABI,
      functionName: 'totalSupply'
    })
  ]);

  // 2. 计算每份额价值
  const pricePerShare = Number(totalAssets) / Number(totalSupply);

  // 3. 对比 24 小时前数据计算 APR（需要历史数据）
  const pricePerShareYesterday = 1.0; // 从链下数据库或 The Graph 读取
  const dailyReturn = (pricePerShare / pricePerShareYesterday) - 1;
  const apr = dailyReturn * 365 * 100;

  console.log(`当前 APR: ${apr.toFixed(2)}%`);
  console.log(`每份额价值: ${pricePerShare.toFixed(6)} USDP`);

  return { apr, pricePerShare, totalAssets, totalSupply };
}
```

---

#### 2.2.4 convertToAssets - 份额转资产

```solidity
/**
 * @notice 将份额数量转换为 USDP 资产数量（实时汇率）
 * @param shares 份额数量
 * @return assets 对应的 USDP 数量
 */
function convertToAssets(uint256 shares) external view returns (uint256 assets);
```

**调用示例**:
```javascript
async function getUserBalance(userAddress) {
  // 1. 查询用户份额
  const shares = await publicClient.readContract({
    address: addresses.USDPSavingRate,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [userAddress]
  });

  // 2. 转换为 USDP
  const assets = await publicClient.readContract({
    address: addresses.USDPSavingRate,
    abi: savingRateABI,
    functionName: 'convertToAssets',
    args: [shares]
  });

  console.log(`份额: ${formatUnits(shares, 18)}`);
  console.log(`价值: ${formatUnits(assets, 18)} USDP`);

  return { shares, assets };
}
```

---

### 2.3 完整 SavingRate ABI

```javascript
const SAVING_RATE_ABI = [
  // ERC4626 标准函数
  {
    name: 'asset',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view'
  },
  {
    name: 'totalAssets',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'convertToShares',
    type: 'function',
    inputs: [{ name: 'assets', type: 'uint256' }],
    outputs: [{ name: 'shares', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'convertToAssets',
    type: 'function',
    inputs: [{ name: 'shares', type: 'uint256' }],
    outputs: [{ name: 'assets', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'maxDeposit',
    type: 'function',
    inputs: [{ name: 'receiver', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'maxWithdraw',
    type: 'function',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'previewDeposit',
    type: 'function',
    inputs: [{ name: 'assets', type: 'uint256' }],
    outputs: [{ name: 'shares', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'previewWithdraw',
    type: 'function',
    inputs: [{ name: 'assets', type: 'uint256' }],
    outputs: [{ name: 'shares', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'deposit',
    type: 'function',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' }
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
    stateMutability: 'nonpayable'
  },
  {
    name: 'withdraw',
    type: 'function',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'owner', type: 'address' }
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
    stateMutability: 'nonpayable'
  },

  // ERC4626 事件
  {
    name: 'Deposit',
    type: 'event',
    inputs: [
      { indexed: true, name: 'sender', type: 'address' },
      { indexed: true, name: 'owner', type: 'address' },
      { indexed: false, name: 'assets', type: 'uint256' },
      { indexed: false, name: 'shares', type: 'uint256' }
    ]
  },
  {
    name: 'Withdraw',
    type: 'event',
    inputs: [
      { indexed: true, name: 'sender', type: 'address' },
      { indexed: true, name: 'receiver', type: 'address' },
      { indexed: true, name: 'owner', type: 'address' },
      { indexed: false, name: 'assets', type: 'uint256' },
      { indexed: false, name: 'shares', type: 'uint256' }
    ]
  }
];
```

---

## 3. USDPVault (RWA Collateral Vault)

### 3.1 合约概述

USDPVault 允许用户抵押 RWA 资产铸造 USDP，支持多种抵押品类型。

**核心特性**:
- ✅ 多抵押品支持（T1/T2/T3 资产）
- ✅ 动态健康因子（加权计算）
- ✅ 清算保护（健康因子 < 1.15 触发）
- ✅ Chainlink + NAV 双重喂价

### 3.2 核心函数

#### 3.2.1 depositCollateral - 存入抵押品

```solidity
/**
 * @notice 存入 RWA 抵押品
 * @param collateralToken 抵押品代币地址
 * @param amount 抵押品数量
 */
function depositCollateral(address collateralToken, uint256 amount) external;
```

**调用示例**:
```javascript
async function depositRWACollateral(tokenAddress, amount) {
  // 1. 批准抵押品
  const approveHash = await walletClient.writeContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [addresses.USDPVault, parseUnits(amount, 18)]
  });

  await publicClient.waitForTransactionReceipt({ hash: approveHash });

  // 2. 存入
  const depositHash = await walletClient.writeContract({
    address: addresses.USDPVault,
    abi: vaultABI,
    functionName: 'depositCollateral',
    args: [tokenAddress, parseUnits(amount, 18)]
  });

  return depositHash;
}
```

---

#### 3.2.2 mintUSDP - 铸造 USDP

```solidity
/**
 * @notice 基于抵押品铸造 USDP
 * @param amount 铸造的 USDP 数量
 */
function mintUSDP(uint256 amount) external;
```

**调用示例**:
```javascript
async function mintUSDPFromCollateral(amount) {
  // 1. 检查健康因子
  const healthFactor = await publicClient.readContract({
    address: addresses.USDPVault,
    abi: vaultABI,
    functionName: 'getHealthFactor',
    args: [walletClient.account.address]
  });

  console.log(`当前健康因子: ${formatUnits(healthFactor, 18)}`);

  if (healthFactor < parseUnits('1.5', 18)) {
    console.warn('⚠️ 健康因子较低，建议增加抵押品或减少铸造数量');
  }

  // 2. 铸造 USDP
  const mintHash = await walletClient.writeContract({
    address: addresses.USDPVault,
    abi: vaultABI,
    functionName: 'mintUSDP',
    args: [parseUnits(amount, 18)]
  });

  return mintHash;
}
```

---

#### 3.2.3 getHealthFactor - 查询健康因子

```solidity
/**
 * @notice 查询用户的健康因子（加权抵押价值 / 债务）
 * @param user 用户地址
 * @return healthFactor 健康因子（18 decimals, 1.0 = 100%）
 */
function getHealthFactor(address user) external view returns (uint256 healthFactor);
```

**健康因子计算公式**:
```
健康因子 = Σ(抵押品价值_i × LTV_i) / 总债务

其中:
- 抵押品价值_i = 数量 × 价格（来自 Oracle）
- LTV_i = 抵押率（T1=80%, T2=65%, T3=50%）
```

**调用示例**:
```javascript
async function monitorHealthFactor(userAddress) {
  const healthFactor = await publicClient.readContract({
    address: addresses.USDPVault,
    abi: vaultABI,
    functionName: 'getHealthFactor',
    args: [userAddress]
  });

  const hf = Number(formatUnits(healthFactor, 18));

  if (hf < 1.15) {
    console.error(`🚨 清算风险！健康因子: ${hf.toFixed(3)}`);
  } else if (hf < 1.5) {
    console.warn(`⚠️ 健康因子偏低: ${hf.toFixed(3)}`);
  } else {
    console.log(`✅ 健康因子正常: ${hf.toFixed(3)}`);
  }

  return hf;
}
```

---

## 4. 集成示例：完整 USDP 用户流程

```javascript
/**
 * 完整流程: USDC → USDP → SavingRate → 赚取收益
 */
async function fullUSDPJourney() {
  const usdcAmount = '1000'; // 1000 USDC

  // Step 1: USDC → USDP (PSM)
  console.log('Step 1: 兑换 USDC → USDP...');
  const swapHash = await swapUSDCtoUSDP(usdcAmount);
  console.log(`✅ 兑换完成: ${swapHash}`);

  // Step 2: 存入 SavingRate
  console.log('Step 2: 存入 USDP 到 SavingRate...');
  const depositHash = await depositToSavingRate(usdcAmount);
  console.log(`✅ 存入完成: ${depositHash}`);

  // Step 3: 查询当前余额和 APR
  console.log('Step 3: 查询收益率...');
  const { apr, pricePerShare } = await getSavingRateAPR();
  console.log(`📊 当前 APR: ${apr.toFixed(2)}%`);
  console.log(`💰 每份额价值: ${pricePerShare.toFixed(6)} USDP`);

  // Step 4: 持续监控收益（模拟）
  console.log('Step 4: 开始收益监控...');
  const balance = await getUserBalance(walletClient.account.address);
  console.log(`💼 当前余额: ${formatUnits(balance.assets, 18)} USDP`);

  return {
    swapHash,
    depositHash,
    apr,
    currentBalance: formatUnits(balance.assets, 18)
  };
}
```

---

## 5. 错误处理速查表

| 错误名称 | 触发条件 | 解决方案 |
|---------|---------|---------|
| `ZeroAmount` | 输入数量为 0 | 检查输入值 |
| `InsufficientUSDCInReserve` | PSM 储备不足 | 等待储备补充或降低兑换量 |
| `ExceedsSwapLimit` | 超出每日限额 | 分批兑换或次日再试 |
| `Paused` | 合约已暂停 | 等待治理解除暂停 |
| `InsufficientCollateral` | 抵押品不足 | 增加抵押品或减少铸造量 |
| `LiquidationTriggered` | 健康因子 < 1.15 | 立即补充抵押品或偿还债务 |

---

## 6. Gas 优化建议

```javascript
// ❌ 分步执行（3 次交易，~150K gas）
await approve(addresses.PSM, amount);
await swapUSDCForUSDP(amount);
await depositToSavingRate(amount);

// ✅ 使用 PSM + SavingRate 集成函数（1 次交易，~80K gas）
await swapAndDeposit(amount); // 待实现的优化函数
```

---

**下一步**: [治理模块 API](./governance-api.md) - veNFT、Gauge 投票、发行管理
