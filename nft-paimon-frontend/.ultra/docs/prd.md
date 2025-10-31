# Product Requirements Document (PRD)

**Project**: Paimon.dex
**Type**: DeFi Protocol (RWA + ve33 DEX + Synthetic Asset)
**Version**: 0.1.0 (HYD v1)
**Date**: 2025-10-24

---

## 1. Executive Summary

### 1.1 Product Vision
An integrated DeFi protocol for Real World Assets (RWA) featuring:
- **RWA Launchpad**: Compliant issuance platform for tokenized real-world assets
- **ve33 DEX**: Velodrome-style decentralized exchange with vote-escrowed governance
- **Treasury System**: Collateralized vault backing HYD synthetic asset
- **HYD Synthetic Asset**: Low-volatility asset backed by treasury RWA holdings
- **veNFT Governance**: Unified governance mechanism across all protocol components

### 1.2 Product Positioning
**"RWA 发行、流动性与治理一体化协议"**

The only protocol that combines RWA issuance, AMM liquidity, and treasury-backed synthetic assets into a single governance flywheel.

### 1.3 Target Users
- **RWA Investors**: Seeking low-threshold, capital-efficient access to real-world assets
- **Liquidity Providers**: Earning trading fees + ve voting rewards
- **Governance Participants**: veNFT holders influencing asset whitelisting and incentive distribution
- **Institutions**: Tokenizing RWA for DeFi distribution

### 1.4 Core Value Proposition
- **Lower Barriers**: Mint HYD against RWA deposits instead of buying full-priced assets
- **Higher Capital Efficiency**: Use HYD in DeFi while retaining RWA exposure
- **Governance Flywheel**: ve voting controls Launchpad listings, Treasury whitelist, and DEX incentives
- **Revenue → Growth Loop**: Protocol fees → Treasury → HYD backing → ve rewards → More activity

---

## 2. Protocol Tokens

### 2.1 HYD (Synthetic Asset)
**Definition**: Non-stablecoin, low-volatility asset backed by Treasury RWA holdings

| Attribute | Description |
|-----------|-------------|
| **Type** | Synthetic asset (CDP-style) |
| **Backing** | Treasury RWA deposits (US Treasuries, investment-grade credit, RWA revenue pools) |
| **Volatility** | Lower than typical crypto assets, not pegged to $1 |
| **Minting** | Users deposit RWA into Treasury → mint HYD at discounted LTV ratios |
| **Redemption** | Burn HYD to redeem underlying RWA (subject to fees and cooldown) |
| **Use Cases** | DEX trading, collateral, locked into veNFT for governance |

**Key Parameters**:
- **LTV Ratios**: Tier 1 (80%), Tier 2 (65%), Tier 3 (50%) based on asset quality
- **Minting Fee**: 0.30%
- **Redemption Fee**: 0.50% (early redemption +0.30%)
- **Liquidation Threshold**: 115% (5% penalty)

### 2.2 PAIMON (Platform Token)
**Definition**: Governance and utility token for ecosystem incentives

| Attribute | Description |
|-----------|-------------|
| **Use Cases** | - Ecosystem incentives<br>- Fee discounts<br>- Supplementary governance<br>- Activity whitelist access |
| **Emissions** | Tied to ve voting results and actual trading volume (no idle farming) |
| **Value Capture** | Protocol revenue buyback & burn (20% of protocol income) |
| **Distribution** | TBD (community, team, treasury allocations) |

### 2.3 veNFT (Vote-Escrowed NFT)
**Definition**: NFT representing locked HYD/RWA with governance rights

| Attribute | Description |
|-----------|-------------|
| **Mechanism** | Lock HYD for 1 week ~ 4 years → receive veNFT with voting power |
| **Voting Weight** | Linear decay from lock time (4 years = 2.00x, 1 year = 1.00x, 1 week = 0.05x) |
| **Governance Scope** | - DEX pair incentive distribution (ve33)<br>- Launchpad project whitelisting<br>- Treasury asset whitelist and weights |
| **Revenue Share** | Trading fees + Launchpad fees (requires ≥3 month lock) |

---

## 3. Core Features

### 3.1 RWA Launchpad

**Purpose**: Compliant issuance platform for tokenized real-world assets

