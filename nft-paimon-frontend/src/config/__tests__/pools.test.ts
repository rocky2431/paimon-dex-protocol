/**
 * Pools Configuration Tests (gap-3.1.1)
 *
 * Tests for LP pool address configuration from deployment data.
 *
 * Task: gap-3.1.1
 * Focus: Verify pool addresses are correctly synced from contract deployments
 */

import { describe, it, expect } from '@jest/globals';
import { isAddress } from 'viem';

// Import will be created in GREEN phase
import { TESTNET_POOLS, type Pool } from '../pools';

describe('Pools Configuration (gap-3.1.1)', () => {
  /**
   * TEST 1: Functional - Pool configuration exists
   *
   * EXPECTED: TESTNET_POOLS array is defined and exported
   */
  it('[TEST 1] should export TESTNET_POOLS configuration', () => {
    expect(TESTNET_POOLS).toBeDefined();
    expect(Array.isArray(TESTNET_POOLS)).toBe(true);
  });

  /**
   * TEST 2: Functional - Pool structure is correct
   *
   * EXPECTED: Each pool has required fields with correct types
   */
  it('[TEST 2] should have correct pool structure', () => {
    expect(TESTNET_POOLS.length).toBeGreaterThan(0);

    TESTNET_POOLS.forEach((pool: Pool) => {
      // Required fields
      expect(pool).toHaveProperty('id');
      expect(pool).toHaveProperty('address');
      expect(pool).toHaveProperty('token0');
      expect(pool).toHaveProperty('token1');
      expect(pool).toHaveProperty('feeTier');

      // Type validation
      expect(typeof pool.id).toBe('string');
      expect(typeof pool.address).toBe('string');
      expect(typeof pool.feeTier).toBe('number');

      // Token structure
      expect(pool.token0).toHaveProperty('symbol');
      expect(pool.token0).toHaveProperty('address');
      expect(pool.token1).toHaveProperty('symbol');
      expect(pool.token1).toHaveProperty('address');
    });
  });

  /**
   * TEST 3: Security - All addresses are valid checksummed addresses
   *
   * EXPECTED: Pool addresses and token addresses pass viem's isAddress check
   */
  it('[TEST 3] should have valid Ethereum addresses', () => {
    TESTNET_POOLS.forEach((pool: Pool) => {
      // Pool address validation
      expect(isAddress(pool.address)).toBe(true);

      // Token addresses validation
      expect(isAddress(pool.token0.address)).toBe(true);
      expect(isAddress(pool.token1.address)).toBe(true);

      // Gauge address validation (if exists)
      if (pool.gaugeAddress) {
        expect(isAddress(pool.gaugeAddress)).toBe(true);
      }
    });
  });

  /**
   * TEST 4: Boundary - Addresses are non-zero
   *
   * EXPECTED: No address is the zero address (0x0000...)
   */
  it('[TEST 4] should not have zero addresses', () => {
    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

    TESTNET_POOLS.forEach((pool: Pool) => {
      expect(pool.address.toLowerCase()).not.toBe(ZERO_ADDRESS.toLowerCase());
      expect(pool.token0.address.toLowerCase()).not.toBe(ZERO_ADDRESS.toLowerCase());
      expect(pool.token1.address.toLowerCase()).not.toBe(ZERO_ADDRESS.toLowerCase());

      if (pool.gaugeAddress) {
        expect(pool.gaugeAddress.toLowerCase()).not.toBe(ZERO_ADDRESS.toLowerCase());
      }
    });
  });

  /**
   * TEST 5: Functional - Contains expected pools
   *
   * EXPECTED: Configuration includes USDP/USDC, PAIMON/BNB, HYD/USDP pools
   */
  it('[TEST 5] should contain deployed pools', () => {
    const poolIds = TESTNET_POOLS.map(p => p.id);

    // Expected pools from deployment
    expect(poolIds).toContain('usdp-usdc');
    expect(poolIds).toContain('paimon-bnb');
    expect(poolIds).toContain('hyd-usdp');
  });

  /**
   * TEST 6: Functional - Pool addresses match deployment
   *
   * EXPECTED: Pool addresses match those in TESTNET_ADDRESSES.dex.pairs
   */
  it('[TEST 6] should have correct addresses from deployment', () => {
    // Known addresses from deployment
    const expectedAddresses = {
      'usdp-usdc': '0x3B8D3c266B2BbE588188cA70525a2da456a848d2',
      'paimon-bnb': '0xc625Ab8646582100D48Ae4FC68c1E8B0976111fA',
      'hyd-usdp': '0x2361484f586eEf76dCbaE9e4dD37C2b3d10d9110',
    };

    TESTNET_POOLS.forEach((pool: Pool) => {
      if (expectedAddresses[pool.id as keyof typeof expectedAddresses]) {
        expect(pool.address.toLowerCase()).toBe(
          expectedAddresses[pool.id as keyof typeof expectedAddresses].toLowerCase()
        );
      }
    });
  });

  /**
   * TEST 7: Functional - Fee tiers are valid
   *
   * EXPECTED: Fee tiers are standard values (300 = 0.3%, 500 = 0.5%, 3000 = 0.3%)
   */
  it('[TEST 7] should have valid fee tiers', () => {
    const validFeeTiers = [100, 300, 500, 3000]; // 0.01%, 0.3%, 0.5%, 3%

    TESTNET_POOLS.forEach((pool: Pool) => {
      expect(validFeeTiers).toContain(pool.feeTier);
    });
  });

  /**
   * TEST 8: Functional - Pool IDs are unique
   *
   * EXPECTED: No duplicate pool IDs
   */
  it('[TEST 8] should have unique pool IDs', () => {
    const poolIds = TESTNET_POOLS.map(p => p.id);
    const uniqueIds = new Set(poolIds);

    expect(uniqueIds.size).toBe(poolIds.length);
  });

  /**
   * TEST 9: Functional - Pool addresses are unique
   *
   * EXPECTED: No duplicate pool addresses
   */
  it('[TEST 9] should have unique pool addresses', () => {
    const addresses = TESTNET_POOLS.map(p => p.address.toLowerCase());
    const uniqueAddresses = new Set(addresses);

    expect(uniqueAddresses.size).toBe(addresses.length);
  });

  /**
   * TEST 10: Compatibility - Token decimals are provided
   *
   * EXPECTED: Each token has decimals field (18 for standard ERC20)
   */
  it('[TEST 10] should have token decimals', () => {
    TESTNET_POOLS.forEach((pool: Pool) => {
      if (pool.token0.decimals !== undefined) {
        expect(typeof pool.token0.decimals).toBe('number');
        expect(pool.token0.decimals).toBeGreaterThanOrEqual(6);
        expect(pool.token0.decimals).toBeLessThanOrEqual(18);
      }

      if (pool.token1.decimals !== undefined) {
        expect(typeof pool.token1.decimals).toBe('number');
        expect(pool.token1.decimals).toBeGreaterThanOrEqual(6);
        expect(pool.token1.decimals).toBeLessThanOrEqual(18);
      }
    });
  });

  /**
   * TEST 11: Performance - Configuration loads quickly
   *
   * EXPECTED: Pool configuration import is synchronous and fast
   */
  it('[TEST 11] should load configuration quickly', () => {
    const start = performance.now();

    // Access configuration
    const pools = TESTNET_POOLS;
    const poolCount = pools.length;

    const duration = performance.now() - start;

    // Should load in less than 10ms
    expect(duration).toBeLessThan(10);
    expect(poolCount).toBeGreaterThan(0);
  });

  /**
   * TEST 12: Functional - Helper function to find pool by tokens
   *
   * EXPECTED: Can find pool by token pair (in either order)
   */
  it('[TEST 12] should be able to find pool by token symbols', () => {
    // This test will pass once we implement helper functions
    const findPoolByTokens = (symbol0: string, symbol1: string) => {
      return TESTNET_POOLS.find(
        pool =>
          (pool.token0.symbol === symbol0 && pool.token1.symbol === symbol1) ||
          (pool.token0.symbol === symbol1 && pool.token1.symbol === symbol0)
      );
    };

    // Find USDP/USDC pool
    const usdpUsdcPool = findPoolByTokens('USDP', 'USDC');
    expect(usdpUsdcPool).toBeDefined();
    expect(usdpUsdcPool?.id).toBe('usdp-usdc');

    // Find in reverse order
    const usdcUsdpPool = findPoolByTokens('USDC', 'USDP');
    expect(usdcUsdpPool).toBeDefined();
    expect(usdcUsdpPool?.address).toBe(usdpUsdcPool?.address);
  });
});
