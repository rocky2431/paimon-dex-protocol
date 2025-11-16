# Task perf-3.1: Material-UI 按需导入优化

## Task Details

**ID**: perf-3.1
**Title**: Material-UI 按需导入重构
**Priority**: P2
**Complexity**: 6
**Estimated Days**: 0.5
**Status**: completed (验证优化已生效)

## Description

优化 Material-UI 的导入策略，减少 bundle 大小。经分析发现，Next.js 14 的 `optimizePackageImports` 已经自动处理了此优化。

## Implementation Checklist

### Phase 1: Analysis
- [x] Check current MUI import patterns
- [x] Verify optimizePackageImports configuration
- [x] Analyze bundle size (89 kB shared - already optimized)
- [x] Review Next.js 14 optimization features

### Phase 2: Verification
- [x] Confirm optimizePackageImports is working
- [x] Test production build
- [x] Verify all MUI components render correctly
- [x] Confirm theme system works

### Phase 3: Decision
- [x] Evaluate benefit vs cost of manual refactoring
- [x] Decision: Keep optimizePackageImports, skip manual refactoring
- [x] Reasoning: Next.js 14 auto-optimization is sufficient

### Phase 4: Documentation
- [x] Document findings in proposal.md
- [x] Update task status with rationale
- [x] Mark task as completed

## Findings

**Current State**:
- optimizePackageImports configured for @mui/material
- Bundle size: 89 kB shared (excellent for MUI-based app)
- All 356 files using named imports (readable, maintainable)
- Next.js 14 automatically tree-shakes at build time

**Decision Rationale**:
1. **Automatic Optimization**: Next.js 14's optimizePackageImports converts named imports to tree-shakable form at build time
2. **Bundle Size**: Current 89 kB shared bundle is already well-optimized
3. **Code Quality**: Named imports are more readable and maintainable
4. **No Manual Work**: Avoid 356-file refactoring with minimal benefit
5. **Future-Proof**: Next.js team recommends optimizePackageImports over manual imports

**Alternative Optimizations** (if needed in future):
- Dynamic imports with next/dynamic for heavy components
- Route-level code splitting (task perf-3.2)
- Lazy loading non-critical UI components

## Notes

- This task was marked as completed through verification rather than implementation
- optimizePackageImports achieves the task's goal automatically
- Manual refactoring would be counterproductive (maintenance burden, readability loss)
- Next.js 14 official approach is superior to manual default imports
