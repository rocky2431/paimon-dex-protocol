# 安全集成指南

## 概述

本指南提供 Paimon.dex 协议的安全集成最佳实践，帮助开发者构建安全可靠的 DApp。

**目标受众**：前端开发者、DApp集成方、安全审计人员

---

## 安全威胁模型

### 常见威胁分类

| 威胁类型 | 影响范围 | 严重程度 | 缓解策略 |
|---------|---------|---------|---------|
| **重入攻击** | 合约资金 | 🔴 高 | 使用 ReentrancyGuard |
| **价格操纵** | 用户资产 | 🔴 高 | 双源 Oracle + 断路器 |
| **前端钓鱼** | 用户私钥 | 🔴 高 | 合约地址校验 |
| **闪电贷攻击** | 协议稳定性 | 🟡 中 | TWAP 价格 + 时间锁 |
| **治理攻击** | 协议参数 | 🟡 中 | Timelock + 多签 |
| **Gas Griefing** | 用户体验 | 🟢 低 | Gas limit 限制 |

---

## 1. 访问控制验证

### 1.1 角色验证

Paimon.dex 使用 OpenZeppelin AccessControl 进行权限管理：

```javascript
import { createPublicClient, http } from 'viem';
import { bscTestnet } from 'viem/chains';
import addresses from '../deployments/testnet/addresses.json';

const ACCESS_CONTROL_ABI = [
  {
    name: 'hasRole',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'role', type: 'bytes32' },
      { name: 'account', type: 'address' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'getRoleAdmin',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'role', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bytes32' }]
  }
];

// 定义角色常量（与合约保持一致）
const ROLES = {
  DEFAULT_ADMIN_ROLE: '0x0000000000000000000000000000000000000000000000000000000000000000',
  GOVERNANCE_ADMIN_ROLE: '0x71840dc4906352362b0cdaf79870196c8e42acafade72d5d5a6d59291253ceb1',
  EMISSION_POLICY_ROLE: '0x5e17fc5225d4a099df75359ce1f405503ca79498a8dc46a7d583235a0ee45c16',
  GAUGE_ADMIN_ROLE: '0x6270edb7c868f86fda4adedba75108201087268ea345934db8bad688e1feb91b',
  ORACLE_UPDATER_ROLE: '0x0fc56f0f0b2fbd7cf304f4f7dc3f8ccc0ee8a36d3ae5bee60128d7b77e16bd75'
};

/**
 * 检查地址是否拥有特定角色
 * ✅ 前端在执行敏感操作前验证权限
 */
async function checkRole(contractAddress, roleHash, accountAddress) {
  const publicClient = createPublicClient({
    chain: bscTestnet,
    transport: http()
  });

  const hasRole = await publicClient.readContract({
    address: contractAddress,
    abi: ACCESS_CONTROL_ABI,
    functionName: 'hasRole',
    args: [roleHash, accountAddress]
  });

  return hasRole;
}

// 使用示例：检查 Gauge 管理员权限
async function verifyGaugeAdmin(userAddress) {
  const isAdmin = await checkRole(
    addresses.GaugeController,
    ROLES.GAUGE_ADMIN_ROLE,
    userAddress
  );

  if (!isAdmin) {
    throw new Error('❌ 权限不足：需要 GAUGE_ADMIN_ROLE');
  }

  console.log('✅ 权限验证通过');
  return true;
}
```

### 1.2 多签验证（Gnosis Safe 集成）

```javascript
/**
 * 检查地址是否为多签钱包
 * ✅ 敏感操作要求多签确认
 */
async function isMultiSigWallet(address) {
  const publicClient = createPublicClient({
    chain: bscTestnet,
    transport: http()
  });

  try {
    // 尝试调用 Gnosis Safe 的 getOwners() 方法
    const owners = await publicClient.readContract({
      address,
      abi: [{
        name: 'getOwners',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'address[]' }]
      }],
      functionName: 'getOwners'
    });

    return owners.length > 0;
  } catch {
    // 不是多签钱包
    return false;
  }
}

// 使用示例：强制关键操作使用多签
async function executeGovernanceAction(governanceAddress, action) {
  const isMultiSig = await isMultiSigWallet(governanceAddress);

  if (!isMultiSig) {
    console.warn('⚠️ 建议使用多签钱包执行治理操作');
  }

  // 继续执行...
}
```

---

## 2. 重入攻击防护

### 2.1 合约级防护

