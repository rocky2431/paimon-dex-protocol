# 系统改进计划（对照 USDP × Camelot × Lybra 工程白皮书）

目的：全面比对当前代码与《usdp-camelot-lybra-system-guide.md（超详细版）》规范，输出“证据化现状 + 落地型改造方案”，覆盖：合约/前端/配置/工具链/测试/部署/回滚。仅工程实现，不含运营流程。

---

## A. 差异总览（当前实现 vs 规范）

说明：所有“现状”均附仓库证据（文件:行），所有“规范”均指向白皮书要求。

- USDP（src/core/USDP.sol）
  - 现状：支持 `accumulate(newIndex)`，由 `distributor` 调用；未见 `accrualPaused` 安全开关。
  - 规范：默认关闭指数分红（`accrualPaused=true`），或不设置 distributor；仅 SavingRate 承接收益。
- PSM（src/core/PSM.sol）
  - 现状：USDC↔USDP 1:1，feeIn/out 已实现，事件完整；OK。
  - 规范：保持当前实现，确保仅入不出（除赎回）。
- SavingRate（src/treasury/SavingRate.sol）
  - 现状：有计息、存取、claimInterest；无 `fund(uint256)` 注资记账入口（虽定义了 `TreasuryFunded` 事件）。
  - 规范：新增 `fund(amount)`（onlyOwner），严格走 USDC→PSM→USDP→fund 闭环。
- esPaimon（src/core/esPaimon.sol）
  - 现状：`vest/claim/earlyExit/getBoostWeight`，不可转；无 `vestFor(user, amount)`。
  - 规范：新增 `vestFor`，供分发器或国库进行“归属化发放”。
- RewardDistributor（src/governance/RewardDistributor.sol）
  - 现状：Merkle 分发 + Boost 乘数；直接 `IERC20(token).safeTransfer` 给用户；未接入 es 归属化发放分支。
  - 规范：引入 es 模式分支：`esPaimon.vestFor(user, actualReward)`；其余保持不变。
- GaugeController / BribeMarketplace / NitroPool / vePAIMON
  - 现状：均已存在（接口/实现文件存在），BoostStaking 也已存在并被 Distributor 使用。
  - 规范：保持结构；Gauge 支持只读（无需改动）；Nitro 独立外部奖励。
- USDPVault（缺失）
  - 现状：未提供独立的 Vault；Treasury.sol 内包含 RWA 相关逻辑，但非标准化抵押借款接口。
  - 规范：新增 `USDPVault`（抵押/借/还/清算/`debtOf`）。
- Stability Pool（缺失）
  - 现状：未实现。
  - 规范：新增 `USDPStabilityPool`（`deposit/withdraw/claim/onLiquidationProceeds` + 奖励权重），LP 通道内部二级配额。
- EmissionManager（缺失）
  - 现状：未实现。
  - 规范：新增，按三阶段逐周查表输出四通道预算（debt/lpPairs/stabilityPool/eco）；LP 二级分流支持治理调整。

- 前端（nft-paimon-frontend）
  - PSM Swap Hook 使用错误 ABI（单函数 `swap`），与合约真实接口不符（需 `swapUSDCForUSDP` / `swapUSDPForUSDC`）
    - 证据：`src/components/swap/hooks/usePSMSwap.ts:22`
  - Analytics 读取 `totalMintedHYD`（过时）
    - 证据：`src/components/analytics/hooks/useAnalytics.ts:27,116-118`
  - 已有 hooks：BoostStaking / SavingRate / esPaimon / Nitro / vePaimon；缺少 Vault / StabilityPool / Distributor 领取 / Emission 可视化
    - 证据：`src/hooks/*` 搜索；无 `useVault` / `useStabilityPool` / `useDistributorClaim`

---

## B. 改造任务清单（分阶段 + 交付清单）

### P0（基础安全与归属化）
1) USDP.sol（安全开关）
- 新增：`bool public accrualPaused = true;`
- 在 `accumulate` 前加：`require(!accrualPaused, "USDP: Accrual paused");`
- 新增：`setAccrualPaused(bool)`（onlyOwner）
- 若已配置 `distributor`，迁移时先置 `accrualPaused=true`。
  交付：代码变更，单测 `accumulate()` 关停；文档注记。

