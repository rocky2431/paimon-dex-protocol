# Gas 优化指南

## 概述

本指南提供 Paimon.dex 协议的 Gas 优化策略，帮助开发者降低用户交易成本。

**目标受众**：前端开发者、DApp集成方、钱包开发者

---

## Gas 费用基础

### BSC Gas 计价模型

```javascript
// BSC Gas 费用计算
总费用 = gasUsed × gasPrice
gasPrice = baseFee + priorityFee  // EIP-1559 (BSC支持)

// BSC典型值
baseFee: 3-5 gwei
priorityFee: 0-2 gwei
平均gasPrice: 3-7 gwei
```

### 常见操作 Gas 消耗

| 操作 | 预估 Gas | BSC 成本 (5 gwei) |
|------|----------|-------------------|
| ERC20 Transfer | 45,000 | ~0.000225 BNB ($0.07) |
| ERC20 Approve | 46,000 | ~0.00023 BNB ($0.07) |
| PSM Swap | 120,000 | ~0.0006 BNB ($0.18) |
| Add Liquidity | 200,000 | ~0.001 BNB ($0.30) |
| Create veNFT | 350,000 | ~0.00175 BNB ($0.53) |
| Claim Rewards | 150,000 | ~0.00075 BNB ($0.23) |
| Multicall (5 calls) | 280,000 | ~0.0014 BNB ($0.42) |

**节省比例**：Multicall vs 独立交易 = 280K vs 5×150K = **46% 节省**

---

## 1. Multicall 批量操作

### 什么是 Multicall

Multicall 将多个合约调用打包到单个交易中，减少：
- 交易数量（节省基础 Gas：21,000/tx）
- 签名确认次数（提升用户体验）
- 区块等待时间（原子性执行）

### Multicall 合约接口

```solidity
// Multicall3.sol (0xcA11bde05977b3631167028862bE2a173976CA11 - BSC通用)
interface IMulticall3 {
    struct Call {
        address target;
        bytes callData;
    }

    struct Result {
        bool success;
        bytes returnData;
    }

    function aggregate(Call[] calldata calls)
        external payable
        returns (uint256 blockNumber, bytes[] memory returnData);

    function tryAggregate(bool requireSuccess, Call[] calldata calls)
        external payable
        returns (Result[] memory returnData);
}
```

### 示例 1：批量查询余额

```javascript
import { createPublicClient, http, encodeFunctionData, decodeFunctionResult } from 'viem';
import { bscTestnet } from 'viem/chains';
import addresses from '../deployments/testnet/addresses.json';

const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11';

const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  }
];

const MULTICALL3_ABI = [
  {
    name: 'tryAggregate',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'requireSuccess', type: 'bool' },
      { name: 'calls', type: 'tuple[]', components: [
        { name: 'target', type: 'address' },
        { name: 'callData', type: 'bytes' }
      ]}
    ],
    outputs: [{
      name: 'returnData',
      type: 'tuple[]',
      components: [
        { name: 'success', type: 'bool' },
        { name: 'returnData', type: 'bytes' }
      ]
    }]
  }
];

/**
 * 批量查询多个代币余额
 * ❌ 传统方式：5次独立调用
 * ✅ Multicall：1次调用（节省 4×21,000 = 84,000 gas）
 */
async function batchGetBalances(userAddress) {
  const publicClient = createPublicClient({
    chain: bscTestnet,
    transport: http()
  });

  const tokens = [
    addresses.USDC,
    addresses.USDP,
    addresses.PAIMON,
    addresses.esPAIMON
  ];

  // 构造批量调用
  const calls = tokens.map(tokenAddress => ({
    target: tokenAddress,
    callData: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userAddress]
    })
  }));

  // 执行 Multicall
  const results = await publicClient.readContract({
    address: MULTICALL3_ADDRESS,
    abi: MULTICALL3_ABI,
    functionName: 'tryAggregate',
    args: [false, calls]  // false = 允许部分失败
  });

  // 解析结果
  const balances = {};
  results.forEach((result, index) => {
    if (result.success) {
      const balance = decodeFunctionResult({
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        data: result.returnData
      });

      const tokenName = Object.keys(addresses).find(
        key => addresses[key].toLowerCase() === tokens[index].toLowerCase()
      );

      balances[tokenName] = balance;
    } else {
      balances[tokenName] = 0n;
    }
  });

  return balances;
}

// 使用示例
const balances = await batchGetBalances('0xYourAddress');
console.log('批量查询结果:', {
  USDC: balances.USDC.toString(),
  USDP: balances.USDP.toString(),
  PAIMON: balances.PAIMON.toString(),
  esPAIMON: balances.esPAIMON.toString()
});
```

