/**
 * LP Pools Configuration (gap-3.1.1)
 *
 * Configuration for DEX liquidity pools with addresses synced from deployment.
 *
 * Source: src/config/chains/generated/testnet.ts (TESTNET_ADDRESSES.dex.pairs)
 * Sync: Manually maintained based on contract deployments
 *
 * @module config/pools
 */

import type { Address } from 'viem';
import { TESTNET_ADDRESSES } from './chains/generated/testnet';

/**
 * Token configuration within a pool
 */
export interface PoolToken {
  /** Token symbol (e.g., 'USDP', 'USDC') */
  symbol: string;
  /** Token contract address */
  address: Address;
  /** Token decimals (default: 18) */
  decimals?: number;
  /** Token name (optional, for display) */
  name?: string;
}

/**
 * LP Pool configuration
 */
export interface Pool {
  /** Unique pool identifier (kebab-case, e.g., 'usdp-usdc') */
  id: string;
  /** DEX pair contract address */
  address: Address;
  /** First token in the pair */
  token0: PoolToken;
  /** Second token in the pair */
  token1: PoolToken;
  /** Fee tier in basis points (300 = 0.3%, 500 = 0.5%, 3000 = 3%) */
  feeTier: number;
  /** Gauge contract address (for liquidity mining rewards) */
  gaugeAddress?: Address;
  /** Pool display name (optional) */
  name?: string;
  /** Whether pool is active for liquidity mining */
  isActive?: boolean;
}

/**
 * BSC Testnet LP Pools
 *
 * Addresses synced from TESTNET_ADDRESSES.dex.pairs
 */
export const TESTNET_POOLS: Pool[] = [
  // ============================================================================
  // USDP/USDC Pool (Stablecoin Pair)
  // ============================================================================
  {
    id: 'usdp-usdc',
    address: TESTNET_ADDRESSES.dex.pairs.usdpUsdc,
    token0: {
      symbol: 'USDP',
      address: TESTNET_ADDRESSES.core.usdp,
      decimals: 18,
      name: 'USDP Stablecoin',
    },
    token1: {
      symbol: 'USDC',
      address: TESTNET_ADDRESSES.mocks.usdc,
      decimals: 18, // BSC Testnet USDC uses 18 decimals (mainnet uses 18)
      name: 'USD Coin',
    },
    feeTier: 300, // 0.3%
    name: 'USDP/USDC',
    isActive: true,
  },

  // ============================================================================
  // PAIMON/BNB Pool (Governance Token Pair)
  // ============================================================================
  {
    id: 'paimon-bnb',
    address: TESTNET_ADDRESSES.dex.pairs.paimonBnb,
    token0: {
      symbol: 'PAIMON',
      address: TESTNET_ADDRESSES.core.paimon,
      decimals: 18,
      name: 'PAIMON Token',
    },
    token1: {
      symbol: 'WBNB',
      address: TESTNET_ADDRESSES.mocks.wbnb,
      decimals: 18,
      name: 'Wrapped BNB',
    },
    feeTier: 300, // 0.3%
    name: 'PAIMON/WBNB',
    isActive: true,
  },

  // ============================================================================
  // HYD/USDP Pool (RWA Asset Pair)
  // ============================================================================
  {
    id: 'hyd-usdp',
    address: TESTNET_ADDRESSES.dex.pairs.hydUsdp,
    token0: {
      symbol: 'HYD',
      address: TESTNET_ADDRESSES.core.hyd,
      decimals: 18,
      name: 'HYD RWA Token',
    },
    token1: {
      symbol: 'USDP',
      address: TESTNET_ADDRESSES.core.usdp,
      decimals: 18,
      name: 'USDP Stablecoin',
    },
    feeTier: 300, // 0.3%
    name: 'HYD/USDP',
    isActive: true,
  },
];

/**
 * Find pool by token pair (order-agnostic)
 *
 * @param symbol0 - First token symbol
 * @param symbol1 - Second token symbol
 * @returns Pool if found, undefined otherwise
 *
 * @example
 * ```typescript
 * const pool = findPoolByTokens('USDP', 'USDC');
 * // Returns USDP/USDC pool regardless of order
 *
 * const samePool = findPoolByTokens('USDC', 'USDP');
 * // Returns same pool (order-agnostic)
 * ```
 */
export function findPoolByTokens(
  symbol0: string,
  symbol1: string
): Pool | undefined {
  return TESTNET_POOLS.find(
    pool =>
      (pool.token0.symbol === symbol0 && pool.token1.symbol === symbol1) ||
      (pool.token0.symbol === symbol1 && pool.token1.symbol === symbol0)
  );
}

/**
 * Find pool by pool ID
 *
 * @param poolId - Pool identifier (e.g., 'usdp-usdc')
 * @returns Pool if found, undefined otherwise
 *
 * @example
 * ```typescript
 * const pool = findPoolById('usdp-usdc');
 * ```
 */
export function findPoolById(poolId: string): Pool | undefined {
  return TESTNET_POOLS.find(pool => pool.id === poolId);
}

/**
 * Find pool by address
 *
 * @param address - Pool contract address
 * @returns Pool if found, undefined otherwise
 *
 * @example
 * ```typescript
 * const pool = findPoolByAddress('0x3B8D3c266B2BbE588188cA70525a2da456a848d2');
 * ```
 */
export function findPoolByAddress(address: Address): Pool | undefined {
  return TESTNET_POOLS.find(
    pool => pool.address.toLowerCase() === address.toLowerCase()
  );
}

/**
 * Get all active pools (for liquidity mining)
 *
 * @returns Array of active pools
 *
 * @example
 * ```typescript
 * const activePools = getActivePools();
 * // Returns pools with isActive === true
 * ```
 */
export function getActivePools(): Pool[] {
  return TESTNET_POOLS.filter(pool => pool.isActive);
}

/**
 * Get all pool addresses
 *
 * @returns Array of pool contract addresses
 *
 * @example
 * ```typescript
 * const addresses = getAllPoolAddresses();
 * // Returns ['0x3B8D3c266B2BbE588188cA70525a2da456a848d2', ...]
 * ```
 */
export function getAllPoolAddresses(): Address[] {
  return TESTNET_POOLS.map(pool => pool.address);
}
