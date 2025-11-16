# Task Implementation Checklist

**Task ID**: perf-2.3
**Title**: 配置文件系统监听忽略规则

## Implementation Steps

- [ ] 1. 修改 next.config.mjs 的 webpack 配置
- [ ] 2. 添加 config.watchOptions.ignored 配置
- [ ] 3. 忽略 node_modules, .git, .next, test files, e2e 目录
- [ ] 4. 测试热更新速度

## Acceptance Criteria

- [ ] 热更新响应时间保持在 30-50ms
- [ ] 修改代码后立即刷新
- [ ] 测试文件修改不会触发重新编译

## Testing

- [ ] 源文件热更新测试
- [ ] 测试文件修改不触发编译验证
- [ ] 开发流程正常性验证

## Notes

复制自 `.ultra/tasks/tasks.json` task perf-2.3
