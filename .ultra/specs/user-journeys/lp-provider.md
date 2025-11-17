# LP 提供者 - 用户旅程文档

**版本**: v1.0
**最后更新**: 2025-11-17
**对应系统版本**: V1.5+（DEX + Gauge 激活后）

---

## 一、用户画像

### 1.1 典型用户特征

**用户类型**:
- **被动收益者**: 寻求稳定收益，不想频繁交易
- **做市商**: 专业 LP，同时在多个 DEX 提供流动性
- **稳定币持有者**: 持有 USDC/USDT，想赚取额外收益
- **PAIMON 信仰者**: 长期看好协议，提供 PAIMON 流动性
- **套利者**: 利用 LP 费用 + 排放奖励套利

**资金规模**:
- 入门级: $100-$1,000
- 中等级: $1,000-$50,000
- 大户: $50,000-$500,000
- 巨鲸: $500,000+

**技术能力**:
- 基础: 理解 LP、AMM、无常损失
- 中级: 会计算 APR、分析池子深度
- 高级: 理解 Gauge 投票、ve(3,3) 激励

### 1.2 用户价值主张

| 传统 DEX LP | Paimon.dex LP | 优势 |
|-------------|--------------|------|
| 手续费 APR 0.3-1% | 手续费 APR 4-6% | **↑400-600%** |
| 无额外激励 | PAIMON 排放 APR 8-15% | **新增收益流** |
| 无投票权 | Gauge 投票影响排放 | **主动管理** |
| 固定费率 0.3% | 动态费率 0.1-1% | **可调节** |
| 无常损失无补偿 | Bribe 补偿（间接）| **损失缓解** |

**核心卖点**:
- ✅ **高收益**: 12-25% APR（稳定币对），30-50% APR（波动对）
- ✅ **低风险**: 稳定币对无常损失 <0.1%
- ✅ **双重奖励**: 交易手续费 + PAIMON 排放
- ✅ **流动性激励**: 通过 Gauge 投票影响排放分配
- ✅ **可组合性**: LP Token 可用于借贷抵押（未来 V2.5+）

---

## 二、完整操作流程

### Phase 0: 准备阶段（选择池子）

#### 步骤 0.1: 分析池子收益率

**前端路径**: `https://paimon.dex/liquidity/pools`

**页面布局**:
```
┌──────────────────────────────────────────────────────────────────────────┐
│  Liquidity Pools                                                          │
│  [排序: APR ↓]  [筛选: 稳定币对]  [搜索: ___]                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                                           │
│  🔥 推荐池子（高收益 + 低风险）                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ 池子          │ TVL     │ 24h Volume │ Fee APR │ Emission │ 总 APR ││
│  ├─────────────────────────────────────────────────────────────────────┤│
│  │ USDC/USDP     │ $5.2M   │ $450K      │ 6.2%    │ 10.5%    │ 16.7%  ││
│  │ ⚡ 无常损失: <0.1%  │  Gauge 权重: 20%  │  Bribe: $12K/week      ││
│  │ [Add Liquidity] [Analytics]                                         ││
│  │                                                                     ││
│  │ PAIMON/USDC   │ $2.1M   │ $280K      │ 8.5%    │ 18.2%    │ 26.7%  ││
│  │ ⚠️ 无常损失: 中等  │  Gauge 权重: 15%  │  Bribe: $8K/week       ││
│  │ [Add Liquidity] [Analytics]                                         ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                           │
│  📊 所有池子（34 个）                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ 池子          │ TVL     │ 手续费 APR │ 排放 APR │ 总 APR │ IL 风险 ││
│  ├─────────────────────────────────────────────────────────────────────┤│
│  │ USDC/USDP     │ $5.2M   │ 6.2%       │ 10.5%    │ 16.7%  │ 极低   ││
│  │ PAIMON/USDC   │ $2.1M   │ 8.5%       │ 18.2%    │ 26.7%  │ 中等   ││
│  │ WBNB/USDP     │ $1.5M   │ 10.1%      │ 14.3%    │ 24.4%  │ 中等   ││
│  │ pUST125/USDC  │ $850K   │ 4.8%       │ 8.2%     │ 13.0%  │ 极低   ││
│  │ CAKE/PAIMON   │ $420K   │ 12.3%      │ 22.5%    │ 34.8%  │ 高     ││
│  └─────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────┘
```

