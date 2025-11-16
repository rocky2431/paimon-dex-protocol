# Task perf-2.6: 调整 Fast Refresh 和内存配置

## Task Details

**ID**: perf-2.6
**Title**: 调整 Fast Refresh 和内存配置
**Priority**: P3
**Complexity**: 1
**Estimated Days**: 0.05
**Status**: in_progress

## Description

优化 Next.js Fast Refresh 和页面内存管理配置。

实施步骤：
1. 修改 next.config.mjs
2. ~~在开发模式设置 reactStrictMode: false~~ (保持 true，质量优先)
3. 配置 onDemandEntries.maxInactiveAge = 25000
4. 配置 onDemandEntries.pagesBufferLength = 2
5. 测试热更新和内存占用

验收标准：
- 内存占用减少 10-20%
- 热更新速度保持在 30-50ms
- 开发体验良好

## Implementation Checklist

### Phase 1: Configuration
- [ ] Read current next.config.mjs
- [ ] Add onDemandEntries configuration
- [ ] Set maxInactiveAge = 25000
- [ ] Set pagesBufferLength = 2
- [ ] Keep reactStrictMode = true (quality first)

### Phase 2: Testing
- [ ] Kill existing dev server
- [ ] Start dev server with new configuration
- [ ] Test hot reload functionality
- [ ] Measure memory usage (before/after)
- [ ] Test page switching performance
- [ ] Verify 25s cache works correctly

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
- Expected memory reduction: 10-20% (50-100MB)
- No user-facing changes, only development experience improvement
- reactStrictMode kept as true to maintain code quality
