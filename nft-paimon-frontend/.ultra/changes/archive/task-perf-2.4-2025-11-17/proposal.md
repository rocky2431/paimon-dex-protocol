# Feature: TypeScript 开发模式宽松类型检查

**Task ID**: perf-2.4
**Status**: In Progress
**Branch**: feat/task-perf-2.4-ts-dev-mode

## Overview

创建 `tsconfig.dev.json` 配置文件，在开发模式下使用宽松的类型检查，减少类型检查时间，提升开发体验。

## Rationale

**当前状况**：
- TypeScript 在开发模式下执行完整严格类型检查
- 包括未使用变量、未使用参数、未检查索引访问等检查
- 这些检查在开发阶段可以放宽，留到 CI/CD 阶段严格执行
- 当前类型检查耗时影响开发体验

**解决方案**：
创建两套 TypeScript 配置：
1. **tsconfig.dev.json** - 开发模式（宽松检查，快速反馈）
   - 禁用 `noUnusedLocals`
   - 禁用 `noUnusedParameters`
   - 禁用 `noUncheckedIndexedAccess`
   - 排除测试文件和 e2e 目录

2. **tsconfig.json** - 生产模式（保持严格）
   - 继续用于 `npm run type-check`
   - 继续用于 CI/CD 流程
   - 保持所有严格检查

**预期效果**：
- 开发模式类型检查时间减少 30-40%
- 开发体验提升（更快的类型反馈）
- 生产代码质量不降低（CI/CD 仍然严格）

## Impact Assessment

- **User Stories Affected**: 无（纯开发体验优化）
- **Architecture Changes**: 否
- **Breaking Changes**: 否

## Requirements Trace

- Traces to: ultra-think analysis dimension 6.1
- Priority: P2 (一般)
- Complexity: 2/10 (中等)
- Dependencies: 无

## Implementation Plan

### 1. 创建 tsconfig.dev.json

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noUncheckedIndexedAccess": false
  },
  "exclude": [
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/*.spec.ts",
    "**/*.spec.tsx",
    "e2e/**",
    "test-results/**",
    "playwright-report/**"
  ]
}
```

### 2. 更新 package.json（可选）

如果 Next.js 默认使用 tsconfig.json，则保持现状。

### 3. 验收标准

- [ ] `tsconfig.dev.json` 文件已创建
- [ ] 继承自 `tsconfig.json`
- [ ] 禁用指定的严格检查选项
- [ ] 排除测试文件
- [ ] `npm run type-check` 仍然使用严格检查
- [ ] 开发体验不受影响

### 4. 测试计划

1. **开发模式测试**: 验证类型检查速度提升
2. **严格检查测试**: 验证 `npm run type-check` 仍然严格
3. **CI/CD 测试**: 确认生产构建不受影响

## Risk Assessment

**风险等级**: 低

**潜在风险**：
- 开发者可能忽略一些类型错误

**缓解措施**：
- `npm run type-check` 和 CI/CD 保持严格检查
- 代码审查时发现问题
- 渐进式采用（可随时回滚）

**回滚方案**：
- 删除 `tsconfig.dev.json`
- 恢复使用 `tsconfig.json`
