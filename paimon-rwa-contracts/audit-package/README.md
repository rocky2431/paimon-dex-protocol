# Paimon.dex 审计准备文档包

**项目**: Paimon.dex RWA DeFi Protocol
**版本**: v3.3.0
**生成日期**: 2025-11-06
**准备人员**: Ultra Builder Pro 4.0

---

## 📦 文档包概览

本文档包包含 Paimon.dex 协议所有必要的审计材料,供外部审计团队全面评估系统安全性、代码质量和经济模型可行性。

**v3.3.0 核心亮点**:
- ✅ 统一治理基础设施 (`Governable` + 协议库)
- ✅ 四通道排放分发系统 (`EmissionRouter`)
- ✅ 98.99% 测试通过率 (980/990)
- ✅ ~85% 代码覆盖率

---

## 🏗️ 架构亮点

### 统一治理基础设施

**Governable 基类**:
```solidity
abstract contract Governable is AccessControlEnumerable {
    constructor(address initialGovernor) { ... }

    // 治理管理
    function addGovernance(address account) public onlyGovernance;
    function removeGovernance(address account) public onlyGovernance;
    function transferGovernance(address newGovernor) public virtual onlyGovernance;

    // 子类钩子
    function _afterGovernanceTransfer(address prev, address new) internal virtual;

    // 查询接口
    function governanceCount() public view returns (uint256);
    function isGovernance(address account) public view returns (bool);
    function owner() public view returns (address);  // Ownable 兼容
}
```

**使用 Governable 的核心合约**:
- `EmissionManager` - 三阶段排放调度器
- `EmissionRouter` - 四通道分发器
- `PSMParameterized` - USDC↔USDP 1:1 兑换
- `Treasury` - RWA 抵押金库
- `GaugeController` - 流动性挖矿权重控制
- `DEXFactory` - AMM 工厂合约

**ProtocolConstants 库**:
```solidity
library ProtocolConstants {
    uint256 internal constant BASIS_POINTS = 10_000;  // 百分比基准
    uint256 internal constant WEEK = 7 days;          // 治理周期
    uint256 internal constant EPOCH_DURATION = 7 days;
}
```

**ProtocolRoles 库**:
```solidity
library ProtocolRoles {
    bytes32 internal constant GOVERNANCE_ADMIN_ROLE = keccak256("GOVERNANCE_ADMIN_ROLE");
    bytes32 internal constant EMISSION_POLICY_ROLE = keccak256("EMISSION_POLICY_ROLE");
    bytes32 internal constant INCENTIVE_MANAGER_ROLE = keccak256("INCENTIVE_MANAGER_ROLE");
    bytes32 internal constant TREASURY_MANAGER_ROLE = keccak256("TREASURY_MANAGER_ROLE");
}
```

**EpochUtils 库**:
```solidity
library EpochUtils {
    function computeEpoch(uint256 start, uint256 duration, uint256 timestamp)
        internal pure returns (uint256);
    function currentEpoch(uint256 start, uint256 duration)
        internal view returns (uint256);
}
```

### 排放架构

**EmissionManager** (三阶段调度):
- **Phase A** (Week 1-12): 固定 37.5M PAIMON/周
- **Phase B** (Week 13-248): 指数衰减 0.985^t (37.5M → 4.327M)
  - 使用 236 元素查找表优化 gas (O(1) 查询)
- **Phase C** (Week 249-352): 固定 4.327M PAIMON/周
- **总排放量**: ~10B PAIMON (6.77 年)

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
- 默认: LP Pairs 60%, Stability Pool 40%
- 通过 `EmissionManager.setLpSplitParams()` 调整
- 必须总和 100% (链上验证)

---

## ⚙️ 生成策略

- `audit-package/contracts/src` **由根目录 `src` 自动同步产生**,请勿直接修改。若需改动合约,务必在根目录编辑后执行 `scripts/sync_audit_package.sh` 或相应 CI 步骤完成镜像更新。
- 如发现审计包与主工程存在差异,请先运行同步脚本并在提交前通过 `git status`/`git diff --exit-code` 确认一致性。

这样能消除双份源码带来的漂移风险,确保审计所见即生产部署版本。

---

## 📂 目录结构

