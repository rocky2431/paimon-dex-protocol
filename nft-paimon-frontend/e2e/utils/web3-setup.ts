/**
 * Web3 Setup Utilities for E2E Tests
 *
 * Provides helper functions to:
 * - Connect to test wallet
 * - Setup test accounts with ETH/tokens
 * - Mock wallet interactions for testing
 */

import { Page } from '@playwright/test';

/**
 * Test wallet configuration for BSC testnet
 */
export const TEST_WALLET = {
  address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Hardhat default account #0
  privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
};

/**
 * Contract addresses on BSC testnet (to be updated after deployment)
 */
export const CONTRACTS = {
  HYD: process.env.NEXT_PUBLIC_HYD_ADDRESS || '',
  PAIMON: process.env.NEXT_PUBLIC_PAIMON_ADDRESS || '',
  Treasury: process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '',
  PSM: process.env.NEXT_PUBLIC_PSM_ADDRESS || '',
  VotingEscrow: process.env.NEXT_PUBLIC_VOTING_ESCROW_ADDRESS || '',
  GaugeController: process.env.NEXT_PUBLIC_GAUGE_CONTROLLER_ADDRESS || '',
  StabilityPool: process.env.NEXT_PUBLIC_STABILITY_POOL_ADDRESS || '',
};

/**
 * Connect wallet in the frontend
 */
export async function connectWallet(page: Page): Promise<void> {
  // Click connect wallet button
  await page.click('button:has-text("Connect Wallet"), button:has-text("连接钱包")');

  // Wait for wallet modal
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

  // Select MetaMask (or test wallet)
  await page.click('button:has-text("MetaMask")');

  // In a real test environment, this would trigger MetaMask
  // For local testing, we assume wallet is auto-connected
  await page.waitForTimeout(1000);
}

/**
 * Wait for wallet to be connected
 */
export async function waitForWalletConnected(page: Page): Promise<void> {
  // Wait for address to appear in header
  await page.waitForSelector('text=/0x[a-fA-F0-9]{4}\\.{3}[a-fA-F0-9]{4}/', { timeout: 10000 });
}

/**
 * Get current wallet address from UI
 */
export async function getConnectedAddress(page: Page): Promise<string> {
  const addressElement = await page.locator('text=/0x[a-fA-F0-9]{4}\\.{3}[a-fA-F0-9]{4}/').first();
  const addressText = await addressElement.textContent();
  return addressText?.replace(/\./g, '') || '';
}

/**
 * Switch network to BSC testnet
 */
export async function switchToTestnet(page: Page): Promise<void> {
  // Click network selector
  await page.click('[aria-label="Network"], button:has-text("BSC")');

  // Select BSC Testnet
  await page.click('text="BSC Testnet"');

  await page.waitForTimeout(1000);
}

/**
 * Approve token spending
 */
export async function approveToken(
  page: Page,
  tokenSymbol: string,
  spender: string,
  amount?: string
): Promise<void> {
  // This would typically involve:
  // 1. Triggering approval transaction
  // 2. Waiting for MetaMask confirmation
  // 3. Waiting for transaction to be mined

  // For now, we'll simulate the approval flow
  console.log(`Approving ${tokenSymbol} spending for ${spender}`);
  await page.waitForTimeout(2000);
}

/**
 * Wait for transaction confirmation
 */
export async function waitForTransaction(page: Page, timeout = 30000): Promise<void> {
  // Look for success notification
  await page.waitForSelector(
    'text=/Transaction (confirmed|successful|成功)/',
    { timeout }
  );
}

/**
 * Dismiss notifications
 */
export async function dismissNotifications(page: Page): Promise<void> {
  const closeButtons = await page.locator('[aria-label="Close"], button:has-text("×")').all();
  for (const button of closeButtons) {
    try {
      await button.click({ timeout: 1000 });
    } catch {
      // Ignore if button is not clickable
    }
  }
}
