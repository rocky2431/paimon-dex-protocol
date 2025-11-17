# Paimon.dex API 合约规范

**版本**: v1.0
**最后更新**: 2025-11-17
**目标读者**: 外部集成开发者、钱包开发者、聚合器开发者、前端开发者

---

## 📚 文档导航

### 核心模块

1. **[稳定币模块](./stablecoin-api.md)** - USDP、PSM、Vault、SavingRate
2. **[治理模块](./governance-api.md)** - veNFT、GaugeController、EmissionManager
3. **[流动性模块](./dex-api.md)** - DEXFactory、DEXPair、DEXRouter
4. **[激励模块](./incentives-api.md)** - RewardDistributor、BoostStaking、NitroPool
5. **[资产发行模块](./launchpad-api.md)** - ProjectRegistry、IssuanceController
6. **[Treasury 模块](./treasury-api.md)** - Treasury、RWAPriceOracle

### 专题文档

- **[事件监听指南](./events-guide.md)** - 完整事件架构，适用于链下索引服务
- **[错误处理指南](./error-handling.md)** - 所有自定义错误及处理建议
- **[Gas 优化指南](./gas-optimization.md)** - 批量操作、多调用模式
- **[安全集成指南](./security-integration.md)** - Reentrancy 防护、价格操纵防范

---

## 🎯 快速开始

### 1. 网络配置

```javascript
// BSC Testnet
const NETWORK_CONFIG = {
  chainId: 97,
  rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545/",
  explorer: "https://testnet.bscscan.com",
  contracts: require("./deployments/testnet/addresses.json")
};

// 连接 Web3
import { createPublicClient, createWalletClient, http } from 'viem';
import { bscTestnet } from 'viem/chains';

const publicClient = createPublicClient({
  chain: bscTestnet,
  transport: http(NETWORK_CONFIG.rpcUrl)
});

const walletClient = createWalletClient({
  chain: bscTestnet,
  transport: http(NETWORK_CONFIG.rpcUrl)
});
```

### 2. 合约地址导入

```javascript
// 从部署文件读取
const addresses = {
  // 核心代币
  USDP: "0x1234...abcd",           // USDP 稳定币
  PAIMON: "0x5678...efgh",         // PAIMON 治理代币
  esPAIMON: "0x9abc...ijkl",       // esPAIMON 归属代币

  // 稳定币模块
  PSM: "0xdef0...mnop",            // Peg Stability Module
  USDPVault: "0x1111...qrst",      // USDP Vault
  USDPSavingRate: "0x2222...uvwx", // USDP SavingRate (ERC4626)

  // DEX 模块
  DEXFactory: "0x3333...yzab",     // AMM Factory
  DEXRouter: "0x4444...cdef",      // AMM Router

  // 治理模块
  VotingEscrowPaimon: "0x5555...ghij", // veNFT
  GaugeController: "0x6666...klmn",    // Gauge 投票
  EmissionManager: "0x7777...opqr",    // 发行管理

  // 激励模块
  RewardDistributor: "0x8888...stuv",  // 奖励分配
  BoostStaking: "0x9999...wxyz",       // Boost 质押

  // Launchpad 模块
  ProjectRegistry: "0xaaaa...0123",    // 项目注册
  IssuanceController: "0xbbbb...4567", // 发行控制

  // Treasury 模块
  Treasury: "0xcccc...89ab",           // RWA 金库
  RWAPriceOracle: "0xdddd...cdef"      // RWA 价格预言机
};
```

### 3. 核心集成示例

#### 示例 1: USDC → USDP 兑换（零滑点）

```javascript
import { parseUnits, formatUnits } from 'viem';

// PSM ABI 片段
const psmABI = [
  {
    name: 'swapUSDCForUSDP',
    type: 'function',
    inputs: [{ name: 'usdcAmount', type: 'uint256' }],
    outputs: [{ name: 'usdpAmount', type: 'uint256' }],
    stateMutability: 'nonpayable'
  }
];

// 执行兑换
async function swapUSDCtoUSDP(usdcAmount) {
  // 1. 批准 USDC
  const approveHash = await walletClient.writeContract({
    address: addresses.USDC,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [addresses.PSM, parseUnits(usdcAmount, 6)] // USDC = 6 decimals
  });

  await publicClient.waitForTransactionReceipt({ hash: approveHash });

  // 2. 执行 PSM 兑换
  const swapHash = await walletClient.writeContract({
    address: addresses.PSM,
    abi: psmABI,
    functionName: 'swapUSDCForUSDP',
    args: [parseUnits(usdcAmount, 6)]
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: swapHash });

  // 3. 从事件中读取实际兑换数量
  const swapEvent = receipt.logs.find(log =>
    log.topics[0] === '0x...' // SwapUSDCForUSDP event signature
  );

  return {
    txHash: swapHash,
    usdpReceived: formatUnits(swapEvent.data, 18) // USDP = 18 decimals
  };
}
```

