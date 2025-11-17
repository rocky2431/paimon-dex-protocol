# Paimon.dex 产品规格说明

> **版本**: V4.0
> **最后更新**: 2025-11-17
> **状态**: Ultra Builder Pro 4.1 规格驱动架构

---

## 一、产品愿景与定位

### 1.1 核心定位

**Paimon.dex 是 BSC 上的 RWA 资产上链基础设施，也是 BSC 生态的 RWA+DeFi 枢纽。**

我们通过完整的 RWA 全链条解决方案，让真实世界资产（美债、股权、房地产收益权等）能够：
1. **被发现评估** - 项目Registry + 风险评级
2. **被代币化上链** - 资产发行控制器
3. **产生稳定币** - 抵押铸造 USDP
4. **获得流动性** - DEX 交易 + LP 激励
5. **接受治理** - ve(3,3) 模型社区决策

### 1.2 与竞品的差异化

| 维度 | Paimon.dex | MakerDAO | Ondo Finance | Centrifuge |
|------|-----------|----------|--------------|-----------|
| **RWA覆盖** | 全链条（发现→流动性） | 仅抵押 | 仅代币化 | 仅借贷 |
| **DeFi集成** | ve(3,3) DEX + Gauge | 无DEX | 无DEX | 无DEX |
| **治理模型** | 完全去中心化 veNFT | DAO但中心化 | 许可制 | DAO |
| **目标链** | BSC (低成本) | Ethereum | Ethereum | Polkadot |
| **启动时间** | 2025 Q1 | 2017 | 2023 | 2020 |

**核心优势**: 我们是唯一将 RWA 全流程 + ve(3,3) DeFi 模型结合的协议。

### 1.3 价值主张（30秒电梯演讲）

> "Paimon.dex 让真实世界资产在 BSC 上流动起来。
> RWA 项目方可以通过我们代币化资产、获得流动性、接受社区治理；
> 用户可以用美债、股票等抵押铸造稳定币 USDP，参与 ve(3,3) DeFi 生态赚取收益；
> 我们用 6.77 年的激励计划，建立 BSC 最大的 RWA 资产池。"

---

## 二、RWA 全链条业务流程

Paimon.dex 将 RWA 业务分为 5 个核心阶段，34 个智能合约协同完成端到端流程。

### Stage 1: RWA 资产发现与评估

**目标用户**: RWA 项目方（资产发行方）

**业务流程**:
```
项目方提交资产 → ProjectRegistry 登记
    ↓
RWAPriceOracle 获取初始定价
    ↓
社区 Launchpad 治理（三阶段投票）
    ↓
通过 → 进入 Stage 2 代币化
```

**涉及合约** (3个):
- `ProjectRegistry`: 项目登记簿
- `RWAPriceOracle`: RWA 资产定价预言机
- Launchpad 治理模块（2个辅助合约）

**价值产出**:
- 为 RWA 项目提供去中心化上链通道
- 社区筛选机制保证资产质量
- 价格透明化降低评估成本

### Stage 2: RWA 资产代币化与上线

**目标用户**: 资产管理方 + 机构投资者

**业务流程**:
```
通过治理的项目 → IssuanceController 发行代币
    ↓
Treasury 托管基础资产
    ↓
代币化完成 → 进入 Stage 3 抵押池
```

**涉及合约** (2个):
- `IssuanceController`: 资产发行控制器
- `Treasury`: 多抵押品金库（复用基础设施）

**价值产出**:
- 链上资产可验证、可审计
- 降低传统资产发行成本（律师费、中介费）
- 7×24 全球可交易

### Stage 3: 稳定币铸造与流通

**目标用户**: USDP 用户 + RWA 抵押者

**业务流程**:
```
用户存入 RWA 资产到 Treasury
    ↓
USDPVault 计算健康因子（多抵押品加权）
    ↓
铸造 USDP（1:1 USDC 锚定）
    ↓
用户选择：
  ├─ PSM 与 USDC 1:1 互换
  ├─ SavingRate 赚取 2-3% APR
  └─ 进入 Stage 4 DeFi 流动性
```

