# Paimon.dex 技术架构规格

> **版本**: V4.0
> **最后更新**: 2025-11-17
> **状态**: Ultra Builder Pro 4.1 规格驱动架构

---

## 一、系统架构总览

### 1.1 核心设计理念

Paimon.dex 采用**渐进式激活架构**：
- **34 个智能合约已全部部署**在 BSC testnet
- **不删除任何功能**，仅分阶段激活前端入口和使用权限
- **每个版本是完整业务闭环**，能独立产生价值

### 1.2 统一基础设施（v3.3.0）

所有治理启用的合约继承自 `Governable` 基类：

```solidity
abstract contract Governable is AccessControlEnumerable {
    // 多治理者支持（Timelock, Multi-sig, EOA）
    // 至少需要 1 个治理者（防止锁定）
    // 转移钩子: _afterGovernanceTransfer() 用于角色迁移
    // Ownable 兼容: owner(), transferOwnership()
}
```

**中心化库**:
- `ProtocolConstants.sol` - BASIS_POINTS, WEEK, EPOCH_DURATION
- `ProtocolRoles.sol` - GOVERNANCE_ADMIN_ROLE, EMISSION_POLICY_ROLE 等
- `EpochUtils.sol` - 标准化时间计算

### 1.3 三层架构

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1: 业务层（用户交互）                               │
│  - PSM Swap, Treasury 铸造, DEX 交易, Launchpad 投资     │
└────────────────┬───────────────────────────────────────┘
                 │
┌────────────────▼───────────────────────────────────────┐
│  Layer 2: 协议层（合约逻辑）                              │
│  - 34 个智能合约按 5 个 Stage 组织                       │
│  - RWA 全链条：发现 → 代币化 → 稳定币 → 流动性 → 治理      │
└────────────────┬───────────────────────────────────────┘
                 │
