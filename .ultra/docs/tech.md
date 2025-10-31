# Technical Design Document - Paimon.dex

## Architecture Overview

Paimon.dex is a monorepo with two main components:

```
paimon-rwa-contracts/    # Solidity smart contracts (Foundry)
nft-paimon-frontend/     # Next.js 14 frontend (TypeScript)
```

## Smart Contract Architecture

### Contract Organization

```
src/
├── core/                # Core protocol tokens
│   ├── HYD.sol         # Synthetic asset
│   ├── PAIMON.sol      # Utility token
│   └── VotingEscrow.sol # veNFT governance
├── treasury/           # Collateral management
│   ├── Treasury.sol    # RWA vault
│   └── PSM.sol         # Peg Stability Module
├── dex/                # ve33 DEX
│   ├── DEXFactory.sol
│   ├── DEXPair.sol
│   └── DEXRouter.sol
├── governance/         # Governance system
│   └── GaugeController.sol
├── launchpad/          # RWA project launches
│   ├── ProjectRegistry.sol
│   └── IssuanceController.sol
├── presale/            # Gamified bond system
│   ├── RWABondNFT.sol
│   └── RemintController.sol
└── oracle/             # Price oracle
    └── RWAPriceOracle.sol
```

### Key Design Patterns

#### 1. Collateralization Tiers (Treasury.sol)
```solidity
T1 (US Treasuries): 80% LTV
T2 (Investment-grade credit): 65% LTV
T3 (RWA revenue pools): 50% LTV
```

#### 2. veNFT Voting Power (VotingEscrow.sol)
```
voting_power = locked_amount × (time_remaining / MAX_TIME)
```

#### 3. DEX Fee Distribution (DEXPair.sol)
```
Total fee: 0.25%
├── 70% → voters (gauge incentives)
└── 30% → treasury
```

#### 4. Dual-Source Oracle (RWAPriceOracle.sol)
```
Price = weighted_average(Chainlink, NAV)
Circuit breaker: >20% deviation → pause
```

### Critical Invariants

1. **PSM Backing**: `USDC balance >= HYD total supply`
2. **DEX Constant Product**: `K = reserve0 × reserve1` (can only increase)
3. **Treasury Collateralization**: `HYD minted <= RWA value × LTV`
4. **Voting Power**: `sum(voting_power) <= sum(locked_HYD)`

## Frontend Architecture

### Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Web3**: wagmi v2, viem, RainbowKit
- **UI**: Material-UI v5 (warm color theme)
- **State**: TanStack Query, Zustand
- **i18n**: next-intl (EN + CN)

### Page Structure

```
src/app/
├── swap/              # PSM + DEX swap interface
├── pool/              # Add/remove liquidity
├── lock/              # veNFT locking
├── vote/              # Governance voting
├── launchpad/         # RWA project participation
├── treasury/          # RWA deposit + monitoring
└── presale/           # Bond NFT minting
```

### Key Configuration

```typescript
// src/config/wagmi.ts - Web3 provider setup
chains: [bscMainnet, bscTestnet]

// src/config/theme.ts - MUI Material Design 3
palette: warmColors (red, orange, yellow, brown)
```

## Data Flow

### 1. RWA Deposit Flow
```
User → Treasury.depositRWA()
  → Oracle.getPrice()
  → Calculate HYD mintable (amount × price × LTV)
  → HYD.mint(user, hydAmount)
  → emit RWADeposited
```

### 2. Swap Flow (DEX)
```
User → DEXRouter.swapExactTokensForTokens()
  → DEXPair.swap()
  → Calculate output (constant product)
  → Transfer tokens
  → Collect fees (0.25%)
  → emit Swap
```

### 3. Vote Flow
```
User locks HYD → VotingEscrow.createLock()
  → Mint veNFT
  → Calculate voting power
  → GaugeController.vote(gauges, weights)
  → Update gauge weights
  → Incentives distributed proportionally
```

## Security Design

### 1. Reentrancy Protection
- All state-changing functions use `nonReentrant` modifier
- Check-Effects-Interactions pattern

### 2. SafeERC20
- OpenZeppelin's SafeERC20 for all token transfers
- USDT compatibility (non-standard ERC20)

### 3. Access Control
- Multi-sig treasury: 3-of-5 with 48-hour timelock
- Emergency pause: 4-of-7 (instant)
- Immutable contracts (no upgrades)

### 4. Oracle Security
- Dual-source pricing (Chainlink + NAV)
- Circuit breaker on >20% deviation
- Automatic pause on discrepancy

### 5. Precision Optimization
```solidity
// ✅ Good: Single division at end
result = (amount × price × ltv) / (1e18 × 10000)

// ❌ Bad: Compounds precision loss
step1 = amount × price / 1e18
step2 = step1 × ltv / 10000
```

## Testing Strategy

### Smart Contracts (Foundry)
- **Unit tests**: Individual function logic
- **Integration tests**: Cross-contract interactions
- **Invariant tests**: Critical invariants maintained
- **Gas benchmarks**: Optimize critical paths

### Frontend (Jest)
- **Component tests**: UI rendering + interactions
- **Hook tests**: Custom React hooks
- **Integration tests**: Contract interaction flows
- **E2E tests**: Critical user journeys

### 6-Dimensional Coverage
1. Functional - Core logic
2. Boundary - Edge cases
3. Exception - Error handling
4. Performance - Gas/load tests
5. Security - Attack vectors
6. Compatibility - Cross-platform

## Deployment Strategy

### Network Configuration
- **Mainnet**: BSC (ChainID 56)
- **Testnet**: BSC Testnet (ChainID 97)

### Deployment Sequence
1. Core tokens (HYD, PAIMON)
2. DEX infrastructure
3. PSM + Treasury + Oracle
4. Governance (veNFT, GaugeController)
5. Launchpad + Presale
6. Integration testing
7. Security audit
8. Mainnet deployment

### External Dependencies
- Chainlink VRF v2 (randomness)
- Chainlink Price Feeds (RWA pricing)
- USDC contract
- Multicall3: `0xcA11bde05977b3631167028862bE2a173976CA11`

## Performance Optimization

### Smart Contracts
- Storage packing: uint128 + uint64 → 1 slot
- Batch operations: `voteMultiple()`, `claimMultiple()`
- Event-driven history: Events instead of storage arrays
- Immutable variables: `immutable` keyword

### Frontend
- Code splitting: Route-based chunks
- Lazy loading: Off-screen components
- Image optimization: WebP, lazy load
- Caching: TanStack Query with stale-while-revalidate

## Monitoring & Observability

### Smart Contracts
- Event emission for all state changes
- Gas usage tracking
- Transaction success rate
- Treasury collateralization ratio

### Frontend
- Core Web Vitals monitoring (LCP, INP, CLS)
- Error tracking (Sentry)
- User analytics (privacy-preserving)
- RPC endpoint health

---

**Next Steps**:
1. Review technical design
2. Run `/ultra-plan` to generate task breakdown
3. Begin development with `/ultra-dev`
