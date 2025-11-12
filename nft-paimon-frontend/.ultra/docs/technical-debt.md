# 技术债务追踪 (Technical Debt Tracking)

**Last Updated**: 2025-11-12
**Total TODOs**: 86
**Review Frequency**: Monthly

---

## 📊 执行摘要 (Executive Summary)

| 分类 | 数量 | 优先级 | 预计工作量 |
|------|------|--------|------------|
| **Phase 2 功能** | 20 | P0-P1 | 12 天 |
| **Phase 3.2+ 改进** | 38 | P2 | 20 天 |
| **功能增强** | 28 | P2-P3 | 14 天 |
| **总计** | **86** | - | **46 天** |

**优先级分布**:
- 🔴 **P0 (Critical)**: 8 TODOs - Phase 2 核心功能
- 🟠 **P1 (High)**: 12 TODOs - Phase 2 重要功能
- 🟡 **P2 (Medium)**: 38 TODOs - Phase 3.2+ 改进
- 🟢 **P3 (Low)**: 28 TODOs - 增强功能

---

## 🔴 Phase 2 功能 (20 TODOs, P0-P1)

### Launchpad 模块 (15 TODOs)

| TD-ID | 文件 | 行号 | 描述 | 优先级 | 预计工作量 |
|-------|------|------|------|--------|------------|
| TD-001 | `src/app/launchpad/[projectId]/page.tsx` | 37 | 集成 wagmi hooks 获取区块链数据 | P1 | 2 天 |
| TD-002 | `src/app/launchpad/[projectId]/page.tsx` | 84 | 处理加载和错误状态 | P1 | 0.5 天 |
| TD-003 | `src/app/launchpad/[projectId]/vote/page.tsx` | 39 | 集成 wagmi hooks 获取投票数据 | P1 | 1.5 天 |
| TD-004 | `src/app/launchpad/[projectId]/vote/page.tsx` | 65 | 从 wagmi useAccount() 获取用户地址 | P1 | 0.5 天 |
| TD-005 | `src/components/launchpad/ParticipateForm.tsx` | 39-49 | 集成 wagmi hooks (参与表单) | P0 | 2 天 |
| TD-006 | `src/components/launchpad/ParticipateForm.tsx` | 82 | 实现价格预言机计算 | P1 | 1 天 |
| TD-007 | `src/components/launchpad/ParticipateForm.tsx` | 86 | 获取真实 gas 估算 | P2 | 0.5 天 |
| TD-008 | `src/components/launchpad/ParticipateForm.tsx` | 98 | 实现真实交易逻辑 | P0 | 2 天 |
| TD-009 | `src/components/launchpad/ProjectList.tsx` | 45 | 使用 wagmi 获取项目列表 | P1 | 1.5 天 |
| TD-010 | `src/components/launchpad/VoteExecutionPanel.tsx` | 36-81 | 集成 wagmi 执行投票 | P0 | 2 天 |
| TD-011 | `src/components/launchpad/VoteHistory.tsx` | 46-52 | 使用 wagmi 获取投票历史 | P1 | 1 天 |
| TD-012 | `src/components/launchpad/VotingUI.tsx` | 40-73 | 集成 wagmi 投票交易 | P0 | 2 天 |
| TD-013 | `src/components/launchpad/VotingUI.tsx` | 123 | 触发钱包连接 | P2 | 0.5 天 |

**Launchpad 小计**: 13 TODOs, **17 天**

---

### Presale 模块 (5 TODOs)

| TD-ID | 文件 | 行号 | 描述 | 优先级 | 预计工作量 |
|-------|------|------|------|--------|------------|
| TD-014 | `src/components/presale/BondDashboard.tsx` | 35, 95 | 集成合约调用 (Bond) | P1 | 1.5 天 |
| TD-015 | `src/components/presale/LeaderboardDashboard.tsx` | 82-165 | 集成 RemintController 合约 | P1 | 2 天 |
| TD-016 | `src/components/presale/SettlementPage.tsx` | 61-144 | 集成结算合约调用 | P0 | 2 天 |
| TD-017 | `src/components/presale/TaskDashboard.tsx` | 71-189 | 集成 RemintController 和 Oracle | P1 | 2.5 天 |