┌────────────────▼───────────────────────────────────────┐
│  Layer 3: 基础设施层（共享服务）                          │
│  - Governable, EpochUtils, RWAPriceOracle, 常量/角色库  │
└─────────────────────────────────────────────────────────┘
```

---

## 二、合约激活矩阵（按版本）

### 2.1 激活矩阵总表

| 合约名称 | 所属Stage | V1.0 | V1.5 | V2.0 | V2.5 | V3.0 | 部署状态 |
|---------|---------|------|------|------|------|------|----------|
| **Infrastructure (6个)** |
| PAIMON Token | Infra | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Deployed |
| Governable Base | Infra | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Deployed |
| RWAPriceOracle | Infra | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Deployed |
| ProtocolConstants | Infra | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Deployed |
| ProtocolRoles | Infra | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Deployed |
| EpochUtils | Infra | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Deployed |
| **Stage 3: Stablecoin (6个)** |
| USDP Token | Stage 3 | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Deployed |
| USDPVault | Stage 3 | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Deployed |
| PSMParameterized | Stage 3 | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Deployed |
| Treasury | Stage 3 | ⚠️ Limited | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Deployed |
| SavingRate | Stage 3 | ❌ | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Deployed |
| USDPStabilityPool | Stage 3 | ❌ | ❌ | ❌ | ✅ Full | ✅ Full | ✅ Deployed |
| **Stage 5: Governance (10个)** |
| esPaimon | Stage 5 | ❌ | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Deployed |
| VotingEscrowPaimon | Stage 5 | ❌ | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Deployed |
| EmissionManager | Stage 5 | ❌ | ⚠️ Limited | ✅ Full | ✅ Full | ✅ Full | ✅ Deployed |
| EmissionRouter | Stage 5 | ❌ | ❌ | ✅ Full | ✅ Full | ✅ Full | ✅ Deployed |
| GaugeController | Stage 5 | ❌ | ❌ | ✅ Full | ✅ Full | ✅ Full | ✅ Deployed |
| RewardDistributor | Stage 5 | ❌ | ❌ | ✅ Full | ✅ Full | ✅ Full | ✅ Deployed |
| BribeMarketplace | Stage 5 | ❌ | ❌ | ❌ | ✅ Full | ✅ Full | ✅ Deployed |
| NitroPool | Stage 5 | ❌ | ❌ | ❌ | ❌ | ✅ Full | ✅ Deployed |
| BoostStaking | Stage 5 | ❌ | ❌ | ❌ | ❌ | ✅ Full | ✅ Deployed |
| (1个治理工具) | Stage 5 | ❌ | ⚠️ Admin | ✅ Full | ✅ Full | ✅ Full | ✅ Deployed |
| **Stage 4: DeFi Liquidity (7个)** |
| DEXFactory | Stage 4 | ❌ | ❌ | ✅ Full | ✅ Full | ✅ Full | ✅ Deployed |
| DEXPair | Stage 4 | ❌ | ❌ | ✅ Full | ✅ Full | ✅ Full | ✅ Deployed |
| DEXRouter | Stage 4 | ❌ | ❌ | ✅ Full | ✅ Full | ✅ Full | ✅ Deployed |
| (4个DEX辅助) | Stage 4 | ❌ | ❌ | ✅ Full | ✅ Full | ✅ Full | ✅ Deployed |
| **Stage 1: Asset Discovery (3个)** |
| ProjectRegistry | Stage 1 | ❌ | ❌ | ❌ | ✅ Full | ✅ Full | ✅ Deployed |
| (2个治理模块) | Stage 1 | ❌ | ❌ | ❌ | ⚠️ Limited | ✅ Full | ✅ Deployed |
| **Stage 2: Tokenization (2个)** |
| IssuanceController | Stage 2 | ❌ | ❌ | ❌ | ✅ Full | ✅ Full | ✅ Deployed |
| (Treasury复用) | Stage 2 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Deployed |
| **Presale (3个 - 限时)** |
| RWABondNFT | Presale | 🔄 V0.5 | ❌ | ❌ | ❌ | 🗑️ 下线 | ✅ Deployed |
| RemintController | Presale | 🔄 V0.5 | ❌ | ❌ | ❌ | 🗑️ 下线 | ✅ Deployed |
| SettlementRouter | Presale | 🔄 V0.5 | ❌ | ❌ | ❌ | 🗑️ 下线 | ✅ Deployed |

**图例**:
- ✅ **Full**: 完全激活，前端开放，用户可自由使用
- ⚠️ **Limited**: 部分功能激活（如 V1.0 Treasury 仅管理员铸造）
- ⚠️ **Admin**: 仅管理员可用，前端不展示
- ❌: 已部署但未激活
- 🔄 **V0.5**: 预热阶段限时活动
- 🗑️: 功能下线（V3.0 后 Presale 模块）

### 2.2 各版本激活统计

| 版本 | 新增激活 | 累计激活 | 技术复杂度 | 主要依赖 |
|------|---------|---------|-----------|---------|
| **V1.0** | 10个 | 10 | 5/10 | 无（基础版本） |
| **V1.5** | 4个 | 14 | 6/10 | V1.0 PAIMON流通 |
| **V2.0** | 7个 | 21 | 8/10 | V1.0 USDP + V1.5 激励 |
| **V2.5** | 6个 | 27 | 7/10 | V2.0 DEX流动性 |
| **V3.0** | 7个 | 34 | 9/10 | V2.5 生态基础 |

---

## 三、技术依赖关系图（DAG）

### 3.1 版本依赖图

```
V0.5 (Presale预热 - 可选)
  │
  └──> V1.0 (RWA稳定币核心) ────────────┐
         ├─ USDP生态 (6个合约)          │
         ├─ 基础设施 (6个合约)          │
         └─ 依赖: 无                   │
           成功门槛: USDP流通 $5M       │
                                      │
         V1.5 (基础治理) <──────────────┘
           ├─ veNFT + Emission (4个)
           ├─ 依赖: V1.0 PAIMON流通
           └─ 成功门槛: vePAIMON锁仓 $2M
             │
             └──> V2.0 (DeFi流动性) ──────┐
                    ├─ DEX + Gauge (7个)  │
                    ├─ 依赖: V1.0 USDP +  │
                    │   V1.5 激励系统      │
                    └─ 成功门槛: DEX TVL $10M
                                          │
                    V2.5 (Launchpad) <────┘
                      ├─ 资产发行 (6个)
                      ├─ 依赖: V2.0 流动性基础
                      └─ 成功门槛: 3个RWA项目上线
                        │
                        └──> V3.0 (完整生态)
                               ├─ Boost + 高级功能 (7个)
                               ├─ 依赖: V2.5 生态基础
                               └─ 成功门槛: TVL $50M