#### 步骤 0.2: 选择池子策略

**策略 A: 保守型（推荐新手）**
```
池子: USDC/USDP
优势:
  ✅ 稳定币对，无常损失 <0.1%
  ✅ 高 TVL（$5M+），滑点低
  ✅ 高交易量（$450K/day），手续费稳定
  ✅ 总 APR 16.7%（高于传统银行 16 倍）

劣势:
  ❌ APR 相对较低（vs 波动对）

适合人群:
  - 风险厌恶型
  - 大资金（$50K+）
  - 被动收益者
```

**策略 B: 平衡型**
```
池子: PAIMON/USDC
优势:
  ✅ 更高 APR 26.7%
  ✅ 支持 PAIMON 流动性（生态贡献）
  ✅ Gauge 权重高（排放奖励多）

劣势:
  ⚠️ PAIMON 价格波动 → 无常损失风险
  示例: PAIMON 从 $0.05 涨至 $0.10
    无常损失: ~5.7%（AMM 公式）

适合人群:
  - 中等风险承受力
  - 看好 PAIMON 长期价值
  - 愿意接受波动换高收益
```

**策略 C: 激进型**
```
池子: CAKE/PAIMON
优势:
  ✅ 极高 APR 34.8%
  ✅ 双代币价格上涨潜力

劣势:
  ❌ 高无常损失风险（两个波动资产）
  ❌ 低 TVL（$420K），滑点较高

适合人群:
  - 高风险偏好
  - 小资金测试（$100-$1K）
  - 专业做市商
```

---

### Phase 1: 添加流动性（以 USDC/USDP 为例）

#### 步骤 1.1: 访问 Add Liquidity 页面

**前端路径**: `https://paimon.dex/liquidity/add/USDC-USDP`

**页面布局**:
```
┌────────────────────────────────────────────────────────────┐
│  Add Liquidity to USDC/USDP                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                             │
│  📊 池子信息                                                │
│  TVL: $5,200,000  │  24h Volume: $450,000  │  APR: 16.7%   │
│  Fee: 0.3%        │  Gauge Weight: 20%     │  IL Risk: 低  │
│                                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                             │
│  💰 输入金额                                                │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Token A:  USDC                                      │  │
│  │ [________1000________]  [Max]  Balance: 5,000 USDC  │  │
│  └─────────────────────────────────────────────────────┘  │
│               ⬇️  Current Ratio: 1:1.002                   │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Token B:  USDP                                      │  │
│  │ [________1002________]  [Max]  Balance: 3,000 USDP  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                             │
│  📈 预期收益                                                │
│  你将获得:                                                  │
│    LP Token: ~1,001 USDC-USDP-LP                            │
│    池子份额: 0.019% (当前 TVL: $5.2M)                       │
│                                                             │
│  年化收益:                                                  │
│    手续费 APR: 6.2% → $124/year                             │
│    PAIMON 排放 APR: 10.5% → $210/year                       │
│    合计: 16.7% → $334/year                                  │
│                                                             │
│  价格影响: <0.01% (流动性充足)                              │
│  滑点容忍: 0.5% [调节]                                      │
│                                                             │
│  [Approve USDC] → [Approve USDP] → [Add Liquidity]         │
└────────────────────────────────────────────────────────────┘
```

#### 步骤 1.2: 授权代币（首次需要）

**交易 1: Approve USDC**
```solidity
USDC.approve(ROUTER_ADDRESS, type(uint256).max);
```
**Gas 费**: ~0.0002 BNB (~$0.08)

**交易 2: Approve USDP**
```solidity
USDP.approve(ROUTER_ADDRESS, type(uint256).max);
```
**Gas 费**: ~0.0002 BNB (~$0.08)

