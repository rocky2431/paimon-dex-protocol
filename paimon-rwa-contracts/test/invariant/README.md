# Invariant Testing Suite (TEST-001)

完整的 Foundry invariant 测试套件，使用 handler pattern 验证协议的核心不变量。

## 📁 文件结构

```
test/invariant/
├── README.md                          # 本文件
├── InvariantPSM.t.sol                # PSM 不变量测试 (241 lines, 4 invariants)
├── InvariantVotingEscrow.t.sol       # VotingEscrow 不变量测试 (209 lines, 3 invariants)
├── InvariantGaugeController.t.sol    # GaugeController 不变量测试 (217 lines, 2 invariants)
├── InvariantDEX.t.sol                # DEXPair 不变量测试 (197 lines, 2 invariants)
└── handlers/
    ├── PSMHandler.sol                # PSM 操作处理器 (135 lines)
    ├── VotingEscrowHandler.sol       # VotingEscrow 操作处理器 (159 lines)
    ├── GaugeControllerHandler.sol    # GaugeController 操作处理器 (163 lines)
    └── DEXPairHandler.sol            # DEXPair 操作处理器 (210 lines)
```

**总计**: 1,606 行代码 | 11 个不变量 | 4 个测试文件 | 4 个 Handler

---

## 🎯 测试的不变量

### 1. InvariantPSM.t.sol (4 个不变量)

| 不变量 | 描述 | 公式 |
|--------|------|------|
| `invariant_reserveCoversSupply` | USDC 储备覆盖所有铸造的 HYD | `USDC.balanceOf(PSM) >= totalMinted / 1e12` |
| `invariant_1to1Peg` | 维持 1:1 挂钩（扣除手续费） | `swap_ratio ≈ 1.00 ± fee%` |
| `invariant_maxMintNotExceeded` | 不超过铸造上限 | `totalMinted <= maxMintedHYD` |
| `invariant_feeAccuracy` | 手续费计算精确到 1 wei | `|calculated_fee - actual_fee| <= 1` |

**Handler 操作**:
- `swapUSDCForHYD(uint256 amount)` - 随机 USDC → HYD 交换
- `swapHYDForUSDC(uint256 amount)` - 随机 HYD → USDC 交换
- `updateMaxMintedHYD(uint256 newMax)` - 随机更新铸造上限
- `updateFeeIn/Out(uint256 newFee)` - 随机更新手续费

---

### 2. InvariantVotingEscrow.t.sol (3 个不变量)

| 不变量 | 描述 | 公式 |
|--------|------|------|
| `invariant_votingPowerBounded` | 投票权重不超过锁定总量 | `Σ balanceOfNFT(i) <= HYD.balanceOf(VotingEscrow)` |
| `invariant_noEarlyWithdrawal` | 无法提前提取 | `cannot withdraw if block.timestamp < lockEnd` |
| `invariant_linearDecay` | 投票权重线性衰减 | `power = amount × (lockEnd - now) / MAXTIME` |

**Handler 操作**:
- `createLock(uint256 amount, uint256 duration)` - 创建锁定
- `increaseLockAmount(uint256 tokenId, uint256 amount)` - 增加锁定金额
- `increaseLockTime(uint256 tokenId, uint256 newDuration)` - 延长锁定时间
- `withdraw(uint256 tokenId, bool warp)` - 提取（可选时间跳转）

---

### 3. InvariantGaugeController.t.sol (2 个不变量)

| 不变量 | 描述 | 公式 |
|--------|------|------|
| `invariant_totalWeight100Percent` | 总权重不超过 100% | `Σ userVotes[epoch][gaugeId] <= 10000` |
| `invariant_batchVoteConsistency` | 批量投票一致性 | `batchVote() == Σ vote()` |

**Handler 操作**:
- `createVeNFT(uint256 amount)` - 创建投票 NFT
- `vote(uint256 tokenId, uint256 gaugeId, uint256 weight)` - 单次投票
- `batchVote(uint256 tokenId, ...)` - 批量投票
- `addGauge(uint256 gaugeSeed)` - 添加 gauge

