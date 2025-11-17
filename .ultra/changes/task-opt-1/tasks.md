# Task Checklist: opt-1 - Multicall Gas优化

**Status**: 🟡 In Progress
**Branch**: feat/task-opt-1-multicall-gas-optimization
**Started**: 2025-11-17T12:00:00Z

---

## Implementation Checklist

### Phase 1: RED - 编写测试 ⏳

#### 1.1 测试文件创建
- [ ] 创建 `test/unit/DEXRouterMulticall.t.sol`
- [ ] 设置测试环境 (mock contracts, test tokens)
- [ ] 导入依赖 (DEXRouter, Gauge, Pair, Multicall3)

#### 1.2 边界测试 (Boundary Tests)
- [ ] `test_addLiquidityAndStake_ZeroAddress` - 零地址输入
- [ ] `test_addLiquidityAndStake_ZeroAmount` - 零金额输入
- [ ] `test_addLiquidityAndStake_MaxAmount` - 最大值输入
- [ ] `test_swapAndAddLiquidity_EmptyPath` - 空路径
- [ ] `test_removeAndClaim_ZeroLiquidity` - 零流动性
- [ ] `test_boostAndDeposit_MinimumStake` - 最小质押量
- [ ] `test_fullExitFlow_NoBalance` - 无余额退出

#### 1.3 异常测试 (Exception Tests)
- [ ] `test_addLiquidityAndStake_Unauthorized` - 未授权调用
- [ ] `test_addLiquidityAndStake_InsufficientBalance` - 余额不足
- [ ] `test_addLiquidityAndStake_SlippageExceeded` - 滑点超限
- [ ] `test_swapAndAddLiquidity_SwapFailed` - 兑换失败
- [ ] `test_removeAndClaim_ReentrancyAttack` - 重入攻击防护
- [ ] `test_boostAndDeposit_GaugeNotApproved` - Gauge未批准
- [ ] `test_fullExitFlow_PartialFailure` - 部分操作失败

#### 1.4 Gas基准测试 (Gas Benchmark)
- [ ] `testGas_addLiquidityAndStake_Baseline` - 优化前Gas消耗
- [ ] `testGas_addLiquidityAndStake_Optimized` - 优化后Gas消耗
- [ ] `testGas_swapAndAddLiquidity` - Swap+LP Gas
- [ ] `testGas_removeAndClaim` - 移除+领取 Gas
- [ ] `testGas_boostAndDeposit` - Boost+存款 Gas
- [ ] `testGas_fullExitFlow` - 完整退出 Gas

**验收标准**: 所有测试编译通过,预期失败 (RED阶段)

---

### Phase 2: GREEN - 实现函数 ⏳

#### 2.1 基础设施
- [ ] 在 `DEXRouter.sol` 中添加 Multicall3 继承
- [ ] 导入必要接口 (IGauge, IVault, IBoostStaking)
- [ ] 定义新增事件 (LiquidityAddedAndStaked, etc.)

#### 2.2 函数实现 (按复杂度排序)

##### 2.2.1 removeAndClaim (最简单 - 3步)
- [ ] 实现函数签名和参数验证
- [ ] Step 1: Unstake from Gauge
- [ ] Step 2: Remove Liquidity from Pair
- [ ] Step 3: Claim Rewards
- [ ] 添加 NatSpec 文档
- [ ] 运行测试: `forge test --match-test removeAndClaim`

##### 2.2.2 boostAndDeposit (中等 - 3步)
- [ ] 实现函数签名和参数验证
- [ ] Step 1: Transfer PAIMON from user
- [ ] Step 2: Stake to BoostStaking
- [ ] Step 3: Deposit to Vault (with boost multiplier)
- [ ] 添加 NatSpec 文档
- [ ] 运行测试: `forge test --match-test boostAndDeposit`

##### 2.2.3 swapAndAddLiquidity (中等 - 4步)
- [ ] 实现函数签名和参数验证
- [ ] Step 1: Transfer input token
- [ ] Step 2: Execute Swap via DEXRouter
- [ ] Step 3: Approve both tokens to Pair
- [ ] Step 4: Add Liquidity
- [ ] 添加 NatSpec 文档
- [ ] 运行测试: `forge test --match-test swapAndAddLiquidity`

##### 2.2.4 addLiquidityAndStake (核心 - 5步)
- [ ] 实现函数签名和参数验证
- [ ] Step 1: Transfer tokenA and tokenB
- [ ] Step 2: Approve tokens to Pair
- [ ] Step 3: Add Liquidity
- [ ] Step 4: Approve LP token to Gauge
- [ ] Step 5: Stake to Gauge on behalf of user
- [ ] 添加滑点保护 (minLiquidity check)
- [ ] 添加 NatSpec 文档
- [ ] 运行测试: `forge test --match-test addLiquidityAndStake`

##### 2.2.5 fullExitFlow (最复杂 - 5步)
- [ ] 实现函数签名和参数验证
- [ ] Step 1: Unstake all LP from Gauge
- [ ] Step 2: Remove all Liquidity
- [ ] Step 3: Claim all Rewards
- [ ] Step 4: Withdraw all from Vault
- [ ] Step 5: Unstake all Boost
- [ ] 添加 NatSpec 文档
- [ ] 运行测试: `forge test --match-test fullExitFlow`

