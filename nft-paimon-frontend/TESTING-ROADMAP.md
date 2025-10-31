# Frontend Testing Roadmap (SEC-004)

**Status**: Phase 1 Complete (Infrastructure Setup)
**Generated**: 2025-10-27
**Estimated Completion**: 2025-11-03 (7 days total)

---

## ✅ Phase 1: Infrastructure Setup (Day 1 - COMPLETED)

### Completed Tasks

- [x] Install Jest + Testing Library dependencies
- [x] Configure `jest.config.js` with Next.js support
- [x] Create `jest.setup.js` with mock configurations
- [x] Add test scripts to `package.json`
- [x] Create test directory structure (`__tests__/`, `__mocks__/`)
- [x] Write example test for `StyledCard` component (8 test cases)
- [x] Verify tests run successfully (8/8 passing)

### Infrastructure Files Created

```
frontend/
├── jest.config.js              # Jest configuration
├── jest.setup.js               # Test setup & mocks
├── __mocks__/
│   ├── styleMock.js           # CSS module mock
│   └── fileMock.js            # Image/file mock
├── __tests__/
│   ├── components/
│   │   └── StyledCard.test.tsx  # Example test (8 cases)
│   ├── pages/
│   └── utils/
└── package.json                # Updated with test scripts
```

### Test Scripts Available

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Generate coverage report
npm run test:ci       # CI mode with coverage
```

### Current Test Coverage

```
Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
Coverage:    < 1% (only StyledCard tested)
```

---

## 🚧 Phase 2: Component Unit Tests (Day 2-4 - PENDING)

### Priority Components to Test

#### 🔴 High Priority (Core Business Logic)
1. **Presale Components** (`src/components/presale/`)
   - `MintCard.tsx` - NFT minting UI
   - `DiceRoll.tsx` - Dice rolling mechanism
   - `Leaderboard.tsx` - Ranking display
   - **Est**: 15-20 test cases each

2. **Treasury Components** (`src/components/treasury/`)
   - `DepositCard.tsx` - RWA deposit interface
   - `RedeemCard.tsx` - RWA redemption interface
   - `HealthFactor.tsx` - Collateral health display
   - **Est**: 15-20 test cases each

3. **Common Components** (`src/components/common/`)
   - `WalletButton.tsx` - Wallet connection
   - `NetworkSwitch.tsx` - Network switching
   - `StyledCard.tsx` - ✅ Already tested
   - **Est**: 10-15 test cases each

#### 🟡 Medium Priority (Supporting Features)
4. **VeNFT Components** (`src/components/venft/`)
   - `LockCard.tsx` - Token locking
   - `NFTDisplay.tsx` - NFT visualization
   - **Est**: 10-15 test cases each

5. **Launchpad Components** (`src/components/launchpad/`)
   - `ProjectCard.tsx` - Project display
   - `VoteCard.tsx` - Voting interface
   - **Est**: 10-15 test cases each

#### 🟢 Low Priority (Analytics/UI)
6. **Analytics Components** (`src/components/analytics/`)
   - `ChartCard.tsx` - Data visualization
   - `StatsCard.tsx` - Statistics display
   - **Est**: 5-10 test cases each

### Target Coverage

- **Goal**: ≥ 80% code coverage
- **Estimated Tests**: 100-150 test cases total
- **Time**: 3 days (Day 2-4)

### Testing Patterns

```typescript
// Example: Testing Component with Web3 Integration
describe('MintCard Component', () => {
  // 1. Rendering Tests
  it('renders mint interface when wallet connected')
  it('shows connect wallet prompt when disconnected')

  // 2. User Interaction Tests
  it('handles quantity input changes')
  it('validates maximum mint per transaction')
  it('disables mint button when insufficient balance')

  // 3. Web3 Integration Tests (Mocked)
  it('calls USDC approve on approval button click')
  it('calls mint function with correct parameters')
  it('shows success message after successful mint')
  it('shows error message on transaction failure')

  // 4. Edge Cases
  it('handles wallet disconnection during transaction')
  it('prevents double submission')
})
```

---

## 🎭 Phase 3: E2E Tests with Playwright MCP (Day 5-7 - PENDING)

**Note**: Use `mcp__Playwright__*` tools (no installation needed)

### Critical User Flows

#### 1. Presale Mint Flow
**Priority**: P0 (Critical)
**Steps**:
1. Navigate to `/presale`
2. Connect wallet (MetaMask/WalletConnect)
3. Select quantity (1-5 NFTs)
4. Approve USDC spending
5. Execute mint transaction
6. Verify NFT received

**MCP Tools**:
- `mcp__Playwright__browser_navigate`
- `mcp__Playwright__browser_click`
- `mcp__Playwright__browser_fill_form`
- `mcp__Playwright__browser_wait_for`
- `mcp__Playwright__take_screenshot`

**Expected Duration**: 30-45 seconds

---

#### 2. Dice Roll Flow
**Priority**: P0 (Critical)
**Steps**:
1. Navigate to `/presale`
2. Connect wallet
3. View owned NFTs with available rolls
4. Click "Roll Dice" button
5. Wait for random number generation
6. View remint reward allocation
7. Check leaderboard update

**Validation**:
- ✅ Dice animation plays
- ✅ Result displays (1-6)
- ✅ Remint balance updates
- ✅ Leaderboard reflects new score
- ✅ Roll count decrements

**Expected Duration**: 20-30 seconds

---

#### 3. Treasury Deposit Flow
**Priority**: P0 (Critical)
**Steps**:
1. Navigate to `/treasury`
2. Connect wallet
3. Select RWA asset (e.g., stETH)
4. Enter deposit amount
5. View calculated HYD mint amount
6. Approve RWA token
7. Execute deposit transaction
8. Monitor health factor update

**Validation**:
- ✅ LTV ratio displays correctly
- ✅ Mint discount applied (if applicable)
- ✅ HYD minted to wallet
- ✅ Health factor > 125%
- ✅ Position visible in dashboard

**Expected Duration**: 45-60 seconds

---

#### 4. Treasury Redeem Flow
**Priority**: P0 (Critical)
**Steps**:
1. Navigate to `/treasury`
2. Connect wallet with existing position
3. Check cooldown period (7 days)
4. Enter redeem amount
5. View calculated fees
6. Approve HYD burn
7. Execute redeem transaction
8. Verify RWA received

**Validation**:
- ✅ Cooldown check passes
- ✅ Fees calculated correctly (0.5%)
- ✅ HYD burned from wallet
- ✅ RWA returned to wallet
- ✅ Health factor updated
- ✅ Position closed if fully redeemed

**Expected Duration**: 45-60 seconds

---

### E2E Test Structure

```typescript
// Example E2E Test Documentation
// File: frontend/e2e/presale-mint.md

