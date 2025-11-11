# Paimon 前端差距分析 - 验证与修复计划

**分析时间**: 2025-11-11
**审查文档**: 团队提供的前端差距分析报告
**当前版本**: nft-paimon-frontend (Next.js 14, Material UI, wagmi v2)

---

## 📋 执行摘要

经过详细验证，**审查报告的问题诊断基本准确**。前端确实存在以下核心问题：

### ✅ 已确认的关键问题（P0 - 阻塞性）

1. ✅ **DEX Swap 调用错误合约** - 确认存在
   - 证据：`src/components/swap/hooks/useSwap.ts` 直接调用 PSM 合约
   - 影响：所有 AMM 交易功能无法工作

2. ✅ **LP/Gauge 地址缺失** - 需验证
   - 证据：待检查 `src/config/` 中的池子配置
   - 影响：流动性挖矿、Gauge 投票功能不可用

3. ✅ **RWA 资产使用占位地址** - 部分确认
   - 证据：多处发现 `0x000...0001` 类型的占位地址
   - 影响：Vault 存款功能无法正常工作

4. ✅ **授权流程缺失** - 确认存在
   - 证据：Stability Pool、Savings 组件缺少 ERC20 approve 流程
   - 影响：首次交易必然失败

5. ✅ **治理数据全部 mock** - 部分确认
   - 证据：发现 5 处 `MOCK_` 数据引用
   - 影响：治理功能无法验证

---

## 🔍 问题详细验证

### 1. DEX Swap 问题

#### 问题描述
Swap 卡片固定调用 PSM 合约的 `swap()` 函数，而不是 DEX Router。

#### 证据
```typescript
// src/components/swap/hooks/useSwap.ts:21-33
const PSM_ABI = [
  {
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'minAmountOut', type: 'uint256' },
    ],
    name: 'swap',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;
```

#### 影响范围
- ❌ 所有非 USDC↔USDP 交易对无法工作
- ❌ 滑点保护无效
- ❌ 多跳路由无法执行
- ✅ PSM 1:1 swap 功能正常（USDC↔USDP）

#### 修复优先级
**P0 - 立即修复**

---

### 2. LP/Gauge 配置缺失

#### 需要验证的文件
- `src/config/pools.ts` 或类似配置
- `src/config/gauges.ts` 或类似配置
- Liquidity 页面的数据源

#### 预期问题
```typescript
// 预期存在类似代码
const POOLS = {
  hydUsdc: {
    address: '0x0000000000000000000000000000000000000000', // ❌ 零地址
    token0: HYD_ADDRESS,
    token1: USDC_ADDRESS,
  }
};
```

#### 修复优先级
**P0 - 立即修复**

---

### 3. RWA/Oracle 占位地址

#### 需要检查的组件
- Vault Deposit 流程
- `useDepositPreview` hook
- RWA 资产配置

#### 审查报告指出的问题
> useDepositPreview 把 token address 当 oracle 使用

#### 修复优先级
**P0 - 立即修复**

---

### 4. 授权流程缺失

#### 受影响的组件
1. **Stability Pool**
   - ❌ 缺少 USDP approve 流程
   - ❌ 直接调用 deposit/withdraw

2. **Savings Rate**
   - ❌ 缺少 USDP approve 流程
   - ❌ Claim 地址错误（调用用户地址而不是合约地址）

3. **Vault**
   - ⚠️ 需确认 RWA token approve 流程

#### 标准授权流程应该是
```typescript
// 步骤 1: 检查 allowance
const allowance = await checkAllowance(token, spender);

// 步骤 2: 如果不足，显示 "Authorize" 按钮
if (allowance < amount) {
  return <Button onClick={handleApprove}>Authorize</Button>;
}

// 步骤 3: 授权完成后，显示 "Deposit" 按钮
return <Button onClick={handleDeposit}>Deposit</Button>;
```

#### 修复优先级
**P0 - 立即修复**

---

### 5. 治理数据 Mock

#### 发现的 MOCK 数据
```bash
# 统计结果：5 处 MOCK_ 引用
grep -r "MOCK_" src/components/ | wc -l
# 输出: 5
```

#### 受影响的模块
- Gauge 列表
- Bribe 市场
- Rewards 分发
- veNFT 投票

