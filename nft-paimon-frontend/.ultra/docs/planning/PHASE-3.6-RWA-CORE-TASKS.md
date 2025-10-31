# Phase 3.6: RWA Core Features - Task Planning

**Duration**: 3-4 weeks
**Priority**: P0 (Critical for mainnet launch)
**Dependencies**: Phase 3.5 (PRESALE-001 to PRESALE-016)

---

## Overview

Phase 3.6 completes the PRD core value proposition: "RWA 发行、流动性与治理一体化协议"

**Two parallel tracks**:
- **Track A: RWA Launchpad** (最重要！核心业务功能)
- **Track B: Treasury RWA Core** (HYD 背书机制)

---

## Track A: RWA Launchpad (Priority P0)

### RWA-001: ProjectRegistry Contract
**Title**: RWA Project Registry Smart Contract
**Priority**: P0
**Complexity**: 5/10
**Estimated Days**: 2
**Dependencies**: None (can start immediately)

**Description**:
Implement the core project registry contract for RWA asset issuance platform.

**Technical Requirements**:
```solidity
contract ProjectRegistry {
    struct Project {
        address issuer;                // Project issuer address
        address rwaToken;              // RWA token address (ERC-20)
        uint256 targetRaise;           // Target raise amount (USDC)
        uint256 totalRaised;           // Current raised amount
        uint256 startTime;             // Sale start time
        uint256 endTime;               // Sale end time
        string complianceDocURI;       // 🔑 Compliance doc IPFS/HTTP link
        string auditReportURI;         // Asset audit report link
        string disclosureURI;          // Risk disclosure document link
        bool veNFTApproved;            // veNFT governance approval
        ProjectStatus status;          // Pending/Active/Completed/Cancelled
    }

    enum ProjectStatus { Pending, Active, Completed, Cancelled }

    // Submit new RWA project (issuer only)
    function submitProject(...) external returns (uint256 projectId);

    // veNFT governance vote on project
    function voteOnProject(uint256 projectId, uint256 veNFTId, bool approve) external;

    // Execute vote result (approve/reject project)
    function executeVote(uint256 projectId) external;
}
```

**Acceptance Criteria**:
- [ ] Project submission with compliance docs support
- [ ] veNFT governance voting mechanism
- [ ] Vote execution (threshold: >50% voting power)
- [ ] Event emission for all state changes
- [ ] Access control (only approved issuers can submit)
- [ ] Unit tests: 100% coverage
- [ ] Gas optimization: <200K gas per submission

---

### RWA-002: IssuanceController Contract
**Title**: RWA Token Issuance Controller
**Priority**: P0
**Complexity**: 6/10
**Estimated Days**: 3
**Dependencies**: RWA-001

**Description**:
Implement the issuance logic for RWA token sales.

**Technical Requirements**:
```solidity
contract IssuanceController {
    // User participates in RWA sale
    function participate(uint256 projectId, uint256 usdcAmount)
        external returns (uint256 rwaTokenAmount);

    // Claim RWA tokens after sale ends
    function claimTokens(uint256 projectId) external;

    // Refund if sale fails to meet minimum raise
    function refund(uint256 projectId) external;

    // Fee structure: 1.0% issuance fee
    uint256 public constant ISSUANCE_FEE = 100; // 1% in bps

    // Fee split: 70% Treasury, 30% ve pool
    function distributeFees(uint256 projectId) external;
}
```

**Acceptance Criteria**:
- [ ] USDC payment handling
- [ ] RWA token distribution logic
- [ ] 1.0% issuance fee collection (70% Treasury, 30% ve pool)
- [ ] Refund mechanism if sale fails
- [ ] Minimum/maximum raise validation
- [ ] Whitelist support (optional for specific projects)
- [ ] Unit tests: 100% coverage
- [ ] Integration tests with ProjectRegistry

---

### RWA-003: Launchpad Frontend - Project List
**Title**: RWA Launchpad Project List Page
**Priority**: P0
**Complexity**: 4/10
**Estimated Days**: 2
**Dependencies**: RWA-001, RWA-002

**Description**:
Build the main Launchpad page displaying all RWA projects.

**Technical Requirements**:
- Route: `/launchpad`
- Components:
  - `ProjectList.tsx` - Grid/list view
  - `ProjectCard.tsx` - Individual project card
  - `ProjectFilters.tsx` - Filter by status/tier/raise amount

**Features**:
- [ ] Project list with real-time data from blockchain
- [ ] Project status badges (Pending/Active/Completed)
- [ ] Progress bar (raised / target)
- [ ] Countdown timer for active sales
- [ ] Filter by project status
- [ ] Sort by raise amount, end date, APY
- [ ] Responsive design (mobile + desktop)
- [ ] Loading states and error handling

