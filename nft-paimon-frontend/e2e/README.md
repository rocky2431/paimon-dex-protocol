# E2E Test Suite - Paimon.dex Frontend

Comprehensive end-to-end testing suite using Playwright and chrome-devtools MCP for Core Web Vitals measurement.

## Overview

This E2E test suite covers:
- ✅ **Treasury RWA deposit flow** - RWA asset deposits, collateral calculation, HYD minting
- ✅ **PSM swap flow** - USDC ↔ HYD 1:1 swaps with fee handling
- ✅ **veNFT locking and voting** - HYD locking, voting power calculation, lock management
- ✅ **Stability Pool** - HYD deposits, liquidation rewards, APY tracking
- ✅ **Gauge voting** - Vote weight allocation, bribe rewards
- ✅ **Core Web Vitals** - LCP, INP, CLS measurement across all pages

## Requirements

- Node.js 18+ and npm
- Playwright browsers (auto-installed)
- Development server running on `http://localhost:4000`

## Installation

```bash
# Install dependencies (already done if you ran npm install)
npm install

# Install Playwright browsers
npx playwright install --with-deps
```

## Running Tests

### All Tests

```bash
# Run all E2E tests (headless)
npm run test:e2e
```

### Browser-Specific Tests

```bash
# Chrome only
npm run test:e2e:chromium

# Firefox only
npm run test:e2e:firefox

# Safari only
npm run test:e2e:webkit

# Mobile browsers (Chrome + Safari)
npm run test:e2e:mobile
```

### Debug Mode

```bash
# Run with UI (interactive mode)
npm run test:e2e:ui

# Run with browser visible
npm run test:e2e:headed

# Step-through debugging
npm run test:e2e:debug
```

### View Test Report

```bash
# Generate and open HTML report
npm run test:e2e:report
```

## Test Structure

```
e2e/
├── treasury.spec.ts              # Treasury RWA deposit tests
├── psm-swap.spec.ts              # PSM swap tests
├── venft-lock.spec.ts            # veNFT locking tests
├── stability-pool.spec.ts        # Stability Pool tests
├── gauge-voting.spec.ts          # Gauge voting tests
├── core-web-vitals-full.spec.ts  # Comprehensive Core Web Vitals tests
├── utils/
│   ├── web3-setup.ts             # Web3 wallet utilities
│   └── core-web-vitals.ts        # Core Web Vitals measurement utilities
└── README.md                     # This file
```

## Test Coverage

### 1. Treasury RWA Deposit Flow (treasury.spec.ts)

Tests:
- Page UI elements and navigation
- Wallet connection
- RWA asset selection (T1/T2/T3)
- HYD minting calculation based on LTV
- Input validation (min amount, max balance)
- Transaction execution (mocked)
- Position display and monitoring
- Treasury statistics
- Core Web Vitals compliance
- Mobile responsiveness
- Bilingual support (EN/CN)

**Critical Paths**:
- Connect wallet → Select RWA asset → Enter amount → Verify HYD calculation → Deposit

### 2. PSM Swap Flow (psm-swap.spec.ts)

Tests:
- Swap interface display
- USDC → HYD swap (1:1 ratio)
- HYD → USDC swap (with redemption fee)
- Reverse swap direction
- Balance display and MAX button
- Input validation
- Slippage settings
- Transaction confirmation modal
- Transaction history
- Network error handling
- Core Web Vitals compliance
- Mobile responsiveness
- Keyboard navigation

**Critical Paths**:
- Connect wallet → Enter swap amount → Verify exchange rate → Execute swap

### 3. veNFT Locking and Voting (venft-lock.spec.ts)

Tests:
- veNFT locking interface
- Voting power calculation (based on amount × duration)
- Lock duration selection (1 week to 4 years)
- Lock transaction execution
- Existing veNFT position display
- Increase lock amount
- Extend lock duration
- Core Web Vitals compliance

**Critical Paths**:
- Connect wallet → Enter HYD amount → Select duration → Verify voting power → Create lock

### 4. Stability Pool (stability-pool.spec.ts)

Tests:
- Stability Pool interface
- Pool statistics (TVL, APY)
- Deposit calculation
- Transaction execution
- Position and rewards display
- Withdrawal functionality
- Core Web Vitals compliance

**Critical Paths**:
- Connect wallet → Enter HYD amount → Deposit → Monitor rewards

### 5. Gauge Voting (gauge-voting.spec.ts)

Tests:
- Gauge voting interface
- Gauge pool list display
- Vote weight allocation
- Total weight validation (must equal 100%)
- Bribe rewards display
- Core Web Vitals compliance

**Critical Paths**:
- Connect wallet → View gauges → Allocate vote weights → Confirm voting

### 6. Core Web Vitals (core-web-vitals-full.spec.ts)

Comprehensive performance testing:
- **LCP (Largest Contentful Paint)**: Target <2.5s
- **INP (Interaction to Next Paint)**: Target <200ms
- **CLS (Cumulative Layout Shift)**: Target <0.1

Tests all major pages:
- Home (`/`)
- Swap (`/swap`)
- Treasury (`/treasury`)
- veNFT Lock (`/lock`)
- Gauge Voting (`/vote`)
- Stability Pool (`/stability-pool`)
- Launchpad (`/launchpad`)
- Presale (`/presale`)

