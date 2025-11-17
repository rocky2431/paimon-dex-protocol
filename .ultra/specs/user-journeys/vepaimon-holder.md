# vePAIMON 持有者 - 用户旅程文档

**版本**: v1.0
**最后更新**: 2025-11-17
**对应系统版本**: V1.5+（治理模块激活后）

---

## 一、用户画像

### 1.1 典型用户特征

**用户类型**:
- **协议早期支持者**: 看好长期价值，愿意锁定代币
- **治理参与者**: 关心协议发展方向，积极投票
- **收益最大化者**: 追求 DeFi 收益（40-60% APR）
- **流动性提供者**: 希望通过投票权增加 LP 收益
- **DAO 积极分子**: 参与社区讨论、提交提案

**资金规模**:
- 入门级: 1,000-10,000 PAIMON（$50-$500，按 $0.05/PAIMON）
- 中等级: 10,000-100,000 PAIMON（$500-$5,000）
- 大户: 100,000+ PAIMON（$5,000+）
- 巨鲸: 1,000,000+ PAIMON（$50,000+，影响协议投票）

**技术能力**:
- 基础: 理解 ve(3,3) 模型、投票权重计算
- 中级: 会分析 Gauge 权重分布、Bribe ROI
- 高级: 参与链上治理、提交提案

### 1.2 用户价值主张

| 传统 DeFi Staking | vePAIMON 模型 | 优势 |
|------------------|--------------|------|
| 单一 Staking 收益 5-8% | 多重收益源 40-60% APR | **收益 ↑500-750%** |
| 代币锁定无补偿 | 投票权 → Bribe 收入 | **额外收益流** |
| 无治理参与权 | 决定协议发展方向 | **治理权力** |
| 收益固定 | 通过投票影响排放 | **主动收益管理** |
| veToken 不可转让 | **veNFT 可交易**（ERC721） | **流动性 ↑100%** |

**核心卖点**:
- ✅ **高收益**: 40-60% APR 综合收益（Emission + Bribe + Boost + Protocol Fee）
- ✅ **可转让 veNFT**: 突破 Curve 限制，NFT 可在 OpenSea 交易
- ✅ **治理权力**: 决定 PAIMON 排放分配（影响生态发展）
- ✅ **Boost 乘数**: 提升所有奖励 1.5 倍（适用于 LP、Debt Mining、Ecosystem）
- ✅ **协议费分成**: 分享 DEX 手续费、Treasury 铸造费

---

## 二、完整操作流程

### Phase 0: 准备阶段（获取 PAIMON）

#### 步骤 0.1: 获取 PAIMON 代币

**方式 A: DEX 购买（推荐）**
```
1. 访问 https://paimon.dex/swap
2. 连接钱包（MetaMask）
3. 交易对: USDC / PAIMON
4. 输入金额: 1,000 USDC
5. 预计获得: ~20,000 PAIMON（按 $0.05/PAIMON）

手续费: 0.3%（3 USDC）
Gas 费: ~0.0012 BNB (~$0.48)
```

**方式 B: Launchpad 早期投资**
```
参与 RWA 项目 Launchpad → 获得 PAIMON 奖励
示例:
  投资 $10,000 → 获得 5,000 PAIMON 奖励（$250 价值）
  年化收益: 2.5% 额外 APR
```

**方式 C: 流动性挖矿**
```
提供 USDC/PAIMON LP → 获得 PAIMON 排放奖励
  LP 价值: $10,000
  周排放: ~500 PAIMON（按 Gauge 权重 5%）
  APR: 26%（500 * 52 / 10,000）
```

#### 步骤 0.2: 准备 BNB Gas 费

```
最低需求: 0.02 BNB（~$8）
推荐准备: 0.1 BNB（~$40，够用 50-100 次投票/领奖操作）
```

---

### Phase 1: 创建 veNFT（锁定 PAIMON）

#### 步骤 1.1: 访问 Lock 页面

**前端路径**: `https://paimon.dex/lock`

**页面布局**:
```
┌──────────────────────────────────────────────────────────┐
│  vePAIMON Lock                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                           │
│  📊 协议统计                                              │
│  ┌────────────┬────────────┬────────────┬──────────────┐│
│  │ 总锁定量   │ 平均锁定期  │ veNFT 数量 │ 当前 APR     ││
│  │ 250M PAIMON│ 2.1 年     │ 3,247      │ 52%          ││
│  └────────────┴────────────┴────────────┴──────────────┘│
│                                                           │
│  💰 Create Lock                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │ 锁定数量:  [____________]  [Max]                  │  │
│  │ Balance: 20,000 PAIMON                            │  │
│  │                                                   │  │
│  │ 锁定时长:  [━━━━━●━━━━━━━] 2 年                  │  │
│  │            1 周 ← → 4 年                          │  │
│  │                                                   │  │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │  │
│  │                                                   │  │
│  │ 你将获得:                                         │  │
│  │   veNFT #1234                                     │  │
│  │   初始投票权: 10,000 vePAIMON                     │  │
│  │   线性衰减至: 0（2 年后）                         │  │
│  │   当前估算 APR: 52%                               │  │
│  │                                                   │  │
│  │ 收益来源:                                         │  │
│  │   • Emission 排放: 25% APR                        │  │
│  │   • Bribe 贿赂: 15% APR                           │  │
│  │   • Boost 加成: +8% APR                           │  │
│  │   • Protocol Fee: 4% APR                          │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│  [Approve PAIMON] → [Create Lock]                        │
└──────────────────────────────────────────────────────────┘
```