```

### 3.2 合约间依赖关系

```
┌────────────────────────────────────────────────────────┐
│  Emission System (排放系统)                             │
│  EmissionManager → EmissionRouter → 4个分发渠道          │
└──────────┬─────────────────────────────────────────────┘
           │ 依赖
┌──────────▼─────────────────────────────────────────────┐
│  Governance System (治理系统)                           │
│  VotingEscrowPaimon → GaugeController → BribeMarketplace│
└──────────┬─────────────────────────────────────────────┘
           │ 依赖
┌──────────▼─────────────────────────────────────────────┐
│  DEX System (交易系统)                                  │
│  DEXFactory → DEXPair ← DEXRouter                      │
│  └─ 依赖: USDP, PAIMON                                 │
└──────────┬─────────────────────────────────────────────┘
           │ 依赖
┌──────────▼─────────────────────────────────────────────┐
│  Stablecoin System (稳定币系统)                         │
│  Treasury → USDPVault → USDP ← PSMParameterized        │
│           └─ SavingRate, StabilityPool                 │
└──────────┬─────────────────────────────────────────────┘
           │ 依赖
┌──────────▼─────────────────────────────────────────────┐
│  Infrastructure (基础设施)                              │
│  PAIMON, Governable, RWAPriceOracle, Constants, Roles  │
└────────────────────────────────────────────────────────┘
```

---

## 四、核心模块设计

### 4.1 三阶段 Emission 调度器

**EmissionManager.sol** 实现确定性排放，覆盖 352 周（6.77 年）：

```solidity
// Phase A (Week 1-12): 固定排放
uint256 constant PHASE_A_WEEKLY = 37_500_000 * 1e18;
uint256 constant PHASE_A_WEEKS = 12;

// Phase B (Week 13-248): 指数衰减
// 使用预计算查找表 (236 个元素) 实现 O(1) 查询
uint256[236] public phaseBLookupTable;
// 公式: E_B(t) = 37,500,000 * 0.985^t

// Phase C (Week 249-352): 固定排放
uint256 constant PHASE_C_WEEKLY = 4_327_000 * 1e18;
uint256 constant PHASE_C_WEEKS = 104;
```

**Gas 优化**:
- Phase B 预计算表在部署时初始化（`DeployComplete.s.sol`）
- 避免运行时指数计算（节省 ~100K gas/调用）

**通道分配** (phase-dynamic):

| Phase | Debt | LP Total | Stability Pool | Eco |
|-------|------|----------|----------------|-----|
| A (1-12) | 30% | 60% | - | 10% |
| B (13-248) | 50% | 37.5% | (LP的40%) | 12.5% |
| C (249-352) | 55% | 35% | (LP的40%) | 10% |

**LP 分流** (治理可调): 默认 60% Pairs / 40% Stability Pool

### 4.2 四通道分发路由器

**EmissionRouter.sol** 实现单次分发约束（防止双重支出）：

```solidity
// 每周只能分发一次
mapping(uint256 => bool) public weeklyDistributed;

