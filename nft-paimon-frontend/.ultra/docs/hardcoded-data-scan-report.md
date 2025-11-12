# 硬编码和 Mock 数据排查报告

**生成时间**: 2025-11-12T12:00:00.000Z
**扫描范围**: `src/app`, `src/components`, `src/hooks`
**排除文件**: 测试文件 (`__tests__`, `*.test.ts`, `*.spec.ts`)

---

## 📊 执行摘要

| 类别 | 数量 | 严重程度 | 状态 |
|------|------|----------|------|
| **MOCK 数据** | 7 | 🔴 HIGH | ❌ 需要立即修复 |
| **占位地址** | 26 | 🟡 MEDIUM | ⚠️  需要审查 |
| **硬编码数值** | 1 | 🟡 MEDIUM | ⚠️  需要审查 |
| **TODO 标记** | 78 | 🟢 LOW | ℹ️  待跟进 |
| **总计** | **112** | - | - |

---

## 🔴 HIGH 优先级：MOCK 数据（7处）

### 1. `src/app/liquidity/page.tsx` - LP 池子数据

**问题**:
```typescript
// Line 57-95
const MOCK_POOLS = [
  {
    id: 'hyd-usdc',
    name: 'HYD/USDC',
    lpToken: '0x0000000000000000000000000000000000000001' as `0x${string}`,
    apr: 12.5,
    // ...
  },
  // ... 2 more pools
];

// Line 97-125
const MOCK_NITRO_POOLS = [
  {
    id: 'hyd-usdc-nitro',
    poolName: 'HYD/USDC Nitro',
    lpToken: '0x0000000000000000000000000000000000000002' as `0x${string}`,
    // ...
  },
  // ... 2 more nitro pools
];
```

**使用位置**:
- Line 283: `{MOCK_POOLS.map((pool) => (...))}`
- Line 440: `<NitroPoolList pools={MOCK_NITRO_POOLS} />`

**影响**:
- ❌ 用户看到的 LP 池子列表是假数据
- ❌ APR、TVL 等关键指标不准确
- ❌ 无法进行真实的流动性操作

**修复方案**:
1. **常规 LP 池子**:
   - 使用已有的 `src/config/pools.ts` 配置（真实地址）
   - 通过 wagmi `useReadContracts` 批量查询池子数据：
     - `DEXPair.getReserves()` - 获取流动性
     - `Gauge.rewardRate()` - 获取奖励速率
     - `GaugeController.gaugeWeights()` - 获取权重

2. **Nitro 池子**:
   - 查询 `NitroPool.getActivePools()`
   - 查询各池子的 `multiplier`, `endTime`, `rewardToken`

---

### 2. `src/components/stability-pool/LiquidationHistory.tsx` - 清算历史

**问题**:
```typescript
// Line 57-78
const MOCK_LIQUIDATIONS = [
  {
    id: '1',
    timestamp: 1699920000,
    collateral: 'HYD',
    collateralAmount: 1500,
    debtOffset: 120000,
    liquidator: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  },
  // ... 4 more liquidations
];

// Line 81
const liquidations = useMemo(() => MOCK_LIQUIDATIONS, []);
```

**影响**:
- ❌ 用户看到虚假的清算历史
- ❌ 无法追踪真实的清算事件
- ❌ 统计数据（总清算次数、总债务）不准确

**修复方案**:
1. **短期方案**（无 Subgraph）:
   - 显示 "暂无清算历史" 或 "数据加载中"
   - 添加 TODO 注释：Phase 3.2+ 需要事件索引

2. **长期方案**（Phase 3.2+）:
   - 部署 The Graph Subgraph
   - 索引 `Liquidated` 事件：
     ```solidity
     event Liquidated(
       address indexed borrower,
       address indexed liquidator,
       uint256 debtOffset,
       uint256 collateralSent
     );
     ```
   - 前端查询 Subgraph GraphQL API

---

### 3. `src/app/portfolio/page.tsx` - Portfolio 注释

**问题**:
```typescript
// Line 66
// Portfolio aggregation - replaces MOCK_POSITIONS
```

**状态**: ✅ **已修复**
- 该注释表示 MOCK_POSITIONS 已被移除
- 当前使用真实的 hook 聚合数据
- 无需进一步操作

---

## 🟡 MEDIUM 优先级：占位地址（26处）

### 分类统计

| 文件类别 | 数量 | 说明 |
|---------|------|------|
| **配置文件** | 15 | `constants.ts` 中的占位地址，需要文档标注 |
| **Hook 逻辑** | 8 | 零地址检查（`0x00...00`），正常用法 |
| **Liquidity Page** | 3 | MOCK_POOLS 相关，需随 MOCK_POOLS 一起移除 |

### 需要关注的占位地址

#### 1. `src/components/treasury/constants.ts`

```typescript
// Line 14, 23, 32 - RWA_ASSETS 配置
{
  symbol: 'tUST',
  name: 'Tokenized US Treasury',
  address: '0x0000000000000000000000000000000000000001', // ❌ 占位地址
  tier: 'T1',
  ltv: 80,
  isActive: false, // ✅ 已标记为 inactive
}
```

