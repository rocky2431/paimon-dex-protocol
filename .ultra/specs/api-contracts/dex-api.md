# DEX 模块 API 规范

**模块**: DEX (AMM, Router, Liquidity)
**版本**: v1.0
**最后更新**: 2025-11-17

---

## 📋 合约列表

| 合约名称 | 地址 | 用途 |
|---------|------|------|
| **DEXFactory** | `addresses.DEXFactory` | AMM 工厂（创建交易对） |
| **DEXPair** | 动态地址 | 单个交易对（Constant Product AMM） |
| **DEXRouter** | `addresses.DEXRouter` | 路由器（多跳交换、流动性管理） |

---

## 1. DEXFactory (AMM 工厂)

### 1.1 合约概述

DEXFactory 负责创建和管理所有交易对合约。

**核心特性**:
- ✅ 无需许可创建交易对
- ✅ 唯一交易对保证（token0 < token1）
- ✅ 全局手续费配置（默认 0.3%）
- ✅ 交易对枚举（分页查询）

### 1.2 核心函数

#### 1.2.1 getPair - 查询交易对地址

```solidity
/**
 * @notice 查询两个代币的交易对地址
 * @param tokenA 代币 A 地址
 * @param tokenB 代币 B 地址
 * @return pair 交易对地址（不存在则返回 0x0）
 */
function getPair(address tokenA, address tokenB) external view returns (address pair);
```

**调用示例**:
```javascript
async function findPair(tokenA, tokenB) {
  const pairAddress = await publicClient.readContract({
    address: addresses.DEXFactory,
    abi: factoryABI,
    functionName: 'getPair',
    args: [tokenA, tokenB]
  });

  if (pairAddress === '0x0000000000000000000000000000000000000000') {
    console.log('⚠️ 交易对不存在');
    return null;
  }

  console.log(`✅ 交易对地址: ${pairAddress}`);
  return pairAddress;
}

// 示例: 查询 USDC-USDP 交易对
const pairAddress = await findPair(addresses.USDC, addresses.USDP);
```

---

#### 1.2.2 createPair - 创建交易对

```solidity
/**
 * @notice 创建新交易对（任何人可调用）
 * @param tokenA 代币 A 地址
 * @param tokenB 代币 B 地址
 * @return pair 新创建的交易对地址
 */
function createPair(address tokenA, address tokenB) external returns (address pair);
```

**调用示例**:
```javascript
async function createNewPair(tokenA, tokenB) {
  // 1. 检查交易对是否已存在
  const existingPair = await findPair(tokenA, tokenB);
  if (existingPair) {
    console.log('⚠️ 交易对已存在');
    return existingPair;
  }

  // 2. 创建交易对
  const { result: pairAddress } = await publicClient.simulateContract({
    address: addresses.DEXFactory,
    abi: factoryABI,
    functionName: 'createPair',
    args: [tokenA, tokenB]
  });

  const createHash = await walletClient.writeContract({
    address: addresses.DEXFactory,
    abi: factoryABI,
    functionName: 'createPair',
    args: [tokenA, tokenB]
  });

  await publicClient.waitForTransactionReceipt({ hash: createHash });

  console.log(`✅ 交易对已创建: ${pairAddress}`);
  return pairAddress;
}
```

**事件**:
```solidity
event PairCreated(
    address indexed token0,  // 字典序较小的代币
    address indexed token1,  // 字典序较大的代币
    address pair,            // 交易对地址
    uint256 allPairsLength   // 当前总交易对数量
);
```

**可能的错误**:
```solidity
error IdenticalAddresses();         // tokenA == tokenB
error ZeroAddress();                // token 地址为 0x0
error PairExists(address pair);     // 交易对已存在
```

---

#### 1.2.3 allPairsLength - 查询交易对总数

```solidity
/**
 * @notice 查询已创建的交易对总数
 * @return 交易对数量
 */
function allPairsLength() external view returns (uint256);
```

