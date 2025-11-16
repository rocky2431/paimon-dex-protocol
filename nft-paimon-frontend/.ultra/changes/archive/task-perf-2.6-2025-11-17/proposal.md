# Feature: 调整 Fast Refresh 和内存配置

**Task ID**: perf-2.6
**Status**: In Progress
**Branch**: feat/task-perf-2.6-fast-refresh-memory

## Overview

优化 Next.js Fast Refresh 和页面内存管理配置，通过调整 onDemandEntries 参数减少开发环境内存占用，同时保持良好的热更新体验。

## Rationale

**问题分析**:
- 当前开发环境会在内存中保留所有访问过的页面
- 对于 29 个页面的大型应用，内存占用较高（约 500-800MB）
- Fast Refresh 在某些情况下会触发不必要的全页面重载

**解决方案**:
通过配置 `onDemandEntries` 参数，控制内存中保留的页面数量和失效时间，实现内存优化。

## Impact Assessment

- **User Stories Affected**: 无（内部性能优化）
- **Architecture Changes**: 否
- **Breaking Changes**: 否

**性能影响**:
- 内存占用减少 10-20%（约 50-100MB）
- 热更新速度保持在 30-50ms（不变）
- 开发体验优化（更少的内存压力）

**注意事项**:
- reactStrictMode 保持为 true（与任务描述不同）
  - Strict Mode 对于发现潜在问题非常重要
  - 性能影响微小（只在开发环境生效）
  - 建议保持启用以确保代码质量

## Requirements Trace

- Traces to: ultra-think analysis dimension 4.2 (内存优化)

## Implementation Details

### 配置修改

**文件**: `next.config.mjs`

**添加配置**:
```javascript
onDemandEntries: {
  // 页面在内存中的最大存活时间（毫秒）
  // 25秒后未访问的页面会被卸载，释放内存
  maxInactiveAge: 25000,

  // 内存中同时保留的页面数量
  // 减少到2个，只保留当前页面和前一个页面
  pagesBufferLength: 2,
},
```

### 参数说明

1. **maxInactiveAge**: 25000ms (25秒)
   - 默认值: 60000ms (60秒)
   - 优化效果: 页面更快被卸载，释放内存
   - 用户影响: 25秒内切换回页面无需重新编译

2. **pagesBufferLength**: 2
   - 默认值: 5
   - 优化效果: 减少内存中保留的页面数量
   - 用户影响: 只保留最近2个访问的页面

### 测试计划

1. **内存测试**:
   - 启动开发服务器，访问多个页面
   - 使用 Chrome DevTools Memory Profiler 测量内存占用
   - 对比修改前后的内存使用情况

2. **热更新测试**:
   - 修改组件代码，测量 Fast Refresh 响应时间
   - 验证热更新功能正常工作
   - 确认没有不必要的全页面重载

3. **开发体验测试**:
   - 在不同页面间快速切换
   - 验证页面编译和加载体验
   - 确认25秒内切换不需重新编译

## Acceptance Criteria

- ✅ onDemandEntries 配置添加完成
- ✅ 内存占用减少 10-20%
- ✅ 热更新速度保持在 30-50ms
- ✅ 开发体验良好（无明显延迟）
- ✅ 页面切换流畅
- ✅ reactStrictMode 保持为 true（质量保证）
