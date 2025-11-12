/**
 * useNitroPools Hook (mock-1.3)
 *
 * Fetches real Nitro pool data from blockchain, replacing MOCK_NITRO_POOLS.
 *
 * Features:
 * - Batch query all pools using useReadContracts (performance optimization)
 * - Calculate APR based on lock duration (simplified estimation)
 * - Filter only active pools
 * - Error handling for network failures
 *
 * @module hooks/useNitroPools
 */

import { useMemo } from 'react';
import { useReadContracts } from 'wagmi';
import type { Address } from 'viem';
import { NITROPOOL_ABI } from '@/config/contracts/nitroPool';
import { testnet } from '@/config/chains/testnet';
import type { NitroPool } from '@/components/nitro/types';

/**
 * Known LP token to pool name mapping
 * (Extracted for better maintainability)
 */
const KNOWN_LP_PAIRS: Record<string, string> = {
  '0x3B8D3c266B2BbE588188cA70525a2da456a848d2': 'USDP/USDC',
  '0xc625Ab8646582100D48Ae4FC68c1E8B0976111fA': 'PAIMON/BNB',
  '0x2361484f586eEf76dCbaE9e4dD37C2b3d10d9110': 'HYD/USDP',
};

/**
 * Hook return type
 */
export interface UseNitroPoolsReturn {
  /** Array of active Nitro pools with calculated data */
  pools: NitroPool[] | undefined;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
}

/**
 * Calculate estimated APR based on lock duration
 * (Simplified formula: longer lock = higher APR)
 *
 * @param lockDuration - Lock duration in seconds
 * @returns Estimated APR percentage
 */
function calculateAPR(lockDuration: bigint): number {
  const lockDays = Number(lockDuration) / 86400; // Convert seconds to days

  // Simple formula: Base 30% + 2% per day locked
  // 3 days = 36%, 7 days = 44%, 14 days = 58%, 30 days = 90%
  const baseAPR = 30;
  const bonusAPR = lockDays * 2;

  return Math.min(baseAPR + bonusAPR, 100); // Cap at 100%
}

/**
 * Generate pool name from LP token address
 * (Fallback when pool name is not available)
 *
 * @param lpToken - LP token contract address
 * @returns Generated pool name
 */
function generatePoolName(lpToken: Address): string {
  // Try to match known pairs
  const normalizedAddress = lpToken.toLowerCase();
  for (const [knownAddress, name] of Object.entries(KNOWN_LP_PAIRS)) {
    if (knownAddress.toLowerCase() === normalizedAddress) {
      return `${name} Nitro`;
    }
  }

  // Fallback: use truncated address
  return `Nitro Pool ${lpToken.slice(0, 6)}...${lpToken.slice(-4)}`;
}

/**
 * Fetch real Nitro pool data from blockchain
 *
 * Replaces MOCK_NITRO_POOLS with actual on-chain data:
 * - Queries poolCount() to get total number of pools
 * - Queries pools(id) for each pool to get details
 * - Filters only active pools
 * - Calculates estimated APR based on lock duration
 *
 * @returns Nitro pools with calculated APR and metadata
 *
 * @example
 * ```typescript
 * const { pools, isLoading, error } = useNitroPools();
 *
 * if (isLoading) return <Skeleton />;
 * if (error) return <Alert severity="error">{error.message}</Alert>;
 * if (!pools) return null;
 *
 * return <NitroPoolList pools={pools} />;
 * ```
 */
export function useNitroPools(): UseNitroPoolsReturn {
  // ============================================================================
  // Step 1: Query poolCount
  // ============================================================================

  const poolCountQuery = useReadContracts({
    contracts: [
      {
        address: testnet.tokens.nitroPool as Address,
        abi: NITROPOOL_ABI,
        functionName: 'poolCount',
      },
    ],
  });

  const poolCount = useMemo(() => {
    if (
      !poolCountQuery.data ||
      poolCountQuery.data[0]?.status !== 'success'
    ) {
      return 0;
    }
    return Number(poolCountQuery.data[0].result as bigint);
  }, [poolCountQuery.data]);

  // ============================================================================
  // Step 2: Batch Query All Pools
  // ============================================================================

  const poolsQueries = useMemo(() => {
    if (poolCount === 0) return [];

    const queries = [];
    for (let i = 0; i < poolCount; i++) {
      queries.push({
        address: testnet.tokens.nitroPool as Address,
        abi: NITROPOOL_ABI,
        functionName: 'pools',
        args: [BigInt(i)],
      });
    }
    return queries;
  }, [poolCount]);

  const { data, isLoading, error } = useReadContracts({
    contracts: poolsQueries,
    query: {
      enabled: poolCount > 0,
    },
  });

  // ============================================================================
  // Step 3: Process Pool Data
  // ============================================================================

  const pools = useMemo(() => {
    if (!data || poolCount === 0) {
      return [];
    }

    const activePools: NitroPool[] = [];

    for (let i = 0; i < poolCount; i++) {
      const poolResult = data[i];

      if (poolResult?.status !== 'success') {
        continue; // Skip failed queries
      }

      // Pool data structure: [lpToken, lockDuration, minLiquidity, totalStaked, isActive]
      const poolData = poolResult.result as unknown as readonly [
        Address,
        bigint,
        bigint,
        bigint,
        boolean
      ];

      const [lpToken, lockDuration, , , isActive] = poolData;

      // Filter: Only include active pools
      if (!isActive) {
        continue;
      }

      // Calculate APR based on lock duration
      const apr = calculateAPR(lockDuration);

      // Generate pool name
      const name = generatePoolName(lpToken);

      activePools.push({
        id: BigInt(i),
        name,
        lpToken,
        lockDuration,
        apr,
        active: isActive,
      });
    }

    return activePools;
  }, [data, poolCount]);

  // ============================================================================
  // Return Hook Data
  // ============================================================================

  return {
    pools: pools.length > 0 ? pools : undefined,
    isLoading: poolCountQuery.isLoading || isLoading,
    error: (poolCountQuery.error || error) as Error | null,
  };
}