#### 步骤 1.3: 执行添加流动性

**交易 3: Add Liquidity**

**涉及合约**: `DEXRouter` (0x...)

```solidity
// DEXRouter.sol
function addLiquidity(
    address tokenA,           // USDC
    address tokenB,           // USDP
    uint256 amountADesired,   // 1000e6（6 decimals USDC）
    uint256 amountBDesired,   // 1002e18（18 decimals USDP）
    uint256 amountAMin,       // 995e6（0.5% 滑点容忍）
    uint256 amountBMin,       // 997e18
    address to,               // 你的地址
    uint256 deadline          // block.timestamp + 300
) external returns (
    uint256 amountA,
    uint256 amountB,
    uint256 liquidity
);
```

**执行细节**:
```
存入:
  USDC: 1,000.00（$1,000）
  USDP: 1,002.00（$1,002）

获得:
  LP Token: 1,001 USDC-USDP-LP
  池子份额: 0.019%

计算公式（首次添加流动性）:
  liquidity = sqrt(amountA * amountB)
            = sqrt(1000 * 1002)
            = 1,001

Gas 费: ~0.0015 BNB (~$0.60)
```

**MetaMask 确认界面**:
```
┌─────────────────────────────────────┐
│ Add Liquidity                       │
│                                     │
│ Deposit: 1,000 USDC + 1,002 USDP    │
│ You will receive: 1,001 LP Token    │
│ Pool share: 0.019%                  │
│                                     │
│ Gas Fee: 0.0015 BNB (~$0.60)        │
│ [Reject]          [Confirm]         │
└─────────────────────────────────────┘
```

#### 步骤 1.4: 交易确认

**前端实时反馈**:
```
✅ Liquidity added successfully!
   You received: 1,001 USDC-USDP-LP
   Your pool share: 0.019%
   View on BscScan →

💰 Your Position:
   USDC deposited: 1,000.00
   USDP deposited: 1,002.00
   LP Token balance: 1,001
   Current value: $2,002
   24h fees earned: $0 (starts accruing now)
```

---

### Phase 2: Stake LP Token 到 Gauge（激活排放奖励）

#### 步骤 2.1: 理解 Gauge Staking

**为什么要 Stake**:
```
直接持有 LP Token:
  ✅ 获得交易手续费（自动累积至 LP Token）
  ❌ 无法获得 PAIMON 排放奖励

Stake LP Token 到 Gauge:
  ✅ 获得交易手续费
  ✅ 获得 PAIMON 排放奖励（8-15% APR）
  ✅ 享受 Boost 加成（如果持有 vePAIMON）

结论: 必须 Stake 才能最大化收益！
```

#### 步骤 2.2: 访问 Gauge Staking 页面

**前端路径**: `https://paimon.dex/gauges/stake/USDC-USDP`

**页面布局**:
```
┌──────────────────────────────────────────────────────────┐
│  Stake LP Token to Gauge                                  │
│  Pool: USDC/USDP  │  Gauge Weight: 20%  │  APR: +10.5%    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                           │
│  💰 Your LP Balance                                       │
│  Unstaked: 1,001 USDC-USDP-LP ($2,002)                    │
│  Staked:   0 USDC-USDP-LP                                 │
│                                                           │
│  📊 Gauge 信息                                            │
│  总 Staked LP: 5,200,000 LP (~$10.4M)                     │
│  本周排放: 750,000 PAIMON (~$37,500)                      │
│  你的份额: 0.019% (after staking)                         │
│  预期周收益: 142.5 PAIMON (~$7.13)                        │
│                                                           │
│  🚀 Boost 加成                                            │
│  当前 Boost: 1.00x (你没有 vePAIMON)                      │
│  如果锁定 10,000 PAIMON → Boost: 1.05x (+5%)              │
│  加成后周收益: 149.6 PAIMON (~$7.48, +$0.35)              │
│                                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                           │
│  Stake Amount: [________1001________]  [Max]              │
│                                                           │
│  [Approve LP Token] → [Stake]                             │
└──────────────────────────────────────────────────────────┘
```

