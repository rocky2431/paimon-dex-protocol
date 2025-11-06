# E2E Testing Guide - Navigation Refactor V2

**Last Updated:** 2025-11-07  
**Project:** nft-paimon-frontend  
**Version:** 0.1.0

---

## Overview

This guide documents E2E testing requirements for the refactored navigation system in Frontend Refactor V2.

**Key Changes:**
- New hierarchical navigation structure (5 sections)
- Feature flag-driven page visibility
- Responsive design (desktop + mobile)
- Active page highlighting

---

## Test Coverage Requirements

### 1. Navigation Structure Tests

**Test:** All navigation sections render correctly

```typescript
test('should render all 5 navigation sections', async ({ page }) => {
  await page.goto('/');
  
  // Check all sections present
  await expect(page.getByRole('button', { name: 'Trade' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Borrow' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Earn' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Governance' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'More' })).toBeVisible();
});
```

**Priority:** P0

---

### 2. Page Navigation Tests

**Test:** Clicking navigation items navigates to correct pages

```typescript
test('should navigate to all primary pages', async ({ page }) => {
  await page.goto('/');
  
  // Navigate to Swap
  await page.click('text=Swap');
  await expect(page).toHaveURL('/swap');
  
  // Navigate to Vault
  await page.click('text=Vault Dashboard');
  await expect(page).toHaveURL('/vault');
  
  // Navigate to Lock
  await page.click('text=Lock PAIMON');
  await expect(page).toHaveURL('/lock');
  
  // Add more pages as needed
});
```

**Priority:** P0

---

### 3. Active State Tests

**Test:** Active page is correctly highlighted

```typescript
test('should highlight active page in navigation', async ({ page }) => {
  await page.goto('/swap');
  
  // Check active state styling
  const swapLink = page.locator('[href="/swap"]');
  await expect(swapLink).toHaveCSS('background-color', 'rgba(255, 152, 0, 0.12)');
  await expect(swapLink).toHaveCSS('border-left', '4px solid rgb(255, 152, 0)');
});
```

**Priority:** P1

---

### 4. Feature Flag Tests

**Test:** Pages are hidden when feature flags are disabled

```typescript
test('should hide features when flags are disabled', async ({ page }) => {
  // Mock config with disabled features
  await page.route('**/config/**', (route) => {
    route.fulfill({
      status: 200,
      body: JSON.stringify({
        tokens: {
          vault: null, // Disable vault
          stabilityPool: null, // Disable stability pool
        }
      })
    });
  });
  
  await page.goto('/');
  
  // Verify hidden navigation items
  await expect(page.getByText('Vault Dashboard')).not.toBeVisible();
  await expect(page.getByText('Stability Pool')).not.toBeVisible();
});
```

**Priority:** P1

---

### 5. Responsive Design Tests

**Test:** Mobile navigation works correctly

```typescript
test('should open mobile menu', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
  await page.goto('/');
  
  // Click hamburger menu
  await page.click('[aria-label="Open menu"]');
  
  // Check drawer opens
  await expect(page.locator('[role="presentation"]')).toBeVisible();
  
  // Navigate to a page
  await page.click('text=Swap');
  await expect(page).toHaveURL('/swap');
  
  // Drawer should close
  await expect(page.locator('[role="presentation"]')).not.toBeVisible();
});
```

**Priority:** P1

---

### 6. Wallet Connection Tests

**Test:** Connect wallet button works

```typescript
test('should connect wallet via navigation', async ({ page }) => {
  await page.goto('/');
  
  // Click connect wallet button
  await page.click('text=Connect Wallet');
  
  // RainbowKit modal should appear
  await expect(page.locator('[role="dialog"]')).toBeVisible();
  
  // Check wallet options present
  await expect(page.getByText('MetaMask')).toBeVisible();
  await expect(page.getByText('WalletConnect')).toBeVisible();
});
```

**Priority:** P0

---

### 7. Visual Regression Tests

**Test:** Navigation appearance matches design

```typescript
test('should match navigation snapshot', async ({ page }) => {
  await page.goto('/');
  
  // Desktop snapshot
  await expect(page.locator('nav')).toHaveScreenshot('navigation-desktop.png');
  
  // Mobile snapshot
  await page.setViewportSize({ width: 375, height: 667 });
  await expect(page.locator('nav')).toHaveScreenshot('navigation-mobile.png');
});
```

**Priority:** P2

---

## Test Scenarios by Page

### Swap Page (/swap)

**Critical User Flows:**
1. Load PSM swap interface
2. Select token pair (USDC ↔ USDP)
3. Input amount
4. Execute swap transaction
5. Verify transaction success

**E2E Test:**
```typescript
test('should complete USDC → USDP swap', async ({ page }) => {
  await page.goto('/swap');
  
  // Connect wallet first
  await connectWallet(page);
  
  // Input swap amount
  await page.fill('[placeholder="0.0"]', '100');
  
  // Click swap button
  await page.click('text=Swap');
  
  // Confirm transaction in MetaMask
  await confirmMetaMaskTransaction(page);
  
  // Wait for success message
  await expect(page.getByText('Transaction successful')).toBeVisible();
});
```