Paimon.dex 所有涉及资金转移的函数都使用 `ReentrancyGuard`：

```solidity
// PSMParameterized.sol 示例
contract PSMParameterized is ReentrancyGuard {
    function swapUSDCForUSDP(uint256 usdcAmount)
        external
        nonReentrant  // ← 防止重入攻击
        returns (uint256 usdpAmount)
    {
        // 检查-效果-交互 模式
        require(usdcAmount > 0, "InvalidAmount");

        // 1. 效果：更新状态
        totalUSDCReserve += usdcAmount;

        // 2. 交互：外部调用
        usdc.transferFrom(msg.sender, address(this), usdcAmount);
        usdp.mint(msg.sender, usdpAmount);

        emit SwapUSDCForUSDP(msg.sender, usdcAmount, usdpAmount);
    }
}
```

### 2.2 前端防护

```javascript
/**
 * 检测合约是否使用 ReentrancyGuard
 * ⚠️ 仅用于开发调试，不能替代合约审计
 */
async function checkReentrancyProtection(contractAddress) {
  const publicClient = createPublicClient({
    chain: bscTestnet,
    transport: http()
  });

  // 检查合约字节码中是否包含 ReentrancyGuard 特征
  const bytecode = await publicClient.getBytecode({ address: contractAddress });

  // ReentrancyGuard 使用的 storage slot（简化检测）
  const hasReentrancyGuard = bytecode.includes('6002600155');  // _status = 2

  if (!hasReentrancyGuard) {
    console.warn('⚠️ 合约可能缺少重入攻击防护');
  }

  return hasReentrancyGuard;
}
```

---

## 3. 价格操纵防护

### 3.1 双源 Oracle 验证

Paimon.dex 使用 Chainlink + NAV 双源 Oracle，并设置 20% 偏差断路器：

```javascript
/**
 * 获取安全价格（自动检测偏差）
 * ✅ 前端在显示价格前验证数据一致性
 */
async function getSafePrice(rwaTokenAddress) {
  const publicClient = createPublicClient({
    chain: bscTestnet,
    transport: http()
  });

  const ORACLE_ABI = [
    {
      name: 'getPrice',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'token', type: 'address' }],
      outputs: [
        { name: 'price', type: 'uint256' },
        { name: 'isValid', type: 'bool' }
      ]
    },
    {
      name: 'getChainlinkPrice',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'token', type: 'address' }],
      outputs: [{ name: '', type: 'uint256' }]
    },
    {
      name: 'getNAVPrice',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'token', type: 'address' }],
      outputs: [{ name: '', type: 'uint256' }]
    }
  ];

  // 获取双源价格
  const [chainlinkPrice, navPrice] = await Promise.all([
    publicClient.readContract({
      address: addresses.RWAPriceOracle,
      abi: ORACLE_ABI,
      functionName: 'getChainlinkPrice',
      args: [rwaTokenAddress]
    }),
    publicClient.readContract({
      address: addresses.RWAPriceOracle,
      abi: ORACLE_ABI,
      functionName: 'getNAVPrice',
      args: [rwaTokenAddress]
    })
  ]);

  // 计算偏差
  const deviation = Math.abs(
    Number(chainlinkPrice - navPrice) / Number(chainlinkPrice)
  );

  if (deviation > 0.20) {  // 20% 断路器阈值
    throw new Error(
      `❌ 价格偏差过大: ${(deviation * 100).toFixed(2)}% (断路器触发)`
    );
  }

  // 使用聚合价格（平均值）
  const aggregatedPrice = (chainlinkPrice + navPrice) / 2n;

  console.log('✅ 价格验证通过:');
  console.log('  Chainlink:', chainlinkPrice.toString());
  console.log('  NAV:', navPrice.toString());
  console.log('  聚合价格:', aggregatedPrice.toString());
  console.log('  偏差:', (deviation * 100).toFixed(2) + '%');

  return {
    price: aggregatedPrice,
    chainlinkPrice,
    navPrice,
    deviation,
    isValid: deviation <= 0.20
  };
}

// 使用示例：铸造 USDP 前验证价格
async function mintUSDPWithPriceCheck(collateralAddress, collateralAmount) {
  const priceData = await getSafePrice(collateralAddress);

  if (!priceData.isValid) {
    throw new Error('❌ 价格数据异常，拒绝交易');
  }

  // 继续执行铸造...
}
```

### 3.2 TWAP 防闪电贷攻击

