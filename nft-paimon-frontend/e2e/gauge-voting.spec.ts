/**
 * E2E Tests for Gauge Voting and Rewards
 *
 * Tests cover:
 * - Gauge pool list
 * - Vote weight allocation
 * - Bribe rewards
 * - Vote history
 */

import { test, expect } from '@playwright/test';
import { connectWallet, waitForWalletConnected } from './utils/web3-setup';
import { measureCoreWebVitals, checkThresholds } from './utils/core-web-vitals';

test.describe('Gauge Voting Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/vote');
    await page.waitForLoadState('networkidle');
  });

  test('should display gauge voting interface', async ({ page }) => {
    await expect(page).toHaveTitle(/Vote|Gauge|投票|权重/);
    await expect(page.locator('text=/Gauges|权重池/')).toBeVisible();
  });

  test('should show gauge pool list', async ({ page }) => {
    await expect(page.locator('[data-testid="gauge-item"]').first()).toBeVisible();

    const firstGauge = page.locator('[data-testid="gauge-item"]').first();
    await expect(firstGauge.locator('text=/Pool|池子/')).toBeVisible();
    await expect(firstGauge.locator('text=/Current Weight|当前权重/')).toBeVisible();
    await expect(firstGauge.locator('text=/APR/')).toBeVisible();
  });

  test('should allocate vote weights', async ({ page }) => {
    await connectWallet(page);
    await waitForWalletConnected(page);

    const firstGauge = page.locator('[data-testid="gauge-item"]').first();
    await firstGauge.click('button:has-text("Vote"), button:has-text("投票")');

    const weightInput = page.locator('input[placeholder*="weight"]');
    await weightInput.fill('50');

    await page.click('button:has-text("Confirm"), button:has-text("确认")');

    await expect(page.locator('text=/Voting|投票中/')).toBeVisible({ timeout: 5000 });
  });

  test('should show total weight allocation must equal 100%', async ({ page }) => {
    await connectWallet(page);
    await waitForWalletConnected(page);

    await expect(page.locator('text=/Total.*100%|总计.*100%/')).toBeVisible();
  });

  test('should display bribe rewards', async ({ page }) => {
    await connectWallet(page);
    await waitForWalletConnected(page);

    const bribesSection = page.locator('text=/Bribes|贿赂/');
    if (await bribesSection.isVisible()) {
      await expect(page.locator('[data-testid="bribe-item"]').first()).toBeVisible();
      await expect(page.locator('text=/Claim|领取/')).toBeVisible();
    }
  });

  test('should meet Core Web Vitals thresholds', async ({ page }) => {
    const vitals = await measureCoreWebVitals(page);
    const { passed } = checkThresholds(vitals);
    expect(passed).toBe(true);
  });
});