**涉及合约** (6个):
- `USDP Token`: 稳定币核心（share-based会计）
- `USDPVault`: 多抵押品金库（健康因子管理）
- `PSMParameterized`: 1:1 USDC 锚定模块
- `Treasury`: RWA 抵押品托管
- `SavingRate`: 储蓄利率模块（独立生息）
- `USDPStabilityPool`: 清算缓冲池（V2.5激活）

**价值产出**:
- USDP 成为 RWA 支持的稳定币
- 用户获得流动性（抵押 RWA 铸造稳定币）
- PSM 确保 1:1 锚定安全性

### Stage 4: DeFi 流动性与交易

**目标用户**: LP 提供者 + 交易者 + 套利者

**业务流程**:
```
用户添加流动性到 DEX
    ↓
赚取交易手续费 (0.3%)
    ↓
参与 Gauge 投票（vePAIMON 决定激励分配）
    ↓
获得 PAIMON 激励 + Bribe 奖励
```

**涉及合约** (7个):
- `DEXFactory`: AMM 工厂合约
- `DEXPair`: 交易对合约
- `DEXRouter`: 路由合约
- `GaugeController`: Gauge 权重控制器（ve(3,3)核心）
- `BribeMarketplace`: Bribe 市场（V2.5激活）
- `RewardDistributor`: Merkle 奖励分发
- `NitroPool`: 加速池（V2.5激活）

**价值产出**:
- USDP 获得深度流动性
- RWA 资产可快速定价
- ve(3,3) 模型确保流动性粘性

### Stage 5: 生态激励与治理

**目标用户**: PAIMON 持有者 + vePAIMON 治理者

**业务流程**:
```
用户锁仓 PAIMON → 获得 vePAIMON NFT（衰减模型）
    ↓
三阶段 Emission 自动释放（10B over 6.77年）
    ↓
EmissionRouter 四通道分配：
  ├─ Debt Mining (30-55%)
  ├─ LP Farming (35-60%)
  ├─ Stability Pool (LP的40%)
  └─ Ecosystem (10-12.5%)
    ↓
用户选择：
  ├─ Gauge 投票（影响 LP 激励分配）
  ├─ Launchpad 投票（决定新项目上线）
  ├─ Bribe 市场（出售投票权）
  └─ Boost Staking（V3.0, 全协议收益1.5x倍率）
```

**涉及合约** (10个 + 6个基础设施):
- `PAIMON Token`: 治理代币（10B总量）
- `esPaimon`: Vesting代币（365天线性解锁）
- `VotingEscrowPaimon`: veNFT 合约（线性衰减模型）
- `EmissionManager`: 三阶段排放调度器
- `EmissionRouter`: 四通道分发器
- `GaugeController`: （复用 Stage 4）
- `BribeMarketplace`: （复用 Stage 4）
- `RewardDistributor`: （复用 Stage 4）
- `NitroPool`: （复用 Stage 4）
- `BoostStaking`: Boost 倍率计算器（V3.0激活）
- 基础设施（6个）: Governable, ProtocolConstants, ProtocolRoles, EpochUtils, RWAPriceOracle, Governable base

**价值产出**:
- 10B PAIMON 激励 6.77 年持续吸引用户
- ve(3,3) 模型确保治理去中心化
- Bribe 市场提升资本效率

---

## 三、版本路线图（渐进式激活策略）

### 总体策略

**34 个合约已全部部署在 BSC testnet**，不删除任何功能，仅分阶段激活前端入口和使用权限。

每个版本是完整的业务闭环，能独立产生价值，前一版本的成功推动下一版本。

### V1.0: RWA 稳定币核心（Month 0-2）

**激活时间**: 2025 Q1
**核心价值**: 建立 BSC 首个 RWA 支持的稳定币

