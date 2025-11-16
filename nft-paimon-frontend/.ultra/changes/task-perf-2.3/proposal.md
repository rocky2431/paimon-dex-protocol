# Feature: 配置文件系统监听忽略规则

**Task ID**: perf-2.3
**Status**: In Progress
**Branch**: feat/task-perf-2.3-watch-ignore

## Overview

配置 Webpack watchOptions 来忽略不需要监听的文件和目录，减少文件系统监听开销，提升热更新性能。

## Rationale

**当前状况**：
- Webpack 默认监听所有文件变化
- 包括 node_modules、.git、.next、测试文件等
- 这些目录/文件变化不需要触发重新编译
- 造成不必要的 CPU 和内存开销

**解决方案**：
配置 `watchOptions.ignored` 规则，忽略：
- `node_modules/**` - 依赖包目录
- `.git/**` - Git 版本控制
- `.next/**` - Next.js 构建输出
- `**/*.test.*` - 测试文件
- `**/*.spec.*` - 测试规范文件
- `e2e/**` - E2E 测试目录

**预期效果**：
- 减少文件监听开销
- 热更新响应保持在 30-50ms
- 测试文件修改不会触发重新编译

## Impact Assessment

- **User Stories Affected**: 无（纯性能优化）
- **Architecture Changes**: 否
- **Breaking Changes**: 否

## Requirements Trace

- Traces to: ultra-think analysis dimension 5.1
- Priority: P2 (一般)
- Complexity: 2/10 (中等)
- Dependencies: 无

## Implementation Plan

### 1. 修改 next.config.mjs

在 webpack 配置中添加 watchOptions：
```javascript
config.watchOptions = {
  ignored: [
    '**/node_modules/**',
    '**/.git/**',
    '**/.next/**',
    '**/*.test.*',
    '**/*.spec.*',
    '**/e2e/**',
    '**/test-results/**',
    '**/playwright-report/**',
  ],
};
```

### 2. 验收标准

- [ ] watchOptions 配置已添加
- [ ] 热更新响应时间保持在 30-50ms
- [ ] 修改源代码后立即刷新
- [ ] 修改测试文件不会触发重新编译

### 3. 测试计划

1. **基准测试**: 测量修改源文件后的热更新时间
2. **负面测试**: 修改测试文件，验证不会触发编译
3. **功能测试**: 验证正常开发流程不受影响

## Risk Assessment

**风险等级**: 低

**潜在风险**：
- 忽略规则配置错误可能导致某些文件变化被忽略

**缓解措施**：
- 仅忽略明确不需要监听的目录
- 充分测试热更新功能

**回滚方案**：
- 移除 watchOptions 配置
- 恢复默认文件监听行为