#### 示例 2: 创建 veNFT（治理参与）

```javascript
// VotingEscrowPaimon ABI 片段
const veABI = [
  {
    name: 'createLock',
    type: 'function',
    inputs: [
      { name: '_value', type: 'uint256' },
      { name: '_lockDuration', type: 'uint256' }
    ],
    outputs: [{ name: 'tokenId', type: 'uint256' }],
    stateMutability: 'nonpayable'
  }
];

async function createVeNFT(paimonAmount, lockWeeks) {
  const lockDuration = lockWeeks * 7 * 24 * 3600; // 转换为秒

  // 1. 批准 PAIMON
  const approveHash = await walletClient.writeContract({
    address: addresses.PAIMON,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [addresses.VotingEscrowPaimon, parseUnits(paimonAmount, 18)]
  });

  await publicClient.waitForTransactionReceipt({ hash: approveHash });

  // 2. 创建锁定
  const createHash = await walletClient.writeContract({
    address: addresses.VotingEscrowPaimon,
    abi: veABI,
    functionName: 'createLock',
    args: [parseUnits(paimonAmount, 18), lockDuration]
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: createHash });

  // 3. 从事件中提取 tokenId
  const lockEvent = receipt.logs.find(log =>
    log.topics[0] === '0x...' // LockCreated event signature
  );

  return {
    txHash: createHash,
    tokenId: BigInt(lockEvent.topics[1]), // tokenId in indexed field
    votingPower: calculateVotingPower(paimonAmount, lockWeeks)
  };
}

// 投票权计算
function calculateVotingPower(paimonAmount, lockWeeks) {
  const MAX_LOCK_WEEKS = 208; // 4 years
  return parseFloat(paimonAmount) * (lockWeeks / MAX_LOCK_WEEKS);
}
```

#### 示例 3: 添加流动性 + Gauge 质押

```javascript
// DEXRouter ABI 片段
const routerABI = [
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
  }
];

async function addLiquidityAndStake(tokenA, tokenB, amountA, amountB) {
  const slippage = 0.5; // 0.5% 滑点容忍度
  const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 分钟有效期

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

  // 2. 添加流动性
  const { result } = await walletClient.simulateContract({
    address: addresses.DEXRouter,
    abi: routerABI,
    functionName: 'addLiquidity',
    args: [
      tokenA,
      tokenB,
      parseUnits(amountA, 18),
      parseUnits(amountB, 18),
      parseUnits((amountA * (1 - slippage / 100)).toString(), 18),
      parseUnits((amountB * (1 - slippage / 100)).toString(), 18),
      walletClient.account.address,
      deadline
    ]
  });

  const addLiquidityHash = await walletClient.writeContract({
    address: addresses.DEXRouter,
    abi: routerABI,
    functionName: 'addLiquidity',
    args: [
      tokenA,
      tokenB,
      parseUnits(amountA, 18),
      parseUnits(amountB, 18),
      parseUnits((amountA * (1 - slippage / 100)).toString(), 18),
      parseUnits((amountB * (1 - slippage / 100)).toString(), 18),
      walletClient.account.address,
      deadline
    ]
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: addLiquidityHash });

  // 3. 获取 LP token 地址
  const pairAddress = await publicClient.readContract({
    address: addresses.DEXFactory,
    abi: factoryABI,
    functionName: 'getPair',
    args: [tokenA, tokenB]
  });

  // 4. 查询 Gauge 地址
  const gaugeAddress = await publicClient.readContract({
    address: addresses.GaugeController,
    abi: gaugeControllerABI,
    functionName: 'gauges',
    args: [pairAddress]
  });

  // 5. 批准 LP token 给 Gauge
  const lpBalance = await publicClient.readContract({
    address: pairAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [walletClient.account.address]
  });

  await walletClient.writeContract({
    address: pairAddress,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [gaugeAddress, lpBalance]
  });

  // 6. 质押到 Gauge
  const stakeHash = await walletClient.writeContract({
    address: gaugeAddress,
    abi: gaugeABI,
    functionName: 'deposit',
    args: [lpBalance]
  });

  return {
    addLiquidityTx: addLiquidityHash,
    stakeTx: stakeHash,
    lpAmount: formatUnits(lpBalance, 18),
    pairAddress,
    gaugeAddress
  };
}
```

---

## 📡 事件监听架构

### 关键事件分类

#### 1. **稳定币事件**（用于余额追踪）

