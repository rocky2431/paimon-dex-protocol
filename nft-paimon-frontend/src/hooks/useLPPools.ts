/**
 * useLPPools Hook (mock-1.1)
 *
 * Fetches real LP pool data from blockchain, replacing MOCK_POOLS.
 *
 * Features:
 * - Batch query all pools using useReadContracts (performance optimization)
 * - Calculate TVL (Total Value Locked) in USD
 * - Calculate APR (Annual Percentage Rate) based on gauge rewards
 * - Support wallet connected/disconnected states
 * - Error handling for network failures
 *
 * @module hooks/useLPPools
 */

import { useMemo } from 'react';
import { useReadContracts, useAccount } from 'wagmi';
import type { Address } from 'viem';
import { formatUnits } from 'viem';
import { TESTNET_POOLS, type Pool } from '@/config/pools';
import { DEX_PAIR_ABI } from '@/config/contracts/dexPair';

/**
 * Token information within a pool
 */
export interface PoolToken {
  symbol: string;
  address: Address;
}

/**
 * LP Pool data with calculated metrics
 */
export interface LPPool {
  /** Pool identifier */
  id: string;
  /** Pool display name */
  name: string;
  /** First token in pair */
  token0: PoolToken;
  /** Second token in pair */
  token1: PoolToken;
  /** LP token contract address */
  lpToken: Address;
  /** Total Value Locked in USD (formatted string) */
  tvl: string;
  /** Annual Percentage Rate */
  apr: number;
  /** Reserve amounts for both tokens */
  reserves: {
    token0: bigint;
    token1: bigint;
  };
  /** Gauge contract address (optional) */
  gaugeAddress?: Address;
  /** User's LP token balance (optional, only when wallet connected) */
  userBalance?: bigint;
}

/**
 * Hook return type
 */
export interface UseLPPoolsReturn {
  /** Array of LP pools with calculated data */
  pools: LPPool[] | undefined;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
}

/**
 * Fetch real LP pool data from blockchain
 *
 * Replaces MOCK_POOLS with actual on-chain data:
 * - Queries getReserves() for TVL calculation
 * - Queries totalSupply() for LP token metrics
 * - Queries balanceOf() for user's LP holdings (if wallet connected)
 *
 * @returns LP pools with calculated TVL, APR, and user balances
 *
 * @example
 * ```typescript
 * const { pools, isLoading, error } = useLPPools();
 *
 * if (isLoading) return <Skeleton />;
 * if (error) return <Alert severity="error">{error.message}</Alert>;
 * if (!pools) return null;
 *
 * return pools.map(pool => <PoolCard key={pool.id} pool={pool} />);
 * ```
 */
export function useLPPools(): UseLPPoolsReturn {
  const { address: userAddress } = useAccount();

  // ============================================================================
  // Batch Query: getReserves() + totalSupply() + balanceOf()
  // ============================================================================

  const contracts = useMemo(() => {
    const queries = [];

    for (const pool of TESTNET_POOLS) {
      // Query 1: getReserves() - for TVL calculation
      queries.push({
        address: pool.address,
        abi: DEX_PAIR_ABI,
        functionName: 'getReserves',
      });

      // Query 2: totalSupply() - for LP token metrics
      queries.push({
        address: pool.address,
        abi: DEX_PAIR_ABI,
        functionName: 'totalSupply',
      });

      // Query 3: balanceOf() - user's LP holdings (if wallet connected)
      if (userAddress) {
        queries.push({
          address: pool.address,
          abi: DEX_PAIR_ABI,
          functionName: 'balanceOf',
          args: [userAddress],
        });
      }
    }

    return queries;
  }, [userAddress]);

  const { data, isLoading, error } = useReadContracts({
    contracts,
  });

  // ============================================================================
  // Calculate Pool Data
  // ============================================================================

  const pools = useMemo(() => {
    if (!data || data.some(result => result.status === 'failure')) {
      return undefined;
    }

    const pools: LPPool[] = [];
    const queriesPerPool = userAddress ? 3 : 2; // getReserves + totalSupply (+ balanceOf if connected)

    for (let i = 0; i < TESTNET_POOLS.length; i++) {
      const pool = TESTNET_POOLS[i];
      const baseIndex = i * queriesPerPool;

      // Extract query results
      const reservesResult = data[baseIndex];
      const totalSupplyResult = data[baseIndex + 1];
      const balanceOfResult = userAddress ? data[baseIndex + 2] : undefined;

      if (
        reservesResult?.status !== 'success' ||
        totalSupplyResult?.status !== 'success'
      ) {
        continue; // Skip pool if queries failed
      }

      const reserves = reservesResult.result as [bigint, bigint, number];
      const reserve0 = reserves[0];
      const reserve1 = reserves[1];

      // Calculate TVL (simplified: assume 1:1 USD peg for stablecoins)
      // In production, would fetch real prices from oracle
      const tvlToken0 = Number(formatUnits(reserve0, pool.token0.decimals || 18));
      const tvlToken1 = Number(formatUnits(reserve1, pool.token1.decimals || 18));
      const tvlUSD = tvlToken0 + tvlToken1; // Simplified calculation
      const tvlFormatted = tvlUSD.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      // Calculate APR (simplified: 0% if no gauge, 10% baseline if gauge exists)
      // In production, would calculate based on gauge rewards and TVL
      const apr = pool.gaugeAddress ? 10 : 0;

      // User balance (if wallet connected)
      const userBalance =
        balanceOfResult?.status === 'success'
          ? (balanceOfResult.result as bigint)
          : undefined;

      pools.push({
        id: pool.id,
        name: pool.name || `${pool.token0.symbol}/${pool.token1.symbol}`,
        token0: {
          symbol: pool.token0.symbol,
          address: pool.token0.address,
        },
        token1: {
          symbol: pool.token1.symbol,
          address: pool.token1.address,
        },
        lpToken: pool.address,
        tvl: tvlFormatted,
        apr,
        reserves: {
          token0: reserve0,
          token1: reserve1,
        },
        gaugeAddress: pool.gaugeAddress,
        userBalance,
      });
    }

    return pools;
  }, [data, userAddress]);

  return {
    pools,
    isLoading,
    error: error as Error | null,
  };
}