**激活合约** (10个):
- 基础设施 (6个): PAIMON Token, Governable, RWAPriceOracle, ProtocolConstants, ProtocolRoles, EpochUtils
- Stage 3 稳定币 (4个): USDP, USDPVault, PSMParameterized, Treasury (Limited - 仅管理员铸造)

**前端页面** (4页):
1. PSM Swap 页（USDC ↔ USDP）
2. Treasury 铸造页（RWA 抵押 → USDP）
3. Portfolio 页（我的资产 + 健康因子）
4. Dashboard 总览页

**核心 KPI**:
- USDP 流通量: $5M
- RWA 抵押品 TVL: $8M
- 活跃地址数: 500
- PSM 交易量: $2M/周

**成功门槛**: 连续 30 天健康因子 >1.5

**预期月收入**: $15K
- PSM 手续费 (40%, $6K)
- 铸造费 (35%, $5.25K)
- RWA 管理费 (25%, $3.75K)

### V1.5: 基础治理（Month 2-4）

**激活时间**: V1.0 成功门槛达成后
**核心价值**: 启动 ve(3,3) 治理机制

**新增激活合约** (4个):
- `esPaimon`: Vesting 代币
- `VotingEscrowPaimon`: veNFT 锁仓
- `EmissionManager`: 三阶段排放（Limited - 仅 Phase A）
- `SavingRate`: USDP 储蓄利率

**前端页面** (+3页):
1. veNFT Lock 页（锁仓 PAIMON）
2. Rewards Claim 页（领取 esPAIMON）
3. Governance 投票页（基础提案）

**核心 KPI**:
- vePAIMON 锁仓量: $2M
- 平均锁仓时长: 180天
- 治理参与率: 40%
- esPAIMON Vesting量: 50M

**成功门槛**: vePAIMON 锁仓量达 $2M

**预期月收入**: $40K (累计)
- V1.0 收入增长至 $20K
- SavingRate 利差: $20K

### V2.0: DeFi 流动性生态（Month 4-7）

**激活时间**: V1.5 成功门槛达成后
**核心价值**: 成为 BSC 的 RWA+DeFi 枢纽

**新增激活合约** (7个):
- DEX 全套 (4个): DEXFactory, DEXPair, DEXRouter, DEX辅助
- 激励系统 (3个): GaugeController, RewardDistributor, EmissionRouter (Full)

**前端页面** (+5页):
1. DEX Swap 页
2. Liquidity Pool 页（添加/移除流动性）
3. Farm 页（LP 挖矿）
4. Gauge 投票页（分配激励权重）
5. Analytics 页（TVL/Volume 图表）

**核心 KPI**:
- DEX TVL: $10M
- 日交易量: $500K
- LP 数量: 200
- Gauge 投票权重: 5个活跃池

**成功门槛**: DEX TVL 达 $10M

**预期月收入**: $100K (累计)
- 前序收入: $50K
- DEX 手续费分润: $50K

### V2.5: RWA Launchpad（Month 7-10）

**激活时间**: V2.0 成功门槛达成后
**核心价值**: RWA 项目发行平台

**新增激活合约** (6个):
- Stage 1 资产发现 (3个): ProjectRegistry, RWAPriceOracle (复用), Launchpad治理
- Stage 2 代币化 (1个): IssuanceController
- 激励增强 (2个): BribeMarketplace, USDPStabilityPool

**前端页面** (+4页):
1. Launchpad 列表页（RWA 项目）
2. 项目详情页（投资 + 投票）
3. Bribe 市场页（购买/出售投票权）
4. Stability Pool 页（清算池）

**核心 KPI**:
- Launchpad 项目数: 3个
- 项目募资总额: $3M
- Bribe 市场交易量: $200K/月
- 新增 RWA 资产类别: 3类

**成功门槛**: 3个 RWA 项目成功上线

