# Feature: Webpack 外部化 React Native 依赖

**Task ID**: perf-1.1
**Status**: In Progress
**Branch**: feat/task-perf-1.1-webpack-externalize-react-native

## Overview

修复 @metamask/sdk 重复尝试加载 @react-native-async-storage/async-storage 导致的 3-5 秒编译延迟问题。通过 Webpack 配置将 React Native 相关依赖外部化，避免不必要的模块解析。

## Rationale

**问题分析**:
- 当前前端首次编译时间: 23秒（正常应为 3-5秒）
- @metamask/sdk 包含 React Native 依赖引用，但这些依赖在 Web 环境中不存在
- Webpack 重复尝试解析 @react-native-async-storage/async-storage（30+ 次）
- 每次解析失败浪费约 100-150ms，累计浪费 3-5 秒

**解决方案**:
1. 将 React Native 相关模块添加到 webpack externals
2. 配置 resolve.alias 将这些模块指向 false
3. 避免 Webpack 尝试解析不存在的模块

## Impact Assessment

- **User Stories Affected**: 无 (纯配置优化)
- **Architecture Changes**: 否 (仅 Webpack 配置调整)
- **Breaking Changes**: 否
- **Performance Impact**:
  - 首次编译时间: 23s → ~18-20s (减少 3-5秒, ~13-22% 提升)
  - 功能影响: 无 (React Native 依赖仅在移动端需要)

## Requirements Trace

- Traces to: ultra-think analysis dimension 1.1 (Dependency Loading Analysis)
- Related to: Phase 1 P0 performance optimization initiative

## Implementation Details

**Files to modify**:
- `next.config.mjs`: Webpack 配置

**Configuration changes**:
```javascript
webpack: (config) => {
  // Existing externals
  config.externals.push('pino-pretty', 'lokijs', 'encoding');

  // NEW: Externalize React Native dependencies
  config.externals.push(
    '@react-native-async-storage/async-storage',
    'react-native'
  );

  // NEW: Resolve aliases to prevent module resolution
  config.resolve.alias = {
    ...config.resolve.alias,
    '@react-native-async-storage/async-storage': false,
    'react-native': false,
  };

  return config;
}
```

## Testing Plan

**Pre-change baseline**:
1. Run `npm run dev` and measure compilation time
2. Observe console logs for "Module not found" errors
3. Count occurrences of @react-native-async-storage errors

**Post-change verification**:
1. Run `npm run dev` and verify:
   - No "Module not found: @react-native-async-storage" errors
   - Compilation time reduced by 3-5 seconds
2. Test WalletConnect functionality:
   - Connect wallet (MetaMask)
   - Verify wallet connection successful
   - Test transaction signing

**Success Criteria**:
- ✅ Zero React Native module resolution errors
- ✅ Compilation time improved
- ✅ WalletConnect features work normally