### 示例 2：批量写入操作（Approve + Swap）

```javascript
import { createWalletClient, http, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bscTestnet } from 'viem/chains';

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  }
];

const PSM_ABI = [
  {
    name: 'swapUSDCForUSDP',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'usdcAmount', type: 'uint256' }],
    outputs: [{ name: 'usdpAmount', type: 'uint256' }]
  }
];

/**
 * 批量执行 Approve + Swap
 * ❌ 传统方式：2次交易（2×21,000 + 46,000 + 120,000 = 208,000 gas）
 * ✅ Multicall：1次交易（约 180,000 gas，节省 13%）
 */
async function approveAndSwap(usdcAmount) {
  const account = privateKeyToAccount('0xYourPrivateKey');
  const walletClient = createWalletClient({
    account,
    chain: bscTestnet,
    transport: http()
  });

  // 构造批量调用
  const calls = [
    {
      target: addresses.USDC,
      callData: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [addresses.PSM, usdcAmount]
      })
    },
    {
      target: addresses.PSM,
      callData: encodeFunctionData({
        abi: PSM_ABI,
        functionName: 'swapUSDCForUSDP',
        args: [usdcAmount]
      })
    }
  ];

  // 执行 Multicall
  const txHash = await walletClient.writeContract({
    address: MULTICALL3_ADDRESS,
    abi: MULTICALL3_ABI,
    functionName: 'aggregate',
    args: [calls]
  });

  console.log('✅ 批量交易已提交:', txHash);
  return txHash;
}
```

### 示例 3：复杂工作流（LP 操作）

```javascript
/**
 * 批量执行 LP 工作流
 * 1. Approve Token A
 * 2. Approve Token B
 * 3. Add Liquidity
 * 4. Approve LP Token
 * 5. Stake LP Token
 *
 * ❌ 传统方式：5次交易 (~500,000 gas)
 * ✅ Multicall：1次交易 (~350,000 gas，节省 30%)
 */
async function addLiquidityAndStake(tokenA, tokenB, amountA, amountB, gaugeAddress) {
  const account = privateKeyToAccount('0xYourPrivateKey');
  const walletClient = createWalletClient({
    account,
    chain: bscTestnet,
    transport: http()
  });

  const DEX_ROUTER_ABI = [
    {
      name: 'addLiquidity',
      type: 'function',
      stateMutability: 'nonpayable',
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
      ]
    }
  ];

  const GAUGE_ABI = [
    {
      name: 'deposit',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [{ name: 'amount', type: 'uint256' }],
      outputs: []
    }
  ];

  // 计算 LP Token 地址（预先计算，避免链上查询）
  const pairAddress = computePairAddress(tokenA, tokenB);

  const deadline = Math.floor(Date.now() / 1000) + 1800;
  const slippage = 0.005;  // 0.5%

  const calls = [
    // 1. Approve Token A
    {
      target: tokenA,
      callData: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [addresses.DEXRouter, amountA]
      })
    },
    // 2. Approve Token B
    {
      target: tokenB,
      callData: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [addresses.DEXRouter, amountB]
      })
    },
    // 3. Add Liquidity
    {
      target: addresses.DEXRouter,
      callData: encodeFunctionData({
        abi: DEX_ROUTER_ABI,
        functionName: 'addLiquidity',
        args: [
          tokenA,
          tokenB,
          amountA,
          amountB,
          BigInt(Math.floor(Number(amountA) * (1 - slippage))),
          BigInt(Math.floor(Number(amountB) * (1 - slippage))),
          account.address,
          BigInt(deadline)
        ]
      })
    },
    // 4. Approve LP Token (使用预估的最大 liquidity)
    {
      target: pairAddress,
      callData: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [gaugeAddress, BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')]  // 无限授权
      })
    },
    // 注意：无法直接在 Multicall 中 stake，因为需要获取实际的 liquidity 数量
    // 实际应用中，需要分为两个 Multicall 或使用 Router 合约的封装函数
  ];

  const txHash = await walletClient.writeContract({
    address: MULTICALL3_ADDRESS,
    abi: MULTICALL3_ABI,
    functionName: 'tryAggregate',
    args: [true, calls]  // true = 任意失败则回滚
  });

  console.log('✅ LP添加流程已提交:', txHash);
  return txHash;
}

// 辅助函数：计算 Pair 地址
function computePairAddress(tokenA, tokenB) {
  const [token0, token1] = tokenA.toLowerCase() < tokenB.toLowerCase()
    ? [tokenA, tokenB]
    : [tokenB, tokenA];

  // 使用 CREATE2 公式计算
  // 实际应该调用 Factory.getPair() 或离线计算
  return '0x...';  // 占位符
}
```