#### 2.3 集成测试
- [ ] 运行完整测试套件: `forge test`
- [ ] 验证所有测试通过 (GREEN达成)
- [ ] 检查测试覆盖率: `forge coverage`

**验收标准**: 所有测试通过,覆盖率≥90%

---

### Phase 3: REFACTOR - 优化质量 ⏳

#### 3.1 SOLID原则检查
- [ ] **S (Single Responsibility)**: 每个函数职责单一
  - 检查点: 函数长度<50行
  - 工具: 手动审查
- [ ] **O (Open/Closed)**: 扩展而非修改
  - 检查点: 未修改现有函数
  - 工具: Git diff
- [ ] **L (Liskov Substitution)**: 符合Router接口
  - 检查点: 可替换原有流程
  - 工具: 集成测试
- [ ] **I (Interface Segregation)**: 接口最小化
  - 检查点: 无冗余参数
  - 工具: 手动审查
- [ ] **D (Dependency Inversion)**: 依赖抽象
  - 检查点: 使用接口而非具体实现
  - 工具: Slither

#### 3.2 DRY优化
- [ ] 提取公共逻辑: `_transferAndApprove()`
- [ ] 统一错误处理: `_requireNonZero()`
- [ ] 统一事件发射: `_emitMulticallSuccess()`
- [ ] 删除重复代码

#### 3.3 Gas优化
- [ ] 使用 `unchecked` 减少溢出检查 (安全场景)
- [ ] 优化存储读取 (使用memory变量)
- [ ] 减少事件参数 (只保留必要字段)
- [ ] 合并多个Approve为单次调用 (如可能)

#### 3.4 安全审查
- [ ] 重入保护: `nonReentrant` modifier
- [ ] 权限控制: `onlyOwner` or public
- [ ] 输入验证: 零地址、零金额检查
- [ ] 溢出保护: SafeMath or Solidity 0.8+
- [ ] 运行 Slither: `slither src/dex/DEXRouter.sol`

#### 3.5 文档完善
- [ ] NatSpec 完整性检查 (所有函数)
- [ ] 更新 `ARCHITECTURE.md` (新增Multicall章节)
- [ ] 更新 `README.md` (Gas优化说明)
- [ ] 添加代码注释 (复杂逻辑)

**验收标准**: Slither无高危问题,代码符合SOLID,Gas优化≥30%

---

### Phase 4: 提交与合并 ⏳

#### 4.1 最终验证
- [ ] 运行完整测试: `forge test -vvv`
- [ ] 测试覆盖率报告: `forge coverage --report summary`
- [ ] Gas报告: `forge test --gas-report`
- [ ] 确认目标达成: Gas节省≥30%

#### 4.2 提交更改
- [ ] 暂存更改: `git add src/dex/DEXRouter.sol test/unit/DEXRouterMulticall.t.sol`
- [ ] 提交: `git commit -m "feat: add Multicall Gas optimization to DEXRouter"`
- [ ] 推送: `git push origin feat/task-opt-1-multicall-gas-optimization`

#### 4.3 更新任务状态
- [ ] 更新 `tasks-production-optimization.json`:
  - `status: "completed"`
  - `completedAt: "{timestamp}"`
  - `actualHours: {actual}`
  - `gasOptimizationAchieved: "{percentage}"`

#### 4.4 合并到main
- [ ] 切换到main: `git checkout main`
- [ ] 拉取最新: `git pull origin main`
- [ ] 合并: `git merge --no-ff feat/task-opt-1-multicall-gas-optimization`
- [ ] 推送: `git push origin main`
- [ ] 删除分支: `git branch -d feat/task-opt-1-multicall-gas-optimization`

**验收标准**: 代码成功合并到main,分支清理完成

---

## Gas Optimization Targets

| Function | Before (gas) | Target (gas) | Savings |
|----------|--------------|--------------|---------|
| **addLiquidityAndStake** | 500,000 | 350,000 | 30% |
| **swapAndAddLiquidity** | 420,000 | 250,000 | 40% |
| **removeAndClaim** | 280,000 | 180,000 | 35% |
| **boostAndDeposit** | 320,000 | 220,000 | 31% |
| **fullExitFlow** | 650,000 | 390,000 | 40% |

**Overall Target**: ≥30% Gas savings across all functions

---

## Dependencies

**No blocking dependencies** - Can start immediately

**Downstream dependencies**:
- opt-2: 前端Multicall集成 (depends on opt-1)
- opt-5: Gas基准测试套件 (depends on opt-1)

---

## Risks & Contingencies

### Risk 1: Gas优化未达标 (<30%)
**Contingency**:
- 使用 `unchecked` 减少检查
- 优化存储布局
- 减少事件参数

### Risk 2: 测试发现未知问题
**Contingency**:
- 记录为技术债务
- 优先修复关键路径
- 非关键问题后续处理

### Risk 3: Slither报告高危漏洞
**Contingency**:
- 立即修复
- 重新运行测试
- 延长1-2天完成时间

---

## Progress Tracking

**Started**: 2025-11-17T12:00:00Z
**Target Completion**: 2025-11-24 (7.5 days)

- [x] Setup: Branch + Changes directory created
- [ ] RED: Tests written (Day 1-2)
- [ ] GREEN: Functions implemented (Day 3-5)
- [ ] REFACTOR: Code optimized (Day 6-7)
- [ ] Merge: Code merged to main (Day 7.5)

---

**Last Updated**: 2025-11-17T12:00:00Z
