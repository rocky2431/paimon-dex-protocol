# Feature: 创建用户中心路由和布局

**Task ID**: 29
**Status**: In Progress
**Branch**: feat/task-29-user-center-layout

## Overview
创建统一的用户中心路由 `/user-center`，采用 6 Tab 布局设计，整合用户相关的所有功能模块（概览、仓位、奖励、KYC、任务、推荐）。

## Rationale
当前用户功能分散在多个独立页面（/portfolio、/rewards 等），缺乏统一入口，用户体验不佳。通过创建统一用户中心：
- 提升用户体验：单一入口访问所有用户相关功能
- 改善导航：Tab 切换更流畅，状态保持更好
- 便于扩展：未来新功能可轻松添加为新 Tab
- 符合产品规划：为后续迁移 Portfolio Hub、KYC、任务系统做准备

## Impact Assessment
- **User Stories Affected**: 新增用户中心统一入口（未在 specs/product.md 中定义，Phase 1.6 新需求）
- **Architecture Changes**: 否（使用现有 Next.js App Router + Material-UI）
- **Breaking Changes**: 否（保留现有页面，仅新增路由）

## Requirements Trace
- Traces to: .ultra/tasks/tasks.json#task-29
- Related to: Task 30（迁移 Portfolio Hub）, Task 31（迁移 KYC 模块）

## Technical Design

### Route Structure
```
/user-center
├── ?tab=overview    (默认 Tab 1: 概览)
├── ?tab=positions   (Tab 2: 仓位)
├── ?tab=rewards     (Tab 3: 奖励)
├── ?tab=kyc         (Tab 4: KYC)
├── ?tab=tasks       (Tab 5: 任务)
└── ?tab=referral    (Tab 6: 推荐)
```

### Component Structure
```
src/app/user-center/
├── page.tsx              # Main page component
└── components/
    ├── UserCenterLayout.tsx    # 6 Tab layout container
    ├── OverviewTab.tsx         # Tab 1: 概览（占位）
    ├── PositionsTab.tsx        # Tab 2: 仓位（占位）
    ├── RewardsTab.tsx          # Tab 3: 奖励（占位）
    ├── KYCTab.tsx              # Tab 4: KYC（占位）
    ├── TasksTab.tsx            # Tab 5: 任务（占位）
    └── ReferralTab.tsx         # Tab 6: 推荐（占位）
```

### Material-UI Components
- `Tabs` + `Tab` - Tab 切换导航
- `TabPanel` - Tab 内容容器
- `Container` + `Box` - 布局容器
- 响应式设计：Desktop (horizontal tabs) / Mobile (scrollable tabs)

## Implementation Phases

### Phase 1: 基础路由和布局（Task 29 范围）
- [x] 创建 /user-center 路由
- [x] 实现 6 Tab 布局
- [x] Tab 切换逻辑（URL query param）
- [x] 移动端适配
- [x] 占位组件（显示 "Coming Soon" 或简单描述）

### Phase 2: 内容迁移（Task 30-35）
- [ ] Task 30: 迁移 Portfolio Hub (Overview, Positions, Rewards)
- [ ] Task 31: 迁移 KYC 模块
- [ ] Task 32: 迁移任务系统
- [ ] Task 33: 迁移推荐系统

## Testing Strategy

### Unit Tests (Jest + React Testing Library)
- Tab 组件渲染正确
- Tab 切换逻辑正常
- URL query param 同步
- 移动端响应式布局

### E2E Tests (Playwright)
- 导航到 /user-center 成功
- 点击每个 Tab 切换成功
- URL query param 更新正确
- 刷新页面保持 Tab 状态

## Acceptance Criteria

### AC1: /user-center 路由可访问
- 输入 URL `/user-center` 能成功加载页面
- 默认显示 Tab 1（概览）

### AC2: 6 个 Tab 正确渲染
- 6 个 Tab 标签正确显示：概览、仓位、奖励、KYC、任务、推荐
- 每个 Tab 对应的占位内容正确显示

### AC3: Tab 切换平滑
- 点击 Tab 立即切换内容（< 100ms）
- URL query param 同步更新（?tab=xxx）
- 浏览器前进/后退按钮工作正常

### AC4: 移动端适配良好
- 小屏幕（< 600px）Tab 可滚动
- Tab 标签文字不被截断
- 触摸交互流畅
