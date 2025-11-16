# Feature: 优化环境变量预加载缓存

**Task ID**: perf-2.5
**Status**: In Progress
**Branch**: feat/task-perf-2.5-env-var-cache

## Overview

在 next.config.mjs 中预加载关键环境变量，减少重复加载开销，提升开发服务器启动速度。

## Rationale

**问题分析**:
- 当前每次启动开发服务器时，Next.js 都会重新加载 `.env.local` 文件
- 启动日志显示 `Reload env: .env.local`，表明存在重复加载
- 环境变量加载开销约 100-500ms，影响开发体验

**解决方案**:
通过在 `next.config.mjs` 中显式配置 `env` 字段，将关键环境变量预加载到构建配置中，避免运行时重复加载。

## Impact Assessment

- **User Stories Affected**: 无（内部性能优化）
- **Architecture Changes**: 否
- **Breaking Changes**: 否

**性能影响**:
- 环境变量加载时间减少 100-500ms
- 启动日志更清晰（不再显示 "Reload env" 警告）
- 开发服务器启动速度提升约 10-15%

## Requirements Trace

- Traces to: ultra-think analysis dimension 7.1 (开发体验优化)

## Implementation Details

### 配置修改

**文件**: `next.config.mjs`

**添加配置**:
```javascript
env: {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  NEXT_PUBLIC_BLOCKPASS_CLIENT_ID: process.env.NEXT_PUBLIC_BLOCKPASS_CLIENT_ID,
  NEXT_PUBLIC_TASKON_PROJECT_ID: process.env.NEXT_PUBLIC_TASKON_PROJECT_ID,
}
```

### 关键环境变量

1. **NEXT_PUBLIC_API_URL**: 后端 API 地址（高频访问）
2. **NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID**: WalletConnect 连接配置（每次初始化都需要）
3. **NEXT_PUBLIC_BLOCKPASS_CLIENT_ID**: Blockpass KYC 配置
4. **NEXT_PUBLIC_TASKON_PROJECT_ID**: TaskOn 集成配置

### 测试计划

1. **环境变量加载测试**:
   - 启动开发服务器，检查环境变量是否正确加载
   - 验证所有组件能访问到环境变量
   - 确认不再显示 "Reload env" 日志

2. **性能测试**:
   - 测量启动时间（应减少 100-500ms）
   - 对比修改前后的启动日志

3. **功能验证**:
   - WalletConnect 连接正常
   - Blockpass KYC 流程正常
   - TaskOn 集成正常

## Acceptance Criteria

- ✅ 所有关键环境变量预加载到配置中
- ✅ 启动日志不再显示 "Reload env: .env.local"
- ✅ 环境变量加载时间减少 100-500ms
- ✅ 所有依赖环境变量的功能正常工作
- ✅ 开发服务器启动速度提升可感知