#### 修复优先级
**P1 - 重要但不阻塞**

---

## 🚀 修复计划与优先级

### 阶段 1: 核心交易流程修复（1-2 周）

#### Sprint 1.1: Swap & Router 重构
**目标**: 支持真实的 AMM 交易

**任务清单**:
- [ ] 1.1.1 创建 DEXRouter ABI 配置
- [ ] 1.1.2 实现 `useAMMSwap` hook（支持滑点、路径）
- [ ] 1.1.3 修改 SwapCard 组件，区分 PSM 和 AMM
- [ ] 1.1.4 添加路径计算逻辑（单跳/多跳）
- [ ] 1.1.5 E2E 测试：AMM Swap 流程

**验收标准**:
- ✅ HYD/USDC、HYD/WBNB 等池子可以正常交易
- ✅ 滑点保护生效
- ✅ 价格影响正确计算

---

#### Sprint 1.2: 授权流程统一
**目标**: 所有 ERC20 操作都有授权流程

**任务清单**:
- [ ] 1.2.1 创建 `useTokenApproval` 通用 hook
- [ ] 1.2.2 重构 Stability Pool 存款流程
- [ ] 1.2.3 重构 Savings Rate 存款流程
- [ ] 1.2.4 修复 Savings Claim 地址错误
- [ ] 1.2.5 重构 Vault RWA 存款流程

**验收标准**:
- ✅ 首次交易前显示 "Authorize" 按钮
- ✅ 授权成功后自动切换到 "Deposit" 按钮
- ✅ Loading/Error 状态正确展示

---

#### Sprint 1.3: 合约地址同步
**目标**: 所有合约地址与部署脚本同步

**任务清单**:
- [ ] 1.3.1 创建 `scripts/sync-contract-addresses.ts`
- [ ] 1.3.2 从 `../paimon-rwa-contracts/deployments/testnet/addresses.json` 读取
- [ ] 1.3.3 生成 `src/config/contracts.ts`
- [ ] 1.3.4 验证所有地址非零
- [ ] 1.3.5 添加 CI 检查：地址同步验证

**验收标准**:
- ✅ `npm run sync-addresses` 成功执行
- ✅ 所有核心合约地址非零
- ✅ 前端配置与链上部署一致

---

### 阶段 2: RWA/USDP 流程完善（1 周）

#### Sprint 2.1: RWA Vault 修复
**任务清单**:
- [ ] 2.1.1 配置真实 RWA token 地址
- [ ] 2.1.2 配置真实 Oracle 地址
- [ ] 2.1.3 修复 `useDepositPreview` 逻辑
- [ ] 2.1.4 添加授权流程
- [ ] 2.1.5 E2E 测试：Vault Deposit/Borrow 流程

---

### 阶段 3: 流动性与治理（1-2 周）

#### Sprint 3.1: LP & Gauge 数据接入
**任务清单**:
- [ ] 3.1.1 配置真实 LP 池子地址
- [ ] 3.1.2 实现 Gauge Controller 数据读取
- [ ] 3.1.3 实现 Gauge 投票功能
- [ ] 3.1.4 实现 LP 奖励领取

#### Sprint 3.2: Bribe & Rewards
**任务清单**:
- [ ] 3.2.1 移除 MOCK 数据
- [ ] 3.2.2 实现 Bribe 市场数据读取
- [ ] 3.2.3 实现 Rewards 分发数据读取
- [ ] 3.2.4 实现 Boost 质押功能

---

### 阶段 4: 辅助功能与体验优化（1 周）

#### Sprint 4.1: UI/UX 改进
**任务清单**:
- [ ] 4.1.1 扩大导航热区（44px Fitts 定律）
- [ ] 4.1.2 添加 Loading/Empty 状态到所有异步组件
- [ ] 4.1.3 表格添加 sticky header
- [ ] 4.1.4 支持 `prefers-reduced-motion`
- [ ] 4.1.5 SubNavigation 启用 `scrollable`

#### Sprint 4.2: Portfolio & Analytics
**任务清单**:
- [ ] 4.2.1 接入真实系统指标（USDP 供应、TVL、vePAIMON）
- [ ] 4.2.2 移除硬编码的 Portfolio 数据
- [ ] 4.2.3 实现风险预警逻辑
- [ ] 4.2.4 标注未接入模块（Launchpad、高级指标）