**Presale 小计**: 5 TODOs (重复统计为 4 个独立任务), **8 天**

---

## 🟡 Phase 3.2+ 改进 (38 TODOs, P2)

### 事件索引依赖 (18 TODOs)

**需求**: The Graph Subgraph 事件索引

| TD-ID | 模块 | 文件 | TODOs | 需求 | 技术方案 |
|-------|------|------|-------|------|----------|
| TD-018 | Portfolio | `src/app/portfolio/page.tsx` | 2 | 历史数据、Claim All | Subgraph 查询 + 批量交易 |
| TD-019 | Portfolio | `src/hooks/useUserPortfolio.ts` | 6 | 多抵押品位置、历史数据 | Event indexing + 批量查询 |
| TD-020 | Analytics | `src/components/analytics/PriceChart.tsx` | 1 | 历史价格数据 | The Graph 价格 feed |
| TD-021 | Analytics | `src/components/analytics/TreasuryFundingChart.tsx` | 3 | 历史融资趋势 | Event indexing |
| TD-022 | Analytics | `src/components/analytics/constants.ts` | 2 | 协议费用、价格数据 | The Graph 聚合查询 |
| TD-023 | Stability Pool | `src/components/stability-pool/LiquidationHistory.tsx` | 1 | 清算历史记录 | Liquidated 事件索引 |
| TD-024 | System Metrics | `src/hooks/useSystemMetrics.ts` | 4 | 24h 交易量、活跃投票者 | 实时统计 + Subgraph |

**事件索引小计**: 18 TODOs, **12 天** (可并行开发)

---

### 多抵押品支持 (5 TODOs)

**需求**: 合约升级支持多资产抵押

| TD-ID | 文件 | 行号 | 描述 | 依赖 | 预计工作量 |
|-------|------|------|------|------|------------|
| TD-025 | `src/hooks/useUserPortfolio.ts` | 253 | 多抵押品位置查询 | 合约 v2 | 2 天 |
| TD-026 | `src/app/vault/page.tsx` | 36 | 添加抵押品选择器 | 合约 v2 | 1 天 |
| TD-027 | `src/components/treasury/PositionList.tsx` | 278-281 | 实现 redeem 和 add collateral | 合约 v2 | 2 天 |

**多抵押品小计**: 5 TODOs (重复统计为 3 个任务), **5 天**

---

### Boost 和 Rewards 优化 (7 TODOs)

| TD-ID | 文件 | 行号 | 描述 | 优先级 | 预计工作量 |
|-------|------|------|------|--------|------------|
| TD-028 | `src/components/boost/BoostHistory.tsx` | 51 | 替换模拟数据 | P2 | 1 天 |
| TD-029 | `src/components/boost/BoostUnstakeButton.tsx` | 59, 74 | 查询 vote weight 和 claim 状态 | P2 | 0.5 天 |
| TD-030 | `src/components/rewards/RewardsDashboard.tsx` | 82 | 从 BoostStaking 获取 multiplier | P2 | 0.5 天 |
| TD-031 | `src/components/rewards/hooks/useRewards.ts` | 309-397 | 多资产奖励查询 + 批量 claim | P2 | 2 天 |
| TD-032 | `src/hooks/useRewardDistributor.ts` | 72 | Boost multiplier 查询 | P2 | 0.5 天 |

**Boost/Rewards 小计**: 7 TODOs (重复统计为 5 个任务), **4.5 天**

---

### 国际化支持 (8 TODOs)

| TD-ID | 文件 | 行号 | 描述 | 优先级 | 预计工作量 |
|-------|------|------|------|--------|------------|
| TD-033 | `src/app/borrow/page.tsx` | 35 | 添加 next-intl 支持 | P3 | 0.5 天 |
| TD-034 | `src/app/stability-pool/page.tsx` | 24 | 添加 next-intl 支持 | P3 | 0.5 天 |
| TD-035 | `src/app/vault/page.tsx` | 36 | 添加 next-intl 支持 | P3 | 0.5 天 |
| TD-036 | **其他 5 个页面** | - | 完整 i18n 覆盖 | P3 | 2.5 天 |