**预期月收入**: $220K (累计)
- 前序收入: $121K
- Launchpad 发行费 (2%): $60K
- Bribe 市场手续费 (5%): $39K

### V3.0: 完整生态（Month 10-12）

**激活时间**: V2.5 成功门槛达成后
**核心价值**: RWA DeFi 生态标准

**新增激活合约** (7个):
- `BoostStaking`: Boost 倍率计算器
- `NitroPool`: 加速池（从 V2.5 推迟）
- 其他高级功能（5个辅助合约）

**前端页面** (+3页):
1. Boost Staking 页（质押 PAIMON 提升全协议收益）
2. 高级 Dashboard（跨资产分析 + 风险仪表盘）
3. 生态地图页（合作伙伴 + 集成）

**核心 KPI**:
- 协议总 TVL: $50M
- 月活用户 (MAU): 2000
- 合作 RWA 项目数: 10个
- Boost 倍率均值: 1.3x

**成功门槛**: TVL 达 $50M

**预期月收入**: $470K (累计)
- 前序收入: $282K
- Boost 带来的复合增长: $141K
- 生态投资收益: $47K

### V0.5: Presale 预热（可选）

**激活时间**: V1.0 前 2 周
**核心价值**: 造势 + 早期用户获取

**限时活动合约** (3个):
- `RWABondNFT`: 折扣债券 NFT
- `RemintController`: 重铸控制器
- `SettlementRouter`: 结算路由

**特殊说明**: 这是限时活动，V3.0 后下线。若团队资源紧张可跳过，直接 V1.0。

---

## 四、用户角色与价值主张

### 4.1 RWA 资产方（资产发行方）

**痛点**:
- 传统资产发行成本高（律师费、中介费、时间成本）
- 流动性差，二级市场缺失
- 全球投资者触达困难

**我们提供**:
- 去中心化上链通道（Launchpad 治理）
- 自动流动性引导（DEX + Gauge 激励）
- BSC 生态流量导入

**使用路径**:
```
V2.5: 提交项目到 ProjectRegistry
  → 社区 vePAIMON 投票（70%通过率）
  → IssuanceController 发行代币
  → DEX 创建交易对 + Gauge 激励
  → Bribe 市场购买投票权（提升流动性）
```

**价值量化**:
- 传统发行成本 $100K → 链上发行 $5K（节省 95%）
- 发行周期 6个月 → 4周（缩短 80%）
- 全球 7×24 可交易

### 4.2 USDP 用户（稳定币用户）

**痛点**:
- USDT/USDC 无收益
- 法币存款利率低（<1%）
- 中心化稳定币信任风险

**我们提供**:
- RWA 支持的去中心化稳定币
- SavingRate 2-3% APR
- PSM 1:1 USDC 锚定安全退出

**使用路径**:
```
V1.0: PSM 用 USDC 1:1 兑换 USDP
  → 存入 SavingRate 赚取 2-3% APR
V1.5: 或参与 Governance 投票赚取额外奖励
V2.0: 或添加 USDP-USDC LP 挖矿
```

**价值量化**:
- 比银行存款多赚 150% (3% vs 1.2%)
- 零锁定期，随时赎回
- 链上可验证储备

### 4.3 vePAIMON 持有者（治理参与者）

**痛点**:
- 普通代币持有无收益
- 治理代币价值不明确
- 投票权重不公平

**我们提供**:
- ve(3,3) 模型确保长期锁仓者收益
- 多种收益来源（Gauge 投票 + Bribe + Boost）
- 线性衰减确保公平性

**使用路径**:
```
V1.5: 锁仓 PAIMON → 获得 vePAIMON NFT
  → 参与治理投票
  → 获得协议收益分红
V2.0: Gauge 投票分配 LP 激励
  → 赚取投票激励
V2.5: Bribe 市场出售投票权
  → 或参与 Launchpad 项目投票
V3.0: Boost Staking 提升全协议收益 1.5x
```

