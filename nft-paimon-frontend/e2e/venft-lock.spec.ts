/**
 * E2E Tests for veNFT Locking and Voting
 *
 * Tests cover:
 * - HYD locking for veNFT
 * - Lock duration selection (1 week to 4 years)
 * - Voting power calculation
 * - veNFT management
 */

import { test, expect } from '@playwright/test';
import { connectWallet, waitForWalletConnected } from './utils/web3-setup';
import { measureCoreWebVitals, checkThresholds } from './utils/core-web-vitals';

test.describe('veNFT Lock and Voting Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/lock');
    await page.waitForLoadState('networkidle');
  });

  test('should display veNFT locking interface', async ({ page }) => {
    await expect(page).toHaveTitle(/Lock|锁定|veNFT/);
    await expect(page.locator('text=/Create Lock|创建锁定/')).toBeVisible();
    await expect(page.locator('text=/Lock Duration|锁定期限/')).toBeVisible();
  });

  test('should calculate voting power based on amount and duration', async ({ page }) => {
    await connectWallet(page);
    await waitForWalletConnected(page);

    // Enter HYD amount
    const amountInput = page.locator('input[placeholder*="HYD"]').first();
    await amountInput.fill('1000');

    // Select 4-year lock duration
    await page.click('[data-testid="duration-selector"]');
    await page.click('text=/4 years|4年/');

    await page.waitForTimeout(500);

    // Verify voting power equals amount for max lock
    await expect(page.locator('text=/Voting Power.*1000|投票权.*1000/')).toBeVisible();
  });

  test('should show reduced voting power for shorter locks', async ({ page }) => {
    await connectWallet(page);
    await waitForWalletConnected(page);

    const amountInput = page.locator('input[placeholder*="HYD"]').first();
    await amountInput.fill('1000');

    // Select 1-year lock
    await page.click('[data-testid="duration-selector"]');
    await page.click('text=/1 year|1年/');

    await page.waitForTimeout(500);

    // Voting power should be ~250 (1000 * 1/4)
    await expect(page.locator('text=/Voting Power.*25[0-9]|投票权.*25[0-9]/')).toBeVisible();
  });

  test('should execute lock transaction (MOCK)', async ({ page }) => {
    await connectWallet(page);
    await waitForWalletConnected(page);

    const amountInput = page.locator('input[placeholder*="HYD"]').first();
    await amountInput.fill('500');

    await page.click('[data-testid="duration-selector"]');
    await page.click('text=/2 years|2年/');

    await page.click('button:has-text("Create Lock"), button:has-text("创建锁定")');

    await expect(page.locator('text=/Approving|Locking|授权中|锁定中/')).toBeVisible({ timeout: 5000 });
  });

  test('should display existing veNFT positions', async ({ page }) => {
    await connectWallet(page);
    await waitForWalletConnected(page);

    await expect(page.locator('text=/Your veNFTs|你的 veNFT/')).toBeVisible();

    const veNFTCard = page.locator('[data-testid="venft-card"]').first();
    if (await veNFTCard.isVisible()) {
      await expect(veNFTCard.locator('text=/Token ID|#/')).toBeVisible();
      await expect(veNFTCard.locator('text=/Locked Amount|锁定数量/')).toBeVisible();
      await expect(veNFTCard.locator('text=/Unlock Date|解锁日期/')).toBeVisible();
    }
  });

  test('should support increasing lock amount', async ({ page }) => {
    await connectWallet(page);
    await waitForWalletConnected(page);

    const veNFTCard = page.locator('[data-testid="venft-card"]').first();
    if (await veNFTCard.isVisible()) {
      await veNFTCard.locator('button:has-text("Increase"), button:has-text("增加")').click();

      const increaseInput = page.locator('input[placeholder*="amount"]');
      await increaseInput.fill('100');

      await page.click('button:has-text("Confirm"), button:has-text("确认")');

      await expect(page.locator('text=/Increasing|增加中/')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should support extending lock duration', async ({ page }) => {
    await connectWallet(page);
    await waitForWalletConnected(page);

    const veNFTCard = page.locator('[data-testid="venft-card"]').first();
    if (await veNFTCard.isVisible()) {
      await veNFTCard.locator('button:has-text("Extend"), button:has-text("延长")').click();

      await page.click('[data-testid="new-duration-selector"]');
      await page.click('text=/4 years|4年/');

      await page.click('button:has-text("Confirm"), button:has-text("确认")');

      await expect(page.locator('text=/Extending|延长中/')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should meet Core Web Vitals thresholds', async ({ page }) => {
    const vitals = await measureCoreWebVitals(page);
    const { passed } = checkThresholds(vitals);
    expect(passed).toBe(true);
  });
});
