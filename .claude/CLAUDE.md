# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Paimon.dex** is a DeFi protocol combining RWA (Real World Asset) tokenization, veNFT Governance DEX, and treasury-backed synthetic assets. This is a **monorepo** with two main components:

- `paimon-rwa-contracts/` - Solidity smart contracts (Foundry-based)
- `nft-paimon-frontend/` - Next.js 14 frontend (TypeScript)

**Key tokens:**
- **USDP**: Synthetic stablecoin backed by treasury RWA holdings (T1/T2/T3 tiers)
- **PAIMON**: Governance token (lock for vePAIMON NFT)
- **HYD**: RWA collateral asset token (Tier 1, 60% LTV)
- **vePAIMON NFT**: Vote-escrowed NFT from locking PAIMON (1 week ~ 4 years lock)

## Common Development Commands

### Smart Contracts (Foundry)
```bash
cd paimon-rwa-contracts

# Build contracts
forge build

# Run all tests
forge test

# Run specific test file
forge test --match-path test/core/HYD.t.sol

# Run tests with gas reporting
forge test --gas-report

# Run with verbosity (see console.log output)
forge test -vvv

# Coverage report
forge coverage

# Deploy to testnet
forge script script/Deploy.s.sol --rpc-url $BSC_TESTNET_RPC_URL --broadcast

# Format code
forge fmt
```

### Frontend (Next.js)
```bash
cd nft-paimon-frontend

# Install dependencies
npm install

# Run dev server (port 4000)
npm run dev

# Type checking
npm run type-check

# Build production
npm run build

# Run tests
npm test

# Run tests in watch mode
npm test:watch

# Coverage report
npm run test:coverage

# Lint
npm run lint
```

## Architecture Overview

### Smart Contract Layer

**Contract organization** (in `paimon-rwa-contracts/src/`):
- `core/` - USDP.sol, PAIMON.sol, VotingEscrow.sol (vePAIMON NFT)
- `treasury/` - Treasury.sol (RWA collateral vault), PSM.sol (USDC↔USDP 1:1 swap)
- `dex/` - DEXFactory.sol, DEXPair.sol, DEXRouter.sol (Uniswap V2 fork with custom fees)
- `governance/` - GaugeController.sol (liquidity mining distribution)
- `launchpad/` - ProjectRegistry.sol (veNFT governance), IssuanceController.sol (token sales)
- `presale/` - RWABondNFT.sol (gamified bond system), RemintController.sol (dice + social tasks)
- `oracle/` - RWAPriceOracle.sol (dual-source: Chainlink + custodian NAV)

**Key architectural patterns:**
1. **Collateralization tiers** (Treasury.sol):
   - T1 (US Treasuries): 80% LTV
   - T2 (Investment-grade credit): 65% LTV
   - T3 (RWA revenue pools): 50% LTV

2. **veNFT governance** (VotingEscrow.sol):
   - Lock PAIMON for duration → receive vePAIMON NFT → voting power
   - Voting power = amount × (time_remaining / MAX_TIME)
   - Linear decay, non-transferable NFT

3. **DEX fees** (DEXPair.sol):
   - Total swap fee: 0.25%
   - 70% to voters (gauge incentives)
   - 30% to treasury

4. **Oracle security** (RWAPriceOracle.sol):
   - Dual-source pricing (Chainlink + NAV)
   - Circuit breaker on >20% deviation
   - Automatic pause on discrepancy

### Frontend Layer

**Tech stack:**
- Next.js 14 (App Router) with TypeScript
- wagmi v2 + viem (Web3 interactions)
- RainbowKit (wallet connection)
- Material-UI v5 (warm color theme, no blue/purple)
- TanStack Query (server state)
- next-intl (bilingual: EN + CN)

**Key pages** (in `nft-paimon-frontend/src/app/`):
- `swap/` - PSM + DEX swap interface
- `pool/` - Add/remove liquidity
- `lock/` - veNFT locking
- `vote/` - Governance voting
- `launchpad/` - RWA project list + participation
- `treasury/` - RWA deposit + position monitoring
- `presale/` - Bond NFT minting + dice rolling

**Important config files:**
- `src/config/wagmi.ts` - Web3 provider setup (BSC mainnet + testnet)
- `src/config/theme.ts` - MUI Material Design 3 theme (warm colors enforced)

## Testing Standards

### Smart Contract Tests (Foundry)

**Current status:** 337 tests, 95.8% pass rate, ~85% coverage

**6-dimensional coverage required:**
1. **Functional** - Core business logic
2. **Boundary** - Edge cases (zero amounts, max values, empty arrays)
3. **Exception** - Reverts and error handling
4. **Performance** - Gas benchmarks (e.g., RWABondNFT minting <250K gas)
5. **Security** - Reentrancy, access control, oracle manipulation
6. **Compatibility** - USDT (non-standard ERC20), cross-contract interactions

**Critical invariants to maintain:**
- PSM: `USDC balance >= USDP total supply` (1:1 backing)
- DEX: `K = reserve0 × reserve1` (constant product, can only increase)
- Treasury: `Total USDP minted <= Total RWA value × LTV` (collateralization)
- VotingEscrow: `sum(voting_power) <= sum(locked_PAIMON)` (no phantom voting)

### Frontend Tests (Jest)

**Current status:** 111 tests, 88% pass rate, ~85% coverage

**Test structure:**
- Unit tests: `__tests__/components/`, `__tests__/hooks/`
- Mocks: `__mocks__/` (wagmi, next/navigation)
- Setup: `jest.setup.js`, `jest.config.js`