#### 步骤 1.2: 选择锁定参数

**参数 1: 锁定数量**
```
最低: 100 PAIMON（$5 价值，防止垃圾攻击）
推荐: 10,000+ PAIMON（获得有意义的投票权）

示例决策:
  10,000 PAIMON → 锁定 2 年 → 初始投票权 5,000 vePAIMON
  20,000 PAIMON → 锁定 4 年 → 初始投票权 20,000 vePAIMON
```

**参数 2: 锁定时长**
```
最短: 1 周（7 天）
最长: 4 年（208 周）

投票权计算公式:
  vePAIMON = PAIMON_locked * lock_duration / MAX_LOCK_DURATION
          = PAIMON_locked * (weeks) / 208

示例:
  锁定 10,000 PAIMON × 2 年（104 周）:
  vePAIMON = 10,000 * 104 / 208 = 5,000

  锁定 10,000 PAIMON × 4 年（208 周）:
  vePAIMON = 10,000 * 208 / 208 = 10,000（最大化）
```

**线性衰减机制**:
```
vePAIMON 余额随时间线性衰减至 0:

时间 T0（锁定时）:
  vePAIMON = 10,000

时间 T1（1 年后，剩余 1 年）:
  vePAIMON = 10,000 * (52 weeks / 104 weeks) = 5,000

时间 T2（2 年后，锁定到期）:
  vePAIMON = 0

用户需定期延长锁定期以维持投票权。
```

#### 步骤 1.3: 授权并创建 veNFT

**交易 1: Approve PAIMON**
```solidity
PAIMON.approve(VOTING_ESCROW_ADDRESS, type(uint256).max);
```
**Gas 费**: ~0.0002 BNB (~$0.08)

**交易 2: Create Lock**

**涉及合约**: `VotingEscrowPaimon` (0x...)

```solidity
// VotingEscrowPaimon.sol
function createLock(
    uint256 _value,        // 10,000 * 1e18 PAIMON
    uint256 _lockDuration  // 104 weeks (2 years)
) external returns (uint256 tokenId);
```

**执行细节**:
```
锁定: 10,000 PAIMON（转入合约托管）
获得: veNFT #1234（ERC721 代币）

veNFT 属性:
  tokenId: 1234
  owner: 你的地址
  lockedAmount: 10,000 PAIMON
  lockedEnd: block.timestamp + 104 weeks
  votingPower: 5,000 vePAIMON（初始）

Gas 费: ~0.0015 BNB (~$0.60)
```

**MetaMask 确认界面**:
```
┌─────────────────────────────────────┐
│ Create vePAIMON Lock                │
│                                     │
│ Lock: 10,000 PAIMON                 │
│ Duration: 2 years                   │
│ Voting Power: 5,000 vePAIMON        │
│                                     │
│ You will receive: veNFT #1234       │
│                                     │
│ Gas Fee: 0.0015 BNB (~$0.60)        │
│ [Reject]          [Confirm]         │
└─────────────────────────────────────┘
```

#### 步骤 1.4: 查看 veNFT 在 OpenSea（可选）

**veNFT 可视化**:
```
访问: https://opensea.io/assets/bsc/{VOTING_ESCROW_ADDRESS}/1234

NFT 元数据:
  Name: vePAIMON #1234
  Image: 动态生成图片（显示锁定量、剩余时间、投票权）
  Attributes:
    - Locked PAIMON: 10,000
    - Lock End: 2027-11-17
    - Current Voting Power: 5,000 vePAIMON
    - Decay Rate: -24 vePAIMON/week

挂单出售（可选）:
  如果需要提前退出，可在 OpenSea 挂单
  建议定价: (锁定量 + 累积收益) * 折现率
  示例: 10,000 PAIMON + $500 收益 → 挂单 9,000 PAIMON 等值
```

---

### Phase 2: 参与 Gauge 投票

#### 步骤 2.1: 理解 Gauge 投票机制