**价值量化**:
- 锁仓 2 年 APR: 40-60%（Emission + Bribe + Boost）
- 治理权重: 线性衰减模型确保公平
- 可转让 veNFT 保留流动性

### 4.4 LP 提供者（流动性挖矿者）

**痛点**:
- 无常损失（Impermanent Loss）
- 激励不确定性
- 手续费收入低

**我们提供**:
- Gauge 投票确定激励分配
- 稳定币对（USDP-USDC）降低 IL
- Bribe 市场额外收入

**使用路径**:
```
V2.0: 添加 USDP-USDC LP
  → 赚取 0.3% 手续费
  → Gauge 投票权重 → PAIMON 激励
  → vePAIMON 投票支持该池
V2.5: Bribe 市场提供额外奖励
  → NitroPool 加速收益
V3.0: Boost Staking 提升 LP 收益 1.5x
```

**价值量化**:
- USDP-USDC LP APR: 15-25%（手续费 + Emission + Bribe）
- 稳定币对 IL 风险: <1%
- Boost 后 APR: 22-37%

### 4.5 RWA 项目投资者

**痛点**:
- 传统 RWA 投资门槛高（>$100K）
- 流动性差，锁定期长
- 信息不透明

**我们提供**:
- 低门槛（最低 $100）
- 链上可交易，无锁定期
- 透明化尽调 + 社区投票筛选

**使用路径**:
```
V2.5: Launchpad 页面查看 RWA 项目
  → vePAIMON 投票支持项目
  → 项目通过 → 折扣价投资
  → DEX 二级市场随时退出
```

**价值量化**:
- 投资门槛降低 99%（$100K → $100）
- 流动性溢价 10-20%（相比传统 RWA）
- 链上透明审计

---

## 五、经济模型

### 5.1 代币供应

**总量**: 10,000,000,000 PAIMON（100亿）

**分配**:
- 社区激励（Emission）: 95% (9,500,000,000)
- 团队 & 顾问: 10% (1,000,000,000) - 4年线性解锁
- DAO 储备: 5% (500,000,000)
- 初始流动性: 0% (通过 Emission 引导)

### 5.2 三阶段 Emission

**总周期**: 352 周（6.77 年）
**总释放**: 约 9.5B PAIMON

| 阶段 | 周期 | 每周排放 | 总量 | 分配比例 |
|------|------|---------|------|---------|
| **Phase A** | Week 1-12 | 固定 37.5M | 450M | Debt 30% / LP 60% / Eco 10% |
| **Phase B** | Week 13-248 | 指数衰减 0.985^t | ~8.6B | Debt 50% / LP 37.5% / Eco 12.5% |
| **Phase C** | Week 249-352 | 固定 4.327M | ~450M | Debt 55% / LP 35% / Eco 10% |

**LP 内部分流** (治理可调):
- AMM Pairs: 60%
- Stability Pool: 40%

**特殊说明**: 所有社区 Emission 默认以 esPAIMON 形式发放，365 天线性解锁。

### 5.3 四通道分配

**EmissionRouter** 将每周预算分配到 4 个渠道：

1. **Debt Mining** (30-55%)
   - 奖励 RWA 抵押者
   - 基于 TWAD（时间加权平均债务）
   - 鼓励长期抵押

2. **LP Farming** (35-60%)
   - 奖励流动性提供者
   - 由 Gauge 投票决定分配权重
   - 支持 USDP 交易对深度

3. **Stability Pool** (LP的40%)
   - 奖励清算缓冲池参与者
   - 降低系统性风险
   - V2.5 激活

4. **Ecosystem** (10-12.5%)
   - 战略合作伙伴
   - Bug Bounty
   - 社区活动

### 5.4 Boost 倍率机制（V3.0）

**公式**:
```
Boost倍率 = 1.0x + (质押PAIMON × 锁定时长) / (最大质押 × 最大时长) × 0.5

最低倍率: 1.0x（无质押）
最高倍率: 1.5x（满额质押 + 最长时长）
```