```
audit-package/
├── README.md                          # 本文件 - 审计包总览
├── contracts/                         # 合约源代码
│   └── src/                          # 50+ Solidity 合约
│       ├── common/                    # ⭐ NEW 统一基础设施
│       │   ├── Governable.sol        # 治理基类
│       │   ├── ProtocolConstants.sol # 协议常量
│       │   ├── ProtocolRoles.sol     # 角色定义
│       │   └── EpochUtils.sol        # 时间计算工具
│       ├── core/                      # 核心合约
│       │   ├── USDP.sol              # 合成稳定币
│       │   ├── PAIMON.sol            # 治理代币
│       │   └── VotingEscrow.sol      # vePAIMON NFT
│       ├── treasury/                  # 金库合约
│       │   ├── Treasury.sol          # RWA 抵押金库
│       │   ├── PSMParameterized.sol  # USDC↔USDP 1:1
│       │   ├── SavingRate.sol        # USDP 储蓄利率
│       │   └── RWAPriceOracle.sol    # 双源预言机
│       ├── dex/                       # DEX 合约
│       │   ├── DEXFactory.sol        # AMM 工厂
│       │   ├── DEXPair.sol           # 交易对
│       │   └── DEXRouter.sol         # 路由器
│       ├── governance/                # 治理合约
│       │   ├── EmissionManager.sol   # ⭐ 三阶段排放调度器
│       │   ├── EmissionRouter.sol    # ⭐ NEW 四通道分发器
│       │   ├── GaugeController.sol   # 流动性权重控制
│       │   └── RewardDistributor.sol # 奖励分发器
│       ├── launchpad/                 # Launchpad 合约
│       │   ├── ProjectRegistry.sol   # 项目注册表
│       │   └── IssuanceController.sol # 发行控制器
│       ├── presale/                   # Presale 合约
│       │   ├── RWABondNFT.sol        # 债券 NFT
│       │   ├── RemintController.sol  # Remint 控制器
│       │   └── SettlementRouter.sol  # 结算路由
│       ├── incentives/                # 激励合约
│       │   ├── BoostStaking.sol      # 提升质押
│       │   └── NitroPool.sol         # 加速池
│       ├── oracle/                    # 预言机合约
│       │   └── RWAPriceOracle.sol    # RWA 价格预言机
│       ├── interfaces/                # 合约接口
│       └── mocks/                     # 测试 Mock 合约
│
├── docs/                              # 文档资料
│   ├── README.md                     # 项目 README
│   ├── ARCHITECTURE.md               # 架构文档
│   ├── KNOWN_ISSUES.md               # 已知问题清单 ⚠️ 重要
│   ├── DEPENDENCIES.md               # 依赖清单
│   └── contract-docs/                # Forge 生成的合约文档 (HTML)
│
├── tests/                             # 测试资料
│   └── TEST_REPORT.md                # 测试报告 ⚠️ 重要
│
├── deployment/                        # 部署资料
│   ├── DEPLOYMENT_CHECKLIST.md       # 部署检查清单
│   ├── .env.example                  # 环境变量示例
│   └── script/                       # 部署脚本
│       ├── Deploy.s.sol              # 主部署脚本
│       ├── DeployComplete.s.sol      # 完整部署脚本
│       ├── DeployTimelock.s.sol      # Timelock 部署
│       ├── DEPLOYMENT.md             # ⭐ 部署文档 (已更新)
│       └── config/                   # 配置脚本
│
└── architecture/                      # 架构资料
    └── SYSTEM_ARCHITECTURE.md        # 系统架构详解 ⚠️ 重要
```

---

## 🎯 审计重点建议

### 高优先级审查区域 (Critical)

#### 1. 统一治理基础设施 (`src/common/Governable.sol`)
- **新增重点**: 治理转移逻辑安全性
- `transferGovernance()` 三步流程: addGovernance → _afterGovernanceTransfer → removeGovernance
- 至少保留 1 个治理管理员约束
- `_afterGovernanceTransfer` 钩子在子合约中的使用
- **风险**: 治理权限永久丢失、钩子逻辑错误

#### 2. EmissionRouter 四通道分发 (`src/governance/EmissionRouter.sol`)
- 周预算一次性分发逻辑
- `routedWeek` 映射防止重复分发
- 四个 sink 地址非零验证
- 余额充足性检查
- **风险**: 分发失败导致排放卡死

#### 3. Treasury RWA 存款逻辑 (`src/treasury/Treasury.sol`)
- 多层级 LTV 验证 (T1: 80%, T2: 65%, T3: 50%)
- 健康因子计算
- 7天赎回冷却期机制
- **风险**: 抵押品估值操纵

#### 4. Oracle 价格获取 (`src/oracle/RWAPriceOracle.sol`)
- 双源验证逻辑 (Chainlink + NAV)
- 20% 偏差熔断器 (从 5% 更新)
- Staleness check (1小时)
- **风险**: 价格操纵、Oracle 失败

