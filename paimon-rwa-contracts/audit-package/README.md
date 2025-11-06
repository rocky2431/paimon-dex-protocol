# Paimon.dex 审计准备文档包

**项目**: Paimon.dex RWA DeFi Protocol
**版本**: v1.0
**生成日期**: 2025-11-04
**准备人员**: Ultra Builder Pro 3.1

---

## 📦 文档包概览

本文档包包含 Paimon.dex 协议所有必要的审计材料，供外部审计团队全面评估系统安全性、代码质量和经济模型可行性。

---

## ⚙️ 生成策略

- `audit-package/contracts/src` **由根目录 `src` 自动同步产生**，请勿直接修改。若需改动合约，务必在根目录编辑后执行 `scripts/sync_audit_package.sh` 或相应 CI 步骤完成镜像更新。
- 如发现审计包与主工程存在差异，请先运行同步脚本并在提交前通过 `git status`/`git diff --exit-code` 确认一致性。

这样能消除双份源码带来的漂移风险，确保审计所见即生产部署版本。

---

## 📂 目录结构

```
audit-package/
├── README.md                          # 本文件 - 审计包总览
├── contracts/                         # 合约源代码
│   └── src/                          # 46 个 Solidity 合约
│       ├── core/                     # 核心合约 (HYD, PAIMON, USDP, VotingEscrow, PSM, Vault)
│       ├── dex/                      # DEX 合约 (Factory, Pair, Router)
│       ├── governance/               # 治理合约 (GaugeController, EmissionManager, RewardDistributor)
│       ├── treasury/                 # 金库合约 (Treasury, SavingRate)
│       ├── oracle/                   # 预言机合约 (PriceOracle, RWAPriceOracle)
│       ├── launchpad/                # Launchpad 合约 (ProjectRegistry, IssuanceController)
│       ├── presale/                  # Presale 合约 (RWABondNFT, RemintController, SettlementRouter)
│       ├── incentives/               # 激励合约 (BoostStaking, NitroPool)
│       ├── interfaces/               # 合约接口
│       └── mocks/                    # 测试 Mock 合约
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
│       └── config/                   # 配置脚本
│
└── architecture/                      # 架构资料
    └── SYSTEM_ARCHITECTURE.md        # 系统架构详解 ⚠️ 重要
```

---

## 🎯 审计重点建议

### 高优先级审查区域 (Critical)

1. **Treasury RWA 存款逻辑** (`src/treasury/Treasury.sol`)
   - 多层级 LTV 验证 (T1: 80%, T2: 65%, T3: 50%)
   - 健康因子计算
   - 7天赎回冷却期机制
   - **风险**: 抵押品估值操纵

2. **Oracle 价格获取** (`src/oracle/RWAPriceOracle.sol`)
   - 双源验证逻辑 (Chainlink + NAV)
   - 5% 偏差熔断器
   - Staleness check (1小时)
   - **风险**: 价格操纵、Oracle 失败

3. **Liquidation 清算机制** (`src/core/USDPVault.sol`)
   - 健康因子阈值
   - 清算奖励计算
   - 多抵押品加权逻辑
   - **风险**: 清算不及时、资不抵债

4. **VRF 随机数集成** (`src/presale/RWABondNFT.sol`)
   - Chainlink VRF v2 正确使用
   - Callback 安全性
   - 随机数操纵防护
   - **风险**: 随机数可预测性

5. **Emission 复杂计算** (`src/governance/EmissionManager.sol`)
   - Phase A 递减逻辑 (2%/周)
   - Phase B CSV 查表
   - Phase C 尾部排放
   - **风险**: 通货膨胀计算错误

### 中优先级审查区域 (High)

6. **DEX 手续费分配** (`src/dex/DEXPair.sol`)
   - 70/30 split 准确性 (voters/treasury)
   - K 值验证 (恒定乘积)
   - 累积费用跟踪

7. **PSM 精度处理** (`src/core/PSMParameterized.sol`)
   - 6→18 decimals 转换
   - Scale factor 准确性
   - 1:1 peg 维护

8. **veNFT 投票权计算** (`src/core/VotingEscrow.sol`)
   - 线性衰减逻辑
   - Checkpoint 机制
   - 不可转移性

9. **重入攻击防护**
   - 所有状态变更函数 `nonReentrant` 修饰符
   - Check-Effects-Interactions 模式