**状态**: ⚠️  **可接受**
- `isActive: false` 表示未部署
- 注释标记为 "Placeholder for future RWA tokens"
- **建议**: 添加 `// TODO: Deploy and update address in Phase 3.2+`

#### 2. `src/components/bribes/constants.ts`

```typescript
// Line 13
export const BRIBE_MARKETPLACE_ADDRESS =
  "0x0000000000000000000000000000000000001000" as `0x${string}`;
```

**状态**: ❌ **需要修复**
- 当前部署的真实地址应该在 `deployments/testnet/addresses.json`
- **修复**: 从 `TESTNET_ADDRESSES.incentives.bribeMarketplace` 导入

#### 3. `src/components/rewards/constants.ts`

```typescript
// Line 9
export const PAIMON_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000002' as `0x${string}`;
```

**状态**: ❌ **需要修复**
- 应该使用 `TESTNET_ADDRESSES.core.paimon`
- **修复**: 导入真实地址

---

## 🟡 MEDIUM 优先级：硬编码数值（1处）

### `src/components/stability-pool/LiquidationHistory.tsx`

```typescript
// Line 66
debtOffset: 120000,
```

**问题**: 在 MOCK_LIQUIDATIONS 数据中
**状态**: 🔗 **关联问题**
- 随 MOCK_LIQUIDATIONS 移除后解决
- 无需单独修复

---

## 🟢 LOW 优先级：TODO 标记（78处）

### 分类统计

| 类别 | 数量 | 示例 |
|------|------|------|
| **Phase 2 功能** | 15 | Launchpad、Presale 相关 |
| **Phase 3.2+ 改进** | 25 | 事件索引、Subgraph 集成 |
| **国际化支持** | 8 | `next-intl` 集成 |
| **性能优化** | 12 | 批量领取、缓存策略 |
| **功能增强** | 18 | 多抵押品、高级指标 |

### 高频 TODO 模式

1. **事件索引依赖** (Phase 3.2+):
   ```typescript
   // TODO: Implement in Phase 3.2+ via event indexing or subgraph
   ```
   - 出现次数: 18
   - 受影响模块: Portfolio, Analytics, Liquidation History

2. **多抵押品支持** (Phase 3.2+):
   ```typescript
   // TODO Phase 3.2+: Implement multi-collateral position queries
   ```
   - 出现次数: 8
   - 受影响模块: Vault, Treasury, Portfolio

3. **国际化** (i18n):
   ```typescript
   // TODO: Add locale support via next-intl
   ```
   - 出现次数: 6
   - 受影响页面: Borrow, Stability Pool, Vault

---

## 📋 修复优先级建议

### 🔴 立即修复（本周内）

1. **移除 `MOCK_POOLS` 和 `MOCK_NITRO_POOLS`**
   - 文件: `src/app/liquidity/page.tsx`
   - 工作量: 0.5 天
   - 依赖: 需要实现 LP 池子数据查询 hook

2. **移除 `MOCK_LIQUIDATIONS`**
   - 文件: `src/components/stability-pool/LiquidationHistory.tsx`
   - 工作量: 0.25 天
   - 临时方案: 显示 "暂无数据" + Phase 3.2+ 提示

3. **修复占位地址常量**
   - 文件: `src/components/bribes/constants.ts`, `src/components/rewards/constants.ts`
   - 工作量: 0.125 天
   - 修复: 导入 `TESTNET_ADDRESSES`

### 🟡 计划修复（Phase 3.2+）

1. **实现事件索引**
   - 部署 The Graph Subgraph
   - 索引关键事件（Liquidated, Transfer, Deposit, etc.）
   - 前端集成 GraphQL 查询

2. **多抵押品支持**
   - 扩展 Vault 合约查询接口
   - 实现批量位置查询
   - Portfolio 多资产聚合

3. **国际化支持**
   - 集成 `next-intl`
   - 翻译所有 UI 文本
   - 动态语言切换

### 🟢 技术债务追踪

- 添加 `.ultra/docs/technical-debt.md`
- 分类记录所有 78 个 TODO
- 定期评审和优先级调整

---

## 🎯 成功指标

修复完成后，应达到：

- ✅ **0 个 MOCK 数据**（HIGH 优先级清零）
- ✅ **0 个未文档化的占位地址**
- ✅ **所有配置文件的占位地址都有 TODO 注释**
- ✅ **技术债务追踪系统建立**

---

## 📝 附录：完整扫描日志

扫描脚本位置: `scripts/check-hardcoded-data.ts`

运行命令:
```bash
npx tsx scripts/check-hardcoded-data.ts
```

扫描范围:
- `src/app/` - 29 pages
- `src/components/` - 150+ components
- `src/hooks/` - 50+ hooks

排除文件:
- 所有测试文件 (`__tests__/`, `*.test.ts`, `*.spec.ts`)
- Node modules
- Build artifacts (`.next/`, `.vercel/`)

---

**生成工具**: Ultra Builder Pro 4.0 - Hardcoded Data Scanner
**报告版本**: v1.0
**下次扫描建议**: 修复后 + 每次发布前