**Key testing patterns:**
```typescript
// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useWriteContract: jest.fn(),
  useReadContract: jest.fn(),
}));

// Test contract interactions
it('should call depositRWA with correct params', async () => {
  const { writeContract } = useWriteContract();
  await deposit(ASSET_ADDRESS, parseUnits('100', 18));
  expect(writeContract).toHaveBeenCalledWith({
    address: TREASURY_ADDRESS,
    abi: TreasuryABI,
    functionName: 'depositRWA',
    args: [ASSET_ADDRESS, parseUnits('100', 18)],
  });
});
```

## Security Best Practices

**All smart contracts must follow:**

1. **Reentrancy protection** - Use `nonReentrant` modifier on all state-changing functions
2. **SafeERC20** - Use OpenZeppelin's SafeERC20 for all token transfers (USDT compatibility)
3. **Check-Effects-Interactions** - Update state before external calls
4. **Precision optimization** - Multiply before divide to minimize precision loss
   ```solidity
   // ❌ Bad (compounds precision loss)
   uint256 step1 = amount * price / 1e18;
   uint256 step2 = step1 * ltv / 10000;

   // ✅ Good (single division at end)
   uint256 result = (amount * price * ltv) / (1e18 * 10000);
   ```
5. **Access control** - Use `onlyOwner` or custom modifiers for privileged functions
6. **Pausability** - Critical contracts (Treasury, PSM, DEX) implement emergency pause

**Recent security fixes (SEC-003, SEC-005):**
- Added reentrancy guards to all deposit/withdraw functions
- Migrated from `transfer()` to `safeTransfer()`
- Integrated Chainlink VRF for unpredictable randomness (dice rolling)
- Fixed 16 divide-before-multiply precision issues

## Deployment Information

**Target network:** BSC (Binance Smart Chain)
- Mainnet (ChainID 56): https://bsc-dataseed.binance.org/
- Testnet (ChainID 97): https://data-seed-prebsc-1-s1.binance.org:8545/

**External dependencies:**
- Chainlink VRF v2 (randomness for dice rolls)
- Chainlink Price Feeds (RWA asset pricing)
- USDC (stablecoin for PSM)
- Multicall3: `0xcA11bde05977b3631167028862bE2a173976CA11`

**Deployment sequence:**
1. USDP token
2. DEXFactory, DEXRouter
3. PSM
4. Treasury + RWAPriceOracle
5. VotingEscrow (vePAIMON NFT)
6. GaugeController
7. RWABondNFT (+ Chainlink VRF setup)
8. ProjectRegistry, IssuanceController
9. RemintController, SettlementRouter

**Multi-sig requirements:**
- Treasury operations: 3-of-5 with 48-hour timelock
- Emergency pause: 4-of-7 (instant)
- Contracts are immutable (no upgrades)

## Key Documentation

All essential docs are in `.ultra/docs/`:
- **prd.md** - Complete product requirements, tokenomics, roadmap
- **tech.md** - Technical architecture, data flows
- **ARCHITECTURE.md** (contracts) - Detailed smart contract architecture
- **DEVELOPMENT.md** (contracts) - Contract development guide
- **decisions/** - Architecture Decision Records (ADRs)
- **audit/** - Security audit preparation materials

When implementing new features:
1. Reference PRD for product requirements
2. Check tech.md for architecture constraints
3. Follow existing patterns in similar contracts
4. Add 6-dimensional test coverage
5. Update relevant documentation

## Code Quality Standards

**Follow SOLID principles:**
- Single Responsibility - Functions <50 lines
- Open/Closed - Extend through interfaces/inheritance
- Liskov Substitution - Subtypes must be substitutable
- Interface Segregation - Minimal, focused interfaces
- Dependency Inversion - Depend on abstractions

**Gas optimization priorities** (for smart contracts):
- Storage packing: Use uint128 + uint64 to fit in one slot
- Batch operations: Support batch voting/transfers
- Event-driven history: Use events instead of storage arrays
- Immutable variables: Declare constants as `immutable`
- Unchecked arithmetic: Use `unchecked { ++i }` in loops

**Frontend requirements:**
- Material Design 3 compliance (elevation, motion, typography)
- Warm color palette (red, orange, yellow, brown - NO blue/purple)
- Bilingual support (EN + CN via next-intl)
- Responsive design (mobile + desktop)
- Core Web Vitals: LCP <2.5s, INP <200ms, CLS <0.1

## Protocol Flywheel (Business Logic)

Understanding the value loop is critical for feature development:

```
RWA Projects listed (Launchpad)
         ↓
Users purchase RWA tokens
         ↓
Deposit RWA → Treasury → Mint USDP at LTV ratio
         ↓
Lock PAIMON → Receive vePAIMON NFT → Governance rights
         ↓
veNFT voting controls:
  • DEX liquidity incentives (gauge weights)
  • Launchpad project approvals
  • Treasury asset whitelist
         ↓
Protocol activity → Revenue (swap fees, issuance fees)
         ↓
Revenue distribution:
  • 40% ve incentive pools
  • 25% Treasury risk buffer
  • 20% PAIMON buyback/burn
  • 10% USDP stabilizer
  • 5% Operations
         ↓
Back to top ↺
```

Any feature that disrupts this flywheel requires careful consideration.

## Development Workflow

This project uses **Ultra Builder Pro** task management (`.ultra/` directory):
- Tasks tracked in `.ultra/tasks/tasks.json`
- Use `/ultra-status` to check progress
- Use `/ultra-dev [task-id]` for TDD workflow
- All tasks require 6-dimensional test coverage before completion

**Git workflow:**
- Feature branches: `feat/task-{id}-{description}`
- Conventional commits: `feat:`, `fix:`, `test:`, `docs:`
- Test locally before pushing
- Multi-sig required for mainnet deployments