#### 步骤 2.3: 授权并 Stake

**交易 1: Approve LP Token**
```solidity
LP_TOKEN.approve(GAUGE_ADDRESS, type(uint256).max);
```
**Gas 费**: ~0.0002 BNB (~$0.08)

**交易 2: Stake to Gauge**

**涉及合约**: `LiquidityGauge` (0x...)

```solidity
// LiquidityGauge.sol
function deposit(
    uint256 _value,  // 1001 * 1e18 LP Token
    address _addr    // 你的地址（可选，默认 msg.sender）
) external;
```

**执行细节**:
```
Stake: 1,001 USDC-USDP-LP

状态变更:
  Unstaked LP: 1,001 → 0
  Staked LP:   0 → 1,001
  开始累积 PAIMON 排放奖励

Gas 费: ~0.0008 BNB (~$0.32)
```

---

### Phase 3: 收益累积与领取

#### 步骤 3.1: 收益来源详解

**收益源 1: 交易手续费（自动复利）**
```
机制: 每笔交易收取 0.3% 手续费 → 添加回流动性池

示例:
  池子初始: 5,000,000 USDC + 5,000,000 USDP
  你的 LP: 1,001 LP Token（0.019% 份额）

  24 小时后（交易量 $450K）:
  手续费: $450K * 0.3% = $1,350
  池子新值: 5,000,675 USDC + 5,000,675 USDP（+$1,350）

  你的 LP 价值:
  1,001 LP * (10,001,350 / 10,000,000) = 1,001.135 LP 等值
  增长: $2,002 → $2,002.27（+$0.27，1 天）
  年化: $0.27 * 365 = $98.55
  APR: 4.92%

注意: LP Token 数量不变，单价上涨 = 复利
```

**收益源 2: PAIMON 排放（需手动领取）**
```
机制: Gauge 每周分配 PAIMON → Staker 按份额领取

你的份额: 0.019%
本周排放: 750,000 PAIMON
你的奖励: 750,000 * 0.019% = 142.5 PAIMON/周

年化:
  142.5 * 52 = 7,410 PAIMON
  价值: $370.5（按 $0.05）
  APR: $370.5 / $2,002 = 18.5%

注意: 需手动 Claim，否则累积在合约中
```

#### 步骤 3.2: 查看累积收益

**前端路径**: `https://paimon.dex/liquidity/positions`

**Dashboard 显示**:
```
┌──────────────────────────────────────────────────────────┐
│  My Liquidity Positions                                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                           │
│  📊 USDC/USDP Pool                                        │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Staked LP: 1,001 USDC-USDP-LP                      │ │
│  │ Current Value: $2,008.50 (↑$6.50, 7 days)          │ │
│  │ Pool Share: 0.019%                                 │ │
│  │                                                    │ │
│  │ 收益明细:                                          │ │
│  │ ┌──────────────────────────────────────────────┐ │ │
│  │ │ 交易手续费（已复利）:                        │ │ │
│  │ │   7 天累积: $1.89                            │ │ │
│  │ │   年化 APR: 6.2%                             │ │ │
│  │ │                                              │ │ │
│  │ │ PAIMON 排放（待领取）:                       │ │ │
│  │ │   可领取: 997.5 esPAIMON (~$49.88)           │ │ │
│  │ │   年化 APR: 18.5%                            │ │ │
│  │ │   [Claim] [Claim & Stake to Boost]           │ │ │
│  │ │                                              │ │ │
│  │ │ 总 APR: 24.7% 📈                             │ │ │
│  │ └──────────────────────────────────────────────┘ │ │
│  │                                                    │ │
│  │ [Unstake] [Add More] [Remove Liquidity]            │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                           │
│  📊 PAIMON/USDC Pool (未 Stake)                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Unstaked LP: 500 PAIMON-USDC-LP                    │ │
│  │ Current Value: $1,012.50                           │ │
│  │ ⚠️ 未 Stake，无 PAIMON 排放奖励                    │ │
│  │ [Stake to Gauge]                                   │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

#### 步骤 3.3: 领取 PAIMON 奖励

**涉及合约**: `LiquidityGauge` (0x...)

```solidity
// LiquidityGauge.sol
function getReward() external;
```

**执行细节**:
```
领取: 997.5 esPAIMON（7 天累积）