**什么是 Gauge**:
```
Gauge = PAIMON 排放的分配权重

每个流动性池都有一个 Gauge，vePAIMON 持有者投票决定：
  哪个池子获得更多 PAIMON 排放？

示例 Gauge 列表:
  1. USDC/USDP Gauge  → 当前权重 20%
  2. PAIMON/USDC Gauge → 当前权重 15%
  3. WBNB/USDP Gauge   → 当前权重 10%
  4. pUST125/USDC Gauge → 当前权重 5%
  ... (共 20+ Gauges)
```

**投票权重计算**:
```
你的投票权 = vePAIMON 余额

示例:
  你有 5,000 vePAIMON
  协议总 vePAIMON: 500,000
  你的投票权占比: 1%

如果你投票给 USDC/USDP Gauge:
  该 Gauge 权重 +1%
  该池子 PAIMON 排放 +1%
```

**Epoch 机制**:
```
投票周期: 每周四 00:00 UTC 开始新 Epoch
生效时间: 投票后下一个 Epoch 生效
锁定期: 投票后不可修改，直到当前 Epoch 结束

时间线:
  周一 10:00: 你投票给 USDC/USDP Gauge
  周四 00:00: 新 Epoch 开始，你的投票生效
  下周四 00:00: Epoch 结束，可重新分配投票
```

#### 步骤 2.2: 访问 Gauge 投票页面

**前端路径**: `https://paimon.dex/gauges`

**页面布局**:
```
┌────────────────────────────────────────────────────────────────┐
│  Gauge Voting - Epoch 142                                       │
│  结束时间: 2d 14h 32m  │  我的投票权: 5,000 vePAIMON (1%)       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                                 │
│  ⚡ 推荐池子（Bribe 最高）                                      │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 池子               │ 当前权重│ 下周排放  │ Bribe    │操作││ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │ USDC/USDP         │ 20%     │ 750K PAIMON│ $12K USDC│[Vote]││
│  │ PAIMON/USDC       │ 15%     │ 562K PAIMON│ $8K USDC │[Vote]││
│  │ WBNB/USDP         │ 10%     │ 375K PAIMON│ $5K USDC │[Vote]││
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  📊 所有 Gauges                                                 │
│  [排序: Bribe ↓]  [筛选: 仅我投票的]  [搜索: ___]              │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 池子               │ TVL     │ 权重 │ APR   │ Bribe      ││ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │ ✅ USDC/USDP       │ $5M     │ 20%  │ 15%   │ $12K → [+]││ │
│  │    我的投票: 3,000 vePAIMON (60%)                        ││ │
│  │                                                          ││ │
│  │ ⬜ PAIMON/USDC     │ $2M     │ 15%  │ 28%   │ $8K  → [+]││ │
│  │    我的投票: 0 vePAIMON (0%)                             ││ │
│  │                                                          ││ │
│  │ ⬜ WBNB/USDP       │ $1.5M   │ 10%  │ 25%   │ $5K  → [+]││ │
│  │    我的投票: 2,000 vePAIMON (40%)                        ││ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  已分配: 5,000 / 5,000 vePAIMON (100%)                         │
│  [Reset All]  [Submit Votes]                                   │
└────────────────────────────────────────────────────────────────┘
```

#### 步骤 2.3: 分配投票权

**策略 A: 集中投票（最大化单池 Bribe）**
```
100% 投票给 Bribe 最高的池子:
  5,000 vePAIMON → USDC/USDP Gauge

预期收益:
  Bribe 总额: $12,000 USDC
  协议总投票权: 500,000 vePAIMON
  你的份额: 5,000 / 500,000 = 1%
  你的 Bribe 收入: $12,000 * 1% = $120 USDC（每周）
  年化: $120 * 52 = $6,240
  APR: $6,240 / $500 (10K PAIMON @ $0.05) = 1,248%（仅 Bribe）
```

**策略 B: 分散投票（降低风险）**
```
60% → USDC/USDP Gauge（稳定，高 Bribe）
40% → PAIMON/USDC Gauge（支持 PAIMON 流动性）

预期收益:
  USDC/USDP Bribe: $12K * (3,000/500,000) = $72
  PAIMON/USDC Bribe: $8K * (2,000/500,000) = $32
  合计: $104 USDC/week = $5,408/year
  APR: 1,081%（仅 Bribe）
```

**策略 C: 战略投票（影响生态）**
```
50% → 新上线的 RWA 池（支持生态发展）
50% → USDC/USDP Gauge（稳定收益）

trade-off:
  ✅ 帮助新项目获得流动性
  ✅ 未来可能获得项目方感谢空投
  ❌ 短期 Bribe 收入较低
```

#### 步骤 2.4: 提交投票

**涉及合约**: `GaugeController` (0x...)

```solidity
// GaugeController.sol
function voteForGaugeWeights(
    address[] memory _gauges,    // [USDC/USDP Gauge, WBNB/USDP Gauge]
    uint256[] memory _weights    // [3000, 2000] (basis points, 总和 5000)
) external;
```