**调用示例**:
```javascript
async function getPairCount() {
  const count = await publicClient.readContract({
    address: addresses.DEXFactory,
    abi: factoryABI,
    functionName: 'allPairsLength'
  });

  console.log(`📊 总交易对数量: ${count}`);
  return Number(count);
}
```

---

### 1.3 完整 Factory ABI

```javascript
const FACTORY_ABI = [
  // Read functions
  {
    name: 'getPair',
    type: 'function',
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' }
    ],
    outputs: [{ name: 'pair', type: 'address' }],
    stateMutability: 'view'
  },
  {
    name: 'allPairs',
    type: 'function',
    inputs: [{ name: 'index', type: 'uint256' }],
    outputs: [{ name: 'pair', type: 'address' }],
    stateMutability: 'view'
  },
  {
    name: 'allPairsLength',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'feeTo',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view'
  },

  // Write functions
  {
    name: 'createPair',
    type: 'function',
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' }
    ],
    outputs: [{ name: 'pair', type: 'address' }],
    stateMutability: 'nonpayable'
  },

  // Events
  {
    name: 'PairCreated',
    type: 'event',
    inputs: [
      { indexed: true, name: 'token0', type: 'address' },
      { indexed: true, name: 'token1', type: 'address' },
      { indexed: false, name: 'pair', type: 'address' },
      { indexed: false, name: 'allPairsLength', type: 'uint256' }
    ]
  }
];
```

---

## 2. DEXPair (交易对)

### 2.1 合约概述

DEXPair 实现 Constant Product AMM (x * y = k) 算法。

**核心特性**:
- ✅ 0.3% 交易手续费
- ✅ LP token (ERC20)
- ✅ 最小流动性锁定（MINIMUM_LIQUIDITY = 1000）
- ✅ 闪电交换支持（Flash Swaps）

### 2.2 核心函数

#### 2.2.1 getReserves - 查询储备量

```solidity
/**
 * @notice 查询交易对的储备量
 * @return reserve0 token0 储备（原始小数位）
 * @return reserve1 token1 储备（原始小数位）
 * @return blockTimestampLast 上次更新时间戳
 */
function getReserves() external view returns (
    uint112 reserve0,
    uint112 reserve1,
    uint32 blockTimestampLast
);
```

**调用示例**:
```javascript
async function getPairReserves(pairAddress) {
  // 1. 查询储备
  const reserves = await publicClient.readContract({
    address: pairAddress,
    abi: pairABI,
    functionName: 'getReserves'
  });

  const [reserve0, reserve1, timestamp] = reserves;

  // 2. 获取代币信息
  const [token0, token1] = await Promise.all([
    publicClient.readContract({
      address: pairAddress,
      abi: pairABI,
      functionName: 'token0'
    }),
    publicClient.readContract({
      address: pairAddress,
      abi: pairABI,
      functionName: 'token1'
    })
  ]);

  // 3. 计算价格
  const price0 = Number(reserve1) / Number(reserve0);
  const price1 = Number(reserve0) / Number(reserve1);

  console.log(`📊 ${token0}/${token1} 交易对储备:`);
  console.log(`  Token0 储备: ${reserve0}`);
  console.log(`  Token1 储备: ${reserve1}`);
  console.log(`  Token0 价格: ${price0.toFixed(6)} Token1`);
  console.log(`  Token1 价格: ${price1.toFixed(6)} Token0`);

  return { reserve0, reserve1, price0, price1, timestamp };
}
```

---

#### 2.2.2 mint - 添加流动性（低级函数）

```solidity
/**
 * @notice 铸造 LP token（仅供 Router 调用）
 * @param to LP token 接收地址
 * @return liquidity 铸造的 LP 数量
 */
function mint(address to) external returns (uint256 liquidity);
```

**注意**: 通常不直接调用此函数，而是通过 `DEXRouter.addLiquidity()` 间接调用。

---

#### 2.2.3 burn - 移除流动性（低级函数）

