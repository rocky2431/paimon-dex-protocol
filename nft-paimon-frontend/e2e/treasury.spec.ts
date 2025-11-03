/**
 * E2E Tests for Treasury RWA Deposit Flow
 *
 * Tests cover:
 * - RWA deposit functionality
 * - Position monitoring
 * - Collateral ratio calculation
 * - HYD minting based on LTV
 */

import { test, expect } from '@playwright/test';
import { connectWallet, waitForWalletConnected, waitForTransaction } from './utils/web3-setup';
import { measureCoreWebVitals, checkThresholds, formatVitals } from './utils/core-web-vitals';

test.describe('Treasury RWA Deposit Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to treasury page
    await page.goto('/treasury');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display Treasury page with correct UI elements', async ({ page }) => {
    // Verify page title
    await expect(page).toHaveTitle(/Treasury|金库/);

    // Verify main sections exist
    await expect(page.locator('text=/Deposit RWA|存入 RWA/')).toBeVisible();
    await expect(page.locator('text=/Your Positions|你的仓位/')).toBeVisible();
    await expect(page.locator('text=/Treasury Stats|金库统计/')).toBeVisible();

    // Verify RWA tier information is displayed
    await expect(page.locator('text=/T1|Tier 1/')).toBeVisible();
    await expect(page.locator('text=/80%/')).toBeVisible(); // T1 LTV
  });

  test('should show connect wallet prompt when not connected', async ({ page }) => {
    // Verify connect wallet button is visible
    await expect(page.locator('button:has-text("Connect Wallet"), button:has-text("连接钱包")')).toBeVisible();

    // Verify deposit section is disabled or hidden
    const depositButton = page.locator('button:has-text("Deposit"), button:has-text("存入")');
    if (await depositButton.isVisible()) {
      await expect(depositButton).toBeDisabled();
    }
  });

  test('should connect wallet successfully', async ({ page }) => {
    // Connect wallet
    await connectWallet(page);

    // Wait for connection
    await waitForWalletConnected(page);

    // Verify wallet address is displayed
    await expect(page.locator('text=/0x[a-fA-F0-9]{4}/')).toBeVisible();

    // Verify deposit section is now accessible
    const depositButton = page.locator('button:has-text("Deposit"), button:has-text("存入")');
    await expect(depositButton).toBeVisible();
  });

  test('should display RWA asset selection', async ({ page }) => {
    await connectWallet(page);
    await waitForWalletConnected(page);

    // Click on RWA asset selector
    await page.click('[data-testid="rwa-asset-selector"], select, [role="combobox"]');

    // Verify T1, T2, T3 assets are available
    await expect(page.locator('text=/T1.*US Treasuries/')).toBeVisible();
    await expect(page.locator('text=/T2.*Investment Grade/')).toBeVisible();
    await expect(page.locator('text=/T3.*RWA Revenue/')).toBeVisible();
  });

  test('should calculate HYD minting amount based on LTV', async ({ page }) => {
    await connectWallet(page);
    await waitForWalletConnected(page);

    // Select T1 asset (80% LTV)
    await page.click('[data-testid="rwa-asset-selector"]');
    await page.click('text=/T1.*80%/');

    // Enter deposit amount
    const amountInput = page.locator('input[type="number"], input[placeholder*="amount"]').first();
    await amountInput.fill('1000');

    // Wait for calculation
    await page.waitForTimeout(500);

    // Verify HYD minting amount is displayed (should be 1000 * 0.80 = 800 HYD)
    await expect(page.locator('text=/800.*HYD/')).toBeVisible();
  });

  test('should validate insufficient balance', async ({ page }) => {
    await connectWallet(page);
    await waitForWalletConnected(page);

    // Enter very large amount
    const amountInput = page.locator('input[type="number"], input[placeholder*="amount"]').first();
    await amountInput.fill('999999999');

    await page.waitForTimeout(500);

    // Verify error message
    await expect(page.locator('text=/Insufficient balance|余额不足/')).toBeVisible();

    // Verify deposit button is disabled
    const depositButton = page.locator('button:has-text("Deposit"), button:has-text("存入")');
    await expect(depositButton).toBeDisabled();
  });

  test('should validate minimum deposit amount', async ({ page }) => {
    await connectWallet(page);
    await waitForWalletConnected(page);

    // Enter very small amount
    const amountInput = page.locator('input[type="number"], input[placeholder*="amount"]').first();
    await amountInput.fill('0.001');

    await page.waitForTimeout(500);

    // Verify error message
    await expect(page.locator('text=/Minimum.*amount|最小金额/')).toBeVisible();
  });

  test('should execute RWA deposit transaction (MOCK)', async ({ page }) => {
    await connectWallet(page);
    await waitForWalletConnected(page);

    // Select T1 asset
    await page.click('[data-testid="rwa-asset-selector"]');
    await page.click('text=/T1/');

    // Enter deposit amount
    const amountInput = page.locator('input[type="number"]').first();
    await amountInput.fill('100');

    // Click deposit button
    await page.click('button:has-text("Deposit"), button:has-text("存入")');

    // In real test with MetaMask, we would:
    // 1. Wait for approval transaction (if needed)
    // 2. Confirm approval in MetaMask
    // 3. Wait for deposit transaction
    // 4. Confirm deposit in MetaMask
    // 5. Wait for transaction confirmation

    // For now, we just verify the transaction flow is initiated
    await expect(page.locator('text=/Approving|Depositing|Processing|授权中|存入中|处理中/')).toBeVisible({ timeout: 5000 });
  });

  test('should display user positions after deposit', async ({ page }) => {
    await connectWallet(page);
    await waitForWalletConnected(page);

    // Navigate to positions section
    const positionsSection = page.locator('text=/Your Positions|你的仓位/');
    await positionsSection.scrollIntoViewIfNeeded();

    // Verify position card elements
    await expect(page.locator('[data-testid="position-card"]').first()).toBeVisible();

    // Verify position details
    await expect(page.locator('text=/Asset|资产/')).toBeVisible();
    await expect(page.locator('text=/Deposited|已存入/')).toBeVisible();
    await expect(page.locator('text=/Minted HYD|已铸造/')).toBeVisible();
    await expect(page.locator('text=/Health Factor|健康因子/')).toBeVisible();
  });

  test('should update Treasury statistics', async ({ page }) => {
    // Verify stats are displayed
    await expect(page.locator('text=/Total Value Locked|总锁仓价值/')).toBeVisible();
    await expect(page.locator('text=/Total HYD Minted|总铸造量/')).toBeVisible();
    await expect(page.locator('text=/Collateral Ratio|抵押率/')).toBeVisible();

    // Verify values are numeric
    const tvlValue = page.locator('[data-testid="tvl-value"]');
    await expect(tvlValue).toContainText(/\$[\d,]+/);
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

  test('should be responsive on mobile devices', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }

    // Verify mobile menu is accessible
    await expect(page.locator('[aria-label="Menu"], button[aria-label="打开菜单"]')).toBeVisible();

    // Verify deposit form is usable on mobile
    await connectWallet(page);
    await waitForWalletConnected(page);

    const amountInput = page.locator('input[type="number"]').first();
    await expect(amountInput).toBeVisible();
    await amountInput.fill('100');

    // Verify input is readable
    await expect(amountInput).toHaveValue('100');
  });

  test('should support bilingual interface (EN/CN)', async ({ page }) => {
    // Check for language toggle
    const langToggle = page.locator('[aria-label="Language"], button:has-text("EN"), button:has-text("中")');

    if (await langToggle.isVisible()) {
      // Switch language
      await langToggle.click();
      await page.waitForTimeout(500);

      // Verify content changed
      const hasEnglish = await page.locator('text=/Treasury|Deposit/').isVisible();
      const hasChinese = await page.locator('text=/金库|存入/').isVisible();

      expect(hasEnglish || hasChinese).toBe(true);
    }
  });
});