**执行细节**:
```
投票分配:
  USDC/USDP Gauge: 3,000 vePAIMON (60%)
  WBNB/USDP Gauge: 2,000 vePAIMON (40%)

Gas 费: ~0.002 BNB (~$0.80，多 Gauge 投票消耗较高）

生效时间: 下个 Epoch（周四 00:00 UTC）
锁定期: 当前 Epoch 结束前不可修改
```

---

### Phase 3: 领取 Bribe 奖励

#### 步骤 3.1: Bribe 累积机制

**Bribe 来源**:
```
项目方 / 协议 / LP 提供者 为吸引 vePAIMON 投票而支付的贿赂。

示例:
  USDC/USDP 池的 LP 提供者:
    "我希望这个池子获得更多 PAIMON 排放 → LP APR ↑ → 更多人提供流动性"
    → 向 GaugeController 存入 $12,000 USDC 作为 Bribe
    → 投票给该 Gauge 的 vePAIMON 持有者按比例分配

Bribe 代币类型:
  - USDC / USDT（最常见，稳定币）
  - PAIMON（协议回购 + 分发）
  - RWA 项目代币（如 pUST125）
  - 其他 BSC 生态代币（CAKE, BNB 等）
```

**累积周期**:
```
每周四 Epoch 结束 → 自动快照投票权重 → 计算 Bribe 分配

时间线:
  11 月 14 日（周四）: Epoch 141 结束，快照投票
  11 月 15 日: Bribe 可领取
  11 月 21 日（周四）: Epoch 142 结束，新一轮 Bribe
```

#### 步骤 3.2: 访问 Rewards 页面

**前端路径**: `https://paimon.dex/rewards`

**页面显示**:
```
┌──────────────────────────────────────────────────────────┐
│  My Rewards                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                           │
│  💰 可领取 Bribe（Epoch 141）                             │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 代币        │ 数量           │ 价值     │ 操作    ││ │
│  ├────────────────────────────────────────────────────┤ │
│  │ USDC        │ 104.00         │ $104     │ [Claim]││ │
│  │ PAIMON      │ 50.00          │ $2.5     │ [Claim]││ │
│  │ pUST125     │ 25.00          │ $25      │ [Claim]││ │
│  └────────────────────────────────────────────────────┘ │
│  Total: $131.50  [Claim All]                             │
│                                                           │
│  📊 历史收益（过去 30 天）                                │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Epoch  │ USDC   │ PAIMON │ 其他    │ 总价值       ││ │
│  ├────────────────────────────────────────────────────┤ │
│  │ 141    │ $104   │ $2.5   │ $25     │ $131.50      ││ │
│  │ 140    │ $98    │ $3     │ $20     │ $121.00      ││ │
│  │ 139    │ $110   │ $2     │ $15     │ $127.00      ││ │
│  │ 138    │ $92    │ $4     │ $30     │ $126.00      ││ │
│  └────────────────────────────────────────────────────┘ │
│  4 周累计: $505.50  │  年化: $6,571  │  APR: 1,314%    │
│                                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                           │
│  🎁 PAIMON 排放奖励                                       │
│  可领取: 250 esPAIMON (~$12.5)                            │
│  [Claim] [Stake to Boost]                                │
└──────────────────────────────────────────────────────────┘
```

#### 步骤 3.3: 领取奖励

**涉及合约**: `BribeMarketplace` (0x...)

```solidity
// BribeMarketplace.sol
function claimBribes(
    uint256[] memory _epochs,    // [141, 140, 139] 可批量领取
    address[] memory _tokens     // [USDC, PAIMON, pUST125]
) external;
```

**执行细节**:
```
领取 Epoch 141 Bribe:
  USDC: 104.00
  PAIMON: 50.00
  pUST125: 25.00

Gas 费: ~0.0008 BNB (~$0.32)

到账时间: 交易确认后即时
```

**批量领取优化**:
```
建议每月领取一次（累积 4 个 Epochs）:
  Gas 费: 单次 $0.32 vs 每周 $1.28（节省 75%）
  trade-off: 延迟收益复投
```

---

### Phase 4: 维护与优化投票权

#### 步骤 4.1: 延长锁定期

**为什么要延长**:
```
vePAIMON 线性衰减 → 投票权下降 → Bribe 收入 ↓

示例:
  初始: 5,000 vePAIMON
  1 年后: 2,500 vePAIMON（衰减 50%）
  Bribe 收入: $120/周 → $60/周（↓50%）

解决方案: 定期延长锁定期至最大值（4 年）
```

**操作步骤**:
```
前端路径: https://paimon.dex/lock/1234

[Extend Lock Duration]
  当前到期: 2026-11-17（剩余 1 年）
  延长至: 2029-11-17（+3 年 → 总计 4 年）

执行后:
  vePAIMON 恢复至最大值: 10,000（如果不增加锁定量）
  投票权恢复 100%
```