```solidity
/**
 * @notice 销毁 LP token，赎回代币（仅供 Router 调用）
 * @param to 代币接收地址
 * @return amount0 赎回的 token0 数量
 * @return amount1 赎回的 token1 数量
 */
function burn(address to) external returns (uint256 amount0, uint256 amount1);
```

---

#### 2.2.4 swap - 交换代币（低级函数）

```solidity
/**
 * @notice 执行代币交换（仅供 Router 调用）
 * @param amount0Out token0 输出量
 * @param amount1Out token1 输出量
 * @param to 代币接收地址
 * @param data 闪电交换回调数据（空则为普通交换）
 */
function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data) external;
```

---

### 2.3 完整 Pair ABI

```javascript
const PAIR_ABI = [
  // ERC20 标准函数
  {
    name: 'totalSupply',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },

  // Pair 特有函数
  {
    name: 'token0',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view'
  },
  {
    name: 'token1',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view'
  },
  {
    name: 'getReserves',
    type: 'function',
    inputs: [],
    outputs: [
      { name: 'reserve0', type: 'uint112' },
      { name: 'reserve1', type: 'uint112' },
      { name: 'blockTimestampLast', type: 'uint32' }
    ],
    stateMutability: 'view'
  },
  {
    name: 'mint',
    type: 'function',
    inputs: [{ name: 'to', type: 'address' }],
    outputs: [{ name: 'liquidity', type: 'uint256' }],
    stateMutability: 'nonpayable'
  },
  {
    name: 'burn',
    type: 'function',
    inputs: [{ name: 'to', type: 'address' }],
    outputs: [
      { name: 'amount0', type: 'uint256' },
      { name: 'amount1', type: 'uint256' }
    ],
    stateMutability: 'nonpayable'
  },
  {
    name: 'swap',
    type: 'function',
    inputs: [
      { name: 'amount0Out', type: 'uint256' },
      { name: 'amount1Out', type: 'uint256' },
      { name: 'to', type: 'address' },
      { name: 'data', type: 'bytes' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },

  // Events
  {
    name: 'Mint',
    type: 'event',
    inputs: [
      { indexed: true, name: 'sender', type: 'address' },
      { indexed: false, name: 'amount0', type: 'uint256' },
      { indexed: false, name: 'amount1', type: 'uint256' }
    ]
  },
  {
    name: 'Burn',
    type: 'event',
    inputs: [
      { indexed: true, name: 'sender', type: 'address' },
      { indexed: false, name: 'amount0', type: 'uint256' },
      { indexed: false, name: 'amount1', type: 'uint256' },
      { indexed: true, name: 'to', type: 'address' }
    ]
  },
  {
    name: 'Swap',
    type: 'event',
    inputs: [
      { indexed: true, name: 'sender', type: 'address' },
      { indexed: false, name: 'amount0In', type: 'uint256' },
      { indexed: false, name: 'amount1In', type: 'uint256' },
      { indexed: false, name: 'amount0Out', type: 'uint256' },
      { indexed: false, name: 'amount1Out', type: 'uint256' },
      { indexed: true, name: 'to', type: 'address' }
    ]
  },
  {
    name: 'Sync',
    type: 'event',
    inputs: [
      { indexed: false, name: 'reserve0', type: 'uint112' },
      { indexed: false, name: 'reserve1', type: 'uint112' }
    ]
  }
];
```

---

## 3. DEXRouter (路由器)

### 3.1 合约概述

DEXRouter 提供高级接口，简化流动性管理和代币交换。

**核心特性**:
- ✅ 滑点保护（amountMin 参数）
- ✅ 截止时间保护（deadline 参数）
- ✅ 多跳交换路径优化
- ✅ ETH/BNB 包装支持

### 3.2 核心函数

#### 3.2.1 addLiquidity - 添加流动性

