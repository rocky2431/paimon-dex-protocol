# Phase 4: 完整业务流程测试计划

**日期**: 2025-11-07
**状态**: In Progress
**目标**: 验证前端与智能合约集成的完整性，确保所有 Mock 数据替换后功能正常

---

## 测试目标

1. **系统级指标验证** - 确认 `useSystemMetrics` 正确查询链上数据
2. **用户仓位聚合验证** - 确认 `useUserPortfolio` 正确聚合用户跨协议仓位
3. **完整业务流程路径测试** - 验证用户从 Launchpad → Vault → LP → Vote 的完整体验
4. **数据准确性验证** - 对比链上数据与前端显示，确保精度和格式正确

---

## Phase 4.1: 测试环境准备

### 前置条件
- ✅ 开发服务器运行在 `http://localhost:4000`
- ✅ 智能合约已部署到 BSC Testnet
- ✅ `.next` 构建缓存已清理
- ⏸️ 测试钱包地址准备（需连接 MetaMask）
- ⏸️ 测试账户需要 BNB（用于 gas）

### 测试工具
- Chrome DevTools (Network, Console)
- MetaMask (BSC Testnet)
- BscScan Testnet (验证链上数据)

---

## Phase 4.2: 系统级指标验证

### 测试范围：`useSystemMetrics` Hook

#### 📊 USDP Hub (/usdp)
**验证指标**:
- `usdpTotalSupply` - USDP 总供应量
- `usdpVaultTVL` - Vault 总锁仓价值
- `usdpStabilityPoolTVL` - 稳定池 TVL
- `weeklyEmission` - 周排放量（如可用）

**测试步骤**:
1. 访问 `/usdp` 页面
2. 打开 Chrome DevTools Network 标签
3. 检查 RPC 请求 (totalSupply, totalDebt, totalDeposits)
4. 对比显示值与 BscScan 合约查询结果
5. 记录响应时间和加载状态

**预期结果**:
- 所有指标正确显示（非 "0.00"）
- 加载状态正常切换 (loading → data)
- 数值精度正确（18 decimals 格式化）

---

#### 💧 Liquidity Hub (/liquidity)
**验证指标**:
- `dexTotalLiquidity` - DEX 总流动性
- `dexTotalPairs` - DEX Pair 总数
- `dexDailyVolume` - 24h 交易量（目前标记为 TODO）

**测试步骤**:
1. 访问 `/liquidity` 页面
2. 检查 Network 请求 (factory.allPairsLength, pair.getReserves)
3. 验证三个已知 Pair 的 Reserves 查询:
   - USDP/USDC
   - PAIMON/BNB
   - HYD/USDP
4. 计算总流动性 = sum(reserve0 + reserve1) for all pairs
5. 对比前端显示值

**预期结果**:
- `dexTotalLiquidity` 显示正确的总和
- `dexTotalPairs` 显示正确的 Pair 数量
- `dexDailyVolume` 显示 "0.00" (符合 TODO 标记)

---

#### 🚀 Launchpad Hub (/launchpad)
**验证指标**:
- `totalRaised` - 总募资额
- `activeProjects` - 活跃项目数
- `totalParticipants` - 参与用户数

**测试步骤**:
1. 访问 `/launchpad` 页面
2. 检查指标卡片显示
3. 验证数据来源（目前可能为 Mock 或 0）

**当前状态**: 这些指标需要 ProjectRegistry/IssuanceController 合约，已标记为 Phase 3.2+ TODO

**预期结果**:
- 显示 "0.00" 或 Mock 数据（符合当前实现）
- 页面无报错

---

## Phase 4.3: 用户仓位聚合验证

### 测试范围：`useUserPortfolio` Hook

#### 📈 Portfolio (/portfolio)
**验证指标**:
- `lpPositions` - 用户 LP 仓位列表
- `totalLPValue` - LP 总价值
- `vaultPositions` - Vault 借贷仓位
- `totalDebt` - USDP 总债务
- `savingsPosition` - USDP Savings 仓位
- `totalNetWorth` - 总净值

**测试步骤**:
1. **连接测试钱包**:
   - 访问 `/portfolio`
   - 点击右上角 "Connect Wallet"
   - 连接 MetaMask (BSC Testnet)
   - 确认钱包地址显示