**涉及合约**:
```solidity
// VotingEscrowPaimon.sol
function increaseUnlockTime(
    uint256 _tokenId,
    uint256 _lockDuration  // 新的总锁定时长（最大 208 周）
) external;
```

**Gas 费**: ~0.0008 BNB (~$0.32)

#### 步骤 4.2: 增加锁定量

**操作**: 追加更多 PAIMON 到现有 veNFT

```
前端路径: https://paimon.dex/lock/1234

[Increase Lock Amount]
  当前锁定: 10,000 PAIMON
  追加: 5,000 PAIMON
  新锁定量: 15,000 PAIMON

投票权变化:
  当前 vePAIMON: 5,000（假设衰减至 50%）
  新 vePAIMON: 15,000 * (剩余周数 / 208)
              = 15,000 * (52 / 208)
              = 3,750

注意: 新追加的 PAIMON 继承原 veNFT 的到期时间！
```

**涉及合约**:
```solidity
// VotingEscrowPaimon.sol
function increaseAmount(
    uint256 _tokenId,
    uint256 _value  // 5,000 * 1e18
) external;
```

**Gas 费**: ~0.0008 BNB (~$0.32)

#### 步骤 4.3: 合并 veNFT（高级）

**场景**: 持有多个 veNFT，希望合并以简化管理

```
veNFT #1234: 10,000 PAIMON，到期 2027-11-17
veNFT #5678: 5,000 PAIMON，到期 2026-05-20

合并操作:
  源 NFT: #5678
  目标 NFT: #1234

合并后:
  #1234 锁定量: 15,000 PAIMON
  #1234 到期: 2027-11-17（保持不变，取较晚日期）
  #5678: 销毁
  vePAIMON: 按新锁定量和剩余时间重新计算
```

**涉及合约**:
```solidity
// VotingEscrowPaimon.sol
function merge(
    uint256 _from,  // veNFT #5678
    uint256 _to     // veNFT #1234
) external;
```

**Gas 费**: ~0.0015 BNB (~$0.60)

---

### Phase 5: 提前退出（出售 veNFT）

#### 步骤 5.1: OpenSea 挂单

**动机**: 需要流动性，不想等锁定期结束

**操作步骤**:
```
1. 访问 OpenSea
   https://opensea.io/assets/bsc/{VOTING_ESCROW}/1234

2. 点击 [List for Sale]

3. 设置价格:
   锁定量: 10,000 PAIMON（$500 按 $0.05）
   累积未领取 Bribe: $200
   剩余锁定期: 1 年

   定价策略:
   方式 A（折现法）:
     (锁定量价值 + 累积收益) * 折现率
     = ($500 + $200) * 0.85 = $595
     = 11,900 PAIMON 等值

   方式 B（收益率法）:
     未来 1 年预期 Bribe: $120/周 * 52 = $6,240
     折现（50%）: $3,120
     定价: $500 + $200 + $3,120 = $3,820
     = 76,400 PAIMON 等值

4. 提交挂单
   手续费: 2.5% OpenSea 费用
```

**买家画像**:
```
谁会买 veNFT？
- 新用户: 避免 4 年锁定，直接购买短期 veNFT
- 大户: 快速获得投票权（避免线性 vesting）
- 套利者: 折价购买 → 领取高额 Bribe → 转手
```

#### 步骤 5.2: 早退惩罚（合约层面，可选设计）

**当前状态**: Paimon.dex V1.5 **不支持合约早退**（只能 OpenSea 出售）

**未来 V2.0+**: 可能引入早退机制

```solidity
// 假设未来实现（当前不可用）
function earlyWithdraw(uint256 _tokenId) external {
    uint256 penalty = lockedAmount * 50% / 100;  // 50% 惩罚
    PAIMON.transfer(treasury, penalty);
    PAIMON.transfer(msg.sender, lockedAmount - penalty);
    _burn(_tokenId);
}
```

---

## 三、收益来源详解

### 3.1 四重收益机制

#### 收益源 1: PAIMON 排放奖励（25% APR）

**机制**: 持有 vePAIMON → 自动获得协议排放份额

```
每周排放: 37.5M PAIMON（Phase A）
分配给 vePAIMON 持有者: 30%（Emission Policy）
= 11.25M PAIMON/周

你的份额:
  你的 vePAIMON: 5,000
  总 vePAIMON: 500,000
  占比: 1%

每周收益:
  11.25M * 1% = 112,500 PAIMON
  价值: $5,625（按 $0.05）

年化:
  $5,625 * 52 = $292,500
  APR: $292,500 / $500 = 58,500%（理论值，实际稀释）

实际 APR（考虑稀释）:
  ~25%（协议成熟后）
```