```solidity
/**
 * @notice 为交易对添加流动性
 * @param tokenA 代币 A 地址
 * @param tokenB 代币 B 地址
 * @param amountADesired 期望的 tokenA 数量
 * @param amountBDesired 期望的 tokenB 数量
 * @param amountAMin 最小接受的 tokenA 数量（滑点保护）
 * @param amountBMin 最小接受的 tokenB 数量（滑点保护）
 * @param to LP token 接收地址
 * @param deadline 截止时间戳
 * @return amountA 实际使用的 tokenA 数量
 * @return amountB 实际使用的 tokenB 数量
 * @return liquidity 获得的 LP token 数量
 */
function addLiquidity(
    address tokenA,
    address tokenB,
    uint256 amountADesired,
    uint256 amountBDesired,
    uint256 amountAMin,
    uint256 amountBMin,
    address to,
    uint256 deadline
) external returns (uint256 amountA, uint256 amountB, uint256 liquidity);
```

**调用示例**:
```javascript
async function addLiquidity(tokenA, tokenB, amountA, amountB, slippagePct = 0.5) {
  const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 分钟有效期
  const slippage = slippagePct / 100;

  // 1. 批准两个代币
  await Promise.all([
    walletClient.writeContract({
      address: tokenA,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [addresses.DEXRouter, parseUnits(amountA, 18)]
    }),
    walletClient.writeContract({
      address: tokenB,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [addresses.DEXRouter, parseUnits(amountB, 18)]
    })
  ]);

  // 等待批准确认
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 2. 添加流动性
  const { result } = await publicClient.simulateContract({
    address: addresses.DEXRouter,
    abi: routerABI,
    functionName: 'addLiquidity',
    args: [
      tokenA,
      tokenB,
      parseUnits(amountA, 18),
      parseUnits(amountB, 18),
      parseUnits((parseFloat(amountA) * (1 - slippage)).toString(), 18),
      parseUnits((parseFloat(amountB) * (1 - slippage)).toString(), 18),
      walletClient.account.address,
      deadline
    ]
  });

  console.log(`预计获得 LP: ${formatUnits(result[2], 18)}`);

  const addLiquidityHash = await walletClient.writeContract({
    address: addresses.DEXRouter,
    abi: routerABI,
    functionName: 'addLiquidity',
    args: [
      tokenA,
      tokenB,
      parseUnits(amountA, 18),
      parseUnits(amountB, 18),
      parseUnits((parseFloat(amountA) * (1 - slippage)).toString(), 18),
      parseUnits((parseFloat(amountB) * (1 - slippage)).toString(), 18),
      walletClient.account.address,
      deadline
    ]
  });

  return addLiquidityHash;
}

// 示例: 添加 1000 USDC + 1000 USDP
await addLiquidity(
  addresses.USDC,
  addresses.USDP,
  '1000',
  '1000',
  0.5 // 0.5% 滑点容忍度
);
```

**事件**:
监听 Pair 合约的 `Mint` 事件（见 2.3 节）

**可能的错误**:
```solidity
error Expired(uint256 deadline);                          // 已过截止时间
error InsufficientAmount(uint256 amount, uint256 minimum); // 数量低于最小值
error InsufficientLiquidity();                            // 流动性不足
```

---

#### 3.2.2 removeLiquidity - 移除流动性

```solidity
/**
 * @notice 移除流动性，赎回代币
 * @param tokenA 代币 A 地址
 * @param tokenB 代币 B 地址
 * @param liquidity LP token 数量
 * @param amountAMin 最小接受的 tokenA 数量
 * @param amountBMin 最小接受的 tokenB 数量
 * @param to 代币接收地址
 * @param deadline 截止时间戳
 * @return amountA 赎回的 tokenA 数量
 * @return amountB 赎回的 tokenB 数量
 */
function removeLiquidity(
    address tokenA,
    address tokenB,
    uint256 liquidity,
    uint256 amountAMin,
    uint256 amountBMin,
    address to,
    uint256 deadline
) external returns (uint256 amountA, uint256 amountB);
```

