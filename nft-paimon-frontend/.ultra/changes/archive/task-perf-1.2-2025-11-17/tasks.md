# Task Checklist: perf-1.2

## Task Details (from tasks.json)

- **ID**: perf-1.2
- **Title**: 禁用 Reown AppKit 远程配置和分析
- **Priority**: P0
- **Complexity**: 2/10
- **Estimated Days**: 0.1
- **Type**: performance
- **Status**: in_progress

## Implementation Checklist

### Phase 1: Baseline Measurement
- [ ] 观察浏览器控制台网络请求
- [ ] 记录当前 Reown Config 错误消息
- [ ] 记录 AppKit 初始化时间

### Phase 2: Code Changes
- [ ] 读取 `src/config/appkit.ts` 当前配置
- [ ] 在 `features` 中添加 `analytics: false`
- [ ] 尝试添加 `enableRemoteConfig: false`（验证 API 支持）
- [ ] 验证配置语法正确性

### Phase 3: Verification
- [ ] 启动开发服务器
- [ ] 验证控制台无 403 错误
- [ ] 确认无远程配置请求
- [ ] 测量新的初始化时间

### Phase 4: Functional Testing
- [ ] 打开钱包连接模态框
- [ ] 连接 MetaMask 钱包
- [ ] 验证地址显示正确
- [ ] 测试断开连接功能

### Phase 5: Quality Gates
- [ ] 配置语法正确
- [ ] 功能测试通过
- [ ] 代码质量: SOLID 原则
- [ ] 文档: 添加必要注释

### Phase 6: Commit & Merge
- [ ] Git commit with conventional format
- [ ] Update task status in tasks.json
- [ ] Merge to main branch
- [ ] Delete feature branch

## Acceptance Criteria

- ✅ 启动日志中不再出现 '[Reown Config] Failed to fetch'
- ✅ 启动日志中不再出现 'Failed to fetch usage'
- ✅ AppKit 初始化时间减少 1-2 秒
- ✅ 钱包连接功能完全正常

## Dependencies

None

## Trace To

ultra-think analysis dimension 8.1 (Third-party Service Initialization)