**国际化小计**: 8 TODOs, **4 天** (批量处理)

---

## 🟢 功能增强 (28 TODOs, P2-P3)

### Treasury 和 RWA (6 TODOs)

| TD-ID | 文件 | 行号 | 描述 | 优先级 | 预计工作量 |
|-------|------|------|------|--------|------------|
| TD-037 | `src/components/treasury/constants.ts` | 14 | 部署 tUST token 合约 | P2 | 1 天 (合约) |
| TD-038 | `src/components/treasury/constants.ts` | 24 | 部署 tCORPBOND token 合约 | P2 | 1 天 (合约) |
| TD-039 | `src/components/treasury/constants.ts` | 34 | 部署 tRE token 合约 | P2 | 1 天 (合约) |
| TD-040 | `src/app/stability-pool/components/StabilityPoolOverview.tsx` | 114 | 基于历史清算计算真实统计 | P2 | 1 天 |

**Treasury/RWA 小计**: 6 TODOs (重复统计为 4 个任务), **4 天**

---

### Liquidity 和 LP 池 (6 TODOs)

| TD-ID | 文件 | 行号 | 描述 | 优先级 | 预计工作量 |
|-------|------|------|------|--------|------------|
| TD-041 | `src/components/liquidity/constants.ts` | 29 | 部署自定义 Velodrome Router | P3 | 2 天 (合约) |
| TD-042 | `src/components/liquidity/constants.ts` | 33 | 部署自定义 Velodrome Factory | P3 | 2 天 (合约) |
| TD-043 | `src/components/liquidity/constants.ts` | 93-135 | 真实池子地址配置 | P3 | 0.5 天 |
| TD-044 | `src/hooks/useAMMSwap.ts` | 448 | 精确价格影响计算 | P2 | 1 天 |

**Liquidity/LP 小计**: 6 TODOs (重复统计为 4 个任务), **5.5 天**

---

### Gauges 和投票 (4 TODOs)

| TD-ID | 文件 | 行号 | 描述 | 优先级 | 预计工作量 |
|-------|------|------|------|--------|------------|
| TD-045 | `src/hooks/useGauges.ts` | 221 | 查询已连接用户的 vote 记录 | P2 | 0.5 天 |
| TD-046 | `src/hooks/useSystemMetrics.ts` | 199 | 查询活跃投票者数量 | P2 | 0.5 天 |

**Gauges 小计**: 4 TODOs (重复统计为 2 个任务), **1 天**

---

### 其他增强 (12 TODOs)

| TD-ID | 文件 | 行号 | 描述 | 优先级 | 预计工作量 |
|-------|------|------|------|--------|------------|
| TD-047 | `src/components/analytics/hooks/useAnalytics.ts` | 67-70 | 部署 Analytics Aggregator 合约 | P2 | 2 天 |
| TD-048 | `src/hooks/useConfigValidation.ts` | 53 | 主网 PSM 地址配置 | P2 | 0.5 天 (主网部署后) |
| TD-049 | `src/components/bribes/CreateBribeForm.tsx` | 57 | 从合约获取当前 epoch | P3 | 0.5 天 |

**其他小计**: 12 TODOs (合并为 3 个代表性任务), **3 天**

---

## 📈 优先级路线图

### Phase 2 (当前 - 2025 Q1)

**目标**: Launchpad 和 Presale 功能上线

| 优先级 | 模块 | TODOs | 工作量 | 状态 |
|--------|------|-------|--------|------|
| P0 | Launchpad 核心 | 4 | 8 天 | ⏳ Pending |
| P0 | Presale Settlement | 1 | 2 天 | ⏳ Pending |
| P1 | Launchpad 投票 | 9 | 7 天 | ⏳ Pending |
| P1 | Presale 其他 | 3 | 6 天 | ⏳ Pending |

**Phase 2 总计**: 20 TODOs, **23 天** (可并行 2-3 人)