到账代币: esPAIMON (Vesting Token)
  vesting 周期: 365 天线性释放
  立即可用: 0 PAIMON
  每日解锁: 997.5 / 365 = 2.73 PAIMON

Gas 费: ~0.0006 BNB (~$0.24)

可选操作:
  1. 持有 esPAIMON → 365 天后全部兑换成 PAIMON
  2. 早退（50% 惩罚）→ 立即获得 498.75 PAIMON
  3. Stake esPAIMON → 获得额外 Boost（推荐）
```

---

### Phase 4: 移除流动性（退出）

#### 步骤 4.1: Unstake from Gauge

**前端路径**: `https://paimon.dex/gauges/unstake/USDC-USDP`

**操作**:
```
Unstake Amount: [________1001________]  [Max]

⚠️ 提醒:
  - Unstake 后停止累积 PAIMON 排放
  - 未领取的奖励可随时 Claim
  - 交易手续费仍会累积（LP Token 持有期间）

[Unstake]
```

**涉及合约**:
```solidity
// LiquidityGauge.sol
function withdraw(uint256 _value) external;
```

**Gas 费**: ~0.0006 BNB (~$0.24)

#### 步骤 4.2: Remove Liquidity

**前端路径**: `https://paimon.dex/liquidity/remove/USDC-USDP`

**页面布局**:
```
┌────────────────────────────────────────────────────────────┐
│  Remove Liquidity from USDC/USDP                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
│                                                             │
│  💰 Your LP Balance: 1,001 USDC-USDP-LP                     │
│  Current Value: $2,008.50                                   │
│                                                             │
│  移除比例: [━━━━━━━●━━━━] 100%                             │
│           25%  50%  75%  100%                               │
│                                                             │
│  你将收到:                                                  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ USDC: 1,004.13                                      │  │
│  │ USDP: 1,004.37                                      │  │
│  │ 合计价值: $2,008.50                                 │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  📊 收益汇总（7 天）                                        │
│  初始存入: $2,002.00                                        │
│  当前价值: $2,008.50                                        │
│  手续费收益: $6.50 (LP Token 自动复利)                      │
│  PAIMON 奖励: 997.5 esPAIMON (已领取，vesting 中)           │
│  无常损失: $0 (稳定币对)                                    │
│                                                             │
│  净收益: $6.50 + $49.88 = $56.38                            │
│  7 天 ROI: 2.82%                                            │
│  年化 APR: 147% (复利后)                                    │
│                                                             │
│  价格影响: <0.01%                                           │
│  滑点容忍: 0.5% [调节]                                      │
│                                                             │
│  [Approve LP Token] → [Remove Liquidity]                    │
└────────────────────────────────────────────────────────────┘
```

#### 步骤 4.3: 执行移除流动性

**涉及合约**: `DEXRouter` (0x...)

```solidity
// DEXRouter.sol
function removeLiquidity(
    address tokenA,
    address tokenB,
    uint256 liquidity,    // 1,001 * 1e18 LP Token
    uint256 amountAMin,   // 999e6（0.5% 滑点容忍）
    uint256 amountBMin,   // 999e18
    address to,
    uint256 deadline
) external returns (
    uint256 amountA,
    uint256 amountB
);
```

**执行细节**:
```
销毁: 1,001 USDC-USDP-LP

获得:
  USDC: 1,004.13（$1,004.13）
  USDP: 1,004.37（$1,004.37）

计算公式:
  amountA = LP * reserveA / totalSupply
  amountB = LP * reserveB / totalSupply

Gas 费: ~0.0012 BNB (~$0.48)
```

---

## 三、无常损失（Impermanent Loss）分析

### 3.1 什么是无常损失

