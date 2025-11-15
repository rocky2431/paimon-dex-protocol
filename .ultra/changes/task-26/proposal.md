# Feature: 实现任务进度跟踪 API

**Task ID**: 26
**Status**: In Progress
**Branch**: feat/task-26-task-progress-api

## Overview

创建统一的任务进度查询 API，聚合社交任务（TaskOn）和自建 RWA 任务的进度数据，为用户中心提供完整的任务完成度视图。

## Rationale

用户需要在一个页面查看所有任务（社交 + RWA）的完成进度，当前数据分散在：
- TaskProgress 表（社交任务，from TaskOn）
- RWATaskVerification 服务（自建复杂任务）

需要统一聚合并优化性能（Redis 缓存 5 分钟），确保 API 响应时间 < 500ms。

## Impact Assessment

- **User Stories Affected**:
  - 用户中心任务进度展示
  - 任务奖励领取前置条件查询

- **Architecture Changes**: No
  - 新增 API 路由：GET /api/tasks/:address
  - 新增 Service 层：TaskProgressService
  - 复用现有 RWATaskVerification 服务

- **Breaking Changes**: No
  - 纯新增功能，不影响现有接口

## Requirements Trace

- Traces to: Task 26 acceptance criteria
- Dependencies: Task 25 (RWA 任务验证引擎) ✅, Task 24 (KYC 权限关联) ✅

## Implementation Plan

### Phase 1: Service Layer (聚合逻辑)
- 创建 TaskProgressService
- 实现社交任务查询（from task_progress table）
- 实现 RWA 任务查询（call VerificationService）
- 统一数据格式（pending/completed/claimed）

### Phase 2: API Layer (FastAPI 路由)
- 创建 GET /api/tasks/:address 端点
- 参数验证（address format）
- 响应格式标准化

### Phase 3: Performance Optimization (Redis 缓存)
- 实现 5 分钟 TTL 缓存
- 缓存 key: `task:progress:{address}`
- Cache-First 策略

## Technical Stack

- FastAPI (API 框架)
- SQLAlchemy (ORM)
- Redis (Upstash, 缓存)
- web3.py (RWA 任务验证依赖)

## Performance Targets

- API 响应时间 < 500ms（包含缓存）
- Redis 缓存 TTL: 5 分钟
- 支持并发查询 >100 req/s
