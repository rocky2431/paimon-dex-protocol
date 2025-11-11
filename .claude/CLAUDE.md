# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**Paimon.dex** is a full-stack RWA (Real World Assets) × veDEX × CDP protocol deployed on Binance Smart Chain (BSC). The system combines:
- **Stablecoin (USDP)**: Synthetic stablecoin backed by RWA collateral with PSM 1:1 anchoring to USDC
- **veNFT Governance**: Transferable vePAIMON NFTs with linear decay voting power
- **Three-Phase Emission**: 10B PAIMON over 6.77 years with exponential decay
- **Four-Channel Distribution**: Debt mining, LP farming, Stability Pool, Ecosystem

This is a **monorepo** with 4 main components:

1. **paimon-rwa-contracts/** - Smart contracts (Solidity 0.8.24 + Foundry)
2. **nft-paimon-frontend/** - Web frontend (Next.js 14 + wagmi v2)
3. **distribution-service/** - Merkle tree generation service (Node.js + TypeScript)
4. **pythagora-core/** - Strategy simulation (Python)

---

## Common Development Commands

### Smart Contracts (paimon-rwa-contracts/)

```bash
cd paimon-rwa-contracts

# Build & Test
forge build                                      # Compile all contracts
forge test                                       # Run all tests (990 tests)
forge test --match-contract <ContractName>       # Test specific contract
forge test --match-test test_SpecificTest        # Run specific test
forge test -vvv                                  # Verbose output (shows traces)
forge coverage                                   # Generate coverage report
forge coverage --report summary                  # Coverage summary only

# Gas Optimization
forge test --gas-report                          # Gas usage report

# Deploy
forge script script/DeployComplete.s.sol \
  --rpc-url $BSC_TESTNET_RPC_URL \
  --broadcast \
  --verify                                       # Deploy to testnet with verification
```

**Test Organization**:
- `test/unit/` - Individual contract tests (e.g., `Treasury.t.sol`, `PSMParameterized.t.sol`)
- `test/integration/` - Multi-contract interaction tests
- `test/invariant/` - Invariant/fuzz tests for core invariants

**Test Status**: 980/990 passing (98.99%), ~85% line coverage

### Frontend (nft-paimon-frontend/)

```bash
cd nft-paimon-frontend

# Development
npm run dev                     # Start dev server on port 4000
npm run build                   # Production build
npm run start                   # Start production server
npm run type-check              # TypeScript type checking

# Testing
npm test                        # Jest unit tests (111 tests)
npm run test:watch              # Jest watch mode
npm run test:coverage           # Coverage report
npm run test:e2e                # Playwright E2E tests (all browsers)
npm run test:e2e:chromium       # E2E tests in Chromium only
npm run test:e2e:debug          # Debug E2E tests with Playwright Inspector

# Contract Integration
npm run sync-addresses          # Sync contract addresses from deployments/
npm run verify-addresses        # Verify contract addresses match ABI
```

**Frontend runs on port 4000** (not 3000) to avoid conflicts.

### Distribution Service (distribution-service/)

```bash
cd distribution-service

# Workflow: Snapshot ’ Merkle ’ Validate ’ Distribute
npm run snapshot <epoch> <users-file>   # Generate on-chain snapshot
npm run merkle                          # Generate Merkle tree from snapshot
npm run validate ./output/merkle.json   # Validate distribution data
npm run distribute ./output/merkle.json # Submit Merkle root on-chain

# Testing
npm test                                # Run all tests
npm run test:coverage                   # Coverage report
```

---

## Architecture Highlights

### 1. Unified Infrastructure (v3.3.0)

All governance-enabled contracts inherit from `Governable` base class (`src/common/Governable.sol`):

```solidity
abstract contract Governable is AccessControlEnumerable {
    // Multi-governor support (Timelock, Multi-sig, EOA)
    // At least 1 governor required (prevents lockout)
    // Transfer hook: _afterGovernanceTransfer() for role migration
    // Ownable compatibility: owner(), transferOwnership()
}
```

**Centralized Libraries**:
- `ProtocolConstants.sol` - `BASIS_POINTS`, `WEEK`, `EPOCH_DURATION`
- `ProtocolRoles.sol` - `GOVERNANCE_ADMIN_ROLE`, `EMISSION_POLICY_ROLE`, etc.
- `EpochUtils.sol` - Standardized time calculations

**Contracts using Governable**:
1. `EmissionManager` - Three-phase emission scheduler
2. `EmissionRouter` - Four-channel distribution pipeline
3. `PSMParameterized` - USDC ” USDP 1:1 swap
4. `Treasury` - RWA collateral vault
5. `GaugeController` - Liquidity mining weights
6. `DEXFactory` - AMM factory

### 2. Three-Phase Emission Schedule

**EmissionManager.sol** implements deterministic emission over 352 weeks (6.77 years):

- **Phase A** (Week 1-12): Fixed 37.5M PAIMON/week
- **Phase B** (Week 13-248): Exponential decay 0.985^t (37.5M ’ 4.327M)
  - Uses **pre-computed lookup table** (236 elements) for O(1) gas optimization
  - Formula: `E_B(t) = 37,500,000 * 0.985^t`
- **Phase C** (Week 249-352): Fixed 4.327M PAIMON/week

**Channel Allocation** (phase-dynamic):
| Phase | Debt | LP Total | Stability Pool | Eco |
|-------|------|----------|----------------|-----|
| A (1-12) | 30% | 60% | - | 10% |
| B (13-248) | 50% | 37.5% | (part of LP) | 12.5% |
| C (249-352) | 55% | 35% | (part of LP) | 10% |

**LP Split** (governance-adjustable): Default 60% Pairs / 40% Stability Pool

### 3. Four-Channel Distribution

**EmissionRouter.sol** distributes weekly budgets to:
1. **Debt Mining** - TWAD (Time-Weighted Average Debt) based rewards
2. **LP Pairs** - Gauge-voted liquidity incentives
3. **Stability Pool** - Liquidation buffer rewards
4. **Ecosystem** - Strategic allocations

**One-shot distribution**: Each week can only be routed once (prevents double-spending).

### 4. Multi-Collateral Treasury

**Treasury.sol** and **USDPVault.sol** support multi-collateral positions:

```solidity
// Weighted health factor calculation
for each collateral i in user position:
    value_i = amount_i × price_i × ltv_i

totalCollateralValue = £ value_i
healthFactor = totalCollateralValue / totalDebt

// Liquidation trigger
if (healthFactor < 1.15) ’ position undercollateralized
```

**Collateralization Tiers**:
| Tier | Asset Type | LTV Ratio | Example |
|------|-----------|-----------|---------|
| T1 | US Treasuries | 80% | 6-month T-Bill |
| T2 | Investment-grade credit | 65% | AAA corporate bonds |
| T3 | RWA revenue pools | 50% | Real estate rent pools |

### 5. PSM Parameterized Decimals

**PSMParameterized.sol** supports both 6-decimal and 18-decimal USDC:

- **USDP**: Always 18 decimals (standard ERC20)
- **USDC Mainnet (BSC)**: 18 decimals (0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d)
- **USDC Testnet (BSC)**: 6 decimals (0xaa3F4B0cEF6F8f4C584cc6fD3A5e79E68dAa13b2)
- **Auto-detection**: Queries `IERC20Metadata.decimals()` on construction
- **Scale factor**: Cached as `immutable` for gas optimization

### 6. Vesting & Boost Mechanics

**esPaimon.sol** (Vesting Token):
- 365-day linear vesting from allocation time
- Non-transferable (soulbound)
- Early exit option with 50% penalty
- All community emissions default to esPaimon

**BoostStaking.sol** (Multiplier System):
- Stake PAIMON to earn boost multiplier (1.0x - 1.5x)
- Applied to ALL reward types (debt mining, LP, ecosystem)
- Formula: `multiplier = 10000 + (stakedAmount × lockDuration) / (maxStake × maxLockDuration) × 5000`

**RewardDistributor.sol** (Merkle Claims):
- Off-chain aggregator computes weekly rewards
- On-chain Merkle proof verification
- Auto-applies boost multiplier during claim
- Default vesting via esPaimon

### 7. Security Features

All contracts follow these patterns:
- **Reentrancy Protection**: `ReentrancyGuard` on all value-transfer functions
- **Safe Transfers**: `SafeERC20` for all token operations
- **Check-Effects-Interactions**: State updates before external calls
- **Precision Optimization**: Single division at the end (SEC-005 fix)
  ```solidity
  // BEFORE (Precision Loss)
  uint256 rwaValue = (amount * price) / 1e18;
  uint256 hydToMint = rwaValue * ltvRatio / BPS_DENOMINATOR;

  // AFTER (Optimized)
  uint256 hydToMint = (amount * price * ltvRatio) / (1e18 * BPS_DENOMINATOR);
  ```
- **Dual-Source Oracles**: Chainlink + NAV with 20% deviation circuit breaker

---

## Development Best Practices

### TDD Workflow (Mandatory)

1. **RED**: Write failing test first
2. **GREEN**: Write minimal code to pass
3. **REFACTOR**: Improve quality (SOLID/DRY/KISS/YAGNI)

### Code Quality Standards

- **SOLID Principles**: Follow strictly (enforced by Ultra Builder Pro)
- **Functions < 50 lines**: Split immediately when exceeded
- **Test Coverage e 80%**: Overall, 100% for critical paths
- **NatSpec Documentation**: All public functions must have clear comments

### Commit Format (Conventional Commits)

```
<type>: <description>

[optional body]

> Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `build`, `ci`

### Branch Naming

- Features: `feat/task-{id}-{description}`
- Bug fixes: `fix/bug-{id}-{description}`
- Refactoring: `refactor/{description}`

---

## Important Implementation Details

### Precision Math

**Always multiply before dividing** to minimize precision loss:

```solidity
// L Wrong: Compounds precision loss
uint256 step1 = (a * b) / c;
uint256 step2 = step1 * d / e;

//  Correct: Single division at end
uint256 result = (a * b * d) / (c * e);
```

### Gas Optimization

**Phase B Emission Lookup Table**:
- Pre-computed 236-week exponential decay stored as `uint256[236]`
- Avoids expensive on-the-fly calculation (saves ~100K gas per call)
- Initialized during deployment via `DeployComplete.s.sol`

### Decimal Conversions

**PSM handles different USDC decimals transparently**:

```solidity
uint8 public immutable usdcDecimals;  // Queried on construction
uint256 private immutable scale;      // e.g., 1e12 for 6’18, 1 for 18’18

// USDC ’ USDP conversion
uint256 usdpAmount = usdcAmount * scale;

// USDP ’ USDC conversion
uint256 usdcAmount = usdpAmount / scale;
```

### Epoch Calculations

Use `EpochUtils` library for consistency:

```solidity
import {EpochUtils} from "src/common/EpochUtils.sol";

uint256 currentEpoch = EpochUtils.currentEpoch(startTime, EPOCH_DURATION);
uint256 specificEpoch = EpochUtils.computeEpoch(startTime, EPOCH_DURATION, timestamp);
```

---

## Testing Strategy

### Six-Dimensional Coverage

All tests follow this framework:
1. **Functional** - Core logic works correctly
2. **Boundary** - Edge cases (zero, max, empty arrays)
3. **Exception** - Error handling (reverts, invalid states)
4. **Performance** - Gas benchmarks
5. **Security** - Reentrancy, access control, oracle manipulation
6. **Compatibility** - Cross-platform (USDT, different USDC decimals)

### Invariant Tests

Critical invariants to maintain:

**PSM**:
```solidity
// USDC balance >= USDP total supply
assertGe(usdc.balanceOf(address(psm)), usdp.totalSupply());
```

**DEX**:
```solidity
// K = reserve0 * reserve1 (constant product)
assertGe(k_after, k_before);  // K can only increase (due to fees)
```

**Treasury**:
```solidity
// Total USDP minted <= Total RWA value * LTV
assertLe(totalUsdpMinted, totalRwaValue * MAX_LTV / 10000);
```

### Running Single Test

```bash
# Run specific test function
forge test --match-test test_DepositRWA -vvv

# Run specific contract tests
forge test --match-contract TreasuryTest -vvv

# Run with gas report for specific contract
forge test --match-contract EmissionRouter --gas-report
```

---

## Deployment Information

**BSC Testnet** (ChainID 97):
- RPC: https://data-seed-prebsc-1-s1.binance.org:8545/
- Explorer: https://testnet.bscscan.com
- **34 contracts deployed** (see `deployments/testnet/addresses.json`)

**Deployment Script**: `script/DeployComplete.s.sol`

**Deployment Order**:
1. Tokens (USDP, PAIMON, esPaimon)
2. DEX (DEXFactory, DEXRouter)
3. Stablecoin (PSM, USDPVault, USDPStabilityPool, SavingRate)
4. Treasury (Treasury, RWAPriceOracle)
5. Governance (VotingEscrowPaimon, GaugeController)
6. Emission (EmissionManager, EmissionRouter)
7. Incentives (BoostStaking, NitroPool, RewardDistributor, BribeMarketplace)
8. Launchpad (ProjectRegistry, IssuanceController)

**  Note**: Presale modules (RWABondNFT, RemintController, SettlementRouter) are Phase 2 limited-time features, not deployed on testnet.

---

## Key Files & Directories

### Smart Contracts
- `src/common/` - Unified infrastructure (Governable, ProtocolConstants, ProtocolRoles, EpochUtils)
- `src/core/` - Core tokens (USDP, PAIMON, esPaimon, PSM, Vault, StabilityPool, SavingRate)
- `src/governance/` - Governance (EmissionManager, EmissionRouter, GaugeController, RewardDistributor)
- `src/incentives/` - Incentives (BoostStaking, NitroPool)
- `src/dex/` - DEX (DEXFactory, DEXPair, DEXRouter)
- `src/treasury/` - Treasury (Treasury, RWAPriceOracle)
- `src/launchpad/` - Launchpad (ProjectRegistry, IssuanceController)
- `src/presale/` - ø Presale (Phase 2 - limited-time activity)

### Frontend
- `src/app/` - Next.js 14 App Router pages (29 pages)
- `src/components/` - React components (Material-UI v5)
- `src/hooks/` - Web3 hooks (wagmi v2)
- `src/config/` - Contract addresses, ABIs, network config

### Documentation
- `ARCHITECTURE.md` - Detailed system architecture
- `DEVELOPMENT.md` - Development guide
- `TESTNET_DEPLOYMENT_SUMMARY.md` - Testnet deployment report
- `deployments/testnet/addresses.json` - Contract addresses

---

## Common Pitfalls & Solutions

### 1. Decimal Mismatch in PSM

**Problem**: Different USDC decimals across networks (6 on testnet, 18 on mainnet)

**Solution**: PSM auto-detects decimals and applies scale factor. Always use `PSM.swapUSDCForUSDP()` instead of direct USDP minting.

### 2. Emission Week Off-By-One

**Problem**: Emission calculations can be off by one week if not using standardized epoch utils

**Solution**: Always use `EpochUtils.currentEpoch()` for consistency across all contracts.

### 3. Precision Loss in Multi-Step Calculations

**Problem**: Rounding errors accumulate when dividing multiple times

**Solution**: Combine numerators, then do single division at the end (see SEC-005 fixes).

### 4. Test Failures on Gas Benchmarks

**Current Status**: 10/990 tests fail on gas benchmarks (non-critical)

**Workaround**: Run tests with `--no-match-test "testGas"` to exclude gas benchmark tests.

---

## External Resources

- **OpenZeppelin Contracts**: https://docs.openzeppelin.com/contracts/5.x/
- **Foundry Book**: https://book.getfoundry.sh/
- **wagmi Documentation**: https://wagmi.sh/
- **Material-UI**: https://mui.com/material-ui/getting-started/
- **Next.js 14**: https://nextjs.org/docs
- **BSC Testnet Faucet**: https://testnet.bnbchain.org/faucet-smart

---

**Last Updated**: 2025-11-07
**Project Status**: Testnet deployed (34 contracts), 98.99% test passing rate, audit-ready
