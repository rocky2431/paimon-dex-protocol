"use client";

import { useMemo } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { erc20Abi, formatUnits } from "viem";
import { LiquidityPool, PoolType } from "../types";
import { config } from "@/config";

/**
 * Factory ABI (minimal - allPairs)
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
  {
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
    ],
    name: "getPair",
    outputs: [{ name: "pair", type: "address" }],
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
 * Known token pairs configuration
 * This defines which pairs to check for user positions
 */
interface TokenPairConfig {
  tokenA: `0x${string}`;
  tokenB: `0x${string}`;
  symbolA: string;
  symbolB: string;
  decimalsA: number;
  decimalsB: number;
  type: PoolType;
}

/**
 * Get known token pairs from config
 */
const getKnownPairs = (): TokenPairConfig[] => {
  const { tokenConfig } = config;

  return [
    {
      tokenA: tokenConfig.usdp.address as `0x${string}`,
      tokenB: tokenConfig.usdc.address as `0x${string}`,
      symbolA: tokenConfig.usdp.symbol,
      symbolB: tokenConfig.usdc.symbol,
      decimalsA: tokenConfig.usdp.decimals,
      decimalsB: tokenConfig.usdc.decimals,
      type: PoolType.STABLE,
    },
    {
      tokenA: tokenConfig.usdp.address as `0x${string}`,
      tokenB: tokenConfig.wbnb.address as `0x${string}`,
      symbolA: tokenConfig.usdp.symbol,
      symbolB: tokenConfig.wbnb.symbol,
      decimalsA: tokenConfig.usdp.decimals,
      decimalsB: tokenConfig.wbnb.decimals,
      type: PoolType.VOLATILE,
    },
    {
      tokenA: tokenConfig.paimon.address as `0x${string}`,
      tokenB: tokenConfig.wbnb.address as `0x${string}`,
      symbolA: tokenConfig.paimon.symbol,
      symbolB: tokenConfig.wbnb.symbol,
      decimalsA: tokenConfig.paimon.decimals,
      decimalsB: tokenConfig.wbnb.decimals,
      type: PoolType.VOLATILE,
    },
    {
      tokenA: tokenConfig.hyd.address as `0x${string}`,
      tokenB: tokenConfig.usdp.address as `0x${string}`,
      symbolA: tokenConfig.hyd.symbol,
      symbolB: tokenConfig.usdp.symbol,
      decimalsA: tokenConfig.hyd.decimals,
      decimalsB: tokenConfig.usdp.decimals,
      type: PoolType.VOLATILE,
    },
  ];
};

/**
 * useUserLPPositions Hook
 * Queries user's LP token balances across all known pairs
 *
 * Features:
 * - Fetches pair addresses from Factory
 * - Checks user's LP balance for each pair
 * - Only returns pools where user has LP tokens
 * - Fetches reserve data for each pool
 * - Constructs LiquidityPool objects dynamically
 *
 * @returns Array of LiquidityPool objects where user has LP positions
 */
