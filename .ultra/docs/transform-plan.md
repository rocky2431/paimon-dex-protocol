# Paimon 项目改造方案计划（2025-11-01 修订版）

> **⚠️ 重要更新**：本文档已基于深度研究报告修订，修正了 3 个严重遗漏、1 个重大偏差，时间估算增加 56%。
>
> **修订依据**：`.ultra/docs/研究报告-改造计划准确性评估-2025-11-01.md`
> **核心变更**：
> - ✅ 确认手续费分配：**70/30**（最终确认）
> - ✅ 新增 Boost 质押机制（esPaimon → 2-2.5x 收益倍数）
> - ✅ 新增 Nitro 激励插件（外部项目方激励池）
> - ✅ 完善 USDP 储蓄率机制（RWA 收益分配）
> - ✅ 时间估算：15-23天 → 27-39天（含缓冲 32-47天）
> - ❌ **发现 PSM 合约严重错误**：当前实现为 USDC↔HYD，应为 USDC↔USDP（需重构）

## 1. 背景与目标

- **背景**：当前合约与前端以 HYD 合成资产 + veHYD 治理为核心（Foundry + Next.js 14），文档已更新为 USDP 稳定币 + Paimon/esPaimon/vePaimon + ve33 DEX + Launchpad 的新体系。
- **目标**：在保留现有工程资产（DEX、治理、Launchpad、Presale、Oracle、PSM、前端框架）的前提下，完成从 HYD → USDP、从 veHYD → vePaimon 的架构升级，并引入 **esPaimon 线性释放+Boost**、**Bribe 激励**、**USDP accrualIndex 分红**、**Nitro 外部激励池**，达成可部署、可测试、可迭代的落地实现。

## 2. 现状扫描（2025-11-01）

- 仓库结构：
  - 合约：`paimon-rwa-contracts`（Foundry）
    - 核心：`core/HYD.sol`、`core/PAIMON.sol`、`core/PSM.sol`、`core/VotingEscrow.sol`
    - 治理：`governance/GaugeController.sol`、`governance/RewardDistributor.sol`、`governance/BribeMarketplace.sol`
    - 金库：`treasury/Treasury.sol`
    - DEX：`dex/DEXFactory.sol`、`dex/DEXPair.sol`、`dex/DEXRouter.sol`
    - Launchpad/Presale/Oracle：均已具备
    - 测试：单测、集成、invariant 较完整（含 DEX/PSM/Gauge/Launchpad 等）
  - 前端：`nft-paimon-frontend`（Next.js 14 App Router）
    - 技术栈：TypeScript + wagmi v2 + viem + RainbowKit + MUI + TanStack Query + next-intl
    - 页面：`app/` 下含 `swap/liquidity/lock/vote/launchpad/presale/treasury/bribes/rewards` 等模块

## 3. 目标架构（与 PRD/Tech 文档对齐）

- **稳定币**：`USDP`，与美元 1:1，支持 `accrualIndex` 逐日分红（来源：PSM 资金收益、RWA 收益）+ **储蓄率机制**（RWA 年化 5% → 分配 2% 给 USDP 持有者）
- **代币体系**：
  - `Paimon`（治理/价值分配）
  - `esPaimon`（激励/365天线性释放，每周衰减1-2%，提前退出罚则，**可质押获得 Boost 2-2.5x**）
  - `vePaimon`（Paimon 锁仓 1周~2年，线性衰减权重）
- **治理与激励**：
  - `GaugeController` + `BribeMarketplace`（bribe 接受 esPaimon 等）
  - 投票决定 DEX 与排放权重
  - **Nitro 插件**：外部项目方可设置额外激励池（锁定期限、最低流动性要求）
- **DEX**：ve33 模式，费率 0.25%，**✅ 最终确认：70% 给投票者、30% 入国库**
- **Boost 机制**：质押 esPaimon → 流动性挖矿收益提升 2-2.5 倍
- **Oracle**：双源（Chainlink + 托管 NAV），>20% 偏离触发断路
- **安全**：多签+Timelock、应急暂停、不可升级、ReentrancyGuard、SafeERC20

## 4. 差距分析（Delta）- 修订版

### 4.1 核心代币差距
- **Token/稳定币**：
  - 现状：`HYD` 为合成资产且参与锁仓（veHYD）
  - 目标：引入 `USDP` 稳定币（带 `accrualIndex` + **储蓄率合约**），治理锁仓迁移至 `Paimon`（vePaimon）
  - **新增需求**：`SavingRate.sol` 合约用于 USDP 存款生息

### 4.2 治理锁仓差距
- **治理锁仓**：
  - 现状：`VotingEscrow` 绑定 `HYD`（veHYD），锁仓期 1周~4年
  - 目标：新增/改造为 `VotingEscrowPaimon`（vePaimon），**锁仓期修正为 1周~2年**

### 4.3 激励代币差距（🔴 原计划遗漏 Boost 机制）
- **激励代币**：
  - 现状：无 `esPaimon` 合约
  - 目标：新增 `esPaimon`（365天线性释放 + 提前退出罚则 + 可用于 bribe + **可质押获得 Boost**）
  - **新增需求**：`BoostStaking.sol` 合约用于 esPaimon 质押和 Boost 倍数计算

### 4.4 外部激励差距（🔴 原计划完全遗漏）
- **Nitro 插件**：
  - 现状：无 Nitro 功能
  - 目标：新增 `NitroPool.sol`，允许外部项目方设置额外激励池
  - **业务价值**：LP 收益 = Paimon 排放 + Nitro 外部奖励 + 无常损益

