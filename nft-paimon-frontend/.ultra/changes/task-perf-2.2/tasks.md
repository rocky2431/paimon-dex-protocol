# Task Implementation Checklist

**Task ID**: perf-2.2
**Title**: 启用 Next.js 实验性优化选项

## Implementation Steps

- [ ] 1. 修改 next.config.mjs
- [ ] 2. 添加 experimental.optimizePackageImports 配置
  - [ ] @mui/material
  - [ ] @mui/icons-material
  - [ ] recharts
  - [ ] lightweight-charts
- [ ] 3. 启用 experimental.webpackBuildWorker (并行构建)
- [ ] 4. 启用 experimental.swcMinify
- [ ] 5. 测试编译速度和功能

## Acceptance Criteria

- [ ] 编译时间减少 15-25%
- [ ] 所有依赖包正常加载
- [ ] Material-UI 组件渲染正常
- [ ] Charts 组件工作正常

## Testing

- [ ] 编译速度基准测试
- [ ] MUI 组件功能测试
- [ ] Charts 组件功能测试
- [ ] 生产构建测试

## Notes

复制自 `.ultra/tasks/tasks.json` task perf-2.2
