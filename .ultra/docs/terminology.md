# Paimon 协议术语对照表

**版本**: v2.0
**最后更新**: 2025-11-01
**用途**: 统一中英文术语,确保代码、文档、前端一致性

---

## 核心概念

| 中文 | 英文 | 缩写 | 说明 |
|------|------|------|------|
| 真实世界资产 | Real World Asset | RWA | 现实世界的可代币化资产 |
| 去中心化交易所 | Decentralized Exchange | DEX | 基于 AMM 的链上交易平台 |
| 自动做市商 | Automated Market Maker | AMM | Uniswap V2 类型算法 |
| 流动性池 | Liquidity Pool | LP | 交易对资金池 |
| 流动性提供者 | Liquidity Provider | LP | 提供流动性的用户 |
| 协议稳定性模块 | Peg Stability Module | PSM | 1:1 稳定币兑换模块 |
| 国库 | Treasury | - | 协议资金管理合约 |
| 抵押贷款价值比 | Loan-to-Value | LTV | 抵押率 (如 80%) |
| 投票托管 | Vote-Escrowed | ve | ve33 治理模型 |
| 非同质化代币 | Non-Fungible Token | NFT | ERC721 标准代币 |

---

## 代币相关

### 主要代币

| 中文 | 英文 | 符号 | 类型 | 说明 |
|------|------|------|------|------|
| ~~HYD (已废弃)~~ | ~~Hydrated Dollar~~ | ~~HYD~~ | ~~ERC20~~ | 旧版稳定币,已重命名为 USDP |
| USD Paimon | USD Paimon | USDP | ERC20 | 新版稳定币,替代 HYD |
| Paimon | Paimon | PAIMON | ERC20 | 平台治理代币 |
| 托管 Paimon | Escrowed Paimon | esPaimon | ERC20 | 激励代币,365天线性释放 |
| 投票托管 Paimon | Vote-Escrowed Paimon | vePAIMON | ERC721 | 投票权 NFT (1周~4年锁仓) |
| 美元稳定币 | USD Coin | USDC | ERC20 | Circle 发行的中心化稳定币 |

### 代币操作

| 中文 | 英文 | 说明 |
|------|------|------|
| 铸造 | Mint | 创建新代币 |
| 销毁 | Burn | 销毁代币 |
| 锁仓 | Lock | 锁定代币换取治理权 |
| 解锁 | Unlock | 锁仓期满后取回代币 |
| 质押 | Stake | 质押代币获得收益 |
| 取消质押 | Unstake | 取回质押的代币 |
| 归属/释放 | Vest | esPaimon 线性释放 |
| 提前退出 | Early Exit | esPaimon 提前解锁 (有罚则) |
| 转移 | Transfer | 转账 |
| 批准 | Approve | 授权合约操作代币 |

---

## 协议模块

| 中文 | 英文 | 合约名 | 说明 |
|------|------|--------|------|
| 协议稳定性模块 | Peg Stability Module | PSM.sol | USDC ↔ USDP 1:1 兑换 |
| 国库 | Treasury | Treasury.sol | RWA 抵押管理 |
| 投票托管合约 | Voting Escrow | VotingEscrowPaimon.sol | vePaimon NFT 管理 |
| 流动性挖矿控制器 | Gauge Controller | GaugeController.sol | 流动性激励分配 |
| 流动性挖矿池 | Gauge | LiquidityGauge.sol | 单个池的挖矿合约 |
| 贿赂市场 | Bribe Marketplace | BribeMarketplace.sol | 用户贿赂投票者 |
| 收益加成质押 | Boost Staking | BoostStaking.sol | esPaimon 质押获得 Boost |
| 外部激励池 | Nitro Pool | NitroPool.sol | 外部项目激励池 |
| 储蓄率合约 | Saving Rate | SavingRate.sol | USDP 储蓄生息 |
| 奖励分发器 | Reward Distributor | RewardDistributor.sol | 多资产奖励分发 |
| 预言机 | Oracle | RWAPriceOracle.sol | RWA 资产定价 |
| DEX 工厂 | DEX Factory | DEXFactory.sol | 创建交易对 |
| DEX 路由 | DEX Router | DEXRouter.sol | 交易路由 |
| DEX 交易对 | DEX Pair | DEXPair.sol | AMM 交易对合约 |

