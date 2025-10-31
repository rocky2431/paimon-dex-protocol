# Architecture Decision Record (ADR)

**Decision ID**: ADR-001
**Title**: 采用 BSC 链上原生 RWA 代币方案 + PSM 稳定机制
**Date**: 2025-10-24
**Status**: Accepted
**Deciders**: Technical Team, Product Lead

---

## Context

Paimon.dex 需要选择 RWA(真实世界资产)的代币化方案和 HYD 合成资产的稳定机制。核心决策点:

1. **RWA 代币化方式**: 链上原生代币 vs 中心化托管 API
2. **部署链选择**: BSC vs Ethereum vs Arbitrum
3. **HYD 稳定机制**: PSM vs 算法稳定币 vs 全抵押模型

### Forces (约束条件)

- **用户需求**: 低 gas 成本,快速确认,简单易用
- **技术约束**: DeFi 可组合性,审计透明度,安全性
- **业务目标**: 快速 MVP,6 个月达到 $5M-10M TVL
- **资源限制**: 初期预算 < $100K,开发周期 6-8 周

---

## Decision

我们决定采用以下技术方案:

### 1. RWA 代币化方案
**选择**: **链上原生 RWA 代币**

- **具体实现**: 直接使用 USDT/USDC 等成熟稳定币作为 RWA 基础资产
- **理由**:
  - DeFi 可组合性最强(9/10 vs 4/10)
  - 无需重建托管层,降低复杂度
  - 可直接集成 PancakeSwap、Venus 等 BSC DeFi 协议
- **Trade-off**: 牺牲部分合规灵活性(vs 中心化托管的 KYC/AML)

### 2. 部署链
**选择**: **BNB Smart Chain (BSC)**

- **理由**:
  - Gas 成本仅为 Ethereum 的 **2.7%** ($0.12 vs $4)
  - TVL 生态成熟($5.3B,Venus $2B, Thena $1.6B)
  - ve33 DEX 成功案例(Thena Finance)
  - 3 秒区块时间,用户体验佳
- **Trade-off**: 牺牲去中心化程度(21 个验证者 vs Ethereum 1M+)

### 3. HYD 稳定机制
**选择**: **PSM (Peg Stability Module) + Treasury 混合模型**

- **理由**:
  - PSM 1:1 兑换机制简单有效(参考 MakerDAO/Venus)
  - 套利激励自动维持锚定(HYD ≈ $1)
  - Treasury 收入作为二级稳定器(价格 < $0.98 时回购)
- **参数**:
  - PSM Mint/Burn Fee: **0.1%** (10 bp)
  - 初始铸币上限: **1M HYD**
  - Treasury 初始储备: **100K USDC**

---

## Rationale (详细理由)

### Why 链上原生 > 中心化托管?

**6 维度对比评分**:
| Dimension | 链上原生 | 中心化托管 | 差距 |
|-----------|---------|-----------|------|
| DeFi 可组合性 | 9/10 | 4/10 | +5 ✅ |
| Gas 效率 | 7/10 | 9/10 | -2 |
| 流动性 | 8/10 | 5/10 | +3 ✅ |
| 审计透明度 | 10/10 | 6/10 | +4 ✅ |
| 实施复杂度 | 6/10 | 8/10 | -2 |
| 用户体验 | 10/10 | 6/10 | +4 ✅ |
| **总分** | **50/60** | **38/60** | **+12** |

**关键洞察**:
- ✅ 链上原生方案在**核心优势**(可组合性、透明度、用户体验)领先 **12 分**
- ⚠️ Gas 效率劣势可通过 BSC 部署抵消(BSC gas 本身很低)
- ⚠️ 实施复杂度差距小,且链上方案可复用 OpenZeppelin 成熟库

### Why BSC > Ethereum/Arbitrum?

**Gas 成本对比**:
- Ethereum: $4.43/tx → 用户每月 ~$20 gas(不可接受)
- **BSC: $0.12/tx** → 用户每月 ~$0.50 gas(✅ 最优)
- Arbitrum: $0.05/tx → 但 ve33 生态不成熟(无 Thena 级项目)