---

### 4. InvariantDEX.t.sol (2 个不变量)

| 不变量 | 描述 | 公式 |
|--------|------|------|
| `invariant_kInvariantHolds` | K 值恒定或增加 | `reserve0 × reserve1 >= initialK` |
| `invariant_feeAccounting` | 手续费计账准确 | `fees_collected ≈ volume × 0.25%` |

**Handler 操作**:
- `addLiquidity(uint256 amount0, uint256 amount1)` - 添加流动性
- `removeLiquidity(uint256 lpAmount)` - 移除流动性
- `swapToken0ForToken1(uint256 amountIn)` - Token0 → Token1
- `swapToken1ForToken0(uint256 amountIn)` - Token1 → Token0

---

## 🚀 运行测试

### 运行所有 Invariant 测试

```bash
forge test --match-path "test/invariant/*.sol" -vvv
```

### 运行单个测试文件

```bash
# PSM 不变量测试
forge test --match-contract InvariantPSM -vvv

# VotingEscrow 不变量测试
forge test --match-contract InvariantVotingEscrow -vvv

# GaugeController 不变量测试
forge test --match-contract InvariantGaugeController -vvv

# DEXPair 不变量测试
forge test --match-contract InvariantDEX -vvv
```

### 运行特定不变量

```bash
# 测试 PSM 的储备覆盖不变量
forge test --match-test invariant_reserveCoversSupply -vvv

# 测试 DEX 的 K 不变量
forge test --match-test invariant_kInvariantHolds -vvv
```

### 增加运行次数（更彻底的测试）

```bash
# 100,000 次运行（推荐用于 CI）
FOUNDRY_INVARIANT_RUNS=100000 forge test --match-path "test/invariant/*.sol"

# 1,000,000 次运行（完整验证）
FOUNDRY_INVARIANT_RUNS=1000000 forge test --match-path "test/invariant/*.sol"
```

### 查看详细日志

```bash
# 显示 ghost 变量和统计信息
forge test --match-contract InvariantPSM -vvvv

# 查看所有调用序列（debugging）
forge test --match-contract InvariantPSM -vvvvv
```

---

## ⚙️ 配置

在 `foundry.toml` 中配置 invariant 测试参数：

```toml
[invariant]
runs = 100              # 每个不变量运行 100 次
depth = 15              # 每次运行最多 15 个随机操作
fail_on_revert = false  # 允许操作失败（测试边界情况）
```

**推荐配置**:
- **开发**: `runs = 100, depth = 15` (快速验证)
- **CI**: `runs = 10000, depth = 20` (标准测试)
- **发布前**: `runs = 100000, depth = 25` (完整测试)

---

## 📊 预期输出

### 成功示例

```
Running 4 tests for test/invariant/InvariantPSM.t.sol:InvariantPSM
[PASS] invariant_1to1Peg() (runs: 100, calls: 1500, reverts: 234)
[PASS] invariant_feeAccuracy() (runs: 100, calls: 1500, reverts: 156)
[PASS] invariant_maxMintNotExceeded() (runs: 100, calls: 1500, reverts: 89)
[PASS] invariant_reserveCoversSupply() (runs: 100, calls: 1500, reverts: 201)

Test result: ok. 4 passed; 0 failed; 0 skipped; finished in 12.34s
```

### 失败示例（触发不变量违反）

```
[FAIL. Reason: INVARIANT VIOLATION: Reserve must cover minted HYD supply]
        invariant_reserveCoversSupply()

Failing call sequence:
    1. swapUSDCForHYD(1000000000000) [from Handler]
    2. updateMaxMintedHYD(999999999999999999999999) [from Handler]
    3. swapUSDCForHYD(999999999999999999) [from Handler]

Counter example: {...}
```

---

## 🐛 调试技巧

### 1. 查看 Ghost 变量

每个测试文件包含 `invariant_callSummary()` 函数：

```bash
forge test --match-test invariant_callSummary -vvv
```