**Features**:
- [ ] **Project Vetting**: Risk assessment, compliance screening, due diligence
- [ ] **Asset Tokenization**: ERC-20/ERC-721 wrappers for RWA certificates
- [ ] **Public Sale**: Primary issuance with USDC/stablecoin payments
- [ ] **Governance Integration**: veNFT holders vote on project whitelist and allocation quotas
- [ ] **Information Disclosure**: Valuation methodology, cash flow sources, custody arrangements, audit reports

**User Flows**:
1. **Project Onboarding**: Submit RWA documentation → Risk review → veNFT whitelist vote → Approval
2. **User Participation**: Connect wallet → Review RWA details → Purchase with USDC → Receive tokenized RWA
3. **Post-Issuance**: RWA tokens tradable on DEX, depositable into Treasury for HYD minting

**Fees**:
- **Issuance Fee**: 1.0% (70% to Treasury, 30% to ve fee pool)

---

### 3.2 ve33 DEX (Velodrome-Style AMM)

**Purpose**: Decentralized exchange with vote-escrowed incentive mechanism

**Features**:
- [ ] **AMM Pools**: Constant product (x*y=k) and stable swap curves
- [ ] **Liquidity Mining**: Incentives distributed based on veNFT voting results
- [ ] **Fee Distribution**: 0.25% swap fee (70% to ve voters, 30% to Treasury)
- [ ] **Voting Epochs**: Weekly voting rounds determining next epoch's incentive allocation
- [ ] **Bribes**: Third parties can offer bribes to veNFT holders for voting on specific pools

**User Flows**:
1. **Swap**: Connect wallet → Select pair → Execute trade → Pay 0.25% fee
2. **Provide Liquidity**: Deposit token pair → Receive LP tokens → Stake for PAIMON rewards
3. **Vote for Incentives**: Lock HYD → Receive veNFT → Vote on pool incentives → Earn fee share + bribes

**Key Mechanisms**:
- **ve33 Model**: Similar to Solidly/Velodrome (vote-escrowed governance, fee distribution to voters)
- **Pool Types**: Standard AMM pairs (RWA/USDC, HYD/USDC, PAIMON/ETH, etc.)
- **Anti-Vampire**: Incentives tied to actual trading volume, not just TVL

---

### 3.3 Treasury System

**Purpose**: Collateralized vault accepting RWA deposits to back HYD issuance

**Features**:
- [ ] **RWA Deposits**: Users deposit whitelisted RWA assets
- [ ] **HYD Minting**: Mint HYD at LTV-discounted ratios based on asset tier
- [ ] **Asset Whitelisting**: veNFT governance votes on accepted RWA types
- [ ] **Risk Management**: Tier-based LTV ratios, position limits, liquidation mechanisms
- [ ] **Revenue Collection**: Protocol fees (trading, issuance, redemption) accrue to Treasury
- [ ] **Yield Generation**: Treasury assets may generate yield (bond coupons, RWA cash flows)

**User Flows**:
1. **Deposit RWA**: Connect wallet → Select whitelisted RWA → Deposit → Receive HYD (LTV ratio)
2. **Redeem RWA**: Burn HYD → Pay redemption fee → Receive underlying RWA (cooldown period)
3. **Liquidation (if undercollateralized)**: Protocol liquidates position at 115% threshold with 5% penalty

**Supported Asset Tiers** (Initial Whitelist Proposal):

| Tier | Example Assets | LTV | Minting Discount | Single Asset Limit | Disclosure |
|------|---------------|-----|------------------|-------------------|------------|
| **T1** | US Treasuries, money market funds, AAA custody notes | 80% | -2% | $10M USDC equivalent | Weekly NAV + Monthly audit |
| **T2** | Investment-grade credit, high-quality receivables pools | 65% | -5% | $7M USDC equivalent | Bi-weekly + Quarterly audit |
| **T3** | Real estate, emerging RWA, lower liquidity assets | 50% | -8% | $3M USDC equivalent | Bi-weekly + Event-driven |

**Risk Controls**:
- **Price Deviation Bands**: ±3% triggers buffer alert, ±5% triggers pause + governance review
- **Dynamic LTV Adjustment**: Consecutive price anomalies auto-reduce LTV by 5%
- **Emergency Pause**: Multi-sig can halt deposits/withdrawals for 24-72 hours pending governance

