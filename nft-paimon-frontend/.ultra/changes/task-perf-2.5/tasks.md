# Task perf-2.5: 优化环境变量预加载缓存

## Task Details

**ID**: perf-2.5
**Title**: 优化环境变量预加载缓存
**Priority**: P3
**Complexity**: 1
**Estimated Days**: 0.05
**Status**: in_progress

## Description

在 next.config.mjs 中预加载关键环境变量，减少重复加载开销。

实施步骤：
1. 修改 next.config.mjs
2. 添加 env 配置，预加载关键变量
   - NEXT_PUBLIC_API_URL
   - NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
   - NEXT_PUBLIC_BLOCKPASS_CLIENT_ID
3. 测试环境变量是否正确加载

验收标准：
- 启动日志中不再显示 'Reload env: .env.local'
- 环境变量加载时间减少 100-500ms
- 所有环境变量值正确

## Implementation Checklist

### Phase 1: Configuration
- [ ] Read current next.config.mjs
- [ ] Add env configuration section
- [ ] Preload NEXT_PUBLIC_API_URL
- [ ] Preload NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
- [ ] Preload NEXT_PUBLIC_BLOCKPASS_CLIENT_ID
- [ ] Preload NEXT_PUBLIC_TASKON_PROJECT_ID

### Phase 2: Testing
- [ ] Kill existing dev server
- [ ] Start dev server with new configuration
- [ ] Verify environment variables are loaded
- [ ] Check startup logs (no "Reload env" message)
- [ ] Measure startup time improvement
- [ ] Test WalletConnect functionality
- [ ] Test Blockpass KYC flow
- [ ] Test TaskOn integration

### Phase 3: Quality Gates
- [ ] All tests passing
- [ ] Code quality checks (SOLID/DRY/KISS/YAGNI)
- [ ] No breaking changes
- [ ] Documentation updated (if needed)

### Phase 4: Commit & Merge
- [ ] Commit changes with conventional format
- [ ] Update task status in tasks.json
- [ ] Merge to main branch
- [ ] Archive changes directory

## Notes

- This is a low-risk optimization (P3 priority)
- Expected performance gain: 100-500ms startup time reduction
- No user-facing changes, only development experience improvement