### 4.5 手续费分配（✅ 最终确认）
- **DEX 手续费**：
  - 现状：`DEXPair.sol` 已实现 70% voters + 30% treasury
  - **最终确认**：保持 **70% voters + 30% treasury**（符合最终决策）
  - **实现方式**：动态计算（避免固定常量的精度问题）

### 4.6 金库/PSM差距

**❌ 发现 PSM 合约严重错误**：

- **金库/PSM**：
  - 现状：`PSM`/`Treasury` 流程围绕 HYD
  - 目标：切换为 USDP 铸造/赎回与 PSM 1:1（USDC↔USDP）路径

- **当前 PSM 合约实现错误** (`src/core/PSM.sol`)：
  - ❌ 错误：实现的是 `USDC ↔ HYD` 兑换
  - ❌ 错误：接口使用 `IHYD`，函数名为 `swapUSDCForHYD` / `swapHYDForUSDC`
  - ❌ 错误：目的是维持 HYD 锚定（与协议架构冲突）

- **正确实现应为**：
  - ✅ 应该：`USDC ↔ USDP` 1:1 兑换（维持 USDP $1 锚定）
  - ✅ 应该：接口使用 `IUSDP`，函数名为 `swapUSDCForUSDP` / `swapUSDPForUSDC`
  - ✅ 应该：通过套利机制自动维持 USDP 价格稳定

- **影响评估**：
  - 🔴 合约需要完全重构（不是简单修改）
  - 🔴 测试用例需要全部重写（`test/core/PSM.t.sol`）
  - 🔴 部署脚本需要更新（Phase 1, Step 4）
  - 🔴 前端 PSM 交互需要修改（如果已实现）

- **重构要点**：
  - 移除 `maxMintedHYD` 和 `totalMinted` 追踪（USDP 供应由 USDC 储备自然限制）
  - 保持 1:1 兑换逻辑（6 decimals USDC ↔ 18 decimals USDP，使用 1e12 转换）
  - 保持费用机制（`feeIn` / `feeOut`，初始为 0）

- **详细规格**：见 `transform-plan-revised.md` §2.1.6 PSM 重构规格

### 4.7 前端差距（🔴 原计划遗漏 3 个展示模块）
- **前端**：
  - 现状：UI/流程基于 HYD/veHYD
  - 目标：替换为 USDP + Paimon/esPaimon/vePaimon 的文案、流程和交互
  - **新增需求**：
    1. Boost 倍数展示（质押 esPaimon → 显示 2-2.5x 倍数 → 预计收益提升）
    2. Nitro 池列表（外部项目池 → APR → 参与入口）
    3. 储蓄率视图（USDP 存入 → 实时 APR → 累计利息曲线）

## 5. 改造路径与里程碑（分阶段可回滚）

### Phase 0：准备与冻结（2-3 天，原 1-2 天）
- 冻结主分支的部署操作，仅接受文档/脚手架 PR
- **✅ 经济模型最终确认**（已完成）：
  - ✅ 手续费分配：**70/30**（70% 给投票者、30% 入国库）
  - ✅ vePaimon 转让性：**可转让**（NFT 支持 transfer）
  - ✅ esPaimon 衰减率：**每周 1%**（仅影响 Boost 权重）
- **🆕 前端性能基线测量**：使用 chrome-devtools MCP 测量当前 Core Web Vitals
- 建立分支 `feat/usdp-vepaimon-full` 进行改造
- 统一术语与常量：USDP、Paimon、esPaimon、vePaimon、fee 0.25%、**70/30 分配**（最终确认）

### Phase 1：合约基础重构（9-13 天，原 5-8 天）

#### 1.1 核心代币合约（4-5 天）
- **新增 `USDP.sol`**：
  - 字段：`accrualIndex`（1e18 精度）、`lastAccrualTime`、`distributor`
  - 逻辑：`rebase/accumulate()` 更新索引（**明确每日更新频率**）；`balanceOf` 采用"份额-索引"模式避免精度损失
  - 接口：`mint/redeem` 由 `Treasury/PSM` 调用；`permit`（EIP-2612）
  - **参数配置**：`ACCRUAL_INTERVAL = 1 days`

- **新增 `esPaimon.sol`**：
  - 线性释放参数：总周期 365 天、**每周衰减率 1-2%**（待确认）
  - **明确罚则公式**：`penalty = vestedAmount × (100 - progress) / 100`（例如 50% 时间退出损失 50%）
  - 事件：`Vested`, `EarlyExit`, `WeeklyEmissionUpdated`
  - 与 `RewardDistributor/BribeMarketplace` 兼容

- **新增 `VotingEscrowPaimon.sol`**：
  - 绑定 `PAIMON`，**锁仓 1 周~2 年**（修正，非 4 年）
  - 线性衰减权重：`power = amount × (lockEnd - now) / MAXTIME`
  - 与 `GaugeController` 保持接口兼容（投票权查询、快照周期 7 天）
  - **待确认**：NFT 是否可转让？（文档冲突）

#### 1.2 新增激励合约（🔴 原计划遗漏，3-4 天）
- **🆕 `BoostStaking.sol`**（P0 - 核心功能）：
  - 功能：质押 esPaimon 获得 Boost 权重
  - 计算公式：`actualReward = baseReward × min((1 + boostWeight), 2.5x)`
  - 最低质押时长：7 天（防止闪电贷攻击）
  - 事件：`Staked`, `Unstaked`, `BoostApplied`

- **🆕 `NitroPool.sol`**（P0 - 核心功能）：
  - 功能：外部项目方创建额外激励池
  - 配置参数：锁定期限、最低流动性要求、奖励代币白名单
  - 需 vePaimon 投票批准
  - 事件：`NitroCreated`, `NitroEntered`, `NitroRewardClaimed`

