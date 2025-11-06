# Bug 追踪和技术债务

**创建时间**: 2025-11-07
**来源**: refactor-0.2 - TODO 注释清理
**总计**: 99 个 TODO，已分类为 P0/P1/P2/P3

---

## 优先级定义

- **P0**: 阻塞性问题，阻止主要功能运行
- **P1**: 重要功能缺失，影响核心用户体验
- **P2**: 功能增强，提升用户体验
- **P3**: 未来功能，Phase 2 或更晚处理

---

## P0 - 阻塞性问题（32个）

### 配置地址占位符

**影响范围**: 主网部署
**处理计划**: refactor-1.1（地址同步脚本）

**文件**: `src/config/chains/mainnet.ts` (17个)
- treasury, usdp, paimon, venft, launchpad, governance, psm, votingEscrow, remintController, bondNft
- pools: hydUsdc, hydWbnb, paimonWbnb
- gauges: hydUsdc, hydWbnb, usdcBusd, paimonWbnb

**文件**: `src/config/chains/testnet.ts` (15个)
- remintController, bondNft, venft, governance, quoter
- pools: hydUsdc, hydWbnb, usdcBusd, usdtUsdc
- gauges: usdpUsdc, paimonWbnb, hydUsdp, hydUsdc, hydWbnb, usdcBusd

**行动**: 在 refactor-1.1 中创建自动同步脚本

---

## P1 - 重要功能缺失（34个）

### 1. Launchpad - wagmi 集成（14个）

**问题**: Launchpad 投票、参与、执行功能使用 Mock 数据，未连接真实合约

| 文件 | 行号 | 功能 | 优先级 |
|------|------|------|--------|
| ProjectList.tsx | 44 | 项目列表数据获取 | P1 |
| VotingUI.tsx | 40, 50, 73, 123 | 投票交易、钱包连接 | P1 |
| VoteHistory.tsx | 46, 52 | 投票历史查询 | P1 |
| VoteExecutionPanel.tsx | 36, 46, 81 | 执行投票结果 | P1 |
| ParticipateForm.tsx | 39, 49, 82, 86, 98, 150 | 参与项目、价格计算、Gas 估算 | P1 |
| [projectId]/vote/page.tsx | 39, 65 | 投票页数据、用户地址 | P1 |
| [projectId]/page.tsx | 37, 84 | 项目详情、Loading states | P1 |

**依赖合约**:
- ProjectRegistry.sol
- IssuanceController.sol
- PAIMON.sol (voting power)

**实现步骤**:
1. 使用 `useReadContract` 查询项目列表、投票状态
2. 使用 `useWriteContract` 执行投票、参与交易
3. 使用 `useAccount` 获取用户地址和连接状态
4. 添加 loading 和 error 状态处理

### 2. Presale - 合约集成（10个）

**问题**: Presale 功能（Bond NFT, Dice, Task）未连接真实合约

| 文件 | 行号 | 功能 | 优先级 |
|------|------|------|--------|
| BondDashboard.tsx | 35, 95 | 用户 Bonds 查询、Settlement | P1 |
| SettlementPage.tsx | 61, 132, 144 | Settlement 交易 | P1 |
| LeaderboardDashboard.tsx | 82, 88, 129, 135, 165 | Dice 排行榜、合约集成 | P1 |
| TaskDashboard.tsx | 71, 77, 115, 129, 189 | 社交任务、Oracle API、邀请码 | P1 |

**依赖合约**:
- RWABondNFT.sol
- RemintController.sol
- SettlementRouter.sol (待实现)

**实现步骤**:
1. 集成 RWABondNFT 查询用户持有的 NFT
2. 集成 RemintController 查询 Dice 结果和排行榜
3. 实现 Settlement 交易（veNFT 或 Cash）
4. 集成社交任务验证 API

### 3. Rewards - 多资产分发（4个）

**问题**: Rewards 分发仅支持单一资产，未集成 RewardDistributor

| 文件 | 行号 | 功能 | 优先级 |
|------|------|------|--------|
| useRewards.ts | 286, 310, 359, 374 | 多资产查询、TVL 计算、批量 claim | P1 |
| RewardsDashboard.tsx | 82 | Boost multiplier 查询 | P1 |
| constants.ts | 7 | 合约地址占位符 | P1 |
| useRewardDistributor.ts | 72 | BoostStaking 合约集成 | P1 |

**依赖合约**:
- RewardDistributor.sol
- BoostStaking.sol
- GaugeController.sol

**实现步骤**:
1. 使用 `useReadContract` 查询多资产奖励（esPAIMON, USDC, USDP）
2. 集成 BoostStaking 查询 boost multiplier
3. 计算 TVL（需要 Oracle 价格）
4. 实现批量 claim 以节省 Gas

### 4. Treasury - 操作功能（2个）

**问题**: Redeem 和 Add Collateral 功能未实现

| 文件 | 行号 | 功能 | 优先级 |
|------|------|------|--------|
| PositionList.tsx | 278, 281 | Redeem、Add Collateral 交易 | P1 |
| DepositForm.tsx | 54 | Oracle 地址查询 | P1 |

**依赖合约**:
- Treasury.sol
- RWAPriceOracle.sol

**实现步骤**:
1. 实现 `redeemRWA` 交易（烧毁 USDP 赎回 RWA）
2. 实现 `addCollateral` 交易（增加 RWA 抵押）
3. 查询 Oracle 地址用于价格计算

