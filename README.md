# Paimon.dex

> DeFi 协议结合 RWA（真实世界资产）代币化、ve33 DEX 和国库支持的合成资产
> DeFi protocol combining RWA (Real World Asset) tokenization, ve33 DEX, and treasury-backed synthetic assets

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue.svg)](https://docs.soliditylang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![Foundry](https://img.shields.io/badge/Foundry-tested-green.svg)](https://book.getfoundry.sh/)

**测试状态 / Test Status**:
- 后端合约 / Backend Contracts: **97.4%** (1009/1036 tests passing) ✅
- 前端应用 / Frontend App: **93.4%** (844/904 tests passing) ✅
- 测试覆盖率 / Coverage: **~85%** for both backend and frontend

---

## 📖 目录 / Table of Contents

- [概述 / Overview](#overview)
- [核心代币 / Key Tokens](#key-tokens)
- [项目架构 / Architecture](#architecture)
- [快速开始 / Quick Start](#quick-start)
- [开发工作流 / Development Workflow](#development-workflow)
- [测试 / Testing](#testing)
- [部署 / Deployment](#deployment)
- [文档 / Documentation](#documentation)
- [贡献 / Contributing](#contributing)
- [许可证 / License](#license)

---

## 🌟 概述 / Overview

**Paimon.dex** 是一个将真实世界资产（RWA）与去中心化金融（DeFi）桥接的综合性协议。

**Paimon.dex** is a comprehensive DeFi protocol that bridges real-world assets (RWA) with decentralized finance.

### 核心特性 / Core Features

- **RWA 代币化** / **RWA Tokenization**: 多层级资产担保（T1/T2/T3）/ Multi-tier asset collateralization
- **国库系统** / **Treasury System**: 超额抵押铸造 HYD 合成资产 / Over-collateralized HYD minting
- **ve33 DEX**: Uniswap V2 分叉，定制化费用结构 / Uniswap V2 fork with custom fee structure
- **治理 NFT** / **Governance NFT**: 锁定 PAIMON 获取 vePAIMON 投票权 / Lock PAIMON for vePAIMON voting power
- **Launchpad**: RWA 项目发行和社区治理 / RWA project issuance and community governance
- **预售系统** / **Presale System**: 游戏化债券 NFT + 骰子掷奖励 / Gamified bond NFT + dice roll rewards

---

## 🪙 核心代币 / Key Tokens

| 代币 / Token | 用途 / Purpose | 特性 / Characteristics |
|--------------|----------------|------------------------|
| **USDP** | 国库支持的合成资产 / Treasury-backed synthetic asset | 1:1 USDC 通过 PSM 铸造，RWA 超额抵押 / 1:1 USDC via PSM, over-collateralized by RWA |
| **PAIMON** | 平台治理代币 / Platform governance token | 锁定为 vePAIMON NFT / Lock for vePAIMON NFT |
| **esPAIMON** | 归属代币 / Vesting token | 365 天线性解锁 / 365-day linear vesting |
| **vePAIMON** | 投票托管 NFT / Vote-escrowed NFT | 1周~4年锁定期，投票权随时间衰减 / 1 week to 4 years, voting power decays linearly |
| **HYD** | RWA 担保资产 / RWA collateral asset | T1 级别，60% LTV / Tier 1, 60% LTV |

---

## 🏗️ 项目架构 / Architecture

```
paimon 1111111/
├── paimon-rwa-contracts/          # Solidity 智能合约 (Foundry)
│   ├── src/
│   │   ├── core/                  # USDP, PAIMON, VotingEscrow (veNFT)
│   │   ├── treasury/              # Treasury, PSM (Peg Stability Module)
│   │   ├── dex/                   # DEXFactory, DEXPair, DEXRouter
│   │   ├── governance/            # GaugeController, BoostController
│   │   ├── launchpad/             # ProjectRegistry, IssuanceController
│   │   ├── presale/               # RWABondNFT, RemintController
│   │   └── oracle/                # RWAPriceOracle (Chainlink + NAV)
│   ├── test/                      # Foundry 测试套件 (6 维度覆盖)
│   └── script/                    # 部署脚本
│
└── nft-paimon-frontend/           # Next.js 14 前端 (TypeScript)
    ├── src/
    │   ├── app/                   # App Router 页面
    │   ├── components/            # React 组件 (Material Design 3)
    │   ├── hooks/                 # 自定义 React hooks
    │   ├── config/                # Web3 配置 (wagmi + viem)
    │   └── types/                 # TypeScript 类型定义
    └── __tests__/                 # Jest 单元测试
```

### 技术栈 / Tech Stack

**智能合约 / Smart Contracts**:
- Solidity 0.8.20
- Foundry (Forge) for testing
- OpenZeppelin contracts (SafeERC20, Ownable, ReentrancyGuard)
- Chainlink VRF v2 (随机数) / Chainlink VRF v2 (randomness)

**前端 / Frontend**:
- Next.js 14 (App Router)
- TypeScript
- wagmi v2 + viem (Web3 interactions)
- RainbowKit (wallet connection)
- Material-UI v5 (暖色主题 / warm color theme)
- TanStack Query (server state)
- next-intl (中英双语 / bilingual EN+CN)

---

## 🚀 快速开始 / Quick Start

### 前置要求 / Prerequisites

- Node.js 18+ (前端 / frontend)
- Foundry (智能合约 / smart contracts)
- Git

### 安装步骤 / Installation

**1. 克隆仓库 / Clone repository**:
```bash
git clone https://github.com/rocky2431/paimon-dex-protocol.git
cd paimon-dex-protocol
```

**2. 智能合约开发 / Smart Contract Development**:
```bash
cd paimon-rwa-contracts

# 安装依赖 / Install dependencies
forge install

# 编译合约 / Compile contracts
forge build

# 运行测试 / Run tests
forge test

# 运行特定测试文件 / Run specific test file
forge test --match-path test/core/VotingEscrowPaimon.t.sol

# 生成覆盖率报告 / Generate coverage report
forge coverage

# Gas 报告 / Gas report
forge test --gas-report
```

**3. 前端开发 / Frontend Development**:
```bash
cd nft-paimon-frontend

# 安装依赖 / Install dependencies
npm install

# 启动开发服务器（端口 4000）/ Start dev server (port 4000)
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

- 分支命名 / Branch naming: `feat/task-{id}-{description}`
- 提交规范 / Commit format: Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`)
- 合并前测试 / Test before merge
- 主网部署需要多签 / Multi-sig required for mainnet deployment

---

## 🧪 测试 / Testing

### 智能合约测试 / Smart Contract Tests

**当前状态 / Current Status**: **97.4%** 通过率 (1009/1036 tests passing)

**6 维度测试覆盖 / Six-Dimensional Test Coverage**:
1. **功能测试 / Functional**: 核心业务逻辑 / Core business logic
2. **边界测试 / Boundary**: 边缘情况（零值、最大值、空数组）/ Edge cases
3. **异常测试 / Exception**: 错误处理和回滚 / Error handling and reverts
4. **性能测试 / Performance**: Gas 基准（如 RWABondNFT 铸造 <250K gas）/ Gas benchmarks
5. **安全测试 / Security**: 重入、访问控制、预言机操纵 / Reentrancy, access control, oracle manipulation
6. **兼容性测试 / Compatibility**: USDT（非标准 ERC20）、跨合约交互 / USDT (non-standard ERC20), cross-contract interactions

**关键不变量 / Critical Invariants**:
- PSM: `USDC balance >= USDP total supply` (1:1 backing)
- DEX: `K = reserve0 × reserve1` (constant product, can only increase)
- Treasury: `Total USDP minted <= Total RWA value × LTV` (collateralization)
- VotingEscrow: `sum(voting_power) <= sum(locked_PAIMON)` (no phantom voting)

**运行测试 / Run Tests**:
```bash
cd paimon-rwa-contracts

# 所有测试 / All tests
forge test

# 详细输出（查看 console.log）/ Verbose output (see console.log)
forge test -vvv

# 仅核心模块 / Core modules only
forge test --match-path "test/core/*"

# 覆盖率 / Coverage
forge coverage --ir-minimum
```

### 前端测试 / Frontend Tests

**当前状态 / Current Status**: **93.4%** 通过率 (844/904 tests passing)

**测试结构 / Test Structure**:
- 单元测试 / Unit tests: `__tests__/components/`, `__tests__/hooks/`
- Mock: `__mocks__/` (wagmi, next/navigation)
- 配置 / Setup: `jest.setup.js`, `jest.config.js`

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
- 主网 / Mainnet (ChainID 56): https://bsc-dataseed.binance.org/
- 测试网 / Testnet (ChainID 97): https://data-seed-prebsc-1-s1.binance.org:8545/

### 部署顺序 / Deployment Sequence

1. USDP token
2. PAIMON token
3. esPAIMON token
4. VotingEscrow (veNFT)
5. USDPVault
6. Treasury + RWAPriceOracle
7. PSM (Peg Stability Module)
8. DEXFactory + DEXRouter
9. BoostController
10. GaugeController
11. EmissionManager
12. RewardDistributor
13. RWABondNFT (+ Chainlink VRF)
14. ProjectRegistry + IssuanceController
15. RemintController + SettlementRouter

### 部署脚本 / Deployment Script

```bash
cd paimon-rwa-contracts

# 测试网部署 / Testnet deployment
forge script script/DeployComplete.s.sol \
  --rpc-url $BSC_TESTNET_RPC_URL \
  --broadcast \
  --verify
```

### 部署后任务 / Post-Deployment Tasks

1. 更新前端合约地址 / Update frontend contract addresses (`src/config/chains/testnet.ts`)
2. 测试 veNFT 锁定流程 / Test veNFT lock flow
3. 测试 Treasury 存款流程 / Test Treasury deposit flow
4. 验证 Core Web Vitals (LCP/INP/CLS)

---

## 📚 文档 / Documentation

**项目文档 / Project Documentation**:
- **智能合约架构 / Contract Architecture**: [`paimon-rwa-contracts/ARCHITECTURE.md`](paimon-rwa-contracts/ARCHITECTURE.md)
- **开发指南 / Development Guide**: [`paimon-rwa-contracts/DEVELOPMENT.md`](paimon-rwa-contracts/DEVELOPMENT.md)
- **技术白皮书 / Technical Whitepaper**: [待添加 / Coming soon]
- **API 文档 / API Documentation**: [待添加 / Coming soon]

---

## 🔐 安全最佳实践 / Security Best Practices

所有智能合约遵循以下原则 / All smart contracts follow these principles:

1. **重入保护 / Reentrancy Protection**: 所有状态修改函数使用 `nonReentrant` / Use `nonReentrant` on all state-changing functions
2. **SafeERC20**: 使用 OpenZeppelin 的 SafeERC20（兼容 USDT）/ Use OpenZeppelin's SafeERC20 (USDT compatible)
3. **检查-效果-交互 / Check-Effects-Interactions**: 外部调用前更新状态 / Update state before external calls
4. **精度优化 / Precision Optimization**: 先乘后除以最小化精度损失 / Multiply before divide to minimize precision loss
5. **访问控制 / Access Control**: 使用 `onlyOwner` 或自定义修饰符 / Use `onlyOwner` or custom modifiers
6. **暂停机制 / Pausability**: 关键合约实现紧急暂停 / Critical contracts implement emergency pause

**最近的安全修复 / Recent Security Fixes** (SEC-003, SEC-005):
- ✅ 添加重入保护到所有存款/提款函数 / Added reentrancy guards to all deposit/withdraw functions
- ✅ 迁移到 SafeERC20 / Migrated to SafeERC20
- ✅ 集成 Chainlink VRF 用于不可预测的随机数 / Integrated Chainlink VRF for unpredictable randomness
- ✅ 修复 16 个先除后乘的精度问题 / Fixed 16 divide-before-multiply precision issues

---

## 🤝 贡献 / Contributing

欢迎贡献！请遵循以下步骤 / Contributions are welcome! Please follow these steps:

1. Fork 本仓库 / Fork the repository
2. 创建功能分支 / Create feature branch: `git checkout -b feat/task-123-new-feature`
3. 遵循 SOLID 原则 / Follow SOLID principles
4. 添加 6 维度测试覆盖 / Add 6-dimensional test coverage
5. 提交更改 / Commit changes: `git commit -m "feat: add new feature"`
6. 推送到分支 / Push to branch: `git push origin feat/task-123-new-feature`
7. 创建 Pull Request / Create Pull Request

**代码质量标准 / Code Quality Standards**:
- ✅ SOLID/DRY/KISS/YAGNI 原则 / SOLID/DRY/KISS/YAGNI principles
- ✅ 函数 <50 行 / Functions <50 lines
- ✅ 测试覆盖率 ≥80% / Test coverage ≥80%
- ✅ 所有公共函数都有注释 / All public functions have comments

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
- **官方网站 / Official Website**: https://paimon.finance
- **官方文档 / Official Docs**: [待添加 / Coming soon]
- **社区 / Community**: [待添加 / Coming soon]

---

**© 2025 Paimon.finance - Bridging Real World Assets with DeFi**