**定义**: LP 提供流动性后，如果资产价格变化，相比直接持有资产会有损失。

**示例: PAIMON/USDC 池**
```
初始状态（T0）:
  PAIMON 价格: $0.05
  存入: 10,000 PAIMON ($500) + 500 USDC ($500)
  总价值: $1,000

场景 A: PAIMON 价格不变（T1）
  池子: 10,000 PAIMON + 500 USDC
  LP 价值: $1,000
  直接持有价值: $1,000
  无常损失: 0%

场景 B: PAIMON 价格翻倍至 $0.10（T1）
  池子（AMM 自动平衡）:
    新比例: sqrt(10000 * 500 * 2) ≈ 7,071 PAIMON + 707 USDC
    LP 价值: 7,071 * $0.10 + $707 = $1,414.2

  直接持有价值:
    10,000 PAIMON * $0.10 + 500 USDC = $1,500

  无常损失:
    ($1,500 - $1,414.2) / $1,500 = 5.7%

场景 C: PAIMON 价格腰斩至 $0.025（T1）
  池子:
    新比例: 14,142 PAIMON + 353.5 USDC
    LP 价值: 14,142 * $0.025 + $353.5 = $707

  直接持有价值:
    10,000 * $0.025 + 500 = $750

  无常损失:
    ($750 - $707) / $750 = 5.7%（同样 5.7%！）
```

**关键规律**:
```
价格变化倍数  │  无常损失
─────────────┼──────────
1.25x        │  0.6%
1.5x         │  2.0%
2x           │  5.7%
3x           │  13.4%
4x           │  20.0%
5x           │  25.5%
```

### 3.2 稳定币对 vs 波动对

**稳定币对（USDC/USDP）**:
```
价格波动: ±0.5%（通常 $0.995-$1.005）
无常损失: <0.1%（几乎可忽略）
APR: 16.7%

结论: 安全收益，适合大资金
```

**波动对（PAIMON/USDC）**:
```
价格波动: ±50%（$0.025-$0.075）
无常损失: 最高 5.7%（价格 2x 变化）
APR: 26.7%

盈亏平衡点:
  需要 APR 补偿无常损失:
  5.7% IL ÷ 26.7% APR = 78 天

  如果持有 >78 天，手续费 + 排放奖励 > 无常损失
```

### 3.3 无常损失缓解策略

**策略 A: 选择稳定币对**
```
USDC/USDP, pUST125/USDC → IL <0.1%
trade-off: APR 较低（16-18%）
```

**策略 B: 长期持有**
```
手续费 + 排放奖励持续累积
示例: 26.7% APR，80 天补偿 5.7% IL
结论: 持有越久，IL 影响越小
```

**策略 C: 对冲（高级）**
```
同时做多 PAIMON（锁定 vePAIMON）
  如果 PAIMON 价格 ↑ → LP 有 IL，但 vePAIMON 价值 ↑
  如果 PAIMON 价格 ↓ → LP 有 IL，但可低价买入补仓
```

**策略 D: 及时退出**
```
监控 IL 实时数据（Dashboard 显示）
  如果 IL > 3% 且预期价格继续单边 → 考虑退出
  重新平衡资产配置
```

---

## 四、涉及的智能合约

| 合约名称 | 地址 | 作用 | 交互频率 |
|---------|------|------|---------|
| **DEXRouter** | 0x... | 添加/移除流动性、Swap | 每次操作 |
| **DEXPair** | 0x... | LP Token 管理、价格计算 | 被动 |
| **LiquidityGauge** | 0x... | LP Staking、排放分配 | Stake/Unstake/Claim |
| **GaugeController** | 0x... | Gauge 权重管理 | 被动（vePAIMON 投票影响）|
| **RewardDistributor** | 0x... | PAIMON 排放领取 | 每周 Claim |

---

## 五、常见问题（FAQ）

### Q1: 可以单币添加流动性吗？