### 5. Bribes - 合约集成（4个）

**问题**: Bribes 市场未连接真实合约数据

| 文件 | 行号 | 功能 | 优先级 |
|------|------|------|--------|
| ClaimBribeButton.tsx | 39, 59, 74 | 投票状态、Vote weight、Claim 状态查询 | P1 |
| BribesMarketplace.tsx | 25 | veNFT tokenId 获取 | P1 |
| CreateBribeForm.tsx | 57 | Epoch 查询 | P1 |
| constants.ts | 10 | 合约地址占位符 | P1 |

**依赖合约**:
- BribeMarket.sol (待实现)
- GaugeController.sol
- VotingEscrow.sol (veNFT)

**实现步骤**:
1. 查询用户 veNFT tokenId
2. 查询当前 epoch 和投票状态
3. 查询用户 vote weight 和 bribe claim 状态
4. 实现 create bribe 和 claim bribe 交易

---

## P2 - 功能增强（19个）

### 1. i18n 国际化（1个）

| 文件 | 行号 | 功能 |
|------|------|------|
| stability-pool/page.tsx | 24 | 添加 next-intl 支持 |

### 2. UI/UX 优化（5个）

| 文件 | 行号 | 功能 |
|------|------|------|
| vault/page.tsx | 34 | 添加抵押品选择器 |
| useRewards.ts | 359 | 批量 claim UI |
| LiquidityTabs.tsx | 46, 124 | /liquidity/positions 页面 |
| BoostHistory.tsx | 51 | 区块链浏览器 URL |

### 3. 数据增强（4个）

| 文件 | 行号 | 功能 |
|------|------|------|
| savings/page.tsx | 34 | 历史数据 API |
| StabilityPoolOverview.tsx | 114 | 清算历史计算 |
| treasury/page.tsx | 40 | USDP.accrualIndex 实时数据 |

### 4. 配置完善（9个）

| 文件 | 行号 | 功能 |
|------|------|------|
| useConfigValidation.ts | 53 | PSM 主网地址 |
| ParticipateForm.tsx | 82, 86 | 价格 Oracle、Gas 估算 |
| [projectId]/page.tsx | 84 | Loading/Error states |
| [projectId]/vote/page.tsx | 39, 65 | wagmi hooks、用户地址 |

---

## P3 - 未来功能 / Phase 2（14个）

### 1. The Graph 集成（8个）

| 文件 | 行号 | 功能 | Phase |
|------|------|------|-------|
| PriceChart.tsx | 76 | 实时价格数据 | Phase 2 |
| constants.ts (analytics) | 102, 164 | Protocol fees、价格历史 | Phase 2 |
| useAnalytics.ts | 67 | 合约地址 | Phase 2 |
| TreasuryFundingChart.tsx | 6, 79, 259 | 历史趋势、事件索引 | Phase 2 |

**说明**: 需要部署 The Graph subgraph 索引 Paimon 协议事件

### 2. 页面开发（2个）

| 文件 | 行号 | 功能 | Phase |
|------|------|------|-------|
| LiquidityTabs.tsx | 46, 124 | /liquidity/positions 页面 | Phase 2 |

### 3. Mock 数据清理（4个）

| 文件 | 行号 | 功能 | Phase |
|------|------|------|-------|
| LeaderboardDashboard.tsx | 165 | 移除 mock 数据生成 | Phase 2 |

---

## 处理计划

### refactor-1.x（阶段 1 - 配置修复）
- ✅ refactor-1.1: 创建地址同步脚本，处理 32 个 P0 配置地址
- ⏸️ refactor-1.2: 更新配置使用生成的地址
- ⏸️ refactor-1.3: 验证所有地址加载正确

### refactor-3.x（阶段 3 - 功能页面修复）
- ⏸️ refactor-3.1: 修复 Vault 相关页面（P1: Treasury 操作）
- ⏸️ refactor-3.2: 修复 Convert 页面（P1: 合约集成）
- ⏸️ refactor-3.3: 修复 Boost 页面（P1: Rewards 集成）
- ⏸️ refactor-3.4: 修复 Bribes 页面（P1: Bribes 合约）
- ⏸️ refactor-3.5: 修复 Nitro 页面（P1: 外部激励）
- ⏸️ refactor-3.6: 修复 Rewards 页面（P1: 多资产分发）

### refactor-4.x（阶段 4 - Bug 修复）
- ⏸️ refactor-4.1: 系统性错误排查
- ⏸️ refactor-4.2: 修复 P1 优先级 TODO

### Phase 2（未来迭代）
- The Graph subgraph 部署
- Analytics 页面完整实现
- /liquidity/positions 页面
- 历史数据可视化

---

## 验收标准

### refactor-0.2（当前任务）
- ✅ 所有开发调试 console.log 已删除
- ✅ 99 个 TODO 已完整分类到 P0/P1/P2/P3
- ✅ bug-tracker.md 记录所有 P1 TODO
- ⏸️ ComingSoon 组件创建
- ⏸️ 未实现功能有友好占位

### 后续阶段
- P0: refactor-1.1 解决
- P1: refactor-3.x 和 refactor-4.x 解决
- P2: 根据优先级排期到 refactor-4.x 或 GitHub Issues
- P3: Phase 2 处理

---

## 相关文档

- `.ultra/docs/code-cleanup-analysis.md` - 详细扫描结果
- `.ultra/tasks/tasks.json` - 任务进度跟踪
- `src/config/chains/` - 配置地址文件