---

## 治理相关

| 中文 | 英文 | 说明 |
|------|------|------|
| 治理 | Governance | 协议参数决策机制 |
| 投票 | Vote | vePaimon 持有者投票 |
| 投票权 | Voting Power | 基于锁仓时长和数量计算 |
| 提案 | Proposal | 治理提案 |
| 快照 | Snapshot | 某一时刻的状态记录 |
| 纪元/周期 | Epoch | 7 天为一个周期 |
| 贿赂 | Bribe | 用户向投票者提供奖励以影响投票 |
| 流动性挖矿权重 | Gauge Weight | 各池流动性挖矿分配比例 |

---

## 激励机制

| 中文 | 英文 | 说明 |
|------|------|------|
| 收益加成/加速 | Boost | 质押 esPaimon 获得 1.0x-1.5x 收益倍数 |
| 外部激励 | External Incentive | 外部项目提供的额外奖励 |
| 流动性挖矿 | Liquidity Mining | LP 质押获得代币奖励 |
| 奖励 | Reward | 流动性挖矿或 Boost 的收益 |
| 归集/领取 | Claim | 一键领取所有奖励 |
| 年化收益率 | Annual Percentage Rate | APR | 年化收益率 (不含复利) |
| 年化收益 | Annual Percentage Yield | APY | 年化收益 (含复利) |

---

## 财务术语

| 中文 | 英文 | 说明 |
|------|------|------|
| 抵押率 | Loan-to-Value Ratio | LTV | 抵押资产价值与贷款价值比例 |
| 总锁仓价值 | Total Value Locked | TVL | 协议管理的总资产价值 |
| 储备金 | Reserve | 国库储备资产 |
| 滑点 | Slippage | 交易价格偏离预期的程度 |
| 套利 | Arbitrage | 利用价差获利 |
| 锚定 | Peg | 稳定币与目标价格的关系 (如 $1) |
| 脱锚 | Depeg | 稳定币价格偏离目标价格 |
| 手续费 | Fee | 交易或操作收取的费用 |
| 分红指数 | Accrual Index | USDP 累积收益指数 |
| 份额 | Share | USDP 的内部表示单位 |

---

## 技术术语

| 中文 | 英文 | 说明 |
|------|------|------|
| 智能合约 | Smart Contract | 区块链上的自动执行代码 |
| 外部账户地址 | Externally Owned Account | EOA | 用户钱包地址 |
| 合约地址 | Contract Address | 智能合约部署地址 |
| 交易哈希 | Transaction Hash | 交易唯一标识 |
| 区块 | Block | 区块链的基本单元 |
| 区块高度 | Block Height | 区块编号 |
| 时间戳 | Timestamp | Unix 时间戳 (秒) |
| Gas | Gas | 执行交易消耗的计算单位 |
| Gas 价格 | Gas Price | 每单位 Gas 的价格 (gwei) |
| 不变量 | Invariant | 必须始终满足的条件 |
| 重入攻击 | Reentrancy Attack | 恶意递归调用漏洞 |
| 闪电贷 | Flash Loan | 单笔交易内借贷 |
| 预言机 | Oracle | 链上链下数据桥接 |
| 多签钱包 | Multi-Signature Wallet | 需多个签名的钱包 |
| 时间锁 | Timelock | 延迟执行机制 |

---

## DEX 专用术语