**A**: 不可以，必须 1:1 比例（按价值）。
```
示例:
  USDC/USDP 池子，比例 1:1.002
  如果你有 1,000 USDC 但没有 USDP:

  方案 1: 先 Swap 500 USDC → 500 USDP
    然后添加 500 USDC + 500 USDP

  方案 2: 使用 Zapper（未来 V2.0+）
    一键将 1,000 USDC 拆分并添加流动性
```

### Q2: LP Token 可以转账吗？

**A**: 可以，标准 ERC20。
```
Unstaked LP Token: 可自由转账
Staked LP Token: 需先 Unstake

用途:
  1. 转账给他人（赠送/出售）
  2. 作为借贷抵押品（未来 V2.5+）
  3. 跨链桥接（未来 V3.0+）
```

### Q3: 如果池子 TVL 暴增，我的 APR 会下降吗？

**A**: 会，但有下限保护。
```
示例:
  当前 TVL: $5M，排放 750K PAIMON/周，你的 LP: $2K
  你的排放 APR: 18.5%

  TVL 翻倍至 $10M:
  你的排放 APR: 9.25%（↓50%）

  但手续费 APR 可能上升:
  TVL ↑ → 更多交易量 → 手续费 ↑
  假设交易量翻倍: 6.2% → 12.4%

  总 APR: 9.25% + 12.4% = 21.65%（仍然可观）
```

### Q4: 忘记 Claim 奖励会过期吗？

**A**: 不会过期，永久有效。
```
PAIMON 排放奖励累积在 Gauge 合约中
可随时 Claim，无时间限制

建议: 每周 Claim 一次（Gas 效率最优）
  vs 每天 Claim: 节省 Gas 费 85%
```

### Q5: 可以同时提供多个池子的流动性吗？

**A**: 可以，无限制。
```
推荐组合（分散风险）:
  50% → USDC/USDP（稳定收益 16.7%）
  30% → PAIMON/USDC（中等风险 26.7%）
  20% → WBNB/USDP（中等风险 24.4%）

  加权平均 APR:
  0.5 * 16.7% + 0.3 * 26.7% + 0.2 * 24.4%
  = 8.35% + 8.01% + 4.88%
  = 21.24%
```

---

## 六、高级策略

### 策略 A: "Gauge 权重套利"

**目标**: 跟随 vePAIMON 投票，提供流动性给权重上升的池子

**操作**:
```
1. 每周四关注 Gauge 投票结果:
   https://paimon.dex/gauges/results

2. 识别权重上升 >5% 的池子:
   示例:
   WBNB/USDP: 10% → 15%（+5%）
   → 排放增加 50% → APR ↑

3. 快速添加流动性（周四-周五）:
   抢先其他 LP，享受高 APR

4. 下周三移除流动性（权重稳定后）

预期收益:
  vs 长期持有: +10-15% 年化收益
  trade-off: 频繁操作，Gas 费高
```

### 策略 B: "IL 保护（vePAIMON 对冲）"

**目标**: 同时持有 vePAIMON 和 PAIMON LP，对冲 IL

**资金分配**:
```
总资金: $10,000

方案:
  $5,000 → 锁定 vePAIMON（100K PAIMON，4 年）
  $5,000 → PAIMON/USDC LP

场景 A: PAIMON 价格 ↑100%（$0.05 → $0.10）
  vePAIMON 价值: $5K → $10K（+$5K）
  LP 无常损失: -5.7%（-$285）
  净收益: +$5K - $285 + 手续费 + 排放 = +$5K+

场景 B: PAIMON 价格 ↓50%（$0.05 → $0.025）
  vePAIMON 价值: $5K → $2.5K（-$2.5K）
  LP 无常损失: -5.7%（-$285）
  净损失: -$2.5K - $285 + 手续费 + 排放 ≈ -$2K

  但可以:
  低价买入 PAIMON 补仓 vePAIMON
  平均成本下降，长期收益 ↑
```

### 策略 C: "复利最大化"

**目标**: 将所有收益再投资，指数增长