---

## 2. Token 授权优化

### 问题：双重交易成本

传统流程需要 2 次交易：
1. `approve(spender, amount)` - 授权
2. `transferFrom(from, to, amount)` - 转账

### 解决方案 1：EIP-2612 Permit（Gas-free Approve）

```javascript
import { signTypedData } from 'viem/accounts';

/**
 * EIP-2612 Permit 签名授权
 * ✅ 无需 Gas 费用（离线签名）
 * ✅ 授权和转账合并为1次交易
 */
async function permitAndSwap(usdcAmount) {
  const account = privateKeyToAccount('0xYourPrivateKey');
  const publicClient = createPublicClient({
    chain: bscTestnet,
    transport: http()
  });

  // 查询 nonce
  const nonce = await publicClient.readContract({
    address: addresses.USDC,
    abi: [{
      name: 'nonces',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'owner', type: 'address' }],
      outputs: [{ name: '', type: 'uint256' }]
    }],
    functionName: 'nonces',
    args: [account.address]
  });

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);

  // EIP-712 签名
  const domain = {
    name: 'USD Coin',
    version: '1',
    chainId: 97,
    verifyingContract: addresses.USDC
  };

  const types = {
    Permit: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' }
    ]
  };

  const message = {
    owner: account.address,
    spender: addresses.PSM,
    value: usdcAmount,
    nonce,
    deadline
  };

  const signature = await signTypedData({
    account,
    domain,
    types,
    primaryType: 'Permit',
    message
  });

  // 分离签名
  const r = signature.slice(0, 66);
  const s = '0x' + signature.slice(66, 130);
  const v = parseInt(signature.slice(130, 132), 16);

  // 调用 swapWithPermit（假设 PSM 支持）
  const walletClient = createWalletClient({
    account,
    chain: bscTestnet,
    transport: http()
  });

  const txHash = await walletClient.writeContract({
    address: addresses.PSM,
    abi: [{
      name: 'swapWithPermit',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'usdcAmount', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
        { name: 'v', type: 'uint8' },
        { name: 'r', type: 'bytes32' },
        { name: 's', type: 'bytes32' }
      ]
    }],
    functionName: 'swapWithPermit',
    args: [usdcAmount, deadline, v, r, s]
  });

  console.log('✅ Permit签名授权 + 兑换完成:', txHash);
  console.log('💰 节省 Gas: ~46,000 (一次 approve 交易)');

  return txHash;
}
```

### 解决方案 2：无限授权（一次性成本）

```javascript
const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

/**
 * 无限授权策略
 * ✅ 用户只授权一次，后续操作无需 approve
 * ⚠️ 安全风险：需要信任合约安全性
 */
async function approveMax(tokenAddress, spenderAddress) {
  const account = privateKeyToAccount('0xYourPrivateKey');
  const walletClient = createWalletClient({
    account,
    chain: bscTestnet,
    transport: http()
  });

  const txHash = await walletClient.writeContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [spenderAddress, MAX_UINT256]
  });

  console.log('✅ 已授权无限额度:', txHash);
  console.log('⚠️ 后续操作无需 approve，但需信任合约安全性');

  return txHash;
}

// 前端检查授权额度
async function checkAllowance(tokenAddress, ownerAddress, spenderAddress) {
  const publicClient = createPublicClient({
    chain: bscTestnet,
    transport: http()
  });

  const allowance = await publicClient.readContract({
    address: tokenAddress,
    abi: [{
      name: 'allowance',
      type: 'function',
      stateMutability: 'view',
      inputs: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' }
      ],
      outputs: [{ name: '', type: 'uint256' }]
    }],
    functionName: 'allowance',
    args: [ownerAddress, spenderAddress]
  });

  return allowance;
}

// 智能授权逻辑
async function smartApprove(tokenAddress, spenderAddress, requiredAmount) {
  const currentAllowance = await checkAllowance(
    tokenAddress,
    account.address,
    spenderAddress
  );

  if (currentAllowance >= requiredAmount) {
    console.log('✅ 授权额度充足，无需 approve');
    return null;
  }

  // 授权 2 倍所需额度（减少未来 approve 次数）
  const approveAmount = requiredAmount * 2n;
  return await walletClient.writeContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [spenderAddress, approveAmount]
  });
}
```

