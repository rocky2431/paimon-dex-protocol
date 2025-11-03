/**
 * E2E Tests for PSM (Peg Stability Module) Swap Flow
 *
 * Tests cover:
 * - USDC → HYD swap (1:1 ratio)
 * - HYD → USDC swap (1:1 ratio)
 * - Swap fee calculation
 * - Slippage handling
 * - Balance updates
 */

import { test, expect } from '@playwright/test';
import { connectWallet, waitForWalletConnected, waitForTransaction } from './utils/web3-setup';
import { measureCoreWebVitals, checkThresholds, formatVitals } from './utils/core-web-vitals';

test.describe('PSM Swap Flow (USDC ↔ HYD)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to swap page
    await page.goto('/swap');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display PSM swap interface', async ({ page }) => {
    // Verify page title
    await expect(page).toHaveTitle(/Swap|兑换/);

    // Verify swap card is visible
    await expect(page.locator('[data-testid="swap-card"]')).toBeVisible();

    // Verify token selectors
    await expect(page.locator('text=/From|来自/')).toBeVisible();
    await expect(page.locator('text=/To|至/')).toBeVisible();

    // Verify swap button
    await expect(page.locator('button:has-text("Swap"), button:has-text("兑换")')).toBeVisible();
  });

  test('should default to USDC → HYD swap', async ({ page }) => {
    // Verify default "From" token is USDC
    await expect(page.locator('[data-testid="from-token"]')).toContainText('USDC');

    // Verify default "To" token is HYD
    await expect(page.locator('[data-testid="to-token"]')).toContainText('HYD');
  });

  test('should calculate 1:1 swap rate for USDC → HYD', async ({ page }) => {
    await connectWallet(page);
    await waitForWalletConnected(page);

    // Enter amount in "From" field
    const fromInput = page.locator('[data-testid="from-amount-input"], input[placeholder*="0.0"]').first();
    await fromInput.fill('100');

    // Wait for calculation
    await page.waitForTimeout(500);

    // Verify "To" amount is also 100 (1:1 ratio)
    const toInput = page.locator('[data-testid="to-amount-input"]');
    await expect(toInput).toHaveValue('100');

    // Verify exchange rate is displayed
    await expect(page.locator('text=/1 USDC = 1 HYD/')).toBeVisible();
  });

  test('should reverse swap direction', async ({ page }) => {
    await connectWallet(page);
    await waitForWalletConnected(page);

    // Click reverse button
    await page.click('[data-testid="reverse-swap-button"], button[aria-label="Reverse"], button:has-text("⇅")');

    await page.waitForTimeout(300);

    // Verify tokens are swapped
    await expect(page.locator('[data-testid="from-token"]')).toContainText('HYD');
    await expect(page.locator('[data-testid="to-token"]')).toContainText('USDC');
  });

  test('should calculate HYD → USDC with redemption fee', async ({ page }) => {
    await connectWallet(page);
    await waitForWalletConnected(page);

    // Reverse to HYD → USDC
    await page.click('[data-testid="reverse-swap-button"]');
    await page.waitForTimeout(300);

    // Enter amount
    const fromInput = page.locator('[data-testid="from-amount-input"]').first();
    await fromInput.fill('100');

    await page.waitForTimeout(500);

    // Verify fee is displayed
    await expect(page.locator('text=/Fee|手续费/')).toBeVisible();

    // Verify received amount accounts for fee (should be slightly less than 100)
    const toInput = page.locator('[data-testid="to-amount-input"]');
    const receivedAmount = await toInput.inputValue();
    const received = parseFloat(receivedAmount);

    // Fee is typically 0.1-0.5%, so received should be 99-99.9 USDC
    expect(received).toBeGreaterThan(99);
    expect(received).toBeLessThan(100);
  });

  test('should display user token balances', async ({ page }) => {
    await connectWallet(page);
    await waitForWalletConnected(page);

    // Verify balance display for "From" token
    await expect(page.locator('text=/Balance.*USDC|余额.*USDC/')).toBeVisible();

    // Verify balance is numeric
    const balanceText = await page.locator('[data-testid="from-balance"]').textContent();
    expect(balanceText).toMatch(/[\d,.]+/);
  });

  test('should validate insufficient balance', async ({ page }) => {
    await connectWallet(page);
    await waitForWalletConnected(page);

    // Enter amount exceeding balance
    const fromInput = page.locator('[data-testid="from-amount-input"]').first();
    await fromInput.fill('999999999');

    await page.waitForTimeout(500);

    // Verify error message
    await expect(page.locator('text=/Insufficient.*balance|余额不足/')).toBeVisible();

    // Verify swap button is disabled
    const swapButton = page.locator('button:has-text("Swap"), button:has-text("兑换")');
    await expect(swapButton).toBeDisabled();
  });

  test('should use MAX button to fill entire balance', async ({ page }) => {
    await connectWallet(page);
    await waitForWalletConnected(page);

    // Click MAX button
    await page.click('button:has-text("MAX"), button:has-text("最大")');

    await page.waitForTimeout(500);

    // Verify amount is filled
    const fromInput = page.locator('[data-testid="from-amount-input"]').first();
    const amount = await fromInput.inputValue();

    expect(parseFloat(amount)).toBeGreaterThan(0);
  });

  test('should execute USDC → HYD swap (MOCK)', async ({ page }) => {
    await connectWallet(page);
    await waitForWalletConnected(page);

    // Enter swap amount
    const fromInput = page.locator('[data-testid="from-amount-input"]').first();
    await fromInput.fill('50');

    await page.waitForTimeout(500);

    // Click swap button
    await page.click('button:has-text("Swap"), button:has-text("兑换")');

    // Verify transaction flow is initiated
    await expect(page.locator('text=/Approving|Swapping|Processing|授权中|兑换中|处理中/')).toBeVisible({ timeout: 5000 });

    // In real test:
    // 1. Approve USDC spending (if needed)
    // 2. Confirm swap transaction
    // 3. Wait for confirmation
    // 4. Verify balance updates
  });

  test('should display transaction confirmation modal', async ({ page }) => {
    await connectWallet(page);
    await waitForWalletConnected(page);

    // Enter swap amount
    const fromInput = page.locator('[data-testid="from-amount-input"]').first();
    await fromInput.fill('50');

    await page.waitForTimeout(500);

    // Click swap button
    await page.click('button:has-text("Swap"), button:has-text("兑换")');

    // Verify confirmation modal appears
    await expect(page.locator('[role="dialog"], [data-testid="confirm-swap-modal"]')).toBeVisible({ timeout: 5000 });

    // Verify modal shows swap details
    await expect(page.locator('text=/50.*USDC/')).toBeVisible();
    await expect(page.locator('text=/50.*HYD/')).toBeVisible();

    // Verify confirm button
    await expect(page.locator('button:has-text("Confirm"), button:has-text("确认")')).toBeVisible();
  });

  test('should handle slippage settings', async ({ page }) => {
    await connectWallet(page);
    await waitForWalletConnected(page);

    // Click settings button
    await page.click('[aria-label="Settings"], button:has-text("⚙")');

    // Verify slippage input
    await expect(page.locator('text=/Slippage|滑点/')).toBeVisible();

    // Change slippage tolerance
    const slippageInput = page.locator('input[type="number"][placeholder*="0.5"]');
    await slippageInput.fill('1.0');

    // Close settings
    await page.keyboard.press('Escape');

    // Verify slippage is applied
    const fromInput = page.locator('[data-testid="from-amount-input"]').first();
    await fromInput.fill('100');

    await page.waitForTimeout(500);

    // Verify minimum received is calculated with slippage
    await expect(page.locator('text=/Minimum received|最小接收/')).toBeVisible();
  });

  test('should display transaction history', async ({ page }) => {
    await connectWallet(page);
    await waitForWalletConnected(page);

    // Look for recent transactions section
    const historySection = page.locator('text=/Recent.*transactions|最近.*交易/');

    if (await historySection.isVisible()) {
      // Verify transaction list
      await expect(page.locator('[data-testid="transaction-item"]').first()).toBeVisible();

      // Verify transaction details
      await expect(page.locator('text=/Swap|兑换/')).toBeVisible();
      await expect(page.locator('text=/Pending|Success|Failed|待处理|成功|失败/')).toBeVisible();
    }
  });

  test('should meet Core Web Vitals thresholds', async ({ page }) => {
    // Measure Core Web Vitals
    const vitals = await measureCoreWebVitals(page);

    // Log results
    console.log(formatVitals(vitals));

    // Check thresholds
    const { passed, failures } = checkThresholds(vitals);

    if (!passed) {
      console.error('Core Web Vitals failures:', failures);
    }

    // Assert all metrics meet thresholds
    expect(passed).toBe(true);
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await connectWallet(page);
    await waitForWalletConnected(page);

    // Simulate network disconnection by going offline
    await page.route('**/*', (route) => route.abort('failed'));

    // Try to execute swap
    const fromInput = page.locator('[data-testid="from-amount-input"]').first();
    await fromInput.fill('50');

    await page.waitForTimeout(500);

    await page.click('button:has-text("Swap"), button:has-text("兑换")');

    // Verify error message is displayed
    await expect(page.locator('text=/Error|Network.*error|错误|网络.*错误/')).toBeVisible({ timeout: 10000 });
  });

  test('should be responsive on mobile', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }

    await connectWallet(page);
    await waitForWalletConnected(page);

    // Verify swap interface is usable on mobile
    const fromInput = page.locator('[data-testid="from-amount-input"]').first();
    await fromInput.fill('50');

    // Verify input is readable
    await expect(fromInput).toHaveValue('50');

    // Verify swap button is accessible
    const swapButton = page.locator('button:has-text("Swap"), button:has-text("兑换")');
    await expect(swapButton).toBeVisible();
  });

  test('should support keyboard navigation', async ({ page }) => {
    await connectWallet(page);
    await waitForWalletConnected(page);

    // Tab to amount input
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Type amount
    await page.keyboard.type('100');

    // Tab to swap button
    await page.keyboard.press('Tab');

    // Verify swap button has focus
    const swapButton = page.locator('button:has-text("Swap"), button:has-text("兑换")');
    await expect(swapButton).toBeFocused();
  });
});
