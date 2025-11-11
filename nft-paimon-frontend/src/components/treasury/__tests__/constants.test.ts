/**
 * Treasury Constants Tests
 *
 * Tests for RWA asset configuration with real addresses
 *
 * Task: gap-2.1.1
 * Issue: RWA_ASSETS using placeholder addresses (0x...0001~0004)
 * Fix: Configure real RWA token addresses from deployment config
 */

import { describe, it, expect } from '@jest/globals';
import { RWA_ASSETS, TREASURY_CONFIG } from '../constants';
import { TESTNET_ADDRESSES } from '@/config/chains/generated/testnet';

// Zero address constant
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// Placeholder address patterns (0x...0001, 0x...0002, etc.)
const isPlaceholderAddress = (address: string): boolean => {
  return /^0x0+[1-9]$/.test(address);
};

describe('Treasury Constants - RWA Asset Configuration (gap-2.1.1)', () => {
  /**
   * TEST 1: Functional - RWA_ASSETS array exists and has entries
   *
   * BEFORE: RWA_ASSETS uses placeholder addresses
   * AFTER: RWA_ASSETS uses real deployed addresses
   */
  it('[TEST 1] should have RWA_ASSETS array with entries', () => {
    expect(RWA_ASSETS).toBeDefined();
    expect(Array.isArray(RWA_ASSETS)).toBe(true);
    expect(RWA_ASSETS.length).toBeGreaterThan(0);
  });

  /**
   * TEST 2: Functional - HYD asset uses real address from deployment
   *
   * BEFORE: HYD uses placeholder 0x...0004
   * AFTER: HYD uses real address from TESTNET_ADDRESSES
   */
  it('[TEST 2] should have HYD asset with real deployed address', () => {
    const hydAsset = RWA_ASSETS.find((asset) => asset.symbol === 'HYD');

    expect(hydAsset).toBeDefined();
    expect(hydAsset!.address).toBe(TESTNET_ADDRESSES.core.hyd);
    expect(hydAsset!.address).not.toBe(ZERO_ADDRESS);
    expect(isPlaceholderAddress(hydAsset!.address)).toBe(false);
  });

  /**
   * TEST 3: Security - No zero addresses in active RWA assets
   */
  it('[TEST 3] should not have zero addresses in active assets', () => {
    const activeAssets = RWA_ASSETS.filter((asset) => asset.isActive);

    activeAssets.forEach((asset) => {
      expect(asset.address).not.toBe(ZERO_ADDRESS);
      expect(asset.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });
  });

  /**
   * TEST 4: Security - No placeholder addresses in active RWA assets
   *
   * BEFORE: Active assets use placeholder addresses
   * AFTER: Active assets use real addresses only
   */
  it('[TEST 4] should not have placeholder addresses in active assets', () => {
    const activeAssets = RWA_ASSETS.filter((asset) => asset.isActive);

    activeAssets.forEach((asset) => {
      expect(isPlaceholderAddress(asset.address)).toBe(false);
    });
  });

  /**
   * TEST 5: Boundary - HYD asset has valid configuration
   */
  it('[TEST 5] should have HYD asset with valid configuration', () => {
    const hydAsset = RWA_ASSETS.find((asset) => asset.symbol === 'HYD');

    expect(hydAsset).toBeDefined();
    expect(hydAsset!.name).toBeDefined();
    expect(hydAsset!.symbol).toBe('HYD');
    expect(hydAsset!.tier).toBeGreaterThanOrEqual(1);
    expect(hydAsset!.tier).toBeLessThanOrEqual(3);
    expect(hydAsset!.ltvRatio).toBeGreaterThan(0);
    expect(hydAsset!.ltvRatio).toBeLessThanOrEqual(100);
    expect(hydAsset!.isActive).toBe(true);
  });

  /**
   * TEST 6: Exception - Inactive assets can have placeholder addresses
   *
   * Assets not yet deployed should be marked as inactive
   */
  it('[TEST 6] should allow placeholder addresses for inactive assets', () => {
    const inactiveAssets = RWA_ASSETS.filter((asset) => !asset.isActive);

    // Inactive assets may use placeholder addresses (not yet deployed)
    inactiveAssets.forEach((asset) => {
      expect(asset.isActive).toBe(false);
      // No requirement for real addresses if inactive
    });
  });

  /**
   * TEST 7: Functional - HYD address format is valid
   */
  it('[TEST 7] should have HYD address in valid Ethereum address format', () => {
    const hydAsset = RWA_ASSETS.find((asset) => asset.symbol === 'HYD');

    expect(hydAsset!.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(hydAsset!.address.length).toBe(42);
    expect(hydAsset!.address.startsWith('0x')).toBe(true);
  });

  /**
   * TEST 8: Compatibility - At least one active RWA asset exists
   */
  it('[TEST 8] should have at least one active RWA asset', () => {
    const activeAssets = RWA_ASSETS.filter((asset) => asset.isActive);

    expect(activeAssets.length).toBeGreaterThanOrEqual(1);
  });

  /**
   * TEST 9: Functional - TREASURY_CONFIG has required settings
   */
  it('[TEST 9] should have valid TREASURY_CONFIG settings', () => {
    expect(TREASURY_CONFIG.MIN_DEPOSIT_AMOUNT).toBeGreaterThan(0);
    expect(TREASURY_CONFIG.MAX_DEPOSIT_AMOUNT).toBeGreaterThan(
      TREASURY_CONFIG.MIN_DEPOSIT_AMOUNT
    );
    expect(TREASURY_CONFIG.TARGET_HEALTH_FACTOR).toBeGreaterThan(100);
    expect(TREASURY_CONFIG.LIQUIDATION_THRESHOLD).toBeGreaterThan(100);
    expect(TREASURY_CONFIG.LIQUIDATION_THRESHOLD).toBeLessThan(
      TREASURY_CONFIG.TARGET_HEALTH_FACTOR
    );
  });

  /**
   * TEST 10: Performance - RWA_ASSETS lookup is fast
   */
  it('[TEST 10] should quickly find HYD asset in array', () => {
    const start = Date.now();

    for (let i = 0; i < 1000; i++) {
      const hydAsset = RWA_ASSETS.find((asset) => asset.symbol === 'HYD');
      expect(hydAsset).toBeDefined();
    }

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100); // Should complete 1000 lookups in <100ms
  });
});
