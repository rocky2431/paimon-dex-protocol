# Feature: 启用 Webpack 文件系统持久化缓存

**Task ID**: perf-2.1
**Status**: In Progress
**Branch**: feat/task-perf-2.1-webpack-cache

## Overview

配置 Next.js 的 Webpack 使用文件系统持久化缓存，大幅减少第二次及后续启动的编译时间。

## Rationale

**当前问题**:
- 首次启动时间: ~23秒
- 每次重启都需要完全重新编译
- 开发体验不佳，影响效率

**解决方案**:
- 启用 Webpack filesystem cache
- 缓存编译结果到 `.next/cache/webpack/`
- 第二次启动复用缓存，预计减少 70-80% 编译时间

**预期效果**:
- 第二次启动时间: 23秒 → 5-7秒
- 热更新不受影响
- 开发体验显著提升

## Impact Assessment

- **User Stories Affected**: 无（纯性能优化）
- **Architecture Changes**: 否
- **Breaking Changes**: 否

## Requirements Trace

- Traces to: ultra-think analysis dimension 2.3
- Priority: P1 (重要)
- Complexity: 2/10 (中等)

## Implementation Plan

### 1. 修改 next.config.mjs

添加 webpack 配置:
```javascript
webpack: (config, { isServer }) => {
  // 启用文件系统缓存
  config.cache = {
    type: 'filesystem',
    cacheDirectory: path.join(__dirname, '.next/cache/webpack'),
    buildDependencies: {
      config: [__filename]
    }
  };

  return config;
}
```

### 2. 验收标准

- [ ] `.next/cache/webpack/` 目录被创建
- [ ] 第二次启动时间 < 7秒（从 23秒）
- [ ] 热更新功能正常
- [ ] 代码修改后自动刷新正常

### 3. 测试计划

1. **功能测试**: 启动开发服务器，验证正常运行
2. **性能测试**: 测量首次和第二次启动时间
3. **兼容性测试**: 验证热更新和自动刷新
4. **边界测试**: 修改配置后缓存自动失效

## Risk Assessment

**风险等级**: 低

**潜在风险**:
- 缓存失效可能导致构建问题 → 通过 buildDependencies 配置自动失效
- 磁盘空间占用 → 缓存目录大小可控（通常 <100MB）

**回滚方案**:
- 删除 webpack 配置
- 清理 `.next/cache/webpack/` 目录