**Acceptance Criteria**:
- [ ] Load time <2.5s (LCP)
- [ ] Material Design 3 compliance
- [ ] Warm color palette
- [ ] Bilingual support (EN + ZH)
- [ ] Accessibility (ARIA labels)

---

### RWA-004: Launchpad Frontend - Project Details
**Title**: RWA Project Details & Participation Page
**Priority**: P0
**Complexity**: 6/10
**Estimated Days**: 3
**Dependencies**: RWA-003

**Description**:
Build the detailed project page with investment functionality.

**Technical Requirements**:
- Route: `/launchpad/[projectId]`
- Components:
  - `ProjectDetails.tsx` - Main layout
  - `ComplianceDocViewer.tsx` - 🔑 Compliance docs display
  - `ParticipateForm.tsx` - Investment input
  - `ProjectMetrics.tsx` - Key metrics display

**Features**:
- [ ] **Compliance Documents Section** (最重要！):
  - Display IPFS/HTTP links to compliance docs
  - PDF preview (if possible)
  - Download buttons
  - Multi-document support (Offering Memo, Audit Report, Risk Disclosure)
- [ ] Project overview (name, description, tier, APY)
- [ ] Investment form (USDC amount input)
- [ ] Transaction preview (fees, final RWA token amount)
- [ ] Wallet connection check
- [ ] veNFT governance voting UI (approve/reject)
- [ ] Real-time updates (raised amount, time remaining)

**Acceptance Criteria**:
- [ ] Compliance docs clearly visible (above-the-fold)
- [ ] One-click PDF download
- [ ] Transaction simulation before signing
- [ ] Gas estimation
- [ ] Error handling (insufficient balance, sale ended, etc.)
- [ ] Success confirmation with transaction link

---

### RWA-005: veNFT Governance Integration
**Title**: veNFT Voting for Launchpad Projects
**Priority**: P0
**Complexity**: 5/10
**Estimated Days**: 2
**Dependencies**: RWA-001, RWA-004

**Description**:
Integrate veNFT governance voting for project approval.

**Technical Requirements**:
```solidity
// Already exists in VotingEscrow, extend for Launchpad
interface IGovernance {
    function votingPower(uint256 veNFTId) external view returns (uint256);
}

// ProjectRegistry voting logic
function voteOnProject(uint256 projectId, uint256 veNFTId, bool approve) external {
    require(votingEscrow.ownerOf(veNFTId) == msg.sender, "Not veNFT owner");
    uint256 power = votingEscrow.votingPower(veNFTId);
    // Record vote weighted by voting power
}
```

**Frontend Features**:
- [ ] Voting page route: `/launchpad/[projectId]/vote`
- [ ] Display user's veNFT list (if holding multiple)
- [ ] Voting power indicator
- [ ] Vote history (approved/rejected projects)
- [ ] Current vote tally (approve vs reject %)
- [ ] Vote execution button (when threshold met)

**Acceptance Criteria**:
- [ ] Only veNFT holders can vote
- [ ] One vote per veNFT per project
- [ ] Vote weighted by voting power
- [ ] >50% voting power threshold to approve
- [ ] Vote execution by anyone (after threshold met)
- [ ] Event emission for vote tracking

---

### RWA-006: Launchpad Testing & Integration
**Title**: Comprehensive Testing for Launchpad System
**Priority**: P0
**Complexity**: 5/10
**Estimated Days**: 2
**Dependencies**: RWA-001 to RWA-005

**Description**:
End-to-end testing of Launchpad functionality.

**Test Coverage**:
1. **Smart Contract Tests**:
   - [ ] Project submission (success/failure cases)
   - [ ] veNFT voting (threshold, execution)
   - [ ] Issuance (participate, claim, refund)
   - [ ] Fee distribution (70/30 split)
   - [ ] Access control (unauthorized actions)
   - [ ] Edge cases (sale ends, minimum not met)

2. **Frontend Tests**:
   - [ ] E2E: Submit project → Vote → Participate → Claim
   - [ ] Wallet connection flow
   - [ ] Transaction signing (approve, reject, participate)
   - [ ] Error states (network issues, insufficient funds)
   - [ ] Loading states

3. **Integration Tests**:
   - [ ] Launchpad ↔ Treasury (fee distribution)
   - [ ] Launchpad ↔ VotingEscrow (governance voting)
   - [ ] Launchpad ↔ DEX (RWA token trading post-issuance)

**Acceptance Criteria**:
- [ ] Unit test coverage ≥80%
- [ ] Integration test coverage ≥70%
- [ ] E2E happy path test passes
- [ ] Gas benchmarks documented
- [ ] Security checklist completed

---

## Track B: Treasury RWA Core (Priority P1)

### RWA-007: RWAPriceOracle Contract
**Title**: RWA Asset Price Oracle with Dual-Source
**Priority**: P1
**Complexity**: 6/10
**Estimated Days**: 3
**Dependencies**: None (parallel with Track A)