**应用范围**: 所有收益类型（Debt Mining, LP Farming, Ecosystem奖励）

**示例**:
- 质押 10K PAIMON，锁定 1 年 → Boost 1.25x
- 质押 100K PAIMON，锁定 2 年 → Boost 1.5x

---

## 六、治理机制

### 6.1 veNFT 锁仓模型

**核心设计**: Vote-Escrow NFT，可转让但权重衰减

**锁仓规则**:
- 最短: 1 周
- 最长: 104 周（2 年）
- 衰减: 线性，从锁定时权重线性降至 0

**权重计算**:
```
初始权重 = 锁仓PAIMON数量 × 剩余周数 / 104

示例:
锁 100 PAIMON，104周 → 初始权重 100
锁 100 PAIMON，52周 → 初始权重 50
52周后 → 权重降至 25
```

**veNFT 特性**:
- ✅ 可转让（ERC-721）
- ✅ 可交易（二级市场）
- ❌ 不可合并
- ✅ 可延长锁定期
- ✅ 可增加锁仓量

### 6.2 治理投票类型

#### 6.2.1 Gauge 权重投票（每周）

**时间**: 每周四 00:00 UTC
**参与方**: vePAIMON 持有者
**投票对象**: 流动性池
**效果**: 决定下周 LP Emission 分配

**流程**:
```
周四 00:00: 快照 vePAIMON 权重
周四 00:00 - 周日 23:59: 投票窗口
周一 00:00: 结算，应用新权重到 EmissionRouter
周一 - 周日: 按新权重分发激励
```

#### 6.2.2 Launchpad 项目投票（按需）

**时间**: 项目提名后 7 天
**参与方**: vePAIMON 持有者
**投票阈值**: 70% 支持率
**效果**: 决定项目是否进入 Launchpad

**流程**:
```
项目方提交 → ProjectRegistry 登记
  ↓
社区提名期（3天）
  ↓
vePAIMON 投票期（7天）
  ↓
结算: ≥70% → 通过 → IssuanceController 发行
      <70% → 拒绝 → 退还提案保证金
```

#### 6.2.3 协议参数投票（重大变更）

**时间**: DAO 提案触发
**参与方**: vePAIMON 持有者
**投票阈值**: 51% 支持率 + 10% Quorum
**效果**: 修改协议关键参数

**可投票参数**:
- Emission 分配比例
- LP 内部分流比例（AMM vs Stability）
- PSM 手续费率
- 清算阈值
- Launchpad 白名单

### 6.3 Bribe 市场机制

**开放时间**: V2.5
**参与方**: 任何人（项目方、协议、个人）

**流程**:
```
Briber 存入奖励代币到 BribeMarketplace
  ↓
指定目标 Gauge 和 Epoch
  ↓
vePAIMON 持有者投票支持该 Gauge
  ↓
Epoch 结束后，投票者按权重分配 Bribe
```

**手续费**: 5%（协议收入）

**示例**:
- RWA 项目 X 提供 10K USDC Bribe，支持 "USDP-X LP" 池
- 本周该池获得 15% 投票权重（原本 5%）
- 投票者按权重分享 10K USDC - 5% 手续费 = 9.5K USDC

---

## 七、风险控制

### 7.1 RWA 抵押品风险

**多层防护**:

1. **分层 LTV 管理**
   - T1 资产（美债）: 80% LTV
   - T2 资产（投资级债券）: 65% LTV
   - T3 资产（RWA 收益池）: 50% LTV

2. **健康因子监控**
   ```
   健康因子 = Σ(抵押品价值 × LTV) / 总债务

   安全线: >1.5
   警告线: 1.3 - 1.5
   清算线: <1.15
   ```

3. **预言机双源验证**
   - Chainlink 实时价格
   - NAV（资产净值）人工审计价格
   - 偏差 >20% 触发熔断