---

### 3.4 veNFT Governance

**Purpose**: Unified governance mechanism across all protocol components

**Voting Scenarios**:
1. **DEX Incentive Allocation** (ve33 style): Vote on which liquidity pools receive PAIMON emissions
2. **Launchpad Project Whitelist**: Approve/reject RWA projects for issuance
3. **Treasury Asset Whitelist**: Approve/reject RWA types eligible for HYD minting
4. **Parameter Changes**: Adjust fees, LTV ratios, liquidation thresholds (via governance proposals)

**Voting Power Calculation**:
```
Voting Power = HYD Locked Amount × Time Weight
Time Weight = Lock Duration / Max Duration (4 years)
```

**Example**:
- Lock 1,000 HYD for 2 years → Voting Power = 1,000 × (2/4) × 1.5 = 750 units
- Lock 1,000 HYD for 4 years → Voting Power = 1,000 × (4/4) × 2.0 = 2,000 units

**Revenue Sharing** (requires ≥3 month lock):
- 40% of protocol revenue → ve incentive pools (allocated by voting results)
- veNFT holders receive proportional share of:
  - DEX trading fees (0.25% × 70%)
  - Launchpad issuance fees (1.0% × 30%)
  - Redemption fees

---

## 4. Protocol Flywheel

### 4.1 Flywheel Mechanism
```
1. Quality RWA projects launch via Launchpad → Attract capital inflows
2. Users deposit RWA into Treasury → Mint HYD at discounted LTV
3. Users lock HYD → Receive veNFT with governance rights
4. veNFT voting guides:
   - DEX liquidity incentives
   - Launchpad project approvals
   - Treasury asset whitelist
5. Increased activity → More protocol fees → Treasury revenue growth
6. Treasury revenue → HYD backing strength + ecosystem rewards → Reinforces cycle
```

### 4.2 Revenue Flows
**Income Sources**:
- DEX trading fees (0.25%)
- Launchpad issuance fees (1.0%)
- HYD minting/redemption fees (0.30% / 0.50%)
- Treasury yield from RWA holdings
- Optional: Performance fees on managed RWA portfolios

**Distribution** (Baseline):
- **40%**: ve voting target pools (HYD/PAIMON incentives + fee share)
- **25%**: Treasury risk buffer & reinvestment
- **20%**: PAIMON buyback & burn
- **10%**: HYD stabilizer (buyback during extreme deviations)
- **5%**: Operations & development fund

---

## 5. User Stories

### 5.1 As an RWA Investor
- I want to purchase tokenized US Treasuries via Launchpad with USDC
- I want to deposit my RWA holdings into Treasury and mint HYD for DeFi use
- I want to track my Treasury position's health and collateralization ratio

### 5.2 As a Liquidity Provider
- I want to provide liquidity to HYD/USDC pool and earn trading fees
- I want to lock my HYD into veNFT and vote for my pool to receive PAIMON emissions
- I want to receive bribes from projects incentivizing votes for their pools

### 5.3 As a Governance Participant
- I want to vote on which RWA projects get listed on Launchpad
- I want to propose adding new RWA asset classes to the Treasury whitelist
- I want to adjust protocol fee parameters through governance proposals

### 5.4 As a Project Issuer
- I want to submit my RWA project for Launchpad review
- I want to provide transparent disclosure documents to gain community approval
- I want to incentivize liquidity for my RWA token on the DEX

---

## 6. Non-Functional Requirements

### 6.1 Security
- [ ] Smart contract audits by reputable firms (pre-mainnet)
- [ ] Multi-sig controls for Treasury and emergency functions (3-of-5 or 4-of-7)
- [ ] Oracle redundancy for RWA price feeds (on-chain + custodian NAV sync)
- [ ] Reentrancy guards, access controls, pausability mechanisms
- [ ] Liquidation bot infrastructure and testing

### 6.2 Compliance
- [ ] RWA asset disclosure standards (valuation method, cash flow sources, custody)
- [ ] KYC/AML for Launchpad issuers (if required by jurisdiction)
- [ ] Legal entity structure for Treasury custody (if holding real-world assets)
- [ ] Regulatory risk assessment and jurisdictional restrictions

