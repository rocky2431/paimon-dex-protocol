# Paimon 系统全面审查与优化建议（遵循 USDP × Camelot × Lybra 白皮书）

本文档为一次性、端到端的系统诊断与改进方案输出。所有建议严格对齐《USDP × Camelot × Lybra — 系统与工程实现白皮书（全面版）》作为最高指导原则，并与 PRD 保持一致。

----------------------------------------

## 1. 文档基线与范围
- 最高指导：`.ultra/docs/usdp-camelot-lybra-system-guide.md`
- PRD：`.ultra/docs/prd.md`
- 代码范围：
  - 稳定币栈：`paimon-rwa-contracts/src/core/{USDP.sol, PSM.sol, USDPVault.sol, USDPStabilityPool.sol}`
  - 排放治理：`paimon-rwa-contracts/src/governance/EmissionManager.sol`
  - 预言机：`paimon-rwa-contracts/src/oracle/RWAPriceOracle.sol`
  - 国库与利率：`paimon-rwa-contracts/src/treasury/SavingRate.sol`
  - 前端链上配置：`nft-paimon-frontend/src/config/chains/{mainnet.ts,testnet.ts}`

方法：逐项对照白皮书关键条款（组件职责、排放规则、不变量与安全），结合 PRD 场景约束（BSC 部署、ve 投票、RWA 债务挖矿），输出“问题→方案→收益→优先级”的原子化建议，并给出实施路线图与验收标准。

----------------------------------------

## 2. 关键系统要点（白皮书摘录与映射）
- §3.1 USDP：18 位、份额会计（shares × accrualIndex / 1e18）；默认 `accrualPaused=true`；铸造/销毁仅授权主体。
- §3.2 PSM：USDC(6) ↔ USDP(18) 精确换算 `SCALE=10^(18-6)=1e12`；仅锚定 1:1 与费用；储备只入不出（赎回除外）。
- §5 排放：三阶段（12w 固定 → 236w 指数衰减 r=0.985 → 104w 固定）；通道比例随阶段切换（Debt/LP/Eco）；LP 二级分流（pairs vs stability）；周级守恒与舍入归集。
- §9 不变量与安全：Peg 缓冲、会计守恒、治理权限、统一小数换算、Reentrancy 保护。

----------------------------------------

## 3. 系统诊断（Architecture/Code/Sec/Perf/Scale）
- 架构映射：链上组件与白皮书拓扑一致（USDP/PSM/Vault/StabilityPool/EmissionManager/Boost & Rewards）；数据流与职责边界清晰。
- 代码质量：
  - USDP 份额会计与暂停分红符合 §3.1；EIP-2612 支持完善；nonReentrant 覆盖主要变更路径。
  - 但存在“演示实现”的临时性：Emission Phase-B 线性近似、PSM 精度硬编码、Vault 多抵押简化、StabilityPool 奖励入口未授权。
- 安全与合规：
  - 资金/会计：StabilityPool 清算“由清算人烧毁 USDP + 池侧减账”导致账实错配风险。
  - 经济学：Emission 参数与比例偏差较大，通胀与激励错配风险高。
  - 预言机：强制 L2 Sequencer 检查不适配 BSC，潜在可用性问题。
- 性能：未发现明显 gas 热点；Phase-B 建议查表/库实现指数以避免运行时复杂度与误差。
- 可扩展性：Vault 尚未实现真实多抵押权重；Emission 缺少尘差守恒；前端/合约小数一致性需运行时校验。

----------------------------------------

## 4. 原子化改进建议（严格对齐白皮书）

以下每条建议均包含：问题描述（附代码/文档引用）、优化方案（技术路径）、预期收益（量化/确定性）、优先级（P0-P3）。

### 4.1 PSM 小数精度自适应与一致性断言（P0）
- 问题（白皮书 §3.1/§3.2/§9）
  - 合约将 USDC↔USDP 换算写死为 `1e12`（`paimon-rwa-contracts/src/core/PSM.sol:111,141`），假设 USDC=6；
    前端主网配置为 USDC=18（`nft-paimon-frontend/src/config/chains/mainnet.ts:85`），测试网为 6（`testnet.ts:95`），跨网不一致。
- 方案
  - 构造期读取 `IERC20Metadata.decimals()` 动态计算 `SCALE = 10**(usdpDecimals - usdcDecimals)`，替换硬编码 `1e12`；
  - 若按白皮书强约束“统一 1e12”，可在构造期断言 `USDC.decimals()==6`（部署策略二选一）。
  - 事件/费用计算移除 `unchecked` 连乘，使用安全 `mulDiv` 等策略统一单位。
  - 前端仅展示真实 `decimals()`，不做重复换算；启动时断言与合约 `SCALE` 一致。
- 收益
  - 避免 10^(18-6)=1e12 倍错算（资金安全 100%）；跨网一致性保障。
- 优先级：P0

