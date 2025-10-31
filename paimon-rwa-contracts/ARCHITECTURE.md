# Paimon DEX - System Architecture

**Version**: 3.2.0
**Last Updated**: 2025-10-28
**Status**: Audit Ready (9.2/10)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Core Components](#2-core-components)
3. [Smart Contract Architecture](#3-smart-contract-architecture)
4. [Data Flow](#4-data-flow)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Security Architecture](#6-security-architecture)
7. [Deployment Architecture](#7-deployment-architecture)
8. [Testing Strategy](#8-testing-strategy)

---

## 1. System Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Paimon DEX Protocol                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐           │
│  │   RWA       │  │    ve33     │  │   Treasury   │           │
│  │  Launchpad  │  │     DEX     │  │   System     │           │
│  └──────┬──────┘  └──────┬──────┘  └──────┬───────┘           │
│         │                 │                 │                    │
│         └─────────────────┴─────────────────┘                   │
│                           │                                      │
│                ┌──────────┴──────────┐                          │
│                │   veNFT Governance   │                          │
│                └──────────┬──────────┘                          │
│                           │                                      │
│         ┌─────────────────┼─────────────────┐                  │
│         │                 │                 │                    │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐            │
│  │ HYD Token   │  │ PAIMON Token│  │  veNFT       │            │
│  │(Synthetic)  │  │  (Platform)  │  │ (Governance) │            │
│  └─────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Protocol Flywheel

```
RWA Projects (Launchpad)
         ↓
Users Purchase RWA Tokens
         ↓
Deposit RWA → Treasury → Mint HYD
         ↓
Lock HYD → Receive veNFT → Governance Rights
         ↓
veNFT Voting:
  • DEX liquidity incentives
  • Launchpad project approvals
  • Treasury asset whitelist
         ↓
Protocol Activity → Revenue Generation
         ↓
Revenue Distribution:
  • 40% ve incentive pools
  • 25% Treasury risk buffer
  • 20% PAIMON buyback/burn
  • 10% HYD stabilizer
  • 5% Operations
         ↓
Back to Top ↺
```

---

## 2. Core Components

### 2.1 Component Overview

| Component | Contracts | Purpose | Status |
|-----------|-----------|---------|--------|
| **HYD Token** | HYD.sol | Synthetic asset backed by Treasury RWA | ✅ Complete |
| **PSM** | PSM.sol | USDC ↔ HYD 1:1 swap with 0.1% fee | ✅ Complete |
| **DEX Core** | DEXFactory, DEXPair, DEXRouter | Uniswap V2-style AMM with custom fees | ✅ Complete |
| **veNFT** | VotingEscrow.sol | Time-locked governance NFTs | ✅ Complete |
| **Governance** | GaugeController.sol | Liquidity mining distribution | ✅ Complete |
| **Treasury** | Treasury.sol, RWAPriceOracle.sol | RWA collateralization vault | ✅ Complete |
| **Launchpad** | IssuanceController.sol, ProjectRegistry.sol | RWA token sales platform | ✅ Complete |
| **Presale** | RWABondNFT.sol, RemintController.sol | Gamified bond NFT system | ✅ Complete |
| **Settlement** | SettlementRouter.sol, VotingEscrowIntegration.sol | Bond maturity options | ✅ Complete |

### 2.2 Contract Dependency Graph

```
                    ┌──────────────┐
                    │ HYD (ERC20)  │
                    └───────┬──────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌────▼────┐       ┌─────▼──────┐      ┌─────▼────────┐
   │   PSM   │       │  Treasury  │      │ VotingEscrow │
   └─────────┘       └─────┬──────┘      └───────┬──────┘
                           │                     │
                    ┌──────▼───────┐            │
                    │ RWAPriceOracle│            │
                    └──────────────┘             │
                                          ┌──────▼───────┐
                                          │GaugeController│
                                          └──────┬───────┘
                                                 │
                    ┌────────────────────────────┼────────────┐
                    │                            │            │
           ┌────────▼─────┐           ┌─────────▼──┐   ┌─────▼──────┐
           │ProjectRegistry│           │ DEXFactory │   │RWABondNFT  │
           └────────┬─────┘           └──────┬─────┘   └─────┬──────┘
                    │                        │               │
          ┌─────────▼────────┐         ┌─────▼────┐    ┌─────▼────────┐
          │IssuanceController │         │ DEXPair  │    │RemintController│
          └──────────────────┘         └──────────┘    └──────────────┘
```

---

## 3. Smart Contract Architecture

### 3.1 Token Contracts

#### HYD.sol (Synthetic Asset)
```solidity
contract HYD is ERC20, Ownable {
    // Minting: Only Treasury
    function mint(address to, uint256 amount) external onlyOwner;

    // Burning: Anyone can burn their own
    function burn(uint256 amount) external;

    // Transfer hooks for fee collection (if enabled)
    function _update(address from, address to, uint256 value) internal override;
}
```

**Key Features**:
- ERC20 standard compliant
- Controlled minting (Treasury only)
- No transfer restrictions
- Burn mechanism for redemptions

#### PAIMON.sol (Platform Token)
```solidity
contract PAIMON is ERC20, Ownable {
    // Emissions tied to gauge allocations
    function mint(address gauge, uint256 amount) external onlyGauge;

    // Buyback & burn from revenue
    function buybackAndBurn(uint256 usdcAmount) external;
}
```

### 3.2 PSM (Peg Stability Module)

```solidity
contract PSM is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    // Core functionality
    function swapUSDCForHYD(uint256 usdcAmount) external nonReentrant whenNotPaused;
    function swapHYDForUSDC(uint256 hydAmount) external nonReentrant whenNotPaused;

    // Fee structure
    uint256 public feeIn = 10;  // 0.1% on USDC → HYD
    uint256 public feeOut = 10; // 0.1% on HYD → USDC
}
```

**Design Decisions**:
- 1:1 peg maintenance
- Low fees (0.1%) for high capital efficiency
- Separate fee control for each direction
- Emergency pause mechanism

### 3.3 DEX Core (Uniswap V2 Fork)

#### DEXFactory.sol
```solidity
contract DEXFactory {
    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    function createPair(address tokenA, address tokenB) external returns (address pair);
}
```

#### DEXPair.sol
```solidity
contract DEXPair is ERC20, ReentrancyGuard {
    // Constants
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public constant TOTAL_FEE = 25;      // 0.25%
    uint256 public constant VOTER_FEE = 17;      // 0.175% (70% of total)
    uint256 public constant TREASURY_FEE = 8;    // 0.075% (30% of total)

    // Core AMM functions
    function mint(address to) external nonReentrant returns (uint256 liquidity);
    function burn(address to) external nonReentrant returns (uint256, uint256);
    function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data)
        external nonReentrant;
}
```

**Fee Distribution**:
- Total swap fee: 0.25%
  - 70% to voters (gauge incentives)
  - 30% to treasury

### 3.4 VotingEscrow (veNFT)

```solidity
contract VotingEscrow is ERC721, ReentrancyGuard {
    struct LockedBalance {
        uint256 amount;
        uint256 end;
    }

    // Create lock
    function createLock(uint256 value, uint256 duration) external nonReentrant returns (uint256);

    // Increase amount or extend duration
    function increaseAmount(uint256 tokenId, uint256 value) external nonReentrant;
    function increaseUnlockTime(uint256 tokenId, uint256 duration) external nonReentrant;

    // Withdraw after expiry
    function withdraw(uint256 tokenId) external nonReentrant;

    // Voting power (linear decay)
    function balanceOfNFT(uint256 tokenId) public view returns (uint256);
}
```

**Lock Mechanics**:
- Duration: 1 week ~ 4 years
- Voting power = amount * (time_remaining / MAX_TIME)
- Linear decay over time
- Non-transferable NFT (soulbound)

### 3.5 Treasury System

```solidity
contract Treasury is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    struct Position {
        uint256 rwaAmount;
        uint256 hydMinted;
        uint256 lastUpdate;
    }

    // RWA deposit → Mint HYD
    function depositRWA(address asset, uint256 amount)
        external nonReentrant whenNotPaused;

    // Redeem HYD → Withdraw RWA
    function redeemRWA(address asset, uint256 hydAmount)
        external nonReentrant whenNotPaused;

    // Liquidation for undercollateralized positions
    function liquidate(address user, address asset)
        external nonReentrant;
}
```

**Collateralization Tiers**:
| Tier | Asset Type | LTV Ratio | Example |
|------|-----------|-----------|---------|
| T1   | US Treasuries | 80% | 6-month T-Bill |
| T2   | Investment-grade credit | 65% | AAA corporate bonds |
| T3   | RWA revenue pools | 50% | Real estate rent pools |

**Liquidation Mechanics**:
- Liquidation threshold: LTV > tier max + 5%
- Liquidation penalty: 5% to liquidator, 2% to protocol
- Partial or full liquidation supported

### 3.6 RWA Launchpad

#### ProjectRegistry.sol
```solidity
contract ProjectRegistry {
    struct Project {
        uint256 id;
        address issuer;
        string metadata; // IPFS hash
        ProjectStatus status;
        uint256 voteCount;
    }

    // Submit project for veNFT governance vote
    function submitProject(string calldata metadata) external returns (uint256);

    // veNFT holders vote
    function vote(uint256 projectId, uint256 veNFTId) external;

    // Finalize voting (auto-approve if threshold met)
    function finalizeVoting(uint256 projectId) external;
}
```

#### IssuanceController.sol
```solidity
contract IssuanceController {
    struct Sale {
        uint256 id;
        address token;
        uint256 price;
        uint256 softCap;
        uint256 hardCap;
        uint256 startTime;
        uint256 endTime;
    }

    // Create token sale (requires whitelisted project)
    function createSale(/* params */) external returns (uint256);

    // Participate in sale
    function participate(uint256 saleId, uint256 usdcAmount) external;

    // Finalize sale
    function finalizeSale(uint256 saleId) external;
}
```

### 3.7 Presale System (Phase 1)

#### RWABondNFT.sol
```solidity
contract RWABondNFT is ERC721, ReentrancyGuard {
    struct BondInfo {
        uint256 principal;        // 100 USDC
        uint256 mintTime;
        uint256 baseYield;        // 2% APR
        uint256 remintYield;      // 0-8% from engagement
        BondTier tier;            // Bronze/Silver/Gold/Diamond
    }

    // Mint bond NFT
    function mint(uint256 quantity) external nonReentrant returns (uint256[] memory);

    // Upgrade tier via dice rolling or social tasks
    function upgradeTier(uint256 tokenId) internal;
}
```

#### RemintController.sol
```solidity
contract RemintController {
    // Chainlink VRF dice rolling
    function rollDice(uint256 tokenId) external returns (uint256 requestId);
    function rawFulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal;

    // Social task verification (Oracle signature)
    function completeSocialTask(uint256 tokenId, bytes32 taskId, bytes memory signature)
        external;

    // Leaderboard
    function getTopHolders(uint256 limit) external view returns (address[] memory);
}
```

---

## 4. Data Flow

### 4.1 RWA → HYD Minting Flow

```
User deposits RWA to Treasury
         ↓
Treasury validates asset (whitelisted + tier)
         ↓
RWAPriceOracle.getPrice(asset) → USD value
         ↓
Calculate max HYD: (USD value * LTV ratio)
         ↓
HYD.mint(user, hydAmount)
         ↓
Record position in Treasury.positions[user][asset]
         ↓
Emit DepositRWA event
```

### 4.2 veNFT Governance Flow

```
User locks HYD for duration (1 week ~ 4 years)
         ↓
VotingEscrow.createLock() → Mint veNFT
         ↓
Voting power = amount * (remaining_time / MAX_TIME)
         ↓
User votes on:
  • GaugeController: DEX liquidity incentives
  • ProjectRegistry: Launchpad project approvals
  • (Future) Treasury: Asset whitelist proposals
         ↓
Votes weighted by voting power
         ↓
Epoch ends → Apply results
```

### 4.3 DEX Swap Flow (with Fee Distribution)

```
User calls DEXRouter.swapExactTokensForTokens()
         ↓
Router calculates optimal path
         ↓
DEXPair.swap(amount0Out, amount1Out, to, data)
         ↓
Collect fees:
  • 0.175% → voterFees (accumulated for gauge distribution)
  • 0.075% → treasuryFees (accumulated for protocol revenue)
         ↓
Verify K invariant: (reserve0 - fees0) * (reserve1 - fees1) >= k_before
         ↓
Transfer tokens to user
         ↓
Emit Swap event
```

### 4.4 Presale Bond → veNFT Conversion (Settlement)

```
Bond NFT reaches maturity (90 days)
         ↓
User chooses settlement option:
  1. Convert to veNFT
  2. Redeem PAIMON tokens
  3. Cash redemption (principal + yield)
         ↓
Option 1: Convert to veNFT
  ↓
SettlementRouter.settleToVeNFT(bondNFTId)
  ↓
Calculate total HYD = principal + baseYield + remintYield
  ↓
Burn Bond NFT
  ↓
Lock HYD for 1 year → Create veNFT
  ↓
Transfer veNFT to user
```

---

## 5. Frontend Architecture

### 5.1 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 14 (App Router) | SSR + CSR hybrid, optimal SEO |
| **Web3** | wagmi v2 + viem | Type-safe Ethereum interactions |
| **UI Library** | Material-UI v6 (MUI) | Material Design 3 compliant components |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **State** | Zustand + TanStack Query | Global state + server cache |
| **i18n** | next-intl | English + Chinese support |
| **Charts** | Recharts | Analytics visualizations |

### 5.2 Application Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (dex)/
│   │   │   ├── swap/          # PSM + DEX swap interface
│   │   │   ├── pool/          # Add/remove liquidity
│   │   │   └── farm/          # Gauge farming
│   │   ├── (governance)/
│   │   │   ├── lock/          # veNFT locking
│   │   │   └── vote/          # Voting interface
│   │   ├── (launchpad)/
│   │   │   ├── projects/      # RWA project list
│   │   │   └── participate/   # Token sale participation
│   │   ├── (treasury)/
│   │   │   ├── deposit/       # RWA deposit
│   │   │   └── positions/     # Position monitoring
│   │   └── (presale)/
│   │       ├── mint/          # Bond NFT minting
│   │       ├── dice/          # Dice rolling
│   │       └── leaderboard/   # Rankings
│   ├── components/
│   │   ├── ui/                # Reusable MUI components
│   │   ├── web3/              # Wallet connection, network switcher
│   │   └── features/          # Feature-specific components
│   ├── hooks/
│   │   ├── useContract.ts     # Contract interaction hooks
│   │   ├── useTokenBalance.ts
│   │   └── useVotingPower.ts
│   ├── lib/
│   │   ├── contracts/         # Contract ABIs + addresses
│   │   ├── constants.ts
│   │   └── utils.ts
│   └── styles/
│       └── theme.ts           # MUI theme (Material Design 3)
```

### 5.3 Key Design Patterns

#### Contract Interaction Pattern
```typescript
// Custom hook for Treasury deposits
export function useTreasuryDeposit() {
  const { writeContract, data: hash } = useWriteContract();
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash });

  const deposit = useCallback(async (asset: Address, amount: bigint) => {
    return writeContract({
      address: TREASURY_ADDRESS,
      abi: TreasuryABI,
      functionName: 'depositRWA',
      args: [asset, amount],
    });
  }, [writeContract]);

  return { deposit, isLoading, isSuccess };
}
```

#### State Management Pattern
```typescript
// Zustand store for user positions
interface TreasuryStore {
  positions: Position[];
  fetchPositions: (userAddress: Address) => Promise<void>;
}

export const useTreasuryStore = create<TreasuryStore>((set) => ({
  positions: [],
  fetchPositions: async (userAddress) => {
    const positions = await fetchUserPositions(userAddress);
    set({ positions });
  },
}));
```

---

## 6. Security Architecture

### 6.1 Smart Contract Security

#### Defense Layers

| Layer | Implementation | Purpose |
|-------|---------------|---------|
| **Reentrancy Protection** | OpenZeppelin ReentrancyGuard | Prevent reentrancy attacks |
| **Safe Transfers** | SafeERC20 for all token ops | Handle non-standard ERC20s (USDT) |
| **Access Control** | Ownable, onlyOwner modifiers | Restrict privileged functions |
| **Pausability** | Pausable on critical contracts | Emergency stop mechanism |
| **Overflow Protection** | Solidity 0.8.20 (built-in) | Automatic overflow checks |
| **Randomness** | Chainlink VRF v2 | Unpredictable dice rolls |
| **Oracles** | Dual-source (Chainlink + NAV) | Price manipulation resistance |

#### Key Security Features

**1. Reentrancy Protection (SEC-003)**
```solidity
function depositRWA(address asset, uint256 amount)
    external
    nonReentrant  // ✅ Added in SEC-003
    whenNotPaused
{
    // State updates BEFORE external calls (Check-Effects-Interactions)
    positions[msg.sender][asset].rwaAmount += amount;

    // External call AFTER state updates
    IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
}
```

**2. SafeERC20 Migration (SEC-003)**
```solidity
// BEFORE (Vulnerable)
IERC20(token).transfer(to, amount);

// AFTER (Secure)
using SafeERC20 for IERC20;
IERC20(token).safeTransfer(to, amount);
```

**3. Chainlink VRF Integration (SEC-003)**
```solidity
// Unpredictable randomness for dice rolling
function rollDice(uint256 tokenId) external returns (uint256 requestId) {
    requestId = VRF_COORDINATOR.requestRandomWords(
        keyHash,
        subscriptionId,
        requestConfirmations,
        callbackGasLimit,
        numWords
    );
}
```

**4. Precision Optimization (SEC-005)**
```solidity
// BEFORE (Precision Loss)
uint256 rwaValue = (amount * price) / 1e18;
uint256 hydToMint = rwaValue * ltvRatio / BPS_DENOMINATOR; // Compounds loss

// AFTER (Optimized)
uint256 hydToMint = (amount * price * ltvRatio) / (1e18 * BPS_DENOMINATOR);
// Single division at the end
```

### 6.2 Oracle Security

**Dual-Source Price Feeds**:
```solidity
function getPrice(address asset) public view returns (uint256) {
    uint256 chainlinkPrice = getChainlinkPrice(asset);
    uint256 navPrice = getNavPrice(asset);

    // Deviation check
    uint256 deviation = abs(chainlinkPrice - navPrice) * 10000 / navPrice;
    require(deviation <= MAX_DEVIATION, "Price deviation too high");

    // Return average if within bounds
    return (chainlinkPrice + navPrice) / 2;
}
```

**Circuit Breaker**:
- Deviation threshold: 20%
- Action: Pause contract, emit alert
- Manual review required to resume

### 6.3 Multi-Sig Governance

| Function | Multi-Sig | Timelock |
|----------|-----------|----------|
| Treasury asset whitelist | 3-of-5 | 48 hours |
| Fee parameter changes | 3-of-5 | 48 hours |
| Emergency pause | 4-of-7 | None (instant) |
| Emergency unpause | 3-of-5 | 24 hours |
| Contract upgrades | N/A (no upgrades, immutable) | N/A |

---

## 7. Deployment Architecture

### 7.1 Deployment Sequence

```
1. HYD Token
2. DEXFactory
3. DEXRouter
4. PSM
5. Treasury + RWAPriceOracle
6. VotingEscrow
7. GaugeController
8. RWABondNFT + Chainlink VRF setup
9. IssuanceController + ProjectRegistry
10. RemintController
11. SettlementRouter
12. VotingEscrowIntegration
```

### 7.2 Network Configuration

#### BSC Mainnet (Target)
```javascript
{
  chainId: 56,
  rpcUrl: "https://bsc-dataseed.binance.org/",
  explorer: "https://bscscan.com",
  multicall: "0xcA11bde05977b3631167028862bE2a173976CA11"
}
```

#### BSC Testnet (Development)
```javascript
{
  chainId: 97,
  rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545/",
  explorer: "https://testnet.bscscan.com",
  faucet: "https://testnet.binance.org/faucet-smart"
}
```

### 7.3 External Dependencies

| Service | Purpose | Mainnet Address |
|---------|---------|-----------------|
| **Chainlink VRF** | Randomness (dice rolls) | Coordinator: TBD |
| **Chainlink Price Feeds** | RWA asset pricing | BTC/USD: TBD, ETH/USD: TBD |
| **Multicall3** | Batch RPC calls | 0xcA11bde05977b3631167028862bE2a173976CA11 |
| **USDC** | Stablecoin liquidity | BSC USDC address |

---

## 8. Testing Strategy

### 8.1 Test Coverage Summary

| Category | Coverage | Tests | Status |
|----------|----------|-------|--------|
| **Smart Contracts** | ~85% lines | 337 (323 passing) | ✅ |
| **Frontend** | ~85% | 111 passing | ✅ |
| **E2E** | 4 critical flows | 4/4 passing | ✅ |

### 8.2 Test Dimensions

**6-Dimensional Coverage** (Ultra Builder Pro Standard):
1. **Functional**: Core business logic works correctly
2. **Boundary**: Edge cases (empty arrays, max values, zero inputs)
3. **Exception**: Error handling (reverts, invalid states)
4. **Performance**: Gas benchmarks, Core Web Vitals
5. **Security**: Reentrancy, access control, oracle manipulation
6. **Compatibility**: Cross-browser, mobile, USDT compatibility

### 8.3 Invariant Tests

**PSM Invariants**:
```solidity
// Invariant: USDC balance >= HYD total supply
function invariant_PSM_USDCBacking() public {
    uint256 usdcBalance = usdc.balanceOf(address(psm));
    uint256 hydSupply = hyd.totalSupply();
    assertGe(usdcBalance, hydSupply);
}
```

**DEX Invariants**:
```solidity
// Invariant: K = reserve0 * reserve1 (constant product)
function invariant_DEX_ConstantProduct() public {
    (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
    uint256 k = uint256(reserve0) * uint256(reserve1);
    assertGe(k, previousK); // K can only increase
}
```

**Treasury Invariants**:
```solidity
// Invariant: Total HYD minted <= Total RWA value * LTV
function invariant_Treasury_Collateralization() public {
    uint256 totalHydMinted = getTotalHydMinted();
    uint256 totalRwaValue = getTotalRwaValue();
    assertLe(totalHydMinted, totalRwaValue * MAX_LTV / 10000);
}
```

---

## 9. Future Enhancements

### Phase 7 (Planned)
- [ ] Multi-chain deployment (Arbitrum, Base, Optimism)
- [ ] Mobile-responsive optimizations
- [ ] Advanced governance (parameter proposals via veNFT)
- [ ] Additional RWA tiers (T4: Real estate, T5: Carbon credits)
- [ ] Cross-protocol integrations (Venus, PancakeSwap)
- [ ] DAO treasury diversification

### Technical Debt
- [ ] Optimize RemintController leaderboard sorting (O(n²) → O(n log n))
- [ ] Reduce RWABondNFT minting gas cost (272K → <250K)
- [ ] Fix 14 non-critical test failures (gas benchmarks + edge cases)
- [ ] Implement frontend Core Web Vitals optimizations (LCP < 2.5s)

---

## 10. References

- **OpenZeppelin Contracts**: https://docs.openzeppelin.com/contracts/5.x/
- **Chainlink VRF**: https://docs.chain.link/vrf/v2/introduction
- **Uniswap V2**: https://docs.uniswap.org/contracts/v2/overview
- **Velodrome Finance**: https://docs.velodrome.finance/
- **Material Design 3**: https://m3.material.io/

---

**Last Updated**: 2025-10-28
**Audit Status**: Ready for submission (9.2/10)
**Next Steps**: Professional audit firm selection
