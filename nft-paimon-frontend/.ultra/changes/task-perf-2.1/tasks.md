# Task Implementation Checklist

**Task ID**: perf-2.1
**Title**: 启用 Webpack 文件系统持久化缓存

## Implementation Steps

- [ ] 1. 修改 next.config.mjs 的 webpack 配置
- [ ] 2. 添加 config.cache 配置（type: 'filesystem'）
- [ ] 3. 设置 cacheDirectory 为 .next/cache/webpack
- [ ] 4. 添加 buildDependencies 配置
- [ ] 5. 测试第二次启动速度

## Acceptance Criteria

- [ ] .next/cache/webpack 目录被创建
- [ ] 第二次启动时间从 23秒 减少到 5-7秒
- [ ] 修改代码后热更新仍然正常

## Testing

- [ ] 首次启动时间测试
- [ ] 第二次启动时间测试
- [ ] 热更新功能测试
- [ ] 配置修改后缓存失效测试

## Notes

复制自 `.ultra/tasks/tasks.json` task perf-2.1