---

## 3. 交易打包策略

### Router 合约封装

Paimon.dex 的 Router 合约已经内置了常见的操作组合：

```solidity
// DEXRouter.sol 示例
function addLiquidityAndStake(
    address tokenA,
    address tokenB,
    uint256 amountA,
    uint256 amountB,
    address gauge
) external returns (uint256 liquidity);

function removeLiquidityAndUnstake(
    address tokenA,
    address tokenB,
    uint256 liquidity,
    address gauge
) external returns (uint256 amountA, uint256 amountB);
```

**使用示例**：

```javascript
/**
 * 使用 Router 封装函数（推荐）
 * ✅ 单次交易完成复杂流程
 * ✅ 原子性保证（全成功或全失败）
 */
async function addLiquidityAndStakeViaRouter(tokenA, tokenB, amountA, amountB, gaugeAddress) {
  const account = privateKeyToAccount('0xYourPrivateKey');
  const walletClient = createWalletClient({
    account,
    chain: bscTestnet,
    transport: http()
  });

  // 1. 先授权 Token A 和 Token B 给 Router
  await walletClient.writeContract({
    address: tokenA,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [addresses.DEXRouter, amountA]
  });

  await walletClient.writeContract({
    address: tokenB,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [addresses.DEXRouter, amountB]
  });

  // 2. 调用封装函数（一次性完成 addLiquidity + stake）
  const txHash = await walletClient.writeContract({
    address: addresses.DEXRouter,
    abi: [{
      name: 'addLiquidityAndStake',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'tokenA', type: 'address' },
        { name: 'tokenB', type: 'address' },
        { name: 'amountA', type: 'uint256' },
        { name: 'amountB', type: 'uint256' },
        { name: 'gauge', type: 'address' }
      ],
      outputs: [{ name: 'liquidity', type: 'uint256' }]
    }],
    functionName: 'addLiquidityAndStake',
    args: [tokenA, tokenB, amountA, amountB, gaugeAddress]
  });

  console.log('✅ 添加流动性并质押完成:', txHash);
  return txHash;
}
```

---

## 4. 合约调用优化

### 批量 View 调用（只读操作）

```javascript
/**
 * 批量查询用户在多个 Gauge 的质押信息
 * ❌ 传统方式：N次 RPC 调用
 * ✅ Multicall：1次 RPC 调用
 */
async function batchGetGaugeBalances(userAddress, gaugeAddresses) {
  const publicClient = createPublicClient({
    chain: bscTestnet,
    transport: http()
  });

  const GAUGE_ABI = [{
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  }];

  const calls = gaugeAddresses.map(gaugeAddress => ({
    target: gaugeAddress,
    callData: encodeFunctionData({
      abi: GAUGE_ABI,
      functionName: 'balanceOf',
      args: [userAddress]
    })
  }));

  const results = await publicClient.readContract({
    address: MULTICALL3_ADDRESS,
    abi: MULTICALL3_ABI,
    functionName: 'tryAggregate',
    args: [false, calls]
  });

  const balances = {};
  results.forEach((result, index) => {
    if (result.success) {
      const balance = decodeFunctionResult({
        abi: GAUGE_ABI,
        functionName: 'balanceOf',
        data: result.returnData
      });

      balances[gaugeAddresses[index]] = balance;
    }
  });

  return balances;
}
```

### 缓存策略