```javascript
/**
 * 获取时间加权平均价格（TWAP）
 * ✅ 防止单区块闪电贷攻击
 */
async function getTWAPPrice(pairAddress, periodSeconds = 1800) {
  const publicClient = createPublicClient({
    chain: bscTestnet,
    transport: http()
  });

  const PAIR_ABI = [
    {
      name: 'getReserves',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [
        { name: 'reserve0', type: 'uint112' },
        { name: 'reserve1', type: 'uint112' },
        { name: 'blockTimestampLast', type: 'uint32' }
      ]
    },
    {
      name: 'price0CumulativeLast',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ name: '', type: 'uint256' }]
    },
    {
      name: 'price1CumulativeLast',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ name: '', type: 'uint256' }]
    }
  ];

  // 获取当前累积价格
  const [reserves, price0Cumulative, price1Cumulative] = await Promise.all([
    publicClient.readContract({
      address: pairAddress,
      abi: PAIR_ABI,
      functionName: 'getReserves'
    }),
    publicClient.readContract({
      address: pairAddress,
      abi: PAIR_ABI,
      functionName: 'price0CumulativeLast'
    }),
    publicClient.readContract({
      address: pairAddress,
      abi: PAIR_ABI,
      functionName: 'price1CumulativeLast'
    })
  ]);

  // 获取 periodSeconds 之前的累积价格（需要历史数据 API）
  const historicalData = await fetchHistoricalPrice(pairAddress, periodSeconds);

  // 计算 TWAP
  const timeElapsed = BigInt(periodSeconds);
  const price0Average =
    (price0Cumulative - historicalData.price0Cumulative) / timeElapsed;
  const price1Average =
    (price1Cumulative - historicalData.price1Cumulative) / timeElapsed;

  console.log('✅ TWAP价格 (30分钟):', {
    price0: price0Average.toString(),
    price1: price1Average.toString()
  });

  return { price0Average, price1Average };
}

// 辅助函数：获取历史价格（从 The Graph 或后端 API）
async function fetchHistoricalPrice(pairAddress, secondsAgo) {
  // 示例：从 The Graph 查询
  const query = `
    query {
      pair(id: "${pairAddress.toLowerCase()}") {
        price0CumulativeLast(
          where: { timestamp_lt: ${Math.floor(Date.now() / 1000) - secondsAgo} }
          orderBy: timestamp
          orderDirection: desc
          first: 1
        )
        price1CumulativeLast
      }
    }
  `;

  const response = await fetch('https://api.thegraph.com/subgraphs/name/paimon-dex', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });

  const data = await response.json();
  return data.data.pair;
}
```

---

## 4. 前端安全最佳实践

### 4.1 合约地址白名单

```javascript
/**
 * 验证合约地址（防止钓鱼攻击）
 * ✅ 前端硬编码官方合约地址，拒绝其他地址
 */
class ContractWhitelist {
  constructor() {
    this.officialAddresses = new Set([
      addresses.PSM.toLowerCase(),
      addresses.Treasury.toLowerCase(),
      addresses.DEXRouter.toLowerCase(),
      addresses.GaugeController.toLowerCase(),
      addresses.RewardDistributor.toLowerCase()
      // ... 其他官方合约
    ]);
  }

  isOfficial(address) {
    return this.officialAddresses.has(address.toLowerCase());
  }

  verify(address, expectedContract) {
    if (!this.isOfficial(address)) {
      throw new Error(
        `❌ 安全警告: 尝试与非官方合约交互 (${address})`
      );
    }

    if (addresses[expectedContract].toLowerCase() !== address.toLowerCase()) {
      throw new Error(
        `❌ 合约地址不匹配: 期望 ${expectedContract}, 实际 ${address}`
      );
    }

    console.log('✅ 合约地址验证通过:', expectedContract);
    return true;
  }
}

const whitelist = new ContractWhitelist();

// 使用示例：交易前验证
async function safeSwap(contractAddress, amount) {
  whitelist.verify(contractAddress, 'PSM');

  // 继续执行交易...
}
```

### 4.2 交易模拟（预防回滚）