---

### Vault Page (/vault)

**Critical User Flows:**
1. View vault dashboard
2. Navigate to Borrow page
3. Borrow USDP
4. Navigate to Repay page
5. Repay USDP

**E2E Test:**
```typescript
test('should borrow and repay USDP', async ({ page }) => {
  await page.goto('/vault');
  await connectWallet(page);
  
  // Go to Borrow page
  await page.click('text=Borrow');
  await expect(page).toHaveURL('/vault/borrow');
  
  // Borrow 50 USDP
  await page.fill('[placeholder="Enter amount"]', '50');
  await page.click('text=Confirm Borrow');
  await confirmMetaMaskTransaction(page);
  await expect(page.getByText('Successfully borrowed')).toBeVisible();
  
  // Go to Repay page
  await page.goto('/vault/repay');
  
  // Repay 50 USDP
  await page.fill('[placeholder="Enter amount"]', '50');
  await page.click('text=Confirm Repay');
  await confirmMetaMaskTransaction(page);
  await expect(page.getByText('Successfully repaid')).toBeVisible();
});
```

---

### Stability Pool Page (/stability-pool)

**Critical User Flows:**
1. View pool overview
2. Deposit USDP
3. Withdraw USDP
4. View liquidation history

**E2E Test:**
```typescript
test('should deposit and withdraw from stability pool', async ({ page }) => {
  await page.goto('/stability-pool');
  await connectWallet(page);
  
  // Deposit 100 USDP
  await page.click('text=Deposit');
  await page.fill('[placeholder="Enter amount"]', '100');
  await page.click('text=Confirm Deposit');
  await confirmMetaMaskTransaction(page);
  await expect(page.getByText('Deposit successful')).toBeVisible();
  
  // Wait for balance update
  await page.waitForTimeout(2000);
  
  // Withdraw 100 USDP
  await page.click('text=Withdraw');
  await page.fill('[placeholder="Enter amount"]', '100');
  await page.click('text=Confirm Withdraw');
  await confirmMetaMaskTransaction(page);
  await expect(page.getByText('Withdrawal successful')).toBeVisible();
});
```

---

## Test Utilities

### Helper Functions

**Connect Wallet:**
```typescript
async function connectWallet(page: Page) {
  await page.click('text=Connect Wallet');
  await page.click('text=MetaMask');
  // Wait for MetaMask extension to load
  await page.waitForTimeout(1000);
  // Confirm connection
  await confirmMetaMaskConnection(page);
}
```

**Confirm MetaMask Transaction:**
```typescript
async function confirmMetaMaskTransaction(page: Page) {
  // Switch to MetaMask popup
  const metamaskWindow = await page.context().waitForEvent('page');
  await metamaskWindow.waitForLoadState();
  
  // Click Confirm
  await metamaskWindow.click('text=Confirm');
  
  // Switch back to main page
  await page.bringToFront();
}
```

---

## Running E2E Tests

### Prerequisites

1. **Install Playwright:**
   ```bash
   npm install -D @playwright/test
   npx playwright install
   ```

2. **Install MetaMask Extension:**
   ```bash
   npm install -D @synthetixio/synpress
   ```

3. **Configure MetaMask:**
   - Create `.env.test` with test wallet private key
   - Set network to BSC Testnet

### Run Commands

**All tests:**
```bash
npm run test:e2e
```

**Specific test file:**
```bash
npx playwright test navigation.spec.ts
```

**Headed mode (see browser):**
```bash
npx playwright test --headed
```

**Debug mode:**
```bash
npx playwright test --debug
```

**Generate report:**
```bash
npx playwright show-report
```

---

## Test Maintenance

### When Navigation Changes

1. **Update test selectors** - If HTML structure changes
2. **Update snapshots** - For visual regression tests
3. **Update feature flags** - If new features added
4. **Add new tests** - For new navigation items

### Best Practices

- ✅ Use semantic selectors (`getByRole`, `getByText`)
- ✅ Wait for elements properly (`waitForSelector`)
- ✅ Mock external dependencies (APIs, contracts)
- ✅ Run tests in CI/CD pipeline
- ✅ Keep tests isolated (no shared state)
- ❌ Don't use brittle CSS selectors
- ❌ Don't hardcode timing (`waitForTimeout`)

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          BSC_TESTNET_RPC: ${{ secrets.BSC_TESTNET_RPC }}
          TEST_PRIVATE_KEY: ${{ secrets.TEST_PRIVATE_KEY }}
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Troubleshooting

### Common Issues

**Issue:** MetaMask connection timeout

**Solution:**
```typescript
await page.waitForTimeout(2000); // Give MetaMask time to load
```

---

**Issue:** Transaction fails in tests

**Solution:**
- Check test wallet has sufficient balance
- Verify network is BSC Testnet
- Check gas price settings

---

**Issue:** Snapshots don't match

**Solution:**
```bash
npx playwright test --update-snapshots
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-07 | Initial E2E testing guide for Navigation Refactor V2 |

---

**Note:** This guide should be updated whenever navigation structure or critical user flows change.
