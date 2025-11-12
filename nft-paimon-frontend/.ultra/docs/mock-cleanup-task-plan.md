# Mock Data Cleanup 任务计划

**生成时间**: 2025-11-12
**项目状态**: Gap Analysis 100% 完成，开始 Mock Data Cleanup 阶段

---

## 📊 任务概览

| 指标 | 数值 |
|------|------|
| **新增任务** | 10 个 |
| **预估工作量** | 4 天 |
| **总任务数** | 46 个（36 已完成 + 10 待开始）|
| **整体进度** | 78.26% |

---

## 🎯 任务分解

### Phase 1: 移除 MOCK 数据（P0 高优先级）

6 个任务，预估 2.375 天

| 任务 ID | 任务标题 | 复杂度 | 预估工作量 | 依赖 |
|---------|---------|--------|-----------|------|
| **mock-1.1** | 创建 useLPPools hook 查询真实池子数据 | 7 | 1 天 | - |
| **mock-1.2** | 移除 liquidity/page.tsx 中的 MOCK_POOLS | 4 | 0.5 天 | mock-1.1 |
| **mock-1.3** | 创建 useNitroPools hook 或隐藏未部署功能 | 5 | 0.75 天 | - |
| **mock-1.4** | 移除 liquidity/page.tsx 中的 MOCK_NITRO_POOLS | 3 | 0.375 天 | mock-1.3 |
| **mock-1.5** | 移除 LiquidationHistory 中的 MOCK_LIQUIDATIONS | 2 | 0.25 天 | - |
| **mock-1.6** | 修复 bribes 和 rewards 常量中的占位地址 | 2 | 0.25 天 | - |

**Phase 1 重点**:
- 🔴 **7 个 HIGH 优先级问题** 全部覆盖
- ✅ 移除所有 MOCK_ 前缀常量
- ✅ 使用真实链上数据或友好空状态

---

### Phase 2: 文档化（P1 中优先级）

2 个任务，预估 0.875 天

| 任务 ID | 任务标题 | 复杂度 | 预估工作量 | 依赖 |
|---------|---------|--------|-----------|------|
| **mock-2.1** | 审查并文档化所有占位地址 | 3 | 0.375 天 | mock-1.6 |
| **mock-2.2** | 创建技术债务追踪文档 | 4 | 0.5 天 | - |

**Phase 2 重点**:
- 🟡 处理 26 个 MEDIUM 优先级占位地址
- 📄 建立完整的技术债务追踪系统
- 📋 整理 78 个 TODO 标记

---

### Phase 3: 验收测试（P0 高优先级）

2 个任务，预估 0.75 天

| 任务 ID | 任务标题 | 复杂度 | 预估工作量 | 依赖 |
|---------|---------|--------|-----------|------|
| **mock-3.1** | 运行扫描脚本验证修复结果 | 2 | 0.25 天 | mock-1.2, mock-1.4, mock-1.5, mock-1.6, mock-2.1 |
| **mock-3.2** | 最终验收测试与交付 | 3 | 0.5 天 | mock-3.1 |

**Phase 3 重点**:
- ✅ 验证所有 HIGH 优先级问题已修复
- ✅ 生成修复前后对比报告
- ✅ 完整的 E2E 测试验收

---

## 🔗 依赖关系图

```
mock-1.1 ─┐
           ├─→ mock-1.2 ─┐
mock-1.3 ─┤              │
           ├─→ mock-1.4   │
mock-1.5 ──┤              ├─→ mock-3.1 ─→ mock-3.2 (最终交付)
           │              │        ↑
mock-1.6 ──┴─→ mock-2.1 ──┘        │
                                   │
mock-2.2 ──────────────────────────┘
```

**关键路径**: mock-1.1 → mock-1.2 → mock-3.1 → mock-3.2

---

## 📋 任务详细说明

### 🔴 mock-1.1: 创建 useLPPools hook

**目标**: 从链上查询真实的 LP 池子数据

