## 一、总体目标

- **多模块协议架构**：在 BSC 上部署支持 **USDP 稳定币**、**RWA 抵押池**、**ve-token 治理**、**DEX 交易** 与 **Launchpad** 的完整 DeFi 体系。USDP 为与美元 1:1 挂钩的稳定币，其储备需做到 100% 现金支持，保证用户可随时按1:1赎回[paxos.com](https://www.paxos.com/usdp#:~:text=1%3A1%20redemption%2C%20always%20available)[paxos.com](https://www.paxos.com/newsroom/yield-bearing-stablecoin-lift-dollar-usdl-launches-on-arbitrum#:~:text=USDL%20gives%20eligible%20users%20direct,reserve%E2%80%99s%20assets%20are%20held%20in)。
- **代币体系**：发行主代币 **Paimon** 和激励代币 **esPaimon**，总供应上限 **100亿**。Paimon 用于治理和奖励分配，esPaimon 用于推动流动性激励与社区奖励。两者配合可实现长期锁仓和收益分配。
- **模块功能**：包括稳定币铸造/赎回、RWA 抵押借贷、流动性挖矿、治理投票、资产发行 (Launchpad) 等功能。每个模块通过智能合约接口互联互通，形成可组合的 DeFi 生态。

## 二、代币经济模型

- **Paimon 与 esPaimon 双代币设计**：Paimon 为主代币，可锁仓获取 **vePaimon** 参与治理；esPaimon 为激励代币，仅用于流动性激励和 Bribe 投票，不具备治理权。两者总量合计 100 亿。Paimon 初始流通数量可设为项目方预留（如 15%）、团队激励（10%）、社区基金（20%）、空投用户（5%）、DAO 储备（20%）、LP/流动性激励（30%）等（具体比例可根据社区共识调整）。
- **PAIMON 三阶段排放机制**：
  - **Phase-A (周1-12)**：固定排放 37,500,000 PAIMON/周，通道分配为 Debt 30% / LP 60% / Eco 10%
  - **Phase-B (周13-248)**：指数衰减，初始E0_B ≈ 55,584,000，衰减率r=0.985 (每周1.5%衰减)，通道分配为 Debt 50% / LP 37.5% / Eco 12.5%
  - **Phase-C (周249-352)**：固定排放 4,326,923 PAIMON/周，通道分配为 Debt 55% / LP 35% / Eco 10%
  - LP内部二级分流：AMM Pairs 60% / Stability Pool 40% (治理可调)
  - 352周总排放约10B PAIMON，其中社区排放100%归属化(esPaimon)，365天线性解锁
- **锁仓规则和权重**：用户可以锁定 Paimon 代币获得 vePaimon。根据 Vote-Escrow 模型，锁仓期限越长，获得的 ve 权重越高；最短锁仓周期 1 周，最长可达 2 年（104 周）。例如，锁 1 Paimon 12 个月可获得一定 vePaimon 权重，锁 48 个月可获得更高权重。vePaimon 不可转移，仅用于治理投票和收益分配。
- **代币用途**：
    - *esPaimon*：可质押获得 **Paimon Boost**，增加用户在流动性挖矿中的收益，且可用于 Bribe 投票（通过支持某个流动池赚取额外奖励），但 esPaimon 本身不具备治理权。
    - *Paimon*：用于治理和价值分配，用户锁仓后获得 vePaimon，参与协议治理（包括流动性排放权重投票、Launchpad 项目投票、DAO 提案等）。持有 Paimon 还可通过质押获得奖励或分红。
- **初始分配**：建议按生态激励和长期发展需求进行分配，例如预留 30% 给社区与生态激励（包括 LP 奖励、RWA 债权抵押奖励、Launchpad 等），团队和顾问 10%-15%，DAO 储备 20%，空投 5%，其余留作流动性激励和战略合作。具体分配比例需在部署前通过社区讨论确定。

## 三、激励路径与参与者分配

- **USDP 持有者（稳定币用户）**：USDP稳定币**默认不被动生息**（accrualPaused=true），储蓄收益由**SavingRate独立模块**承接。用户需**主动将USDP存入SavingRate合约**才能赚取利息（2-3% APR），利息来源于国库通过fund()注资。这一设计确保稳定币本身的简洁性和安全性，同时为寻求收益的用户提供独立的储蓄通道。SavingRate的利息由RWA收益和协议盈余支持，通过国库定期注资实现可持续分配。
- **RWA 抵押者（资产提供者）**：用户将真实世界资产（如股票、债券等）或 tokenized RWA 提供给协议作为抵押，可铸造 USDP 并参与收益。RWA 抵押者将从 USDP 铸造产生的利息或协议分红中获益。推荐将约 20%-30% 的 Paimon 排放用于奖励 RWA 抵押者（作为“债权质押池”回报），以鼓励优质资产的引入和贡献。
- **DEX 做市者（LP）**：为 DEX 流动性池提供流动性的用户将获得 Paimon 代币奖励。建议将最高比例（如 30%-40%）的代币排放用于流动性挖矿，涵盖主流交易对（如 USDP/BUSD, Paimon/USDP 等）。其中，部分流动性奖池应特别支持 RWA 相关池，为 RWA 项目提供初始流动性。
- **Bribe 激励**：协议专门预留一定比例（如 10%）的代币用于 **Bribe 机制**。其他协议或 RWA 项目可向 vePaimon 持有人提供 bribe（额外奖励），以诱导投票选择其目标流动池或提案。Cube Exchange 的说明指出，bribe 是向投票参与者支付的激励，用于赢得对某一流动池(或提案)的选票。通过公开合约发放透明的贿选激励，可以有效引导社区向特定方向分配流动性。
- **ve 投票者（流动性分红）**：持有 vePaimon 并参与投票的用户将分享剩余的收益。具体来说，协议可以将代币排放的剩余部分（如 10%-20%）用于投票奖励或平台分红，按 ve 投票权重分配给参与投票的用户。这一部分激励有助于锁仓决策，使 vePaimon 持有者长期参与治理。

## 四、治理机制

- **vePaimon 锁仓与投票**：用户质押 Paimon 代币可获得 vePaimon，锁仓期限 1 周至 104 周，期限越长权重越高。vePaimon 赎回后需等待锁定期结束。vePaimon 可用于参与 **流动性排放权重投票、Launchpad项目投票、USDP 抵押资产扩展提案** 等治理决策。
- **每周投票与流动性分配**：每周固定时间（如每周四 00:00 UTC）进行投票统计，vePaimon 持有者可以将其权重分配给不同的流动性矿池（Gauge），决定各池的排放权重。参考 Curve 模型，协议将根据投票权重分配下周代币排放[docs.curve.finance](https://docs.curve.finance/liquidity-gauges-and-minting-crv/gauge-controller/GaugeController/#:~:text=Gauge%20weights%20are%20updated%20every,same%20for%20all%20subsequent%20weeks)。例如，若某池获得 10% 的票权，则将分配约 10% 的当周 Paimon 奖励[docs.curve.finance](https://docs.curve.finance/liquidity-gauges-and-minting-crv/gauge-controller/GaugeController/#:~:text=Gauge%20weights%20are%20updated%20every,same%20for%20all%20subsequent%20weeks)。若连续多周无人投票，则延续上周权重分配。
- **Launchpad 及资产提案投票**：针对 Launchpad 项目，由社区提名后进行 vePaimon 投票。投票通过后，项目进入 Launchpad 发行。发行成功后，另行发起投票决定是否将该资产列入 RWA 抵押池（即允许用作 USDP 抵押物）。这种三阶段流程（项目提名→ve投票进入Launchpad→发行后ve投票准入抵押）确保项目质量和社区共识[odaily.news](https://www.odaily.news/en/newsflash/446331#:~:text=ecological%20construction%20and%20application%20exploration,chain%20at%20a%20discounted%20price)。
- **Bribe 和 Gauge 投票模型**：引入公开的 Bribe 合约模块，任何项目或用户可投放资金作为奖励，挂钩到特定投票 (如支持某一流动池或提案)。通过 Bribe 平台，符合条件的 vePaimon 持有者若为该提案投票，即可按比例领取 bribe 奖励。此机制类似 Curve Wars 中的投票激励模式，有助于吸引生态项目积极参与治理和流动性建设[docs.curve.finance](https://docs.curve.finance/liquidity-gauges-and-minting-crv/gauge-controller/GaugeController/#:~:text=Gauge%20weights%20are%20updated%20every,same%20for%20all%20subsequent%20weeks)。

## 五、Launchpad 模块

- **三阶段治理流程**：①**项目提名**：用户或团队提名待发行资产（如新股权代币、基金份额等）。②**社区投票**：vePaimon 持有者对提名项目进行投票决策，决定是否纳入 Launchpad。③**发行及后续评估**：项目通过审核后在 Launchpad 发售，用户可在折扣价购买 Token（如 Paimon Stockpad 支持用户以折扣购入代币化股票[odaily.news](https://www.odaily.news/en/newsflash/446331#:~:text=ecological%20construction%20and%20application%20exploration,chain%20at%20a%20discounted%20price)）。发行结束后，再次发起提案投票，决定该资产是否作为 RWA 抵押物纳入协议（允许用户抵押该资产铸造 USDP）。
- **Launchpad 激励来源**：协议在代币排放中预留专用份额（可为 LP 奖励池的一部分或单独激励池），用于支持 Launchpad 项目。参与 Launchpad 的用户可根据其参与额度（如购买额或质押Paimon量）获得 Paimon 奖励。成功发行后，项目可按协议规则获得一定比例的 USDP 或稳定基金支持，用于补充其流动性或偿付。
- **流动性与稳定池回馈**：对成功的 Launchpad 项目，协议将其部分收益返馈至流动性或稳定池。例如，可将项目交易产生的手续费或溢价分成拨入流动性池，增加该资产的流动性深度；或者预留部分 USDP 给稳定基金以稳定价格。如此设计可形成良性循环：好的资产项目获得初始支持，并通过对流动性的贡献为后续用户提供奖励。

## 六、清算与稳定机制

- **USDP稳定性设计**：USDP采用share-based会计模型，通过accrualIndex管理账户余额（balanceOf = shares × accrualIndex / 1e18）。但**accrualIndex默认暂停累积**（accrualPaused=true），USDP本身不被动生息。用户若需赚取利息，需主动将USDP存入**SavingRate储蓄合约**，由国库定期fund()注资，提供2-3%年化收益。这种设计分离了稳定币的交易属性和储蓄属性，确保USDP核心功能的简洁和安全。
- **分层 RWA 健康度监控**：针对不同类别的 RWA（股票、债券、基金等），设置多级风险等级和健康度指标。协议根据市场价、流动性和监管要求设定各资产的借款价值（LTV）和清算阈值。若单项资产价值跌破预设安全线，触发**单体清算**：通过协议准备的清算路径（如通过套利合约或拍卖合约）对该资产进行清算，锁定部分储备回收损失。
- **全局 LTV 监控与拍卖**：协议实时监控所有 USDP 发行对应的总抵押价值（含全部 RWA 及其他抵押物）与市场价比值。当**全局抵押率 (全局 LTV)** 超过安全阈值时，启动 DAO 投票决定是否进行**紧急拍卖**或增发 USDP、动用稳定基金。拍卖可调用指定合约，将部分 RWA 资产在去中心化市场上出售，以补充储备并恢复平衡。
- **稳定基金来源**：协议建立稳定基金用于吸收系统风险，资金来源包括：违约或清算罚没的 RWA 抵押物价值、USDP 铸造过程中的息差收益、流动性交易中收取的手续费、Bribe 平台收取的手续费等。收集的稳定基金可用于在紧急情况下回购USDP、补充损失或奖励长期用户。

## 七、智能合约模块与接口

- **Treasury 合约**：核心资金库，负责管理 USDP 和 Paimon 的铸造、销毁和发行。主要功能包括 `mintUSDP(address to, uint256 amount)`、`burnUSDP(address from, uint256 amount)`、`depositCollateral(address asset, uint256 amount)`、`withdrawCollateral(address asset, uint256 amount)`、`mintPaimon(address to, uint256 amount)`、`distributeRewards()` 等。只有协议管理员或 DAO 批准的治理合约可以调用关键函数。Treasury 还记录抵押资产和债务状态。
- **Gauge 控制器 (GaugeController)**：管理流动性池的排放权重。功能包括 `addGauge(address gauge)`, `voteGauge(address gauge, uint256 weight)` 等，用于注册新的流动池和让 vePaimon 持有者投票分配权重。根据投票结果，每周计算各池的代币奖励分配。此合约功能类似 Curve 的 GaugeController[docs.curve.finance](https://docs.curve.finance/liquidity-gauges-and-minting-crv/gauge-controller/GaugeController/#:~:text=Gauge%20weights%20are%20updated%20every,same%20for%20all%20subsequent%20weeks)。
- **BribeRouter 合约**：协调贿选奖励发放。任何项目可调用 `addBribe(address gauge, address rewardToken, uint256 amount, uint256 epoch)` 将奖励锁定在目标 Gauge 上。投票结束后，符合投票条件的 vePaimon 持有者可通过 `claimBribe(address gauge)` 或社区前端领取其份额。BribeRouter 根据用户在特定 epoch 内对某 gauge 投票的权重来分配奖励。
- **Voting Escrow (vePaimon) 合约**：负责用户锁仓、获取 vePaimon 权重。主要函数 `createLock(uint256 amount, uint256 unlockTime)`、`increaseAmount(uint256 amount)`、`increaseUnlockTime(uint256 unlockTime)`、`withdraw()` 等。锁仓成功后自动铸造对应数量的 vePaimon（非转移型代币）。该合约需要限制锁仓时长和赎回时机，并监听锁仓变化更新投票权重。
- **Stability Fund / Liquidator 合约**：管理清算和稳定基金。功能包括 `liquidate(address vault)` 用于对触发清算的抵押仓位执行清算，`startAuction(uint256 assetId, uint256 amount)` 发起拍卖，`settleAuction(uint256 auctionId)` 结算拍卖结果。此合约也持有稳定基金账户，通过 `distributeToFund()` 将罚没或超额储备划入基金。访问控制需确保只有在治理条件满足时才允许清算操作。
- **Launchpad 提案模块**：负责项目提名和发行审批。包含 `proposeProject(bytes projectData)`、`voteProject(uint256 projectId, bool support)`、`finalizeProject(uint256 projectId)` 等。项目提名后生成投票期，用户以 vePaimon 权重投票决定进入 Launchpad。发行完成后再发起 `voteRWA(uint256 projectId, bool enable)`，决定是否将该项目资产添加到 RWA 抵押池。此模块应配合前端交互，展示状态和时间窗口。
- **用户接口示例**：
    - *抵押 & 铸造 USDP*：用户调用 Treasury 合约 `depositCollateral(asset, amt)` 抵押资产，然后 `mintUSDP(user, usdpAmt)` 获得 USDP。
    - *赎回*：用户调用 `burnUSDP(user, usdpAmt)`，协议按当前抵押率允许取回部分基础资产（可能收取少量手续费作为贡献）。
    - *流动性挖矿*：用户将代币对（如 USDP/币）存入 Gauge 合约，自动获得流动性凭证，Treasury 根据用户份额按周分发 Paimon 奖励。
    - *投票 & 锁仓*：用户通过 vePaimon 合约锁定 Paimon（`createLock`），获得 vePaimon；在治理界面调用 `voteGauge` 为指定流动池投票；调用 `voteProject` 支持 Launchpad 项目提名。
    - *质押 & 领取收益*：用户将 Paimon 或 esPaimon 存入质押合约，获得额外收益。例如，质押 esPaimon 增强流动性收益，调用 `stakeEsPaimon(amount)` 并定期 `claimReward()`。

## 八、经济模拟与示例

- **代币释放模拟**：以 100 亿总量为基准，假设前 30 天的每日 emissions 为 1,000 万 Paimon/天，前 90 天总发放约 30 亿（受衰减和上限约束）；180 天内累计 ~55 亿。可绘制图表显示每日释放曲线下滑。
- **锁仓收益示例**：假设用户锁仓 10 万 Paimon，12 个月期限，享有相对较高 vePaimon 权重。若协议每周分配流动性奖励 100 万 Paimon，则该用户占比约 $(100000\times权重)/(总锁仓权重)$，可计算其每周和累计奖励曲线（见示例）。
- **USDP 年化票息模拟**：假设 RWA 抵押池年化收益率 5%，accrualIndex 机制每日分配，USDP 持币者相当于年化 5%的利息。具体可模拟用户持有 10万 USDP，一年后因指数增长可赎回 ≈105,000 美元，正反映协议稳定币的票息收益。

以上设计为一个模块化的完整 DeFi 系统方案，涵盖代币发行、经济模型、激励分配、治理流程、风险监控、智能合约架构和核心接口，为开发团队提供了详尽且可落地的参考。各模块需在设计细节上结合实际开发资源和社区治理共识进一步细化和调整。