**Description**:
Implement dual-source price oracle for RWA assets.

**Technical Requirements**:
```solidity
contract RWAPriceOracle {
    struct PriceSource {
        address chainlinkFeed;     // Chainlink Price Feed address
        address custodianNAV;      // Custodian NAV API (off-chain)
        uint256 lastUpdate;
        uint256 deviationThreshold; // ±5% trigger
    }

    // Get RWA asset price (dual-source average)
    function getPrice(address rwaAsset) external view returns (uint256 price, uint256 timestamp);

    // Update custodian NAV (trusted oracle only)
    function updateNAV(address rwaAsset, uint256 nav) external onlyTrustedOracle;

    // Check if price deviation exceeds threshold
    function checkDeviation(address rwaAsset) external view returns (bool exceeded);
}
```

**Acceptance Criteria**:
- [ ] Chainlink integration (1-2 days)
- [ ] Custodian NAV update mechanism
- [ ] Dual-source averaging (50% Chainlink, 50% NAV)
- [ ] Deviation detection (±5% circuit breaker)
- [ ] Stale price protection (reject >24h old data)
- [ ] Emergency pause mechanism
- [ ] Unit tests: 100% coverage

---

### RWA-008: Treasury RWA Deposit/Redeem
**Title**: Treasury RWA Deposit and Redemption Logic
**Priority**: P1
**Complexity**: 7/10
**Estimated Days**: 4
**Dependencies**: RWA-007

**Description**:
Implement RWA deposit/redeem functionality in Treasury contract.

**Technical Requirements**:
```solidity
contract Treasury {
    // RWA deposit → mint HYD at LTV
    function depositRWA(address rwaToken, uint256 amount)
        external returns (uint256 hydMinted);

    // Redeem RWA: burn HYD → return RWA (cooldown period)
    function redeemRWA(uint256 hydAmount)
        external returns (uint256 rwaReturned);

    // Asset whitelist management (veNFT governance)
    function addRWAAsset(address rwaToken, uint8 tier) external onlyGovernance;

    // Three-tier LTV ratios
    mapping(address => RWATier) public rwaTiers;

    struct RWATier {
        uint8 tier;              // 1, 2, or 3
        uint256 ltvRatio;        // 8000 (80%), 6500 (65%), 5000 (50%)
        uint256 mintDiscount;    // 200 (2%), 500 (5%), 800 (8%) in bps
    }
}
```

**Acceptance Criteria**:
- [ ] Three-tier LTV support (T1: 80%, T2: 65%, T3: 50%)
- [ ] HYD minting formula: `hydMinted = (rwaValue * ltvRatio * (10000 - mintDiscount)) / 10000^2`
- [ ] Cooldown period for redemption (7 days)
- [ ] Redemption fee: 0.50%
- [ ] Position tracking (user → RWA asset → position)
- [ ] Health factor monitoring
- [ ] Unit tests: 100% coverage
- [ ] Integration with RWAPriceOracle

---

### RWA-009: Liquidation Module
**Title**: RWA Collateral Liquidation System
**Priority**: P1
**Complexity**: 6/10
**Estimated Days**: 3
**Dependencies**: RWA-008

**Description**:
Implement liquidation logic for undercollateralized RWA positions.

**Technical Requirements**:
```solidity
contract LiquidationModule {
    uint256 public constant LIQUIDATION_THRESHOLD = 11500; // 115%
    uint256 public constant LIQUIDATION_PENALTY = 500;     // 5%

    // Liquidate undercollateralized position
    function liquidate(address user, address rwaAsset)
        external returns (uint256 penalty);

    // Check if position is liquidatable
    function isLiquidatable(address user, address rwaAsset)
        public view returns (bool);

    // Calculate health factor
    function healthFactor(address user, address rwaAsset)
        public view returns (uint256);
}
```

**Acceptance Criteria**:
- [ ] Health factor formula: `(rwaValue / hydDebt) * 100`
- [ ] Liquidation triggered at <115% health factor
- [ ] 5% liquidation penalty (4% to liquidator, 1% to protocol)
- [ ] Partial liquidation support (liquidate only portion needed to restore health)
- [ ] Public liquidation function (anyone can trigger)
- [ ] Keeper bot compatibility
- [ ] Unit tests: edge cases (exact threshold, dust positions)

---

### RWA-010: Treasury Frontend - Deposit UI
**Title**: Treasury RWA Deposit Page
**Priority**: P1
**Complexity**: 5/10
**Estimated Days**: 2
**Dependencies**: RWA-008

**Description**:
Build frontend for RWA deposit and HYD minting.

**Technical Requirements**:
- Route: `/treasury/deposit`
- Components:
  - `RWAAssetSelector.tsx` - Select RWA token
  - `DepositForm.tsx` - Amount input
  - `HYDMintPreview.tsx` - Preview HYD minted amount

