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
 * ERC20 Metadata ABI (for querying token details)
 */
const ERC20_METADATA_ABI = [
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * useUserLPPositions Hook
 * Dynamically discovers ALL pools where user has LP token balance
 *
 * Dynamic Discovery Architecture:
 * 1. Query Factory.allPairsLength() to get total pool count
 * 2. Query Factory.allPairs(i) for each index to get all pair addresses
 * 3. Check user's LP balance for each pair (balanceOf)
 * 4. Only include pools where balance > 0
 * 5. Fetch pool details (token0, token1, reserves, totalSupply)
 * 6. Construct LiquidityPool objects
 *
 * Benefits:
 * - No hardcoded pool lists - discovers ANY pool user has LP in
 * - Works with any token deployment (old/new addresses don't matter)
 * - Automatically adapts to new pools created in Factory
 * - Immune to config mismatches
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

  console.log('🔍 [useUserLPPositions] Starting dynamic pool discovery...');
  console.log('  - Factory:', factoryAddress);
  console.log('  - User:', address);

  // Step 1: Get total number of pairs from Factory
  const { data: allPairsLengthData, isLoading: allPairsLengthLoading } = useReadContracts({
    contracts: [
      {
        address: factoryAddress,
        abi: FACTORY_ABI,
        functionName: "allPairsLength" as const,
      },
    ] as const,
    query: {
      enabled: !!factoryAddress,
    },
  });

  const allPairsLength = allPairsLengthData?.[0]?.result as bigint | undefined;

  console.log('🔍 [useUserLPPositions] Total pairs in Factory:', allPairsLength?.toString() || 'loading...');

  // Step 2: Get all pair addresses from Factory using allPairs(i)
  const allPairsContracts = useMemo(() => {
    if (!factoryAddress || !allPairsLength) return [];

    const length = Number(allPairsLength);
    const contracts = [];

    for (let i = 0; i < length; i++) {
      contracts.push({
        address: factoryAddress,
        abi: FACTORY_ABI,
        functionName: "allPairs" as const,
        args: [BigInt(i)] as const,
      });
    }

    return contracts;
  }, [factoryAddress, allPairsLength]);

  const { data: pairAddresses, isLoading: pairAddressesLoading } = useReadContracts({
    contracts: allPairsContracts,
    query: {
      enabled: allPairsContracts.length > 0,
      refetchInterval: 5000, // Refetch every 5 seconds
    },
  });

  console.log('🔍 [useUserLPPositions] Fetched pair addresses:',
    pairAddresses?.map((result, index) => `[${index}] ${result.result as string}`)
  );

  // Step 3: Check user's LP balance for each pair
  const balanceContracts = useMemo(() => {
    if (!address || !pairAddresses) return [];

    return pairAddresses
      .map((result) => {
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
    query: {
      enabled: balanceContracts.length > 0,
      refetchInterval: 5000, // Refetch every 5 seconds to detect balance changes
    },
  });

  console.log('🔍 [useUserLPPositions] User balances:',
    balances?.map((result, index) => ({
      pairIndex: index,
      balance: result.result?.toString(),
      balanceFormatted: result.result ? formatUnits(result.result as bigint, 18) : '0',
      hasBalance: result.result && (result.result as bigint) > 0n
    }))
  );

  // Step 4: Get pool details (token0, token1, reserves, totalSupply) for pairs with balance > 0
  const poolDataContracts = useMemo(() => {
    if (!balances || !pairAddresses) return [];

    const contracts: any[] = [];

    balances.forEach((balanceResult, balanceIndex) => {
      const balance = balanceResult.result as bigint | undefined;
      if (!balance || balance === 0n) return;

      // Find corresponding pair address (balanceIndex maps to non-null pairAddresses)
      let validPairCount = 0;
      let pairAddress: `0x${string}` | undefined;

      for (let i = 0; i < pairAddresses.length; i++) {
        const addr = pairAddresses[i].result as `0x${string}` | undefined;
        if (addr && addr !== "0x0000000000000000000000000000000000000000") {
          if (validPairCount === balanceIndex) {
            pairAddress = addr;
            break;
          }
          validPairCount++;
        }
      }

      if (!pairAddress) return;

      // Query token0, token1, reserves, and totalSupply for this pair
      contracts.push(
        {
          address: pairAddress,
          abi: PAIR_ABI,
          functionName: "token0" as const,
        },
        {
          address: pairAddress,
          abi: PAIR_ABI,
          functionName: "token1" as const,
        },
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
    query: {
      enabled: poolDataContracts.length > 0,
      refetchInterval: 5000, // Refetch every 5 seconds
    },
  });

  // Step 5: Query token metadata (symbol, decimals) for all discovered tokens
  const tokenMetadataContracts = useMemo(() => {
    if (!balances || !poolData) return [];

    const contracts: any[] = [];
    let poolDataIndex = 0;

    balances.forEach((balanceResult) => {
      const balance = balanceResult.result as bigint | undefined;
      if (!balance || balance === 0n) return;

      // Get token0 and token1 addresses from poolData
      const token0Address = poolData[poolDataIndex]?.result as `0x${string}` | undefined;
      const token1Address = poolData[poolDataIndex + 1]?.result as `0x${string}` | undefined;

      if (token0Address && token1Address) {
        // Query symbol and decimals for token0
        contracts.push(
          {
            address: token0Address,
            abi: ERC20_METADATA_ABI,
            functionName: "symbol" as const,
          },
          {
            address: token0Address,
            abi: ERC20_METADATA_ABI,
            functionName: "decimals" as const,
          },
          // Query symbol and decimals for token1
          {
            address: token1Address,
            abi: ERC20_METADATA_ABI,
            functionName: "symbol" as const,
          },
          {
            address: token1Address,
            abi: ERC20_METADATA_ABI,
            functionName: "decimals" as const,
          }
        );
      }

      poolDataIndex += 4; // Skip token0, token1, reserves, totalSupply
    });

    return contracts;
  }, [balances, poolData]);

  const { data: tokenMetadata, isLoading: tokenMetadataLoading } = useReadContracts({
    contracts: tokenMetadataContracts,
    query: {
      enabled: tokenMetadataContracts.length > 0,
      refetchInterval: 5000,
    },
  });

  // Step 6: Construct LiquidityPool objects with all data
  const userPools = useMemo(() => {
    console.log('🔍 [useUserLPPositions] Constructing userPools...');
    console.log('  - balances:', balances?.length);
    console.log('  - pairAddresses:', pairAddresses?.length);
    console.log('  - poolData:', poolData?.length);
    console.log('  - tokenMetadata:', tokenMetadata?.length);

    if (!balances || !pairAddresses || !poolData || !tokenMetadata) {
      console.log('  ❌ Missing data, returning empty array');
      return [];
    }

    const pools: LiquidityPool[] = [];
    let poolDataIndex = 0;
    let tokenMetadataIndex = 0;

    balances.forEach((balanceResult, balanceIndex) => {
      const balance = balanceResult.result as bigint | undefined;

      console.log(`  🔍 Processing balance[${balanceIndex}]:`, {
        balance: balance?.toString(),
        hasBalance: !!balance && balance !== 0n
      });

      if (!balance || balance === 0n) {
        console.log(`    ⏭️  Skipped (balance = 0)`);
        return;
      }

      // Find corresponding pair address
      let validPairCount = 0;
      let pairAddress: `0x${string}` | undefined;

      for (let i = 0; i < pairAddresses.length; i++) {
        const addr = pairAddresses[i].result as `0x${string}` | undefined;
        if (addr && addr !== "0x0000000000000000000000000000000000000000") {
          if (validPairCount === balanceIndex) {
            pairAddress = addr;
            break;
          }
          validPairCount++;
        }
      }

      if (!pairAddress) {
        console.log(`    ❌ Pair address not found`);
        return;
      }

      // Get pool data: token0, token1, reserves, totalSupply
      const token0Address = poolData[poolDataIndex]?.result as `0x${string}` | undefined;
      const token1Address = poolData[poolDataIndex + 1]?.result as `0x${string}` | undefined;
      const reserves = poolData[poolDataIndex + 2]?.result as readonly [bigint, bigint, number] | undefined;
      const totalSupply = poolData[poolDataIndex + 3]?.result as bigint | undefined;
      poolDataIndex += 4;

      // Get token metadata: symbol and decimals for both tokens
      const token0Symbol = tokenMetadata[tokenMetadataIndex]?.result as string | undefined;
      const token0Decimals = tokenMetadata[tokenMetadataIndex + 1]?.result as number | undefined;
      const token1Symbol = tokenMetadata[tokenMetadataIndex + 2]?.result as string | undefined;
      const token1Decimals = tokenMetadata[tokenMetadataIndex + 3]?.result as number | undefined;
      tokenMetadataIndex += 4;

      console.log(`    📊 Pool at ${pairAddress}:`, {
        token0: `${token0Symbol} (${token0Address})`,
        token1: `${token1Symbol} (${token1Address})`,
        reserves: reserves ? `[${reserves[0].toString()}, ${reserves[1].toString()}]` : 'undefined',
        totalSupply: totalSupply?.toString() || 'undefined'
      });

      if (!token0Address || !token1Address || !reserves || !totalSupply ||
          !token0Symbol || !token1Symbol || token0Decimals === undefined || token1Decimals === undefined) {
        console.log(`    ❌ Missing data, skipping this pool`);
        return;
      }

      // Try to get logo/icon from config (if token is in known config)
      const token0ConfigKey = Object.keys(config.tokenConfig).find(
        key => config.tokenConfig[key as keyof typeof config.tokenConfig]?.address === token0Address
      );
      const token1ConfigKey = Object.keys(config.tokenConfig).find(
        key => config.tokenConfig[key as keyof typeof config.tokenConfig]?.address === token1Address
      );

      const token0LogoURI = token0ConfigKey
        ? config.tokenConfig[token0ConfigKey as keyof typeof config.tokenConfig]?.icon || ""
        : "";
      const token1LogoURI = token1ConfigKey
        ? config.tokenConfig[token1ConfigKey as keyof typeof config.tokenConfig]?.icon || ""
        : "";

      // Determine pool type (heuristic: stablecoin pairs are stable, others are volatile)
      const stablecoins = ["USDC", "USDT", "USDP", "DAI", "BUSD"];
      const isStable = stablecoins.includes(token0Symbol) && stablecoins.includes(token1Symbol);
      const poolType: PoolType = isStable ? PoolType.STABLE : PoolType.VOLATILE;

      const token0 = {
        address: token0Address,
        symbol: token0Symbol,
        name: token0Symbol, // Use symbol as name (metadata query would be expensive)
        decimals: token0Decimals,
        logoURI: token0LogoURI,
      };

      const token1 = {
        address: token1Address,
        symbol: token1Symbol,
        name: token1Symbol,
        decimals: token1Decimals,
        logoURI: token1LogoURI,
      };

      const pool: LiquidityPool = {
        address: pairAddress,
        token0,
        token1,
        type: poolType,
        reserve0: reserves[0],
        reserve1: reserves[1],
        totalSupply,
        name: `${token0.symbol}/${token1.symbol}`,
        apr: "0%", // TODO: Calculate APR with price oracle and fee data
        tvl: "$0", // TODO: Calculate TVL with price oracle
      };

      console.log(`    ✅ Successfully added pool: ${pool.name}`);
      pools.push(pool);
    });

    console.log(`\n🎯 [useUserLPPositions] Final result: ${pools.length} pools`);
    console.log('  Pools:', pools.map(p => p.name));

    return pools;
  }, [balances, pairAddresses, poolData, tokenMetadata]);

  return {
    userPools,
    isLoading: allPairsLengthLoading || pairAddressesLoading || balancesLoading || poolDataLoading || tokenMetadataLoading,
    error: null,
  };
};