---

### Phase 3.1 (2025 Q2)

**目标**: 功能增强和性能优化

| 优先级 | 模块 | TODOs | 工作量 | 依赖 |
|--------|------|-------|--------|------|
| P2 | 多抵押品支持 | 5 | 5 天 | 合约 v2 |
| P2 | Boost/Rewards 优化 | 7 | 4.5 天 | 合约查询接口 |
| P2 | Treasury RWA | 6 | 4 天 | RWA token 部署 |
| P2 | Analytics 合约 | 1 | 2 天 | 合约开发 |
| P2 | Liquidity 优化 | 4 | 3.5 天 | 价格计算优化 |
| P2 | Gauges 查询 | 4 | 1 天 | GaugeController 接口 |

**Phase 3.1 总计**: 27 TODOs, **20 天**

---

### Phase 3.2 (2025 Q3)

**目标**: The Graph Subgraph 事件索引

| 优先级 | 模块 | TODOs | 工作量 | 依赖 |
|--------|------|-------|--------|------|
| P2 | Portfolio 历史 | 8 | 4 天 | Subgraph |
| P2 | Analytics 历史 | 6 | 3 天 | Subgraph |
| P2 | Liquidation 历史 | 1 | 1 天 | Subgraph |
| P2 | System Metrics | 4 | 2 天 | Subgraph |

**Phase 3.2 总计**: 19 TODOs (实际 18, 部分重复), **10 天** (依赖 Subgraph 开发 2 周)

---

### Phase 3.3 (2025 Q4)

**目标**: 用户体验增强

| 优先级 | 模块 | TODOs | 工作量 |
|--------|------|-------|--------|
| P3 | 国际化 (i18n) | 8 | 4 天 |
| P3 | 自定义 DEX | 2 | 4 天 |
| P3 | 其他增强 | 10 | 6 天 |

**Phase 3.3 总计**: 20 TODOs, **14 天**

---

## 🔧 追踪机制

### 1. TODO ID 分配

每个 TODO 分配唯一 ID: `TD-001` ~ `TD-086`

**命名规则**: `TD-{三位数字}`

### 2. 优先级定义

| 等级 | 说明 | 时间线 | 示例 |
|------|------|--------|------|
| **P0** | 关键功能，阻塞上线 | 立即 (1-2 周) | Launchpad 参与表单 |
| **P1** | 重要功能，影响体验 | 短期 (1 个月) | 投票历史查询 |
| **P2** | 增强功能，提升质量 | 中期 (2-3 个月) | The Graph 事件索引 |
| **P3** | 优化功能，锦上添花 | 长期 (6 个月+) | 国际化支持 |

### 3. 工作量估算

| 复杂度 | 工作量 | 示例 |
|--------|--------|------|
| **简单** | 0.5 天 | 配置更新、简单查询 |
| **中等** | 1-2 天 | wagmi hooks 集成、UI 组件 |
| **复杂** | 2-3 天 | 多合约交互、复杂逻辑 |
| **合约开发** | 3-5 天 | 新合约部署、审计 |

### 4. 状态追踪

| 状态 | 说明 | 负责人 | 更新频率 |
|------|------|--------|----------|
| ⏳ **Pending** | 待开始 | - | - |
| 🚧 **In Progress** | 开发中 | 分配给开发者 | 每日更新 |
| ✅ **Completed** | 已完成 | - | PR 合并后 |
| ⚠️ **Blocked** | 被阻塞 | 记录阻塞原因 | 问题解决前 |

### 5. 定期评审

**频率**: 每月一次 (每月第一个周一)

**评审内容**:
1. 已完成 TODOs 回顾
2. 优先级调整
3. 新增 TODOs 识别
4. 工作量重新估算
5. 下月计划制定

**参与人员**: 技术负责人、前端开发、合约开发

---

## 🔗 关联文档

### 项目文档

- **Roadmap**: `.ultra/docs/roadmap.md` (如果存在)
- **Architecture**: `../../ARCHITECTURE.md` (父目录)
- **Deployment Summary**: `TESTNET_DEPLOYMENT_SUMMARY.md`