**生态成熟度**:
- BSC TVL $5.3B,PancakeSwap $1.5B,Venus $2B,**Thena $1.6B**(ve33 成功案例)
- Arbitrum TVL 更高($13B)但 ve33 DEX 较少,需要更多市场教育

**决策**: BSC 是**ve33 + RWA 的最佳验证场**,成本低+案例成熟

### Why PSM > 算法稳定币?

**算法稳定币风险**(参考 UST 崩盘):
- ❌ 死亡螺旋风险(价格 < $1 → 抛售 → 价格更低)
- ❌ 需要复杂的套利机制和激励设计
- ❌ 用户信任难建立(Terra Luna 阴影)

**PSM 优势**:
- ✅ 机制简单透明(1:1 兑换)
- ✅ 有成功案例(MakerDAO DAI PSM,Venus VAI PSM)
- ✅ 套利激励自动运作,无需人工干预

**Trade-off**: PSM 需要维持 USDC 储备,资本效率略低于算法模型,但**安全性 >> 效率**

---

## Alternatives Considered

### Alternative 1: 中心化托管 API 方案(Ondo Finance 模型)
**Pros**:
- 合规优先,内建 KYC/AML
- Gas 优化(仅铸造/赎回需链上)
- 机构级安全(BlackRock, Coinbase 托管)

**Cons**:
- ❌ **零 DeFi 可组合性**(无法直接用于 AMM 抵押)
- ❌ 流动性碎片化(24/7 可赎回但需等待结算)
- ❌ 信任假设(依赖 Fireblocks/Zodia 托管)
- ❌ BSC 生态割裂(Ondo 主要在 Ethereum)

**Why rejected**:
与 Paimon.dex 的 **DeFi 原生定位**冲突。中心化托管适合机构产品,不适合流动性优先的 ve33 DEX。

---

### Alternative 2: Ethereum Mainnet 部署
**Pros**:
- 最强去中心化(1M+ 验证者)
- 最大 DeFi 生态(TVL $58B)
- Velodrome Finance 官方支持

**Cons**:
- ❌ **Gas 成本过高**($4/tx,用户每月 $20 gas 不可接受)
- ❌ 15 秒区块时间(vs BSC 3 秒)
- ❌ 流动性引导成本高(需要 $500K+ 初始资金)

**Why rejected**:
Gas 成本是**致命弱点**,会严重损害用户体验。BSC 可提供 **97% 成本降低**且生态足够成熟。

---

### Alternative 3: 算法稳定币机制(FRAX/UST 模型)
**Pros**:
- 资本效率高(无需 100% 抵押)
- 可扩展性强(理论上无限供应)
- 去中心化程度高(无需托管)

**Cons**:
- ❌ **死亡螺旋风险**(UST 崩盘教训)
- ❌ 机制复杂,审计难度高
- ❌ 用户信任难建立(Terra 阴影)
- ❌ 需要大量 ve 投票者参与套利(冷启动困难)

**Why rejected**:
**安全性风险 >> 资本效率收益**。PSM 虽然简单,但经过 MakerDAO/Venus 验证,可靠性高。

---

## Consequences

### Positive (正面影响)

1. **用户体验大幅提升**:
   - Gas 成本: $20/月 → **$0.50/月** (97% 降低)
   - 确认速度: 15s → **3s** (80% 更快)
   - 钱包集成: MetaMask + Trust Wallet 即用

2. **DeFi 可组合性最大化**:
   - HYD 可直接用于 PancakeSwap LP
   - HYD 可作为 Venus Protocol 抵押品
   - veHYD 可参与其他协议的 bribe 市场

3. **开发时间缩短**:
   - 无需构建托管层 → 节省 **2-3 周**开发时间
   - 复用 OpenZeppelin 库 → 降低审计成本 **30%**

4. **安全性可控**:
   - PSM 机制简单,攻击面小
   - 链上透明,社区可实时监控
   - 有成功案例参考(Venus PSM 未被攻击)

### Negative (负面影响)

1. **合规灵活性降低**:
   - 无法实施 KYC/AML(vs Ondo 的托管模型)
   - 可能面临监管挑战(需要法律咨询)
   - 缓解: 初期聚焦技术实现,Phase 2 再考虑合规层