**Features**:
- [ ] RWA asset dropdown (whitelisted assets only)
- [ ] Asset tier indicator (T1/T2/T3)
- [ ] Amount input with balance check
- [ ] Preview calculation:
  - RWA value (from oracle)
  - LTV ratio
  - HYD minted amount
  - Minting discount
- [ ] Transaction preview
- [ ] Gas estimation
- [ ] Success confirmation

**Acceptance Criteria**:
- [ ] Real-time HYD preview updates
- [ ] Wallet balance validation
- [ ] Allowance check (ERC-20 approve if needed)
- [ ] Error handling (oracle failure, insufficient collateral)
- [ ] Loading states
- [ ] Material Design 3 compliance

---

### RWA-011: Treasury Frontend - Position Monitor
**Title**: Treasury Position Monitoring Dashboard
**Priority**: P1
**Complexity**: 5/10
**Estimated Days**: 2
**Dependencies**: RWA-010

**Description**:
Build dashboard for monitoring RWA collateral positions.

**Technical Requirements**:
- Route: `/treasury/positions`
- Components:
  - `PositionList.tsx` - All user positions
  - `PositionCard.tsx` - Individual position details
  - `HealthFactorGauge.tsx` - Visual health indicator

**Features**:
- [ ] Position list (all RWA deposits)
- [ ] Health factor display (color-coded)
  - Green: >150%
  - Yellow: 115-150%
  - Red: <115% (liquidatable)
- [ ] Collateralization ratio
- [ ] Liquidation price alert
- [ ] Redeem button (with cooldown timer)
- [ ] Add collateral button
- [ ] Real-time updates (oracle price changes)

**Acceptance Criteria**:
- [ ] Auto-refresh every 60 seconds
- [ ] Push notifications for liquidation risk (optional)
- [ ] Historical position data
- [ ] Export position report (CSV)

---

### RWA-012: Treasury Testing & Integration
**Title**: Comprehensive Testing for Treasury RWA System
**Priority**: P1
**Complexity**: 5/10
**Estimated Days**: 2
**Dependencies**: RWA-007 to RWA-011

**Description**:
End-to-end testing of Treasury RWA functionality.

**Test Coverage**:
1. **Smart Contract Tests**:
   - [ ] RWA deposit (T1/T2/T3 tiers)
   - [ ] HYD minting calculation accuracy
   - [ ] Redemption (cooldown, fees)
   - [ ] Liquidation (threshold, penalty)
   - [ ] Oracle integration (Chainlink + NAV)
   - [ ] Edge cases (oracle failure, price volatility)

2. **Frontend Tests**:
   - [ ] E2E: Deposit RWA → Monitor position → Redeem
   - [ ] Health factor visualization
   - [ ] Liquidation warning display
   - [ ] Transaction flow

3. **Integration Tests**:
   - [ ] Treasury ↔ RWAPriceOracle
   - [ ] Treasury ↔ PSM (USDC ↔ HYD interoperability)
   - [ ] Treasury ↔ VotingEscrow (lock HYD → veNFT)

**Acceptance Criteria**:
- [ ] Unit test coverage ≥80%
- [ ] Integration test coverage ≥70%
- [ ] E2E test passes for all user flows
- [ ] Gas benchmarks documented
- [ ] Oracle failure handling tested

---

## Summary

### Task Count
- **Launchpad (Track A)**: 6 tasks (RWA-001 to RWA-006)
- **Treasury RWA (Track B)**: 6 tasks (RWA-007 to RWA-012)
- **Total**: 12 tasks

### Priority Distribution
- **P0 (Critical)**: 6 tasks (all Launchpad tasks)
- **P1 (Important)**: 6 tasks (all Treasury RWA tasks)

### Complexity Distribution
- **Simple (1-3)**: 0 tasks
- **Medium (4-6)**: 9 tasks
- **Complex (7-10)**: 3 tasks (RWA-002, RWA-008, RWA-009)

### Estimated Timeline
- **Track A (Launchpad)**: 2 weeks (parallel development)
- **Track B (Treasury RWA)**: 2-3 weeks (parallel development, may wait for Custodian API)
- **Total (parallel)**: 3 weeks minimum, 4 weeks with buffer

### Dependencies
- **No circular dependencies**
- **Parallel tracks**: Launchpad and Treasury RWA can be developed simultaneously
- **Integration point**: Week 3 (combine both systems for full test)

---

## Next Steps

1. **Update tasks.json** with Phase 3.6 definition
2. **Start Track A (Launchpad)** immediately (highest priority)
3. **Start Track B (Treasury RWA)** in parallel
4. **Coordinate Custodian API** access (for RWA-007)
5. **Schedule code reviews** at Week 1.5 and Week 2.5
6. **Prepare for audit** at Week 4 (Phase 4)