### 4.2 EmissionManager 三阶段参数与通道比例对齐（P0）
- 问题（白皮书 §5.1/§5.2/§5.3）
  - 常量周额错误：64.08M/7.39M（`EmissionManager.sol:56,61`）应为 37.5M/4.326923M；
  - 通道比例固定为 10/70/20（`76-82`），未按阶段切换（30/60/10、50/37.5/12.5、55/35/10）；
  - Phase-B 采用线性插值（`199-202`），未按 r=0.985 指数衰减。
- 方案
  - 修正 `PHASE_A_WEEKLY/PHASE_C_WEEKLY` 为白皮书原值；
  - 新增 `getChannelAllocation(week)` 返回阶段性 BPS；LP 二级分流保留治理；
  - Phase-B 使用 `pow(0.985, t)`（ABDKMath64x64 或预计算 236 周数组）；
  - 增加尘差归集：Σ通道 = 预算 E(w)。
- 收益
  - 发行总量回归 ~10B（避免 ~+70% 超发）；债务挖矿预算在 Phase-B/C 提升至 50-55%，USDP 扩张能力 +30%-60%。
- 优先级：P0

### 4.3 稳定池清算资金流对齐（由池销毁 USDP，非清算人）（P0）
- 问题（白皮书 §3.5）
  - Vault 从清算人 `burnFrom`（`USDPVault.sol:227`）且 Pool 同时 `-_totalDeposits`（`USDPStabilityPool.sol:203`），账实错配。
- 方案
  - Vault 改为 `usdp.burnFrom(address(pool), debtAmount)`（Vault 为 USDP 授权 minter），或暴露 `pool.offsetDebt(amount)` 内部执行 `burnFrom`；
  - 保持抵押品分配按份额派发。
- 收益
  - 清算会计一致性 100%，杜绝“幽灵余额”与提现异常。
- 优先级：P0

### 4.4 Phase-B 指数衰减实现回归 0.985（P1）
- 问题
  - 线性插值偏离白皮书曲线，累计误差大。
- 方案
  - 使用 `pow(0.985, t)`（库或预表）替换线性近似，保证确定性与精确度。
- 收益
  - 排放曲线误差→0，经济学符合度 100%。
- 优先级：P1

### 4.5 排放舍入守恒与尘差归集（P1）
- 问题
  - 目前未处理舍入残差，Σ通道可能小于预算。
- 方案
  - 计算 `dust = total - (debt+lpPairs+stability+eco)`，将 dust 归入指定通道（默认 Eco）+ 事件记录。
- 收益
  - 周级守恒 100%，可审计可对账。
- 优先级：P1

### 4.6 StabilityPool 奖励分发入口授权与余额证明（P1）
- 问题
  - `notifyRewardAmount` 任何人可调且未校验余额（`USDPStabilityPool.sol:302`），存在 DoS/错配风险。
- 方案
  - 仅允许 `RewardDistributor` 调用；分发前/后校验本合约 `balanceOf(rewardToken)` 足额，否则 revert。
- 收益
  - 消除奖励分发被外部扰动风险（100%）。
- 优先级：P1

### 4.7 Oracle Sequencer 检查适配 BSC（P1）
- 问题
  - 强制 L2 Sequencer 检查（`RWAPriceOracle.sol:195`）不适配 BSC，可能导致不可用。
- 方案
  - 增加开关/零地址跳过序列器检查；或网络类型检测禁用。
- 收益
  - 生产可用性 100%。
- 优先级：P1

### 4.8 Vault 多抵押正确估值与阈值（P1）
- 问题
  - 以第一个抵押品近似估值与阈值（`USDPVault.sol:235,321`），不支持真实多抵押。
- 方案
  - 短期：当抵押 >1 时直接 revert + 明确文档约束；长期：为每种抵押维护价格与阈值，计算加权 HF 与逐抵押清算。
- 收益
  - 短期防错（100%），长期支持扩展。
- 优先级：P1

### 4.9 PSM 费用事件乘法溢出边际（P2）
- 问题
  - 事件费计算使用 `unchecked` 连乘（`PSM.sol:123`），极端大数存在边界风险。
- 方案
  - 使用 `mulDiv` 或移除 `unchecked` 并优化乘除顺序，统一单位精度。
- 收益
  - 安全边界提升，审计通过率更高。
- 优先级：P2

### 4.10 SavingRate 资金覆盖断言与低水位告警（P2）
- 问题
  - `fund` 仅记账，`claimInterest` 缺少“资金覆盖率”断言，资金不足时风险较高（`SavingRate.sol:170-209`）。
- 方案
  - 增加 `available >= interest` 断言；低水位事件（`TreasuryFundingLow`）与可选 `pauseAccrual`。
- 收益
  - 运维可观测与资金安全性提升。
- 优先级：P2

### 4.11 USDP 紧急机制改造为 Pausable（P2）
- 问题
  - `emergencyPause()` 直接 `renounceOwnership`（`USDP.sol:538-543`），不可逆风险高。
- 方案
  - 引入 `Pausable` 控制积累/转账开关；所有权交 Timelock 多签，保留恢复能力。
- 收益
  - 运维安全与可恢复性提升。
- 优先级：P2