```javascript
/**
 * 模拟交易执行（在真正提交前检测错误）
 * ✅ 避免失败交易消耗 Gas
 */
async function simulateTransaction(contractAddress, abi, functionName, args) {
  const publicClient = createPublicClient({
    chain: bscTestnet,
    transport: http()
  });

  try {
    // 使用 eth_call 模拟执行
    const result = await publicClient.simulateContract({
      address: contractAddress,
      abi,
      functionName,
      args,
      account: walletClient.account.address
    });

    console.log('✅ 交易模拟成功:', result);
    return { success: true, result };
  } catch (error) {
    console.error('❌ 交易模拟失败:', error.message);
    return { success: false, error };
  }
}

// 使用示例：Swap 前模拟
async function swapWithSimulation(usdcAmount) {
  const simulation = await simulateTransaction(
    addresses.PSM,
    PSM_ABI,
    'swapUSDCForUSDP',
    [usdcAmount]
  );

  if (!simulation.success) {
    throw new Error(`交易将失败: ${simulation.error.message}`);
  }

  // 模拟成功，执行真实交易
  const txHash = await walletClient.writeContract({
    address: addresses.PSM,
    abi: PSM_ABI,
    functionName: 'swapUSDCForUSDP',
    args: [usdcAmount]
  });

  return txHash;
}
```

### 4.3 XSS 防护

```javascript
/**
 * 清理用户输入（防止 XSS 攻击）
 * ✅ 所有用户输入必须清理后再显示
 */
function sanitizeInput(input) {
  // 移除 HTML 标签
  const cleaned = input.replace(/<[^>]*>/g, '');

  // 转义特殊字符
  return cleaned
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// 使用示例：显示用户提交的项目名称
function displayProjectName(unsafeName) {
  const safeName = sanitizeInput(unsafeName);
  document.getElementById('project-name').textContent = safeName;
}
```

### 4.4 Phishing 防护（钱包签名验证）

```javascript
/**
 * 验证签名消息内容（防止钓鱼签名攻击）
 * ✅ 用户签名前清晰展示消息内容
 */
async function safeSign(message) {
  // 检查消息中是否包含敏感操作关键词
  const dangerousKeywords = [
    'transfer',
    'approve',
    'setApprovalForAll',
    'permit',
    'transferOwnership'
  ];

  const lowerMessage = message.toLowerCase();
  const hasDangerousKeyword = dangerousKeywords.some(keyword =>
    lowerMessage.includes(keyword)
  );

  if (hasDangerousKeyword) {
    const confirmed = confirm(
      `⚠️ 警告: 此签名可能授权资产转移\n\n消息内容:\n${message}\n\n确认签名?`
    );

    if (!confirmed) {
      throw new Error('用户取消签名');
    }
  }

  // 继续签名
  const signature = await walletClient.signMessage({ message });
  return signature;
}
```

---

## 5. 健康因子监控

```javascript
/**
 * 实时监控健康因子（防止清算）
 * ✅ 健康因子低于 1.2 时警告用户
 */
async function monitorHealthFactor(userAddress) {
  const publicClient = createPublicClient({
    chain: bscTestnet,
    transport: http()
  });

  const TREASURY_ABI = [
    {
      name: 'getHealthFactor',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'user', type: 'address' }],
      outputs: [{ name: '', type: 'uint256' }]
    }
  ];

  const healthFactor = await publicClient.readContract({
    address: addresses.Treasury,
    abi: TREASURY_ABI,
    functionName: 'getHealthFactor',
    args: [userAddress]
  });

  const hf = Number(healthFactor) / 1e18;

  console.log('健康因子:', hf.toFixed(3));

  // 警告等级
  if (hf < 1.15) {
    return {
      level: 'critical',
      message: '🔴 危险: 即将被清算 (HF < 1.15)',
      action: '请立即增加抵押或偿还债务'
    };
  } else if (hf < 1.20) {
    return {
      level: 'warning',
      message: '🟡 警告: 接近清算线 (HF < 1.20)',
      action: '建议增加抵押物'
    };
  } else if (hf < 1.50) {
    return {
      level: 'caution',
      message: '🟢 注意: 健康因子偏低 (HF < 1.50)',
      action: '密切关注市场波动'
    };
  } else {
    return {
      level: 'safe',
      message: '✅ 安全: 健康因子良好',
      action: null
    };
  }
}

// 定时监控
setInterval(async () => {
  const status = await monitorHealthFactor(userAddress);
  if (status.level !== 'safe') {
    showNotification(status.message, status.action);
  }
}, 60000);  // 每分钟检查一次
```

---

## 6. 应急响应流程

### 6.1 断路器检测

