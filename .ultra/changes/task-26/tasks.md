# Task 26: 实现任务进度跟踪 API

## Task Details

- **ID**: 26
- **Phase**: Phase 1
- **Stage**: Stage 1.5: 任务中心 MVP
- **Status**: In Progress
- **Started**: 2025-11-16T12:45:00Z
- **Complexity**: 4/10
- **Priority**: P0
- **Estimated Days**: 2
- **Dependencies**: Task 25 ✅, Task 24 ✅

## Description

创建 GET /api/tasks/:address 端点。聚合社交任务（TaskOn）+ 自建 RWA 任务进度。返回统一格式（pending, completed, claimed）。实现任务完成度统计和 Redis 缓存。

## Acceptance Criteria

- [ ] 社交任务进度查询正常（从 task_progress 表）
- [ ] 自建复杂 RWA 任务进度查询正常
- [ ] 聚合结果格式统一
- [ ] 性能优化（Redis 缓存 5 分钟）
- [ ] API 响应时间 < 500ms

## Implementation Checklist

### Phase 1: Service Layer
- [ ] 创建 TaskProgressService
- [ ] 实现 get_social_task_progress()
- [ ] 实现 get_rwa_task_progress()
- [ ] 实现 aggregate_task_progress()
- [ ] 编写 Service 层单元测试

### Phase 2: API Layer
- [ ] 创建 GET /api/tasks/:address 路由
- [ ] 实现请求参数验证
- [ ] 实现响应格式标准化
- [ ] 编写 API 集成测试

### Phase 3: Performance Optimization
- [ ] 实现 Redis 缓存（5 分钟 TTL）
- [ ] Cache-First 策略
- [ ] 性能测试（响应时间 < 500ms）

### Phase 4: Documentation & Testing
- [ ] API 文档（OpenAPI schema）
- [ ] 6-dimensional test coverage
- [ ] Code quality check (SOLID/DRY/KISS/YAGNI)

## Tags

backend, task, api, progress, redis