2. **PSM 储备管理风险**:
   - 需要维持充足的 USDC 储备
   - HYD 需求激增时可能耗尽储备
   - 缓解: 动态 `maxMintedHYD` 上限 + Treasury 紧急注资

3. **BSC 中心化风险**:
   - 仅 21 个验证者(vs Ethereum 1M+)
   - 理论上可能被审查
   - 缓解: 接受该风险(BSC 设计特性),未来多链扩展

### Neutral (中性影响)

1. **需要市场教育**:
   - 用户需要理解 PSM 机制(不是算法稳定币)
   - 需要 Dashboard 展示 HYD 锚定状态
   - 缓解: 清晰的 UI/UX + 教育内容

2. **审计成本**:
   - PSM 合约需要外部审计($30K-50K)
   - 但相比托管 API 方案,总成本更低
   - 缓解: 预算已包含审计费用

---

## Impact

**Affected Components**:
- Smart Contracts: HYD Token, PSM Module, VotingEscrow, GaugeController
- Frontend: Wallet integration(BSC network), PSM UI, Analytics dashboard
- Backend: The Graph indexer(BSC subgraph), Chainlink oracle integration
- Operations: BSC RPC management, multi-sig setup, monitoring

**Migration Effort**: N/A (新项目,无需迁移)

**Timeline**:
- Immediate: 确认技术方案
- Week 1-2: 核心合约开发
- Week 3-4: ve33 治理层
- Week 5-6: DeFi 集成
- Week 7: 外部审计
- Week 8: BSC 主网部署

---

## Implementation Notes

### PSM 核心合约(参考 Venus)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PegStabilityModule {
    IERC20 public immutable HYD;
    IERC20 public immutable USDC;

    uint256 public feeIn = 10;   // 0.1%
    uint256 public feeOut = 10;  // 0.1%
    uint256 public maxMintedHYD = 1_000_000e18;
    uint256 public totalMinted;

    function swapUSDCForHYD(uint256 usdcAmount) external returns (uint256 hydReceived) {
        uint256 fee = (usdcAmount * feeIn) / 10000;
        hydReceived = usdcAmount - fee;

        require(totalMinted + hydReceived <= maxMintedHYD, "Exceeds mint cap");

        USDC.transferFrom(msg.sender, address(this), usdcAmount);
        IHYD(address(HYD)).mint(msg.sender, hydReceived);
        totalMinted += hydReceived;
    }

    function swapHYDForUSDC(uint256 hydAmount) external returns (uint256 usdcReceived) {
        uint256 fee = (hydAmount * feeOut) / 10000;
        usdcReceived = hydAmount - fee;

        require(USDC.balanceOf(address(this)) >= usdcReceived, "Insufficient reserve");

        IHYD(address(HYD)).burnFrom(msg.sender, hydAmount);
        USDC.transfer(msg.sender, usdcReceived);
        totalMinted -= hydAmount;
    }
}
```

### BSC 部署配置

```typescript
// hardhat.config.ts
const config: HardhatUserConfig = {
  networks: {
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
      chainId: 97,
      accounts: [process.env.PRIVATE_KEY]
    },
    bsc: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      accounts: [process.env.PRIVATE_KEY],
      gasPrice: 3000000000 // 3 Gwei
    }
  },
  etherscan: {
    apiKey: {
      bsc: process.env.BSCSCAN_API_KEY,
      bscTestnet: process.env.BSCSCAN_API_KEY
    }
  }
};
```

---

## Related Decisions

- **Supersedes**: None (首个 ADR)
- **Related to**:
  - ADR-002 (计划): 前端技术栈选择(Next.js vs React)
  - ADR-003 (计划): ve33 投票 epoch 周期设计

---

## References

- **Research Report**: `.ultra/docs/research/bsc-rwa-protocol-optimization-2025-10-24.md`
- **Venus PSM Docs**: https://docs-v4.venus.io/whats-new/psm
- **MakerDAO PSM MIP**: https://mips.makerdao.com/mips/details/MIP29
- **Thena Finance Audit**: OpenZeppelin 2023 审计报告
- **BSC Docs**: https://docs.bnbchain.org

---

**Review Date**: 2025-11-24 (建议 1 个月后复核,基于 Testnet 实测数据)