- **🆕 `SavingRate.sol`**（P1 - 重要功能）：
  - 功能：USDP 存款生息
  - 利率来源：RWA 收益提成（如年化 5% → 分配 2%）
  - 更新频率：每日或实时累积
  - 事件：`Deposited`, `Withdrawn`, `InterestAccrued`

#### 1.3 改造现有合约（2-3 天）
- **改造 `Treasury.sol` / `PSM.sol`**：
  - HYD → USDP 铸造/赎回
  - PSM 对接 `USDC↔USDP` 1:1
  - 保持 DEX 与 Gauge 的独立性（SRP）

- **✅ 优化 `DEXPair.sol`**（P1 - 代码质量优化）：
  - **保持手续费分配 70/30**（最终确认）
  - **改为动态计算**：`voterShare = (fee * 7) / 10; treasuryShare = fee - voterShare`
  - 删除固定常量 VOTER_FEE/TREASURY_FEE（遵循 DRY 原则）

- **改造 `RewardDistributor.sol`**：
  - 集成 Boost 倍数计算
  - 支持多资产奖励（esPaimon/USDC/USDP）

#### 1.4 不变量与安全（1-2 天）
- 更新 invariant 测试：
  - PSM backing: `USDC balance >= USDP supply`
  - USDP 供应充足: `sum(user_shares) == total_supply`
  - Boost 上限: `actualReward <= baseReward × 2.5`
  - 手续费分配: `voterFees + treasuryFees == totalFees`

### Phase 2：治理与激励对齐（5-7 天，原 3-5 天）

#### 2.1 治理模块对齐（2-3 天）
- **`GaugeController`**：
  - 确认 epoch 对齐（7 天周期）
  - 快照机制与 vePaimon 权重查询集成
  - 支持 Launchpad 提案投票（非流动性池投票）

- **`BribeMarketplace`**：
  - 确认接受 esPaimon 作为 bribe 资产
  - 配置代币白名单（USDC、USDP、esPaimon、外部项目代币）
  - 2% 平台费率保持不变

#### 2.2 激励模块集成（2-3 天）
- **`RewardDistributor` 改造**：
  - 集成 Boost 倍数计算：查询 `BoostStaking.sol` 获取用户 Boost 权重
  - 支持多资产奖励分发（esPaimon 主要 + USDC/USDP 补充）
  - 事件：`RewardDistributed`, `BoostApplied`

- **🆕 Nitro 池治理流程**：
  - 外部项目创建 Nitro 池需 vePaimon 投票批准（防止恶意代币）
  - 设置代币白名单审计流程
  - 前端显著提示"外部奖励代币风险自担"

#### 2.3 储蓄率利率源配置（1 天）
- **利率计算逻辑**：
  - RWA 收益提成：年化 5% → 分配 2% 给 USDP 储蓄池
  - 协议手续费分配：DEX 手续费 10% 国库部分 → 部分注入储蓄池
  - 波动上限：单周 APR 变动 <20%（使用储备金平滑）

- **更新频率**：
  - 每日自动触发 `SavingRate.accumulate()`
  - 使用 Keeper 或链上自动化合约（Chainlink Automation）

### Phase 3：前端改造（6-9 天，原 4-6 天）

#### 3.1 基础改造（2-3 天）
- **代币与路由**：
  - 新增 `USDP`、`esPaimon`、`vePaimon`、`BoostStaking`、`NitroPool`、`SavingRate` 合约地址/ABI 配置
  - 替换锁仓为 `Paimon`，`app/lock` 与 `app/vote` 适配 vePaimon 权重显示与投票流程
  - 更新 wagmi hooks 和 viem 配置

- **国际化**：
  - 中英文对齐新术语（USDP、esPaimon、vePaimon、Boost、Nitro、储蓄率）
  - 更新 `next-intl` 翻译文件

#### 3.2 新增展示模块（🔴 原计划遗漏，3-4 天）
- **🆕 Boost 展示模块**（P0）：
  - 位置：`app/boost/` 或 `app/rewards/boost`
  - 功能：
    - 显示当前 Boost 倍数（1.0x - 2.5x）
    - 质押 esPaimon 入口
    - 预计收益提升计算器
    - 历史 Boost 记录
  - 组件：`BoostStakingCard`、`BoostCalculator`、`BoostHistory`

- **🆕 Nitro 池列表模块**（P0）：
  - 位置：`app/liquidity/nitro` 或独立 `app/nitro`
  - 功能：
    - 外部项目池列表（项目名、锁定期限、APR、奖励代币）
    - 参与入口（存入 LP Token）
    - 我的 Nitro 参与记录
    - 领取额外奖励
  - 组件：`NitroPoolList`、`NitroParticipateModal`、`NitroRewardsCard`

- **🆕 储蓄率视图模块**（P1）：
  - 位置：`app/treasury/savings` 或 `app/swap/savings`
  - 功能：
    - USDP 储蓄 APR 实时展示
    - 存入/取出 USDP
    - 累计利息曲线（历史 7 天/30 天）
    - 利息来源说明（RWA 收益提成）
  - 组件：`SavingsRateCard`、`SavingsDepositModal`、`InterestChart`

#### 3.3 收益与分红改造（1-2 天）
- **`treasury/` 模块**：
  - 展示 `USDP` 的 `accrualIndex` 累积收益视图（历史曲线 + 当日增长）
  - 集成储蓄率模块

- **`swap/` 模块**：
  - USDC↔USDP 1:1 兑换入口
  - PSM 手续费展示（如有）

- **`bribes/` 模块**：
  - 接入 esPaimon 作为 bribe 资产
  - 显示每个 Gauge 的 bribe 金额（USDC、USDP、esPaimon、外部代币）