```javascript
/**
 * 智能缓存层
 * ✅ 减少重复链上查询
 * ✅ 自动失效机制
 */
class ContractCache {
  constructor(ttl = 60000) {  // 默认缓存 60 秒
    this.cache = new Map();
    this.ttl = ttl;
  }

  async get(key, fetchFn) {
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      console.log('✅ 使用缓存:', key);
      return cached.value;
    }

    console.log('🔄 链上查询:', key);
    const value = await fetchFn();

    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });

    return value;
  }

  invalidate(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}

// 使用示例
const cache = new ContractCache(60000);

async function getTokenBalance(tokenAddress, userAddress) {
  const cacheKey = `balance:${tokenAddress}:${userAddress}`;

  return await cache.get(cacheKey, async () => {
    const publicClient = createPublicClient({
      chain: bscTestnet,
      transport: http()
    });

    return await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userAddress]
    });
  });
}

// 交易后清除缓存
async function transferToken(tokenAddress, to, amount) {
  const txHash = await walletClient.writeContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [to, amount]
  });

  // 清除相关缓存
  cache.invalidate(`balance:${tokenAddress}:${account.address}`);
  cache.invalidate(`balance:${tokenAddress}:${to}`);

  return txHash;
}
```

---

## 5. Gas 估算和监控

### 实时 Gas 价格查询

```javascript
/**
 * 查询当前 BSC Gas 价格
 * 建议用户在 Gas 价格低时发起交易
 */
async function getCurrentGasPrice() {
  const publicClient = createPublicClient({
    chain: bscTestnet,
    transport: http()
  });

  const gasPrice = await publicClient.getGasPrice();
  const gasPriceGwei = Number(gasPrice) / 1e9;

  return {
    wei: gasPrice,
    gwei: gasPriceGwei,
    recommendation: gasPriceGwei < 5 ? '✅ 适合交易' : '⚠️ Gas较高，建议等待'
  };
}

// 使用示例
const gasInfo = await getCurrentGasPrice();
console.log('当前 Gas 价格:', gasInfo.gwei, 'gwei');
console.log(gasInfo.recommendation);
```

### 交易 Gas 预估

```javascript
/**
 * 预估交易 Gas 消耗
 * ✅ 交易前告知用户预期成本
 */
async function estimateSwapGas(usdcAmount) {
  const publicClient = createPublicClient({
    chain: bscTestnet,
    transport: http()
  });

  const account = privateKeyToAccount('0xYourPrivateKey');

  try {
    const gasEstimate = await publicClient.estimateContractGas({
      address: addresses.PSM,
      abi: PSM_ABI,
      functionName: 'swapUSDCForUSDP',
      args: [usdcAmount],
      account
    });

    const gasPrice = await publicClient.getGasPrice();
    const totalCost = gasEstimate * gasPrice;

    return {
      gasLimit: gasEstimate,
      gasPrice: gasPrice,
      totalCostWei: totalCost,
      totalCostBNB: Number(totalCost) / 1e18,
      totalCostUSD: (Number(totalCost) / 1e18) * 300  // 假设 BNB = $300
    };
  } catch (error) {
    console.error('❌ Gas估算失败:', error.message);
    throw error;
  }
}

// 前端展示
const cost = await estimateSwapGas(parseUnits('1000', 6));
console.log('预估 Gas 消耗:', cost.gasLimit);
console.log('预估总成本:', cost.totalCostUSD.toFixed(2), 'USD');
```

### Gas 使用监控

```javascript
/**
 * 监控交易实际 Gas 消耗
 * 用于优化和对比
 */
async function monitorTransactionGas(txHash) {
  const publicClient = createPublicClient({
    chain: bscTestnet,
    transport: http()
  });

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash
  });

  const gasUsed = receipt.gasUsed;
  const effectiveGasPrice = receipt.effectiveGasPrice;
  const totalCost = gasUsed * effectiveGasPrice;

  console.log('📊 Gas 使用报告:');
  console.log('  Gas Used:', gasUsed.toString());
  console.log('  Gas Price:', Number(effectiveGasPrice) / 1e9, 'gwei');
  console.log('  Total Cost:', Number(totalCost) / 1e18, 'BNB');
  console.log('  Status:', receipt.status === 'success' ? '✅ 成功' : '❌ 失败');

  return {
    gasUsed,
    effectiveGasPrice,
    totalCost,
    status: receipt.status
  };
}
```

---

## 6. 高级优化技巧

### 技巧 1：合并 Approve 授权