```solidity
// USDP.sol
event Transfer(address indexed from, address indexed to, uint256 value);

// PSMParameterized.sol
event SwapUSDCForUSDP(address indexed user, uint256 usdcIn, uint256 usdpOut);
event SwapUSDPForUSDC(address indexed user, uint256 usdpIn, uint256 usdcOut);

// USDPSavingRate.sol (ERC4626)
event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares);
event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares);
```

#### 2. **治理事件**（用于投票追踪）

```solidity
// VotingEscrowPaimon.sol
event LockCreated(uint256 indexed tokenId, address indexed owner, uint256 value, uint256 lockEnd);
event LockIncreased(uint256 indexed tokenId, uint256 value);
event LockExtended(uint256 indexed tokenId, uint256 lockEnd);
event Transfer(address indexed from, address indexed to, uint256 indexed tokenId); // ERC721

// GaugeController.sol
event VotedForGauge(address indexed user, address indexed gauge, uint256 weight);
event NewGauge(address indexed gauge, address indexed pool);
```

#### 3. **激励事件**（用于奖励计算）

```solidity
// RewardDistributor.sol
event RewardClaimed(address indexed user, uint256 indexed epoch, uint256 amount);
event MerkleRootUpdated(uint256 indexed epoch, bytes32 merkleRoot);

// BoostStaking.sol
event Staked(address indexed user, uint256 amount, uint256 lockDuration);
event Unstaked(address indexed user, uint256 amount);

// EmissionRouter.sol
event WeeklyDistribution(uint256 indexed week, uint256 debtAmount, uint256 lpAmount, uint256 stabAmount, uint256 ecoAmount);
```

#### 4. **Launchpad 事件**（用于项目状态追踪）

```solidity
// ProjectRegistry.sol
event ProjectRegistered(uint256 indexed projectId, address indexed issuer, string name);
event ProjectApproved(uint256 indexed projectId);
event ProjectRejected(uint256 indexed projectId, string reason);

// IssuanceController.sol
event ParticipationReceived(uint256 indexed projectId, address indexed participant, uint256 amount);
event TokensDistributed(uint256 indexed projectId, address indexed participant, uint256 tokenAmount);
event DividendPaid(uint256 indexed projectId, uint256 totalAmount);
```

### 事件监听示例（使用 Viem）

```javascript
// 监听 PSM 兑换事件
const unwatch = publicClient.watchContractEvent({
  address: addresses.PSM,
  abi: psmABI,
  eventName: 'SwapUSDCForUSDP',
  onLogs: (logs) => {
    logs.forEach(log => {
      console.log(`Swap detected: ${formatUnits(log.args.usdcIn, 6)} USDC → ${formatUnits(log.args.usdpOut, 18)} USDP`);
      console.log(`User: ${log.args.user}`);
      console.log(`Block: ${log.blockNumber}, Tx: ${log.transactionHash}`);
    });
  }
});

// 停止监听
// unwatch();
```

---

## ⚠️ 常见错误处理

### 1. 自定义错误列表

所有合约遵循 Solidity 0.8+ 自定义错误模式（节省 gas）：

```solidity
// 通用错误
error ZeroAddress();
error ZeroAmount();
error Unauthorized();
error Paused();

// PSM 特定错误
error InsufficientUSDCInReserve(uint256 requested, uint256 available);
error ExceedsSwapLimit(uint256 amount, uint256 limit);

// veNFT 特定错误
error LockDurationTooShort(uint256 duration, uint256 minimum);
error LockDurationTooLong(uint256 duration, uint256 maximum);
error LockExpired(uint256 tokenId);

// Treasury 特定错误
error InsufficientCollateral(uint256 healthFactor);
error UnsupportedCollateralType(address asset);
error OraclePriceStale(address oracle);

// Gauge 特定错误
error VotingPowerInsufficient(uint256 required, uint256 available);
error GaugeNotRegistered(address gauge);
```

### 2. 错误处理示例

```javascript
try {
  const hash = await walletClient.writeContract({
    address: addresses.PSM,
    abi: psmABI,
    functionName: 'swapUSDCForUSDP',
    args: [parseUnits('1000000', 6)] // 尝试兑换 100 万 USDC
  });
} catch (error) {
  // 解析自定义错误
  if (error.message.includes('InsufficientUSDCInReserve')) {
    const match = error.message.match(/requested: (\d+), available: (\d+)/);
    console.error(`PSM 储备不足: 请求 ${match[1]}, 可用 ${match[2]}`);
    // 建议用户降低兑换数量
  } else if (error.message.includes('ExceedsSwapLimit')) {
    console.error('超出单笔兑换限额，请分批兑换');
  } else {
    console.error('未知错误:', error.message);
  }
}
```

---

## 🔐 安全集成最佳实践

### 1. 价格操纵防护