- **`rewards/` 模块**：
  - 支持多资产领取（esPaimon、USDC、USDP）
  - 一键归集所有奖励

### Phase 4：验证与发布（5-7 天，原 3-4 天）

#### 4.1 合约验证（3-4 天）
- **单元测试**（≥80% 覆盖，关键路径 100%）：
  - 新增合约全覆盖：USDP.sol、esPaimon.sol、VotingEscrowPaimon.sol、BoostStaking.sol、NitroPool.sol、SavingRate.sol
  - 手续费分配测试（70/30，动态计算）
  - Boost 倍数计算边界测试（1.0x - 2.5x）

- **集成测试**：
  - Boost 流程：质押 esPaimon → LP 挖矿 → 领取增强奖励
  - Nitro 流程：外部项目创建池 → LP 参与 → 领取额外奖励
  - 储蓄率流程：存入 USDP → 累计利息 → 取出本金+利息
  - 手续费分配：DEX 交易 → 70% 分配给 ve 投票者 → 30% 入国库

- **不变量测试**：
  - PSM backing: `USDC balance >= USDP supply`
  - USDP 供应: `sum(user_shares) × accrualIndex == total_supply`
  - Boost 上限: `actualReward <= baseReward × 2.5`
  - 手续费分配: `voterFees + treasuryFees == totalFees`
  - Nitro 奖励: `claimed_rewards <= total_deposited_rewards`

- **🆕 攻击向量测试**（新增）：
  - Boost 博弈：闪电贷质押 → 领取 Boost 奖励 → 立即退出（应被阻止）
  - 精度损失：频繁小额 accrualIndex 更新的累积误差
  - Nitro 恶意代币：价格暴跌导致用户损失（风险提示）

#### 4.2 前端验证（1-2 天）
- **核心路径 E2E 测试**：
  - RWA→USDP 铸造
  - USDC↔USDP 兑换
  - Paimon 锁仓投票
  - esPaimon 质押获得 Boost
  - Nitro 池参与
  - USDP 储蓄存取
  - Bribe 创建与领取
  - 多资产奖励领取

- **性能测试**（Core Web Vitals）：
  - **基线对比**：Phase 0 测量的基线 vs Phase 4 改造后
  - LCP <2.5s
  - INP <200ms
  - CLS <0.1
  - 使用 chrome-devtools MCP 进行权威测量

- **🆕 新增功能测试**（新增）：
  - Boost 倍数显示准确性
  - Nitro 池列表加载性能（假设 50+ 外部项目）
  - 储蓄率 APR 实时更新

#### 4.3 安全审计（1 天）
- **标准安全检查**：
  - Reentrancy（所有 state-changing 函数）
  - 权限控制（onlyOwner、authorized contracts）
  - Oracle 断路（>20% 偏离触发）
  - SafeERC20（USDT 兼容性）

- **🆕 新增安全检查**（新增）：
  - Nitro 池外部代币风险审计（白名单机制）
  - Boost 最低质押时长强制执行
  - 储蓄率利息来源验证（防止无限铸币）

- **多签+Timelock 联调**：
  - 3-of-5 多签测试
  - 48 小时 Timelock 延迟测试
  - 紧急暂停功能测试

#### 4.4 测试网部署（1 天）
- **BSC Testnet 部署**：
  - 部署顺序：USDP → Paimon → esPaimon → VotingEscrowPaimon → BoostStaking → NitroPool → SavingRate → DEXFactory → GaugeController → BribeMarketplace → RewardDistributor
  - 初始化参数配置
  - 前端连接测试网

- **准备主网部署**：
  - 参数清单（手续费率、Boost 上限、衰减率等）
  - 运行手册（部署脚本、验证步骤）
  - 回滚方案

## 6. 文件与代码层面的改动清单 - 修订版

### 6.1 新增合约（🆕 比原计划增加 3 个）
- **核心代币**（原计划）：
  - `src/core/USDP.sol`
  - `src/core/esPaimon.sol`
  - `src/core/VotingEscrowPaimon.sol`
- **🔴 新增激励合约**（原计划遗漏）：
  - `src/incentives/BoostStaking.sol`（P0 - 核心）
  - `src/incentives/NitroPool.sol`（P0 - 核心）
  - `src/treasury/SavingRate.sol`（P1 - 重要）

### 6.2 修改现有合约
- **核心模块**：
  - `src/core/PSM.sol`（HYD → USDP 流）
  - `src/treasury/Treasury.sol`（USDP 铸造/赎回）
  - `src/dex/DEXPair.sol`（**手续费分配 70/30 → 90/10**）
- **治理模块**：
  - `src/governance/GaugeController.sol`（vePaimon 接口兼容）
  - `src/governance/BribeMarketplace.sol`（接受 esPaimon）
  - `src/governance/RewardDistributor.sol`（**集成 Boost 倍数计算**）

### 6.3 测试用例更新
- **新增测试**（估计 +150 个测试）：
  - `test/core/USDP.t.sol`（accrualIndex、份额模式）
  - `test/core/esPaimon.t.sol`（线性释放、罚则）
  - `test/core/VotingEscrowPaimon.t.sol`（2 年锁仓）
  - `test/incentives/BoostStaking.t.sol`（Boost 倍数）
  - `test/incentives/NitroPool.t.sol`（外部激励）
  - `test/treasury/SavingRate.t.sol`（储蓄利率）
- **修改测试**（估计 ~50 个测试需更新）：
  - `test/dex/DEXPair.t.sol`（手续费分配 90/10）
  - `test/governance/RewardDistributor.t.sol`（Boost 集成）
  - HYD 相关用例迁移/保留兼容层

