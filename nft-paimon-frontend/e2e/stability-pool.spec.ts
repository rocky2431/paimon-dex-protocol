/**
 * E2E Tests for Stability Pool
 *
 * Tests cover:
 * - HYD deposit to Stability Pool
 * - Withdrawal functionality
 * - Liquidation rewards tracking
 * - APY calculation
 */

import { test, expect } from '@playwright/test';
import { connectWallet, waitForWalletConnected } from './utils/web3-setup';
import { measureCoreWebVitals, checkThresholds } from './utils/core-web-vitals';

test.describe('Stability Pool Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/stability-pool');
    await page.waitForLoadState('networkidle');
  });

  test('should display Stability Pool interface', async ({ page }) => {
    await expect(page).toHaveTitle(/Stability Pool|稳定池/);
    await expect(page.locator('text=/Deposit HYD|存入 HYD/')).toBeVisible();
    await expect(page.locator('text=/Total Deposits|总存款/')).toBeVisible();
  });

  test('should show pool statistics', async ({ page }) => {
    await expect(page.locator('text=/TVL|总锁仓/')).toBeVisible();
    await expect(page.locator('text=/APY|年化收益/')).toBeVisible();
    await expect(page.locator('text=/Your Share|你的份额/')).toBeVisible();
  });

  test('should calculate deposit and rewards', async ({ page }) => {
    await connectWallet(page);
    await waitForWalletConnected(page);

    const amountInput = page.locator('input[placeholder*="HYD"]').first();
    await amountInput.fill('1000');

    await page.waitForTimeout(500);

    await expect(page.locator('text=/Estimated APY|预计 APY/')).toBeVisible();
    await expect(page.locator('text=/[0-9]+\\.?[0-9]*%/')).toBeVisible();
  });

  test('should execute deposit transaction (MOCK)', async ({ page }) => {
    await connectWallet(page);
    await waitForWalletConnected(page);

    const amountInput = page.locator('input[placeholder*="HYD"]').first();
    await amountInput.fill('500');

    await page.click('button:has-text("Deposit"), button:has-text("存入")');

    await expect(page.locator('text=/Depositing|存入中/')).toBeVisible({ timeout: 5000 });
  });

  test('should display user position and rewards', async ({ page }) => {
    await connectWallet(page);
    await waitForWalletConnected(page);

    const positionCard = page.locator('[data-testid="position-card"]');
    if (await positionCard.isVisible()) {
      await expect(positionCard.locator('text=/Deposited|已存入/')).toBeVisible();
      await expect(positionCard.locator('text=/Pending Rewards|待领取奖励/')).toBeVisible();
      await expect(positionCard.locator('text=/Liquidation Gains|清算收益/')).toBeVisible();
    }
  });

  test('should support withdrawal', async ({ page }) => {
    await connectWallet(page);
    await waitForWalletConnected(page);

    await page.click('button:has-text("Withdraw"), button:has-text("取出")');

    const withdrawInput = page.locator('input[placeholder*="amount"]');
    await withdrawInput.fill('100');

    await page.click('button:has-text("Confirm"), button:has-text("确认")');

    await expect(page.locator('text=/Withdrawing|取出中/')).toBeVisible({ timeout: 5000 });
  });

  test('should meet Core Web Vitals thresholds', async ({ page }) => {
    const vitals = await measureCoreWebVitals(page);
    const { passed } = checkThresholds(vitals);
    expect(passed).toBe(true);
  });
});