**技术方案**:
```typescript
// src/hooks/useLPPools.ts
export function useLPPools() {
  // 1. 从 src/config/pools.ts 加载池子配置
  // 2. 批量查询池子数据：
  //    - DEXPair.getReserves() → TVL 计算
  //    - DEXPair.totalSupply() → LP token 总量
  //    - Gauge.rewardRate() → 奖励速率
  //    - GaugeController.gaugeWeights() → 投票权重
  // 3. 计算派生数据：TVL (USD), APR (%)

  return { pools, isLoading, error };
}
```

**验收标准**:
- ✅ 批量查询所有池子数据（性能优化）
- ✅ TVL 和 APR 计算准确
- ✅ 完善错误处理
- ✅ 单元测试覆盖率 ≥80%

---

### 🔴 mock-1.2: 移除 MOCK_POOLS

**目标**: liquidity/page.tsx 集成真实数据

**修改前**:
```typescript
const MOCK_POOLS = [
  { id: 'hyd-usdc', lpToken: '0x...001', apr: 12.5, tvl: '$1,234,567' },
  // ... 假数据
];
```

**修改后**:
```typescript
const { data: pools, isLoading, error } = useLPPools();

if (isLoading) return <Skeleton />;
if (error) return <Alert severity="error">{error.message}</Alert>;
if (!pools) return null;

{pools.map((pool) => <PoolCard key={pool.id} pool={pool} />)}
```

---

### 🟡 mock-1.3: 处理 Nitro Pools

**决策点**: 检查 NitroPool 合约是否已部署

**方案 A** (如果已部署):
- 创建 `useNitroPools` hook
- 查询 `NitroPool.getActivePools()`
- 显示真实 Nitro 池子数据

**方案 B** (如果未部署):
- 隐藏 Nitro Pools Tab
- 显示 Coming Soon 提示
- 添加 TODO 注释：Phase 3.2+ 实现

---

### 🔴 mock-1.5: 移除 MOCK_LIQUIDATIONS

**短期方案** (Phase 3.2 前):
```typescript
// 删除 MOCK_LIQUIDATIONS，替换为空数组
const liquidations = useMemo(() => [] as Liquidation[], []);

// 友好的空状态
{liquidations.length === 0 && (
  <Box textAlign="center" py={8}>
    <InfoIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
    <Typography variant="h6" color="text.secondary">
      暂无清算历史
    </Typography>
    <DataNotice
      message="清算历史功能需要事件索引支持，将在 Phase 3.2 通过 The Graph Subgraph 实现。"
      severity="info"
    />
  </Box>
)}
```

**长期方案** (Phase 3.2+):
- 部署 The Graph Subgraph
- 索引 `StabilityPool.Liquidated` 事件
- 创建 `useLiquidationHistory` hook 查询 GraphQL

---

### 🔴 mock-1.6: 修复占位地址

**问题**:
```typescript
// ❌ 占位地址
export const BRIBE_MARKETPLACE_ADDRESS = "0x0...1000";
export const PAIMON_TOKEN_ADDRESS = '0x0...0002';
```

**修复**:
```typescript
// ✅ 真实地址
import { TESTNET_ADDRESSES } from '@/config/generated/testnet';

export const BRIBE_MARKETPLACE_ADDRESS =
  TESTNET_ADDRESSES.incentives.bribeMarketplace;

export const PAIMON_TOKEN_ADDRESS =
  TESTNET_ADDRESSES.core.paimon;
```

---

### 📄 mock-2.1: 审查占位地址

**任务**: 审查并分类所有 26 个占位地址

**分类标准**:

**Category A: 合理的占位地址** (已标记 `isActive: false`):
```typescript
{
  symbol: 'tUST',
  address: '0x0...0001',
  isActive: false, // ✅ 明确标记为未部署
  // TODO Phase 3.2+: Deploy tUST token
}
```

**Category B: 零地址检查** (正常逻辑):
```typescript
// ✅ 正常的条件检查
enabled: tokenAddress !== "0x0000000000000000000000000000000000000000"
```

**Category C: 需要修复** → 已在 mock-1.6 处理

---

### 📄 mock-2.2: 技术债务追踪

**输出**: `.ultra/docs/technical-debt.md`

