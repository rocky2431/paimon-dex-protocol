# Task 29: 创建用户中心路由和布局

**From**: `.ultra/tasks/tasks.json` (Task ID 29)

## Task Details

- **Phase**: Phase 1
- **Stage**: Stage 1.6: 用户中心重构
- **Title**: 创建用户中心路由和布局
- **Description**: 创建 /user-center 路由。设计 6 Tab 布局（概览、仓位、奖励、KYC、任务、推荐）。实现 Tab 切换逻辑。
- **Complexity**: 3/10
- **Priority**: P0
- **Dependencies**: Task 16 ✅ (测试钱包迁移完整性)
- **Estimated Days**: 1 day
- **Status**: In Progress
- **Started At**: 2025-11-16T15:45:00Z

## Acceptance Criteria

- [ ] AC1: /user-center 路由可访问
- [ ] AC2: 6 个 Tab 正确渲染
- [ ] AC3: Tab 切换平滑
- [ ] AC4: 移动端适配良好

## Implementation Checklist

### Setup
- [x] 标记任务为 in_progress
- [x] 创建 feature 分支 `feat/task-29-user-center-layout`
- [x] 创建 changes 目录

### RED Phase (TDD)
- [ ] 编写路由测试（/user-center 可访问）
- [ ] 编写 Tab 渲染测试（6 个 Tab 正确显示）
- [ ] 编写 Tab 切换测试（点击 Tab 切换内容）
- [ ] 编写 URL query param 测试（?tab=xxx）
- [ ] 编写移动端响应式测试
- [ ] 运行测试确认失败（RED）

### GREEN Phase (Implementation)
- [ ] 创建 src/app/user-center/page.tsx
- [ ] 创建 UserCenterLayout 组件
- [ ] 创建 6 个占位 Tab 组件
- [ ] 实现 Tab 切换逻辑（useState + URL query param）
- [ ] 实现移动端适配（responsive tabs）
- [ ] 运行测试确认通过（GREEN）

### REFACTOR Phase
- [ ] 代码质量检查（SOLID/DRY/KISS/YAGNI）
- [ ] 提取可复用组件/hooks
- [ ] 优化性能（memoization）
- [ ] 添加 TypeScript 类型
- [ ] 代码注释完善

### Finalization
- [ ] 所有测试通过（Jest + Playwright）
- [ ] TypeScript 编译无错误
- [ ] 代码质量检查通过
- [ ] 提交代码（conventional commit）
- [ ] 更新 tasks.json
- [ ] 合并到 main 并删除分支

## Tags

- frontend
- user-center
- routing
- layout