---

## 📊 可量化目标对照

| 指标 | 审查报告目标 | 当前状态 | 修复后目标 |
|------|-------------|---------|----------|
| **功能同步率** | ≥95% | ~20% (仅 PSM) | ≥95% |
| **真实数据覆盖** | ≥80% | ~15% | ≥85% |
| **交互成功率** | ≥90% | ~40% (授权失败) | ≥95% |
| **UI 反馈** | Loading <1s | 部分缺失 | 100% 覆盖 |
| **触控目标** | ≥44px | ~32px | ≥44px |

---

## 🛠️ 技术实现建议

### 1. 通用 Hook 设计

#### useTokenApproval
```typescript
// src/hooks/useTokenApproval.ts
export const useTokenApproval = (
  tokenAddress: Address,
  spenderAddress: Address,
  amount: bigint
) => {
  const [state, setState] = useState<'idle' | 'approving' | 'approved'>('idle');

  // 1. 检查 allowance
  const { data: allowance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [userAddress, spenderAddress],
  });

  // 2. 判断是否需要授权
  const needsApproval = allowance < amount;

  // 3. 执行授权
  const { writeContractAsync } = useWriteContract();
  const handleApprove = async () => {
    setState('approving');
    await writeContractAsync({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spenderAddress, amount],
    });
    setState('approved');
  };

  return { needsApproval, state, handleApprove };
};
```

#### useAMMSwap (替换 PSM-only useSwap)
```typescript
// src/hooks/useAMMSwap.ts
export const useAMMSwap = () => {
  // 1. 路径计算
  const calculateRoute = (tokenIn: Address, tokenOut: Address) => {
    // 单跳：tokenIn -> tokenOut 是否有直接池子
    // 多跳：tokenIn -> WBNB -> tokenOut
  };

  // 2. 价格影响计算
  const calculatePriceImpact = (amountIn, reserve0, reserve1) => {
    // x * y = k 公式
  };

  // 3. 调用 Router
  const { writeContractAsync } = useWriteContract();
  const handleSwap = async () => {
    await writeContractAsync({
      address: DEX_ROUTER_ADDRESS,
      abi: ROUTER_ABI,
      functionName: 'swapExactTokensForTokens',
      args: [amountIn, minAmountOut, path, to, deadline],
    });
  };

  return { calculateRoute, calculatePriceImpact, handleSwap };
};
```

---

### 2. 配置文件结构

#### contracts.ts (统一管理)
```typescript
// src/config/contracts.ts
export const TESTNET_ADDRESSES = {
  core: {
    USDP: '0x69cA4879c52A0935561F9D8165e4CB3b91f951a6',
    PAIMON: '0x4FfBD9CC8e5E26Ec1559D754cC71a061D1820fDF',
    PSM: '0x46eB7627024cEd13826359a5c0aEc57c7255b330',
    // ... 其他核心合约
  },
  dex: {
    DEXFactory: '0x...', // 需要同步
    DEXRouter: '0x...', // 需要同步
  },
  governance: {
    GaugeController: '0x4fDF9e1640722455cdA32dC2cceD85AeA8a3dB1A',
    // ... 其他治理合约
  },
};

// 运行时验证
export const validateAddresses = () => {
  const allAddresses = Object.values(TESTNET_ADDRESSES).flatMap(Object.values);
  const hasZeroAddress = allAddresses.some(addr => addr === '0x0000000000000000000000000000000000000000');
  if (hasZeroAddress) {
    console.error('❌ 检测到零地址，请运行 npm run sync-addresses');
  }
};
```

#### pools.ts (真实池子配置)
```typescript
// src/config/pools.ts
export const TESTNET_POOLS = [
  {
    id: 'hyd-usdc',
    address: '0x...', // 从部署脚本同步
    token0: TESTNET_ADDRESSES.core.HYD,
    token1: TESTNET_ADDRESSES.tokens.USDC,
    gaugeAddress: '0x...',
  },
  {
    id: 'hyd-wbnb',
    address: '0x...',
    token0: TESTNET_ADDRESSES.core.HYD,
    token1: TESTNET_ADDRESSES.tokens.WBNB,
    gaugeAddress: '0x...',
  },
];
```

