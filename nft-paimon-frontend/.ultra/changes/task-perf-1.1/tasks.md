# Task Checklist: perf-1.1

## Task Details (from tasks.json)

- **ID**: perf-1.1
- **Title**: Webpack 外部化 React Native 依赖
- **Priority**: P0
- **Complexity**: 2/10
- **Estimated Days**: 0.1
- **Type**: performance
- **Status**: in_progress

## Implementation Checklist

### Phase 1: Baseline Measurement
- [ ] Run `npm run dev` and record current compilation time
- [ ] Count "Module not found: @react-native-async-storage" errors in console
- [ ] Document current state

### Phase 2: Code Changes
- [ ] Read current `next.config.mjs`
- [ ] Add React Native modules to `config.externals`
- [ ] Configure `config.resolve.alias` for React Native modules
- [ ] Verify syntax correctness

### Phase 3: Verification
- [ ] Run `npm run dev` after changes
- [ ] Verify no React Native module errors
- [ ] Measure new compilation time
- [ ] Calculate time savings

### Phase 4: Functional Testing
- [ ] Test WalletConnect connection (MetaMask)
- [ ] Verify wallet address display
- [ ] Test transaction signing (if applicable)

### Phase 5: Quality Gates
- [ ] All existing tests pass
- [ ] Code quality: SOLID principles maintained
- [ ] Documentation: Update if needed

### Phase 6: Commit & Merge
- [ ] Git commit with conventional format
- [ ] Update task status in tasks.json
- [ ] Merge to main branch
- [ ] Delete feature branch

## Acceptance Criteria

- ✅ 启动日志中不再出现 'Module not found: @react-native-async-storage'
- ✅ 首次编译时间减少 3-5 秒
- ✅ WalletConnect 功能正常

## Dependencies

None

## Trace To

ultra-think analysis dimension 1.1 (Dependency Loading Analysis)