| 中文 | 英文 | 说明 |
|------|------|------|
| 交易对 | Trading Pair | 如 USDC/USDP |
| 储备金 | Reserve | 流动性池的代币储备 |
| 恒定乘积 | Constant Product | K = reserve0 × reserve1 |
| 添加流动性 | Add Liquidity | 存入两种代币到池子 |
| 移除流动性 | Remove Liquidity | 取回流动性和手续费 |
| 兑换 | Swap | 代币兑换 |
| 路径 | Path | 多跳交易路径 (如 A→B→C) |
| 价格影响 | Price Impact | 交易对价格的影响 |

---

## RWA 资产分级

| 中文 | 英文 | 符号 | LTV | 说明 |
|------|------|------|-----|------|
| 一级资产 | Tier 1 Asset | T1 | 80% | 美国国债 |
| 二级资产 | Tier 2 Asset | T2 | 65% | 投资级信用债 |
| 三级资产 | Tier 3 Asset | T3 | 50% | RWA 收益池 |

---

## 前端 UI 术语

| 中文 | 英文 | 说明 |
|------|------|------|
| 连接钱包 | Connect Wallet | 连接 MetaMask/WalletConnect |
| 断开连接 | Disconnect | 断开钱包连接 |
| 切换网络 | Switch Network | 切换到 BSC 主网/测试网 |
| 待处理 | Pending | 交易提交但未确认 |
| 确认中 | Confirming | 等待区块确认 |
| 成功 | Success | 交易成功 |
| 失败 | Failed | 交易失败 |
| 余额 | Balance | 账户代币余额 |
| 可用余额 | Available Balance | 可操作的余额 |
| 已锁定 | Locked | 锁定中不可用 |
| 我的持仓 | My Position | 用户的流动性/质押仓位 |
| 历史记录 | History | 操作历史 |
| 详情 | Details | 详细信息 |
| 设置 | Settings | 设置页面 |
| 语言 | Language | EN/CN 切换 |
| 暗色模式 | Dark Mode | 暗色主题 (不支持) |
| 亮色模式 | Light Mode | 亮色主题 (默认) |

---

## 状态标识

| 中文 | 英文 | 说明 |
|------|------|------|
| 待处理 | Pending | 等待开始 |
| 进行中 | In Progress | 正在执行 |
| 已完成 | Completed | 已成功完成 |
| 失败 | Failed | 执行失败 |
| 已暂停 | Paused | 合约已暂停 |
| 已激活 | Active | 正常运行 |
| 已过期 | Expired | 已超过期限 |
| 已归属 | Vested | esPaimon 已释放 |
| 未归属 | Unvested | esPaimon 未释放 |

---

## 合约事件 (Events)

| 中文 | 英文 | 触发场景 |
|------|------|----------|
| 铸造事件 | Mint | 铸造新代币 |
| 销毁事件 | Burn | 销毁代币 |
| 转账事件 | Transfer | 代币转账 |
| 批准事件 | Approval | 授权额度变更 |
| 锁仓事件 | Locked | 锁仓 vePaimon |
| 质押事件 | Staked | 质押 esPaimon |
| 取消质押事件 | Unstaked | 取消质押 |
| 奖励领取事件 | RewardClaimed | 领取奖励 |
| 流动性添加事件 | LiquidityAdded | 添加流动性 |
| 流动性移除事件 | LiquidityRemoved | 移除流动性 |
| 兑换事件 | Swap | DEX 兑换 |
| 投票事件 | Voted | 治理投票 |
| 贿赂创建事件 | BribeCreated | 创建贿赂 |
| Boost 应用事件 | BoostApplied | 应用 Boost 倍数 |
| 利息累积事件 | InterestAccrued | 储蓄利息累积 |

---

## 错误提示 (Errors)