#### 收益源 2: Bribe 贿赂收入（15% APR）

**机制**: 投票给 Gauge → 获得项目方 Bribe

```
USDC/USDP Gauge Bribe: $12,000/周
你的投票权占比: 1%

每周收益:
  $12,000 * 1% = $120 USDC

年化:
  $120 * 52 = $6,240
  APR: $6,240 / $500 = 1,248%（高 Bribe 池子）

平均 APR（所有池子）:
  ~15%（考虑分散投票）
```

#### 收益源 3: Boost 加成（+8% APR）

**机制**: vePAIMON 持有者获得所有奖励的 Boost 乘数

```
Boost 公式:
  multiplier = 1.0 + (vePAIMON_balance / total_vePAIMON) * 0.5
             = 1.0 + (5,000 / 500,000) * 0.5
             = 1.005x

应用场景:
  1. LP 挖矿奖励 * 1.005x
  2. Debt Mining 奖励 * 1.005x
  3. Ecosystem 分配 * 1.005x

额外收益:
  假设你同时提供 USDC/USDP LP（$10K）:
  基础 APR: 15%（交易手续费 + PAIMON 排放）
  Boost 后: 15% * 1.005 = 15.075%
  额外收益: $1,500 * 0.005 = $7.5/年

  对于大户（10% vePAIMON 占比）:
  multiplier = 1.0 + 0.1 * 0.5 = 1.05x（+5%）
  额外收益: $1,500 * 0.05 = $75/年
```

#### 收益源 4: Protocol Fee 分成（4% APR）

**机制**: vePAIMON 持有者分享协议收入

```
协议费来源:
  1. DEX 交易手续费（0.3%）: $300K/周
  2. Treasury 铸造费（0.5%）: $50K/周
  3. Launchpad 平台费（5%）: $25K/周
  合计: $375K/周

分配给 vePAIMON 持有者: 10%
= $37,500/周

你的份额:
  $37,500 * 1% = $375/周

年化:
  $375 * 52 = $19,500
  APR: $19,500 / $500 = 3,900%（理论值）

实际 APR（协议成熟后）:
  ~4%
```

### 3.2 综合 APR 计算

**基准案例**: 锁定 10,000 PAIMON（$500），2 年锁定期

| 收益源 | 每周收益 | 年化收益 | APR |
|-------|---------|---------|-----|
| PAIMON 排放 | ~$25 | $1,300 | **260%** |
| Bribe 收入 | $120 | $6,240 | **1,248%** |
| Boost 加成（间接）| $2 | $104 | **21%** |
| Protocol Fee | $7.5 | $390 | **78%** |
| **合计** | **$154.5** | **$8,034** | **~1,607%** |

**实际 APR 修正**（考虑衰减、稀释、市场波动）:
```
保守估计: 40-50% APR
中性估计: 50-60% APR
乐观估计: 60-80% APR
```

**影响因素**:
```
正面:
+ PAIMON 价格上涨 → 排放奖励价值 ↑
+ Bribe 市场繁荣 → Bribe 收入 ↑
+ DEX 交易量增加 → Protocol Fee ↑

负面:
- vePAIMON 线性衰减 → 投票权 ↓（需定期延长）
- 更多人锁定 → 稀释效应 ↑
- 熊市 → Bribe 减少，PAIMON 价格 ↓
```

---

## 四、涉及的智能合约

### 核心合约清单

| 合约名称 | 地址 | 作用 | 交互频率 |
|---------|------|------|---------|
| **PAIMON Token** | 0x... | 治理代币（ERC20） | 锁定时 |
| **VotingEscrowPaimon** | 0x... | veNFT 管理（ERC721） | 创建/延长/合并 |
| **GaugeController** | 0x... | Gauge 投票权重管理 | 每周投票 |
| **BribeMarketplace** | 0x... | Bribe 托管与分配 | 每周领取 |
| **BoostStaking** | 0x... | Boost 乘数计算 | 被动（自动） |
| **EmissionRouter** | 0x... | PAIMON 排放分配 | 被动（自动） |
| **RewardDistributor** | 0x... | 排放奖励领取 | 每周领取 |

---

## 五、前端页面路径

| 页面名称 | URL | 功能 | 使用频率 |
|---------|-----|------|---------|
| **Lock** | `/lock` | 创建/延长/管理 veNFT | 初期 1 次，季度延长 |
| **Gauges** | `/gauges` | 投票分配权重 | 每周 |
| **Rewards** | `/rewards` | 领取 Bribe + 排放奖励 | 每周 |
| **Dashboard** | `/dashboard` | 总览投票权、收益 | 每日 |
| **Analytics** | `/analytics` | Gauge 权重历史、Bribe 趋势 | 按需 |

---

## 六、常见问题（FAQ）