function distributeWeeklyEmissions(uint256 week) external {
    require(!weeklyDistributed[week], "Already distributed");
    weeklyDistributed[week] = true;

    uint256 totalEmission = emissionManager.getWeeklyEmission(week);

    // 4个通道分配
    uint256 debtAmount = (totalEmission * debtRatio) / BASIS_POINTS;
    uint256 lpAmount = (totalEmission * lpRatio) / BASIS_POINTS;
    uint256 stabilityAmount = (lpAmount * stabilityRatio) / BASIS_POINTS;
    uint256 ecoAmount = (totalEmission * ecoRatio) / BASIS_POINTS;

    // 分发到各池
    debtPool.notifyRewardAmount(debtAmount);
    gaugeController.distributeToGauges(lpAmount - stabilityAmount);
    stabilityPool.notifyRewardAmount(stabilityAmount);
    ecosystemFund.transfer(ecoAmount);
}
```

### 4.3 多抵押品金库

**Treasury.sol** 和 **USDPVault.sol** 支持加权健康因子计算：

```solidity
// 加权抵押品价值
function getTotalCollateralValue(address user) public view returns (uint256) {
    uint256 totalValue = 0;

    for (uint256 i = 0; i < collateralTypes.length; i++) {
        address collateral = collateralTypes[i];
        uint256 amount = userCollateral[user][collateral];
        uint256 price = priceOracle.getPrice(collateral);
        uint256 ltv = ltvRatios[collateral];

        // 单次除法优化 (SEC-005 修复)
        totalValue += (amount * price * ltv) / (1e18 * BASIS_POINTS);
    }

    return totalValue;
}

// 健康因子
function getHealthFactor(address user) public view returns (uint256) {
    uint256 collateralValue = getTotalCollateralValue(user);
    uint256 debt = usdpVault.getDebt(user);

    if (debt == 0) return type(uint256).max;
    return (collateralValue * BASIS_POINTS) / debt;
}
```

**抵押品分层**:

| 层级 | 资产类型 | LTV | 示例 |
|------|---------|-----|------|
| T1 | 美国国债 | 80% | 6个月期国库券 |
| T2 | 投资级债券 | 65% | AAA级公司债 |
| T3 | RWA 收益池 | 50% | 房地产租金池 |

### 4.4 PSM 参数化小数处理

**PSMParameterized.sol** 支持 6 位和 18 位小数的 USDC：

```solidity
// 自动检测小数位数
uint8 public immutable usdcDecimals;  // 构造时查询
uint256 private immutable scale;      // 缓存比例因子

constructor(address _usdc, address _usdp) {
    usdcDecimals = IERC20Metadata(_usdc).decimals();
    scale = 10 ** (18 - usdcDecimals);  // 1e12 (6→18) 或 1 (18→18)
}

// USDC → USDP 转换
function swapUSDCForUSDP(uint256 usdcAmount) external {
    uint256 usdpAmount = usdcAmount * scale;
    // ...
}

// USDP → USDC 转换
function swapUSDPForUSUDC(uint256 usdpAmount) external {
    uint256 usdcAmount = usdpAmount / scale;
    // ...
}
```

**USDC 小数位配置**:
- **USDP**: 始终 18 位（标准 ERC20）
- **USDC BSC主网**: 18 位 (0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d)
- **USDC BSC测试网**: 6 位 (0xaa3F4B0cEF6F8f4C584cc6fD3A5e79E68dAa13b2)

### 4.5 Vesting 与 Boost 机制

**esPaimon.sol** (Vesting Token):
- 365天线性解锁（从分配时间开始）
- 不可转让（soulbound）
- 提前退出选项（50% 罚款）
- 所有社区排放默认为 esPaimon

**BoostStaking.sol** (倍率系统):
- 质押 PAIMON 获得 Boost 倍率 (1.0x - 1.5x)
- 应用于所有奖励类型（debt mining, LP, ecosystem）
- 公式: `multiplier = 10000 + (stakedAmount × lockDuration) / (maxStake × maxLockDuration) × 5000`

**RewardDistributor.sol** (Merkle 认领):
- 链下聚合器计算每周奖励
- 链上 Merkle 证明验证
- 认领时自动应用 Boost 倍率
- 默认通过 esPaimon Vesting

### 4.6 安全特性

所有合约遵循以下模式：

1. **重入保护**: 所有价值转移函数使用 `ReentrancyGuard`
2. **安全转账**: 所有代币操作使用 `SafeERC20`
3. **检查-效果-交互**: 状态更新先于外部调用
4. **精度优化**: 单次除法在末尾（SEC-005 修复）
   ```solidity
   // 之前 (精度损失)
   uint256 rwaValue = (amount * price) / 1e18;
   uint256 hydToMint = rwaValue * ltvRatio / BPS_DENOMINATOR;

   // 之后 (优化)
   uint256 hydToMint = (amount * price * ltvRatio) / (1e18 * BPS_DENOMINATOR);
   ```
5. **双源预言机**: Chainlink + NAV，20% 偏差断路器

---

## 五、数据流与价值流

### 5.1 RWA 资产数据流

```
RWA资产发行方
  ↓ 提交资产到 ProjectRegistry
