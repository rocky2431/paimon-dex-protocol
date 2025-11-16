# Task perf-1.4: （可选）启用 Turbopack 实验性构建

## Task Details

**ID**: perf-1.4
**Title**: （可选）启用 Turbopack 实验性构建
**Priority**: P1
**Complexity**: 1
**Estimated Days**: 0.05
**Status**: in_progress
**Risk Level**: High (experimental feature)

## Description

尝试启用 Next.js 14 的 Turbopack 构建工具，预期减少 50-70% 编译时间。

## Implementation Checklist

### Phase 1: Configuration
- [ ] Read current package.json
- [ ] Add --turbo flag to dev script
- [ ] Commit changes

### Phase 2: Testing
- [ ] Kill existing dev server
- [ ] Start dev server with Turbopack
- [ ] Measure startup time
- [ ] Verify all 26 pages load correctly
- [ ] Test Material-UI components
- [ ] Test WalletConnect functionality
- [ ] Test chart libraries
- [ ] Test hot reload functionality

### Phase 3: Performance Validation
- [ ] Compare startup time (before vs after)
- [ ] Compare hot reload speed
- [ ] Check memory usage
- [ ] Verify no degradation

### Phase 4: Decision
- [ ] If all tests pass: Keep Turbopack
- [ ] If any critical issue: Revert immediately
- [ ] Update task status
- [ ] Document findings

## Test Scenarios

### Critical Tests (must pass)
1. **Startup**: Dev server starts without errors
2. **Pages**: All 26 routes load successfully
3. **MUI**: Material-UI components render correctly
4. **WalletConnect**: Wallet connection works
5. **Charts**: recharts and lightweight-charts display correctly
6. **HMR**: Hot Module Replacement works

### Non-Critical Tests (nice to have)
1. Custom webpack config compatibility
2. Build warnings (acceptable if non-blocking)
3. Development tools integration

## Rollback Plan

If ANY critical test fails:
```bash
git revert HEAD
npm run dev  # Back to webpack
```

## Notes

- This is marked as "optional" due to experimental nature
- High priority (P1) because of potential 50-70% speed improvement
- Low complexity (1) as it's just a flag change
- High risk due to potential compatibility issues
- Success would significantly improve developer experience