```javascript
/**
 * 在添加 LP 时，同时授权两个代币
 * ❌ 传统：Approve A → 等待 → Approve B → 等待 → Add Liquidity
 * ✅ 优化：Approve A + Approve B (Multicall) → Add Liquidity
 */
async function batchApproveAndAddLiquidity(tokenA, tokenB, amountA, amountB) {
  const account = privateKeyToAccount('0xYourPrivateKey');
  const walletClient = createWalletClient({
    account,
    chain: bscTestnet,
    transport: http()
  });

  // 步骤 1：批量授权
  const approveCalls = [
    {
      target: tokenA,
      callData: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [addresses.DEXRouter, amountA]
      })
    },
    {
      target: tokenB,
      callData: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [addresses.DEXRouter, amountB]
      })
    }
  ];

  const approveHash = await walletClient.writeContract({
    address: MULTICALL3_ADDRESS,
    abi: MULTICALL3_ABI,
    functionName: 'aggregate',
    args: [approveCalls]
  });

  await publicClient.waitForTransactionReceipt({ hash: approveHash });
  console.log('✅ 批量授权完成');

  // 步骤 2：添加流动性
  const deadline = Math.floor(Date.now() / 1000) + 1800;

  const addLiquidityHash = await walletClient.writeContract({
    address: addresses.DEXRouter,
    abi: DEX_ROUTER_ABI,
    functionName: 'addLiquidity',
    args: [
      tokenA, tokenB,
      amountA, amountB,
      amountA * 995n / 1000n,  // 0.5% 滑点
      amountB * 995n / 1000n,
      account.address,
      deadline
    ]
  });

  console.log('✅ 添加流动性完成:', addLiquidityHash);
  return addLiquidityHash;
}
```

### 技巧 2：乐观 UI 更新

```javascript
/**
 * 乐观更新 UI（无需等待交易确认）
 * ✅ 提升用户体验
 * ⚠️ 交易失败时需回滚 UI
 */
class OptimisticUpdater {
  constructor() {
    this.pendingUpdates = new Map();
  }

  async executeWithOptimism(txPromise, optimisticUpdate, revertUpdate) {
    const updateId = Date.now().toString();

    // 立即更新 UI
    optimisticUpdate();
    this.pendingUpdates.set(updateId, { optimisticUpdate, revertUpdate });

    try {
      const txHash = await txPromise;
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      if (receipt.status === 'success') {
        console.log('✅ 交易成功，乐观更新生效');
        this.pendingUpdates.delete(updateId);
      } else {
        throw new Error('交易失败');
      }
    } catch (error) {
      console.error('❌ 交易失败，回滚 UI:', error.message);
      revertUpdate();
      this.pendingUpdates.delete(updateId);
      throw error;
    }
  }
}

// 使用示例
const updater = new OptimisticUpdater();

async function swapWithOptimism(usdcAmount) {
  const txPromise = walletClient.writeContract({
    address: addresses.PSM,
    abi: PSM_ABI,
    functionName: 'swapUSDCForUSDP',
    args: [usdcAmount]
  });

  await updater.executeWithOptimism(
    txPromise,
    // 乐观更新：立即减少 USDC，增加 USDP
    () => {
      updateBalance('USDC', balance => balance - usdcAmount);
      updateBalance('USDP', balance => balance + usdcAmount);
      showToast('✅ 兑换中...');
    },
    // 回滚更新：恢复原始余额
    () => {
      refreshBalances();  // 从链上重新查询
      showToast('❌ 兑换失败');
    }
  );
}
```

### 技巧 3：链下计算 + 链上验证