2) SavingRate.sol（注资闭环）
- 新增：`function fund(uint256 amount) external onlyOwner`（仅事件与记账，假设 USDP 先转入）。
- 事件：`TreasuryFunded(funder, amount)` 在 fund 内触发。
  交付：代码变更 + 单测 + 前端“系统注资”标识位（只读）。

3) esPaimon.sol（归属化发放）
- 新增：`vestFor(address user, uint256 amount)`（onlyDistributor/onlyOwner 或仅 Distributor/Treasury）。
- 逻辑：从调用方拉取 PAIMON 或记账来源、合并到用户的归属仓位；沿用 365d 线性与早退罚则。
  交付：代码变更 + 单测（vestFor/claim/earlyExit）+ 前端 Convert 页面调用 `claim`。

4) RewardDistributor.sol（es 分支）
- 新增只读：`esPaimon` 地址。
- `claim()`：验证 Merkle → 计算 `actual = base × boost / 10000` → 若当前 token = es 模式（或 by config），调用 `esPaimon.vestFor(user, actual)`；否则 `IERC20(token).safeTransfer`。
- 兼容现有 BoostStaking。
  交付：代码变更 + 单测（双分支；乘数叠加）；前端领取页新增“归属化”标记。

验收标准（P0）
- USDP `accumulate` 在 `accrualPaused=true` 时拒绝；
- SavingRate `fund` 可写入事件与内部计数（如需）；
- esPaimon `vestFor` 可被 Distributor 正常调用；
- Distributor 可选择 es 归属化分发路径，Boost 乘数正常生效。

### P1（核心债务与预算）
5) USDPVault（新增：抵押/借/还/清算/`debtOf`）
- 接口：`deposit/withdraw/borrow/repay/liquidate/debtOf`（18 decimals）
- 风控：LTV 分层、115% 清算阈、5% 罚金（4% 清算人/1% 协议）；
- 预言机：双源（Chainlink + NAV）与冷却/断路器；
- 事件：`Borrow/Repay/DebtUpdated/Liquidated`；
- USDP：`setAuthorizedMinter(vault, true)`。
  交付：合约 + 单测 + 前端 Borrow/Repay 页面 + hooks（`useVault`）。

6) EmissionManager（新增：逐周预算 + LP 二级分流）
- 三阶段逐周查表：Phase-A 固额，Phase-B 指数衰减（存储数组 E_B[236]），Phase-C 固额；
- 输出四通道：`getWeeklyBudget(w) → (debt, lpPairs, stabilityPool, eco)`；
- LP 内部分流：治理参数 `{lpPairsBps, stabilityPoolBps}`，Timelock 控制；
- 事件（可选）：`WeekBudgetEmitted`。
  交付：合约 + 单测；前端“Emission 可视化”页；后端/脚本生成 352 周 JSON 以对账。

7) 分发整合（Aggregator/后端服务）
- 离线快照：
  - 债务：`TWAD(debtOf(user))`；
  - LP：ve 投票池级权重 + 池内 LP 份额×时间；
  - 稳定池：`TWAD(userShares)`；
- 生成 Merkle（token/epoch/amount），配置 Distributor `setMerkleRoot`。
  交付：脚本/服务仓；输出 CSV/JSON（快照、权重、奖励清单）；校验与回归工具。

验收标准（P1）
- USDPVault 可抵押/借/还/清算，事件与 `debtOf` 正确；
- EmissionManager 可按周返回预算；
- Distributor 与快照工具联通，能按周分配到三通道（含 LP 二级分流）。

### P2（稳定池闭环与指标）
8) USDPStabilityPool（新增：稳池沉淀 + 清算承接）
- 存取：`deposit(usdp)/withdraw(shares)`；
- 奖励：`claim()`（按 shares×时间）；
- 清算承接：`onLiquidationProceeds(asset, amount)`；
- 与 Vault：清算路径回调稳定池；
- 与 Distributor：作为 LP 通道内部的一类 Gauge 参与权重分配（或依赖 Aggregator 的权重输入）。
  交付：合约 + 单测 + 前端稳定池页面 + hooks（`useStabilityPool`）。

验收标准（P2）
- 清算发生时稳定池按份额承接标的或 USDC 并可领取；
- 稳定池参与 LP 通道内的预算分配；
- 指标：稳定池 TVL、份额、近 7 天清算承接额。

---

## C. 接口与状态变更摘要（含前端配置）

- USDP.sol
  - `bool accrualPaused;` + `setAccrualPaused(bool)`
- SavingRate.sol
  - `fund(uint256 amount) external onlyOwner`
