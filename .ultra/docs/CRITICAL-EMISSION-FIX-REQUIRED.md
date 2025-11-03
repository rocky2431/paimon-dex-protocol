# 🔴 CRITICAL: EmissionManager排放参数与纲领严重不符

**发现时间**: 2025-11-04
**优先级**: P0-BLOCKER（阻塞部署）
**影响范围**: Token经济学核心参数
**修复策略**: 方案A - 纲领为准（已确认）

---

## 问题 1: 通道分配比例固定，未实现阶段性调整

### 纲领要求（Line 154-156）

| 阶段 | Debt | LP | Eco |
|------|------|----|----|
| Phase-A (w1-12) | **30%** | **60%** | **10%** |
| Phase-B (w13-248) | **50%** | **37.5%** | **12.5%** |
| Phase-C (w249-352) | **55%** | **35%** | **10%** |

### 合约实现（`EmissionManager.sol`）

```solidity
// Line 75-82: 固定比例，无法按阶段调整
uint256 public constant DEBT_BPS = 1000;     // 10% (固定！)
uint256 public constant LP_TOTAL_BPS = 7000; // 70% (固定！)
uint256 public constant ECO_BPS = 2000;      // 20% (固定！)
```

**差异对比**:

| 通道 | Phase-A纲领 | 合约 | 偏差 | Phase-B纲领 | 合约 | 偏差 | Phase-C纲领 | 合约 | 偏差 |
|------|-------------|------|------|-------------|------|------|-------------|------|------|
| Debt | 30% | 10% | **-67%** | 50% | 10% | **-80%** | 55% | 10% | **-82%** |
| LP   | 60% | 70% | **+17%** | 37.5% | 70% | **+87%** | 35% | 70% | **+100%** |
| Eco  | 10% | 20% | **+100%** | 12.5% | 20% | **+60%** | 10% | 20% | **+100%** |

---

## 问题 2: 排放总量标定值不符（1.7088倍缩放）

### 纲领要求（Line 147-149）

```
Phase-A (w=1..12):  E_A = 37,500,000 PAIMON/周
Phase-B (w=13..248): E0_B ≈ 55,584,000 (初始), r=0.985 (1.5%/周衰减)
Phase-C (w=249..352): E_C ≈ 4,326,923.08 PAIMON/周
```

### 合约实现（`EmissionManager.sol`）

```solidity
// Line 56: Phase-A 固定排放
uint256 public constant PHASE_A_WEEKLY = 64_080_000 * 1e18; // 64.08M
// 原注释: Original spec: 37.5M, scaled by 1.7088x to reach 10B target

// Line 61: Phase-C 固定排放
uint256 public constant PHASE_C_WEEKLY = 7_390_000 * 1e18;  // 7.39M
// 原注释: Original spec: 4.327M, scaled by 1.7088x to reach 10B target
```

**差异对比**:

| 阶段 | 纲领（PAIMON/周） | 合约（PAIMON/周） | 缩放因子 | 偏差 |
|------|-------------------|-------------------|----------|------|
| Phase-A | 37,500,000 | 64,080,000 | 1.7088x | **+70.8%** |
| Phase-C | 4,326,923 | 7,390,000 | 1.7088x | **+70.8%** |

**Phase-B公式也需要对应调整**（代码中标记为TODO）。

---

## 经济影响分析

### 1. 债务挖矿严重不足

**纲领设计意图**: Phase-B/C期间，债务挖矿应该是主要激励渠道（50-55%）
**实际效果**: 仅10%，导致：
- ❌ RWA抵押激励不足
- ❌ USDP铸造需求下降
- ❌ 稳定币规模无法扩张

**财务影响**（以Phase-B第100周为例）:
```
纲领预期: 每周排放 ~20M PAIMON × 50% = 10M给债务挖矿
合约实际: 每周排放 ~34M PAIMON × 10% = 3.4M给债务挖矿
差额: -66% (-6.6M PAIMON/周)
```

### 2. 流动性激励过高

**纲领设计意图**: Phase-B/C降低LP占比，转移资源到债务挖矿
**实际效果**: 固定70%，导致：
- ❌ 流动性激励过度（APR虚高）
- ❌ Token通胀压力大
- ❌ 资源配置失衡

**财务影响**（以Phase-B第100周为例）:
```
纲领预期: 每周排放 ~20M PAIMON × 37.5% = 7.5M给LP
合约实际: 每周排放 ~34M PAIMON × 70% = 23.8M给LP
超发: +217% (+16.3M PAIMON/周)
```

### 3. 总排放速率偏快

**纲领设计意图**: 352周发行总量接近10B
**实际效果**: 352周发行总量会超过17B（假设Phase-B同样缩放）

**累计影响**:
- 12周 Phase-A: 769M → 1,314M (+545M)
- 236周 Phase-B: ~4,500M → ~7,686M (+3,186M) (估算)
- 104周 Phase-C: 450M → 768M (+318M)
- **总计**: 10B → **~17B** (+70%)

