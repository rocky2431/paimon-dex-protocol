# Paimon.dex

> **RWA 启动板 + veNFT 治理 DEX + 国库支持的 USDP 合成资产协议**
> **RWA Launchpad + veNFT Governance DEX + Treasury-Backed USDP Synthetic Asset Protocol**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-orange.svg)](https://docs.soliditylang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![Foundry](https://img.shields.io/badge/Built%20with-Foundry-FFDB1C.svg)](https://book.getfoundry.sh/)

**当前版本 / Current Version**: v3.3.0
**最后更新 / Last Updated**: 2025-11-06

**测试状态 / Test Status**:
- 智能合约 / Smart Contracts: **98.99%** (980/990 tests passing) ✅
- 前端应用 / Frontend App: **93.4%** (844/904 tests passing) ✅
- 测试覆盖率 / Coverage: **~85%** (line coverage), **~90%** (function coverage)

---

## ⭐ v3.3.0 架构亮点 / v3.3.0 Architecture Highlights

### 统一基础设施 / Unified Infrastructure

**新增基类和库 / New Base Class & Libraries** (`paimon-rwa-contracts/src/common/`):
- **`Governable.sol`** - 统一治理基类，所有核心合约继承 / Unified governance base class for all core contracts
- **`ProtocolConstants.sol`** - 集中常量管理 (BASIS_POINTS, WEEK, EPOCH_DURATION) / Centralized constants
- **`ProtocolRoles.sol`** - 统一角色定义 (GOVERNANCE_ADMIN_ROLE, EMISSION_POLICY_ROLE) / Unified role definitions
- **`EpochUtils.sol`** - 标准化时间计算工具 / Standardized time calculation utilities

**新增合约 / New Contract**:
- **`EmissionRouter.sol`** - 四通道分发管道 (Debt/LP/Stability/Eco) / Four-channel distribution pipeline

**已迁移至 Governable / Migrated to Governable**:
1. EmissionManager (排放调度器)
2. EmissionRouter (分发路由器)
3. PSMParameterized (锚定稳定模块)
4. Treasury (国库)
5. GaugeController (流动性控制器)
6. DEXFactory (DEX 工厂)

---

## 📖 目录 / Table of Contents

- [概述 / Overview](#-概述--overview)
- [核心代币 / Key Tokens](#-核心代币--key-tokens)
- [项目架构 / Architecture](#️-项目架构--architecture)
- [核心特性 / Core Features](#-核心特性--core-features)
- [快速开始 / Quick Start](#-快速开始--quick-start)
- [开发工作流 / Development Workflow](#️-开发工作流--development-workflow)
- [测试 / Testing](#-测试--testing)
- [部署 / Deployment](#-部署--deployment)
- [文档 / Documentation](#-文档--documentation)
- [安全 / Security](#-安全--security)
- [贡献 / Contributing](#-贡献--contributing)
- [许可证 / License](#-许可证--license)

---

## 🌟 概述 / Overview

**Paimon.dex** 是一个综合 DeFi 协议,将 **RWA (Real World Asset)** 代币化、**veNFT 治理 DEX** 和 **国库支持的合成稳定币** 统一整合。

**Paimon.dex** is a comprehensive DeFi protocol integrating **RWA (Real World Asset)** tokenization, **veNFT Governance DEX**, and **treasury-backed synthetic stablecoin** into a unified governance flywheel.

### "面向 RWA 的发行、流动性与治理一体化协议"

**核心价值主张 / Core Value Proposition**:
- **发行 / Issuance**: RWA 项目通过 veNFT 治理审批上线 / RWA projects launched via veNFT governance approval
- **流动性 / Liquidity**: DEX 提供 AMM 交易,GaugeController 分配流动性挖矿 / DEX provides AMM trading, GaugeController allocates liquidity mining
- **治理 / Governance**: 锁定 PAIMON → vePAIMON NFT → 投票权重 / Lock PAIMON → vePAIMON NFT → Voting power
- **稳定性 / Stability**: USDP 由 Treasury RWA 持仓超额抵押,PSM 提供 1:1 USDC 兑换 / USDP over-collateralized by Treasury RWA holdings, PSM provides 1:1 USDC swap

---

## 🪙 核心代币 / Key Tokens

| 代币 / Token | 用途 / Purpose | 关键特性 / Key Characteristics |
|--------------|----------------|-------------------------------|
| **USDP** | 合成稳定币 / Synthetic Stablecoin | 由 Treasury RWA 持仓支持,PSM 提供 1:1 USDC 兑换<br/>Backed by Treasury RWA holdings, PSM provides 1:1 USDC swap |
| **PAIMON** | 治理代币 / Governance Token | 总量 ~10B,三阶段排放 (6.77 年)<br/>Total ~10B, 3-phase emission (6.77 years) |
| **esPAIMON** | 归属代币 / Vesting Token | 365 天线性解锁,提前退出有惩罚,每周 Boost 衰减 1%,非转让性 Position-based<br/>365-day linear vesting, early exit penalty, 1% Boost decay/week, non-transferable position-based |
| **vePAIMON NFT** | 投票托管 NFT / Vote-Escrowed NFT | 锁定 PAIMON (1周~4年) → ERC-721 NFT,投票权随时间线性衰减,可转让<br/>Lock PAIMON (1 week~4 years) → ERC-721 NFT, voting power decays linearly, transferable |
| **HYD** | RWA 抵押资产示例 / RWA Collateral Asset (Example) | Tier 1 级别,80% LTV,用于演示 Treasury 抵押铸 USDP<br/>Tier 1, 80% LTV, demonstrates Treasury collateral minting USDP |

---

## 🏗️ 项目架构 / Architecture

### 工作区结构 / Workspace Structure

```
paimon 1111111/
├── paimon-rwa-contracts/          # Solidity 智能合约 (Foundry-based)
│   ├── src/
│   │   ├── common/                # ⭐ v3.3.0 NEW - 统一基础设施
│   │   │   ├── Governable.sol            # 治理基类
│   │   │   ├── ProtocolConstants.sol     # 协议常量
│   │   │   ├── ProtocolRoles.sol         # 角色定义
│   │   │   └── EpochUtils.sol            # 时间工具
│   │   ├── core/                  # USDP, PAIMON, VotingEscrow (vePAIMON NFT)
│   │   ├── treasury/              # Treasury, PSMParameterized (USDC↔USDP 1:1)
│   │   ├── dex/                   # DEXFactory, DEXPair, DEXRouter
│   │   ├── governance/            # EmissionManager, EmissionRouter ⭐ NEW, GaugeController
│   │   ├── launchpad/             # ProjectRegistry, IssuanceController
│   │   ├── presale/               # RWABondNFT, RemintController (游戏化预售)
│   │   └── oracle/                # RWAPriceOracle (Chainlink + 托管方 NAV)
│   ├── test/                      # Foundry 测试套件 (6 维度覆盖)
│   │   ├── core/                  # 核心合约测试
│   │   ├── governance/            # 治理测试 (EmissionManager, EmissionRouter)
│   │   ├── treasury/              # 国库测试
│   │   ├── integration/           # 集成测试
│   │   └── invariant/             # 不变量测试 (PSM, DEX, Treasury)
│   ├── script/                    # 部署脚本
│   │   ├── DeployComplete.s.sol   # 完整部署脚本
│   │   └── DEPLOYMENT.md          # ⭐ 更新的部署文档
│   ├── audit-package/             # 审计提交包
│   │   ├── README.md              # ⭐ 更新至 v3.3.0
│   │   └── contracts/             # 同步的合约镜像
│   ├── foundry.toml               # Foundry 配置 (主框架)
│   ├── README.md                  # ⭐ 更新的项目概览
│   ├── ARCHITECTURE.md            # ⭐ 更新的架构指南
│   └── DEVELOPMENT.md             # 本文件
│
└── nft-paimon-frontend/           # Next.js 14 前端 (TypeScript)
    ├── src/
    │   ├── app/                   # App Router 页面
    │   │   ├── swap/              # PSM + DEX 兑换界面
    │   │   ├── pool/              # 添加/移除流动性
    │   │   ├── lock/              # veNFT 锁定
    │   │   ├── vote/              # 治理投票
    │   │   ├── launchpad/         # RWA 项目列表 + 参与
    │   │   ├── treasury/          # RWA 存款 + 持仓监控
    │   │   └── presale/           # 债券 NFT 铸造 + 掷骰子
    │   ├── components/            # React 组件 (Material Design 3)
    │   ├── hooks/                 # 自定义 React hooks (Web3 交互)
    │   ├── config/                # Web3 配置 (wagmi + viem)
    │   │   ├── wagmi.ts           # Web3 provider (BSC mainnet + testnet)
    │   │   └── theme.ts           # MUI Material Design 3 主题 (暖色系)
    │   └── types/                 # TypeScript 类型定义
    └── __tests__/                 # Jest 单元测试
        ├── components/            # 组件测试
        └── hooks/                 # Hooks 测试
```

### 技术栈 / Tech Stack

**智能合约 / Smart Contracts**:
- **Solidity**: 0.8.24
- **Framework**: Foundry (Forge for testing, Cast for interaction)
- **Libraries**: OpenZeppelin 5.x (AccessControlEnumerable, SafeERC20, ReentrancyGuard, Pausable)
- **Oracle**: Chainlink VRF v2 (骰子游戏随机数 / Dice roll randomness)
- **Network**: BSC (Binance Smart Chain) - ChainID 56 (mainnet), 97 (testnet)

**前端 / Frontend**:
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Web3**: wagmi v2 + viem (type-safe Web3 interactions)
- **Wallet**: RainbowKit (wallet connection UI)
- **UI Library**: Material-UI v5 (Material Design 3 compliance)
- **Design System**: 暖色主题 (warm colors: red, orange, yellow, brown - NO blue/purple)
- **State Management**: TanStack Query (server state caching)
- **i18n**: next-intl (中英双语 / Bilingual EN+CN)

---

## 🎯 核心特性 / Core Features

### 1. 统一治理基础设施 / Unified Governance Infrastructure

**Governable 基类**:
```solidity
abstract contract Governable is AccessControlEnumerable {
    constructor(address initialGovernor) {
        _grantRole(DEFAULT_ADMIN_ROLE, initialGovernor);
        _grantRole(ProtocolRoles.GOVERNANCE_ADMIN_ROLE, initialGovernor);
    }

    function transferGovernance(address newGovernor) public virtual onlyGovernance {
        address previousGovernor = _msgSender();
        addGovernance(newGovernor);
        _afterGovernanceTransfer(previousGovernor, newGovernor);
        removeGovernance(previousGovernor);
    }
}
```

**支持特性 / Features**:
- ✅ 多治理主体 (Timelock, Multi-sig, EOA) / Multiple governors
- ✅ 统一角色管理 (GOVERNANCE_ADMIN_ROLE) / Unified role management
- ✅ 治理转移钩子 (`_afterGovernanceTransfer`) / Governance transfer hook
- ✅ 兼容 Ownable 接口 (`owner()`, `transferOwnership()`) / Ownable interface compatibility

### 2. 三阶段排放调度 / Three-Phase Emission Scheduler

**EmissionManager** (排放调度器):
- **Phase A** (Week 1-12): 固定 37.5M PAIMON/周 / Fixed 37.5M PAIMON/week
- **Phase B** (Week 13-248): 指数衰减 0.985^t (使用 236 元素查找表) / Exponential decay 0.985^t (236-element lookup table)
- **Phase C** (Week 249-352): 固定 4.327M PAIMON/周 / Fixed 4.327M PAIMON/week
- **总排放量 / Total Emission**: ~10B PAIMON (6.77 年 / 6.77 years)

**Gas 优化 / Gas Optimization**:
- 使用预计算查找表代替链上幂运算,节省 ~90% gas / Use precomputed lookup table instead of on-chain exponentiation, saves ~90% gas

### 3. 四通道分发管道 / Four-Channel Distribution Pipeline

**EmissionRouter** (分发路由器):
```
EmissionManager.getWeeklyBudget(week)
         ↓
EmissionRouter.routeWeek(week)
         ↓
四通道转账 / Four-channel transfers:
  • Debt Mining Sink (债务挖矿)
  • LP Pairs Sink (AMM 流动性)
  • Stability Pool Sink (稳定池)
  • Ecosystem Sink (生态基金)
```

**通道分配比例 / Channel Allocation** (阶段动态 / Phase-dynamic):
| 阶段 / Phase | Debt | LP Total | Eco | 备注 / Note |
|-----|------|----------|-----|------|
| Phase A (Week 1-12) | 30% | 60% | 10% | 引导流动性 / Bootstrap liquidity |
| Phase B (Week 13-248) | 50% | 37.5% | 12.5% | 过渡到债务聚焦 / Transition to debt focus |
| Phase C (Week 249-352) | 55% | 35% | 10% | 可持续长期 / Sustainable long-term |

**LP 二级分割 / LP Secondary Split** (治理可调 / Governance-adjustable):
- 默认: LP Pairs 60%, Stability Pool 40% / Default: LP Pairs 60%, Stability Pool 40%
- 通过 `EmissionManager.setLpSplitParams()` 调整 / Adjustable via `EmissionManager.setLpSplitParams()`

### 4. RWA 多层级抵押体系 / Multi-Tier RWA Collateralization

**Treasury 抵押分层 / Treasury Collateral Tiers**:
| 层级 / Tier | 资产类型 / Asset Type | LTV | 示例 / Example |
|-------------|----------------------|-----|----------------|
| **T1** | 美国国债 / US Treasuries | 80% | tUST (Tokenized US Treasury) |
| **T2** | 投资级信用债 / Investment-grade Credit | 65% | tCORPBOND (Tokenized Corporate Bond) |
| **T3** | RWA 收益池 / RWA Revenue Pools | 50% | tRE (Tokenized Real Estate) |

**核心不变量 / Core Invariant**:
```
Total USDP Minted ≤ Total RWA Value × Weighted Average LTV
```

### 5. veNFT 治理 DEX / veNFT Governance DEX

**投票权计算 / Voting Power Calculation**:
```
voting_power = locked_PAIMON × (time_remaining / MAX_TIME)
```

**特性 / Features**:
- ✅ 锁定 PAIMON (1周~4年) → 获得 vePAIMON NFT / Lock PAIMON (1 week~4 years) → Receive vePAIMON NFT
- ✅ 投票权随时间线性衰减 / Voting power decays linearly over time
- ✅ 不可转移 NFT (SBT - Soulbound Token 特性) / Non-transferable NFT (SBT characteristics)
- ✅ 控制 GaugeController 流动性挖矿权重 / Controls GaugeController liquidity mining weights

**DEX 费率分配 / DEX Fee Distribution**:
- 总交换费率: 0.25% / Total swap fee: 0.25%
- 70% → 投票者 (gauge 激励) / 70% → Voters (gauge incentives)
- 30% → 国库 / 30% → Treasury

### 6. PSM 锚定稳定模块 / PSM Peg Stability Module

**功能 / Functionality**:
- USDC ↔ USDP **1:1** 双向兑换 / USDC ↔ USDP **1:1** bidirectional swap
- 兑换费率: 0.1% / Swap fee: 0.1%
- 核心不变量 / Core invariant: `USDC reserve ≥ USDP total supply` (1:1 backing)

### 7. 游戏化预售系统 / Gamified Presale System

**RWABondNFT + RemintController**:
- ✅ 债券 NFT 证书 (可视化持有证明) / Bond NFT certificate (visual proof of holdings)
- ✅ 掷骰子游戏 (Chainlink VRF 提供随机性) / Dice roll game (Chainlink VRF for randomness)
- ✅ 社交任务奖励 (Twitter, Discord) / Social task rewards (Twitter, Discord)
- ✅ 最高 20 倍奖励倍数 / Up to 20x reward multiplier

---

## 🚀 快速开始 / Quick Start

### 前置要求 / Prerequisites

- **Node.js**: 18+
- **Foundry**: Latest version
- **Git**: For version control

### 安装步骤 / Installation

**1. 克隆仓库 / Clone Repository**:
```bash
git clone https://github.com/rocky2431/paimon-dex-protocol.git
cd "paimon 1111111"
```

**2. 智能合约开发 / Smart Contract Development**:
```bash
cd paimon-rwa-contracts

# 安装 Foundry 依赖 / Install Foundry dependencies
forge install

# 编译合约 / Compile contracts
forge build

# 运行所有测试 / Run all tests
forge test

# 详细输出 (查看 console.log) / Verbose output (see console.log)
forge test -vvv

# 测试覆盖率 / Test coverage
forge coverage

# Gas 报告 / Gas report
forge test --gas-report
```

**3. 前端开发 / Frontend Development**:
```bash
cd nft-paimon-frontend

# 安装依赖 / Install dependencies
npm install

# 启动开发服务器 (端口 4000) / Start dev server (port 4000)
npm run dev

# 类型检查 / Type checking
npm run type-check

# 运行测试 / Run tests
npm test

# 生产构建 / Production build
npm run build
```

---

## 🛠️ 开发工作流 / Development Workflow

### Git 工作流 / Git Workflow

**分支命名 / Branch Naming**:
- 功能 / Features: `feat/task-{id}-{description}`
- 修复 / Fixes: `fix/bug-{id}-{description}`
- 重构 / Refactoring: `refactor/{description}`

**提交规范 / Commit Format** (Conventional Commits):
```
<type>: <description>

[optional body]

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>
```

**类型 / Types**: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `chore`

### 开发标准 / Development Standards

**代码质量 / Code Quality** (强制执行 / Mandatory):
- ✅ **SOLID 原则** / SOLID Principles (Single Responsibility, Open/Closed, Liskov, Interface Segregation, Dependency Inversion)
- ✅ **DRY** - 无重复代码 >3 行 / No duplicate code >3 lines
- ✅ **KISS** - 复杂度 <10 每函数 / Complexity <10 per function
- ✅ **YAGNI** - 仅实现当前需求 / Only implement current requirements

**函数规范 / Function Standards**:
- ✅ 长度 <50 行 / Length <50 lines
- ✅ 嵌套深度 <3 层 / Nesting depth <3 levels
- ✅ 参数数量 <5 个 / Parameter count <5

---

## 🧪 测试 / Testing

### 智能合约测试 / Smart Contract Tests

**当前状态 / Current Status**: **98.99%** 通过率 (980/990 tests passing) ✅

**6 维度测试覆盖 / Six-Dimensional Test Coverage**:

| 维度 / Dimension | 描述 / Description | 示例 / Example |
|------------------|-------------------|----------------|
| **1. 功能 / Functional** | 核心业务逻辑 / Core business logic | PSM: USDC ↔ USDP 1:1 兑换 |
| **2. 边界 / Boundary** | 边缘情况 / Edge cases | 零值、最大值、空数组 / Zero, max, empty arrays |
| **3. 异常 / Exception** | 错误处理 / Error handling | 回滚条件、错误消息 / Revert conditions, error messages |
| **4. 性能 / Performance** | Gas 基准 / Gas benchmarks | RWABondNFT 铸造 <250K gas |
| **5. 安全 / Security** | 安全漏洞 / Security vulnerabilities | 重入、访问控制、预言机操纵 / Reentrancy, access control, oracle manipulation |
| **6. 兼容性 / Compatibility** | 跨合约交互 / Cross-contract interactions | USDT (non-standard ERC20) |

**关键不变量 / Critical Invariants**:
```solidity
// PSM 不变量 / PSM Invariant
invariant_PSM_USDCBacking: USDC reserve >= USDP total supply

// DEX 不变量 / DEX Invariant
invariant_DEX_ConstantProduct: K = reserve0 × reserve1 (can only increase)

// Treasury 不变量 / Treasury Invariant
invariant_Treasury_Collateralization: Total USDP minted <= Total RWA value × LTV

// VotingEscrow 不变量 / VotingEscrow Invariant
invariant_VotingEscrow_NoPhantomVoting: sum(voting_power) <= sum(locked_PAIMON)
```

**运行测试 / Run Tests**:
```bash
cd paimon-rwa-contracts

# 所有测试 / All tests
forge test

# 详细输出 / Verbose output
forge test -vvv

# 仅核心模块 / Core modules only
forge test --match-path "test/core/*"

# 特定合约 / Specific contract
forge test --match-contract EmissionRouterTest

# 覆盖率报告 / Coverage report
forge coverage --ir-minimum
```

### 前端测试 / Frontend Tests

**当前状态 / Current Status**: **93.4%** 通过率 (844/904 tests passing) ✅

**测试类型 / Test Types**:
- **单元测试 / Unit Tests**: 组件、Hooks 隔离测试 / Component and hook isolation tests
- **集成测试 / Integration Tests**: 多组件交互 / Multi-component interactions
- **Mock 策略 / Mock Strategy**: 仅 Mock 外部依赖 (wagmi, next/navigation) / Only mock external dependencies

**运行测试 / Run Tests**:
```bash
cd nft-paimon-frontend

# 所有测试 / All tests
npm test

# 监视模式 / Watch mode
npm run test:watch

# 覆盖率报告 / Coverage report
npm run test:coverage
```

---

## 📦 部署 / Deployment

### 目标网络 / Target Network

**BSC (Binance Smart Chain)**:
- **主网 / Mainnet** (ChainID 56): https://bsc-dataseed.binance.org/
- **测试网 / Testnet** (ChainID 97): https://data-seed-prebsc-1-s1.binance.org:8545/

### 部署顺序 / Deployment Sequence

**⚠️ 关键: 测试网必须先部署 Mock 代币！/ CRITICAL: Deploy Mock Tokens First on Testnet!**

#### Step 1: Mock Tokens (仅测试网 / Testnet Only)

**必须先部署的 Mock 代币 / Required Mock Tokens**:
1. **MockUSDC** - 模拟 USDC 稳定币 (PSM 1:1 兑换需要) / Mock USDC stablecoin (required for PSM 1:1 swap)
2. **MockRWATokens** - Demo RWA 资产代币 (Treasury 抵押品) / Demo RWA asset tokens (Treasury collateral):
   - **HYD** - Tier 1, 80% LTV
   - **tUST** (Tokenized US Treasury) - Tier 1, 80% LTV
   - **tCORPBOND** (Tokenized Corporate Bond) - Tier 2, 65% LTV
   - **tRE** (Tokenized Real Estate) - Tier 3, 50% LTV

**为什么必须 / Why Required**:
- PSM 部署时需要传入 MockUSDC 地址,否则无法进行 USDC ↔ USDP 兑换 / PSM deployment requires MockUSDC address, otherwise USDC ↔ USDP swap won't work
- Treasury 需要 whitelist MockRWATokens,否则无法存入抵押品铸造 USDP / Treasury needs to whitelist MockRWATokens, otherwise cannot deposit collateral to mint USDP
- 没有这些 Mock 代币,整个系统无法测试！/ Without these Mock tokens, the entire system cannot be tested!

#### Step 2: 核心代币 / Core Tokens
3. **USDP** - 合成稳定币 / Synthetic stablecoin
4. **PAIMON** - 治理代币 / Governance token

#### Step 3: DEX 基础设施 / DEX Infrastructure
5. **DEXFactory** - AMM 工厂 / AMM factory
6. **DEXRouter** - 路由器 / Router

#### Step 4: 稳定币模块 / Stablecoin Module
7. **PSMParameterized** - USDC ↔ USDP 1:1 兑换 (⚠️ 传入 MockUSDC 地址) / USDC ↔ USDP 1:1 swap (⚠️ Pass MockUSDC address)

#### Step 5: 国库系统 / Treasury System
8. **Treasury** - RWA 抵押金库 (⚠️ 部署后需 whitelist MockRWATokens) / RWA collateral vault (⚠️ Whitelist MockRWATokens after deployment)
9. **RWAPriceOracle** - 双源定价 (Chainlink + 托管方 NAV) / Dual-source pricing

#### Step 6: 治理基础设施 / Governance Infrastructure
10. **VotingEscrow** - vePAIMON NFT
11. **GaugeController** - 流动性挖矿权重控制 / Liquidity mining weight control

#### Step 7: 排放系统 / Emission System
12. **EmissionManager** - 三阶段排放调度器 / 3-phase emission scheduler
13. **EmissionRouter** ⭐ NEW - 四通道分发管道 / 4-channel distribution pipeline

#### Step 8: Launchpad
14. **ProjectRegistry** - veNFT 治理项目注册 / veNFT governance project registry
15. **IssuanceController** - 代币销售控制器 / Token sale controller

#### Step 9: 预售 (可选 / Optional - Phase 1)
16. **RWABondNFT** - 游戏化债券证书 / Gamified bond certificates
17. **RemintController** - 掷骰子 + 社交任务 (⚠️ 需要 Chainlink VRF 设置) / Dice rolling + social tasks (⚠️ Chainlink VRF setup required)

### 部署脚本 / Deployment Script

```bash
cd paimon-rwa-contracts

# 配置环境变量 / Configure environment variables
cp .env.example .env
# 编辑 .env 填写 PRIVATE_KEY, BSC_TESTNET_RPC_URL, BSCSCAN_API_KEY
# Edit .env to fill in PRIVATE_KEY, BSC_TESTNET_RPC_URL, BSCSCAN_API_KEY

# 加载环境变量 / Load environment variables
source .env

# 测试网部署 / Testnet deployment
forge script script/DeployComplete.s.sol \
  --rpc-url $BSC_TESTNET_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $BSCSCAN_API_KEY \
  -vvvv
```

### 部署后配置 / Post-Deployment Configuration

**立即执行 (1小时内 / Within 1 Hour)**:

**1. 初始化 Mock 代币 / Initialize Mock Tokens**:
```bash
# Mint MockUSDC 给测试账户 / Mint MockUSDC to test account
cast send $MOCK_USDC_ADDRESS \
  "mint(address,uint256)" \
  $TEST_ACCOUNT \
  1000000000000 \  # 1,000,000 USDC (6 decimals)
  --private-key $PRIVATE_KEY \
  --rpc-url $BSC_TESTNET_RPC_URL

# Mint MockRWA 代币 / Mint MockRWA tokens
cast send $HYD_ADDRESS "mint(address,uint256)" $TEST_ACCOUNT $(cast --to-wei 100000) --private-key $PRIVATE_KEY --rpc-url $BSC_TESTNET_RPC_URL
cast send $tUST_ADDRESS "mint(address,uint256)" $TEST_ACCOUNT $(cast --to-wei 100000) --private-key $PRIVATE_KEY --rpc-url $BSC_TESTNET_RPC_URL
```

**2. Whitelist RWA 资产 / Whitelist RWA Assets**:
```bash
# Treasury whitelist HYD (Tier 1, 80% LTV)
cast send $TREASURY_ADDRESS \
  "whitelistRWA(address,uint8,uint256)" \
  $HYD_ADDRESS \
  1 \
  8000 \
  --private-key $PRIVATE_KEY \
  --rpc-url $BSC_TESTNET_RPC_URL

# Treasury whitelist tUST (Tier 1, 80% LTV)
cast send $TREASURY_ADDRESS \
  "whitelistRWA(address,uint8,uint256)" \
  $tUST_ADDRESS \
  1 \
  8000 \
  --private-key $PRIVATE_KEY \
  --rpc-url $BSC_TESTNET_RPC_URL
```

**3. 配置 EmissionRouter / Configure EmissionRouter** ⭐ NEW:
```bash
# 设置通道接收地址 / Set channel sinks
cast send $EMISSION_ROUTER_ADDRESS \
  "setSinks(address,address,address,address)" \
  $DEBT_SINK_ADDRESS \
  $LP_PAIRS_SINK_ADDRESS \
  $STABILITY_POOL_SINK_ADDRESS \
  $ECO_SINK_ADDRESS \
  --private-key $PRIVATE_KEY \
  --rpc-url $BSC_TESTNET_RPC_URL

# 授予排放策略角色 / Grant emission policy role
cast send $EMISSION_ROUTER_ADDRESS \
  "grantEmissionPolicy(address)" \
  $AUTHORIZED_ADDRESS \
  --private-key $PRIVATE_KEY \
  --rpc-url $BSC_TESTNET_RPC_URL
```

**4. 更新前端合约地址 / Update Frontend Contract Addresses**:
```bash
# 编辑 nft-paimon-frontend/src/config/chains/testnet.ts
# 将所有部署地址填入配置文件
# Edit nft-paimon-frontend/src/config/chains/testnet.ts
# Fill in all deployment addresses into config file
```

**24小时内测试 / Testing Within 24 Hours**:

**5. 测试完整流程 / Test Complete Flow**:
- ✅ PSM: USDC → USDP 1:1 兑换 / USDC → USDP 1:1 swap
- ✅ Treasury: 存入 HYD → 铸造 USDP (检查 LTV) / Deposit HYD → Mint USDP (check LTV)
- ✅ VeNFT: 锁定 PAIMON → 获得 vePAIMON NFT / Lock PAIMON → Receive vePAIMON NFT
- ✅ DEX: 添加流动性 + 交换 / Add liquidity + Swap
- ✅ EmissionRouter: 测试周排放路由 / Test weekly emission routing ⭐

**6. 验证 Core Web Vitals (前端性能 / Frontend Performance)**:
- ✅ LCP (Largest Contentful Paint) <2.5s
- ✅ INP (Interaction to Next Paint) <200ms
- ✅ CLS (Cumulative Layout Shift) <0.1

**详细部署文档 / Detailed Deployment Guide**: [`paimon-rwa-contracts/script/DEPLOYMENT.md`](paimon-rwa-contracts/script/DEPLOYMENT.md)

---

## 📚 文档 / Documentation

### 核心文档 / Core Documentation

- **[paimon-rwa-contracts/README.md](paimon-rwa-contracts/README.md)** - 智能合约项目概览 / Smart contract project overview
- **[paimon-rwa-contracts/ARCHITECTURE.md](paimon-rwa-contracts/ARCHITECTURE.md)** ⭐ - 系统架构详解 (更新至 v3.3.0) / System architecture details (updated to v3.3.0)
- **[paimon-rwa-contracts/DEVELOPMENT.md](paimon-rwa-contracts/DEVELOPMENT.md)** ⭐ - 开发指南 (更新至 v3.3.0) / Development guide (updated to v3.3.0)
- **[paimon-rwa-contracts/script/DEPLOYMENT.md](paimon-rwa-contracts/script/DEPLOYMENT.md)** ⭐ - 部署文档 (更新至 v3.3.0) / Deployment documentation (updated to v3.3.0)

### 审计资料 / Audit Materials

- **[paimon-rwa-contracts/audit-package/README.md](paimon-rwa-contracts/audit-package/README.md)** ⭐ - 审计包概览 (更新至 v3.3.0) / Audit package overview (updated to v3.3.0)
- **[paimon-rwa-contracts/audit-package/docs/](paimon-rwa-contracts/audit-package/docs/)** - 审计相关文档 / Audit-related documents

### Ultra Builder Pro 项目管理 / Ultra Builder Pro Project Management

- **[.ultra/](./ultra/)** - Ultra Builder Pro 项目管理目录 / Ultra Builder Pro project management directory
  - **[.ultra/tasks/](./ultra/tasks/)** - 任务跟踪 / Task tracking
  - **[.ultra/docs/](./ultra/docs/)** - 架构决策记录 (ADRs) / Architecture decision records

---

## 🔐 安全 / Security

### 安全最佳实践 / Security Best Practices

所有智能合约遵循以下原则 / All smart contracts follow these principles:

1. **重入保护 / Reentrancy Protection**:
   - 所有状态修改函数使用 `nonReentrant` 修饰符 / Use `nonReentrant` modifier on all state-changing functions

2. **SafeERC20**:
   - 使用 OpenZeppelin 的 SafeERC20 (兼容 USDT 非标准 ERC20) / Use OpenZeppelin's SafeERC20 (USDT non-standard ERC20 compatible)

3. **检查-效果-交互 / Check-Effects-Interactions**:
   - 外部调用前更新状态 / Update state before external calls

4. **精度优化 / Precision Optimization**:
   - 先乘后除以最小化精度损失 / Multiply before divide to minimize precision loss
   ```solidity
   // ✅ 正确 / Correct: 单次除法 / Single division
   uint256 result = (amount × price × ltvRatio) / (1e18 × BASIS_POINTS);

   // ❌ 错误 / Wrong: 多次除法累积精度损失 / Multiple divisions accumulate precision loss
   uint256 step1 = amount × price / 1e18;
   uint256 result = step1 × ltvRatio / BASIS_POINTS;
   ```

5. **访问控制 / Access Control**:
   - 使用 Governable 基类统一治理权限 / Use Governable base class for unified governance permissions
   - 使用 `onlyGovernance` 或自定义修饰符保护特权函数 / Use `onlyGovernance` or custom modifiers for privileged functions

6. **暂停机制 / Pausability**:
   - 关键合约 (Treasury, PSM, DEX) 实现紧急暂停 / Critical contracts (Treasury, PSM, DEX) implement emergency pause

### 已修复的安全问题 / Fixed Security Issues

**v3.3.0 之前修复 / Fixed Before v3.3.0** (SEC-003, SEC-005):
- ✅ 添加重入保护到所有存款/提款函数 / Added reentrancy guards to all deposit/withdraw functions
- ✅ 迁移到 SafeERC20 (兼容 USDT) / Migrated to SafeERC20 (USDT compatible)
- ✅ 集成 Chainlink VRF 用于不可预测的随机数 (骰子游戏) / Integrated Chainlink VRF for unpredictable randomness (dice game)
- ✅ 修复 16 个先除后乘的精度问题 / Fixed 16 divide-before-multiply precision issues

### Multi-sig 要求 / Multi-sig Requirements

**生产环境 / Production Environment**:
- **国库操作 / Treasury Operations**: 3-of-5 multi-sig + 48小时 timelock / 3-of-5 multi-sig + 48-hour timelock
- **紧急暂停 / Emergency Pause**: 4-of-7 multi-sig (即时 / instant)
- **所有权转移 / Ownership Transfer**: 2步流程 (Ownable2Step 模式) / 2-step process (Ownable2Step pattern)

---

## 🤝 贡献 / Contributing

欢迎贡献！请遵循以下步骤 / Contributions are welcome! Please follow these steps:

### 贡献流程 / Contribution Process

1. **Fork 本仓库 / Fork the Repository**
2. **创建功能分支 / Create Feature Branch**: `git checkout -b feat/task-123-new-feature`
3. **编写测试 / Write Tests** (覆盖率 ≥80% / Coverage ≥80%)
4. **遵循代码质量标准 / Follow Code Quality Standards**
5. **提交更改 / Commit Changes**: `git commit -m "feat: add new feature"`
6. **推送到分支 / Push to Branch**: `git push origin feat/task-123-new-feature`
7. **创建 Pull Request / Create Pull Request**

### 代码质量标准 / Code Quality Standards

**强制执行 / Mandatory**:
- ✅ **SOLID/DRY/KISS/YAGNI** 原则 / SOLID/DRY/KISS/YAGNI principles
- ✅ **函数 <50 行** / Functions <50 lines
- ✅ **测试覆盖率 ≥80%** / Test coverage ≥80%
- ✅ **所有公共函数都有 NatSpec 注释** / All public functions have NatSpec comments
- ✅ **6 维度测试覆盖** / 6-dimensional test coverage

**提交前检查清单 / Pre-Commit Checklist**:
- [ ] 所有测试通过 / All tests passing
- [ ] 覆盖率达标 (≥80%) / Coverage meets threshold (≥80%)
- [ ] Gas 报告无回归 / Gas report shows no regression
- [ ] 代码格式化 (forge fmt) / Code formatted (forge fmt)
- [ ] 文档更新 / Documentation updated

---

## 📄 许可证 / License

MIT License

Copyright (c) 2025 Paimon.dex

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## 🔗 链接 / Links

- **GitHub 仓库 / Repository**: https://github.com/rocky2431/paimon-dex-protocol
- **Issues**: https://github.com/rocky2431/paimon-dex-protocol/issues
- **Email**: rocky243@example.com

---

## 📊 项目统计 / Project Statistics

**代码行数 / Lines of Code**:
- 智能合约 / Smart Contracts: ~15,000 lines
- 前端 / Frontend: ~25,000 lines
- 测试 / Tests: ~30,000 lines

**测试状态 / Test Status**:
- 智能合约 / Smart Contracts: **980/990** (98.99%) ✅
- 前端 / Frontend: **844/904** (93.4%) ✅

**覆盖率 / Coverage**:
- 行覆盖 / Line Coverage: ~85%
- 函数覆盖 / Function Coverage: ~90%

---

## 🎯 路线图 / Roadmap

**Phase 1 - 核心协议 (已完成 ✅ / Core Protocol - Completed ✅)**:
- [x] USDP 合成稳定币 / USDP synthetic stablecoin
- [x] PSM 锚定稳定模块 / PSM peg stability module
- [x] Treasury RWA 抵押系统 / Treasury RWA collateralization system
- [x] VotingEscrow vePAIMON NFT / VotingEscrow vePAIMON NFT
- [x] DEX (Uniswap V2 fork) / DEX (Uniswap V2 fork)
- [x] EmissionManager 三阶段排放 / EmissionManager 3-phase emission
- [x] EmissionRouter 四通道分发 ⭐ NEW / EmissionRouter 4-channel distribution ⭐ NEW

**Phase 2 - 测试与审计 (进行中 🚧 / Testing & Audit - In Progress 🚧)**:
- [x] 6 维度测试覆盖 (98.99%) / 6-dimensional test coverage (98.99%)
- [ ] 外部安全审计 / External security audit
- [ ] 主网部署前的最终测试 / Final testing before mainnet deployment

**Phase 3 - 主网发布 (计划中 ⏳ / Mainnet Launch - Planned ⏳)**:
- [ ] BSC 主网部署 / BSC mainnet deployment
- [ ] 初始流动性引导 / Initial liquidity bootstrap
- [ ] 社区治理启动 / Community governance launch

**Phase 4 - 生态扩展 (未来 🔮 / Ecosystem Expansion - Future 🔮)**:
- [ ] 跨链桥接 / Cross-chain bridges
- [ ] RWA 资产多样化 / RWA asset diversification
- [ ] 高级治理功能 / Advanced governance features

---

**© 2025 Paimon.dex - Bridging Real World Assets with DeFi**

**"面向 RWA 的发行、流动性与治理一体化协议"**
**"Integrated Protocol for RWA Issuance, Liquidity, and Governance"**
