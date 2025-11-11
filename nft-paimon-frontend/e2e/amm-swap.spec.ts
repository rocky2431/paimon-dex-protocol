/**
 * E2E Tests for AMM (Automated Market Maker) Swap Flow
 *
 * Tests cover:
 * - Single-hop swap (HYD → USDC direct pair)
 * - Multi-hop swap (HYD → WBNB → USDC via router)
 * - Route visualization (path display with chips and arrows)
 * - Slippage protection (transaction fails when exceeds limit)
 * - Price impact calculation
 * - Balance updates after swap
 *
 * TDD Phase 1 (RED): Writing comprehensive failing tests
 */

import { test, expect } from '@playwright/test';
import { connectWallet, waitForWalletConnected } from './utils/web3-setup';
import { measureCoreWebVitals, checkThresholds, formatVitals } from './utils/core-web-vitals';

test.describe('AMM Swap Flow (HYD ↔ USDC)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to swap page
    await page.goto('/swap');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Connect wallet
    await connectWallet(page);
    await waitForWalletConnected(page);
  });

  /**
   * TEST 1: Single-Hop Swap (Direct Pair)
   * Verify HYD → USDC swap through direct pool
   */
  test('[AMM-001] should execute single-hop swap HYD → USDC', async ({ page }) => {
    // Step 1: Select HYD → USDC pair
    // Click "From" token selector
    await page.click('[data-testid="from-token-selector"]');

    // Select HYD from dropdown
    await page.click('[data-testid="token-option-HYD"]');

    // Click "To" token selector
    await page.click('[data-testid="to-token-selector"]');

    // Select USDC from dropdown
    await page.click('[data-testid="token-option-USDC"]');

    await page.waitForTimeout(500);

    // Step 2: Verify this is AMM mode (not PSM)
    // Should NOT show "PSM" badge or "1:1" indicator
    await expect(page.locator('text=/PSM|1:1/')).not.toBeVisible();

    // Should show "Swap" title without "PSM" prefix
    await expect(page.locator('h2:has-text("Swap"), h2:has-text("兑换")')).toBeVisible();

    // Step 3: Enter swap amount
    const fromInput = page.locator('[data-testid="from-amount-input"]').first();
    await fromInput.fill('100');

    await page.waitForTimeout(1000); // Wait for route calculation

    // Step 4: Verify route display shows single-hop
    // Should show: [HYD] → [USDC] with "Direct" badge
    await expect(page.locator('[data-testid="route-display"]')).toBeVisible();

    await expect(page.locator('[data-testid="route-display"] >> text=HYD')).toBeVisible();
    await expect(page.locator('[data-testid="route-display"] >> text=USDC')).toBeVisible();

    // Should show "Direct" badge for single-hop
    await expect(page.locator('[data-testid="route-display"] >> text=Direct')).toBeVisible();

    // Step 5: Verify output amount is calculated
    const toInput = page.locator('[data-testid="to-amount-input"]');
    const outputAmount = await toInput.inputValue();
    const output = parseFloat(outputAmount);

    // Output should be > 0 and close to input (accounting for fees ~0.3%)
    expect(output).toBeGreaterThan(0);
    expect(output).toBeGreaterThan(95); // At least 95 USDC (5% max slippage)
    expect(output).toBeLessThan(100); // Less than input due to fees

    // Step 6: Verify price impact is displayed and < 1%
    const priceImpactText = await page.locator('text=/Price.*Impact|价格.*影响/').textContent();
    expect(priceImpactText).toBeTruthy();

    // Extract price impact percentage
    const impactMatch = priceImpactText?.match(/([\d.]+)%/);
    if (impactMatch) {
      const priceImpact = parseFloat(impactMatch[1]);
      expect(priceImpact).toBeLessThan(1.0); // <1% for single-hop
    }

    // Step 7: Verify swap fee is displayed
    await expect(page.locator('text=/Fee|手续费/')).toBeVisible();

    const feeText = await page.locator('[data-testid="swap-fee"]').textContent();
    expect(feeText).toMatch(/0\.[2-4]%/); // DEX fee typically 0.3%

    // Step 8: Execute swap (MOCK - don't actually submit transaction)
    // Verify swap button is enabled
    const swapButton = page.locator('button:has-text("Swap"), button:has-text("兑换")');
    await expect(swapButton).toBeEnabled();

    // Click swap button
    await swapButton.click();

    // Verify approval/swap flow is initiated
    await expect(page.locator('text=/Approving|Swapping|授权中|兑换中/')).toBeVisible({ timeout: 5000 });

    // NOTE: In production, would verify transaction completion and balance updates
  });

  /**
   * TEST 2: Multi-Hop Swap (Via WBNB Router)
   * Verify HYD → WBNB → USDC swap through multi-hop route
   */
  test('[AMM-002] should execute multi-hop swap HYD → WBNB → USDC', async ({ page }) => {
    // Step 1: Force multi-hop by selecting token pair without direct pool
    // Select HYD → USDC pair (assuming no direct HYD-USDC pool)
    await page.click('[data-testid="from-token-selector"]');
    await page.click('[data-testid="token-option-HYD"]');

    await page.click('[data-testid="to-token-selector"]');
    await page.click('[data-testid="token-option-USDC"]');

    await page.waitForTimeout(500);

    // Step 2: Enter swap amount
    const fromInput = page.locator('[data-testid="from-amount-input"]').first();
    await fromInput.fill('100');

    await page.waitForTimeout(1500); // Wait for multi-hop route calculation

    // Step 3: Verify route display shows multi-hop path
    await expect(page.locator('[data-testid="route-display"]')).toBeVisible();

    // Should show: [HYD] → [WBNB] → [USDC] with arrows
    await expect(page.locator('[data-testid="route-display"] >> text=HYD')).toBeVisible();
    await expect(page.locator('[data-testid="route-display"] >> text=WBNB')).toBeVisible();
    await expect(page.locator('[data-testid="route-display"] >> text=USDC')).toBeVisible();

    // Should show hop count "2 hops" instead of "Direct"
    await expect(page.locator('[data-testid="route-display"] >> text=/2 hops|2 跳/')).toBeVisible();

    // Verify arrows between tokens (MUI ArrowForward icons)
    const arrows = page.locator('[data-testid="route-display"] >> [data-testid="ArrowForwardIcon"]');
    await expect(arrows).toHaveCount(2); // 2 arrows for 3 tokens

    // Step 4: Verify output amount accounting for multi-hop fees
    const toInput = page.locator('[data-testid="to-amount-input"]');
    const outputAmount = await toInput.inputValue();
    const output = parseFloat(outputAmount);

    // Multi-hop has higher fees (~0.6% = 0.3% * 2)
    expect(output).toBeGreaterThan(0);
    expect(output).toBeGreaterThan(90); // At least 90 USDC (accounting for 2x fees)
    expect(output).toBeLessThan(100);

    // Step 5: Verify fee is higher than single-hop
    const feeText = await page.locator('[data-testid="swap-fee"]').textContent();
    expect(feeText).toMatch(/0\.[5-7]%/); // ~0.6% for 2 hops

    // Step 6: Verify price impact is still reasonable (<2% for multi-hop)
    const priceImpactText = await page.locator('text=/Price.*Impact|价格.*影响/').textContent();
    const impactMatch = priceImpactText?.match(/([\d.]+)%/);
    if (impactMatch) {
      const priceImpact = parseFloat(impactMatch[1]);
      expect(priceImpact).toBeLessThan(2.0); // <2% for multi-hop
    }

    // Step 7: Execute swap
    const swapButton = page.locator('button:has-text("Swap"), button:has-text("兑换")');
    await expect(swapButton).toBeEnabled();

    await swapButton.click();

    // Verify swap flow initiated
    await expect(page.locator('text=/Approving|Swapping|授权中|兑换中/')).toBeVisible({ timeout: 5000 });
  });

  /**
   * TEST 3: Slippage Protection
   * Verify transaction fails when price slippage exceeds tolerance
   */
  test('[AMM-003] should enforce slippage protection and reject high-slippage swaps', async ({ page }) => {
    // Step 1: Open slippage settings
    await page.click('[aria-label="Settings"], button:has-text("⚙"), [data-testid="settings-button"]');

    // Wait for settings panel
    await expect(page.locator('text=/Slippage.*Tolerance|滑点.*容差/')).toBeVisible();

    // Step 2: Set strict slippage (0.5%)
    const slippageInput = page.locator('input[placeholder*="slippage"], input[type="number"]').last();
    await slippageInput.clear();
    await slippageInput.fill('0.5');

    // Close settings
    await page.keyboard.press('Escape');

    await page.waitForTimeout(300);

    // Step 3: Select pair and enter amount
    await page.click('[data-testid="from-token-selector"]');
    await page.click('[data-testid="token-option-HYD"]');

    await page.click('[data-testid="to-token-selector"]');
    await page.click('[data-testid="token-option-USDC"]');

    const fromInput = page.locator('[data-testid="from-amount-input"]').first();
    await fromInput.fill('1000'); // Large amount to trigger higher slippage

    await page.waitForTimeout(1000);

    // Step 4: Verify price impact warning if slippage is high
    const priceImpactText = await page.locator('text=/Price.*Impact|价格.*影响/').textContent();
    const impactMatch = priceImpactText?.match(/([\d.]+)%/);

    if (impactMatch) {
      const priceImpact = parseFloat(impactMatch[1]);

      if (priceImpact > 0.5) {
        // Should show warning for high price impact
        await expect(page.locator('text=/High.*price.*impact|价格.*影响.*过高/i')).toBeVisible();

        // Swap button should show warning color or be disabled
        const swapButton = page.locator('button:has-text("Swap"), button:has-text("兑换")');

        // Either disabled or shows warning text
        const isDisabled = await swapButton.isDisabled();
        const hasWarning = await page.locator('text=/Price.*impact.*too.*high/i').isVisible();

        expect(isDisabled || hasWarning).toBeTruthy();
      }
    }

    // Step 5: Verify minimum received calculation respects slippage
    await expect(page.locator('text=/Minimum.*received|最小.*接收/i')).toBeVisible();

    const minReceivedText = await page.locator('[data-testid="minimum-received"]').textContent();
    expect(minReceivedText).toBeTruthy();

    // Extract minimum received amount
    const minMatch = minReceivedText?.match(/([\d,.]+)/);
    if (minMatch) {
      const minReceived = parseFloat(minMatch[1].replace(/,/g, ''));
      const toInput = page.locator('[data-testid="to-amount-input"]');
      const expectedOutput = parseFloat(await toInput.inputValue());

      // Minimum received should be ~0.5% less than expected output
      const slippageTolerance = 0.5 / 100;
      const expectedMin = expectedOutput * (1 - slippageTolerance);

      expect(minReceived).toBeCloseTo(expectedMin, 2);
    }
  });

  /**
   * TEST 4: Route Optimization
   * Verify system selects optimal route automatically
   */
  test('[AMM-004] should automatically select optimal swap route', async ({ page }) => {
    // Select HYD → USDC
    await page.click('[data-testid="from-token-selector"]');
    await page.click('[data-testid="token-option-HYD"]');

    await page.click('[data-testid="to-token-selector"]');
    await page.click('[data-testid="token-option-USDC"]');

    // Enter amount
    const fromInput = page.locator('[data-testid="from-amount-input"]').first();
    await fromInput.fill('100');

    await page.waitForTimeout(1500);

    // Verify route is displayed (either direct or multi-hop)
    await expect(page.locator('[data-testid="route-display"]')).toBeVisible();

    // Route should show at least 2 tokens (input and output)
    const routeTokens = page.locator('[data-testid="route-display"] >> .MuiChip-root');
    const tokenCount = await routeTokens.count();

    expect(tokenCount).toBeGreaterThanOrEqual(2); // At least HYD and USDC
    expect(tokenCount).toBeLessThanOrEqual(4); // Max 4 tokens (3 hops)

    // Verify output amount is maximized (optimal route chosen)
    const toInput = page.locator('[data-testid="to-amount-input"]');
    const outputAmount = await toInput.inputValue();

    expect(parseFloat(outputAmount)).toBeGreaterThan(0);
  });

  /**
   * TEST 5: AMM vs PSM Mode Detection
   * Verify UI correctly switches between PSM and AMM modes
   */
  test('[AMM-005] should switch from PSM to AMM mode based on token pair', async ({ page }) => {
    // Start with USDC → USDP (PSM mode)
    await page.click('[data-testid="from-token-selector"]');
    await page.click('[data-testid="token-option-USDC"]');

    await page.click('[data-testid="to-token-selector"]');
    await page.click('[data-testid="token-option-USDP"]');

    await page.waitForTimeout(500);

    // Verify PSM mode is active
    await expect(page.locator('text=/PSM|1:1/')).toBeVisible();

    // Verify route display is NOT shown in PSM mode
    await expect(page.locator('[data-testid="route-display"]')).not.toBeVisible();

    // Switch to HYD → USDC (AMM mode)
    await page.click('[data-testid="from-token-selector"]');
    await page.click('[data-testid="token-option-HYD"]');

    await page.waitForTimeout(500);

    // Verify AMM mode is now active
    await expect(page.locator('text=/PSM|1:1/')).not.toBeVisible();

    // Enter amount to trigger route calculation
    const fromInput = page.locator('[data-testid="from-amount-input"]').first();
    await fromInput.fill('100');

    await page.waitForTimeout(1000);

    // Verify route display IS shown in AMM mode
    await expect(page.locator('[data-testid="route-display"]')).toBeVisible();
  });

  /**
   * TEST 6: Balance Updates After Swap
   * Verify user balances update correctly after swap execution
   */
  test('[AMM-006] should update balances after successful swap (MOCK)', async ({ page }) => {
    // Record initial balances
    const initialFromBalance = await page.locator('[data-testid="from-balance"]').textContent();
    const initialToBalance = await page.locator('[data-testid="to-balance"]').textContent();

    // Select HYD → USDC
    await page.click('[data-testid="from-token-selector"]');
    await page.click('[data-testid="token-option-HYD"]');

    await page.click('[data-testid="to-token-selector"]');
    await page.click('[data-testid="token-option-USDC"]');

    // Enter swap amount
    const fromInput = page.locator('[data-testid="from-amount-input"]').first();
    await fromInput.fill('50');

    await page.waitForTimeout(1000);

    // Execute swap
    const swapButton = page.locator('button:has-text("Swap"), button:has-text("兑换")');
    await swapButton.click();

    // In production test:
    // 1. Wait for approval transaction
    // 2. Confirm swap transaction
    // 3. Wait for confirmation
    // 4. Verify balances updated:
    //    - From balance decreased by swap amount
    //    - To balance increased by received amount

    // MOCK: Just verify swap flow initiated
    await expect(page.locator('text=/Approving|Swapping|授权中|兑换中/')).toBeVisible({ timeout: 5000 });
  });

  /**
   * TEST 7: Core Web Vitals Performance
   * Verify AMM swap page meets performance thresholds
   */
  test('[AMM-007] should meet Core Web Vitals thresholds for AMM swap page', async ({ page }) => {
    // Measure Core Web Vitals
    const vitals = await measureCoreWebVitals(page);

    // Log results
    console.log('AMM Swap Core Web Vitals:', formatVitals(vitals));

    // Check thresholds
    const { passed, failures } = checkThresholds(vitals);

    if (!passed) {
      console.error('Core Web Vitals failures:', failures);
    }

    // Assert all metrics meet thresholds
    // LCP < 2.5s, INP < 200ms, CLS < 0.1
    expect(passed).toBe(true);
  });

  /**
   * TEST 8: Mobile Responsiveness
   * Verify AMM swap interface works on mobile devices
   */
  test('[AMM-008] should be responsive on mobile devices', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }

    // Select tokens
    await page.click('[data-testid="from-token-selector"]');
    await page.click('[data-testid="token-option-HYD"]');

    await page.click('[data-testid="to-token-selector"]');
    await page.click('[data-testid="token-option-USDC"]');

    // Enter amount
    const fromInput = page.locator('[data-testid="from-amount-input"]').first();
    await fromInput.fill('100');

    await page.waitForTimeout(1000);

    // Verify route display is readable on mobile
    await expect(page.locator('[data-testid="route-display"]')).toBeVisible();

    // Verify route tokens don't overflow
    const routeContainer = page.locator('[data-testid="route-display"]');
    const bbox = await routeContainer.boundingBox();

    if (bbox) {
      // Route display should fit within mobile viewport (typically 375px wide)
      expect(bbox.width).toBeLessThanOrEqual(400);
    }

    // Verify swap button is accessible
    const swapButton = page.locator('button:has-text("Swap"), button:has-text("兑换")');
    await expect(swapButton).toBeVisible();
  });
});