2. **验证 LP 仓位查询**:
   - 检查 Network 请求 (pair.balanceOf for each known pair)
   - 确认只显示非零余额的 LP
   - 验证 Pool 名称正确 (USDP/USDC, PAIMON/BNB, HYD/USDP)
   - 验证 Liquidity 数值格式化正确

3. **验证 Vault 仓位查询**:
   - 检查 `vault.debtOf(address)` 请求
   - 检查 `vault.healthFactor(address)` 请求
   - 如果有债务，验证显示:
     - Collateral amount
     - Borrowed USDP
     - LTV ratio
     - Health factor

4. **验证 Savings 仓位查询**:
   - 检查 `useSavingPrincipal` hook 调用
   - 检查 `useSavingAccruedInterest` hook 调用
   - 验证显示:
     - Principal amount
     - Accrued interest
     - Total value = Principal + Interest
     - Current APR

5. **验证总净值计算**:
   - 手动计算: `totalCollateralValue + totalLPValue + totalLockedPAIMON + totalInvested + savingsValue - totalDebt`
   - 对比前端显示的 `totalNetWorth`

**预期结果**:
- 所有仓位正确聚合显示
- 非零余额正确过滤
- 计算精度正确（18 decimals）
- Loading 状态正常
- 无余额时显示空状态提示

**边界情况测试**:
- 未连接钱包：显示 "Connect Wallet" 提示
- 新地址（无任何仓位）：显示 "No positions" 空状态
- 有部分仓位：正确显示对应的卡片

---

## Phase 4.4: 完整业务流程路径测试

### 路径 1: Launchpad → Vault → LP
**用户故事**: Alice 参与 RWA 项目，存入 RWA 资产借出 USDP，然后提供 LP 流动性

**测试步骤**:
1. **Launchpad 页面** (`/launchpad`)
   - 浏览 RWA 项目列表
   - 查看 Funnel 流程图（Fundraising → Approval → Participation → Settlement）
   - 验证项目状态显示

2. **Vault 页面** (`/usdp` → Vault Tab)
   - 查看 Tier 1-3 RWA LTV 表
   - 模拟存入 HYD (需真实交易或 Mock)
   - 查看 Borrow Preview 计算
   - 验证 Position List 显示

3. **LP 页面** (`/liquidity` → Pools Tab)
   - 查看 Pool 列表（TVL, APR, Gauge Weight）
   - 选择 USDP/USDC Pool
   - 点击 "Add Liquidity"
   - 验证 AddLiquidityCard 组件加载

4. **Portfolio 验证**:
   - 访问 `/portfolio`
   - 确认新增的 LP 仓位显示
   - 确认 Vault 债务显示
   - 验证总净值更新

**预期结果**:
- 所有页面正常跳转
- 数据在各页面间一致
- Portfolio 正确聚合多个仓位

---

### 路径 2: Lock PAIMON → Vote → Earn Rewards
**用户故事**: Bob 锁定 PAIMON 获得 veNFT 投票权，投票给 Pool，赚取奖励

**测试步骤**:
1. **Governance 页面** (`/governance` → Lock Tab)
   - 查看 Lock Duration vs Voting Power 图表
   - 选择锁定时长（1 week ~ 4 years）
   - 查看 Voting Power 预估

2. **Vote Tab**:
   - 查看 Gauge 列表
   - 查看当前 Epoch 信息
   - 模拟投票（需真实 veNFT 或 Mock）

3. **Rewards Tab**:
   - 查看 Pending Rewards
   - 查看 veNFT Power Boost

4. **Portfolio 验证**:
   - 访问 `/portfolio`
   - 确认 veNFT 仓位显示（注意：目前为 Phase 3.2+ TODO）
   - 验证 Voting Power 显示

**当前状态**:
- veNFT 详细仓位查询需要 Phase 3.2+ 实现（需事件索引或 Subgraph）
- 当前可验证 `balanceOf(address)` 返回的 NFT 数量

**预期结果**:
- Lock 流程 UI 正常
- Vote 页面数据加载正常
- Rewards 显示正确（如有）

---

### 路径 3: PSM Swap → Savings
**用户故事**: Charlie 使用 PSM 将 USDC 兑换为 USDP，然后存入 Savings 赚取利息

**测试步骤**:
1. **Liquidity Hub** (`/liquidity` → Swap Tab)
   - 选择 PSM Swap 卡片
   - 查看 USDC ↔ USDP 兑换比例（应为 1:1）
   - 查看手续费（0.1%）