```javascript
/**
 * 复杂计算在链下完成，链上只验证结果
 * 示例：Merkle Proof 奖励领取
 */
async function claimRewardsOptimized(epoch, userAddress) {
  // 链下：从后端 API 获取 Merkle Proof
  const response = await fetch(
    `https://api.paimon.dex/rewards/${epoch}/${userAddress}`
  );
  const { amount, proof } = await response.json();

  // 链上：只验证 Proof 并领取
  const txHash = await walletClient.writeContract({
    address: addresses.RewardDistributor,
    abi: [{
      name: 'claim',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'epoch', type: 'uint256' },
        { name: 'amount', type: 'uint256' },
        { name: 'proof', type: 'bytes32[]' }
      ]
    }],
    functionName: 'claim',
    args: [epoch, amount, proof]
  });

  console.log('✅ 奖励领取完成 (Gas节省: ~80%, 无需链上计算)');
  return txHash;
}
```

---

## 7. 最佳实践总结

### ✅ 推荐做法

1. **批量操作优先**
   - 使用 Multicall3 合并多个只读调用
   - 使用 Router 封装函数完成复杂流程
   - 批量授权多个代币

2. **智能授权管理**
   - 使用 Permit (EIP-2612) 避免独立 approve 交易
   - 信任合约时使用无限授权（一次性成本）
   - 授权 2 倍所需额度减少未来 approve 次数

3. **缓存和乐观更新**
   - 缓存只读调用结果（60秒 TTL）
   - 乐观更新 UI 提升体验
   - 交易失败时自动回滚

4. **Gas 监控**
   - 交易前预估 Gas 成本并告知用户
   - 监控实际 Gas 消耗用于优化
   - 低 Gas 价格时引导用户发起交易

5. **链下计算**
   - Merkle Proof 在后端生成
   - 复杂数据聚合使用 The Graph
   - 价格计算在前端/后端完成

### ❌ 避免做法

1. **频繁独立交易**
   - 不要每个操作单独发起交易
   - 不要重复授权相同的 spender

2. **忽略 Gas 价格**
   - 不要在 Gas 价格高峰期引导用户交易
   - 不要使用固定 gasLimit（应该估算）

3. **过度链上计算**
   - 不要在合约中进行可以链下完成的计算
   - 不要重复查询不变的数据（如 decimals）

4. **缺少失败处理**
   - 不要假设交易一定成功
   - 不要忽略 Gas 估算失败的情况

---

## 8. Gas 成本对比表

| 操作 | 传统方式 | 优化方式 | 节省比例 |
|------|---------|---------|---------|
| 查询 5 个余额 | 5 次 RPC 调用 | 1 次 Multicall | 80% 时间节省 |
| Approve + Swap | 2 笔交易 (208K gas) | Permit + Swap (120K gas) | 42% Gas 节省 |
| 添加 LP 并质押 | 5 笔交易 (~500K gas) | Router 封装 (~350K gas) | 30% Gas 节省 |
| 领取奖励 | 链上计算 Merkle (~200K gas) | 链下计算 (~40K gas) | 80% Gas 节省 |
| LP 授权 + 质押 | 3 笔交易 | 2 笔交易 (批量 approve) | 33% 节省 |

---

## 9. 实用工具函数库

```javascript
// gas-utils.js
export const GasUtils = {
  /**
   * 批量查询多个代币余额
   */
  async batchGetBalances(tokens, userAddress) {
    const calls = tokens.map(token => ({
      target: token,
      callData: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [userAddress]
      })
    }));

    const results = await publicClient.readContract({
      address: MULTICALL3_ADDRESS,
      abi: MULTICALL3_ABI,
      functionName: 'tryAggregate',
      args: [false, calls]
    });

    return results.map((result, i) => ({
      token: tokens[i],
      balance: result.success
        ? decodeFunctionResult({
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            data: result.returnData
          })
        : 0n
    }));
  },

  /**
   * 智能授权（检查并按需授权）
   */
  async smartApprove(tokenAddress, spenderAddress, requiredAmount) {
    const allowance = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [account.address, spenderAddress]
    });

    if (allowance >= requiredAmount) {
      return null;  // 无需授权
    }

    return await walletClient.writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spenderAddress, MAX_UINT256]  // 无限授权
    });
  },

  /**
   * 预估交易成本（USD）
   */
  async estimateCostUSD(contractAddress, abi, functionName, args) {
    const gasEstimate = await publicClient.estimateContractGas({
      address: contractAddress,
      abi,
      functionName,
      args,
      account
    });

    const gasPrice = await publicClient.getGasPrice();
    const bnbPrice = await fetchBNBPrice();  // 从 API 获取

    const costBNB = Number(gasEstimate * gasPrice) / 1e18;
    const costUSD = costBNB * bnbPrice;

    return {
      gasEstimate,
      gasPrice,
      costBNB,
      costUSD
    };
  }
};
```

---

## 总结

通过本指南的优化策略，您可以：
- **降低 30-80% 的 Gas 成本**
- **减少 50% 以上的交易次数**
- **提升 3-5 倍的用户体验**

**关键要点**：
1. 优先使用 Multicall 批量操作
2. 合理使用 Permit 和无限授权
3. 利用缓存减少链上查询
4. 监控 Gas 价格引导用户交易时机
5. 链下计算 + 链上验证模式

更多优化技巧请参考：
- [事件监听指南](./events-guide.md)
- [错误处理指南](./error-handling.md)
- [安全集成指南](./security-integration.md)
