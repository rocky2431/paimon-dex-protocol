# Feature: 迁移 Portfolio Hub 到用户中心 Tab 1-3

**Task ID**: 30
**Status**: In Progress
**Branch**: feat/task-30-migrate-portfolio-hub

## Overview

将现有的 Portfolio Hub (`/portfolio` 页面) 的三个核心 Tab 迁移到新的用户中心 (`/user-center`)：
- Tab 1: Overview（概览）
- Tab 2: Positions（仓位）
- Tab 3: Rewards（奖励）

这是用户中心重构的 Phase 2 的第一步，将分散的用户相关功能统一到一个入口。

## Rationale

**为什么需要这个迁移？**

1. **统一用户体验**: Task 29 创建了用户中心框架，现在需要填充实际内容
2. **代码复用**: Portfolio Hub 已有成熟的组件和 hooks，可以直接迁移
3. **渐进式重构**: 保留所有现有功能，不破坏用户体验
4. **为后续功能铺路**: 统一入口后，用户可以在一个页面管理所有资产和活动

**业务价值**:
- 降低用户认知负担（一个入口 vs 多个页面）
- 提升导航效率
- 为 KYC、Tasks、Referral 等新功能提供统一框架

## Impact Assessment

**User Stories Affected**:
- [User Center] 用户可以在统一入口查看所有资产概览
- [User Center] 用户可以在统一入口管理所有仓位
- [User Center] 用户可以在统一入口查看和领取奖励

**Architecture Changes**: No
- 组件层面的迁移，不涉及架构变化
- 复用现有 hooks 和组件
- 仅调整组件位置和路由

**Breaking Changes**: No
- `/portfolio` 页面将继续存在（或重定向到 `/user-center`）
- 所有现有功能保持不变
- 数据查询逻辑不变

## Requirements Trace

- Traces to: Task 29 (用户中心布局)
- Depends on: Task 29 的 TabPlaceholder 组件将被实际内容替换

## Technical Approach

### 1. 组件迁移策略

**现有结构**:
```
src/app/portfolio/
├── page.tsx (Overview, Positions, Rewards tabs)
└── components/
    ├── OverviewTab.tsx
    ├── PositionsTab.tsx
    └── RewardsTab.tsx
```

**目标结构**:
```
src/app/user-center/
├── page.tsx (6 tabs)
└── components/
    ├── OverviewTab.tsx    ← 从 portfolio 迁移
    ├── PositionsTab.tsx   ← 从 portfolio 迁移
    ├── RewardsTab.tsx     ← 从 portfolio 迁移
    ├── KYCTab.tsx         ← Task 31
    ├── TasksTab.tsx       ← Task 32
    └── ReferralTab.tsx    ← Task 33
```

### 2. 迁移步骤

**Phase 1: 复制组件**
- 将 Portfolio Hub 的 3 个 Tab 组件复制到 `user-center/components/`
- 保持原有功能和样式
- 确保所有 hooks 和依赖正确导入

**Phase 2: 替换占位符**
- 在 `user-center/components/index.tsx` 中导出真实组件
- 替换 Task 29 的 TabPlaceholder

**Phase 3: 路由处理**
- 保留 `/portfolio` 路由（向后兼容）
- 添加重定向到 `/user-center?tab=overview`
- 更新导航链接

**Phase 4: 测试验证**
- 验证所有功能正常
- 确认数据显示正确
- 性能测试（无退化）

### 3. 依赖和 Hooks

需要确保以下 hooks 正确工作：
- `useAccount()` - 钱包连接
- `useBalance()` - 余额查询
- `usePositions()` - 仓位数据
- `useRewards()` - 奖励数据

### 4. 样式处理

- 保持 Material-UI 主题一致性
- 复用现有样式
- 确保响应式设计

## Testing Strategy

### Unit Tests
- 迁移后的组件渲染正确
- Props 传递正确
- 状态管理正常

### Integration Tests
- Tab 切换流畅
- 数据加载正常
- 错误处理正确

### E2E Tests
- 完整用户流程测试
- 跨页面导航测试
- 性能基准测试

## Success Criteria

- ✅ 所有 Portfolio Hub 功能在用户中心正常工作
- ✅ 数据显示与原页面完全一致
- ✅ 交互逻辑保持不变
- ✅ 性能无退化（加载时间、渲染速度）
- ✅ 所有测试通过
- ✅ TypeScript 编译 0 错误
- ✅ 代码质量符合 SOLID/DRY/KISS/YAGNI 原则

## Phase 2 (Tasks 30-33) 整体规划

- **Task 30** (本任务): 迁移 Portfolio Hub → Tab 1-3
- **Task 31**: 添加 KYC Tab → Tab 4
- **Task 32**: 集成 TaskOn 任务系统 → Tab 5
- **Task 33**: 添加推荐系统 → Tab 6

完成后，用户中心将成为用户与 Paimon DEX 交互的统一入口。