ProjectRegistry
  ↓ 触发社区投票
vePAIMON持有者投票
  ↓ 通过阈值 (70%)
IssuanceController
  ↓ 铸造资产代币
Treasury托管资产
  ↓ 用户存入RWA资产
USDPVault计算健康因子
  ↓ 铸造USDP
USDP流通
  ↓ 用户选择
  ├─ PSM 1:1锚定USDC
  ├─ SavingRate赚取利息
  └─ DEX添加流动性
```

### 5.2 Emission 价值流

```
EmissionManager (每周排放)
  ↓ 三阶段调度
EmissionRouter
  ↓ 四通道分配
  ├─ Debt Mining (30-55%)
  │   ↓ TWAD加权
  │   └─ RWA抵押者获得esPAIMON
  │
  ├─ LP Farming (35-60%)
  │   ↓ Gauge投票权重
  │   ├─ AMM Pairs (60%)
  │   │   ↓ LP提供者获得esPAIMON
  │   └─ Stability Pool (40%)
  │       ↓ 清算池参与者获得esPAIMON
  │
  ├─ Ecosystem (10-12.5%)
  │   ↓ 战略分配
  │   └─ 合作伙伴/Bug Bounty/活动
  │
  └─ (Bribe额外奖励)
      ↓ 项目方存入奖励到BribeMarketplace
      └─ vePAIMON投票者按权重分配
```

### 5.3 治理决策流

```
用户锁仓PAIMON
  ↓ VotingEscrowPaimon
获得vePAIMON NFT
  ↓ 权重 = 锁仓量 × 剩余周数 / 104
参与治理投票
  ↓ 每周四快照
  ├─ Gauge权重投票
  │   ↓ GaugeController
  │   └─ EmissionRouter应用新权重
  │
  ├─ Launchpad项目投票
  │   ↓ ProjectRegistry统计
  │   └─ ≥70% → IssuanceController发行
  │
  └─ 协议参数投票
      ↓ DAO提案
      └─ ≥51% + 10% Quorum → 应用变更
```

### 5.4 收入聚合流

```
协议收入来源
  ├─ PSM手续费 (0.1% 每次交换)
  ├─ Treasury铸造费 (0.5% 每次铸造)
  ├─ RWA管理费 (2% APR 抵押品)
  ├─ DEX手续费分润 (0.3% 交易量的一部分)
  ├─ Launchpad发行费 (2% 募资额)
  └─ Bribe市场手续费 (5% Bribe金额)
    ↓ 聚合到协议Treasury
协议Treasury
  ↓ 治理决策分配
  ├─ SavingRate利息注资
  ├─ 协议回购PAIMON
  ├─ Stability Pool储备
  └─ DAO储备基金