---

## 修复方案

### 方案 A: 重新部署EmissionManager（推荐 ✅）

**步骤**:
1. 创建EmissionManager V2合约
2. 实现阶段性通道比例切换
3. 使用纲领原始参数（37.5M/4.327M）
4. 部署前在testnet完整测试352周
5. 主网部署后迁移所有依赖合约

**新合约关键改动**:
```solidity
// 阶段性通道比例
function getWeeklyBudget(uint256 week) external view returns (...) {
    uint256 totalBudget;
    uint16 debtBps;
    uint16 lpBps;
    uint16 ecoBps;

    if (week <= 12) {
        // Phase-A
        totalBudget = 37_500_000e18;
        debtBps = 3000; // 30%
        lpBps = 6000;   // 60%
        ecoBps = 1000;  // 10%
    } else if (week <= 248) {
        // Phase-B
        totalBudget = _calculatePhaseBEmission(week);
        debtBps = 5000; // 50%
        lpBps = 3750;   // 37.5%
        ecoBps = 1250;  // 12.5%
    } else {
        // Phase-C
        totalBudget = 4_326_923_076_923e12;
        debtBps = 5500; // 55%
        lpBps = 3500;   // 35%
        ecoBps = 1000;  // 10%
    }

    // 分配逻辑...
}
```

**优点**:
- ✅ 完全符合纲领设计
- ✅ Token经济学正确
- ✅ 社区预期一致

**成本**:
- 重新部署gas费（~500万gas）
- 迁移周期（1-2周）
- 前端config更新

---

### 方案 B: 更新纲领文档（不推荐 ❌）

**步骤**:
1. 修改纲领为固定10/70/20比例
2. 接受64.08M/7.39M排放速率
3. 总量从10B更新为17B
4. 重新审计经济模型

**缺点**:
- ❌ 否定已完成的经济学设计
- ❌ 与社区/投资人披露不符
- ❌ 可能引发信任问题

---

## 行动清单

### 立即行动（今日）

- [ ] 向核心团队汇报此差异
- [ ] 确认是否有其他合约依赖当前EmissionManager
- [ ] 评估迁移成本和时间表
- [ ] 决策：方案A（重新部署）vs 方案B（修改纲领）

### 短期行动（3天内，假设选择方案A）

- [ ] 编写EmissionManager V2合约
- [ ] 补充Phase-B精确计算逻辑
- [ ] 编写完整测试用例（覆盖352周）
- [ ] 在testnet部署并验证
- [ ] 审计新合约代码

### 中期行动（1周内）

- [ ] 主网部署EmissionManager V2
- [ ] 更新GaugeController依赖
- [ ] 更新RewardDistributor依赖
- [ ] 更新前端config（emission schedule显示）
- [ ] 发布迁移公告

---

## 验证检查点

部署后必须验证：

```solidity
// Week 1 (Phase-A)
assert(getWeeklyBudget(1).debt == 11_250_000e18); // 30% of 37.5M
assert(getWeeklyBudget(1).lpPairs + getWeeklyBudget(1).stabilityPool == 22_500_000e18); // 60% of 37.5M
assert(getWeeklyBudget(1).eco == 3_750_000e18); // 10% of 37.5M

// Week 100 (Phase-B)
uint256 week100Budget = _calculatePhaseBEmission(100);
assert(getWeeklyBudget(100).debt == week100Budget * 5000 / 10000); // 50%
assert(getWeeklyBudget(100).lpPairs + getWeeklyBudget(100).stabilityPool == week100Budget * 3750 / 10000); // 37.5%

// Week 300 (Phase-C)
assert(getWeeklyBudget(300).debt == 4_326_923_076_923e12 * 5500 / 10000); // 55%
assert(getWeeklyBudget(300).lpPairs + getWeeklyBudget(300).stabilityPool == 4_326_923_076_923e12 * 3500 / 10000); // 35%
```

---

## 附录：纲领相关章节引用

### 排放三阶段（纲领 Line 136-149）

```
Phase-A（w=1..12）：E_A = 37,500,000/周
Phase-B（w=13..248）：E_B(t)=E0_B×r^(t-1)，E0_B≈55,584,000，r=0.985
Phase-C（w=249..352）：E_C = 450,000,000/104 ≈ 4,326,923.076923/周
```

### 通道与LP二级分流（纲领 Line 154-157）

```
通道系数（按阶段）：
- Phase-A：Debt 30% / LP 60% / Eco 10%
- Phase-B：Debt 50% / LP 37.5% / Eco 12.5%
- Phase-C：Debt 55% / LP 35% / Eco 10%

LP 内部分流（示例 Phase-B）：
{lpPairsBps=6000, stabilityPoolBps=4000}（治理可调，Timelock保护）
```

---

**结论**: 这是一个**必须修复的P0级差异**。建议立即采用方案A重新部署，确保与纲领权威规范一致。否则将导致Token经济失衡，影响协议长期可持续性。
