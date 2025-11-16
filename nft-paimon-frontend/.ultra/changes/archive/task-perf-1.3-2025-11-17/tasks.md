# Task Checklist: perf-1.3

## Task Details (from tasks.json)

- **ID**: perf-1.3
- **Title**: 懒加载 Reown AppKit（Web3Provider）
- **Priority**: P0
- **Complexity**: 5/10
- **Estimated Days**: 0.25
- **Type**: performance
- **Status**: in_progress
- **Dependencies**: perf-1.1 ✅, perf-1.2 ✅

## Implementation Checklist

### Phase 1: Baseline Measurement
- [ ] Run `npm run dev` and record current compilation time
- [ ] Test /coming-soon page load time
- [ ] Test /swap page load time
- [ ] Observe Network tab for bundle sizes

### Phase 2: Code Changes - Create Web3Provider
- [ ] Create directory `src/components/providers/`
- [ ] Create `Web3Provider.tsx` with WagmiProvider and QueryClientProvider
- [ ] Export Web3Provider component
- [ ] Verify TypeScript syntax

### Phase 3: Code Changes - Modify Providers
- [ ] Read current `src/app/providers.tsx`
- [ ] Add React.lazy() import for Web3Provider
- [ ] Add Suspense boundary
- [ ] Create minimal loading fallback
- [ ] Remove WagmiProvider and QueryClientProvider from providers.tsx
- [ ] Verify TypeScript syntax

### Phase 4: Verification
- [ ] Run `npm run dev` after changes
- [ ] Measure new compilation time
- [ ] Calculate time savings
- [ ] Verify no TypeScript errors
- [ ] Verify no runtime errors

### Phase 5: Functional Testing
- [ ] Test /coming-soon page (should not load Web3 bundle)
- [ ] Test /swap page (should load Web3 bundle)
- [ ] Connect MetaMask wallet
- [ ] Verify address display
- [ ] Switch network (BSC Testnet ↔ BSC Mainnet)
- [ ] Disconnect wallet
- [ ] Test other wallet pages (/liquidity, /treasury, /governance)

### Phase 6: Quality Gates
- [ ] All existing tests pass (if any)
- [ ] Code quality: SOLID principles maintained
- [ ] Documentation: Add JSDoc comments
- [ ] No console errors

### Phase 7: Commit & Merge
- [ ] Git commit with conventional format
- [ ] Update task status in tasks.json
- [ ] Merge to main branch
- [ ] Delete feature branch

## Acceptance Criteria

- ✅ 首次编译时间减少 10-15 秒
- ✅ 不需要钱包的页面（如 /coming-soon）加载更快
- ✅ 钱包连接功能完全正常
- ✅ 所有使用钱包的页面（如 /swap, /liquidity）正常工作

## Dependencies

- perf-1.1: Webpack 外部化 React Native 依赖 ✅ completed
- perf-1.2: 禁用 Reown AppKit 远程配置和分析 ✅ completed

## Trace To

ultra-think analysis dimension 3.1 (Module Import Analysis)