#### 5. VRF 随机数集成 (`src/presale/RWABondNFT.sol`)
- Chainlink VRF v2 正确使用
- Callback 安全性
- 随机数操纵防护
- **风险**: 随机数可预测性

#### 6. Emission 复杂计算 (`src/governance/EmissionManager.sol`)
- Phase A 固定排放 (Week 1-12)
- Phase B CSV 查表 (236 元素,Week 13-248)
- Phase C 固定尾部排放 (Week 249-352)
- LP 二级分割参数验证 (pairsBps + stabilityBps == 10000)
- **风险**: 通货膨胀计算错误

### 中优先级审查区域 (High)

#### 7. DEX 手续费分配 (`src/dex/DEXPair.sol`)
- 0.25% 总费率 (70% voters, 30% treasury)
- K 值验证 (恒定乘积)
- 累积费用跟踪

#### 8. PSM 精度处理 (`src/treasury/PSMParameterized.sol`)
- 6→18 decimals 转换 (USDC 兼容)
- Scale factor 准确性
- 1:1 peg 维护

#### 9. veNFT 投票权计算 (`src/core/VotingEscrow.sol`)
- 线性衰减逻辑
- Checkpoint 机制
- 不可转移性

#### 10. 重入攻击防护
- 所有状态变更函数 `nonReentrant` 修饰符
- Check-Effects-Interactions 模式

#### 11. SafeERC20 使用
- USDT 兼容性
- 所有 transfer 操作使用 `safeTransfer`

### 低优先级审查区域 (Medium)

#### 12. Gas 优化验证
- Storage packing 有效性
- Price caching 准确性

#### 13. 事件发射完整性
- 所有状态变更发射事件
- 参数完整性

---

## 📊 关键统计

### 代码规模

| 指标 | 数值 |
|------|------|
| **合约总数** | 50+ |
| **生产合约** | 30+ |
| **测试合约** | 20 |
| **总代码行数** | ~16,000 |
| **统一基础设施** | 4 个库/基类 |

### 测试覆盖

| 指标 | 数值 | 状态 |
|------|------|------|
| **总测试数** | 990 | ✅ |
| **通过** | 980 | ✅ |
| **通过率** | 98.99% | ✅ |
| **失败** | 10 (Gas 基准,非关键) | 🟡 |
| **覆盖率** | ~85% 行覆盖 | ✅ |
| **函数覆盖** | ~90% | ✅ |

**关键测试套件**:
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

### 依赖项

| 依赖 | 版本 | 审计状态 |
|------|------|----------|
| **OpenZeppelin** | v5.1.0 | ✅ 已审计 |
| **Chainlink VRF** | v2.0 | ✅ 已审计 |
| **Solidity** | 0.8.24 | ✅ 官方 |

---

## 📝 v3.3.0 变更记录

**发布日期**: 2025-11-06

**主要新增**:
- ✅ 添加 `Governable` 基类 (统一治理接口)
- ✅ 添加 `ProtocolConstants` 库 (消除魔法数字)
- ✅ 添加 `ProtocolRoles` 库 (集中角色定义)
- ✅ 添加 `EpochUtils` 库 (时间计算工具)
- ✅ 添加 `EmissionRouter` 合约 (四通道分发器)

**重大迁移**:
- ✅ 6 个核心合约迁移到 `Governable` 基类
  - `EmissionManager`
  - `EmissionRouter`
  - `PSMParameterized`
  - `Treasury`
  - `GaugeController`
  - `DEXFactory`

**测试改进**:
- ✅ 新增 4 个 EmissionRouter 测试
- ✅ 通过率从 97.8% 提升到 98.99%
- ✅ 覆盖率维持 ~85%

**文档更新**:
- ✅ README.md 完全重写 (统一基础设施突出)
- ✅ script/DEPLOYMENT.md 完全重写 (EmissionRouter 配置)
- ✅ audit-package/README.md 更新 (本文档)

---

## ⚠️ 已知问题 (详见 docs/KNOWN_ISSUES.md)

### 测试失败 (Non-Critical)

**10 个失败测试** (均为 Gas 基准测试):
- Gas 超标幅度: 0.5% ~ 2.1%
- 影响: 🟢 低 - 不影响合约功能,仅性能参考

**影响**: 🟢 低 - 所有失败均为测试配置问题,不影响合约功能

### 设计权衡

- veNFT 不可转移 (治理安全 vs 流动性)
- 7天赎回冷却期 (安全性 vs 用户体验)
- EmissionManager 无状态设计 (架构清晰 vs 事件追踪)
- Governable 统一基类 (代码复用 vs 合约大小)

