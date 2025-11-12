# Paimon.dex 代币经济学白皮书（提案版）

> 版本：v1.0（2025-03-XX）  
> 适用对象：产品、工程、治理、风控团队  
> 作者：laowang-engineer

本文件描述 Paimon.dex 在主网上线时采用的完整代币经济学设计，涵盖代币体系、供给分配、排放曲线、归属与激励、治理结构、奖励分发、安全机制、国库资金循环以及运维指标。阅读本文件即可独立理解整套模型，无需参考历史版本。

---

## 1. 代币体系概览

| 代币/凭证 | 类型 | 总量/上限 | 核心用途 | 发行主体 |
|-----------|------|-----------|----------|-----------|
| **PAIMON** | ERC-20 | 10,000,000,000（硬顶） | 治理、质押、流动性激励、Bribe 资产 | EmissionManager + Treasury |
| **esPaimon** | ERC-20 Vesting | 受排放配额约束（≤ 社区排放剩余额度） | 奖励归属载体，可归集到 veNFT | RewardDistributor/Treasury |
| **vePAIMON** | ERC-721 | 无上限 | 治理投票、Gauge 分配、Nitro 审批、Bribe 收益 | VotingEscrowPaimon |
| **USDP** | ERC-20 稳定币 | 无上限（锚定 USDC） | 贷款、Stability Pool、PSM 兑换 | USDPVault / PSM |
| **USDC/HYD 等 RWA** | ERC-20 | 依资产而定 | 抵押品、交易对 | 各项目方 |

### 1.1 代币分配（静态）

随机发行或基金会持有的 PAIMON 份额如下：

| 模块 | 比例 | 解锁/锁定规则 |
|------|------|----------------|
| 社区排放（esPaimon） | 45% | 352 周排放曲线 + 多档 vesting |
| 国库 / DAO 储备 | 15% | 5% 可用流动性、10% 供战略合作；均由多签托管 |
| 团队激励 | 15% | 12 个月 cliff + 36 个月线性，需锁入 veNFT 才能解锁 80% | 
| 投资者 | 10% | 6 个月 cliff + 18 个月线性；前 50% 需锁入 veNFT |
| 流动性与做市 | 5% | 12 个月线性，优先用于 AMM 初始池与 CEX 做市 |
| 生态 / 战略合作 | 4% | 12-24 个月分批释放，需通过治理审批 |
| 空投 / 增长 | 3% | 根据增长计划随用随批，均采用 esPaimon vesting |
| Bribe 预算 | 3% | 36 个月线性释放，专供 BribeMarketplace |

静态分配占 100%，其余供给全部来自排放曲线。

### 1.2 供给守恒规则

- **Emission Ledger**：EmissionManager 维护“社区排放剩余额度”，每次 RewardDistributor 铸造 esPaimon 时同步扣减；若剩余额度为零，铸造直接失败。
- **一进一出**：用户 `claim` 时合约先 burn 等量 esPaimon，再从 Emission/Treasury 库存释放同额 PAIMON，保证实际流通永远 ≤ 10B。
- **Boost 限定**：只有“已归属并转换为 PAIMON/锁入 veNFT 的份额”可以贡献乘数；仍在 vesting 的 es 不计入任何 Boost 计算。
- **治理仓位核销**：将 esPaimon 通过 `lockToVe` 注入 veNFT 时，会立即 burn es 并增发 ve 权益，从而不会重复计算供给。

---

## 2. 排放与预算调度

### 2.1 三阶段排放曲线

| 阶段 | 周期 | 每周基准排放 | 衰减 | 阶段总额 |
|------|------|---------------|------|-----------|
| **Phase A：启动** | Week 1-12 | 37.5M | 0% | 450M |
| **Phase B：增长** | Week 13-248 | 首周 55.584M | 指数衰减 1.5%/周，至 4.327M | ~8.55B |
| **Phase C：尾期** | Week 249-352 | 4.327M | 0% | 450M |

Phase B 的衰减通过 236 项查找表固化在链上，`EmissionManager` 的 `getBaseBudget(week)` O(1) 返回。

### 2.2 需求联动调节

1. **UtilizationOracle** 计算 `USDPVault.totalDebt / maxBorrowCapacity`（考虑所有 RWA Tier LTV）。
2. 每次 `routeWeek` 前，`EmissionManager.getAdaptiveBudget(week)` 将基准预算乘以下列系数：
   - Utilization < 70% → 0.70  
   - 70% ≤ Utilization < 90% → 1.00  
   - Utilization ≥ 90% → 1.15（封顶）