export const useUserLPPositions = (): {
  userPools: LiquidityPool[];
  isLoading: boolean;
  error: Error | null;
} => {
  const { address } = useAccount();
  const factoryAddress = config.dex.factory as `0x${string}` | undefined;
  const knownPairs = getKnownPairs();

  // Step 1: Get pair addresses from Factory for each known pair
  const pairAddressContracts = useMemo(
    () =>
      factoryAddress
        ? knownPairs.map((pair) => ({
            address: factoryAddress,
            abi: FACTORY_ABI,
            functionName: "getPair" as const,
            args: [pair.tokenA, pair.tokenB] as const,
          }))
        : [],
    [factoryAddress]
  );

  const { data: pairAddresses, isLoading: pairAddressesLoading } = useReadContracts({
    contracts: pairAddressContracts,
    query: { enabled: !!factoryAddress },
  });

  // Step 2: Get user's LP balance for each pair
  const balanceContracts = useMemo(() => {
    if (!address || !pairAddresses) return [];

    return pairAddresses
      .map((result, index) => {
        const pairAddress = result.result as `0x${string}` | undefined;
        if (!pairAddress || pairAddress === "0x0000000000000000000000000000000000000000")
          return null;

        return {
          address: pairAddress,
          abi: erc20Abi,
          functionName: "balanceOf" as const,
          args: [address] as const,
        };
      })
      .filter((contract) => contract !== null);
  }, [address, pairAddresses]);

  const { data: balances, isLoading: balancesLoading } = useReadContracts({
    contracts: balanceContracts,
    query: { enabled: balanceContracts.length > 0 },
  });

  // Step 3: Get reserves and totalSupply for pairs with balance > 0
  const poolDataContracts = useMemo(() => {
    if (!balances || !pairAddresses) return [];

    const contracts: any[] = [];
    balances.forEach((balanceResult, balanceIndex) => {
      const balance = balanceResult.result as bigint | undefined;
      if (!balance || balance === 0n) return;

      // Find corresponding pair address
      let pairIndex = -1;
      let skippedNullContracts = 0;
      for (let i = 0; i < pairAddresses.length; i++) {
        const pairAddress = pairAddresses[i].result as `0x${string}` | undefined;
        if (!pairAddress || pairAddress === "0x0000000000000000000000000000000000000000") {
          skippedNullContracts++;
          continue;
        }
        if (skippedNullContracts + (pairIndex + 1) === balanceIndex) {
          pairIndex = i;
          break;
        }
        skippedNullContracts = 0;
      }

      if (pairIndex === -1) return;

      const pairAddress = pairAddresses[pairIndex].result as `0x${string}`;

      // Query reserves and totalSupply for this pair
      contracts.push(
        {
          address: pairAddress,
          abi: PAIR_ABI,
          functionName: "getReserves" as const,
        },
        {
          address: pairAddress,
          abi: PAIR_ABI,
          functionName: "totalSupply" as const,
        }
      );
    });

    return contracts;
  }, [balances, pairAddresses]);

  const { data: poolData, isLoading: poolDataLoading } = useReadContracts({
    contracts: poolDataContracts,
    query: { enabled: poolDataContracts.length > 0 },
  });

  // Step 4: Construct LiquidityPool objects
  const userPools = useMemo(() => {
    if (!balances || !pairAddresses || !poolData) return [];

    const pools: LiquidityPool[] = [];
    let poolDataIndex = 0;

    balances.forEach((balanceResult, balanceIndex) => {
      const balance = balanceResult.result as bigint | undefined;
      if (!balance || balance === 0n) return;

      // Find corresponding pair index
      let pairIndex = -1;
      let skippedNullContracts = 0;
      for (let i = 0; i < pairAddresses.length; i++) {
        const pairAddress = pairAddresses[i].result as `0x${string}` | undefined;
        if (!pairAddress || pairAddress === "0x0000000000000000000000000000000000000000") {
          skippedNullContracts++;
          continue;
        }
        if (skippedNullContracts + (pairIndex + 1) === balanceIndex) {
          pairIndex = i;
          break;
        }
        skippedNullContracts = 0;
      }

      if (pairIndex === -1) return;

      const pairAddress = pairAddresses[pairIndex].result as `0x${string}`;
      const pairConfig = knownPairs[pairIndex];

      // Get reserves and totalSupply from poolData
      const reserves = poolData[poolDataIndex]?.result as
        | readonly [bigint, bigint, number]
        | undefined;
      const totalSupply = poolData[poolDataIndex + 1]?.result as bigint | undefined;
      poolDataIndex += 2;

      if (!reserves || !totalSupply) return;

      // Determine token0/token1 order (Uniswap V2 sorts by address)
      const isToken0 =
        pairConfig.tokenA.toLowerCase() < pairConfig.tokenB.toLowerCase();

      const token0 = isToken0
        ? {
            address: pairConfig.tokenA,
            symbol: pairConfig.symbolA,
            name: pairConfig.symbolA,
            decimals: pairConfig.decimalsA,
            logoURI: config.tokenConfig[pairConfig.symbolA.toLowerCase() as keyof typeof config.tokenConfig]?.icon || "",
          }
        : {
            address: pairConfig.tokenB,
            symbol: pairConfig.symbolB,
            name: pairConfig.symbolB,
            decimals: pairConfig.decimalsB,
            logoURI: config.tokenConfig[pairConfig.symbolB.toLowerCase() as keyof typeof config.tokenConfig]?.icon || "",
          };

      const token1 = isToken0
        ? {
            address: pairConfig.tokenB,
            symbol: pairConfig.symbolB,
            name: pairConfig.symbolB,
            decimals: pairConfig.decimalsB,
            logoURI: config.tokenConfig[pairConfig.symbolB.toLowerCase() as keyof typeof config.tokenConfig]?.icon || "",
          }
        : {
            address: pairConfig.tokenA,
            symbol: pairConfig.symbolA,
            name: pairConfig.symbolA,
            decimals: pairConfig.decimalsA,
            logoURI: config.tokenConfig[pairConfig.symbolA.toLowerCase() as keyof typeof config.tokenConfig]?.icon || "",
          };

      const reserve0 = reserves[0];
      const reserve1 = reserves[1];

      // Calculate TVL (simplified - just sum of reserves in USD)
      // In production, you'd use price oracles
      const tvl = "$0"; // TODO: Implement actual TVL calculation with price oracles

      // Calculate APR (simplified - requires fee data and price oracles)
      const apr = "0%"; // TODO: Implement actual APR calculation

      pools.push({
        address: pairAddress,
        token0,
        token1,
        type: pairConfig.type,
        reserve0,
        reserve1,
        totalSupply,
        name: `${token0.symbol}/${token1.symbol}`,
        apr,
        tvl,
      });
    });

    return pools;
  }, [balances, pairAddresses, poolData, knownPairs]);

  return {
    userPools,
    isLoading: pairAddressesLoading || balancesLoading || poolDataLoading,
    error: null,
  };
};