### Q1: vePAIMON 可以转账吗？

**A**: veNFT 可以转账（ERC721 标准），但投票权绑定 NFT。
```
转账 veNFT #1234 给地址 B:
  - 地址 A 丧失投票权
  - 地址 B 获得全部投票权（5,000 vePAIMON）
  - 锁定到期时间不变
  - 累积未领取 Bribe 归地址 A（需先领取）

建议: 转账前领取所有待领奖励
```

### Q2: 锁定期到期后怎么办？

**A**: 三种选择。
```
选择 1: 提取 PAIMON
  veNFT #1234 → 销毁
  锁定的 10,000 PAIMON → 返还你的钱包
  vePAIMON → 归零
  操作: [Withdraw] 按钮

选择 2: 延长锁定
  重新锁定 1 周-4 年
  vePAIMON 恢复
  继续赚取收益

选择 3: 闲置（不推荐）
  锁定到期后，PAIMON 仍在合约中
  vePAIMON = 0（无投票权）
  不再获得任何收益
  随时可提取
```

### Q3: 如果 PAIMON 价格暴跌 50%，锁定的代币怎么办？

**A**: 锁定数量不变，但价值下降。
```
初始锁定:
  10,000 PAIMON @ $0.05 = $500

PAIMON 跌至 $0.025:
  10,000 PAIMON @ $0.025 = $250
  账面损失: -50%

缓解措施:
  1. Bribe 收入仍以 USDC 计价（不受影响）
  2. Protocol Fee 仍以 USDC 计价
  3. 排放奖励数量不变（10K PAIMON 仍获得相同比例排放）
  4. 可在 OpenSea 折价出售 veNFT 退出

长期持有者:
  价格波动 < 收益累积（52% APR 对冲价格风险）
```

### Q4: Gauge 投票可以修改吗？

**A**: 当前 Epoch 结束前不可修改。
```
锁定机制:
  周一投票 → 周四生效 → 下周四才能修改

原因: 防止 Last-minute 投票操纵

变通方案:
  每周四重新分配投票（跟随 Bribe 最高的池子）
```

### Q5: 如果我不投票会怎样？

**A**: 不投票 = 放弃 Bribe 收入，但仍获得排放奖励。
```
不投票的后果:
  ✅ 仍获得 PAIMON 排放（25% APR）
  ✅ 仍获得 Protocol Fee（4% APR）
  ✅ 仍享受 Boost 加成
  ❌ 无法获得 Bribe（0% APR，损失 15%+）

总 APR: 52% → 37%（损失 28.8%）

建议: 至少每月投票一次（Gas 费 $0.80 vs 损失收益 $100+/月）
```

### Q6: vePAIMON 大户会操纵投票吗？

**A**: 有风险，但有防御机制。
```
理论攻击:
  巨鲸持有 30% vePAIMON → 100% 投票给自己的池子
  → 该池子获得 30% 排放 → 巨鲸 LP APR 暴涨

防御措施:
  1. Gauge Cap: 单个 Gauge 最高权重 30%（合约强制）
  2. Bribe 市场: 其他池子提高 Bribe 吸引投票
  3. DAO 干预: 社区提案调整 Gauge 白名单

历史案例:
  Curve Finance 鲸鱼大战（Convex vs Yearn）
  → 最终达成平衡（Bribe 市场有效）
```

---

## 七、高级策略

### 策略 A: "Bribe 狙击手"

**目标**: 最大化 Bribe ROI

**操作**:
```
1. 每周三晚上分析 Bribe 数据:
   访问 https://paimon.dex/bribes/analytics

2. 识别 Bribe/Votes 比率最高的池子:
   示例:
   Pool A: $5K Bribe / 100K votes = $0.05/vote
   Pool B: $3K Bribe / 50K votes = $0.06/vote  ← 更优

3. 100% 投票给 Pool B

4. 重复每周（追踪 Bribe 热点）

预期收益:
  vs 固定投票: +20-30% Bribe 收入
  vs 不投票: +50% 总 APR
```

### 策略 B: "Boost 最大化"（配合 LP）

**目标**: 同时赚取 LP 收益 + vePAIMON 收益

**资金分配**:
```
50% → 锁定 vePAIMON（获得 Boost）
50% → 提供 USDC/USDP LP（应用 Boost）

示例:
  总资金: $10,000

  vePAIMON 侧:
    锁定 100,000 PAIMON（$5,000）
    vePAIMON: 50,000（4 年锁定）
    Boost 乘数: 1.10x（假设占总量 10%）

  LP 侧:
    USDC/USDP LP: $5,000
    基础 APR: 15%
    Boost 后: 15% * 1.10 = 16.5%
    年收益: $825

  vePAIMON 侧收益:
    排放 + Bribe + Fee: ~$2,500（50% APR）

  合计:
    $825 + $2,500 = $3,325
    总 APR: 33.25%
```