输出示例：
```
=== PSM Invariant Test Summary ===
Total Swaps: 1234
Total USDC In: 5000000000000
Total HYD Minted: 4995000000000000000000000
Current State:
USDC Reserve: 5000000000000
Total Minted HYD: 4995000000000000000000000
```

### 2. 重现失败场景

Foundry 会输出失败的调用序列，可以手动重现：

```solidity
function test_reproduceFailure() public {
    handler.swapUSDCForHYD(1000000000000);
    handler.updateMaxMintedHYD(999999999999999999999999);
    handler.swapUSDCForHYD(999999999999999999);
    // 检查不变量
}
```

### 3. 使用 Fuzzer Seed

固定 seed 以重现特定测试：

```bash
FOUNDRY_FUZZ_SEED=42 forge test --match-contract InvariantPSM
```

---

## 📈 性能基准

| 测试合约 | Runs | Calls | 平均时间 | Gas 消耗 |
|----------|------|-------|----------|----------|
| InvariantPSM | 100 | ~1500 | 8-12s | ~500M |
| InvariantVotingEscrow | 100 | ~1200 | 6-10s | ~400M |
| InvariantGaugeController | 100 | ~1000 | 5-8s | ~350M |
| InvariantDEX | 100 | ~1800 | 10-15s | ~600M |

**总计**: ~30-45 秒（100 runs）

---

## 🔬 测试覆盖率

使用 `forge coverage` 查看 invariant 测试的代码覆盖率：

```bash
forge coverage --match-path "test/invariant/*.sol" --report lcov
```

**预期覆盖率**:
- PSM: ~85%
- VotingEscrow: ~80%
- GaugeController: ~75%
- DEXPair: ~80%

---

## 🎓 Handler Pattern 说明

### 为什么使用 Handler?

1. **边界值管理**: `bound()` 确保随机值在合理范围内
2. **状态跟踪**: Ghost 变量记录所有操作历史
3. **错误过滤**: `try/catch` 允许测试边界情况而不中断
4. **清晰分离**: 测试逻辑与操作逻辑分离

### Handler 设计原则

```solidity
contract MyHandler {
    // 1. Ghost variables - 跟踪所有操作
    uint256 public ghost_totalOperations;

    // 2. Bounded randomness - 限制输入范围
    function operation(uint256 input) external {
        input = bound(input, MIN, MAX);
        // ...
    }

    // 3. Error handling - 优雅处理失败
    try target.operation(input) {
        ghost_totalOperations++;
    } catch {
        // Expected behavior, continue testing
    }
}
```

---

## 🔐 安全注意事项

1. **不变量必须始终成立**: 任何不变量违反都是严重的安全问题
2. **Handler 不应作弊**: Handler 不能绕过正常权限检查
3. **Ghost 变量准确性**: Ghost 变量必须准确反映链上状态
4. **边界条件覆盖**: 测试必须覆盖极端值（0, max, overflow）

---

## 📚 参考资料

- [Foundry Invariant Testing](https://book.getfoundry.sh/forge/invariant-testing)
- [Trail of Bits - Breaking Invariants](https://blog.trailofbits.com/2023/07/21/fuzzing-on-chain-contracts-with-foundry/)
- [Uniswap V2 Invariants](https://docs.uniswap.org/contracts/v2/concepts/protocol-overview/smart-contracts#constant-product-formula)
- [Curve Finance veTokenomics](https://resources.curve.fi/governance/understanding-governance)

---

## 📝 贡献指南

添加新的不变量测试：

1. 在 `handlers/` 创建新的 Handler 合约
2. 实现随机操作函数（使用 `bound()`）
3. 添加 ghost 变量跟踪状态
4. 在测试合约中定义不变量（`invariant_*` 函数）
5. 使用 `targetContract(handler)` 注册 Handler
6. 添加 `invariant_callSummary()` 用于调试
7. 更新本 README 文档

---

**最后更新**: 2025-10-25
**维护者**: Paimon.dex Team
**License**: MIT