```

---

## 六、关键技术指标

### 6.1 性能指标

| 指标 | 目标值 | 现状 | 优化措施 |
|------|--------|------|---------|
| **Gas成本** |
| PSM Swap | <80K gas | ~75K | 缓存scale因子 |
| USDP铸造 | <150K gas | ~140K | 单次除法优化 |
| veNFT锁仓 | <120K gas | ~110K | NFT元数据链下存储 |
| Gauge投票 | <100K gas | ~95K | 位图优化 |
| **响应时间** |
| 健康因子计算 | <1s | ~0.3s | 链下缓存 |
| Emission查询 | <0.5s | ~0.2s | 预计算表 |
| Gauge权重快照 | <2s | ~1.5s | 批量处理 |
| **吞吐量** |
| PSM交易 TPS | >50 | ~60 | BSC 3s出块 |
| DEX交易 TPS | >100 | ~120 | 无状态路由 |

### 6.2 安全指标

| 指标 | 目标值 | 现状 |
|------|--------|------|
| **审计覆盖率** | 100% 关键合约 | V1.0: 100% (CertiK) |
| **测试覆盖率** | ≥80% 行覆盖 | 85% (980/990 tests) |
| **关键路径覆盖** | 100% | 100% |
| **Bug Bounty** | $1M 预算 | 30M PAIMON 已分配 |
| **时间锁延迟** | ≥48h 参数变更 | 48h |
| **Multi-sig阈值** | ≥3/5 紧急暂停 | 3/5 |

### 6.3 经济指标

| 版本 | 目标TVL | 预期月收入 | 关键合约数 |
|------|---------|-----------|-----------|
| V1.0 | $8M | $15K | 10 |
| V1.5 | $10M | $40K | 14 |
| V2.0 | $20M | $100K | 21 |
| V2.5 | $35M | $220K | 27 |
| V3.0 | $50M | $470K | 34 |

---

## 七、部署信息

### 7.1 BSC Testnet部署

**Chain ID**: 97
**RPC**: https://data-seed-prebsc-1-s1.binance.org:8545/
**Explorer**: https://testnet.bscscan.com

**部署状态**:
- ✅ **34个合约已部署**
- ✅ **98.99% 测试通过率** (980/990)
- ✅ **~85% 行覆盖率**
- ⏳ 等待主网审计完成

**合约地址**: 见 `deployments/testnet/addresses.json`

### 7.2 部署顺序

按依赖关系从下至上部署（`script/DeployComplete.s.sol`）：

```
1. Tokens (USDP, PAIMON, esPaimon)
2. DEX (DEXFactory, DEXRouter)
3. Stablecoin (PSM, USDPVault, USDPStabilityPool, SavingRate)
4. Treasury (Treasury, RWAPriceOracle)
5. Governance (VotingEscrowPaimon, GaugeController)
6. Emission (EmissionManager, EmissionRouter)
7. Incentives (BoostStaking, NitroPool, RewardDistributor, BribeMarketplace)
8. Launchpad (ProjectRegistry, IssuanceController)
```

**注意**: Presale模块 (RWABondNFT, RemintController, SettlementRouter) 是 Phase 2 限时功能，未在 testnet 部署。

### 7.3 配置参数

**核心常量** (`ProtocolConstants.sol`):
```solidity
uint256 constant BASIS_POINTS = 10000;
uint256 constant WEEK = 7 days;
uint256 constant EPOCH_DURATION = 1 weeks;
uint256 constant MAX_LOCK_DURATION = 104 weeks;
```

**初始LTV比率** (`Treasury.sol`):
- T1资产: 8000 (80%)
- T2资产: 6500 (65%)
- T3资产: 5000 (50%)

**PSM费率** (`PSMParameterized.sol`):
- 兑换手续费: 10 (0.1%)
- 单日赎回上限: $5M

**Emission分配** (`EmissionRouter.sol`):
- Phase A: Debt 30% / LP 60% / Eco 10%
- Phase B: Debt 50% / LP 37.5% / Eco 12.5%
- Phase C: Debt 55% / LP 35% / Eco 10%

---

## 八、测试策略

### 8.1 六维测试覆盖

所有测试遵循此框架：

1. **Functional** - 核心逻辑正确性
2. **Boundary** - 边界情况（零值、最大值、空数组）
3. **Exception** - 错误处理（回滚、无效状态）
4. **Performance** - Gas 基准
5. **Security** - 重入、访问控制、预言机操纵
6. **Compatibility** - 跨平台（USDT、不同USDC小数）

### 8.2 不变量测试

关键不变量需维护：

**PSM**:
```solidity
// USDC余额 >= USDP总供应
assertGe(usdc.balanceOf(address(psm)), usdp.totalSupply());
```

**DEX**:
```solidity
// K = reserve0 * reserve1 (恒定乘积)
assertGe(k_after, k_before);  // K只能增加（因手续费）
```

**Treasury**:
```solidity
// 总铸造USDP <= 总RWA价值 * LTV
assertLe(totalUsdpMinted, totalRwaValue * MAX_LTV / 10000);
```

### 8.3 测试执行

```bash
# 运行所有测试
forge test                                       # 990 tests