### 6.4 前端改造
- **配置文件**：
  - `src/config/contracts/addresses.ts`（新增 6 个合约地址）
  - `src/config/contracts/abis.ts`（新增 6 个合约 ABI）
  - `src/config/wagmi.ts`（更新链配置）
- **新增页面/组件**（🔴 原计划遗漏）：
  - `src/app/boost/` - Boost 质押与倍数展示
  - `src/app/nitro/` 或 `src/app/liquidity/nitro` - Nitro 池列表
  - `src/app/treasury/savings/` - 储蓄率模块
- **修改页面**：
  - `src/app/lock/` - 替换为 Paimon 锁仓
  - `src/app/vote/` - 适配 vePaimon 权重
  - `src/app/treasury/` - 展示 USDP accrualIndex
  - `src/app/swap/` - USDC↔USDP 兑换
  - `src/app/bribes/` - 接入 esPaimon
  - `src/app/rewards/` - 多资产领取
- **国际化**：
  - `public/locales/en/` - 英文术语更新
  - `public/locales/zh/` - 中文术语更新

## 7. 迁移策略与兼容性

- 若链上无既有部署：直接替换，无数据迁移需求。
- 若已有测试网部署：
  - 方案 A：并行部署 USDP 与 vePaimon 路线，保留 HYD 垫片层（只读），逐步下线 HYD 铸造。
  - 方案 B：冻结 HYD，快照后一次性切换到 USDP；发布迁移指南与兑换入口。
- 依赖最小化：治理与交易路径与 PSM/USDP 解耦（DIP）。

## 8. 验收标准（DoD）- 修订版

### 8.1 合约验收
**原标准**（保留）：
- ✅ USDP：`accrualIndex` 正确，日增发/分配经审计测试；PSM 1:1 兑换全场景通过
- ✅ esPaimon：线性释放/提前退出罚则正确；与 Bribe/Distributor 联调通过
- ✅ vePaimon：锁仓/权重/衰减/投票/快照正确；Gauge 流程完整

**🆕 新增标准**（原计划遗漏）：
- ✅ **Boost**：esPaimon 质押 → Boost 倍数计算 → 实际奖励提升 2-2.5x
- ✅ **Nitro**：外部项目设置激励池 → LP 领取额外奖励 → 平台收取管理费
- ✅ **储蓄率**：USDP 存入 → 按 APR 累计利息 → 赎回时获得本金+利息
- ✅ **手续费分配**：DEX 交易 → **70% 归属 ve 投票者、30% 入国库**（最终确认）
- ✅ **测试覆盖**：≥80% 整体覆盖，关键路径 100%，新增 ~150 个测试用例

### 8.2 前端验收
**原标准**（保留）：
- ✅ RWA→USDP、USDC↔USDP、Paimon 锁仓投票、Bribe、奖励领取全打通
- ✅ Core Web Vitals 全绿（LCP<2.5s, INP<200ms, CLS<0.1）
- ✅ i18n 完整（中英文）

**🆕 新增标准**（原计划遗漏）：
- ✅ **Boost 展示**：显示当前 Boost 倍数、质押数量、预计收益提升
- ✅ **Nitro 池**：显示外部项目池列表、APR、参与按钮
- ✅ **储蓄率视图**：显示 USDP 储蓄 APR、存入金额、累计利息曲线
- ✅ **性能对比**：Phase 0 基线 vs Phase 4 改造后（无回归）

### 8.3 安全验收
**原标准**（保留）：
- ✅ Reentrancy/AccessControl/Oracle 断路用例全覆盖
- ✅ 多签+Timelock 生效（3-of-5 多签、48 小时延迟）

**🆕 新增标准**（原计划遗漏）：
- ✅ **Boost 攻击防御**：闪电贷攻击被阻止（最低质押 7 天）
- ✅ **Nitro 风险提示**：外部代币风险警告显著展示
- ✅ **精度损失测试**：USDP accrualIndex 累积误差 <0.01%

## 9. 风险与缓解 - 修订版

### 9.1 原识别风险（保留）
- **稳定币会计复杂度上升**：采用"份额-索引"模式避免精度损失；大数运算集中到单次结算
- **治理迁移冲击**：提供 vePaimon 空投/迁移激励；分阶段灰度
- **前端回归成本**：以合约 ABI 驱动的服务层封装，减少页面改动（KISS/DRY）

### 9.2 新增风险（🔴 原计划未识别）

#### 🟠 高优先级风险
1. **手续费计算方式优化**（Low）
   - **风险**：从固定常量改为动态计算，略微增加 Gas 成本
   - **缓解**：Gas 增幅 <5%（可接受），优先保证代码质量和灵活性

2. **Boost 机制博弈攻击**（Medium）
   - **风险**：闪电贷质押 → 领取 Boost 奖励 → 立即退出获利
   - **缓解**：设置最低质押时长 7 天，Boost 倍数线性增长

3. **Nitro 外部代币风险**（Medium）
   - **风险**：外部项目方添加恶意代币或价格暴跌
   - **缓解**：需 vePaimon 投票批准，设置白名单，显著风险提示

#### 🟡 中优先级风险
4. **储蓄率利息来源不稳定**（Medium）
   - **风险**：RWA 收益波动导致 APR 大幅变化
   - **缓解**：设置单周变动上限 <20%，使用储备金平滑

5. **USDP accrualIndex 精度损失**（Low）
   - **风险**：频繁小额更新累积误差
   - **缓解**：使用 1e18 精度份额模式，添加 invariant 测试

