/**
 * E2E Tests for Vault Deposit/Borrow Flow (gap-2.1.5)
 *
 * Comprehensive tests covering:
 * 1. Complete Deposit & Borrow Flow:
 *    - Authorize HYD token
 *    - Deposit 1000 HYD
 *    - Borrow 800 USDP (80% LTV)
 *    - Verify collateral ratio display
 *    - Verify USDP balance increase
 *
 * 2. Repay Flow:
 *    - Authorize USDP token
 *    - Repay 400 USDP
 *    - Verify debt decreased
 *    - Verify collateral ratio improved
 *
 * 3. Boundary Tests:
 *    - Attempting to borrow beyond LTV fails
 *    - Collateral ratio below liquidation threshold shows warning
 */

import { test, expect } from '@playwright/test';
import { connectWallet, waitForWalletConnected, waitForTransaction, dismissNotifications } from './utils/web3-setup';

test.describe('Vault Deposit & Borrow Flow (gap-2.1.5)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to treasury page
    await page.goto('/treasury');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Connect wallet
    await connectWallet(page);
    await waitForWalletConnected(page);

    // Dismiss any initial notifications
    await dismissNotifications(page);
  });

  /**
   * TEST 1: Complete Deposit & Borrow Flow
   *
   * Steps:
   * 1. Select HYD token
   * 2. Enter 1000 HYD deposit amount
   * 3. Approve HYD token (if needed)
   * 4. Deposit 1000 HYD
   * 5. Borrow 800 USDP (80% LTV)
   * 6. Verify collateral ratio = 125% (1000/800)
   * 7. Verify USDP balance increased
   */
  test('[TEST 1] should complete full deposit and borrow flow with authorization', async ({ page }) => {
    // === Step 1: Select HYD Token ===
    await page.click('[data-testid="rwa-asset-selector"]');
    await page.click('text=/HYD|T1.*80%/');

    // === Step 2: Enter Deposit Amount ===
    const amountInput = page.locator('input[type="number"], input[placeholder*="amount"]').first();
    await amountInput.fill('1000');
    await page.waitForTimeout(500); // Wait for preview calculation

    // === Step 3: Verify Preview Calculation ===
    // Should show max borrow = 1000 * 0.80 = 800 USDP
    await expect(page.locator('text=/800.*USDP/i')).toBeVisible();

    // === Step 4: Check if Approval Needed ===
    const approveButton = page.locator('button:has-text("Approve"), button:has-text("授权")');
    const depositButton = page.locator('button:has-text("Deposit"), button:has-text("存入")');

    // Check current allowance
    const needsApproval = await approveButton.isVisible();

    if (needsApproval) {
      // === Step 5: Approve HYD Token ===
      console.log('🔑 Authorization needed - clicking Approve button');
      await approveButton.click();

      // Wait for approval transaction to initiate
      await expect(page.locator('text=/Approving|授权中/i')).toBeVisible({ timeout: 5000 });

      // In real environment with MetaMask:
      // 1. MetaMask popup would appear
      // 2. User confirms approval transaction
      // 3. Wait for tx confirmation on blockchain

      // Wait for approval to complete
      await waitForTransaction(page, 30000);

      console.log('✅ Approval transaction confirmed');

      // Wait for UI to update
      await page.waitForTimeout(1000);
    } else {
      console.log('✅ Sufficient allowance already exists');
    }

    // === Step 6: Deposit HYD ===
    await expect(depositButton).toBeEnabled({ timeout: 5000 });
    await depositButton.click();

    console.log('💰 Deposit transaction initiated');

    // Wait for deposit transaction
    await expect(page.locator('text=/Depositing|存入中/i')).toBeVisible({ timeout: 5000 });

    // In real environment:
    // 1. MetaMask popup for deposit transaction
    // 2. User confirms deposit
    // 3. Wait for tx confirmation

    await waitForTransaction(page, 30000);

    console.log('✅ Deposit transaction confirmed');

    // Dismiss success notification
    await dismissNotifications(page);

    // === Step 7: Navigate to Borrow Section ===
    const borrowTab = page.locator('button:has-text("Borrow"), button:has-text("借款")');
    await borrowTab.click();
    await page.waitForTimeout(500);

    // === Step 8: Verify Available Borrow Capacity ===
    // Should show ~800 USDP available (80% LTV of 1000 HYD)
    await expect(page.locator('text=/Available.*800/i')).toBeVisible();

    // === Step 9: Enter Borrow Amount ===
    const borrowInput = page.locator('input[type="number"]').last();
    await borrowInput.fill('800');
    await page.waitForTimeout(500);

    // === Step 10: Verify Collateral Ratio Preview ===
    // Health factor should be ~125% (1000 / 800)
    await expect(page.locator('text=/Health.*Factor.*125%|健康因子.*125%/i')).toBeVisible();

    // === Step 11: Execute Borrow ===
    const borrowButton = page.locator('button:has-text("Borrow"), button:has-text("借出")').last();
    await borrowButton.click();

    console.log('📤 Borrow transaction initiated');

    await expect(page.locator('text=/Borrowing|借款中/i')).toBeVisible({ timeout: 5000 });

    // In real environment:
    // 1. MetaMask popup for borrow transaction
    // 2. User confirms borrow
    // 3. USDP minted and sent to user wallet

    await waitForTransaction(page, 30000);

    console.log('✅ Borrow transaction confirmed');

    // === Step 12: Verify Position Created ===
    const positionCard = page.locator('[data-testid="position-card"]').first();
    await expect(positionCard).toBeVisible({ timeout: 5000 });

    // Verify position details
    await expect(positionCard.locator('text=/1000.*HYD/i')).toBeVisible(); // Deposited amount
    await expect(positionCard.locator('text=/800.*USDP/i')).toBeVisible(); // Borrowed amount
    await expect(positionCard.locator('text=/125%|1.25/i')).toBeVisible(); // Health factor

    // === Step 13: Verify USDP Balance Increased ===
    // Check wallet USDP balance
    await expect(page.locator('[data-testid="usdp-balance"]')).toContainText(/800|[8-9]\d{2}/);

    console.log('✅ Full deposit & borrow flow completed successfully');
  });

  /**
   * TEST 2: Repay Flow
   *
   * Steps:
   * 1. Navigate to Repay section
   * 2. Enter 400 USDP repay amount
   * 3. Approve USDP token (if needed)
   * 4. Repay 400 USDP
   * 5. Verify debt decreased to 400 USDP
   * 6. Verify collateral ratio improved to 250% (1000 / 400)
   */
  test('[TEST 2] should complete repay flow with USDP authorization', async ({ page }) => {
    // Prerequisites: User has an existing position
    // (In real test, would first execute deposit & borrow from TEST 1)

    // === Step 1: Navigate to Repay Section ===
    const repayTab = page.locator('button:has-text("Repay"), button:has-text("还款")');
    await repayTab.click();
    await page.waitForTimeout(500);

    // === Step 2: Verify Current Debt Display ===
    // Should show current debt amount
    await expect(page.locator('text=/Current Debt|当前债务/i')).toBeVisible();
    const currentDebt = page.locator('[data-testid="current-debt"]');
    await expect(currentDebt).toBeVisible();

    // === Step 3: Enter Repay Amount ===
    const repayInput = page.locator('input[type="number"]').first();
    await repayInput.fill('400');
    await page.waitForTimeout(500);

    // === Step 4: Verify Health Factor Preview ===
    // After repaying 400, remaining debt = 400
    // Health factor should improve to 250% (1000 / 400)
    await expect(page.locator('text=/New.*Health.*Factor.*250%|新健康因子.*250%/i')).toBeVisible();

    // === Step 5: Check if USDP Approval Needed ===
    const approveUsdpButton = page.locator('button:has-text("Approve USDP"), button:has-text("授权 USDP")');
    const repayButton = page.locator('button:has-text("Repay"), button:has-text("还款")').last();

    const needsApproval = await approveUsdpButton.isVisible();

    if (needsApproval) {
      // === Step 6: Approve USDP Token ===
      console.log('🔑 USDP authorization needed - clicking Approve button');
      await approveUsdpButton.click();

      await expect(page.locator('text=/Approving|授权中/i')).toBeVisible({ timeout: 5000 });

      // Wait for approval
      await waitForTransaction(page, 30000);

      console.log('✅ USDP approval confirmed');

      await page.waitForTimeout(1000);
    }

    // === Step 7: Execute Repay ===
    await expect(repayButton).toBeEnabled({ timeout: 5000 });
    await repayButton.click();

    console.log('💳 Repay transaction initiated');

    await expect(page.locator('text=/Repaying|还款中/i')).toBeVisible({ timeout: 5000 });

    // In real environment:
    // 1. MetaMask popup for repay transaction
    // 2. User confirms repay
    // 3. USDP burned, debt decreased

    await waitForTransaction(page, 30000);

    console.log('✅ Repay transaction confirmed');

    // === Step 8: Verify Debt Decreased ===
    await page.waitForTimeout(1000); // Wait for UI update
    const updatedDebt = page.locator('[data-testid="current-debt"]');
    await expect(updatedDebt).toContainText(/400|[3-4]\d{2}/);

    // === Step 9: Verify Health Factor Improved ===
    const positionCard = page.locator('[data-testid="position-card"]').first();
    await expect(positionCard.locator('text=/250%|2.5/i')).toBeVisible();

    console.log('✅ Repay flow completed successfully');
  });

  /**
   * TEST 3: Boundary Test - Borrowing Exceeds LTV
   *
   * Verify that attempting to borrow more than LTV limit shows error
   */
  test('[TEST 3] should prevent borrowing beyond LTV limit', async ({ page }) => {
    // === Step 1: Deposit 1000 HYD ===
    await page.click('[data-testid="rwa-asset-selector"]');
    await page.click('text=/HYD|T1.*80%/');

    const amountInput = page.locator('input[type="number"]').first();
    await amountInput.fill('1000');
    await page.waitForTimeout(500);

    // Complete deposit (assuming approval already done)
    const depositButton = page.locator('button:has-text("Deposit"), button:has-text("存入")');
    if (await depositButton.isEnabled()) {
      await depositButton.click();
      await waitForTransaction(page, 30000);
    }

    // === Step 2: Navigate to Borrow ===
    const borrowTab = page.locator('button:has-text("Borrow"), button:has-text("借款")');
    await borrowTab.click();
    await page.waitForTimeout(500);

    // === Step 3: Try to Borrow Beyond LTV (850 > 800) ===
    const borrowInput = page.locator('input[type="number"]').last();
    await borrowInput.fill('850'); // Exceeds 80% LTV
    await page.waitForTimeout(500);

    // === Step 4: Verify Error Message ===
    await expect(page.locator('text=/Exceeds.*LTV|超出.*LTV|Insufficient.*collateral|抵押不足/i')).toBeVisible();

    // === Step 5: Verify Borrow Button Disabled ===
    const borrowButton = page.locator('button:has-text("Borrow"), button:has-text("借出")').last();
    await expect(borrowButton).toBeDisabled();

    console.log('✅ LTV boundary validation works correctly');
  });

  /**
   * TEST 4: Boundary Test - Liquidation Threshold Warning
   *
   * Verify that when collateral ratio approaches liquidation threshold,
   * warning is displayed
   */
  test('[TEST 4] should show liquidation warning when health factor is low', async ({ page }) => {
    // === Step 1: Create Position Near Liquidation ===
    // Deposit 1000 HYD, borrow close to max (e.g., 790 USDP)
    await page.click('[data-testid="rwa-asset-selector"]');
    await page.click('text=/HYD|T1.*80%/');

    const amountInput = page.locator('input[type="number"]').first();
    await amountInput.fill('1000');
    await page.waitForTimeout(500);

    const depositButton = page.locator('button:has-text("Deposit"), button:has-text("存入")');
    if (await depositButton.isEnabled()) {
      await depositButton.click();
      await waitForTransaction(page, 30000);
    }

    // === Step 2: Borrow Near Maximum ===
    const borrowTab = page.locator('button:has-text("Borrow"), button:has-text("借款")');
    await borrowTab.click();
    await page.waitForTimeout(500);

    const borrowInput = page.locator('input[type="number"]').last();
    await borrowInput.fill('790'); // Close to 800 max
    await page.waitForTimeout(500);

    // === Step 3: Verify Low Health Factor Warning ===
    // Health factor = 1000 / 790 ≈ 1.27
    // Should show warning if < 1.5 (typically liquidation threshold is 1.15)
    await expect(page.locator('[data-testid="health-factor-warning"], text=/Warning.*liquidation|警告.*清算|Low.*health|健康因子.*低/i')).toBeVisible();

    // === Step 4: Verify Warning Color/Style ===
    const warningElement = page.locator('[data-testid="health-factor-warning"]').first();
    if (await warningElement.isVisible()) {
      // Verify warning has danger/warning styling
      const bgColor = await warningElement.evaluate(el => window.getComputedStyle(el).backgroundColor);
      // Should be red/orange/yellow warning color
      expect(bgColor).toMatch(/rgb\(2[0-5]\d|255/); // Contains high R value
    }

    console.log('✅ Liquidation warning displayed correctly');
  });

  /**
   * TEST 5: Multiple Collateral Types
   *
   * Verify that different RWA assets (T1, T2, T3) have correct LTV ratios
   */
  test('[TEST 5] should apply correct LTV for different RWA tiers', async ({ page }) => {
    // === Test T1 (80% LTV) ===
    await page.click('[data-testid="rwa-asset-selector"]');
    await page.click('text=/T1.*80%/');

    let amountInput = page.locator('input[type="number"]').first();
    await amountInput.fill('1000');
    await page.waitForTimeout(500);

    // Should show max borrow = 800
    await expect(page.locator('text=/800.*USDP/i')).toBeVisible();

    // === Test T2 (65% LTV) ===
    await page.click('[data-testid="rwa-asset-selector"]');
    await page.click('text=/T2.*65%/');

    amountInput = page.locator('input[type="number"]').first();
    await amountInput.fill('1000');
    await page.waitForTimeout(500);

    // Should show max borrow = 650
    await expect(page.locator('text=/650.*USDP/i')).toBeVisible();

    // === Test T3 (50% LTV) ===
    await page.click('[data-testid="rwa-asset-selector"]');
    await page.click('text=/T3.*50%/');

    amountInput = page.locator('input[type="number"]').first();
    await amountInput.fill('1000');
    await page.waitForTimeout(500);

    // Should show max borrow = 500
    await expect(page.locator('text=/500.*USDP/i')).toBeVisible();

    console.log('✅ All RWA tier LTV ratios calculated correctly');
  });

  /**
   * TEST 6: Approve Button Visibility
   *
   * Verify that Approve button only shows when allowance is insufficient
   */
  test('[TEST 6] should show Approve button only when allowance insufficient', async ({ page }) => {
    // === Step 1: Select Asset and Enter Amount ===
    await page.click('[data-testid="rwa-asset-selector"]');
    await page.click('text=/HYD|T1/');

    const amountInput = page.locator('input[type="number"]').first();
    await amountInput.fill('1000');
    await page.waitForTimeout(500);

    // === Step 2: Check Button States ===
    const approveButton = page.locator('button:has-text("Approve"), button:has-text("授权")');
    const depositButton = page.locator('button:has-text("Deposit"), button:has-text("存入")');

    const approveVisible = await approveButton.isVisible();
    const depositEnabled = await depositButton.isEnabled();

    console.log(`Approve button visible: ${approveVisible}`);
    console.log(`Deposit button enabled: ${depositEnabled}`);

    // === Step 3: Verify Mutual Exclusivity ===
    if (approveVisible) {
      // If approve button shows, deposit should be disabled or hidden
      expect(depositEnabled).toBe(false);
      console.log('✅ Approve button visible, deposit disabled (correct)');
    } else {
      // If no approve button, deposit should be enabled
      expect(depositEnabled).toBe(true);
      console.log('✅ No approve needed, deposit enabled (correct)');
    }
  });

  /**
   * TEST 7: Transaction State Transitions
   *
   * Verify UI shows correct states during transaction lifecycle
   */
  test('[TEST 7] should show correct transaction states', async ({ page }) => {
    // === Step 1: Initiate Deposit ===
    await page.click('[data-testid="rwa-asset-selector"]');
    await page.click('text=/HYD|T1/');

    const amountInput = page.locator('input[type="number"]').first();
    await amountInput.fill('100');
    await page.waitForTimeout(500);

    const depositButton = page.locator('button:has-text("Deposit"), button:has-text("存入")');
    await depositButton.click();

    // === Step 2: Verify "Depositing" State ===
    const depositingIndicator = page.locator('text=/Depositing|存入中/i');
    await expect(depositingIndicator).toBeVisible({ timeout: 5000 });

    // Should show loading spinner
    await expect(page.locator('[role="progressbar"], .MuiCircularProgress-root')).toBeVisible();

    // Deposit button should be disabled during transaction
    await expect(depositButton).toBeDisabled();

    console.log('✅ Transaction state indicators working correctly');
  });

  /**
   * TEST 8: Decimal Precision
   *
   * Verify calculations handle decimal inputs correctly
   */
  test('[TEST 8] should handle decimal amounts correctly', async ({ page }) => {
    // === Test with Decimal Input ===
    await page.click('[data-testid="rwa-asset-selector"]');
    await page.click('text=/HYD|T1.*80%/');

    const amountInput = page.locator('input[type="number"]').first();
    await amountInput.fill('123.456789');
    await page.waitForTimeout(500);

    // Expected borrow = 123.456789 * 0.80 = 98.7654312
    // Should display with reasonable precision (e.g., 98.77 or 98.765)
    await expect(page.locator('text=/98\\.7[0-9]{1,4}.*USDP/i')).toBeVisible();

    console.log('✅ Decimal precision handled correctly');
  });

  /**
   * TEST 9: Zero Amount Validation
   *
   * Verify that zero or negative amounts are rejected
   */
  test('[TEST 9] should reject zero and negative amounts', async ({ page }) => {
    await page.click('[data-testid="rwa-asset-selector"]');
    await page.click('text=/HYD|T1/');

    const amountInput = page.locator('input[type="number"]').first();
    const depositButton = page.locator('button:has-text("Deposit"), button:has-text("存入")');

    // === Test Zero Amount ===
    await amountInput.fill('0');
    await page.waitForTimeout(500);

    await expect(depositButton).toBeDisabled();
    await expect(page.locator('text=/Enter.*amount|输入金额|Amount.*required|金额.*必填/i')).toBeVisible();

    // === Test Negative Amount ===
    await amountInput.fill('-100');
    await page.waitForTimeout(500);

    await expect(depositButton).toBeDisabled();

    console.log('✅ Zero and negative amount validation working');
  });

  /**
   * TEST 10: Responsive Layout
   *
   * Verify deposit/borrow form works on mobile devices
   */
  test('[TEST 10] should be usable on mobile devices', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }

    // === Verify Mobile Layout ===
    await page.click('[data-testid="rwa-asset-selector"]');
    await page.click('text=/HYD|T1/');

    const amountInput = page.locator('input[type="number"]').first();
    await expect(amountInput).toBeVisible();

    // Input should be large enough for mobile touch
    const inputBox = await amountInput.boundingBox();
    expect(inputBox?.height).toBeGreaterThanOrEqual(44); // iOS minimum touch target

    // Fill input on mobile
    await amountInput.fill('100');

    // Verify input is readable
    await expect(amountInput).toHaveValue('100');

    // Buttons should be touch-friendly
    const depositButton = page.locator('button:has-text("Deposit"), button:has-text("存入")');
    const buttonBox = await depositButton.boundingBox();
    expect(buttonBox?.height).toBeGreaterThanOrEqual(44);

    console.log('✅ Mobile responsiveness verified');
  });
});
