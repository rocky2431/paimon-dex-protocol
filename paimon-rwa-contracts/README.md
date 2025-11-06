# Paimon.dex Smart Contracts

**RWA Launchpad + veNFT Governance DEX + Treasury-Backed USDP Synthetic Asset Protocol**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-orange.svg)](https://soliditylang.org/)
[![Tests](https://img.shields.io/badge/tests-980%2F990%20passing-brightgreen.svg)]()
[![Foundry](https://img.shields.io/badge/Built%20with-Foundry-FFDB1C.svg)](https://getfoundry.sh/)

---

## 概述

Paimon.dex 是一个综合 DeFi 协议,结合 **RWA (Real World Asset)** 发行、**veNFT 治理 DEX** 流动性供给和 **国库支持的合成资产** 形成统一的治理飞轮。

**"面向 RWA 的发行、流动性与治理一体化协议"**

### 核心组件

| 组件 | 描述 |
|------|------|
| **USDP** | 由 Treasury RWA 持仓支持的合成稳定币 |
| **PSM** | USDC ↔ USDP 1:1 兑换模块 (0.1% 费率) |
| **Treasury** | RWA 抵押金库 (T1/T2/T3 分层 LTV: 80%/65%/50%) |
| **PAIMON** | 治理代币 (总量 ~10B,三阶段排放) |
| **esPAIMON** | 归属代币 (365 天线性解锁,提前退出有惩罚,每周 Boost 衰减 1%) |
| **vePAIMON** | 投票托管 NFT (锁定 PAIMON 1周~4年获得,投票权随时间线性衰减,ERC-721 可转让) |
| **EmissionManager** | 三阶段排放调度器 (固定→指数衰减→固定) |
| **EmissionRouter** | 四通道预算分发 (Debt/LP/Stability/Eco) |
| **GaugeController** | 流动性挖矿权重控制 |
| **DEX** | Uniswap V2 风格 AMM (定制费率分配) |
| **Launchpad** | RWA 项目合规发行平台 |

---

## 架构亮点

### 统一基础设施

**Governable 治理基类**:
- 所有核心合约继承统一治理接口
- 基于 OpenZeppelin AccessControlEnumerable
- 支持多治理主体 (Timelock/Multi-sig)
- 治理转移钩子 (`_afterGovernanceTransfer`)
- 兼容 Ownable 接口 (`owner()`, `transferOwnership()`)

**ProtocolConstants 常量库**:
- `BASIS_POINTS = 10_000` (百分比基准)
- `WEEK = 7 days` (治理周期)
- `EPOCH_DURATION = 7 days` (Epoch 长度)
- 消除跨合约魔法数字

**ProtocolRoles 角色定义**:
- `GOVERNANCE_ADMIN_ROLE` - 治理管理员
- `EMISSION_POLICY_ROLE` - 排放策略管理员
- `INCENTIVE_MANAGER_ROLE` - 激励管理员
- `TREASURY_MANAGER_ROLE` - 国库管理员

**EpochUtils 时间计算工具**:
- `computeEpoch(start, duration, timestamp)` - 计算 Epoch
- `currentEpoch(start, duration)` - 当前 Epoch
- 消除重复时间计算逻辑

### 排放架构

**EmissionManager** (三阶段调度):
- **Phase A** (Week 1-12): 固定 37.5M PAIMON/周
- **Phase B** (Week 13-248): 指数衰减 0.985^t (37.5M → 4.327M)
  - 使用 236 元素查找表优化 gas (O(1) 查询)
- **Phase C** (Week 249-352): 固定 4.327M PAIMON/周
- 总排放量: ~10B PAIMON (6.77 年)

**EmissionRouter** (四通道分发):
```
EmissionManager.getWeeklyBudget(week)
         ↓
EmissionRouter.routeWeek(week)
         ↓
四通道转账:
  • Debt Mining (债务挖矿)
  • LP Pairs (AMM 流动性)
  • Stability Pool (稳定池)
  • Ecosystem (生态基金)
```

**通道分配比例** (阶段动态):
| 阶段 | Debt | LP Total | Eco | 备注 |
|-----|------|----------|-----|------|
| Phase A (Week 1-12) | 30% | 60% | 10% | 引导流动性 |
| Phase B (Week 13-248) | 50% | 37.5% | 12.5% | 过渡到债务聚焦 |
| Phase C (Week 249-352) | 55% | 35% | 10% | 可持续长期 |

**LP 二级分割** (治理可调):
- 默认: LP Pairs 60%,Stability Pool 40%
- 通过 `EmissionManager.setLpSplitParams()` 调整
- 必须总和 100% (链上验证)

---

## 快速开始

### 环境要求

```bash
# Foundry (推荐)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Node.js (可选,用于部署脚本)
node >= 18.0.0
npm >= 9.0.0
```

### 安装

```bash
# 克隆仓库
git clone https://github.com/rocky2431/paimon-dex-protocol.git
cd paimon-rwa-contracts

# 安装 Foundry 依赖
forge install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填写 PRIVATE_KEY、BSC_TESTNET_RPC_URL、BSCSCAN_API_KEY
```

### 编译和测试

```bash
# 编译合约
forge build

# 运行测试
forge test

# 详细输出 (显示 console.log)
forge test -vvv

# 测试覆盖率
forge coverage

# Gas 报告
forge test --gas-report
```

### 部署到 BSC 测试网

```bash
# 加载环境变量
source .env

# 部署全套合约
forge script script/DeployComplete.s.sol \
  --rpc-url $BSC_TESTNET_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $BSCSCAN_API_KEY \
  -vvvv
```

---

## 项目结构

```
paimon-rwa-contracts/
├── src/
│   ├── common/                        # 统一基础设施
│   │   ├── Governable.sol            # 治理基类
│   │   ├── ProtocolConstants.sol     # 协议常量
│   │   ├── ProtocolRoles.sol         # 角色定义
│   │   └── EpochUtils.sol            # 时间计算工具
│   ├── core/
│   │   ├── USDP.sol                  # 合成稳定币
│   │   ├── PAIMON.sol                # 治理代币
│   │   └── VotingEscrow.sol          # vePAIMON NFT
│   ├── treasury/
│   │   ├── Treasury.sol              # RWA 抵押金库
│   │   ├── PSM.sol                   # 锚定稳定模块
│   │   ├── PSMParameterized.sol      # 参数化 PSM (支持 6/18 decimals)
│   │   ├── SavingRate.sol            # USDP 储蓄利率
│   │   └── RWAPriceOracle.sol        # 双源预言机
│   ├── dex/
│   │   ├── DEXFactory.sol            # AMM 工厂
│   │   ├── DEXPair.sol               # 交易对
│   │   └── DEXRouter.sol             # 路由器
│   ├── governance/
│   │   ├── EmissionManager.sol       # 排放调度器
│   │   ├── EmissionRouter.sol        # 四通道分发器
│   │   ├── GaugeController.sol       # 流动性权重控制
│   │   └── RewardDistributor.sol     # 奖励分发器
│   ├── launchpad/
│   │   ├── ProjectRegistry.sol       # 项目注册表
│   │   └── IssuanceController.sol    # 发行控制器
│   └── presale/
│       ├── RWABondNFT.sol           # 债券 NFT
│       └── RemintController.sol      # Remint 控制器
├── test/                             # 测试套件
│   ├── core/                         # 核心合约测试
│   ├── governance/                   # 治理测试
│   ├── treasury/                     # 国库测试
│   └── invariant/                    # 不变量测试
├── script/                           # 部署脚本
│   ├── DeployComplete.s.sol         # 完整部署
│   └── DEPLOYMENT.md                # 部署文档
├── audit-package/                    # 审计包
│   ├── contracts/                    # 同步的合约代码
│   └── docs/                         # 审计文档
└── scripts/
    └── sync_audit_package.sh        # 审计包同步脚本
```

---

## 测试状态

### 测试统计

- **总测试数**: 990
- **通过**: 980 (98.99%)
- **失败**: 10 (Gas 基准测试,非关键)
- **覆盖率**: ~85% 行覆盖, ~90% 函数覆盖

### 关键测试套件

| 合约套件 | 测试数 | 状态 |
|---------|-------|------|
| **EmissionManager** | 48 | ✅ 全部通过 |
| **EmissionRouter** | 4 | ✅ 全部通过 |
| **PSMParameterized** | 12 | ✅ 全部通过 |
| **Treasury** | 39 | ✅ 全部通过 |
| **VotingEscrow** | 28 | ✅ 全部通过 |
| **GaugeController** | 36 | ✅ 全部通过 |
| **DEX (Factory/Pair/Router)** | 67 | ✅ 全部通过 |
| **Launchpad (Registry/Issuance)** | 68 | ✅ 全部通过 |

### 不变量测试

**PSM 不变量**:
```solidity
invariant_PSM_USDCBacking: USDC reserve >= USDP supply (1:1 backing)
```

**DEX 不变量**:
```solidity
invariant_DEX_ConstantProduct: K = reserve0 × reserve1 (constant product)
invariant_DEX_KMonotonicity: K only increases after swaps (fee accumulation)
```

**Treasury 不变量**:
```solidity
invariant_Treasury_Collateralization: Total USDP minted <= Total RWA value × LTV
```

---

## 安全特性

### 合约安全

- ✅ OpenZeppelin 5.x 库 (ReentrancyGuard, SafeERC20, Pausable, AccessControl)
- ✅ Chainlink VRF v2 随机性 (骰子游戏)
- ✅ 双源预言机定价 (Chainlink + 托管方 NAV)
- ✅ 熔断机制 (>20% 价格偏差触发暂停)
- ✅ Multi-sig 钱包 (3-of-5 用于 Treasury)
- ✅ Timelock 治理 (参数修改 48 小时延迟)
- ✅ 所有状态修改函数使用 `nonReentrant` 防重入
- ✅ 所有代币转账使用 `SafeERC20` (兼容 USDT)

### 精度优化

所有价值计算遵循 **先乘后除** 原则:

```solidity
// ✅ 正确: 单次除法
uint256 result = (amount × price × ltvRatio) / (1e18 × BASIS_POINTS);

// ❌ 错误: 多次除法累积精度损失
uint256 step1 = amount × price / 1e18;
uint256 result = step1 × ltvRatio / BASIS_POINTS;
```

16 处精度优化 (SEC-005) 已全部修复。

---

## 部署信息

### 目标网络

**BSC Mainnet** (ChainID 56):
- RPC: https://bsc-dataseed.binance.org/
- Explorer: https://bscscan.com/
- Gas 价格: ~3 Gwei

**BSC Testnet** (ChainID 97):
- RPC: https://data-seed-prebsc-1-s1.binance.org:8545/
- Explorer: https://testnet.bscscan.com/
- Faucet: https://testnet.bnbchain.org/faucet-smart

### 部署顺序

1. **基础设施**: Governable 基类 (抽象合约,不部署)
2. **代币**: USDP, PAIMON
3. **DEX**: DEXFactory, DEXRouter
4. **稳定币**: PSMParameterized
5. **国库**: Treasury, RWAPriceOracle
6. **治理**: VotingEscrow, GaugeController
7. **排放**: EmissionManager, EmissionRouter
8. **启动板**: ProjectRegistry, IssuanceController
9. **预售**: RWABondNFT, RemintController (+ Chainlink VRF)

完整部署流程见 [script/DEPLOYMENT.md](script/DEPLOYMENT.md)。

---

## 文档

### 核心文档

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - 系统架构详解
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - 开发指南
- **[script/DEPLOYMENT.md](script/DEPLOYMENT.md)** - 部署文档
- **[.ultra/docs/usdp-camelot-lybra-system-guide.md](.ultra/docs/usdp-camelot-lybra-system-guide.md)** - 核心设计文档

### 审计资料

- **[audit-package/README.md](audit-package/README.md)** - 审计包概览
- **[audit-package/docs/](audit-package/docs/)** - 审计相关文档

---

## 贡献

欢迎社区贡献！请遵循以下流程:

1. Fork 仓库
2. 创建特性分支 (`git checkout -b feat/amazing-feature`)
3. 编写测试 (覆盖率 >80%)
4. 提交符合 Conventional Commits 的消息 (`feat:`, `fix:`, `docs:`)
5. 推送分支 (`git push origin feat/amazing-feature`)
6. 创建 Pull Request

**代码质量标准**:
- 遵循 SOLID 原则
- 函数 <50 行
- 测试覆盖率 >80%
- 所有公共函数有 NatSpec 文档

---

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

---

## 联系方式

- **GitHub**: https://github.com/rocky2431/paimon-dex-protocol
- **Issues**: https://github.com/rocky2431/paimon-dex-protocol/issues
- **Email**: rocky243@example.com

---

## 致谢

**灵感来源**:
- **Velodrome Finance** - veNFT 治理 DEX 模型
- **Lybra Finance** - 抵押生息资产铸稳定币
- **Camelot DEX** - ve(3,3) 投票 + Gauge + Bribe
- **MakerDAO** - CDP 抵押系统
- **Curve Finance** - veToken 治理

**构建工具**: Foundry, OpenZeppelin, Chainlink

---

**当前版本**: v3.3.0
**最后更新**: 2025-11-06
**审计状态**: 准备中 (测试通过率 98.99%, 覆盖率 ~85%)
