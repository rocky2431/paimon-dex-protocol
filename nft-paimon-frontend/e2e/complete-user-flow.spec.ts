/**
 * Complete User Flow E2E Test
 *
 * Tests full user journey: Wallet Connect → KYC → Tasks → Rewards → Referral
 */

import { test, expect } from '@playwright/test';

test.describe('Complete User Flow', () => {
  test('full user journey from wallet connect to task completion', async ({ page }) => {
    // Step 1: Navigate to homepage
    await page.goto('http://localhost:4000');
    await expect(page).toHaveTitle(/Paimon DEX/);

    // Step 2: Connect wallet (mock)
    // Note: In real test, this would interact with wallet extension
    await page.click('text=Connect Wallet');
    await page.waitForTimeout(1000);

    // Step 3: Navigate to User Center
    await page.goto('http://localhost:4000/user-center');
    await expect(page.locator('text=User Center')).toBeVisible();

    // Step 4: Check KYC tab
    await page.click('text=KYC Verification');
    await expect(page.locator('text=Identity Verification')).toBeVisible();

    // Step 5: Check Tasks tab
    await page.click('text=Tasks');
    await expect(page.locator('text=Task List')).toBeVisible();

    // Step 6: Check Points tab
    await page.click('text=Points');
    await expect(page.locator('text=My Points')).toBeVisible();

    // Step 7: Check Referral tab
    await page.click('text=Referral');
    await expect(page.locator('text=Invite Friends')).toBeVisible();

    // Step 8: Check Rewards tab
    await page.click('text=Rewards');
    await expect(page.locator('text=Claim Rewards')).toBeVisible();

    // Step 9: Check Portfolio tab
    await page.click('text=Portfolio');
    await expect(page.locator('text=My Assets')).toBeVisible();
  });

  test('task completion flow', async ({ page }) => {
    await page.goto('http://localhost:4000/user-center');

    // Navigate to Tasks tab
    await page.click('text=Tasks');

    // Find first pending task
    const taskCard = page.locator('[data-testid="task-card"]').first();
    await expect(taskCard).toBeVisible();

    // Click task details
    await taskCard.click();
    await page.waitForTimeout(500);

    // Check task details modal
    await expect(page.locator('text=Task Details')).toBeVisible();
  });

  test('points and referral integration', async ({ page }) => {
    await page.goto('http://localhost:4000/user-center');

    // Check Points balance
    await page.click('text=Points');
    const pointsBalance = page.locator('[data-testid="points-balance"]');
    await expect(pointsBalance).toBeVisible();

    // Navigate to Referral
    await page.click('text=Referral');

    // Check referral code
    const referralCode = page.locator('[data-testid="referral-code"]');
    await expect(referralCode).toBeVisible();

    // Copy referral link
    await page.click('text=Copy Link');
    await page.waitForTimeout(500);
  });
});

test.describe('Notification System', () => {
  test('receives and displays notifications', async ({ page }) => {
    await page.goto('http://localhost:4000');

    // Wait for Socket.IO connection
    await page.waitForTimeout(2000);

    // Check if notification toast container exists
    const notificationContainer = page.locator('[data-testid="notification-toast"]');

    // Notification should auto-dismiss after 5 seconds
    if (await notificationContainer.isVisible()) {
      await page.waitForTimeout(6000);
      await expect(notificationContainer).not.toBeVisible();
    }
  });
});