## Presale Mint E2E Test

**Test ID**: E2E-PRESALE-001
**Priority**: P0
**Duration**: ~45s

### Preconditions
- Metamask wallet with BNB + USDC
- Frontend running on localhost:3000
- BSC Testnet RPC available

### Steps
1. [Navigate] Open http://localhost:3000/presale
2. [Wait] Page load complete
3. [Click] "Connect Wallet" button
4. [Wait] Wallet connection modal
5. [Click] MetaMask option
6. [Wait] Wallet connected (address display)
7. [Fill] Quantity input = "3"
8. [Click] "Approve USDC" button
9. [Wait] Transaction confirmation
10. [Click] "Mint NFTs" button
11. [Wait] Mint transaction confirmation
12. [Verify] Success message displayed
13. [Verify] NFT count updated in wallet

### Expected Results
- ✅ 3 NFTs minted
- ✅ USDC balance decreased by 30 USDC
- ✅ Gas fees deducted
- ✅ NFT IDs visible in wallet
```

---

## 📊 Success Criteria

### Phase 1 (Infrastructure) ✅ COMPLETED
- [x] Jest configured and working
- [x] Example test passing (8/8)
- [x] Test scripts in package.json
- [x] Directory structure created

### Phase 2 (Component Tests) ⏳ PENDING
- [ ] ≥ 80% code coverage for components
- [ ] 100+ test cases written
- [ ] All critical components tested
- [ ] Edge cases covered

### Phase 3 (E2E Tests) ⏳ PENDING
- [ ] 4 critical user flows tested
- [ ] Playwright MCP integration working
- [ ] Screenshots captured for failures
- [ ] Test documentation complete

### Final Acceptance (SEC-004 Complete)
- [ ] All tests passing in CI/CD
- [ ] Coverage report ≥ 80%
- [ ] E2E tests documented
- [ ] Testing guide created

---

## 🛠 Development Commands

```bash
# Run all unit tests
npm test

# Watch mode for TDD
npm run test:watch

# Generate coverage report
npm run test:coverage

# CI mode (strict, with coverage)
npm run test:ci

# E2E tests (using Playwright MCP)
# Execute via Claude Code with mcp__Playwright__ tools
```

---

## 📝 Next Steps

1. **Resume Phase 2**: Write component tests
   - Start with Presale components
   - Achieve 80% coverage incrementally
   - Add tests for each PR

2. **Plan Phase 3**: E2E test execution
   - Set up test environment
   - Document test scenarios
   - Execute with Playwright MCP

3. **Continuous Integration**:
   - Add test step to GitHub Actions
   - Require passing tests for PR merges
   - Track coverage trends

---

**Generated by**: Claude Code (SEC-004 Task)
**Contact**: Review COMPREHENSIVE-TEST-REPORT.md for security context
**Last Updated**: 2025-10-27