4. **清算机制**（V2.5 激活）
   - USDPStabilityPool 优先清算（10% 折扣）
   - 公开拍卖（15% 折扣）
   - 协议回购（20% 折扣）

### 7.2 USDP 锚定风险

**PSM 模块保证**:
- 1:1 USDC 互换（0.1% 手续费）
- 无滑点，无限额
- 预注入 $1M USDC 初始流动性

**套利机制**:
```
USDP 价格 > $1.01 → 套利者通过 PSM 用 USDC 铸造 USDP 卖出
USDP 价格 < $0.99 → 套利者买入 USDP 通过 PSM 赎回 USDC
```

**Circuit Breaker**:
- PSM 单日赎回上限: $5M（可治理调整）
- 异常波动暂停铸造/赎回

### 7.3 智能合约安全

**多层审计**:
1. CertiK 审计（V1.0 前）
2. OpenZeppelin 审计（V2.0 前）
3. Trail of Bits 审计（V3.0 前）

**Bug Bounty**:
- 总预算: 30M PAIMON
- Critical: 最高 10M PAIMON
- High: 最高 3M PAIMON
- Medium: 最高 1M PAIMON

**时间锁**:
- 所有协议参数变更: 48 小时延迟
- 紧急暂停权限: Multi-sig 3/5

### 7.4 治理攻击防护

**反女巫**:
- veNFT 最低锁定期: 1 周
- 投票权重上限: 单钱包 <5%

**闪电贷防护**:
- 投票快照提前 1 个 Block
- veNFT 权重基于锁定期，无法租借

**Bribe 操控防护**:
- Bribe 透明化（链上可查）
- 异常检测算法
- 社区仲裁机制

---

## 八、成功指标

### 8.1 North Star Metric

**协议总 TVL**: $50M（V3.0 目标）

**为什么是 TVL？**
- 综合反映用户信任（RWA 抵押 + LP 流动性）
- 直接关联收入（手续费 + 管理费）
- 可对标竞品（MakerDAO $5B, Ondo $500M）

### 8.2 版本里程碑

| 版本 | 时间 | 核心指标 | 目标值 |
|------|------|---------|--------|
| V1.0 | Month 2 | USDP 流通量 | $5M |
| V1.5 | Month 4 | vePAIMON 锁仓 | $2M |
| V2.0 | Month 7 | DEX TVL | $10M |
| V2.5 | Month 10 | RWA 项目数 | 3个 |
| V3.0 | Month 12 | 协议总 TVL | $50M |

### 8.3 长期目标（18个月）

- **TVL**: $500M（10x V3.0）
- **月活用户**: 20,000 MAU
- **RWA 项目数**: 50个
- **月收入**: $2M+
- **市场地位**: BSC RWA 第一协议

---

## 九、附录

### 9.1 术语表

- **RWA**: Real World Assets，真实世界资产
- **veNFT**: Vote-Escrow NFT，投票托管 NFT
- **ve(3,3)**: Vote-Escrow + Solidly (3,3) 模型
- **PSM**: Peg Stability Module，锚定稳定模块
- **LTV**: Loan-to-Value，贷款价值比
- **TWAD**: Time-Weighted Average Debt，时间加权平均债务
- **Gauge**: 激励分配投票池
- **Bribe**: 投票激励/贿选
- **Boost**: 收益倍率增强

### 9.2 相关文档

- 技术架构: `specs/architecture.md`
- API 规范: `specs/api-contracts/`
- 数据模型: `specs/data-models/`
- 用户旅程: `specs/user-journeys/`

### 9.3 外部链接

- 官网: https://paimon.dex (TBD)
- 文档: https://docs.paimon.dex (TBD)
- GitHub: https://github.com/paimon-dex (TBD)
- Discord: https://discord.gg/paimon (TBD)

---

**文档状态**: Draft V4.0
**下次审查**: Round 4 完成后社区审核