### 4.12 前端跨网小数一致性运行时校验（P2）
- 问题
  - 主网 USDC=18（`mainnet.ts:85`）、测试网 USDC=6（`testnet.ts:95`），历史上 PSM 假设可能不一致。
- 方案
  - 启动时从链上读取 `decimals()` 与 PSM `SCALE`，断言一致；UI 显示仅基于链上返回值；E2E 覆盖两网络。
- 收益
  - 端到端一致性保障。
- 优先级：P2

### 4.13 Emission 352 周 JSON 对账与单测增强（P2）
- 问题
  - 线性近似与常量误差导致对账困难。
- 方案
  - 生成 352 周 JSON（离线脚本）并作为基准；用例覆盖阶段切换/尘差归集/LP 二级分流。
- 收益
  - 回归与审计效率提升。
- 优先级：P2

### 4.14 StabilityPool 误转资产回收口（P3）
- 问题
  - 误转非 USDP 资产可能卡死。
- 方案
  - 增加 `recoverERC20(token)`（排除 USDP）。
- 收益
  - 运维风险降低。
- 优先级：P3

### 4.15 观测性与不变量事件（P3）
- 问题
  - 关键不变量缺少事件与指标。
- 方案
  - 增加 `WeekBudgetCalculated/EmissionRemainderApplied/PSMReserveUpdated` 等事件，导出到监控。
- 收益
  - 可观测性增强，审计取证更便捷。
- 优先级：P3

----------------------------------------

## 5. 实施路线图与里程碑

### 里程碑 A（P0，优先本周内）
- 交付：
  - PSM 小数自适应与/或构造期断言；
  - Emission 三项修正（周额/比例/指数 r=0.985）；
  - 稳定池清算由池端销毁 USDP；
  - 352 周对账 JSON 与核心单测。
- 验收：
  - PSM USDC↔USDP 双向 1:1（含费）金额正确性；
  - `getWeeklyBudget(w)` 与 JSON 完全一致；Σ通道=预算；
  - 清算 e2e：Σ存款-抵债=池内实际 USDP（账实一致）。

### 里程碑 B（P1，+1 周）
- 交付：
  - 奖励分发入口授权 + 余额证明；
  - Oracle 序列器检查开关；
  - Vault 多抵押短期保护（>1 直接 revert）；
  - 排放舍入守恒落地。

### 里程碑 C（P2-P3，+1~2 周）
- 交付：
  - PSM 事件安全乘法、SavingRate 覆盖断言与告警；
  - USDP Pausable 改造；
  - 前端运行时小数断言、误转回收口、观测性事件与仪表盘。

----------------------------------------

## 6. 验收与测试大纲
- 单元测试：
  - PSM：USDC→USDP/USDP→USDC 金额、事件费、储备约束（`getUSDCReserve`）。
  - EmissionManager：w∈{1,12,13,100,248,249,352} 精确断言；Σ通道守恒；LP 二级分流；尘差归集。
  - Vault/Pool：清算会计一致；按份额分配抵押品；多抵押保护。
- 集成测试：
  - RWA 抵押→借款→清算→稳定池收益领取；
  - 排放周切换与 Gauge 权重分配；
  - 前端 Swap 钩子调用 PSM 函数名正确性（`swapUSDCForUSDP/swapUSDPForUSDC`）。
- 端到端：
  - 主网（USDC=18）与测试网（USDC=6）小数一致性流程；
  - 监控事件采集与报警联动。

----------------------------------------

## 7. 变更风险与治理流程
- 风险：Emission 修正、PSM 精度改造、清算路径变更均涉及合约变更与迁移；需走多签/Timelock 与审计回归。
- 建议：
  - 在测试网复刻主网状态演练迁移；
  - 采用“开关/参数化”而非硬编码（保留灰度与回滚余地）；
  - 关键经济参数变更需设有冷静期与公告窗口。

----------------------------------------

## 8. 附录：快速参考（文件与行号）
- PSM 小数换算与事件：`paimon-rwa-contracts/src/core/PSM.sol:111,123,141`
- EmissionManager 参数与分配：`paimon-rwa-contracts/src/governance/EmissionManager.sol:56,61,76-82,119-139,199-202,227-236`
- 稳定池清算路径：`paimon-rwa-contracts/src/core/USDPVault.sol:214-233,227`；`paimon-rwa-contracts/src/core/USDPStabilityPool.sol:193-220,203`
- Oracle Sequencer 检查：`paimon-rwa-contracts/src/oracle/RWAPriceOracle.sol:195`
- SavingRate 资金记账：`paimon-rwa-contracts/src/treasury/SavingRate.sol:170-209`
- 前端 USDC 小数：`nft-paimon-frontend/src/config/chains/mainnet.ts:85`；`nft-paimon-frontend/src/config/chains/testnet.ts:95`

----------------------------------------

## 9. 总结
本方案以白皮书为最高准绳，优先闭环 P0 的资金安全与代币经济风险（PSM 小数、Emission 对齐、稳定池清算会计），并在 P1/P2/P3 分层完善可用性、可审计性与可扩展性。建议按里程碑推进并同步治理流程，确保变更的可控与可回滚。

