/**
 * E2E Tests for User Center
 *
 * Coverage:
 * - Navigation to /user-center
 * - 6 Tab rendering
 * - Tab switching with URL sync
 * - Mobile responsive tabs
 */

import { test, expect } from '@playwright/test';

// Test data: 6 Tabs definition
const USER_CENTER_TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'positions', label: 'Positions' },
  { value: 'rewards', label: 'Rewards' },
  { value: 'kyc', label: 'KYC' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'referral', label: 'Referral' },
];

test.describe('User Center - Basic Functionality', () => {
  test('should navigate to /user-center successfully', async ({ page }) => {
    // Navigate to user center
    await page.goto('/user-center');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Verify page title or header
    await expect(page).toHaveTitle(/User Center|用户中心/);

    // Verify URL is correct
    expect(page.url()).toContain('/user-center');
  });

  test('should render all 6 tabs correctly', async ({ page }) => {
    await page.goto('/user-center');
    await page.waitForLoadState('networkidle');

    // Verify all 6 tabs are present
    for (const tab of USER_CENTER_TABS) {
      const tabElement = page.getByRole('tab', { name: new RegExp(tab.label, 'i') });
      await expect(tabElement).toBeVisible();
    }
  });

  test('should display Overview tab by default', async ({ page }) => {
    await page.goto('/user-center');
    await page.waitForLoadState('networkidle');

    // Verify Overview tab is selected
    const overviewTab = page.getByRole('tab', { name: /Overview/i });
    await expect(overviewTab).toHaveAttribute('aria-selected', 'true');

    // Verify URL has default tab param
    expect(page.url()).toMatch(/[?&]tab=overview|\/user-center(?!\?)/);
  });
});

test.describe('User Center - Tab Switching', () => {
  test('should switch tabs when clicked', async ({ page }) => {
    await page.goto('/user-center');
    await page.waitForLoadState('networkidle');

    // Click each tab and verify it becomes selected
    for (const tab of USER_CENTER_TABS.slice(1)) { // Skip first tab (already selected)
      const tabElement = page.getByRole('tab', { name: new RegExp(tab.label, 'i') });

      // Click tab
      await tabElement.click();

      // Wait for URL to update
      await page.waitForURL(`**/user-center?tab=${tab.value}*`, { timeout: 1000 });

      // Verify tab is selected
      await expect(tabElement).toHaveAttribute('aria-selected', 'true');

      // Verify URL parameter is correct
      expect(page.url()).toContain(`tab=${tab.value}`);
    }
  });

  test('should update URL query parameter on tab change', async ({ page }) => {
    await page.goto('/user-center');

    // Click Rewards tab
    const rewardsTab = page.getByRole('tab', { name: /Rewards/i });
    await rewardsTab.click();

    // Verify URL includes ?tab=rewards
    await page.waitForURL('**/user-center?tab=rewards*');
    expect(page.url()).toContain('tab=rewards');

    // Click Tasks tab
    const tasksTab = page.getByRole('tab', { name: /Tasks/i });
    await tasksTab.click();

    // Verify URL updates to ?tab=tasks
    await page.waitForURL('**/user-center?tab=tasks*');
    expect(page.url()).toContain('tab=tasks');
  });

  test('should maintain tab state on page refresh', async ({ page }) => {
    // Navigate to specific tab
    await page.goto('/user-center?tab=kyc');
    await page.waitForLoadState('networkidle');

    // Verify KYC tab is selected
    const kycTab = page.getByRole('tab', { name: /KYC/i });
    await expect(kycTab).toHaveAttribute('aria-selected', 'true');

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify KYC tab is still selected
    await expect(kycTab).toHaveAttribute('aria-selected', 'true');
  });

  test('should work with browser back/forward buttons', async ({ page }) => {
    await page.goto('/user-center');

    // Navigate through tabs
    await page.getByRole('tab', { name: /Positions/i }).click();
    await page.waitForURL('**/user-center?tab=positions*');

    await page.getByRole('tab', { name: /Rewards/i }).click();
    await page.waitForURL('**/user-center?tab=rewards*');

    // Click browser back button
    await page.goBack();
    await page.waitForURL('**/user-center?tab=positions*');

    // Verify Positions tab is selected
    const positionsTab = page.getByRole('tab', { name: /Positions/i });
    await expect(positionsTab).toHaveAttribute('aria-selected', 'true');

    // Click browser forward button
    await page.goForward();
    await page.waitForURL('**/user-center?tab=rewards*');

    // Verify Rewards tab is selected
    const rewardsTab = page.getByRole('tab', { name: /Rewards/i });
    await expect(rewardsTab).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('User Center - Responsive Design', () => {
  test('should display scrollable tabs on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/user-center');
    await page.waitForLoadState('networkidle');

    // Verify tabs container is scrollable
    const tabsContainer = page.locator('[role="tablist"]');
    await expect(tabsContainer).toBeVisible();

    // Verify all tabs are still accessible (may need to scroll)
    for (const tab of USER_CENTER_TABS) {
      const tabElement = page.getByRole('tab', { name: new RegExp(tab.label, 'i') });

      // Scroll to tab if needed
      await tabElement.scrollIntoViewIfNeeded();

      // Verify tab is visible after scrolling
      await expect(tabElement).toBeVisible();
    }
  });

  test('should maintain tab functionality on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/user-center');
    await page.waitForLoadState('networkidle');

    // Click Referral tab (last tab, may require scrolling)
    const referralTab = page.getByRole('tab', { name: /Referral/i });
    await referralTab.scrollIntoViewIfNeeded();
    await referralTab.click();

    // Verify tab is selected
    await expect(referralTab).toHaveAttribute('aria-selected', 'true');

    // Verify URL is updated
    await page.waitForURL('**/user-center?tab=referral*');
  });

  test('should display full-width tabs on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    await page.goto('/user-center');
    await page.waitForLoadState('networkidle');

    // Verify all tabs are visible without scrolling
    for (const tab of USER_CENTER_TABS) {
      const tabElement = page.getByRole('tab', { name: new RegExp(tab.label, 'i') });
      await expect(tabElement).toBeInViewport();
    }
  });
});

test.describe('User Center - Tab Content', () => {
  test('should display placeholder content for each tab', async ({ page }) => {
    await page.goto('/user-center');

    for (const tab of USER_CENTER_TABS) {
      // Click tab
      const tabElement = page.getByRole('tab', { name: new RegExp(tab.label, 'i') });
      await tabElement.click();
      await page.waitForURL(`**/user-center?tab=${tab.value}*`, { timeout: 1000 });

      // Verify some content is displayed (exact content depends on implementation)
      // For now, just verify the page doesn't crash
      const body = page.locator('body');
      await expect(body).toBeVisible();
    }
  });
});

test.describe('User Center - Performance', () => {
  test('should load within 2 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/user-center');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(2000);
  });

  test('should switch tabs quickly (< 100ms)', async ({ page }) => {
    await page.goto('/user-center');
    await page.waitForLoadState('networkidle');

    const positionsTab = page.getByRole('tab', { name: /Positions/i });

    const startTime = Date.now();
    await positionsTab.click();
    await expect(positionsTab).toHaveAttribute('aria-selected', 'true');
    const switchTime = Date.now() - startTime;

    expect(switchTime).toBeLessThan(100);
  });
});
