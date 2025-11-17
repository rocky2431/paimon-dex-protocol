# 错误处理指南

**专题**: Error Handling & Recovery
**版本**: v1.0
**最后更新**: 2025-11-17
**目标读者**: 前端开发者、集成开发者

---

## 📋 目录

1. [错误分类索引](#1-错误分类索引)
2. [错误解析与处理](#2-错误解析与处理)
3. [用户友好提示](#3-用户友好提示)
4. [自动重试策略](#4-自动重试策略)
5. [错误监控与告警](#5-错误监控与告警)

---

## 1. 错误分类索引

### 1.1 通用错误

```solidity
// 零地址
error ZeroAddress();

// 零数量
error ZeroAmount();

// 未授权
error Unauthorized();

// 合约已暂停
error Paused();

// 已过截止时间
error Expired(uint256 deadline);
```

**处理建议**:
- `ZeroAddress` / `ZeroAmount` → 前端输入验证
- `Unauthorized` → 检查账户权限/连接钱包
- `Paused` → 显示"系统维护中"提示
- `Expired` → 提示用户增加截止时间

---

### 1.2 PSM 错误

```solidity
// 储备不足
error InsufficientUSDCInReserve(
    uint256 requested,  // 请求数量
    uint256 available   // 可用数量
);

// 超出兑换限额
error ExceedsSwapLimit(
    uint256 amount,     // 兑换数量
    uint256 limit       // 每日限额
);
```

**处理示例**:
```javascript
try {
  await swapUSDCForUSDP('1000000'); // 尝试兑换 100 万 USDC
} catch (error) {
  if (error.message.includes('InsufficientUSDCInReserve')) {
    const match = error.message.match(/requested: (\d+), available: (\d+)/);
    const available = formatUnits(match[2], 6);

    showError(`PSM 储备不足`, {
      message: `当前可兑换上限: ${available} USDC`,
      suggestion: '建议分批兑换或稍后重试',
      action: {
        label: '兑换可用数量',
        callback: () => swapUSDCForUSDP(available)
      }
    });
  }

  if (error.message.includes('ExceedsSwapLimit')) {
    const match = error.message.match(/limit: (\d+)/);
    const dailyLimit = formatUnits(match[1], 6);

    showError(`超出每日兑换限额`, {
      message: `每日限额: ${dailyLimit} USDC`,
      suggestion: '请明天再试或分批兑换'
    });
  }
}
```

---

### 1.3 veNFT 错误

```solidity
// 锁定时长过短
error LockDurationTooShort(
    uint256 duration,   // 实际时长
    uint256 minimum     // 最小时长
);

// 锁定时长过长
error LockDurationTooLong(
    uint256 duration,
    uint256 maximum
);

// 锁定未到期
error LockNotExpired(
    uint256 tokenId,
    uint256 lockEnd     // 到期时间戳
);

// 非 NFT 持有者
error NotOwner(uint256 tokenId);
```

**处理示例**:
```javascript
try {
  await createVeNFT('1000', 0.5); // 尝试锁定 0.5 周（无效）
} catch (error) {
  if (error.message.includes('LockDurationTooShort')) {
    const match = error.message.match(/minimum: (\d+)/);
    const minWeeks = Number(match[1]) / (7 * 24 * 3600);

    showError(`锁定时长不足`, {
      message: `最小锁定时长: ${minWeeks} 周`,
      suggestion: `建议锁定至少 ${minWeeks} 周以获得投票权`,
      action: {
        label: `锁定 ${minWeeks} 周`,
        callback: () => createVeNFT('1000', minWeeks)
      }
    });
  }

  if (error.message.includes('LockNotExpired')) {
    const match = error.message.match(/lockEnd: (\d+)/);
    const lockEnd = Number(match[1]);
    const now = Math.floor(Date.now() / 1000);
    const daysRemaining = Math.floor((lockEnd - now) / 86400);

    showError(`锁定尚未到期`, {
      message: `剩余时间: ${daysRemaining} 天`,
      suggestion: `到期日: ${new Date(lockEnd * 1000).toLocaleDateString()}`,
      action: {
        label: '提前解锁（扣除 50% 罚金）',
        callback: () => confirmEmergencyUnstake()
      }
    });
  }
}
```

---

### 1.4 Treasury 错误

```solidity
// 抵押品不足（健康因子过低）
error InsufficientCollateral(uint256 healthFactor);

// 不支持的抵押品类型
error UnsupportedCollateralType(address asset);

// 预言机价格过期
error OraclePriceStale(address oracle);

// 超出债务上限
error ExceedsDebtCeiling(
    uint256 amount,
    uint256 ceiling
);
```

**处理示例**:
```javascript
try {
  await mintUSDP('1000');
} catch (error) {
  if (error.message.includes('InsufficientCollateral')) {
    const match = error.message.match(/healthFactor: ([\d.]+)/);
    const hf = parseFloat(match[1]);

    const recommendation = hf < 1.15
      ? '立即增加抵押品或偿还债务，否则将被清算'
      : '建议增加抵押品以提高安全边际';

    showError(`抵押品不足`, {
      message: `当前健康因子: ${hf.toFixed(3)}`,
      severity: hf < 1.15 ? 'critical' : 'warning',
      suggestion: recommendation,
      actions: [
        {
          label: '增加抵押品',
          callback: () => openDepositModal()
        },
        {
          label: '偿还部分债务',
          callback: () => openRepayModal()
        },
        {
          label: '减少铸造数量',
          callback: () => adjustMintAmount(hf)
        }
      ]
    });
  }

  if (error.message.includes('OraclePriceStale')) {
    showError(`价格数据过期`, {
      message: '无法获取最新 RWA 资产价格',
      suggestion: '请稍后重试或联系团队',
      action: {
        label: '刷新价格',
        callback: async () => {
          // 等待 Oracle 更新
          await new Promise(r => setTimeout(r, 60000));
          location.reload();
        }
      }
    });
  }
}
```

---

### 1.5 Gauge 错误

```solidity
// 投票权不足
error VotingPowerInsufficient(
    uint256 required,
    uint256 available
);

// 权重无效（总和 ≠ 10000）
error InvalidWeights(uint256 totalWeight);

// 投票间隔过短
error TooSoonToVote(uint256 nextVoteTime);

// Gauge 未注册
error GaugeNotRegistered(address gauge);
```

**处理示例**:
```javascript
try {
  await voteForGauges(42, [gauge1, gauge2], [6000, 5000]); // 权重总和 > 10000
} catch (error) {
  if (error.message.includes('InvalidWeights')) {
    const match = error.message.match(/totalWeight: (\d+)/);
    const totalWeight = Number(match[1]);

    showError(`权重分配错误`, {
      message: `权重总和必须为 10000 (100%)`,
      current: `当前总和: ${totalWeight}`,
      suggestion: '请重新调整各池权重',
      action: {
        label: '自动归一化',
        callback: () => normalizeWeights([6000, 5000])
      }
    });
  }

  if (error.message.includes('TooSoonToVote')) {
    const match = error.message.match(/nextVoteTime: (\d+)/);
    const nextVoteTime = Number(match[1]);
    const now = Math.floor(Date.now() / 1000);
    const hoursRemaining = Math.ceil((nextVoteTime - now) / 3600);

    showError(`投票冷却中`, {
      message: `距下次投票: ${hoursRemaining} 小时`,
      suggestion: `可投票时间: ${new Date(nextVoteTime * 1000).toLocaleString()}`
    });
  }
}
```

---

### 1.6 Reward 错误

```solidity
// Merkle 证明无效
error InvalidProof();

// 已领取
error AlreadyClaimed(
    uint256 epoch,
    address user
);

// Merkle Root 未设置
error MerkleRootNotSet(uint256 epoch);

// Epoch 未开始
error EpochNotStarted(uint256 epoch);
```

**处理示例**:
```javascript
try {
  await claimRewards(10, proof, amount);
} catch (error) {
  if (error.message.includes('AlreadyClaimed')) {
    const match = error.message.match(/epoch: (\d+)/);
    const epoch = match[1];

    showError(`已领取奖励`, {
      message: `Epoch ${epoch} 奖励已领取`,
      suggestion: '请查看其他未领取的 Epoch'
    });
  }

  if (error.message.includes('InvalidProof')) {
    showError(`证明验证失败`, {
      message: 'Merkle 证明无效',
      suggestion: '可能是数据同步延迟，请刷新页面重试',
      action: {
        label: '重新获取证明',
        callback: async () => {
          const newProof = await fetchProofFromAPI(epoch);
          await claimRewards(epoch, newProof, amount);
        }
      }
    });
  }

  if (error.message.includes('MerkleRootNotSet')) {
    showError(`奖励数据未就绪`, {
      message: `Epoch ${epoch} 奖励分配尚未完成`,
      suggestion: '请等待治理发布 Merkle Root'
    });
  }
}
```

---

### 1.7 Launchpad 错误

```solidity
// 未通过 KYC
error NotWhitelisted(address user);

// 认购期未开始/已结束
error IssuanceNotActive(uint256 projectId);

// 低于最小投资额
error BelowMinimumInvestment(
    uint256 amount,
    uint256 minimum
);

// 超出募资目标
error ExceedsTargetRaise(
    uint256 raised,
    uint256 target
);

// 未到期
error NotMatured(
    uint256 projectId,
    uint256 maturityDate
);
```

**处理示例**:
```javascript
try {
  await participateInLaunchpad(42, '50'); // 尝试投资 50 USDC
} catch (error) {
  if (error.message.includes('NotWhitelisted')) {
    showError(`需要完成 KYC 认证`, {
      message: '参与 RWA 项目需要先完成身份验证',
      action: {
        label: '前往 KYC 认证',
        callback: () => window.open('https://kyc.paimon.dex', '_blank')
      }
    });
  }

  if (error.message.includes('BelowMinimumInvestment')) {
    const match = error.message.match(/minimum: (\d+)/);
    const minInvestment = formatUnits(match[1], 6);

    showError(`投资额不足`, {
      message: `最小投资额: ${minInvestment} USDC`,
      action: {
        label: `投资 ${minInvestment} USDC`,
        callback: () => participateInLaunchpad(42, minInvestment)
      }
    });
  }

  if (error.message.includes('IssuanceNotActive')) {
    showError(`认购期已结束`, {
      message: '该项目认购已关闭',
      suggestion: '请关注其他进行中的项目'
    });
  }
}
```

---

## 2. 错误解析与处理

### 2.1 统一错误解析器

```javascript
class ErrorParser {
  static parse(error) {
    // 1. 提取错误名称
    const errorName = this.extractErrorName(error.message);

    // 2. 提取参数
    const params = this.extractParams(error.message);

    // 3. 查找错误定义
    const errorDef = ERROR_DEFINITIONS[errorName];

    if (!errorDef) {
      return {
        name: 'UnknownError',
        message: error.message,
        userMessage: '发生未知错误，请联系团队'
      };
    }

    // 4. 生成用户友好消息
    return {
      name: errorName,
      params,
      userMessage: errorDef.userMessage(params),
      suggestion: errorDef.suggestion(params),
      actions: errorDef.actions(params)
    };
  }

  static extractErrorName(message) {
    // 匹配 Solidity 自定义错误: "Error: InvalidProof()"
    const match = message.match(/Error: (\w+)\(/);
    return match ? match[1] : null;
  }

  static extractParams(message) {
    // 匹配参数: "requested: 1000000, available: 500000"
    const params = {};
    const regex = /(\w+): ([\d.]+)/g;
    let match;

    while ((match = regex.exec(message)) !== null) {
      params[match[1]] = match[2];
    }

    return params;
  }
}

// 错误定义映射
const ERROR_DEFINITIONS = {
  InsufficientUSDCInReserve: {
    userMessage: (params) =>
      `PSM 储备不足，可兑换上限: ${formatUnits(params.available, 6)} USDC`,
    suggestion: () => '建议分批兑换或稍后重试',
    actions: (params) => [
      {
        label: '兑换可用数量',
        callback: () => swapUSDCForUSDP(formatUnits(params.available, 6))
      }
    ]
  },

  LockNotExpired: {
    userMessage: (params) => {
      const lockEnd = Number(params.lockEnd);
      const daysRemaining = Math.floor((lockEnd - Date.now() / 1000) / 86400);
      return `锁定尚未到期，剩余 ${daysRemaining} 天`;
    },
    suggestion: (params) => {
      const lockEnd = Number(params.lockEnd);
      return `到期日: ${new Date(lockEnd * 1000).toLocaleDateString()}`;
    },
    actions: () => [
      {
        label: '提前解锁（扣除 50% 罚金）',
        callback: () => confirmEmergencyUnstake()
      }
    ]
  },

  // ... 其他错误定义
};

// 使用示例
try {
  await swapUSDCForUSDP('1000000');
} catch (error) {
  const parsed = ErrorParser.parse(error);

  showErrorDialog({
    title: parsed.name,
    message: parsed.userMessage,
    suggestion: parsed.suggestion,
    actions: parsed.actions
  });
}
```

---

### 2.2 错误降级策略

```javascript
async function swapWithFallback(amount) {
  try {
    // 方案 1: PSM 零滑点兑换
    return await swapUSDCForUSDP(amount);
  } catch (error) {
    if (error.message.includes('InsufficientUSDCInReserve')) {
      console.warn('PSM 储备不足，尝试 DEX 兑换...');

      try {
        // 方案 2: DEX 兑换（有滑点）
        return await swapTokensViaDEX(
          addresses.USDC,
          addresses.USDP,
          amount,
          0.5 // 0.5% 滑点容忍度
        );
      } catch (dexError) {
        console.error('DEX 兑换也失败，尝试聚合器...');

        // 方案 3: 1inch 聚合器（最后手段）
        return await swapViaAggregator(
          addresses.USDC,
          addresses.USDP,
          amount
        );
      }
    }

    throw error; // 无法降级的错误
  }
}
```

---

## 3. 用户友好提示

### 3.1 错误 UI 组件

```jsx
// ErrorDialog.tsx
import { Dialog, Alert, Button, Stack } from '@mui/material';

interface ErrorAction {
  label: string;
  callback: () => void;
  variant?: 'contained' | 'outlined';
}

interface ErrorDialogProps {
  title: string;
  message: string;
  suggestion?: string;
  severity?: 'error' | 'warning' | 'info';
  actions?: ErrorAction[];
  onClose: () => void;
}

function ErrorDialog({
  title,
  message,
  suggestion,
  severity = 'error',
  actions = [],
  onClose
}: ErrorDialogProps) {
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <Alert severity={severity} sx={{ mb: 2 }}>
        <strong>{title}</strong>
      </Alert>

      <DialogContent>
        <Typography variant="body1" gutterBottom>
          {message}
        </Typography>

        {suggestion && (
          <Alert severity="info" sx={{ mt: 2 }}>
            💡 {suggestion}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose}>
            取消
          </Button>

          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'contained'}
              onClick={() => {
                action.callback();
                onClose();
              }}
            >
              {action.label}
            </Button>
          ))}
        </Stack>
      </DialogActions>
    </Dialog>
  );
}

// 使用
function showError(title, { message, suggestion, severity, actions }) {
  ReactDOM.render(
    <ErrorDialog
      title={title}
      message={message}
      suggestion={suggestion}
      severity={severity}
      actions={actions}
      onClose={() => ReactDOM.unmountComponentAtNode(document.getElementById('error-root'))}
    />,
    document.getElementById('error-root')
  );
}
```

---

### 3.2 进度式错误恢复

```javascript
// 多步骤操作的错误恢复
async function addLiquidityWithRecovery(tokenA, tokenB, amountA, amountB) {
  const steps = [
    {
      name: '批准 Token A',
      action: () => approveToken(tokenA, addresses.DEXRouter, amountA),
      onError: '请检查 Token A 余额是否充足'
    },
    {
      name: '批准 Token B',
      action: () => approveToken(tokenB, addresses.DEXRouter, amountB),
      onError: '请检查 Token B 余额是否充足'
    },
    {
      name: '添加流动性',
      action: () => addLiquidity(tokenA, tokenB, amountA, amountB),
      onError: '请检查滑点设置或稍后重试'
    }
  ];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    try {
      updateProgress(i + 1, steps.length, step.name);
      await step.action();
    } catch (error) {
      showError(`${step.name}失败`, {
        message: step.onError,
        actions: [
          {
            label: '重试此步骤',
            callback: async () => {
              // 从失败步骤重新开始
              for (let j = i; j < steps.length; j++) {
                await steps[j].action();
              }
            }
          },
          {
            label: '取消操作',
            callback: () => {}
          }
        ]
      });
      throw error;
    }
  }

  showSuccess('流动性添加成功！');
}
```

---

## 4. 自动重试策略

### 4.1 指数退避重试

```javascript
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // 不可重试的错误
      if (isNonRetryableError(error)) {
        throw error;
      }

      // 最后一次尝试失败
      if (attempt === maxRetries) {
        throw error;
      }

      // 计算延迟（指数退避）
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`重试 ${attempt + 1}/${maxRetries}，延迟 ${delay}ms...`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// 不可重试的错误
function isNonRetryableError(error) {
  const nonRetryableErrors = [
    'ZeroAmount',
    'NotOwner',
    'AlreadyClaimed',
    'NotWhitelisted',
    'InvalidWeights'
  ];

  return nonRetryableErrors.some(errName =>
    error.message.includes(errName)
  );
}

// 使用
try {
  await retryWithBackoff(() => claimRewards(10, proof, amount));
} catch (error) {
  showError('领取失败', {
    message: '多次尝试后仍然失败',
    suggestion: '请检查网络连接或稍后重试'
  });
}
```

---

### 4.2 断点续传

```javascript
// 保存操作状态到 localStorage
class TransactionResume {
  static save(key, state) {
    localStorage.setItem(`tx_${key}`, JSON.stringify({
      ...state,
      timestamp: Date.now()
    }));
  }

  static load(key) {
    const data = localStorage.getItem(`tx_${key}`);
    if (!data) return null;

    const state = JSON.parse(data);

    // 超过 1 小时的状态过期
    if (Date.now() - state.timestamp > 3600 * 1000) {
      localStorage.removeItem(`tx_${key}`);
      return null;
    }

    return state;
  }

  static clear(key) {
    localStorage.removeItem(`tx_${key}`);
  }
}

// 使用
async function addLiquidityWithResume(tokenA, tokenB, amountA, amountB) {
  const resumeKey = `addLiquidity_${tokenA}_${tokenB}`;

  // 尝试恢复之前的操作
  const savedState = TransactionResume.load(resumeKey);
  if (savedState) {
    const shouldResume = confirm(
      `检测到未完成的操作（步骤 ${savedState.step}/3），是否继续？`
    );

    if (shouldResume) {
      // 从上次中断的步骤继续
      return resumeFromStep(savedState.step, tokenA, tokenB, amountA, amountB);
    }
  }

  try {
    // 步骤 1: 批准 Token A
    TransactionResume.save(resumeKey, { step: 1 });
    await approveToken(tokenA, addresses.DEXRouter, amountA);

    // 步骤 2: 批准 Token B
    TransactionResume.save(resumeKey, { step: 2 });
    await approveToken(tokenB, addresses.DEXRouter, amountB);

    // 步骤 3: 添加流动性
    TransactionResume.save(resumeKey, { step: 3 });
    await addLiquidity(tokenA, tokenB, amountA, amountB);

    // 成功，清除保存的状态
    TransactionResume.clear(resumeKey);
  } catch (error) {
    // 保留状态以便下次恢复
    showError('操作中断', {
      message: '操作未完成，下次可以继续',
      suggestion: '刷新页面后会提示是否继续未完成的操作'
    });
    throw error;
  }
}
```

---

## 5. 错误监控与告警

### 5.1 Sentry 集成

```javascript
import * as Sentry from '@sentry/react';

// 初始化 Sentry
Sentry.init({
  dsn: 'https://...@sentry.io/...',
  environment: process.env.NODE_ENV,
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0,
});

// 捕获合约错误
async function executeContractCall(fn, context = {}) {
  try {
    return await fn();
  } catch (error) {
    // 解析错误
    const parsed = ErrorParser.parse(error);

    // 上报到 Sentry
    Sentry.captureException(error, {
      tags: {
        errorType: 'contract_error',
        errorName: parsed.name
      },
      contexts: {
        contract: context
      },
      extra: {
        params: parsed.params,
        userMessage: parsed.userMessage
      }
    });

    throw error;
  }
}

// 使用
await executeContractCall(
  () => swapUSDCForUSDP('1000'),
  {
    contract: 'PSM',
    function: 'swapUSDCForUSDP',
    user: walletAddress
  }
);
```

---

### 5.2 错误统计仪表板

```javascript
// 聚合错误数据
class ErrorMetrics {
  static async getTopErrors(days = 7) {
    // 从 Sentry API 获取数据
    const response = await fetch(
      `https://sentry.io/api/0/projects/.../events/?query=errorType:contract_error&days=${days}`,
      { headers: { 'Authorization': 'Bearer YOUR_TOKEN' } }
    );

    const events = await response.json();

    // 聚合统计
    const errorCounts = {};
    events.forEach(event => {
      const errorName = event.tags.errorName;
      errorCounts[errorName] = (errorCounts[errorName] || 0) + 1;
    });

    // 排序
    return Object.entries(errorCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }
}

// 显示错误趋势
const topErrors = await ErrorMetrics.getTopErrors(7);
console.table(topErrors);

// 输出示例:
// ┌─────────┬─────────────────────────────┬───────┐
// │ (index) │            name             │ count │
// ├─────────┼─────────────────────────────┼───────┤
// │    0    │ 'InsufficientUSDCInReserve' │  245  │
// │    1    │ 'InvalidWeights'            │  123  │
// │    2    │ 'LockNotExpired'            │   89  │
// └─────────┴─────────────────────────────┴───────┘
```

---

## 📚 总结

### 错误处理最佳实践

1. **前端验证优先** - 在调用合约前验证输入
2. **用户友好提示** - 将技术错误转换为可理解的语言
3. **提供解决方案** - 不仅告知错误，还建议如何解决
4. **自动恢复** - 对临时性错误自动重试
5. **断点续传** - 多步骤操作支持中断恢复
6. **监控告警** - 追踪高频错误并优化

### 关键检查清单

- [ ] 所有合约调用都包裹在 try-catch 中
- [ ] 错误消息对用户友好（避免技术术语）
- [ ] 提供至少一个解决方案/重试选项
- [ ] 临时性错误自动重试（网络、RPC）
- [ ] 用户错误（输入无效）不重试
- [ ] 错误上报到监控平台（Sentry）

---

**下一步**: [Gas 优化指南](./gas-optimization.md) - 批量操作、Multicall 模式