**操作流程**:
```
每周操作（30 分钟）:
  1. Claim PAIMON 排放奖励
  2. 50% esPAIMON → Stake to Boost（提升 Boost 乘数）
  3. 50% esPAIMON → 等待 vesting，解锁后卖出 50% 换 USDC
  4. 新增流动性: USDC + PAIMON → 添加到原池子
  5. Stake 新 LP Token

效果（年化复利）:
  初始 $10K LP
  月复利（简化）:
    Month 1: $10K * 1.02 = $10,200
    Month 2: $10,200 * 1.02 = $10,404
    ...
    Year 1: $10K * (1.02)^12 = $12,682
    实际 APR: 26.82%（vs 简单利息 24%）
```

---

## 七、风险提示

### 7.1 无常损失风险

⚠️ **价格单边大幅波动**
- PAIMON 价格 2x → IL 5.7%
- 缓解: 选择稳定币对 or 长期持有

### 7.2 智能合约风险

⚠️ **DEX 合约漏洞**
- 虽然经过审计，但仍存在风险
- 建议: 分散投资，购买保险（Nexus Mutual）

### 7.3 流动性枯竭风险

⚠️ **TVL 突然大量退出**
- 如果 50% LP 同时退出 → 价格剧烈波动 → 滑点 ↑
- 历史案例: Terra UST 崩盘，Curve 4pool 流动性枯竭
- 建议: 关注 TVL 趋势，提前退出

### 7.4 排放奖励稀释

⚠️ **新 LP 加入稀释份额**
- TVL 增长 → 你的池子份额 ↓ → 排放奖励 ↓
- 不过手续费 APR 可能上升（交易量 ↑）

---

## 八、成功案例

### Case Study: 稳健 LP 的复利策略

**用户**: Carol，全职妈妈，DeFi 新手

**策略**: 保守型 LP + 定期复利

**操作记录**:
```
初始: $5,000 USDC

Week 1: 全部兑换 USDP，添加 USDC/USDP LP
  LP 价值: $5,000
  Stake 到 Gauge

Week 4: 第一次 Claim
  手续费（自动复利）: +$5.16
  PAIMON 排放: 425 esPAIMON (~$21.25)
  操作: 100% Stake esPAIMON（提升 Boost）

Week 8: 第二次 Claim
  手续费: +$10.50（累计）
  PAIMON 排放: 450 esPAIMON (~$22.50，Boost 生效）
  LP 总价值: $5,033

Week 52（1 年后）:
  手续费累积: $310
  PAIMON 排放: 5,530 esPAIMON
    其中 50% vested（365 天）: 2,765 PAIMON
    价值: $138.25
  LP 总价值: $5,448.25

  净收益: $448.25
  ROI: 8.97%（1 年）
  实际 APR: 16.7%（符合预期）
```

**用户反馈**:
> "我是 DeFi 新手，选择稳定币对让我安心。每周花 10 分钟 Claim 奖励，一年下来多赚了 $448，比银行存款高 16 倍。操作很简单，手机就能完成。"

---

## 九、下一步行动

### 立即行动

- [ ] 准备至少 $100 USDC + $100 USDP（测试）
- [ ] 访问 https://paimon.dex/liquidity/pools
- [ ] 分析 3-5 个池子的 APR 和风险

### 今天完成

- [ ] 小额测试添加流动性（$100-$200）
- [ ] Stake LP Token 到 Gauge
- [ ] 设置每周提醒（周五 Claim 奖励）

### 本周完成

- [ ] Claim 第一笔 PAIMON 排放
- [ ] 计算实际 APR vs 预期 APR
- [ ] 加入 Discord #liquidity-providers 频道

### 长期习惯

- [ ] 每周五 Claim 奖励并复投
- [ ] 每月 Rebalance（根据 Gauge 权重调整）
- [ ] 每季度评估 IL vs 手续费收益

---

**文档版本**: v1.0
**维护者**: Paimon.dex Core Team
**联系方式**: liquidity@paimon.dex
**Discord**: https://discord.gg/paimondex（#lp-support 频道）
**IL 计算器**: https://paimon.dex/tools/il-calculator