Additional tests:
- Slow network performance
- Mobile layout shift
- Critical asset loading
- Image optimization
- Interaction responsiveness
- Performance report generation

## Six-Dimensional Test Coverage

All E2E tests follow the six-dimensional testing approach:

1. **Functional** ✅ - Core business logic and user flows
2. **Boundary** ✅ - Edge cases (min/max amounts, empty states)
3. **Exception** ✅ - Error handling (network failures, invalid inputs)
4. **Performance** ✅ - Core Web Vitals measurement
5. **Security** ✅ - Input validation, wallet security
6. **Compatibility** ✅ - Cross-browser (Chrome, Firefox, Safari, Mobile)

## Core Web Vitals Measurement

### Using Web Vitals Library

Tests use the official `web-vitals` library for accurate measurement:

```typescript
import { measureCoreWebVitals } from './utils/core-web-vitals';

const vitals = await measureCoreWebVitals(page);
console.log(`LCP: ${vitals.LCP}s, INP: ${vitals.INP}ms, CLS: ${vitals.CLS}`);
```

### Using Performance API

Fallback measurement using native Performance API:

```typescript
import { measurePerformanceMetrics } from './utils/core-web-vitals';

const metrics = await measurePerformanceMetrics(page);
console.log(`FCP: ${metrics.FCP}s, LCP: ${metrics.LCP}s, TTFB: ${metrics.TTFB}s`);
```

### chrome-devtools MCP Integration

For authoritative measurement (when available):

```typescript
// Connect to chrome-devtools MCP
// Use mcp__chrome-devtools__performance_start_trace()
// Use mcp__chrome-devtools__performance_stop_trace()
// Get official Core Web Vitals scores
```

## Mocking Strategy

### Current Approach

Tests are currently written with **minimal mocking**:
- ✅ Wallet connection flow is **simulated** (not full MetaMask integration)
- ✅ Transaction confirmations are **mocked** (no real blockchain transactions)
- ✅ All UI interactions are **real**
- ✅ All validations are **real**
- ✅ All calculations are **real**

### Future Integration

For full integration testing:
1. Use **Synpress** for MetaMask automation
2. Connect to **BSC testnet** with test wallets
3. Execute **real transactions** on testnet
4. Verify **on-chain state changes**

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Debugging Failed Tests

### Screenshot and Video

Failed tests automatically capture:
- Screenshots (saved to `test-results/`)
- Videos (saved to `test-results/`)

### Trace Viewer

View detailed trace of test execution:

```bash
npx playwright show-trace test-results/<test-file>/<trace.zip>
```

### Debug Mode

Run specific test in debug mode:

```bash
npx playwright test treasury.spec.ts --debug
```

## Best Practices

1. **Keep tests independent** - Each test should run in isolation
2. **Use data-testid** - Prefer `data-testid` over text selectors
3. **Wait for stability** - Use `waitForLoadState('networkidle')` before assertions
4. **Mock external services** - Don't rely on third-party APIs
5. **Test user flows, not implementation** - Focus on what users do, not how code works
6. **Maintain test data** - Use consistent test accounts and data
7. **Clean up after tests** - Reset state when needed
8. **Monitor performance** - Always check Core Web Vitals
9. **Test accessibility** - Use ARIA selectors when possible
10. **Keep tests fast** - Aim for <30s per test

## Known Limitations

1. **Wallet integration is mocked** - Real MetaMask interaction requires Synpress
2. **No blockchain transactions** - Tests don't execute on testnet (yet)
3. **Limited contract state** - Can't verify on-chain state changes
4. **Network simulation is basic** - Chrome DevTools Protocol offers more advanced throttling

## Future Enhancements

1. ✅ **Synpress integration** - Full MetaMask automation
2. ✅ **BSC testnet integration** - Real blockchain transactions
3. ✅ **Contract state verification** - Read on-chain data after transactions
4. ✅ **Advanced network throttling** - Use CDP for realistic network simulation
5. ✅ **Visual regression testing** - Automatic screenshot comparison
6. ✅ **Accessibility testing** - Automated WCAG compliance checks
7. ✅ **Load testing** - Simulate multiple concurrent users
8. ✅ **Security testing** - XSS, CSRF, injection attacks

## Troubleshooting

### Tests fail to start dev server

**Solution**: Make sure port 4000 is not in use:
```bash
lsof -ti:4000 | xargs kill -9  # Kill process on port 4000
npm run dev                     # Start dev server manually
```

### Playwright browsers not installed

**Solution**: Install browsers:
```bash
npx playwright install --with-deps
```

### Tests timeout

**Solution**: Increase timeout in `playwright.config.ts`:
```typescript
timeout: 120 * 1000,  // 2 minutes per test
```

### Core Web Vitals not measured

**Solution**: Ensure web-vitals library is loaded:
- Check network tab for `web-vitals.iife.js`
- Verify page is fully loaded before measuring
- Use `waitForPageStable()` utility

## Support

For issues or questions:
- Open an issue in the repository
- Contact the development team
- Refer to [Playwright documentation](https://playwright.dev/)

## License

Same as main project license.
