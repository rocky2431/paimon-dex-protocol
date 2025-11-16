# Feature: 懒加载 Reown AppKit（Web3Provider）

**Task ID**: perf-1.3
**Status**: In Progress
**Branch**: feat/task-perf-1.3-lazy-load-appkit

## Overview

将 231MB 的 WalletConnect 依赖从同步加载改为懒加载，显著减少不需要钱包功能页面的首次编译时间和初始加载时间。

## Rationale

**问题分析**:
- 当前所有页面都同步加载完整的 Web3 Provider 栈（231MB）
- WagmiProvider 和 QueryClientProvider 在根 providers.tsx 中同步初始化
- 即使访问不需要钱包的页面（如 /coming-soon, /presale）也会加载完整的 Web3 栈
- 首次编译时间受 WalletConnect 依赖影响增加 10-15 秒

**当前依赖大小**:
- @reown/appkit: 231MB
- @tanstack/react-query: 8.5MB
- wagmi: 2.5MB
- **总计**: ~242MB Web3 相关依赖

**解决方案**:
1. 提取 Web3Provider 为独立组件
2. 使用 React.lazy() 动态导入
3. 添加 Suspense 边界和 loading fallback
4. 仅在需要钱包功能的页面才加载

## Impact Assessment

- **User Stories Affected**: 无 (纯性能优化)
- **Architecture Changes**: 是 (组件结构调整)
  - 新增: `src/components/providers/Web3Provider.tsx`
  - 修改: `src/app/providers.tsx` (提取 Web3 逻辑)
- **Breaking Changes**: 否
- **Performance Impact**:
  - 首次编译时间: 减少 10-15 秒
  - 不需要钱包的页面: 初始加载减少 ~242MB JavaScript
  - 需要钱包的页面: 无影响（仍正常加载）
  - Bundle 分割: Web3 提供者代码分离为独立 chunk

## Requirements Trace

- Traces to: ultra-think analysis dimension 3.1 (Module Import Analysis)
- Related to: Phase 1 P0 performance optimization initiative
- Dependencies: perf-1.1 (completed), perf-1.2 (completed)

## Implementation Details

### Files to create

**`src/components/providers/Web3Provider.tsx`** (NEW):
```typescript
'use client';

import React from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/config/appkit';

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

### Files to modify

**`src/app/providers.tsx`**:
```typescript
'use client';

import React, { Suspense } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';
import theme from '@/config/theme';

// Lazy load Web3Provider (231MB WalletConnect dependencies)
const Web3Provider = React.lazy(() =>
  import('@/components/providers/Web3Provider').then((mod) => ({
    default: mod.Web3Provider,
  }))
);

// Minimal loading fallback
function Web3LoadingFallback() {
  return <div style={{ minHeight: '100vh' }} />;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Suspense fallback={<Web3LoadingFallback />}>
          <Web3Provider>{children}</Web3Provider>
        </Suspense>
      </SnackbarProvider>
    </ThemeProvider>
  );
}
```

### Architecture Changes

**Before** (Synchronous):
```
providers.tsx (loads all providers synchronously)
  ├── ThemeProvider (Material-UI)
  ├── SnackbarProvider (Notistack)
  ├── WagmiProvider (Wagmi) ← 242MB loaded on every page
  └── QueryClientProvider (React Query)
```

**After** (Lazy Loading):
```
providers.tsx (minimal synchronous providers)
  ├── ThemeProvider (Material-UI)
  ├── SnackbarProvider (Notistack)
  └── Suspense
      └── Web3Provider (Lazy) ← 242MB loaded only when needed
          ├── WagmiProvider
          └── QueryClientProvider
```

## Testing Plan

**Pre-change baseline**:
1. Run `npm run dev` and measure first compilation time
2. Test navigation to non-wallet pages (/coming-soon)
3. Test navigation to wallet pages (/swap, /liquidity)
4. Observe Network tab for bundle sizes

**Post-change verification**:
1. Compilation time measurement:
   - First compilation should be 10-15 seconds faster
   - Hot reload time should remain fast
2. Functional testing:
   - Navigate to /coming-soon → Should load without Web3 bundle
   - Navigate to /swap → Should load Web3 bundle on demand
   - Connect wallet → Should work normally
   - Switch networks → Should work normally
   - Disconnect wallet → Should work normally
3. Bundle analysis:
   - Verify Web3Provider is in separate chunk
   - Verify main bundle size reduced

**Success Criteria**:
- ✅ 首次编译时间减少 10-15 秒
- ✅ 不需要钱包的页面加载不包含 Web3 bundle
- ✅ 钱包连接功能完全正常
- ✅ 所有使用钱包的页面正常工作
- ✅ No TypeScript errors
- ✅ No runtime errors in console