3. Oracle 由多签控制的 keeper 更新，Tamper-proof：提交值需与链下预言源+Vault 事件匹配，否则回滚。

### 2.3 四通道+回流机制

`EmissionRouter.routeWeek()` 将预算分配到四个 sink：

| 通道 | 默认占比（Phase A/B/C） | Sink | 说明 |
|------|-----------------------|------|------|
| Debt Mining | 30% / 50% / 55% | USDPVault 奖励池 | 仅 Vault 借款人基于 TWAD 参与 |
| LP Pairs | 36% / 22.5% / 21% | GaugeController | 再细分至各 AMM 池 |
| Stability Pool | 24% / 15% / 14% | USDPStabilityPool | 属于“LP 总额”中的 40%（默认） |
| Ecosystem | 10% / 12.5% / 10% | Treasury / 特定项目 | Launchpad、合作、Bribe 补贴 |

> 注：LP 通道内部默认 60% → AMM 池、40% → Stability Pool；可由治理通过 `setLPSplit()` 调整。

**未用预算回流**：若任一 sink 在周期内未提走全部配额，`EmissionRouter.reclaimUnused(week)` 会在冷却期后把剩余 PAIMON 送回 Treasury 并记录事件。

---

## 3. 奖励发放与归属

### 3.1 多档 vesting

`esPaimon` 支持三种档位，用户在 `RewardDistributor.claim()` 时选择：

| 档位 | 归属期 | 奖励系数（占用排放额度） | 早退罚金 |
|------|--------|---------------------------|----------|
| Fast | 90 天 | 0.6× baseReward | 50% 未归属部分烧毁 |
| Standard | 365 天 | 1.0× baseReward | 50% 未归属部分烧毁 |
| Loyal | 540 天 | 1.2× baseReward | 60% 未归属部分烧毁 |

- 每地址每周可开 1 条 Fast + 1 条 Loyal，防止拆单刷奖励。  
- RewardDistributor 在生成 Merkle 数据时即按系数占用 Emission Ledger，确保任何档位都不会突破 45% 社区排放总额。  
- 所有档位结束后领取的 PAIMON 可以：① 自由转移；② 通过 `lockToVe(tokenId, amount)` 注入 veNFT（该步骤会 burn 相应 esPaimon）。

### 3.2 Boost 机制

BoostStaking 结合质押数量与锁定期提供 1.0x~1.5x 乘数。额外规则：
- 仅“已归属且处于 PAIMON/ve 锁仓状态”的份额可计入 multiplier；仍在 vesting 的 es 不具备 Boost 权重。
- 锁入 veNFT 的份额不再触发每周 1% 衰减；未锁部分继续线性衰减，鼓励参与治理。
- 最终 multiplier = Base + Stake Boost + ve-lock Boost（软上限 1.5x）。

### 3.3 奖励管线

```
EmissionRouter → RewardDistributor（pending root）
  ↳ 多签签名 + 6h 冷静期 → activate root
  ↳ 用户提交 Merkle proof → 选择档位 → esPaimon vesting（同步占用/扣减排放额度）
  ↳ 归属完成后 burn esPaimon → 释放等额 PAIMON → (可选) BoostStaking / lockToVe
```

---

## 4. 治理与激励

### 4.1 vePAIMON 规则
- 锁定期 1 周~4 年，线性衰减投票权。  
- NFT 可转让，但转移后触发 48 小时冷却，期间无法投票、领取 Bribe、调整仓位。

### 4.2 Gauge KPI 约束
- 守护进程每周提交交易量、TVL、价格滑点、oracle 偏差，生成 0-100 的 `performanceScore`。  
- `<60` 连续一周 → `maxWeight` 降 30%；连续两周 → 再降至 40% 原值。  
- 指标恢复至 ≥70 两周后权重才回升。  
- 治理可通过提案覆盖自动结果（应急）。

### 4.3 Nitro 外部激励
- 外部项目发起 `NitroPool.propose()`，须 ve 投票通过。  
- 通过后激励资产锁 4 周，仅发给最近两周对该 Gauge 投票或提供流动性的地址。  
- 提前结束需治理授权，未发完部分回流项目方或 Treasury（提案指定）。

---

## 5. 分发安全