**文档结构**:
```markdown
# 技术债务追踪

## 📊 总览
- 总计：78 个 TODO
- 高优先级（P0-P1）：43 个
- 中优先级（P2）：25 个
- 低优先级（P3）：10 个

## 🔴 Phase 2 功能（15个）
### Launchpad 模块
| 文件 | 行号 | 描述 | 优先级 | 预计工作量 |
|------|------|------|--------|------------|
| ParticipateForm.tsx | 39 | 集成 wagmi hooks | P1 | 2 天 |

## 🟡 Phase 3.2+ 改进（25个）
### 事件索引依赖
| 模块 | TODO 数量 | 需求 | 技术方案 |
|------|-----------|------|----------|
| Portfolio | 8 | 历史数据查询 | The Graph Subgraph |
| Analytics | 6 | 24h 交易量统计 | Event indexing |

## 🟢 功能增强（38个）
### 国际化支持（8个）
- [ ] Borrow page
- [ ] Stability Pool page
...
```

---

### ✅ mock-3.1: 扫描验证

**命令**: `npx tsx scripts/check-hardcoded-data.ts`

**预期结果**:
```
✅ MOCK_DATA: 0 个 (从 7 个减少到 0)
✅ PLACEHOLDER_ADDRESS: ≤10 个 (从 26 个减少，仅保留合理占位)
✅ HARDCODED_NUMBER: 0 个 (从 1 个减少到 0)
ℹ️  TODO: ~80 个 (允许略有增减，应有完整文档)
```

**如果扫描失败** → 修复遗漏问题 → 重新扫描

---

### ✅ mock-3.2: 最终验收

**测试清单**:

**1. Liquidity 页面测试**:
- [ ] 页面加载正常，无 JavaScript 错误
- [ ] LP 池子列表显示真实数据
- [ ] TVL 和 APR 数值合理（非零，非假数据）
- [ ] 点击池子可查看详情
- [ ] Nitro Pools 功能正常（或正确隐藏）
- [ ] Loading 和 Error 状态显示正确

**2. Stability Pool 页面测试**:
- [ ] 清算历史显示空状态或真实数据
- [ ] Phase 3.2 提示清晰（如果是空状态）
- [ ] 存款/取款功能不受影响
- [ ] 奖励领取功能正常

**3. Governance 页面测试**:
- [ ] Bribes 功能使用真实合约地址
- [ ] Rewards 功能使用真实合约地址
- [ ] 投票功能正常
- [ ] 数据显示准确

**4. 整体测试**:
- [ ] TypeScript 编译 0 错误：`npm run type-check`
- [ ] Build 成功：`npm run build`
- [ ] 单元测试通过：`npm test`
- [ ] 无 console 错误或警告（浏览器开发者工具）

**5. 性能测试**:
- [ ] 首页加载时间 <3s
- [ ] Liquidity 页面加载时间 <5s（批量查询池子数据）
- [ ] 无明显卡顿

**交付报告**: `.ultra/docs/mock-cleanup-delivery-report.md`

---

## 🚀 推荐执行顺序

### Week 1 (Day 1-2)

**Day 1 上午**: mock-1.1 - 创建 useLPPools hook
- 设计 hook API
- 实现批量查询逻辑
- 编写单元测试

**Day 1 下午**: mock-1.2 - 移除 MOCK_POOLS
- 集成 useLPPools
- 添加 Loading/Error 处理
- 手动测试验证

**Day 2 上午**: mock-1.3 + mock-1.4 - Nitro Pools 处理
- 检查合约部署状态
- 选择方案并实现
- 移除 MOCK_NITRO_POOLS

**Day 2 下午**: mock-1.5 + mock-1.6 - 清算历史 + 占位地址
- 清理 MOCK_LIQUIDATIONS
- 修复 bribes/rewards 地址
- 运行验证测试

---

### Week 2 (Day 3-4)

**Day 3 上午**: mock-2.1 - 占位地址审查
- 遍历所有 26 个占位地址
- 添加 TODO 注释
- 生成审计文档

**Day 3 下午**: mock-2.2 - 技术债务文档
- 整理 78 个 TODO 标记
- 分类和优先级排序
- 生成完整文档

**Day 4 上午**: mock-3.1 - 扫描验证
- 运行扫描脚本
- 修复遗漏问题（如有）
- 生成对比报告

**Day 4 下午**: mock-3.2 - 最终验收
- 执行完整测试清单
- 生成交付报告
- 准备部署

