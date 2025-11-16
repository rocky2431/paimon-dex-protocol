# Task Implementation Checklist

**Task ID**: perf-2.4
**Title**: TypeScript 开发模式宽松类型检查

## Implementation Steps

- [ ] 1. 创建 tsconfig.dev.json 继承自 tsconfig.json
- [ ] 2. 禁用 noUnusedLocals, noUnusedParameters, noUncheckedIndexedAccess
- [ ] 3. 排除测试文件和 e2e 目录
- [ ] 4. 保留严格检查在 npm run type-check
- [ ] 5. 测试开发模式启动速度

## Acceptance Criteria

- [ ] TypeScript 类型检查时间减少 30-40%
- [ ] npm run type-check 仍然执行严格检查
- [ ] 开发体验不受影响

## Testing

- [ ] 开发模式类型检查速度测试
- [ ] npm run type-check 严格性验证
- [ ] 生产构建不受影响验证

## Notes

复制自 `.ultra/tasks/tasks.json` task perf-2.4