### Mock Cleanup 相关

- **Scan Report**: `.ultra/docs/hardcoded-data-scan-report.md`
- **Placeholder Audit**: `.ultra/docs/placeholder-addresses-audit.md`
- **Final Report**: `.ultra/docs/hardcoded-data-final-report.md`

### 任务管理

- **Tasks**: `.ultra/tasks/tasks.json` (Native task system)
- **Task Dependencies**: 见各 Phase 的 dependencies 字段

---

## 📊 统计面板

### 总览

```
总计 TODOs: 86
├─ 🔴 P0: 8 (9.3%)
├─ 🟠 P1: 12 (14.0%)
├─ 🟡 P2: 38 (44.2%)
└─ 🟢 P3: 28 (32.6%)

预计总工作量: 46 天
├─ Phase 2: 23 天 (50.0%)
├─ Phase 3.1: 20 天 (43.5%)
├─ Phase 3.2: 10 天 (21.7%)
└─ Phase 3.3: 14 天 (30.4%)
```

### 模块分布

| 模块 | TODOs | 占比 | 优先级 |
|------|-------|------|--------|
| Launchpad | 15 | 17.4% | P0-P1 |
| Portfolio | 8 | 9.3% | P2 |
| Analytics | 6 | 7.0% | P2 |
| Presale | 5 | 5.8% | P0-P1 |
| Boost/Rewards | 7 | 8.1% | P2 |
| Treasury/RWA | 6 | 7.0% | P2 |
| Liquidity | 6 | 7.0% | P2-P3 |
| 国际化 | 8 | 9.3% | P3 |
| 其他 | 25 | 29.1% | P2-P3 |

---

## ⚠️ 风险提示

### 高风险 TODOs

| TD-ID | 描述 | 风险 | 缓解措施 |
|-------|------|------|----------|
| TD-005 | Launchpad 参与表单 | 关键路径，阻塞 Phase 2 上线 | 提前 2 周开发，充分测试 |
| TD-016 | Presale 结算合约 | 涉及资金安全，需审计 | 独立审计，多重签名 |
| TD-018-024 | The Graph Subgraph | 依赖外部服务，可能延期 | 提前 1 个月启动，备用方案 |

### 技术依赖

| 依赖 | 影响 TODOs | 状态 | 风险等级 |
|------|-----------|------|----------|
| **合约 v2 (多抵押品)** | TD-025 ~ TD-027 | ⏳ Planning | 🟡 Medium |
| **The Graph Subgraph** | TD-018 ~ TD-024 | ⏳ Not Started | 🟠 High |
| **RWA Token 部署** | TD-037 ~ TD-039 | ⏳ Phase 3.2+ | 🟢 Low |
| **Analytics 合约** | TD-047 | ⏳ Phase 3.1 | 🟡 Medium |

---

## 📋 下一步行动

### 立即行动 (本周)

1. ✅ **完成 mock-3.2**: 最终验收测试与交付
2. ⏳ **启动 Phase 2**: Launchpad 核心功能开发
   - TD-005, TD-008, TD-012 (P0 任务)
   - 分配开发资源 (2 人)

### 短期计划 (本月)

1. 完成 Phase 2 P0 任务 (4 个 TODOs, 8 天)
2. 启动 Phase 2 P1 任务 (12 个 TODOs, 13 天)
3. 规划 The Graph Subgraph 架构

### 中期计划 (下季度)

1. 完成 Phase 2 全部功能 (20 TODOs)
2. 启动 Phase 3.1 功能增强 (27 TODOs)
3. 部署 The Graph Subgraph 基础设施

---

## 📞 联系方式

**技术负责人**: [待填写]
**前端负责人**: [待填写]
**合约负责人**: [待填写]

**技术债务评审会议**: 每月第一个周一 10:00 AM

---

**文档维护**: 由技术负责人在每次评审后更新
**版本控制**: 本文档纳入 Git 版本控制，跟踪变更历史

---

**Last Review**: 2025-11-12
**Next Review**: 2025-12-01