6. **时间估算不足**（High）
   - **风险**：原计划 15-23 天，实际需要 27-39 天（增加 56%）
   - **缓解**：分优先级实施（P0→P1→P2），延长测试周期至 5-7 天

## 10. 工程实践与原则

- KISS：USDP accrual 以最小必要状态实现；治理/分配接口复用现有控制器。
- YAGNI：不引入可升级代理/复杂曲线；先满足当前 PRD。
- DRY：奖励与分红逻辑复用 `RewardDistributor` 与 bribe 框架；前端公共 hooks 统一封装。
- SOLID：
  - S：将稳定币会计从金库/PSM 独立；
  - O：Gauge/Bribe 接口支持多资产，不改动其核心；
  - L：vePaimon 完全替换 veHYD 的查询路径；
  - I：清晰区分 `Minter/Distributor/Oracle` 角色接口；
  - D：面向接口依赖（前端以合约接口服务层编程）。

## 11. 时间估算总结 - 修订版

| Phase | 原计划 | 修订后 | 增幅 | 原因 |
|-------|-------|-------|------|------|
| **Phase 0** | 1-2天 | 2-3天 | +33% | +经济模型对齐会议、+性能基线测量 |
| **Phase 1** | 5-8天 | 9-13天 | +62% | +Boost/Nitro/储蓄率合约、+手续费修正 |
| **Phase 2** | 3-5天 | 5-7天 | +40% | +Nitro 治理流程、+Boost 计算集成 |
| **Phase 3** | 4-6天 | 6-9天 | +50% | +Boost/Nitro/储蓄率前端模块 |
| **Phase 4** | 3-4天 | 5-7天 | +75% | +安全测试、+性能对比 |
| **总计** | **16-25天** | **27-39天** | **+56%** | 基于遗漏功能和风险缓解 |

**含 20% 缓冲**：**32-47 天**

## 12. 后续动作

### 立即执行（Phase 0）
1. **✅ 经济模型最终确认**（已完成）：
   - ✅ 手续费分配：**70/30**（70% 给投票者、30% 入国库）
   - ✅ vePaimon 转让性：**可转让**（NFT 支持 transfer）
   - ✅ esPaimon 衰减率：**每周 1%**（仅影响 Boost 权重）

2. **前端性能基线测量**（0.5 天）：
   - 使用 chrome-devtools MCP 测量当前 LCP/INP/CLS
   - 记录基线数据用于 Phase 4 对比

3. **创建改造分支**：
   - 分支名：`feat/usdp-vepaimon-full`（比原计划名称更准确）
   - 保护主分支，冻结部署操作

### Phase 1-4 执行（按修订计划）
- **Week 1-2**：核心代币 + 手续费修正（P0）
- **Week 3-4**：Boost + Nitro + 储蓄率（P0+P1）
- **Week 5-6**：治理对齐 + 前端改造
- **Week 7**：验证与发布

### 文档维护
- 本文档归档：`/.ultra/docs/transform-plan.md`
- 创建详细版本：`/.ultra/docs/transform-plan-revised.md`（包含新增合约完整清单）
- 更新任务追踪：`.ultra/tasks/tasks.json`（基于修订后的 Phase 划分）

---

**修订历史**：
- **2025-11-01 初始版本**：15-23 天估算
- **2025-11-01 修订版本**：基于深度研究报告，修正 3 个严重遗漏、1 个重大偏差，时间估算增加至 27-39 天（含缓冲 32-47 天）

**修订依据**：`.ultra/docs/研究报告-改造计划准确性评估-2025-11-01.md`

---

## R2 二次修订（2025-11-01）— 全面覆盖与细化

> 本节为“二次修订”，对本文档的早期内容进行全面细化与必要覆盖；若与前文描述有冲突，以本节为准。

### A. 决策确认（最终版）
- esPaimon 衰减参数：每周 1%（仅用于 Boost 质押权重衰减，不影响 365 天线性归集到 Paimon 的解锁进度）。
- USDP 分红路径：采用 SavingRate 池（USDP 存款生息，利息来源为 RWA 收益的 2% 播入）。
- Nitro 奖励代币：开放任意 ERC20，建立白名单制度（Owner 可动态增删白名单）。

### B. 现状纠偏与关键覆盖
- DEX 路由：代码库当前不存在 `DEXRouter.sol`（仅有 `DEXFactory.sol`、`DEXPair.sol`）。前端暂用测试网 Router（参考 `nft-paimon-frontend/src/config/chains/testnet.ts` 中 `dex.router`），本期不自研 Router（KISS/YAGNI）。
- 手续费现状与修正：
  - 现状：`DEXPair.sol` 总费 25bp，但内部常量拆分为 17/8，实际为 68%/32%（且与注释“70/30”不符）。
  - 修正：实现“先算总费 → 再按 90%/10% 切分”，避免 25bp × 90% = 22.5bp 的定点表达问题导致的精度误差与常量维护重复（DRY）。
  - 具体实现：
    - `fee = (amountIn * TOTAL_FEE) / FEE_DENOMINATOR`
    - `voterShare = (fee * 9) / 10`
    - `treasuryShare = fee - voterShare`
    - 保持 `K` 不变式校验在“净额”语境下成立。
- ve 锁仓期限：按 PRD 执行 1 周 ~ 4 年，线性衰减（VotingEscrowPaimon 复用当前 `VotingEscrow.sol` 的时间常量与权重公式）。
- Oracle 偏离阈值：部署参数设为 20%（2000 bps），最老价 1 小时，恢复延迟 30 分钟（使用 `PriceOracle.sol` 现有构造参数与状态机，无需代码改动）。

### C. 目标架构（最终细化，PRD 对齐）