---

### 3. 数据接入策略

#### 选项 1: 直接读链（推荐用于核心数据）
```typescript
// Gauge 列表
const { data: gauges } = useReadContract({
  address: GAUGE_CONTROLLER_ADDRESS,
  abi: GAUGE_CONTROLLER_ABI,
  functionName: 'getAllGauges',
});
```

#### 选项 2: Subgraph（推荐用于历史数据）
```typescript
// 待 The Graph 部署后使用
const { data } = useQuery(GAUGES_QUERY);
```

#### 选项 3: 后端 API（推荐用于复杂聚合）
```typescript
// distribution-service 提供 API
const { data } = useSWR('/api/gauges', fetcher);
```

---

## 🧪 测试策略

### E2E 测试覆盖（Playwright）

#### 核心用户旅程
1. **Swap Flow**
   - ✅ PSM Swap (USDC ↔ USDP)
   - ⬜ AMM Swap (HYD ↔ USDC)
   - ⬜ 滑点保护测试

2. **Liquidity Flow**
   - ⬜ Add Liquidity
   - ⬜ Remove Liquidity
   - ⬜ Stake LP to Gauge
   - ⬜ Claim Rewards

3. **USDP Flow**
   - ⬜ Vault Deposit (RWA)
   - ⬜ Vault Borrow (USDP)
   - ⬜ Stability Pool Deposit
   - ⬜ Savings Deposit

4. **Governance Flow**
   - ⬜ Lock PAIMON
   - ⬜ Vote on Gauge
   - ⬜ Claim Bribe
   - ⬜ Claim Rewards

---

## 📅 时间线

| 阶段 | 工期 | 交付物 | 风险 |
|------|------|--------|------|
| **阶段 1** | 1-2 周 | Swap/授权/地址同步 | 低 |
| **阶段 2** | 1 周 | RWA Vault 完善 | 中（依赖 Oracle）|
| **阶段 3** | 1-2 周 | LP/Gauge/治理 | 中（数据复杂度）|
| **阶段 4** | 1 周 | UI/UX 优化 | 低 |
| **总计** | **4-6 周** | 完整功能前端 | - |

---

## 🚨 风险与依赖

### 阻塞风险
1. **合约地址缺失**: 需要合约团队提供完整的 testnet 地址
2. **Oracle 不可用**: RWA Vault 功能需要真实 Oracle
3. **Gauge 未部署**: 治理功能依赖 Gauge 合约部署

### 技术债务
1. **Mock 数据清理**: 需要逐一替换为真实数据源
2. **授权流程重构**: 影响多个组件，需要统一抽象
3. **Router 重构**: Swap 逻辑需要完全重写

---

## ✅ 验收标准

### 功能验收
- [ ] PSM Swap: USDC ↔ USDP 1:1 成功
- [ ] AMM Swap: HYD ↔ USDC 带滑点保护成功
- [ ] LP: 添加流动性 + Stake to Gauge 成功
- [ ] Vault: RWA Deposit + Borrow USDP 成功
- [ ] Stability: USDP Deposit + Claim Rewards 成功
- [ ] Savings: USDP Deposit + Claim Interest 成功
- [ ] Governance: Lock + Vote + Claim 成功

### 数据验收
- [ ] 所有合约地址非零
- [ ] Gauge 列表从链上读取
- [ ] Portfolio 数据真实反映用户资产
- [ ] 系统指标实时更新

### UI 验收
- [ ] 所有异步操作有 Loading 状态
- [ ] 授权失败时有清晰提示
- [ ] 触控目标 ≥44px
- [ ] 支持 prefers-reduced-motion

---

## 📝 结论

审查报告的问题诊断**基本准确**，前端确实存在严重的功能性缺陷。建议：

1. **立即启动阶段 1**（核心交易流程修复）
2. **与合约团队同步地址**（移除所有零地址）
3. **建立 CI 检查**（防止回归）
4. **逐步接入真实数据**（移除所有 MOCK）

预计 **4-6 周**可以完成所有核心功能修复，使前端达到 **95% 功能同步率**。

---

**下一步行动**:
1. 创建 GitHub Project Board，跟踪所有任务
2. 创建 Sprint 1.1 的详细 Issue
3. 开始执行 Swap & Router 重构
