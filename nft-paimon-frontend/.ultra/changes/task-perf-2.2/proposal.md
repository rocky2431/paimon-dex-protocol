# Feature: 启用 Next.js 实验性优化选项

**Task ID**: perf-2.2
**Status**: In Progress
**Branch**: feat/task-perf-2.2-nextjs-experimental

## Overview

启用 Next.js 14 的多项实验性优化功能，包括包导入优化、并行构建、SWC 压缩等，进一步提升编译和构建性能。

## Rationale

**当前状况**：
- 编译时间虽然已优化至 1-2 秒
- 但仍有优化空间，特别是：
  - Material-UI 等大型库的导入可优化
  - 构建过程可并行化
  - SWC 压缩可进一步优化

**解决方案**：
启用 Next.js experimental 配置：
1. `optimizePackageImports` - 自动优化大型包的导入（树摇优化）
2. `webpackBuildWorker` - 启用并行构建
3. `swcMinify` - 使用 SWC 进行代码压缩

**预期效果**：
- 编译时间减少 15-25%
- 打包体积减少（树摇优化）
- 构建速度提升（并行化）

## Impact Assessment

- **User Stories Affected**: 无（纯性能优化）
- **Architecture Changes**: 否
- **Breaking Changes**: 否

## Requirements Trace

- Traces to: ultra-think analysis dimension 4.1
- Priority: P1 (重要)
- Complexity: 3/10 (中高)
- Dependencies: perf-2.1 ✅

## Implementation Plan

### 1. 添加 experimental.optimizePackageImports

优化以下大型包的导入：
- `@mui/material` - Material-UI 核心
- `@mui/icons-material` - Material-UI 图标
- `recharts` - 图表库
- `lightweight-charts` - 轻量图表库

### 2. 启用 experimental.webpackBuildWorker

使用 worker 线程并行构建，提升多核 CPU 利用率。

### 3. 启用 experimental.swcMinify

使用 Rust 编写的 SWC 进行代码压缩，比 Terser 快 7-20 倍。

## Acceptance Criteria

- [ ] `next.config.mjs` 添加 experimental 配置
- [ ] 编译时间减少（基准测试）
- [ ] 所有依赖包正常加载
- [ ] Material-UI 组件渲染正常
- [ ] Charts 组件工作正常
- [ ] 生产构建成功

## Testing Plan

1. **功能测试**: 验证所有页面正常渲染
2. **性能测试**: 对比启用前后的编译时间
3. **兼容性测试**: 验证 MUI、Charts 等库正常工作
4. **生产构建测试**: `npm run build` 成功

## Risk Assessment

**风险等级**: 中

**潜在风险**：
- 实验性功能可能有兼容性问题
- 某些库可能不支持自动优化

**缓解措施**：
- 充分测试所有功能
- 如遇问题可回滚配置
- 逐步启用，而非全部启用

**回滚方案**：
- 移除 experimental 配置
- 恢复默认设置