1) 稳定币 USDP（份额 + 指数 accrualIndex 模型）
- 账户记账：`userBalance = userShares * accrualIndex / 1e18`；不采用 rebase，减少外部集成影响。
- 接口要点：
  - `mint(to, shares)` / `burn(from, shares)`
  - `setAccrualIndex(newIndex)`（仅金库/收益路由可调，用于集中派息）
  - 事件：`AccrualIndexUpdated(oldIndex, newIndex)`、`MintedShares(to, shares)`、`BurnedShares(from, shares)`
- 不变量：`totalSupply == sum(userShares) * accrualIndex / 1e18`；指数单调非减。

2) USDP SavingRate（储蓄率池）
- 存款获得份额 `srShares`，价值锚定池内 USDP 余额；USDP 利息通过金库定期 `fund(amount)` 或通过提升 `accrualIndex` 体现。
- 接口：`deposit(amount)`, `withdraw(shares)`, `fund(amount)`, `previewDeposit(amount)`；事件：`Funded(amount)`、`Deposit/Withdraw`。
- 资金来源：RWA 年化 5% 假设中，提取 2% 注入 SavingRate（PRD）。
- 不变量：`sum(srShares) * srIndex == poolUSDPBalance`；禁止负利率；防小额频繁更新造成精度流失（统一 1e18 精度）。

3) esPaimon（激励代币）
- 线性解锁：365 天线性归集为 Paimon；`claim()` 按已归集线性进度将 Paimon 释放给用户；esPaimon 自身不可转账。
- 提前退出罚则：按“剩余未归集占比”线性罚没（示例：剩余 50% → 罚没 50% esPaimon 对应名义值）。罚没资产默认注入奖励池（RewardDistributor 资金来源之一），参数化保留 Owner 可切换为销毁。
- Boost 衰减：仅“Boost 质押权重”按周衰减 1%（以 Gauge 周期为单位），`effectiveStake = rawStake * (1 - 1%)^epochsElapsed`。不影响线性解锁进度。

4) BoostStaking（质押增益 2.0x~2.5x）
- 倍数计算：`multiplier = min(2.5, 1.0 + g(effectiveStake, poolFactor))`，`g()` 为单调递增曲线（如对数或分段线性），确保投入越多增益越高但边际递减，默认达 2.5 上限。
- 最小质押时长：≥ 1 个 Epoch（7 天）；当前 Epoch 内新增质押的 Boost 次周生效，防“闪电贷质押即领走”。
- 快照规则：按 Epoch 对 `effectiveStake` 与 `multiplier` 快照；Reward 计算基于快照。
- 事件：`Stake/Unstake/Restake`、`EpochSnapshot`。

5) Nitro 外部激励池（开放 ERC20 + 白名单）
- 创建：外部项目方调用 `createPool(rewardToken, totalReward, start, end, minLP [, gaugeId])`；`rewardToken` 必须白名单；激励线性释放。
- 参与：LP Token 存入获取奖励资格；`minLP` 硬性门槛；可限定针对某个 Gauge 的 LP。
- 领取：`claim()` 按“我的 LP 权重 ×（已释放总额/全局权重） - 已领”计算；剩余奖励在到期后可被创建人 `sweep` 回收或续期。
- 安全：白名单 `whitelist(token, bool)`；事件：`PoolCreated/Claimed/Swept`；防重入与超额发放。

6) 治理与 Bribe
- `VotingEscrowPaimon`：1 周 ~ 4 年，线性衰减；NFT 化；复用现有 `VotingEscrow.sol` 结构，底层 Token 改为 Paimon。
- `GaugeController`：保持接口不变，构造时注入 `VotingEscrowPaimon`；Epoch = 7 天，与 Boost 保持一致。
- `BribeMarketplace`：token 白名单开放 esPaimon 与任意 ERC20；创建贿选收取 2% 平台费，直送国库；Merkle 分发对齐 RewardDistributor。

7) DEX 手续费与分配（0.25% 基础费）
- 实现方式：总费 25bp，按 **70%/30%** 动态切分至 `voterFees{0,1}` 与 `treasuryFees{0,1}`；`claimVoterFees` 由治理路径归集，`claimTreasuryFees` 仅国库可调用。
- 动态费率：保持可扩展（OCP），本期不实现（YAGNI）。

8) Oracle（双源 + 断路）
- 参数：偏离阈值 20%（2000 bps）、最大时延 1 小时、恢复延迟 30 分钟；以 Pyth 为回退源；偏离触发断路选择 Pyth。
- 仅部署参数配置，无需代码改动。

### D. 代码改动清单（R2 最终）

新增合约
- `src/core/USDP.sol`：份额 + 指数；`setAccrualIndex`、`MintedShares/BurnedShares` 事件。
- `src/core/VotingEscrowPaimon.sol`：基于 `VotingEscrow.sol`，绑定 Paimon，时间常量保持 1 周 ~ 4 年。
- `src/core/esPaimon.sol`：365 天线性解锁、提前退出罚则（默认注入奖励池）、Boost 权重按周 1% 衰减（独立于解锁）。
- `src/incentives/BoostStaking.sol`：最小质押时长 1 Epoch、2.5x 上限、Epoch 快照、反闪电贷；与 RewardDistributor 离线聚合对接。
- `src/incentives/NitroPool.sol`：白名单 ERC20，线性释放，LP 门槛，`sweep` 回收。
- `src/treasury/SavingRate.sol`：USDP 存取、基金 `fund()`、份额/指数不变量。

修改合约
- `src/dex/DEXPair.sol`
  - 删除固定 17/8 的拆分常量；以"总费 → 按 **70/30** 动态切分"的通用公式计提（避免重复与精度歧义）。
  - 保持 `K` 校验在"净额"上下文正确；`skim/sync` 扣除两类累积费用再对账。