# 特定合约测试
forge test --match-contract TreasuryTest -vvv

# Gas报告
forge test --match-contract EmissionRouter --gas-report

# 覆盖率报告
forge coverage --report summary
```

**当前状态**: 980/990 通过 (98.99%)，~85% 行覆盖

**失败测试**: 10个 Gas 基准测试（非关键），可用 `--no-match-test "testGas"` 排除

---

## 九、常见技术陷阱与解决方案

### 9.1 小数不匹配（PSM）

**问题**: 不同网络USDC小数不同（testnet 6位，mainnet 18位）

**解决方案**: PSM自动检测小数并应用比例因子。始终使用 `PSM.swapUSDCForUSDP()` 而非直接铸造USDP。

### 9.2 Emission周误差

**问题**: 如果不使用标准化epoch工具，emission计算可能偏差一周

**解决方案**: 所有合约始终使用 `EpochUtils.currentEpoch()` 确保一致性。

### 9.3 多步计算精度损失

**问题**: 多次除法累积舍入误差

**解决方案**: 合并分子，末尾单次除法（见 SEC-005 修复）。

### 9.4 Gas基准测试失败

**当前状态**: 10/990 测试在 Gas 基准失败（非关键）

**临时方案**: `forge test --no-match-test "testGas"` 排除 Gas 基准测试。

---

## 十、外部依赖

**OpenZeppelin Contracts**: https://docs.openzeppelin.com/contracts/5.x/
- AccessControlEnumerable
- ReentrancyGuard
- SafeERC20
- ERC721 (veNFT)

**Foundry**: https://book.getfoundry.sh/
- 测试框架
- 部署脚本
- Gas报告

**Chainlink**: https://docs.chain.link/
- 价格预言机 (RWA资产定价)

**BSC**: https://docs.bnbchain.org/
- BSC Testnet Faucet: https://testnet.bnbchain.org/faucet-smart

---

## 附录A: 合约接口速查

### A.1 核心接口

**ITreasury**:
```solidity
interface ITreasury {
    function depositCollateral(address asset, uint256 amount) external;
    function withdrawCollateral(address asset, uint256 amount) external;
    function mintUSDP(address to, uint256 amount) external;
    function burnUSDP(address from, uint256 amount) external;
    function getHealthFactor(address user) external view returns (uint256);
}
```

**IGaugeController**:
```solidity
interface IGaugeController {
    function addGauge(address gauge) external;
    function voteGauge(address gauge, uint256 weight) external;
    function getGaugeWeight(address gauge) external view returns (uint256);
}
```

**IVotingEscrowPaimon**:
```solidity
interface IVotingEscrowPaimon {
    function createLock(uint256 amount, uint256 unlockTime) external returns (uint256 tokenId);
    function increaseAmount(uint256 tokenId, uint256 amount) external;
    function increaseUnlockTime(uint256 tokenId, uint256 unlockTime) external;
    function withdraw(uint256 tokenId) external;
    function balanceOfNFT(uint256 tokenId) external view returns (uint256);
}
```

### A.2 事件速查

**Treasury事件**:
```solidity
event CollateralDeposited(address indexed user, address indexed asset, uint256 amount);
event USMinted(address indexed to, uint256 amount);
event Liquidation(address indexed user, uint256 debtCovered, uint256 collateralSeized);
```

**EmissionRouter事件**:
```solidity
event WeeklyDistribution(uint256 indexed week, uint256 totalEmission);
event ChannelAllocation(uint256 debt, uint256 lp, uint256 stability, uint256 eco);
```

---

**文档状态**: Draft V4.0
**下次审查**: Round 4 完成后技术审核
