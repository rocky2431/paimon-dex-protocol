# Feature: 禁用 Reown AppKit 远程配置和分析

**Task ID**: perf-1.2
**Status**: In Progress
**Branch**: feat/task-perf-1.2-disable-appkit-remote-config

## Overview

禁用 Reown AppKit 的远程配置和分析功能，消除因 HTTP 403 错误导致的 1-2 秒初始化延迟。

## Rationale

**问题分析**:
- 当前 Reown AppKit 尝试获取远程项目配置和使用统计
- 由于使用占位符 WalletConnect Project ID，服务器返回 403 Forbidden
- 每个失败请求耗时约 500ms，共 2 个请求
- 总延迟: ~1-2 秒，影响应用启动体验

**错误日志**:
```
[Reown Config] Failed to fetch remote project configuration. HTTP status code: 403
Failed to fetch usage Error: HTTP status code: 403
```

**解决方案**:
- 禁用 `enableAnalytics` 选项（分析统计）
- 禁用 `enableRemoteConfig` 选项（远程配置）
- 避免不必要的网络请求

## Impact Assessment

- **User Stories Affected**: 无 (纯性能优化)
- **Architecture Changes**: 否 (仅配置调整)
- **Breaking Changes**: 否
- **Performance Impact**:
  - AppKit 初始化时间: 减少 1-2 秒
  - 消除 2 个失败的 HTTP 请求
  - 功能影响: 无 (分析和远程配置为可选特性)

## Requirements Trace

- Traces to: ultra-think analysis dimension 8.1 (Third-party Service Initialization)
- Related to: Phase 1 P0 performance optimization initiative

## Implementation Details

**Files to modify**:
- `src/config/appkit.ts`: Reown AppKit 配置

**Configuration changes**:
```typescript
export const modal = createAppKit({
  adapters: [wagmiAdapter],
  networks: networksList,
  projectId,
  metadata,
  features: {
    email: true,
    socials: ['google', 'x'],
    analytics: false,  // NEW: 禁用分析
  },
  // NEW: 禁用远程配置（如果 API 支持）
  enableRemoteConfig: false,
});
```

**Note**: `enableRemoteConfig` 选项需要验证 API 支持，如果不支持则仅设置 `analytics: false`。

## Testing Plan

**Pre-change baseline**:
1. 观察浏览器控制台中的网络请求
2. 记录 Reown Config 相关错误消息
3. 测量 AppKit 初始化时间

**Post-change verification**:
1. 验证控制台中不再出现 403 错误
2. 确认无 Reown 远程配置请求
3. 测试 WalletConnect 功能:
   - 打开钱包连接模态框
   - 连接 MetaMask/WalletConnect 钱包
   - 验证地址显示正确
   - 测试断开连接

**Success Criteria**:
- ✅ 无 '[Reown Config] Failed to fetch' 错误
- ✅ 无 'Failed to fetch usage' 错误
- ✅ AppKit 初始化时间减少 1-2 秒
- ✅ 钱包连接功能完全正常