- `src/core/PSM.sol`
  - HYD→USDP 流：`swapUSDCForUSDP` / `swapUSDPForUSDC`；费率仍用 bp 表达；事件与限额更新。
- `src/governance/GaugeController.sol`
  - 构造参数改为 `VotingEscrowPaimon`；其余接口不变（LSP）。
- `src/governance/BribeMarketplace.sol`
  - 默认将 esPaimon 纳入白名单；保留 Owner 白名单管理接口。
- `src/governance/RewardDistributor.sol`
  - 维持 Merkle 离线分发（KISS）。Boost 倍数由离线聚合计算进入 Merkle 根；链上无复杂聚合逻辑。

前端改造
- 新增/更新合约地址与 ABI：USDP、VotingEscrowPaimon、esPaimon、BoostStaking、NitroPool、SavingRate。
- 页面：
  - `app/boost/`：倍数展示、质押入口、收益提升估算、历史记录。
  - `app/nitro/`：外部池列表、参与、奖励领取。
  - `app/treasury/savings/`：APR、存取、利息曲线、来源说明。
- i18n：新增术语（USDP、esPaimon、vePaimon、Boost、Nitro、储蓄率），统一中英。
- Router：沿用测试网 Router 地址（配置文件），本期不新增自研 Router 集成。

### E. 测试与验证（R2）

单元测试（≥80%，关键路径 100%）
- USDP：accrualIndex、份额会计、边界精度；SavingRate：份额不变量、fund 分发。
- DEXPair：25bp 总费、**70/30 动态切分**、极端边界与 1 wei 舍入；`claim*Fees` 安全性。
- esPaimon：线性解锁、提前退出罚则、事件正确性。
- Boost：1%/周衰减、最小质押时长、2.5x 上限、Epoch 快照。
- Nitro：白名单、线性释放、`sweep` 行为、奖励不超发。
- VotingEscrowPaimon：1 周~4 年、权重线性衰减、NFT 转移影响。

集成测试
- RWA→USDP 铸造/赎回（PSM）；USDC↔USDP；
- LP→投票→Bribe 创建/领取→RewardDistributor Merkle 领取（含 Boost 倍数）；
- Nitro 参与/领取；
- USDP 存款利率（SavingRate）存入→累计→取出本息。

不变量与攻击面
- `voterFees + treasuryFees == totalFees`；`actualReward <= baseReward × 2.5`；`USDC reserve >= redeem demand`；`sum(srShares) * srIndex == poolUSDPBalance`。
- 防闪电贷质押：Boost 当期新增次周生效；
- Nitro 恶意代币风险：白名单控制；价格暴跌仅提示风险，不兜底。

### F. 安全、治理与参数（R2）
- 多签（3-of-5）+ Timelock（48h）；应急暂停；ReentrancyGuard；SafeERC20；权限最小化。
- Oracle：偏离阈值 20%，最老价 1 小时，恢复延迟 30 分钟（部署参数）。
- 参数表（默认）：
  - DEX 总费 25bp；分配 **70%/30%**；
  - Boost 衰减 1%/周；最小质押 1 Epoch；上限 2.5x；
  - SavingRate 注资占 RWA 年化 2%；
  - Bribe 平台费 2%；
  - Nitro 开放 ERC20 + 白名单；
  - ve 锁仓 1 周~4 年；**vePaimon NFT 可转让**。

### G. 部署步骤（BSC Testnet）

**✅ 核心逻辑**：HYD (RWA 抵押物) → Treasury → USDP → 治理 + DEX → 激励机制

1) **部署顺序**：
   - **Phase 0 (RWA 基础)**：HYD → RWAPriceOracle → Treasury
   - **Phase 1 (稳定币)**：USDP → PSM
   - **Phase 2 (治理)**：Paimon → esPaimon → VotingEscrowPaimon
   - **Phase 3 (DEX)**：DEXFactory/Pair → DEXRouter（或用测试网 Router）
   - **Phase 4 (治理机制)**：GaugeController → BribeMarketplace
   - **Phase 5 (激励)**：BoostStaking → RewardDistributor → NitroPool → SavingRate

2) **初始化**：
   - **Phase 0**:
     - HYD mint 初始供应（测试用）
     - Oracle 配置 HYD 价格源 + 参数（20%偏离/1h 延迟/30m 恢复）
     - Treasury 白名单 HYD（T1, 80% LTV）+ 授权 USDP mint
   - **Phase 1**:
     - USDP 授权 Treasury/PSM/SavingRate mint
   - **Phase 2-5**:
     - DEX 国库地址；RewardDistributor 国库与 Merkle 管理地址
     - SavingRate 注资账户（Treasury）
     - 白名单 esPaimon 与常用 ERC20
     - Gauge 列表与初始投票周期
3) 前端连测：boost/nitro/savings/ve 投票/Bribe/多资产奖励领取路径。
4) 回滚方案：逐合约 Pause；Timelock 延迟窗口内可取消关键变更。

### H. 时间评估（维持）
- Phase 0：1-2 天；Phase 1：5-7 天；Phase 2：10-14 天；Phase 3：6-9 天；Phase 4：5-7 天；合计：27-39 天（缓冲 32-47 天）。

### I. 任务追踪与文档
- 更新 `/.ultra/tasks/tasks.json`：按 R2 切分任务与负责人；
- 本文档（transform-plan.md）作为主计划；另建 `transform-plan-revised.md` 存档版本，包含参数表与接口清单；
- `/.ultra/docs/tech.md`：记录 Oracle 参数、SavingRate 注资流程、Merkle 离线聚合脚本说明。