**调用示例**:
```javascript
async function removeLiquidity(tokenA, tokenB, lpAmount, slippagePct = 0.5) {
  const deadline = Math.floor(Date.now() / 1000) + 1800;

  // 1. 获取交易对地址
  const pairAddress = await findPair(tokenA, tokenB);

  // 2. 批准 LP token
  const approveHash = await walletClient.writeContract({
    address: pairAddress,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [addresses.DEXRouter, parseUnits(lpAmount, 18)]
  });

  await publicClient.waitForTransactionReceipt({ hash: approveHash });

  // 3. 移除流动性
  const removeLiquidityHash = await walletClient.writeContract({
    address: addresses.DEXRouter,
    abi: routerABI,
    functionName: 'removeLiquidity',
    args: [
      tokenA,
      tokenB,
      parseUnits(lpAmount, 18),
      0, // amountAMin (设置为 0 或计算滑点保护)
      0, // amountBMin
      walletClient.account.address,
      deadline
    ]
  });

  return removeLiquidityHash;
}
```

---

#### 3.2.3 swapExactTokensForTokens - 精确输入交换

```solidity
/**
 * @notice 精确输入数量交换（指定输入量，接受浮动输出量）
 * @param amountIn 输入代币数量
 * @param amountOutMin 最小接受的输出数量（滑点保护）
 * @param path 交换路径（[tokenIn, tokenOut] 或多跳）
 * @param to 输出代币接收地址
 * @param deadline 截止时间戳
 * @return amounts 路径上各代币的实际数量
 */
function swapExactTokensForTokens(
    uint256 amountIn,
    uint256 amountOutMin,
    address[] calldata path,
    address to,
    uint256 deadline
) external returns (uint256[] memory amounts);
```

**调用示例**:
```javascript
async function swapTokens(tokenIn, tokenOut, amountIn, slippagePct = 0.5) {
  const deadline = Math.floor(Date.now() / 1000) + 1800;
  const path = [tokenIn, tokenOut];

  // 1. 查询预期输出
  const amountsOut = await publicClient.readContract({
    address: addresses.DEXRouter,
    abi: routerABI,
    functionName: 'getAmountsOut',
    args: [parseUnits(amountIn, 18), path]
  });

  const expectedOut = amountsOut[1];
  const minOut = expectedOut * BigInt(Math.floor((1 - slippagePct / 100) * 1000)) / 1000n;

  console.log(`预计输出: ${formatUnits(expectedOut, 18)} ${tokenOut}`);
  console.log(`最小接受: ${formatUnits(minOut, 18)} (${slippagePct}% 滑点)`);

  // 2. 批准输入代币
  const approveHash = await walletClient.writeContract({
    address: tokenIn,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [addresses.DEXRouter, parseUnits(amountIn, 18)]
  });

  await publicClient.waitForTransactionReceipt({ hash: approveHash });

  // 3. 执行交换
  const swapHash = await walletClient.writeContract({
    address: addresses.DEXRouter,
    abi: routerABI,
    functionName: 'swapExactTokensForTokens',
    args: [
      parseUnits(amountIn, 18),
      minOut,
      path,
      walletClient.account.address,
      deadline
    ]
  });

  return swapHash;
}

// 示例: 用 100 USDC 交换 USDP
await swapTokens(addresses.USDC, addresses.USDP, '100', 0.5);
```

---

#### 3.2.4 getAmountsOut - 查询输出数量

```solidity
/**
 * @notice 根据输入数量查询预期输出（不执行交易）
 * @param amountIn 输入数量
 * @param path 交换路径
 * @return amounts 路径上各代币的数量（[amountIn, amount1, ..., amountOut]）
 */
function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts);
```

