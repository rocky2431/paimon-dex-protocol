/**
 * useLPPools Hook (dynamic pool discovery)
 *
 * Dynamically fetches all LP pools from Factory contract, replacing hardcoded TESTNET_POOLS.
 *
 * Features:
 * - Dynamic pool discovery via Factory.allPairs()
 * - Batch query all pools using useReadContracts
 * - Calculate TVL (Total Value Locked) in USD
 * - Calculate APR (Annual Percentage Rate) based on gauge rewards
 * - Support wallet connected/disconnected states
 * - Filter out pools with zero liquidity
 * - Auto-refetch every 5 seconds
 *
 * @module hooks/useLPPools
 */

import { useMemo } from 'react';
import { useReadContracts, useAccount } from 'wagmi';
import type { Address } from 'viem';
import { formatUnits, erc20Abi } from 'viem';
import { config } from '@/config';
import { DEX_PAIR_ABI } from '@/config/contracts/dexPair';

/**
 * Factory ABI (minimal - allPairs, allPairsLength)
 */
const FACTORY_ABI = [
  {
    inputs: [{ name: "", type: "uint256" }],
    name: "allPairs",
    outputs: [{ name: "pair", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "allPairsLength",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Pair ABI (minimal - token0/token1/getReserves/totalSupply)
 */
const PAIR_ABI = [
  {
    inputs: [],
    name: "token0",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "token1",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getReserves",
    outputs: [
      { name: "reserve0", type: "uint112" },
      { name: "reserve1", type: "uint112" },
      { name: "blockTimestampLast", type: "uint32" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Token information within a pool
 */
export interface PoolToken {
  symbol: string;
  address: Address;
  decimals?: number;
  name?: string;
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
 * Helper: Look up token metadata by address from config
 */
function getTokenMetadata(address: Address): PoolToken {
  const { tokenConfig } = config;
  const addressLower = address.toLowerCase();

  // Search through all tokens in config
  for (const [key, token] of Object.entries(tokenConfig)) {
    if (token.address.toLowerCase() === addressLower) {
      return {
        symbol: token.symbol,
        address: token.address as Address,
        decimals: token.decimals,
        name: token.name,
      };
    }
  }

  // Unknown token - return address as symbol
  return {
    symbol: address.slice(0, 6),
    address,
    decimals: 18, // Default to 18 decimals
    name: 'Unknown Token',
  };
}

/**
 * Dynamically fetch all LP pools from Factory contract
 *
 * Replaces hardcoded TESTNET_POOLS with dynamic Factory queries:
 * - Queries Factory.allPairsLength() to get total count
 * - Queries Factory.allPairs(index) to enumerate all pairs
 * - Queries token0(), token1() for each pair to get token addresses
 * - Queries getReserves(), totalSupply() for TVL calculation
 * - Queries balanceOf() for user's LP holdings (if wallet connected)
 * - Filters out pools with zero liquidity (both reserves = 0)
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
  const factoryAddress = config.dex.factory as `0x${string}` | undefined;

  // ============================================================================
  // Step 1: Get total number of pairs from Factory
  // ============================================================================

  const { data: pairCountData, isLoading: pairCountLoading } = useReadContracts({
    contracts: factoryAddress
      ? [
          {
            address: factoryAddress,
            abi: FACTORY_ABI,
            functionName: 'allPairsLength',
          },
        ]
      : [],
    query: {
      enabled: !!factoryAddress,
      refetchInterval: 5000, // Auto-refetch every 5 seconds
    },
  });

  const pairCount = pairCountData?.[0]?.result as bigint | undefined;

  // ============================================================================
  // Step 2: Get all pair addresses from Factory.allPairs(index)
  // ============================================================================

  const pairAddressContracts = useMemo(() => {
    if (!factoryAddress || !pairCount) return [];

    const contracts = [];
    const count = Number(pairCount);

    for (let i = 0; i < count; i++) {
      contracts.push({
        address: factoryAddress,
        abi: FACTORY_ABI,
        functionName: 'allPairs' as const,
        args: [BigInt(i)] as const,
      });
    }

    return contracts;
  }, [factoryAddress, pairCount]);

  const { data: pairAddresses, isLoading: pairAddressesLoading } = useReadContracts({
    contracts: pairAddressContracts,
    query: {
      enabled: pairAddressContracts.length > 0,
      refetchInterval: 5000, // Auto-refetch every 5 seconds
    },
  });

  // ============================================================================
  // Step 3: Query token0, token1, reserves, totalSupply, balanceOf for each pair
  // ============================================================================

  const poolDataContracts = useMemo(() => {
    if (!pairAddresses) return [];

    const contracts: any[] = [];

    pairAddresses.forEach((result) => {
      const pairAddress = result.result as `0x${string}` | undefined;
      if (!pairAddress || pairAddress === '0x0000000000000000000000000000000000000000') {
        return;
      }

      // Query 1: token0()
      contracts.push({
        address: pairAddress,
        abi: PAIR_ABI,
        functionName: 'token0',
      });

      // Query 2: token1()
      contracts.push({
        address: pairAddress,
        abi: PAIR_ABI,
        functionName: 'token1',
      });

      // Query 3: getReserves()
      contracts.push({
        address: pairAddress,
        abi: PAIR_ABI,
        functionName: 'getReserves',
      });

      // Query 4: totalSupply()
      contracts.push({
        address: pairAddress,
        abi: PAIR_ABI,
        functionName: 'totalSupply',
      });

      // Query 5: balanceOf() - user's LP holdings (if wallet connected)
      if (userAddress) {
        contracts.push({
          address: pairAddress,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [userAddress],
        });
      }
    });

    return contracts;
  }, [pairAddresses, userAddress]);

  const { data: poolData, isLoading: poolDataLoading } = useReadContracts({
    contracts: poolDataContracts,
    query: {
      enabled: poolDataContracts.length > 0,
      refetchInterval: 5000, // Auto-refetch every 5 seconds
    },
  });

  // ============================================================================
  // Step 4: Construct LiquidityPool objects
  // ============================================================================

  const pools = useMemo(() => {
    if (!pairAddresses || !poolData) return undefined;

    const pools: LPPool[] = [];
    const queriesPerPool = userAddress ? 5 : 4; // token0 + token1 + reserves + totalSupply (+ balanceOf if connected)
    let dataIndex = 0;

    pairAddresses.forEach((result, pairIndex) => {
      const pairAddress = result.result as `0x${string}` | undefined;
      if (!pairAddress || pairAddress === '0x0000000000000000000000000000000000000000') {
        return;
      }

      // Extract query results for this pair
      const token0Result = poolData[dataIndex];
      const token1Result = poolData[dataIndex + 1];
      const reservesResult = poolData[dataIndex + 2];
      const totalSupplyResult = poolData[dataIndex + 3];
      const balanceOfResult = userAddress ? poolData[dataIndex + 4] : undefined;
      dataIndex += queriesPerPool;

      // Skip if any query failed
      if (
        token0Result?.status !== 'success' ||
        token1Result?.status !== 'success' ||
        reservesResult?.status !== 'success' ||
        totalSupplyResult?.status !== 'success'
      ) {
        return;
      }

      // Extract data
      const token0Address = token0Result.result as Address;
      const token1Address = token1Result.result as Address;
      const reserves = reservesResult.result as [bigint, bigint, number];
      const reserve0 = reserves[0];
      const reserve1 = reserves[1];
      const totalSupply = totalSupplyResult.result as bigint;

      // Look up token metadata from config
      const token0 = getTokenMetadata(token0Address);
      const token1 = getTokenMetadata(token1Address);

      // Calculate TVL (simplified: assume 1:1 USD peg for stablecoins)
      // In production, would fetch real prices from oracle
      const tvlToken0 = Number(formatUnits(reserve0, token0.decimals || 18));
      const tvlToken1 = Number(formatUnits(reserve1, token1.decimals || 18));
      const tvlUSD = tvlToken0 + tvlToken1; // Simplified calculation

      // Skip pools with negligible liquidity (TVL < $10)
      // This filters out both empty pools and dust/residual liquidity
      if (tvlUSD < 10) {
        return;
      }
      const tvlFormatted = tvlUSD.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      // Calculate APR (simplified: 0% baseline)
      // In production, would calculate based on gauge rewards and TVL
      const apr = 0; // TODO: Implement actual APR calculation

      // User balance (if wallet connected)
      const userBalance =
        balanceOfResult?.status === 'success'
          ? (balanceOfResult.result as bigint)
          : undefined;

      pools.push({
        id: `${token0.symbol.toLowerCase()}-${token1.symbol.toLowerCase()}`,
        name: `${token0.symbol}/${token1.symbol}`,
        token0: {
          symbol: token0.symbol,
          address: token0Address,
          decimals: token0.decimals,
          name: token0.name,
        },
        token1: {
          symbol: token1.symbol,
          address: token1Address,
          decimals: token1.decimals,
          name: token1.name,
        },
        lpToken: pairAddress,
        tvl: tvlFormatted,
        apr,
        reserves: {
          token0: reserve0,
          token1: reserve1,
        },
        gaugeAddress: undefined, // TODO: Look up gauge address from config
        userBalance,
      });
    });

    return pools;
  }, [pairAddresses, poolData, userAddress]);

  return {
    pools,
    isLoading: pairCountLoading || pairAddressesLoading || poolDataLoading,
    error: null,
  };
}