### 6.3 Performance
- [ ] Frontend load time <2.5s (Core Web Vitals: LCP <2.5s, FID <100ms, CLS <0.1)
- [ ] Smart contract gas optimization (batch operations, minimal storage writes)
- [ ] Subgraph indexing for historical data and analytics
- [ ] Real-time price feeds with <1 minute latency

### 6.4 User Experience
- [ ] Material Design 3 compliant UI (warm color palette, no blue/purple)
- [ ] Bilingual support (English + Chinese)
- [ ] Mobile-responsive design
- [ ] Educational tooltips for complex concepts (LTV, veNFT, Remint)
- [ ] Transaction simulation before signing

---

## 7. Out of Scope (v0.1.0)

- [ ] Cross-chain RWA bridging
- [ ] Advanced derivatives (options, futures on RWA)
- [ ] Institutional-grade custody integration
- [ ] On-chain credit scoring for borrowers
- [ ] DAO-managed RWA acquisition funds

---

## 8. Initial Product Offering: RWA NFT (Presale Bond)

### 8.1 Overview
**3-Month Yield-Bearing Bond Certificate with Convertible Options**

| Parameter | Value |
|-----------|-------|
| **Total Supply** | 5,000 NFTs |
| **Price** | 100 USDC per NFT |
| **Duration** | 90 days |
| **Base Yield** | 2% APR (~0.5% for 3 months) |
| **Remint Yield** | 0-8% APR (~0-2% for 3 months) |
| **Target APR** | 6% (range: 2-10%) |

### 8.2 Remint Mechanism
**Purpose**: Incentivize ecosystem engagement during holding period

**How it Works**:
- Hold NFT + complete ecosystem tasks (provide HYD liquidity, vote, complete missions)
- Earn weekly reward points → Convert to additional yield (0-8% APR range)
- More engagement = Higher yield tier

**Example Outcomes** (100 NFTs × 100 USDC × 90 days):
- **Base only**: ~50 USDC yield
- **Base + Moderate Remint (4% APR)**: ~150 USDC yield
- **Base + Max Remint (8% APR)**: ~250 USDC yield

### 8.3 Maturity Options (Choose One)

| Option | What You Get | Pricing | Liquidity | Additional Benefits | Risks |
|--------|--------------|---------|-----------|---------------------|-------|
| **Convert to veNFT** | Lock HYD in veNFT (principal + yield @ 1u = 1 HYD) | Accounting rate | Low (locked) | Governance rights, fee share, voting rewards | HYD price volatility, liquidity locked |
| **Redeem PAIMON** | PAIMON tokens at conversion rate | 30-day TWAP × 95% | High | Trading immediately, ecosystem utility | PAIMON price volatility |
| **Cash Redemption** | Principal + accrued yield (minus 0.3% fee) | Face value + yield | Highest | Stable exit | Opportunity cost (no governance upside) |

**Default Behavior** (if no action taken within 7-day grace period):
- If user has prior lock history → Default to veNFT (3-month lock)
- If user never locked before → Default to cash redemption

### 8.4 Presale Use of Funds
- **Cold-start liquidity**: Seed initial DEX pools (HYD/USDC, PAIMON/ETH)
- **Treasury reserves**: Acquire initial RWA holdings (T1/T2 assets)
- **Development**: Smart contract audits, frontend development, operations
- **Marketing**: Community building, partnerships, educational content

---

## 9. Risks & Mitigation

### 9.1 Smart Contract Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Oracle manipulation | Critical | Multi-oracle setup + NAV fallback + deviation circuit breakers |
| Liquidation bot failure | High | Keeper network redundancy + public liquidation incentives |
| Governance attack | Medium | Timelock + multi-sig veto + gradual parameter changes |

### 9.2 RWA Market Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Underlying asset devaluation | High | Conservative LTV ratios, asset diversification, liquidation mechanisms |
| Custody failure | Critical | Reputable custodians, insurance, multi-jurisdictional diversification |
| Liquidity crunch | Medium | Tiered redemption fees, cooldown periods, emergency reserves |

### 9.3 Regulatory Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Securities classification | Critical | Legal review, compliance framework, jurisdictional restrictions |
| AML/KYC requirements | Medium | Optional KYC layers for certain jurisdictions, transparent disclosure |