**调用示例**:
```javascript
async function getSwapQuote(tokenIn, tokenOut, amountIn) {
  const path = [tokenIn, tokenOut];

  const amounts = await publicClient.readContract({
    address: addresses.DEXRouter,
    abi: routerABI,
    functionName: 'getAmountsOut',
    args: [parseUnits(amountIn, 18), path]
  });

  const amountOut = amounts[amounts.length - 1];
  const price = Number(amountOut) / Number(parseUnits(amountIn, 18));

  console.log(`输入: ${amountIn} ${tokenIn}`);
  console.log(`输出: ${formatUnits(amountOut, 18)} ${tokenOut}`);
  console.log(`价格: 1 ${tokenIn} = ${price.toFixed(6)} ${tokenOut}`);

  return { amountOut, price };
}
```

---

### 3.3 完整 Router ABI

```javascript
const ROUTER_ABI = [
  // Read functions
  {
    name: 'factory',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view'
  },
  {
    name: 'getAmountsOut',
    type: 'function',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path', type: 'address[]' }
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'view'
  },
  {
    name: 'getAmountsIn',
    type: 'function',
    inputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'path', type: 'address[]' }
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'view'
  },

  // Write functions
  {
    name: 'addLiquidity',
    type: 'function',
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'amountADesired', type: 'uint256' },
      { name: 'amountBDesired', type: 'uint256' },
      { name: 'amountAMin', type: 'uint256' },
      { name: 'amountBMin', type: 'uint256' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' }
    ],
    outputs: [
      { name: 'amountA', type: 'uint256' },
      { name: 'amountB', type: 'uint256' },
      { name: 'liquidity', type: 'uint256' }
    ],
    stateMutability: 'nonpayable'
  },
  {
    name: 'removeLiquidity',
    type: 'function',
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'liquidity', type: 'uint256' },
      { name: 'amountAMin', type: 'uint256' },
      { name: 'amountBMin', type: 'uint256' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' }
    ],
    outputs: [
      { name: 'amountA', type: 'uint256' },
      { name: 'amountB', type: 'uint256' }
    ],
    stateMutability: 'nonpayable'
  },
  {
    name: 'swapExactTokensForTokens',
    type: 'function',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' }
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable'
  },
  {
    name: 'swapTokensForExactTokens',
    type: 'function',
    inputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'amountInMax', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' }
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable'
  }
];
```

---

## 4. 集成示例：完整 LP 流程

```javascript
/**
 * 完整流程: 查询价格 → 添加流动性 → 质押 Gauge → 收集奖励 → 移除流动性
 */
async function fullLPJourney() {
  const tokenA = addresses.USDC;
  const tokenB = addresses.USDP;
  const amountA = '1000';
  const amountB = '1000';

  // Step 1: 查询交换价格
  console.log('Step 1: 查询市场价格...');
  const { price } = await getSwapQuote(tokenA, tokenB, '1');
  console.log(`✅ 当前价格: 1 USDC = ${price.toFixed(6)} USDP`);

  // Step 2: 添加流动性
  console.log('Step 2: 添加流动性...');
  const addLiquidityHash = await addLiquidity(tokenA, tokenB, amountA, amountB, 0.5);
  console.log(`✅ 流动性已添加: ${addLiquidityHash}`);

  // Step 3: 获取 LP token 余额
  const pairAddress = await findPair(tokenA, tokenB);
  const lpBalance = await publicClient.readContract({
    address: pairAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [walletClient.account.address]
  });
  console.log(`💼 LP 余额: ${formatUnits(lpBalance, 18)}`);

  // Step 4: 质押到 Gauge (见 Incentives API)
  console.log('Step 4: 质押到 Gauge...');
  // await stakeToGauge(pairAddress, lpBalance);

  // Step 5: 持续监控收益
  console.log('Step 5: 监控 LP 收益...');
  const reserves = await getPairReserves(pairAddress);
  console.log(`📊 当前储备比例: ${reserves.price0.toFixed(6)}`);

  return {
    pairAddress,
    lpBalance,
    currentPrice: price
  };
}
```

---

**下一步**: [激励模块 API](./incentives-api.md) - RewardDistributor, BoostStaking, Bribe
