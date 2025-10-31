# Paimon 协议经济模型参数配置

**版本**: v2.0 (USDP + vePaimon + Boost)
**最后更新**: 2025-11-01
**状态**: 最终确认 ✅

---

## 概述

本文档定义了 Paimon 协议改造后的核心经济模型参数。所有参数已经过团队审核并最终确认，作为智能合约开发的权威配置参考。

**核心改造**:
- HYD → USDP (稳定币重命名 + accrualIndex 分红机制)
- VotingEscrow → VotingEscrowPaimon (ve33 治理)
- 新增 esPaimon (激励代币) + BoostStaking (收益加成)
- 新增 NitroPool (外部激励) + SavingRate (储蓄生息)

---

## 核心代币参数

### 1. USDP (稳定币)

| 参数 | 值 | 说明 |
|------|-----|------|
| **名称** | USDP | USD Paimon |
| **符号** | USDP | 代币符号 |
| **精度** | 18 | ERC20 decimals |
| **初始供应量** | 0 | 通过 PSM/Treasury mint |
| **分红机制** | accrualIndex | 份额-索引模式 (share-based) |
| **初始 accrualIndex** | 1.0 × 10^18 | 初始索引为 1.0 |
| **更新频率** | 每日 00:00 UTC | Treasury 调用 accumulate() |
| **Mint 权限** | Treasury, PSM | 仅这两个合约可调用 |
| **1:1 Peg** | USDC via PSM | 通过 PSM 套利维持 $1 锚定 |

**公式**:
```
实际余额 = _shares[user] × accrualIndex / 1e18
累积收益 = 原余额 × (新 accrualIndex - 旧 accrualIndex) / 旧 accrualIndex
```

---

### 2. PAIMON (治理代币)

| 参数 | 值 | 说明 |
|------|-----|------|
| **总供应量** | 100,000,000 | 固定总量 |
| **分配** | 详见 Tokenomics | prd.md 第 7 节 |
| **锁仓范围** | 1 周 ~ 4 年 | 锁入 vePaimon |
| **用途** | 治理投票 | 通过 vePaimon 获得投票权 |

---

### 3. esPaimon (激励代币)

| 参数 | 值 | 说明 |
|------|-----|------|
| **名称** | Escrowed Paimon | |
| **符号** | esPaimon | |
| **精度** | 18 | |
| **释放期限** | 365 天 | 线性释放 |
| **释放方式** | 线性 | vestedAmount = total × (elapsed / 365 days) |
| **提前退出罚则** | penalty = vested × (100 - progress) / 100 | progress = (elapsed / 365) × 100 |
| **衰减率** | 1% / 周 | 仅影响 Boost 权重,不影响余额 |
| **周期** | 7 天 | 每周递减 1% |
| **衰减上限** | 52 周 (52%) | 最多衰减 52% |
| **可转让** | ❌ 否 | 锁定期间不可转让 |
| **可质押** | ✅ 是 | 质押到 BoostStaking |

**公式**:
```
vestedAmount = totalAmount × (block.timestamp - startTime) / VESTING_PERIOD
penalty = vestedAmount × (100 - (elapsed / VESTING_PERIOD × 100)) / 100
weeksPassed = (block.timestamp - mintTime) / 7 days
decayedWeight = originalAmount × (100 - weeksPassed) / 100  (最多衰减 52%)
```

---

### 4. vePaimon (投票权 NFT)

| 参数 | 值 | 说明 |
|------|-----|------|
| **名称** | Vote-Escrowed Paimon | |
| **符号** | vePAIMON | |
| **标准** | ERC721 | NFT |
| **锁仓范围** | 1 周 ~ 4 年 | MINTIME = 1 week, MAXTIME = 4 years |
| **最大锁仓** | 4 年 (最终确认) | 126,144,000 秒 |
| **权重计算** | 线性衰减 | power = amount × (lockEnd - now) / MAXTIME |
| **NFT 可转让** | ✅ 是 | 转让后新持有者继承锁仓和权重 |
| **快照周期** | 7 天 | 每周四 00:00 UTC |
| **Epoch 对齐** | GaugeController | 与 GaugeController 周期对齐 |

**公式**:
```
votingPower = lockedAmount × (unlockTime - currentTime) / MAXTIME
MAXTIME = 4 years = 126,144,000 seconds
```

---

## DEX 手续费分配 (70/30)

