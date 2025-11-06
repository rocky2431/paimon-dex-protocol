# 代码清理分析报告

**任务**: refactor-0.2 - 清理 console.log 和 TODO 注释
**分析时间**: 2025-11-07
**分支**: feat/task-refactor-0.2-cleanup-console-todos

---

## 扫描结果汇总

- **console.log**: 15 个
- **console.error**: 46 个（保留用于错误处理）
- **TODO 注释**: 99 个

---

## 1. console.log 分类（15个）

### 1.1 需要删除的开发调试日志（11个）

| 文件 | 行号 | 内容 | 操作 |
|------|------|------|------|
| src/app/nitro/page.tsx | 70 | "Participation successful" | 删除 |
| src/components/swap/hooks/usePSMSwap.ts | 110 | SCALE 调试输出 | 删除 |
| src/components/presale/BondDashboard.tsx | 96 | "Settling bond" | 删除 |
| src/components/presale/SettlementPage.tsx | 162 | "Settlement successful! Redirecting..." | 删除 |
| src/components/launchpad/VoteExecutionPanel.tsx | 90 | "Execute vote transaction" | 删除 |
| src/components/launchpad/VotingUI.tsx | 82 | "Vote transaction" | 删除 |
| src/components/launchpad/VotingUI.tsx | 130 | "Connect wallet clicked" | 删除 |
| src/components/launchpad/ParticipateForm.tsx | 107 | "Participate transaction" | 删除 |
| src/components/launchpad/ParticipateForm.tsx | 153 | "Connect wallet clicked" | 删除 |
| src/components/treasury/PositionList.tsx | 278 | "Redeem" | 删除 |
| src/components/treasury/PositionList.tsx | 282 | "Add collateral" | 删除 |

### 1.2 保留的日志（4个）

| 文件 | 行号 | 原因 | 操作 |
|------|------|------|------|
| src/hooks/useVestingPosition.ts | 36-37 | 文档注释中的代码示例 | 保留 |
| src/lib/webVitals.ts | 54 | Core Web Vitals 监控 | 保留 |
| src/lib/webVitals.ts | 119 | 监控初始化日志 | 保留 |

---

## 2. TODO 注释分类（99个）

### 2.1 P0 - 阻塞性问题（32个）- 配置地址

**说明**: mainnet.ts 和 testnet.ts 中的占位地址 (0x000...)，影响主网部署。

**文件**: src/config/chains/mainnet.ts (17个)
- treasury: 0x0000...0000
- usdp: 0x0000...0002
- paimon: 0x0000...0003
- venft: 0x0000...0004
- launchpad: 0x0000...0005
- governance: 0x0000...0006
- psm: 0x0000...0007
- votingEscrow: 0x0000...0008
- remintController: 0x0000...0009
- bondNft: 0x0000...000a
- pools: hydUsdc, hydWbnb, paimonWbnb (3个)
- gauges: hydUsdc, hydWbnb, usdcBusd, paimonWbnb (4个)

**文件**: src/config/chains/testnet.ts (15个)
- remintController, bondNft, venft, governance (4个)
- quoter (1个)
- pools: hydUsdc, hydWbnb, usdcBusd, usdtUsdc (4个)
- gauges: usdpUsdc, paimonWbnb, hydUsdp, hydUsdc, hydWbnb, usdcBusd (6个)

**处理策略**:
- ✅ **移至 refactor-1.1 任务处理**（已规划）
- refactor-1.1 会创建地址同步脚本从合约部署结果自动生成配置

### 2.2 P1 - 重要功能缺失（~20个估算）

需要进一步扫描详细内容，初步识别到的包括：

| 文件 | 内容 | 优先级 |
|------|------|--------|
| src/app/savings/page.tsx:34 | "Replace with real API call" (历史数据) | P1 |
| src/app/stability-pool/components/StabilityPoolOverview.tsx:114 | "Replace with actual calculation" | P1 |
| src/app/stability-pool/page.tsx:24 | "Add locale support via next-intl" | P2 |
| src/app/launchpad/[projectId]/vote/page.tsx:39 | "Replace with actual wagmi hooks" | P1 |
| src/app/launchpad/[projectId]/vote/page.tsx:65 | "Get user address from wagmi" | P1 |
| src/app/launchpad/[projectId]/page.tsx:37 | "Replace with actual wagmi hooks" | P1 |
| src/app/launchpad/[projectId]/page.tsx:84 | "Handle loading and error states" | P1 |
| src/app/treasury/page.tsx:40 | "Replace with real contract data" | P1 |
| src/app/vault/page.tsx:34 | "Add collateral selector" | P2 |

**处理策略**:
- P1: 移至 `.ultra/docs/bug-tracker.md` (refactor-4.1 阶段处理)
- P2: 移至 GitHub Issues 或 Backlog

### 2.3 P2/P3 - 优化和未来功能（~47个估算）

需要完整扫描后分类到：
- P2: 功能增强，移至 GitHub Issues
- P3: 未来计划，移至 Backlog 或删除

---

## 3. 执行计划

### 3.1 立即执行（本任务）

1. ✅ **删除 11 个开发调试 console.log**
   - 使用批量编辑或手动清理

2. ✅ **创建详细 TODO 分类清单**
   - 扫描剩余 67 个 TODO（99 - 32 配置地址）
   - 分类到 P1/P2/P3

3. ✅ **创建 ComingSoon 组件**
   - 用于未实现功能的友好占位

4. ✅ **更新文档**
   - 将 P1 TODO 记录到 `.ultra/docs/bug-tracker.md`
   - 将 P2/P3 移至 GitHub Issues

### 3.2 后续任务处理

- **P0 配置地址**: refactor-1.1 (地址同步脚本)
- **P1 功能缺失**: refactor-4.1 (Bug 修复阶段)
- **P2 功能增强**: GitHub Issues + 未来迭代
- **P3 未来功能**: Backlog 或删除

---

## 4. 验收标准

- ✅ 无开发调试 console.log（保留 console.error 和监控工具）
- ✅ 所有 TODO 已分类并记录
- ✅ 未实现功能有 ComingSoon 组件占位
- ✅ bug-tracker.md 包含所有 P1 TODO
- ✅ GitHub Issues 包含 P2 TODO
- ✅ 代码库整洁，易于维护

---

## 5. 风险评估

- **风险 1**: 删除 console.log 可能影响现有调试流程
  - **缓解**: 保留 console.error 用于错误处理

- **风险 2**: TODO 分类可能不完整
  - **缓解**: 多次扫描确认，使用 grep 完整检查

- **风险 3**: P0 配置地址问题延后到 refactor-1.1
  - **缓解**: refactor-1.1 是 P0 优先级，紧接本任务执行