---

## 📈 预期成果

### 修复前 (当前状态)

| 类别 | 数量 | 严重程度 |
|------|------|----------|
| MOCK 数据 | 7 | 🔴 HIGH |
| 占位地址 | 26 | 🟡 MEDIUM |
| 硬编码数值 | 1 | 🟡 MEDIUM |
| TODO 标记 | 78 | 🟢 LOW |
| **总计** | **112** | - |

### 修复后 (目标状态)

| 类别 | 数量 | 严重程度 | 变化 |
|------|------|----------|------|
| MOCK 数据 | 0 | - | ✅ -7 |
| 占位地址 | ≤10 | 🟢 LOW | ✅ -16 |
| 硬编码数值 | 0 | - | ✅ -1 |
| TODO 标记 | ~80 | 🟢 LOW | ℹ️ 已文档化 |
| **总计** | **≤90** | - | **✅ -22 问题** |

**关键改进**:
- ✅ **100% HIGH 优先级问题修复** (7 → 0)
- ✅ **61.5% MEDIUM 优先级问题减少** (26 → ≤10)
- ✅ **完整的技术债务追踪系统建立**
- ✅ **项目可维护性显著提升**

---

## 🎯 质量目标

| 指标 | 当前 | 目标 | 验收标准 |
|------|------|------|----------|
| **MOCK 数据** | 7 个 | 0 个 | `scripts/check-hardcoded-data.ts` 通过 |
| **真实数据覆盖** | ~92% | ≥98% | 核心功能全部使用链上数据 |
| **TypeScript 错误** | 0 | 0 | `npm run type-check` 通过 |
| **Build 成功** | ✅ | ✅ | `npm run build` 无错误 |
| **单元测试通过率** | 100% | 100% | 新增测试全部通过 |
| **E2E 测试** | 83+ tests | 83+ tests | 无回归 |

---

## 📝 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| **NitroPool 未部署** | 中 | 低 | 方案 B：隐藏功能 + TODO 标记 |
| **LP 池子数据查询慢** | 低 | 中 | 批量查询 + Loading 状态优化 |
| **占位地址误删** | 低 | 高 | 审查流程 + 分类标记 + 测试验证 |
| **技术债务遗漏** | 中 | 低 | 完整的 TODO 扫描 + 文档化 |

---

## ✅ 验收标准汇总

**Phase 1 验收**:
- ✅ 所有 MOCK_ 常量已移除
- ✅ 真实数据正确显示或友好空状态
- ✅ TypeScript 编译 0 错误
- ✅ 相关页面手动测试通过

**Phase 2 验收**:
- ✅ 26 个占位地址已审查和文档化
- ✅ 78 个 TODO 已分类和追踪
- ✅ 生成 2 个完整文档

**Phase 3 验收**:
- ✅ 扫描脚本显示 0 个 HIGH 问题
- ✅ 所有测试清单项通过
- ✅ 生成完整交付报告
- ✅ 准备好部署到生产环境

---

## 🔧 开发工具命令

```bash
# 运行硬编码数据扫描
npx tsx scripts/check-hardcoded-data.ts

# 验证合约地址
npm run verify-addresses

# 同步合约地址
npm run sync-addresses

# TypeScript 类型检查
npm run type-check

# 构建项目
npm run build

# 运行单元测试
npm test

# 运行 E2E 测试
npm run test:e2e:chromium

# 启动开发服务器
npm run dev
```

---

## 📚 相关文档

- **扫描报告**: `.ultra/docs/hardcoded-data-scan-report.md` (602 行)
- **交付报告**: `.ultra/docs/mock-cleanup-delivery-report.md` (待生成)
- **占位地址审计**: `.ultra/docs/placeholder-addresses-audit.md` (待生成)
- **技术债务追踪**: `.ultra/docs/technical-debt.md` (待生成)
- **任务定义**: `.ultra/tasks/tasks.json` (46 tasks)

---

**生成日期**: 2025-11-12
**计划版本**: v1.0
**估算信心度**: 高（基于详细扫描报告和现有代码库分析）

---

**下一步行动**: 运行 `/ultra-dev mock-1.1` 开始第一个任务 🚀