| 参数 | 值 | 说明 |
|------|-----|------|
| **总手续费** | 0.25% | 每笔 swap 收取 |
| **投票者分配** | 70% | 分配给 vePaimon 投票者 (Gauge 激励) |
| **国库分配** | 30% | 进入 Treasury |
| **计算方式** | 动态计算 | voterShare = fee × 7 / 10; treasuryShare = fee - voterShare |

**实现细节**:
- **删除**: `VOTER_FEE`, `TREASURY_FEE` 固定常量
- **新增**: 动态计算避免精度问题
- **公式**:
  ```solidity
  uint256 voterShare = (totalFee * 7) / 10;
  uint256 treasuryShare = totalFee - voterShare;
  ```

---

## Boost 激励系统

### BoostStaking 参数

| 参数 | 值 | 说明 |
|------|-----|------|
| **质押代币** | esPaimon | |
| **最低锁定期** | 7 天 | MIN_STAKE_DURATION |
| **Boost 范围** | 1.0x ~ 1.5x | 基础倍数到最大倍数 |
| **计算公式** | boostMultiplier = 10000 + (amount / 1000) × 100 | 上限 15000 (1.5x) |
| **精度** | 10000 = 1.0x | 基数 10000 |
| **最大 Boost** | 15000 (1.5x) | 上限封顶 |

**公式**:
```solidity
boostMultiplier = 10000 + (stakedAmount / 1000) * 100;
if (boostMultiplier > 15000) boostMultiplier = 15000;

actualReward = baseReward × boostMultiplier / 10000;
```

**示例**:
- 质押 1,000 esPaimon → Boost = 1.1x
- 质押 5,000 esPaimon → Boost = 1.5x (封顶)
- 质押 10,000 esPaimon → Boost = 1.5x (封顶)

---

## NitroPool (外部激励池)

| 参数 | 值 | 说明 |
|------|-----|------|
| **创建权限** | vePaimon 投票批准 | 需治理投票 ≥51% 通过 |
| **平台费** | 2% | 从奖励中扣除 |
| **最低流动性要求** | 项目方自定义 | 每个池可设置 minLiquidity |
| **锁定期** | 项目方自定义 | 每个池可设置 lockDuration |
| **奖励代币白名单** | 治理维护 | 防止恶意代币 |
| **风险提示** | 前端显著标注 | 外部代币风险自负 |

---

## SavingRate (储蓄生息)

| 参数 | 值 | 说明 |
|------|-----|------|
| **储蓄资产** | USDP | |
| **年化利率** | 动态 (初始 2%) | annualRate = 200 (200/10000 = 2%) |
| **利率来源** | RWA 收益提成 2% + DEX 国库 | Treasury 注资 |
| **更新频率** | 每日 00:00 UTC | Chainlink Keeper 自动调用 |
| **波动上限** | 单周 ±20% | 防止剧烈波动 |
| **计算公式** | 利息 = 本金 × annualRate / 365 / 10000 | 每日累积 |
| **精度** | 10000 = 100% | 基数 10000 |

**公式**:
```solidity
dailyRate = annualRate / 365;
dailyInterest = principal × dailyRate / 10000;
```

**示例**:
- 存入 10,000 USDP,年化 2%
- 每日利息 = 10,000 × 200 / 365 / 10000 ≈ 0.548 USDP
- 年化收益 ≈ 200 USDP

---

## PSM (稳定币兑换模块)

| 参数 | 值 | 说明 |
|------|-----|------|
| **兑换对** | USDC ↔ USDP | 1:1 兑换 |
| **手续费** | 0% (可配置) | 初始无手续费,可通过治理调整 |
| **滑点** | 0 | 1:1 固定兑换 |
| **精度转换** | 1e6 (USDC) ↔ 1e18 (USDP) | 乘以 1e12 |
| **Mint 上限** | 移除 | 不再追踪 maxMintedHYD |
| **Invariant** | USDC 余额 ≥ USDP 通过 PSM 铸造量 | 核心安全保证 |

---

## GaugeController 参数

| 参数 | 值 | 说明 |
|------|-----|------|
| **Epoch 周期** | 7 天 | 每周四 00:00 UTC |
| **快照时间** | Epoch 结束时 | 与 vePaimon 对齐 |
| **投票权重来源** | vePaimon.balanceOf | 查询 vePaimon 的 votingPower |
| **Gauge 类型** | LP Token Gauges | 流动性池 Gauge |
| **权重上限** | 100% | 单个 Gauge 不超过 100% |