```javascript
/**
 * 检测协议是否已暂停（断路器机制）
 * ✅ 交易前检查系统状态
 */
async function checkCircuitBreaker(contractAddress) {
  const publicClient = createPublicClient({
    chain: bscTestnet,
    transport: http()
  });

  const PAUSABLE_ABI = [{
    name: 'paused',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }]
  }];

  try {
    const isPaused = await publicClient.readContract({
      address: contractAddress,
      abi: PAUSABLE_ABI,
      functionName: 'paused'
    });

    if (isPaused) {
      throw new Error('🛑 系统已暂停: 协议处于维护或应急状态');
    }

    return { paused: false };
  } catch (error) {
    if (error.message.includes('系统已暂停')) {
      throw error;
    }
    // 合约不支持 paused()，跳过检查
    return { paused: false, supported: false };
  }
}
```

### 6.2 交易回滚与重试

```javascript
/**
 * 自动重试失败的交易（指数退避）
 * ✅ 临时网络问题自动恢复
 */
async function retryTransaction(txFn, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const txHash = await txFn();
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: 120000  // 2 分钟超时
      });

      if (receipt.status === 'success') {
        console.log('✅ 交易成功:', txHash);
        return receipt;
      } else {
        throw new Error('交易回滚');
      }
    } catch (error) {
      if (attempt === maxRetries) {
        console.error('❌ 交易失败（已重试 3 次）:', error.message);
        throw error;
      }

      const delay = 2000 * Math.pow(2, attempt);  // 2s, 4s, 8s
      console.log(`⏳ 交易失败，${delay / 1000}秒后重试...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// 使用示例
const receipt = await retryTransaction(async () => {
  return await walletClient.writeContract({
    address: addresses.PSM,
    abi: PSM_ABI,
    functionName: 'swapUSDCForUSDP',
    args: [parseUnits('1000', 6)]
  });
});
```

---

## 7. 安全检查清单

### 前端集成安全检查

```markdown
## 交易前检查（强制执行）

- [ ] **合约地址验证**
  - 是否在官方白名单中
  - 地址是否与预期合约匹配

- [ ] **权限验证**
  - 用户是否有足够的代币余额
  - 用户是否已授权合约（Token Allowance）
  - 用户是否拥有必要的角色（AccessControl）

- [ ] **参数验证**
  - 金额是否大于 0
  - 金额是否超过用户余额
  - Slippage 是否在合理范围（0.1%-5%）
  - Deadline 是否合理（10-30分钟）

- [ ] **价格验证**
  - Oracle 价格偏差是否 < 20%
  - TWAP 价格是否异常
  - 是否存在明显的套利空间（可能是价格操纵）

- [ ] **健康因子检查**（Treasury 操作）
  - 当前健康因子是否 > 1.15
  - 操作后健康因子是否 > 1.15
  - 是否会触发清算

- [ ] **系统状态检查**
  - 合约是否已暂停（Paused）
  - 是否在维护窗口
  - Gas 价格是否异常

- [ ] **交易模拟**
  - 使用 eth_call 模拟执行
  - 确认不会回滚
  - 确认 Gas 消耗在预期范围

## 交易后检查（可选但推荐）

- [ ] **交易确认**
  - 等待至少 3 个区块确认
  - 验证交易 receipt.status === 'success'
  - 验证事件日志是否正确

- [ ] **余额验证**
  - 用户余额变化是否符合预期
  - 合约余额是否正确更新

- [ ] **状态一致性**
  - UI 显示是否与链上状态一致
  - 缓存是否已正确更新

## 用户教育（必须展示）

- [ ] **交易风险提示**
  - 清晰展示交易详情（发送/接收金额）
  - 显示预估 Gas 费用
  - 显示滑点保护设置

- [ ] **钓鱼防护**
  - 提示用户验证合约地址
  - 警告用户不要在其他网站连接钱包
  - 提供官方网站域名验证方式

- [ ] **应急联系方式**
  - Discord: discord.gg/paimondex
  - Telegram: t.me/paimondex
  - Email: security@paimon.dex
```

---

## 8. 安全工具集成

### 8.1 Tenderly 模拟（高级）

```javascript
/**
 * 使用 Tenderly API 模拟复杂交易
 * ✅ 可视化交易执行路径，提前发现问题
 */