```javascript
// ❌ 错误: 直接使用 AMM 即时价格
const instantPrice = await pair.getReserves();
const price = instantPrice.reserve1 / instantPrice.reserve0;

// ✅ 正确: 使用 TWAP（时间加权平均价格）
const observations = await pair.observations(0); // 获取最新观察点
const twapPrice = await pair.consult(tokenA, parseUnits('1', 18), 1800); // 30 分钟 TWAP
```

### 2. Reentrancy 防护

所有价值转移函数已内置 `ReentrancyGuard`，但外部集成仍需注意：

```javascript
// ✅ 正确: 先检查状态，再执行操作
async function safeWithdraw(amount) {
  // 1. 检查余额
  const balance = await publicClient.readContract({
    address: addresses.USDPSavingRate,
    abi: savingRateABI,
    functionName: 'balanceOf',
    args: [userAddress]
  });

  if (balance < amount) {
    throw new Error('Insufficient balance');
  }

  // 2. 执行提款
  const hash = await walletClient.writeContract({
    address: addresses.USDPSavingRate,
    abi: savingRateABI,
    functionName: 'withdraw',
    args: [amount, userAddress, userAddress]
  });

  // 3. 等待确认（不要在回调中执行后续操作）
  await publicClient.waitForTransactionReceipt({ hash });

  return hash;
}
```

### 3. 前端运行检查（Simulate）

```javascript
// ✅ 始终在实际交易前模拟执行
try {
  const { result } = await publicClient.simulateContract({
    address: addresses.PSM,
    abi: psmABI,
    functionName: 'swapUSDCForUSDP',
    args: [parseUnits('1000', 6)]
  });

  console.log(`预计收到 ${formatUnits(result, 18)} USDP`);

  // 确认无误后执行实际交易
  const hash = await walletClient.writeContract({
    address: addresses.PSM,
    abi: psmABI,
    functionName: 'swapUSDCForUSDP',
    args: [parseUnits('1000', 6)]
  });
} catch (error) {
  console.error('模拟执行失败，交易可能会 revert:', error);
}
```

---

## 📊 Gas 优化建议

### 1. 批量操作（Multicall）

```javascript
import { encodeFunctionData } from 'viem';

// 使用 Multicall3 合约批量查询
const multicallAddress = '0xcA11bde05977b3631167028862bE2a173976CA11'; // BSC 通用地址

const calls = [
  {
    target: addresses.USDP,
    callData: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userAddress]
    })
  },
  {
    target: addresses.PAIMON,
    callData: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userAddress]
    })
  },
  {
    target: addresses.VotingEscrowPaimon,
    callData: encodeFunctionData({
      abi: veABI,
      functionName: 'balanceOf',
      args: [userAddress]
    })
  }
];

const results = await publicClient.readContract({
  address: multicallAddress,
  abi: MULTICALL3_ABI,
  functionName: 'aggregate3',
  args: [calls]
});

// 解析结果
const usdpBalance = formatUnits(results[0].returnData, 18);
const paimonBalance = formatUnits(results[1].returnData, 18);
const veNFTCount = Number(results[2].returnData);
```

### 2. 代币批准优化

```javascript
// ❌ 每次交易都批准精确数量（浪费 gas）
await approve(addresses.PSM, parseUnits('1000', 6));
await swap('1000');

// ✅ 批准无限额度（仅一次 gas 成本）
const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
await approve(addresses.PSM, MAX_UINT256);
await swap('1000');
await swap('2000'); // 无需再次批准
```

---

## 🧪 测试环境

### Testnet Faucet

- **BNB Faucet**: https://testnet.bnbchain.org/faucet-smart
- **测试 USDC**: 合约地址 `0xaa3F4B0cEF6F8f4C584cc6fD3A5e79E68dAa13b2` (BSC Testnet，6 decimals)
  - 获取方式: 联系团队 Discord 频道 #testnet-faucet

### 测试工具

- **Remix IDE**: https://remix.ethereum.org (连接 BSC Testnet)
- **Tenderly Simulator**: https://dashboard.tenderly.co (模拟交易)
- **BSCScan Testnet**: https://testnet.bscscan.com (区块浏览器)

---

## 📞 技术支持

- **Discord**: https://discord.gg/paimon-dex (开发者频道: #integrations)
- **GitHub Issues**: https://github.com/paimon-dex/contracts/issues
- **Email**: integrations@paimon.dex (技术集成咨询)
- **文档更新**: 每周五更新，跟随主网部署

---

## 📝 变更日志

### v1.0 (2025-11-17)
- 初始版本发布
- 覆盖 34 个已部署合约
- 包含 6 大模块完整 API 规范
- 提供 Viem v2 集成示例

---

**下一步**: 查看各模块详细 API 文档 → [稳定币模块 API](./stablecoin-api.md)