---

## Treasury (国库) 参数

| 参数 | 值 | 说明 |
|------|-----|------|
| **RWA 抵押率 (LTV)** | T1: 80%, T2: 65%, T3: 50% | 分层抵押 |
| **USDP Mint 权限** | Treasury | 基于 RWA 抵押铸造 |
| **收益分配** | 详见 prd.md 第 8 节 | |
| **储蓄率注资** | RWA 收益的 2% | 定期注入 SavingRate |
| **多签要求** | 3-of-5 (常规), 4-of-7 (紧急) | 安全治理 |
| **Timelock** | 48 小时 | 常规操作时间锁 |

---

## BribeMarketplace 参数

| 参数 | 值 | 说明 |
|------|-----|------|
| **Bribe 资产白名单** | USDC, USDP, esPaimon, 其他治理批准代币 | |
| **平台费** | 2% | 从 bribe 中扣除 |
| **领取周期** | 与 Epoch 对齐 | 每周四 00:00 UTC 后可领取 |

---

## 部署顺序和依赖

```
Phase 0: HYD → Oracle → Treasury (保持不变,仅更新引用)
Phase 1: USDP → PSM (重构)
Phase 2: Paimon → esPaimon → vePaimon
Phase 3: DEXFactory/Pair (费用分配更新) → DEXRouter
Phase 4: GaugeController → BribeMarketplace (添加 esPaimon 白名单)
Phase 5: BoostStaking → RewardDistributor (集成 Boost) → NitroPool → SavingRate
```

---

## 安全约束和 Invariants

### 核心不变量

1. **PSM Invariant**:
   ```
   USDC.balanceOf(PSM) ≥ USDP.totalMintedViaPSM()
   ```

2. **USDP Invariant**:
   ```
   sum(_shares[all_users]) == _totalShares
   sum(balanceOf(all_users)) == totalSupply (动态计算)
   ```

3. **Boost Invariant**:
   ```
   1.0x ≤ boostMultiplier ≤ 1.5x
   actualReward ≤ baseReward × 1.5
   ```

4. **DEX Fee Invariant**:
   ```
   voterFees + treasuryFees == totalFees
   voterFees ≈ totalFees × 0.7 (允许 ±1 wei 精度误差)
   ```

5. **Treasury Invariant**:
   ```
   Total USDP minted ≤ Total RWA value × weighted_avg(LTV)
   ```

6. **vePaimon Invariant**:
   ```
   sum(votingPower) ≤ sum(lockedPAIMON)
   votingPower 随时间线性递减
   ```

---

## Gas 优化目标

| 操作 | Gas 目标 | 说明 |
|------|----------|------|
| USDP.transfer | <80K | 需计算实际余额 |
| esPaimon.vest | <150K | 线性释放计算 |
| vePaimon.lock | <200K | NFT mint + 权重计算 |
| BoostStaking.stake | <120K | 质押 + Boost 计算 |
| NitroPool.enter | <180K | 参与 Nitro 池 |
| SavingRate.deposit | <100K | 存入 + 利息计算 |
| PSM.swap | <120K | 1:1 兑换 |
| DEXPair.swap | <150K | 含费用分配 |

---

## 测试覆盖要求

- **单元测试覆盖率**: ≥80% (关键路径 100%)
- **6 维度测试**: 功能/边界/异常/性能/安全/兼容
- **Invariant 测试**: Fuzzing 10,000+ runs
- **Integration 测试**: 完整用户流程端到端
- **Gas 基准测试**: 关键操作 Gas 验证

---

## 审计和合规

- **安全审计**: 待安排 (测试网验证后)
- **Slither/Mythril**: 无高危漏洞
- **Certora 形式化验证**: 核心 Invariants 验证 (可选)
- **应急预案**: Pausable + 多签 + Timelock

---

## 变更历史

| 日期 | 版本 | 变更 | 说明 |
|------|------|------|------|
| 2025-11-01 | v2.0 | 最终确认参数 | HYD→USDP, vePaimon 4年, Boost 1.0-1.5x, 费用 70/30 |

---

## 参考文档

- PRD: `.ultra/docs/prd.md`
- Technical Design: `.ultra/docs/tech.md`
- Architecture: `paimon-rwa-contracts/ARCHITECTURE.md`
- Tasks: `.ultra/tasks/tasks.json`

---

**状态**: ✅ 最终确认
**下一步**: 开始合约实现 (Task 3: USDP.sol)