1. **多签签名**：`RewardDistributor.submitRoot(newRoot, signatures)` 要求 3/5 多签对 EIP-712 消息签名。  
2. **冷静期**：root 进入 `pending` 状态 6 小时，任何 governor 可 `cancelPendingRoot()`；期满执行 `activateRoot()`。  
3. **回滚窗口**：旧 root 仍可 claim 24 小时，之后自动冻结。  
4. **distribution-service 流程**：
   - 生成 `merkle.json` + `root.json`（包含预算使用率、Utilization snapshot、未分配金额）。  
   - 自动构建 Safe TX 草稿并校验链上 Oracle 数值。  
   - 输出 `summary.txt`（地址数、总额、回流金额），附带签名状态。

---

## 6. 国库与资金循环

### 6.1 Treasury 收益回流

`Treasury.reportIncome(usdcGain)` 每月调用一次：
- 40% 注入 BoostStaking 作为额外奖励池；
- 40% 走 DEX/PSM 回购 PAIMON 并锁仓；
- 20% 记作运营储备。

### 6.2 Stability Pool 权重自适应

根据 `Treasury.usdcReserveRatio` 自动调整 LP 拆分：
- <40% → Stability Pool 权重升至 50%；
- 40%-55% → 维持 40%；
- >55% → 降至 30%。
守护进程定期调用 `syncReserves()`，治理可紧急覆盖。

### 6.3 数据透明

根目录新增 `tokenomics-stats.md`（每周自动生成）：
- 流通供给（含各档 vesting 未解锁量）；
- Utilization、回购量、Boost 池余额、未用预算；
- Gauge KPI 摘要、Nitro 状态；
- 国库资产表。

---

## 7. 指标与风控

| 指标 | 目标/阈值 | 触发动作 |
|------|-----------|----------|
| Vault Utilization | 70%-90% | 低于 60% 连续两周 → 治理复盘债务激励；高于 95% → 临时上调 Stability Pool 权重 |
| 未用预算回流率 | <10%/季度 | 超标则审查各 sink 领取流程 |
| Loyal 档占比 | 20%-35% | 低于 15% → 提案讨论是否调整系数 |
| Gauge performanceScore | ≥70 | 连续低分自动限重，治理可 override |
| Root 冷静期事故 | 0 | 有取消记录需在治理周报说明 |

主要风险与缓解：

| 风险 | 说明 | 缓解 |
|------|------|-------|
| Oracle 数据操纵 | Keeper 恶意或数据延迟 | 多源校验、阈值限幅、治理紧急暂停 |
| 档位套利 | 快速切换档位套取差价 | 周限、奖励折扣/加成固化、数据监控 |
| 守护进程失效 | KPI、Utilization 不更新 | 备用守护 + 手动 override + 告警 |
| 多签拥堵 | Root 激活拖延 | 冷静期提前排班，必要时提案缩短时间 |
| 国库回购冲击价格 | AMM 深度不足 | TWAP/分批执行、滑点上限 |

---

## 8. 实施路线

| 阶段 | 范围 | 里程碑 | 预计周期 |
|------|------|--------|----------|
| Phase 1 | 排放联动 + 分发安全 | EmissionManager/Router 升级、UtilizationOracle、RewardDistributor 多签版上线（shadow run） | 2 周 |
| Phase 2 | Vesting & Boost | esPaimon 多档、Boost 改造、UI 更新、旧 schedule 迁移 | 3 周 |
| Phase 3 | 治理模块 | ve 冷却、Gauge KPI、Nitro 审批、指标面板 | 2 周 |
| Phase 4 | 资金循环 | Treasury reportIncome、动态权重、`tokenomics-stats.md` 自动化 | 2 周 |

各阶段需完成：
- 合约开发 + Foundry 测试 + 审计补丁；
- 守护进程/脚本部署；
- 前端与 ops 更新；
- 治理提案（veDAO → Timelock）。

---

## 9. 待确认事项

1. Utilization 调节系数与阈值是否需要更多分段？  
2. Loyal 档 1.2× 是否设定硬性上限，或与 DAO 指标挂钩？  
3. KPI 具体指标集合（TVL、Vol、Oracle、滑点）及权重。  
4. Treasury 收益 40/40/20 拆分是否需根据季度表现动态调整。  
5. `tokenomics-stats.md` 的生成频率（建议每周一 00:00 UTC）。

---

这一方案定义了 Paimon.dex 在主网运营期间的全部代币逻辑。后续若需调整，应以本白皮书为基础提出 RFC，再进入治理流程。
