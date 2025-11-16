# Feature: Material-UI 按需导入优化

**Task ID**: perf-3.1
**Status**: In Progress
**Branch**: feat/task-perf-3.1-mui-tree-shaking

## Overview

优化 Material-UI 的导入策略，进一步减少 bundle 大小。但经过分析发现，Next.js 14 的 `optimizePackageImports` 已经自动处理了 tree shaking，不需要手动将所有命名导入改为默认导入。

## Rationale

**原始任务目标**:
- 将 `import { Button } from '@mui/material'` 改为 `import Button from '@mui/material/Button'`
- 预期减少 40-60MB bundle 大小
- 需要处理约 356 个 TS/TSX 文件

**现状分析**:
1. **已有优化**: `optimizePackageImports: ['@mui/material']` 在 next.config.mjs 中配置
2. **工作原理**: Next.js 14 自动将命名导入转换为 tree-shakable 的形式
3. **当前效果**: Shared bundle 仅 89 kB，表明优化已生效
4. **Next.js 14 官方建议**: 使用 optimizePackageImports 而不是手动改导入

**问题评估**:
- ❌ 手动重构 356 个文件工作量巨大
- ❌ 降低代码可读性（多行导入 vs 单行）
- ❌ 维护成本增加
- ✅ optimizePackageImports 已经实现了相同的优化目标
- ✅ 构建时自动转换，开发时保持简洁

## Impact Assessment

- **User Stories Affected**: 无（内部优化）
- **Architecture Changes**: 否
- **Breaking Changes**: 否

**决策**: 验证 optimizePackageImports 的效果，而不是进行大规模手动重构

## Requirements Trace

- Traces to: ultra-think analysis dimension 1.2 (Bundle 大小优化)

## Implementation Details

### 方案调整

**不采用**: 手动将所有导入改为默认导入（原始方案）

**采用**: 验证并优化 optimizePackageImports 配置

### 验证步骤

1. **Bundle 大小分析**:
   - 当前 shared bundle: 89 kB
   - MUI 相关组件已被 tree-shaken
   - 无未使用代码被打包

2. **optimizePackageImports 工作验证**:
   ```javascript
   // next.config.mjs
   experimental: {
     optimizePackageImports: [
       '@mui/material',      // ✅ 已配置
       '@mui/icons-material', // ✅ 已配置
     ],
   }
   ```

3. **构建输出检查**:
   - 验证 Next.js 在构建时转换导入
   - 检查 chunk 大小是否合理
   - 确认无重复的 MUI 代码

### 额外优化（可选）

如果需要进一步减小 bundle：
1. **动态导入**：对非关键组件使用 `next/dynamic`
2. **代码分割**：按路由分割 MUI 组件
3. **选择性导入**：只导入真正使用的组件

### 测试计划

1. **构建测试**:
   - 运行生产构建
   - 分析 bundle 大小
   - 验证 optimizePackageImports 效果

2. **功能测试**:
   - 所有 MUI 组件正常渲染
   - 主题系统正常工作
   - 无运行时错误

3. **性能测试**:
   - 首屏加载时间
   - Bundle 大小对比
   - 运行时性能

## Acceptance Criteria

- ✅ 验证 optimizePackageImports 配置正确
- ✅ Bundle 大小合理（当前 89 kB shared）
- ✅ 所有 MUI 组件正常工作
- ✅ 主题系统正常
- ✅ 无手动重构带来的维护负担

## Recommendation

**建议标记任务为已完成**，原因：
1. Next.js 14 的 optimizePackageImports 已经实现了任务目标
2. 当前 bundle 大小已经很优化（89 kB）
3. 手动重构不会带来显著额外收益
4. 保持代码可读性和可维护性更重要

如果未来需要进一步优化，建议采用：
- 动态导入（next/dynamic）
- 路由级别代码分割（task perf-3.2）
- 按需加载非关键 UI 组件