| 中文 | 英文 | 说明 |
|------|------|------|
| 余额不足 | Insufficient Balance | 账户余额不够 |
| 授权不足 | Insufficient Allowance | 授权额度不够 |
| 滑点过大 | Slippage Too High | 价格偏离超过容忍度 |
| 未授权 | Unauthorized | 无权限操作 |
| 已暂停 | Paused | 合约已暂停 |
| 无效参数 | Invalid Parameter | 参数错误 |
| 锁仓期未结束 | Lock Not Expired | 锁仓期未到 |
| 零地址 | Zero Address | 地址为 0x0 |
| 重入攻击检测 | Reentrancy Detected | 检测到重入尝试 |
| Oracle 价格过时 | Stale Price | 预言机数据过期 |

---

## 常用缩写

| 缩写 | 全称 | 中文 |
|------|------|------|
| APR | Annual Percentage Rate | 年化收益率 |
| APY | Annual Percentage Yield | 年化收益 (复利) |
| TVL | Total Value Locked | 总锁仓价值 |
| LTV | Loan-to-Value | 抵押率 |
| LP | Liquidity Provider / Liquidity Pool | 流动性提供者/流动性池 |
| AMM | Automated Market Maker | 自动做市商 |
| DEX | Decentralized Exchange | 去中心化交易所 |
| RWA | Real World Asset | 真实世界资产 |
| PSM | Peg Stability Module | 协议稳定性模块 |
| NFT | Non-Fungible Token | 非同质化代币 |
| EOA | Externally Owned Account | 外部账户地址 |
| UTC | Coordinated Universal Time | 协调世界时 |
| BSC | Binance Smart Chain | 币安智能链 |
| ERC20 | Ethereum Request for Comment 20 | 以太坊代币标准 |
| ERC721 | Ethereum Request for Comment 721 | 以太坊 NFT 标准 |

---

## 改造前后术语映射

| 旧术语 | 新术语 | 说明 |
|--------|--------|------|
| HYD | USDP | 稳定币重命名 |
| VotingEscrow | VotingEscrowPaimon | 明确绑定 PAIMON |
| veNFT | vePAIMON | 明确代币名称 |
| (无) | esPaimon | 新增激励代币 |
| (无) | BoostStaking | 新增 Boost 质押 |
| (无) | NitroPool | 新增外部激励 |
| (无) | SavingRate | 新增储蓄生息 |
| maxMintedHYD | (移除) | PSM 不再追踪 mint 上限 |
| VOTER_FEE (75%) | voterShare (70%) | 动态计算,比例调整 |
| TREASURY_FEE (25%) | treasuryShare (30%) | 动态计算,比例调整 |

---

## 命名规范

### 合约命名
- **格式**: PascalCase (如 `VotingEscrowPaimon.sol`)
- **示例**: USDP, esPaimon, BoostStaking, NitroPool

### 变量命名
- **公开变量**: camelCase (如 `totalSupply`, `accrualIndex`)
- **私有变量**: _camelCase (如 `_shares`, `_totalShares`)
- **常量**: UPPER_SNAKE_CASE (如 `MAX_TIME`, `VESTING_PERIOD`)

### 函数命名
- **格式**: camelCase (如 `depositRWA`, `getBoostMultiplier`)
- **示例**: lock, unlock, stake, unstake, claim, vote

### 事件命名
- **格式**: PascalCase (如 `Transfer`, `BoostApplied`)
- **过去式**: 如 `Locked`, `Staked`, `Claimed`

---

## 使用指南

1. **代码开发**: 严格遵循英文命名规范
2. **文档编写**: 中英文对照,技术文档优先英文
3. **前端 UI**: 支持中英文切换 (next-intl)
4. **注释**: 中文或英文均可,保持一致性
5. **Git Commit**: 英文 (Conventional Commits)

---

## 参考

- PRD: `.ultra/docs/prd.md`
- Technical Design: `.ultra/docs/tech.md`
- Economic Parameters: `.ultra/docs/economic-params.md`
- Project CLAUDE.md: `.claude/CLAUDE.md`

---

**状态**: ✅ 最终确认
**维护**: 随协议演进持续更新