10. **SafeERC20 使用**
    - USDT 兼容性
    - 所有 transfer 操作使用 `safeTransfer`

### 低优先级审查区域 (Medium)

11. **Gas 优化验证**
    - Storage packing 有效性
    - Price caching 准确性

12. **事件发射完整性**
    - 所有状态变更发射事件
    - 参数完整性

---

## 📊 关键统计

### 代码规模

| 指标 | 数值 |
|------|------|
| **合约总数** | 46 |
| **生产合约** | 28 |
| **测试合约** | 18 |
| **总代码行数** | ~15,000 |

### 测试覆盖

| 指标 | 数值 | 状态 |
|------|------|------|
| **总测试数** | 1036 | ✅ |
| **通过率** | 98.5% | ✅ |
| **覆盖率** | ~85% | ✅ |

### 依赖项

| 依赖 | 版本 | 审计状态 |
|------|------|----------|
| **OpenZeppelin** | v5.1.0 | ✅ 已审计 |
| **Chainlink VRF** | v2.0 | ✅ 已审计 |
| **Solidity** | 0.8.24 | ✅ 官方 |

---

## ⚠️ 已知问题 (详见 docs/KNOWN_ISSUES.md)

### 测试失败 (Non-Critical)

1. **RewardDistributorStabilityPoolIntegration** (11个) - 集成测试配置问题
2. **PSM Event 测试** (2个) - 测试期望值未更新
3. **CoreIntegration DEX** (1个) - 滑点参数问题
4. **BondUserJourney** (1个) - E2E 环境配置
5. **SavingRate Gas** (1个) - Gas 超标 1.1%

**影响**: 🟢 低 - 所有失败均为测试配置问题，不影响合约功能

### 设计权衡

- veNFT 不可转移 (治理安全 vs 流动性)
- 7天赎回冷却期 (安全性 vs 用户体验)
- EmissionManager 无状态设计 (架构清晰 vs 事件追踪)

---

## 🔒 安全特性

### 已实施的安全措施

✅ **重入保护** - 所有状态变更函数
✅ **访问控制** - Ownable2Step, Role-based
✅ **紧急暂停** - Treasury, USDP, PSM, Oracle
✅ **价格验证** - Oracle 熔断器 (5% 偏差)
✅ **精度优化** - 16处 divide-before-multiply 已修复
✅ **SafeERC20** - 所有 ERC20 操作使用 safe 版本

### 已修复的重大问题

✅ SEC-003: 重入攻击防护 (2025-11-03)
✅ SEC-005: SafeERC20 迁移 (2025-11-03)
✅ PREC-001~016: 精度优化 (2025-11-03)
✅ DEX K 值验证逻辑 (2025-11-04)

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
- 数据流图
- 安全机制说明

### 2. 了解已知问题

```bash
cat docs/KNOWN_ISSUES.md
```

**包含内容**:
- 16个测试失败详情
- 已修复问题列表
- 设计权衡说明
- 审计建议关注点

### 3. 查看测试报告

```bash
cat tests/TEST_REPORT.md
```

**包含内容**:
- 测试统计 (1036 tests, 98.5% pass)
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
forge test
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
- [ ] 访问控制验证
- [ ] 事件发射完整性
- [ ] 精度损失检查
- [ ] Gas 优化合理性

### 系统层面

- [ ] Oracle 价格操纵防护
- [ ] Liquidation 经济模型安全性
- [ ] Emission 通胀模型可持续性
- [ ] veNFT 治理攻击向量
- [ ] DEX K 值验证正确性
- [ ] RWA 抵押品估值合理性

### 集成层面

- [ ] Chainlink VRF 正确使用
- [ ] Multicall 安全性
- [ ] 跨合约调用安全
- [ ] 紧急暂停机制有效性

---

## 📞 联系方式

**审计问题咨询**:
- 项目负责人: TBD
- 技术联系: TBD
- 紧急联系: TBD

**文档反馈**:
如发现文档遗漏或需要补充材料，请联系项目团队。

---

## 📜 许可证

MIT License

---

## 🎉 致谢

感谢审计团队的专业评估！

---

**文档版本**: 1.0
**生成日期**: 2025-11-04
**状态**: ✅ Ready for External Audit
**下一步**: 提交审计团队审查