### 策略 C: "veNFT 套利"（高级）

**目标**: 低价收购 veNFT → 持有赚收益 → 高价卖出

**操作**:
```
1. OpenSea 监控折价 veNFT:
   筛选条件:
   - 剩余锁定期 >1 年
   - 价格 < (锁定量 * PAIMON 价格 * 0.8)

2. 购买 veNFT:
   示例:
   veNFT #9999: 50,000 PAIMON，剩余 2 年
   公允价值: $2,500（按 $0.05）
   挂单价格: $2,000（折价 20%）
   → 买入

3. 持有 3-6 个月:
   Bribe 收入: $600/月 * 6 = $3,600
   排放奖励: $400/月 * 6 = $2,400
   累计: $6,000

4. 高价卖出:
   卖出价: $2,500（原价）+ $6,000（累积收益）= $8,500
   成本: $2,000
   利润: $6,500
   ROI: 325%（6 个月）
```

---

## 八、风险提示

### 8.1 价格波动风险

⚠️ **PAIMON 价格暴跌**
- 锁定的 PAIMON 价值下降
- 排放奖励价值下降
- 缓解: Bribe 和 Protocol Fee 以稳定币计价

### 8.2 流动性风险

⚠️ **veNFT 难以出售**
- OpenSea 买盘不足
- 长锁定期 veNFT 折价严重（可能 -30%）
- 建议: 不要 All-in，保留流动性

### 8.3 智能合约风险

⚠️ **VotingEscrow 合约漏洞**
- 虽然经过审计，但仍存在风险
- 历史案例: Curve veToken 无已知漏洞（运行 4 年+）
- 建议: 分散投资，购买智能合约保险

### 8.4 治理攻击风险

⚠️ **恶意提案**
- 巨鲸控制 >50% vePAIMON → 通过恶意提案
- 示例: 修改 Emission 全部分配给自己的地址
- 防御: Timelock（48 小时）+ 社区监督

---

## 九、成功案例

### Case Study: DeFi 老手的 ve(3,3) 套利

**用户**: Bob，DeFi 经验 3 年，熟悉 Curve/Convex

**策略**: Bribe 狙击 + veNFT 套利

**操作记录**:
```
Month 1: 锁定 100K PAIMON（$5K），4 年
  vePAIMON: 100K
  Boost: 1.20x

Month 1-3: 每周 Bribe 狙击
  平均 Bribe 收入: $600/周
  累计: $7,800

Month 4: OpenSea 低价收购 2 个 veNFT
  veNFT #555: 30K PAIMON，$1,200（折价 25%）
  veNFT #888: 50K PAIMON，$2,000（折价 20%）
  总成本: $3,200

Month 4-6: 持有 3 个 veNFT
  总 vePAIMON: 180K（自己 100K + 收购 80K）
  每周 Bribe: $1,080
  累计: $13,950

Month 7: 出售收购的 2 个 veNFT
  veNFT #555: 卖出 $2,800（+133%）
  veNFT #888: 卖出 $5,200（+160%）
  总收入: $8,000
  利润: $4,800

总结（7 个月）:
  初始投入: $5,000
  额外投入: $3,200（veNFT 收购）
  Bribe 收入: $21,750
  veNFT 套利: $4,800
  总收益: $26,550
  ROI: 324%（7 个月）
  年化 APR: 556%
```

**用户反馈**:
> "ve(3,3) 模型是 DeFi 收益的天花板。Paimon.dex 的 veNFT 可转让设计让我可以在 OpenSea 套利，这是 Curve 做不到的。每周花 30 分钟分析 Bribe，年化回报轻松 50%+。"

---

## 十、下一步行动

### 立即行动（今天）

- [ ] 购买至少 1,000 PAIMON（$50，测试）
- [ ] 访问 https://paimon.dex/lock
- [ ] 创建第一个 veNFT（锁定 1 周测试）

### 本周完成

- [ ] 研究 Gauge 列表，识别高 Bribe 池子
- [ ] 投票分配权重（周四前）
- [ ] 领取第一笔 Bribe（周五）

### 本月完成

- [ ] 加入 Discord #governance 频道
- [ ] 阅读 DAO 提案，参与链上投票
- [ ] 考虑增加锁定量（10K → 50K PAIMON）

### 长期习惯

- [ ] 每周三分析 Bribe，周四投票
- [ ] 每月延长锁定期（保持 vePAIMON 最大化）
- [ ] 每季度 Rebalance（vePAIMON vs LP vs USDP Savings）

---

**文档版本**: v1.0
**维护者**: Paimon.dex Core Team
**联系方式**: governance@paimon.dex
**Discord**: https://discord.gg/paimondex（#vepaimon-holders 频道）
**Governance Forum**: https://forum.paimon.dex/c/governance