- esPaimon.sol
  - `vestFor(address user, uint256 amount) external`（限 Distributor/Treasury）
- RewardDistributor.sol
  - 新增 `address esPaimon;` 与 es 分支
- USDPVault（新增）
  - `deposit/withdraw/borrow/repay/liquidate/debtOf`，事件 4 个
- USDPStabilityPool（新增）
  - `deposit/withdraw/claim/onLiquidationProceeds`，事件 4 个
- EmissionManager（新增）
  - `getWeeklyBudget(uint256 w)` 返回四通道；LP 分流参数存储与治理更新

- 前端配置与 ABI
  - 统一导出 ABI 与地址：`src/config/contracts/*`，`src/config/chains/testnet.ts` 增加 `usdpVault`、`stabilityPool`、`emissionManager` 地址；
  - 修正 PSM Swap Hook 使用的 ABI 与函数；修正 Analytics 指标数据源；
  - 新增 hooks：`useVault`、`useStabilityPool`、`useDistributorClaim`、`useEmissionBudget`。

---

## D. 权限与治理（Timelock/多签）
- 受控角色：
  - USDP Owner：`setAccrualPaused`、`setAuthorizedMinter`；
  - SavingRate Owner：`fund`；
  - esPaimon Owner：可设置 Distributor/Treasury；
  - RewardDistributor Owner：`setMerkleRoot`；
  - EmissionManager Owner：LP 分流参数；
  - Vault/稳定池 Owner：白名单/LTV/参数。
- 所有敏感参数变更走 Timelock。

---

## E. 测试与验收（细颗粒 Case）
- 单测
  - USDP：accumulate 关停；授权 minter；会计不变量。
  - PSM：USDC↔USDP 精度、fee、储备不变量；
  - SavingRate：fund 注资记账、存取/计息。
  - esPaimon：vest/vestFor/claim/earlyExit。
  - Distributor：Merkle 校验、Boost、es 分支 vestFor。
  - Vault：抵押/借/还/清算、`debtOf`、Oracle 冷却/断路器。
  - 稳定池：存取/奖励/清算承接。
  - EmissionManager：逐周预算、LP 内部分流、阶段末补差守恒。
- 集成
  - Borrow→Earn 流程（Launchpad→Vault→Distributor）；
  - LP→Earn（USDP/USDC & 稳定池）；
  - PSM→SavingRate 注资闭环；
  - 每周分发（快照→Merkle→领取）。

端到端“周度分发”验收（DoD）：
- 给定 w，EmissionManager 返回四通道预算；
- Aggregator 生成 Merkle；Distributor.setMerkleRoot 成功；
- 用户可成功 claim（es 分支→vestFor 生效），Boost 按预期放大；
- 守恒校验：Σ用户领取 ≤ 当周预算（同一 claim 冪等）；
- 阶段末 rem 注入后，阶段累计 == 阶段预算。

---

## F. 里程碑与时间线（建议；含关键风险）
- P0（1–2 周）：USDP accrualPaused、SavingRate.fund、esPaimon.vestFor、Distributor es 分支 → 烟测与单测。
- P1（3–5 周）：USDPVault、EmissionManager、离线快照与周分发联通 → 债务挖矿上线。
- P2（3–5 周）：USDPStabilityPool、清算承接与 LP 二级分流 → 稳定池上线。
风险与应对：
- 清算时价格剧烈波动：稳定池先承接 USDC 等价再发放，避免多资产复杂折算；
- 预言机异常：断路器与冷却期，fallback 到 NAV；
- 分发数据异常：Merkle 校验工具与回滚 root；
- 参数误设：所有参数均走 Timelock 与小流量灰度（先测试网再主网低预算）。

---

## G. 附录：需要生成/补充的工件
- 352 周排放计划（四通道）JSON：`/.ultra/docs/emission-schedule.json`（单位 wei，阶段末补差后最终值）。
- 合约草案：`USDPVault.sol`、`USDPStabilityPool.sol`、`EmissionManager.sol` 的接口与最小实现；
- RewardDistributor 与 esPaimon 的增量补丁；SavingRate 的 `fund()` 补丁。
 - 前端：`useVault`、`useStabilityPool`、`useDistributorClaim`、`useEmissionBudget` hooks；PSM Swap/Analytics 修复；
 - DevOps：每周快照→Merkle CI 任务；352 周 JSON（预算对账）。
