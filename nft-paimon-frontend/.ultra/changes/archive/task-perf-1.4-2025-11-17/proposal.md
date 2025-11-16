# Feature: 启用 Turbopack 实验性构建

**Task ID**: perf-1.4
**Status**: In Progress
**Branch**: feat/task-perf-1.4-turbopack

## Overview

尝试启用 Next.js 14 的 Turbopack 构建工具，预期减少 50-70% 编译时间。这是一个可选的实验性优化，标记为高风险。

## Rationale

**性能目标**:
- 首次编译时间减少 50-70%
- 理论上从 ~1.3s 减少到 ~500-700ms
- Turbopack 是 Webpack 的 Rust 重写版本，承诺 10x 构建速度

**风险评估**:
- ⚠️ **高风险**: 实验性功能，可能有兼容性问题
- ⚠️ Material-UI 可能不完全兼容
- ⚠️ WalletConnect SDK 可能有问题
- ⚠️ 自定义 webpack 配置可能失效

## Impact Assessment

- **User Stories Affected**: 无（开发环境优化）
- **Architecture Changes**: 否
- **Breaking Changes**: 可能（如果不兼容需要回滚）

**预期改进**:
- 开发服务器启动时间: 1.3s → 500-700ms
- 热更新速度: 30-50ms → 10-20ms
- 开发体验显著提升

**回滚计划**:
如果发现任何功能异常，立即回滚：
```bash
git revert HEAD
npm run dev  # 恢复到 webpack
```

## Requirements Trace

- Traces to: ultra-think analysis dimension 2.1 (构建速度优化)

## Implementation Details

### 配置修改

**文件**: `package.json`

**当前配置**:
```json
{
  "scripts": {
    "dev": "next dev --port 4000"
  }
}
```

**修改为**:
```json
{
  "scripts": {
    "dev": "next dev --port 4000 --turbo"
  }
}
```

### 测试计划

1. **启动测试**:
   - 启动开发服务器
   - 测量启动时间
   - 检查控制台输出

2. **功能验证**:
   - 所有页面能否正常加载
   - Material-UI 组件渲染正常
   - WalletConnect 连接功能
   - 图表库（recharts, lightweight-charts）
   - Hot reload 功能

3. **兼容性测试**:
   - Webpack 自定义配置是否仍生效
   - 环境变量加载正常
   - 文件监听正常
   - 开发模式所有功能完整

4. **性能测试**:
   - 启动时间对比
   - 热更新速度对比
   - 内存占用对比

### 回滚条件

如果出现以下任何情况，立即回滚：
- ❌ 任何页面加载失败
- ❌ Material-UI 组件渲染异常
- ❌ WalletConnect 功能失效
- ❌ 图表库显示错误
- ❌ Hot reload 不工作
- ❌ 控制台有严重错误

## Acceptance Criteria

**成功标准**:
- ✅ 开发服务器成功启动
- ✅ 启动时间减少 50-70%
- ✅ 所有26个页面正常加载
- ✅ Material-UI 组件正常
- ✅ WalletConnect 功能正常
- ✅ 热更新功能正常
- ✅ 无严重错误或警告

**可接受的问题**:
- ⚠️ 部分 webpack 配置失效（如果不影响核心功能）
- ⚠️ 非关键警告信息

**不可接受的问题**:
- ❌ 任何功能性回归
- ❌ 用户体验下降
- ❌ 严重的控制台错误

## Notes

- Turbopack 是 Next.js 的未来，但当前仍处于实验阶段
- Next.js 14.2.33 的 Turbopack 支持已经比较成熟
- 如果成功，可以为开发团队带来显著的效率提升
- 如果失败，可以轻松回滚到 webpack

---

## Test Results & Conclusion

### 测试执行 (2025-11-17)

#### 1. 启动测试 ✅
```
Server started: 579ms (55% improvement vs 1.3s baseline)
 ▲ Next.js 14.2.33 (Turbo)
 - Local: http://localhost:4000
 ✓ Ready in 579ms
```

#### 2. 功能验证 ❌ CRITICAL ERROR

**错误详情**:
```
⨯ ./node_modules/@metamask/sdk/dist/browser/es/metamask-sdk.js:1:423886
Module not found: Can't resolve '@metamask/sdk-communication-layer' in ...
⚠ Webpack is configured while Turbopack is not, which may cause problems.
```

**影响范围**:
- ❌ 首页无法编译
- ❌ WalletConnect 功能完全失效
- ❌ 所有依赖 MetaMask SDK 的页面无法加载

**根本原因**: Turbopack 与 @metamask/sdk 模块解析机制不兼容

#### 3. 回滚验证 ✅

```bash
git restore package.json  # 移除 --turbo flag
npm run dev               # 标准 webpack 构建
✓ Ready in 1750ms         # 正常启动，无错误
```

### 最终决定: ❌ 不采用 Turbopack

**理由**:
1. **兼容性阻断**: MetaMask SDK 是核心依赖，无法妥协
2. **功能优先**: 用户功能 > 开发体验优化
3. **风险高**: 实验性功能不适合生产项目

**替代方案**:
- ✅ 保持 webpack 构建（稳定、兼容）
- ✅ 通过其他优化已实现 perf-2.5, perf-2.6 的性能提升
- 📅 等待 Next.js 15 正式发布，Turbopack 成熟后重新评估

**性能对比总结**:
| 指标 | Webpack | Turbopack | 状态 |
|------|---------|-----------|------|
| 启动时间 | 1.75s | 0.58s (-67%) | ⚠️ 快但不可用 |
| 兼容性 | 100% | 0% (MetaMask) | ❌ 阻断 |
| 稳定性 | 高 | 低（实验性） | ❌ 生产风险 |

### 经验总结

**教训**:
- 实验性功能需要全面兼容性测试，不能只看性能数字
- 第三方 SDK（特别是 Web3 相关）可能依赖特定构建工具特性
- 开发体验优化不应以牺牲核心功能为代价

**建议**:
- 持续关注 Turbopack 发展，Next.js 15 正式发布后重新评估
- 当前通过 perf-2.5/2.6 优化已实现 15-20% 性能提升，足够
- 优先确保功能稳定性，性能优化应循序渐进