2. **USDP Hub** (`/usdp` → Savings Tab)
   - 查看当前 APR
   - 查看 Total Funded
   - 点击 "Deposit" 按钮
   - 验证 SavingsDepositModal 弹窗

3. **Portfolio 验证**:
   - 访问 `/portfolio`
   - 确认 Savings 仓位显示
   - 验证 Principal + Accrued Interest
   - 验证总净值更新

**预期结果**:
- PSM 汇率显示 1:1
- Savings APR 正确显示
- Interest Chart 正确渲染
- Portfolio 正确聚合 Savings

---

## Phase 4.5: 性能与用户体验验证

### 加载性能
- **首次加载时间**: < 3s (Lighthouse)
- **RPC 请求并发**: 使用 `useReadContracts` 批量查询
- **Loading 状态**: 骨架屏或 Spinner
- **错误处理**: Network 失败时显示友好提示

### 响应式设计
- **Desktop**: 1920x1080
- **Tablet**: 768x1024
- **Mobile**: 375x667

### 多语言支持
- 切换 EN ↔ CN
- 验证所有文案正确翻译

---

## Phase 4.6: 已知限制与 TODO

### 当前 Phase 无法测试的功能

1. **veNFT 详细仓位** (Phase 3.2+)
   - `veNFTPositions[]` 列表
   - 每个 NFT 的 locked amount, lock end, voting power
   - **原因**: VotingEscrow 使用 ERC721，需要逐 token 查询或事件索引

2. **Launchpad 投资列表** (Phase 3.2+)
   - `launchpadInvestments[]` 列表
   - 项目名称、投资金额、RWA 代币接收量
   - **原因**: 需要 ProjectRegistry/IssuanceController 合约

3. **DEX 24h 交易量** (Phase 3.2+)
   - `dexDailyVolume`
   - **原因**: 需要事件索引或 Subgraph 聚合 Swap 事件

4. **LP APR 和 Pending Rewards** (Phase 3.2+)
   - `lpPosition.apr`
   - `lpPosition.pendingRewards`
   - **原因**: 需要 GaugeController 合约查询

5. **veNFT 全局指标** (Phase 3.2+)
   - `totalVePaimon` - 总投票权
   - `totalLockedPaimon` - 总锁定量
   - **原因**: 需要事件索引或 Subgraph 聚合所有 NFT

---

## 测试结果记录模板

### 系统级指标验证结果

| 指标 | 页面 | 预期值 | 实际值 | 状态 | 备注 |
|------|------|--------|--------|------|------|
| usdpTotalSupply | /usdp | > 0 | __ | ⏸️ | |
| usdpVaultTVL | /usdp | > 0 | __ | ⏸️ | |
| dexTotalLiquidity | /liquidity | > 0 | __ | ⏸️ | |
| dexTotalPairs | /liquidity | ≥ 3 | __ | ⏸️ | |

### 用户仓位验证结果

| 仓位类型 | 钱包地址 | 预期显示 | 实际显示 | 状态 | 备注 |
|---------|---------|---------|---------|------|------|
| LP Positions | 0x... | [] or [data] | __ | ⏸️ | |
| Vault Debt | 0x... | 0 or > 0 | __ | ⏸️ | |
| Savings | 0x... | null or data | __ | ⏸️ | |

### 业务流程验证结果

| 流程路径 | 步骤数 | 通过步骤 | 失败步骤 | 状态 | 备注 |
|---------|--------|---------|---------|------|------|
| Launchpad → Vault → LP | 4 | __ | __ | ⏸️ | |
| Lock → Vote → Rewards | 4 | __ | __ | ⏸️ | |
| PSM → Savings | 3 | __ | __ | ⏸️ | |

---

## 下一步计划

1. **Phase 4.2 执行**: 验证系统级指标（无需钱包连接）
2. **Phase 4.3 执行**: 连接测试钱包，验证用户仓位
3. **Phase 4.4 执行**: 完整业务流程路径测试
4. **Phase 4.5 执行**: 性能与 UX 验证
5. **Phase 4.6 总结**: 编写测试报告，记录已知问题

---

**测试完成标准**:
- ✅ 所有可测试指标正确显示（非 TODO 部分）
- ✅ 用户仓位聚合无误差
- ✅ Loading 状态正常
- ✅ 错误处理友好
- ✅ 无 Console 错误（除 MetaMask SDK 警告）
- ✅ 响应式设计正常
- ✅ 多语言切换正常