---

## 10. Success Metrics (KPIs)

### 10.1 Adoption Metrics
- **TVL in Treasury**: Target $10M by Month 3, $50M by Month 6
- **HYD Circulating Supply**: 20% of max theoretical supply within 6 months
- **Active veNFT Holders**: 500+ within 3 months
- **Weekly Trading Volume on DEX**: $1M+ average by Month 6

### 10.2 Engagement Metrics
- **Governance Participation**: >30% of veNFT supply voting per epoch
- **Launchpad Projects Launched**: 3-5 quality RWA projects in first 6 months
- **Average Lock Duration**: >6 months (indicates strong governance commitment)

### 10.3 Financial Metrics
- **Protocol Revenue**: $50K+ monthly by Month 6
- **HYD Peg Stability**: <±5% deviation from expected value range
- **PAIMON Buyback/Burn**: 10% of initial supply burned within 12 months

---

## 11. Roadmap

### Phase 1: Foundation (Months 1-2)
- [ ] Smart contract development (Treasury, HYD, veNFT, DEX core)
- [ ] Security audit (Trail of Bits / OpenZeppelin / Consensys Diligence)
- [ ] Frontend MVP (wallet connect, basic swap, Treasury deposit/mint)
- [ ] RWA NFT presale launch
- [ ] Community building & documentation

### Phase 2: Launchpad & Governance (Months 3-4)
- [ ] First RWA project issuance via Launchpad
- [ ] veNFT governance activation (voting on incentives + whitelists)
- [ ] HYD minting/redemption live
- [ ] DEX liquidity bootstrapping with PAIMON emissions
- [ ] Analytics dashboard (APRs, Treasury health, voting results)

### Phase 3: Ecosystem Expansion (Months 5-6)
- [ ] Additional RWA asset tiers (T2/T3 onboarding)
- [ ] Advanced governance features (parameter adjustment proposals)
- [ ] Liquidation system testing and activation
- [ ] Bribe marketplace for ve voting
- [ ] Cross-protocol integrations (lending markets using HYD as collateral)

### Phase 4: Maturity & Scaling (Months 7-12)
- [ ] Multi-chain deployment (Arbitrum, Base, Optimism)
- [ ] Institutional RWA partnerships
- [ ] Advanced risk management tooling
- [ ] Mobile app for governance participation
- [ ] Legal entity establishment for real-world custody (if needed)

---

## 12. Open Questions (To Be Resolved)

1. **Blockchain Selection**: Ethereum mainnet, Layer 2 (Arbitrum/Base/Optimism), or app-chain?
2. **HYD Price Discovery**: How to establish initial HYD exchange rate? (Bootstrap via liquidity pools?)
3. **RWA Custody Model**: Direct on-chain representation vs. SPV wrapper vs. centralized custodian API?
4. **Legal Structure**: What entity structure for Treasury management? (DAO, Foundation, Trust?)
5. **PAIMON Initial Distribution**: What % for community, team, treasury, presale?
6. **Compliance Jurisdictions**: Which regions to target/avoid for regulatory clarity?

---

## 13. Appendix

### 13.1 Reference Projects
- **Velodrome Finance**: ve33 DEX model, voting incentives, bribes
- **MakerDAO**: CDP system, collateral management, liquidation mechanisms
- **Ondo Finance**: RWA tokenization, compliance framework
- **Backed Finance**: Tokenized bonds and equities
- **Curve Finance**: veToken governance, gauge voting

### 13.2 Technical Standards
- **ERC-20**: HYD, PAIMON tokens
- **ERC-721**: veNFT, RWA presale NFT
- **ERC-1155**: (Optional) for multi-asset RWA certificates
- **EIP-2612**: Permit (gasless approvals for better UX)
- **EIP-4626**: (Consideration) for standardized vault interfaces

### 13.3 Related Documents
- **Technical Design**: `.ultra/docs/tech.md`
- **Architecture Decisions**: `.ultra/docs/decisions/`
- **Risk Framework**: `.ultra/docs/tech-debt/` (track known limitations)

---

**Document Status**: Draft v0.1
**Next Review**: After architecture design completion
**Approval Required**: Technical lead, Product lead, Legal counsel