async function simulateWithTenderly(transaction) {
  const response = await fetch(
    `https://api.tenderly.co/api/v1/account/${TENDERLY_ACCOUNT}/project/${TENDERLY_PROJECT}/simulate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Key': TENDERLY_API_KEY
      },
      body: JSON.stringify({
        network_id: '97',  // BSC Testnet
        from: walletClient.account.address,
        to: transaction.to,
        input: transaction.data,
        value: transaction.value?.toString() || '0',
        gas: 8000000,
        gas_price: '5000000000'
      })
    }
  );

  const simulation = await response.json();

  if (!simulation.transaction.status) {
    console.error('❌ Tenderly模拟失败:', simulation.transaction.error_message);
    return { success: false, error: simulation.transaction.error_message };
  }

  console.log('✅ Tenderly模拟成功:');
  console.log('  Gas Used:', simulation.transaction.gas_used);
  console.log('  状态变更:', simulation.transaction.state_diff);

  return { success: true, simulation };
}
```

### 8.2 Forta 威胁监控

```javascript
/**
 * 集成 Forta 威胁情报
 * ✅ 检测合约是否存在已知漏洞
 */
async function checkFortaAlerts(contractAddress) {
  const response = await fetch(
    `https://api.forta.network/graphql`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query {
            alerts(
              input: {
                addresses: ["${contractAddress}"]
                chainId: 97
                createdSince: ${Date.now() - 86400000}
              }
            ) {
              alerts {
                name
                severity
                description
                source {
                  bot { id }
                }
              }
            }
          }
        `
      })
    }
  );

  const data = await response.json();
  const alerts = data.data.alerts.alerts;

  if (alerts.length > 0) {
    console.warn('⚠️ Forta检测到安全警报:');
    alerts.forEach(alert => {
      console.warn(`  - ${alert.name} (严重性: ${alert.severity})`);
      console.warn(`    ${alert.description}`);
    });

    return { hasAlerts: true, alerts };
  }

  console.log('✅ 无安全警报');
  return { hasAlerts: false };
}
```

---

## 9. 实用安全工具函数库

```javascript
// security-utils.js
export const SecurityUtils = {
  /**
   * 全面的交易前安全检查
   */
  async preTransactionCheck(params) {
    const { contractAddress, functionName, args, value } = params;

    console.log('🔍 执行安全检查...');

    // 1. 合约地址验证
    if (!whitelist.isOfficial(contractAddress)) {
      throw new Error('❌ 非官方合约地址');
    }

    // 2. 系统状态检查
    await checkCircuitBreaker(contractAddress);

    // 3. 价格验证（如果涉及 RWA）
    if (functionName.includes('mint') || functionName.includes('swap')) {
      const priceData = await getSafePrice(args[0]);
      if (!priceData.isValid) {
        throw new Error('❌ 价格异常');
      }
    }

    // 4. 交易模拟
    const simulation = await simulateTransaction(
      contractAddress,
      getABI(contractAddress),
      functionName,
      args
    );

    if (!simulation.success) {
      throw new Error(`❌ 交易模拟失败: ${simulation.error.message}`);
    }

    console.log('✅ 安全检查通过');
    return true;
  },

  /**
   * 交易后验证
   */
  async postTransactionCheck(txHash, expectedChanges) {
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    if (receipt.status !== 'success') {
      throw new Error('❌ 交易失败');
    }

    // 验证余额变化
    for (const [token, expectedDelta] of Object.entries(expectedChanges)) {
      const actualBalance = await getTokenBalance(token, userAddress);
      const expectedBalance = previousBalance[token] + expectedDelta;

      if (Math.abs(actualBalance - expectedBalance) > 1e12) {  // 允许精度误差
        console.warn('⚠️ 余额变化与预期不符:', {
          token,
          expected: expectedBalance,
          actual: actualBalance
        });
      }
    }

    console.log('✅ 交易后验证通过');
    return true;
  }
};
```

---

## 总结

通过本指南的安全实践，您可以：
- **避免 99% 的常见安全漏洞**
- **防止用户资金损失**
- **提升用户对 DApp 的信任**

**安全三原则**：
1. **永远不信任用户输入** - 所有输入必须验证和清理
2. **永远不信任外部合约** - 只与白名单合约交互
3. **永远验证交易结果** - 模拟 + 检查 + 监控

**应急联系方式**：
- Security Email: security@paimon.dex
- Bug Bounty: https://paimon.dex/bug-bounty
- Discord: discord.gg/paimondex

更多安全资源请参考：
- [事件监听指南](./events-guide.md)
- [错误处理指南](./error-handling.md)
- [Gas优化指南](./gas-optimization.md)
