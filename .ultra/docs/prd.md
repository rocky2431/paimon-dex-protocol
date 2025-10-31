# Product Requirements Document - Paimon.dex

## Overview

**Paimon.dex** is a DeFi protocol combining RWA (Real World Asset) tokenization, ve33 DEX, and treasury-backed synthetic assets.

### Key Components

- **HYD Token**: Synthetic asset backed by treasury RWA holdings (T1/T2/T3 tiers)
- **PAIMON Token**: Platform utility token for governance
- **veNFT**: Vote-escrowed NFT for governance rights (1 week ~ 4 years lock)

## Core Features

### 1. RWA Tokenization & Treasury
- Multi-tier collateralization (T1: 80% LTV, T2: 65% LTV, T3: 50% LTV)
- Real-world asset deposit and management
- PSM (Peg Stability Module) for USDC ↔ HYD 1:1 swap
- Dual-source oracle pricing (Chainlink + custodian NAV)

### 2. ve33 DEX
- Uniswap V2 fork with custom fee structure (0.25% total)
- 70% fees to voters (gauge incentives)
- 30% fees to treasury
- Vote-escrowed NFT governance for liquidity incentives

### 3. Governance System
- veNFT with linear decay voting power
- Gauge controller for liquidity mining distribution
- Project registry for RWA project approvals
- Issuance controller for token sales

### 4. Presale & Gamification
- RWA Bond NFT with gamified minting
- Dice rolling system (Chainlink VRF)
- Social task rewards (RemintController)
- Settlement router for multi-path swaps

## Technical Requirements

### Smart Contracts (Solidity)
- Foundry-based development
- Target network: BSC (mainnet + testnet)
- Security: Reentrancy guards, SafeERC20, pausability
- Gas optimization: Storage packing, batch operations
- Test coverage: ≥80% overall, 100% critical paths

### Frontend (Next.js 14)
- TypeScript + wagmi v2 + viem
- RainbowKit for wallet connection
- Material-UI v5 (warm color theme)
- Bilingual support (EN + CN)
- Core Web Vitals: LCP <2.5s, INP <200ms, CLS <0.1

### Security Standards
- Multi-sig treasury: 3-of-5 with 48-hour timelock
- Emergency pause: 4-of-7 (instant)
- Circuit breaker on oracle >20% deviation
- Immutable contracts (no upgrades)

## Success Metrics

### Smart Contracts
- Test coverage: ≥80%
- Gas efficiency: Bond NFT minting <250K gas
- Invariants maintained: PSM backing, DEX K, Treasury collateralization

### Frontend
- Core Web Vitals: All green
- Test coverage: ≥80%
- Load time: <3s initial load
- Mobile responsiveness: 100%

### Business
- TVL (Total Value Locked)
- Trading volume
- veNFT participation rate
- RWA project onboarding rate

## Protocol Flywheel

1. RWA Projects listed → Users purchase RWA tokens
2. Deposit RWA → Treasury → Mint HYD at LTV ratio
3. Lock HYD → Receive veNFT → Governance rights
4. veNFT voting controls DEX incentives + project approvals
5. Protocol activity → Revenue (swap fees, issuance fees)
6. Revenue distribution → ve incentives, treasury, buyback/burn

## Roadmap

### Phase 1: Foundation (Current)
- Core contracts deployment
- Basic frontend (swap, pool, lock, vote)
- Testnet launch

### Phase 2: Expansion
- Launchpad integration
- Treasury management UI
- Presale/bond NFT system

### Phase 3: Optimization
- Gas optimizations
- Advanced trading features
- Mobile app

### Phase 4: Ecosystem
- Third-party integrations
- Analytics dashboard
- Community governance tools

## Risk Considerations

### Technical Risks
- Smart contract vulnerabilities
- Oracle manipulation
- MEV attacks
- Gas price volatility

### Business Risks
- RWA custody risk
- Regulatory uncertainty
- Market volatility
- Liquidity fragmentation

### Mitigation Strategies
- Comprehensive security audits
- Multi-sig + timelock governance
- Circuit breakers and pause mechanisms
- Gradual rollout with caps

---

**Next Steps**: Review this PRD, then run `/ultra-plan` to break down into actionable tasks.