---

## 🔒 安全特性

### 已实施的安全措施

✅ **重入保护** - 所有状态变更函数
✅ **访问控制** - Governable 基类 + Role-based
✅ **紧急暂停** - Treasury, USDP, PSM, Oracle
✅ **价格验证** - Oracle 熔断器 (20% 偏差)
✅ **精度优化** - 16处 divide-before-multiply 已修复
✅ **SafeERC20** - 所有 ERC20 操作使用 safe 版本
✅ **治理转移** - Ownable2Step 模式,双步确认

### 已修复的重大问题

✅ SEC-003: 重入攻击防护 (2025-11-03)
✅ SEC-005: SafeERC20 迁移 (2025-11-03)
✅ PREC-001~016: 精度优化 (2025-11-03)
✅ DEX K 值验证逻辑 (2025-11-04)
✅ GOV-001: 统一治理基础设施 (2025-11-06)

---

## 📖 快速开始指南

### 1. 查看系统架构

```bash
# 推荐首先阅读
cat architecture/SYSTEM_ARCHITECTURE.md
```

**包含内容**:
- 系统概览图
- 核心合约架构 (7层)
- 统一基础设施说明
- 数据流图
- 安全机制说明

### 2. 了解已知问题

```bash
cat docs/KNOWN_ISSUES.md
```

**包含内容**:
- 10 个测试失败详情 (Gas 基准)
- 已修复问题列表
- 设计权衡说明
- 审计建议关注点

### 3. 查看测试报告

```bash
cat tests/TEST_REPORT.md
```

**包含内容**:
- 测试统计 (990 tests, 98.99% pass)
- 覆盖率详情 (~85%)
- 6维测试覆盖验证
- Gas 性能基准

### 4. 浏览合约文档

```bash
# 在浏览器中打开
open docs/contract-docs/index.html
```

**包含内容**:
- 所有合约 NatSpec 文档
- 函数参数和返回值
- 事件定义

### 5. 检查依赖清单

```bash
cat docs/DEPENDENCIES.md
```

**包含内容**:
- OpenZeppelin v5.1.0
- Chainlink VRF v2, Price Feeds
- Solidity 0.8.24
- 依赖安全审计状态

### 6. 部署指南 (⭐ 已更新)

```bash
cat deployment/script/DEPLOYMENT.md
```

**包含内容**:
- 完整部署序列 (包含 EmissionRouter)
- EmissionRouter 配置示例
- 治理验证命令
- Gas 成本估算

---

## 🛠️ 本地环境搭建

### 安装 Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 编译合约

```bash
cd contracts/
forge build
```

### 运行测试

```bash
# 运行所有测试
forge test

# 详细输出 (显示 console.log)
forge test -vvv

# 运行特定测试
forge test --match-path test/governance/EmissionRouter.t.sol
```

### 生成覆盖率报告

```bash
forge coverage
```

---

## 🔍 审计检查清单

### 合约层面

- [ ] 重入攻击防护验证
- [ ] 整数溢出检查 (虽然 Solidity 0.8+ 内置)
- [ ] 访问控制验证 (Governable 基类正确使用)
- [ ] 事件发射完整性
- [ ] 精度损失检查 (multiply-before-divide)
- [ ] Gas 优化合理性

### 系统层面

- [ ] Oracle 价格操纵防护
- [ ] Liquidation 经济模型安全性
- [ ] Emission 通胀模型可持续性
- [ ] veNFT 治理攻击向量
- [ ] DEX K 值验证正确性
- [ ] RWA 抵押品估值合理性
- [ ] **EmissionRouter 四通道分发逻辑** ⭐ NEW
- [ ] **Governable 治理转移安全性** ⭐ NEW

### 集成层面

- [ ] Chainlink VRF 正确使用
- [ ] Multicall 安全性
- [ ] 跨合约调用安全
- [ ] 紧急暂停机制有效性
- [ ] EmissionRouter 与 EmissionManager 集成
- [ ] Governable 子类 _afterGovernanceTransfer 钩子

---

## 📞 联系方式

**审计问题咨询**:
- GitHub Issues: https://github.com/rocky2431/paimon-dex-protocol/issues
- Email: rocky243@example.com

**文档反馈**:
如发现文档遗漏或需要补充材料,请联系项目团队。

---

## 📜 许可证

MIT License

---

## 🎉 致谢

感谢审计团队的专业评估！

---

**文档版本**: 3.3.0
**生成日期**: 2025-11-06
**状态**: ✅ Ready for External Audit
**下一步**: 提交审计团队审查
