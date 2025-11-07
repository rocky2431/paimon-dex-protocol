/**
 * Custom hook to aggregate system-wide metrics across all protocols
 * 聚合全系统指标的自定义 Hook
 *
 * This hook provides a unified view of all protocol metrics including:
 * - Total Value Locked (TVL) across all protocols
 * - USDP supply and circulation metrics
 * - DEX trading volume and liquidity
 * - Governance metrics (vePAIMON, voting power)
 * - Launchpad fundraising statistics
 */

import { useMemo } from 'react';
import { useReadContract, useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { testnet } from '@/config/chains/testnet';
import { USDP_ABI } from '@/config/contracts/usdp';
import { VAULT_ABI } from '@/config/contracts/vault';
import { STABILITY_POOL_ABI } from '@/config/contracts/stabilityPool';
import { VEPAIMON_ABI } from '@/config/contracts/vePaimon';
import { PANCAKE_FACTORY_ABI } from '@/config/contracts/abis/dex';
import { DEX_PAIR_ABI } from '@/config/contracts/dexPair';

/**
 * System-wide metrics interface
 * 系统级指标接口
 */
export interface SystemMetrics {
  // USDP Metrics
  usdpTotalSupply: string; // Total USDP in circulation
  usdpVaultTVL: string; // Total collateral value in vault
  usdpStabilityPoolTVL: string; // Total USDP in stability pool

  // DEX Metrics
  dexTotalLiquidity: string; // Total liquidity across all pairs
  dexDailyVolume: string; // 24h trading volume
  dexTotalPairs: number; // Number of active pairs

  // Governance Metrics
  totalVePaimon: string; // Total vePAIMON voting power
  totalLockedPaimon: string; // Total PAIMON locked
  activeVoters: number; // Number of active voters

  // Launchpad Metrics
  totalRaised: string; // Total funds raised across all projects
  activeProjects: number; // Number of active fundraising projects
  totalParticipants: number; // Unique investors

  // Emissions Metrics
  weeklyEmission: string; // Weekly PAIMON emission
  currentEpoch: number; // Current emission epoch

  // Overall TVL
  totalTVL: string; // Sum of all protocol TVL

  // Loading states
  isLoading: boolean;
  isError: boolean;
}

/**
 * Hook to fetch and aggregate system-wide metrics
 * 获取和聚合系统级指标的 Hook
 *
 * @returns {SystemMetrics} Aggregated system metrics
 *
 * @example
 * ```typescript
 * const metrics = useSystemMetrics();
 * console.log('Total TVL:', metrics.totalTVL);
 * console.log('USDP Supply:', metrics.usdpTotalSupply);
 * ```
 */
export function useSystemMetrics(): SystemMetrics {
  // Query USDP total supply
  const { data: usdpSupply, isLoading: isLoadingUsdpSupply } = useReadContract({
    address: testnet.tokens.usdp,
    abi: USDP_ABI,
    functionName: 'totalSupply',
  });

  // Query Vault total debt (approximation for TVL)
  const { data: vaultTVL, isLoading: isLoadingVaultTVL } = useReadContract({
    address: testnet.tokens.vault,
    abi: VAULT_ABI,
    functionName: 'totalDebt',
  });

  // Query Stability Pool TVL
  const { data: stabilityPoolDeposits, isLoading: isLoadingStabilityPool } = useReadContract({
    address: testnet.tokens.stabilityPool,
    abi: STABILITY_POOL_ABI,
    functionName: 'totalDeposits',
  });

  // Query DEX metrics
  // 1. Get total pairs count from factory
  const { data: totalPairs, isLoading: isLoadingPairs } = useReadContract({
    address: testnet.dex.factory,
    abi: PANCAKE_FACTORY_ABI,
    functionName: 'allPairsLength',
  });

  // 2. Query reserves for known pairs to calculate total liquidity
  const knownPairs = [
    testnet.pools.usdpUsdc, // USDP-USDC pair
    testnet.pools.paimonWbnb, // PAIMON-WBNB pair
    testnet.pools.hydUsdp, // HYD-USDP pair
  ].filter((addr): addr is `0x${string}` => addr !== "0x0000000000000000000000000000000000000000");

  const { data: pairReserves, isLoading: isLoadingReserves } = useReadContracts({
    contracts: knownPairs.map((pairAddress) => ({
      address: pairAddress,
      abi: DEX_PAIR_ABI,
      functionName: 'getReserves',
    })),
  });

  // Note: VotingEscrow is an ERC721 NFT contract without totalSupply/supply functions
  // Total voting power and locked PAIMON need to be calculated from all NFTs
  // TODO: Implement in Phase 3.2+ via event indexing or subgraph
  const totalVotingPower = undefined;
  const totalLocked = undefined;

  // Aggregate loading states
  const isLoading =
    isLoadingUsdpSupply ||
    isLoadingVaultTVL ||
    isLoadingStabilityPool ||
    isLoadingPairs ||
    isLoadingReserves;

  // Calculate aggregated metrics
  const metrics = useMemo<SystemMetrics>(() => {
    // USDP Metrics
    const usdpTotalSupply = usdpSupply
      ? formatUnits(usdpSupply as bigint, 18)
      : '0.00';

    const usdpVaultTVL = vaultTVL
      ? formatUnits(vaultTVL as bigint, 18)
      : '0.00';

    const usdpStabilityPoolTVL = stabilityPoolDeposits
      ? formatUnits(stabilityPoolDeposits as bigint, 18)
      : '0.00';

    // Governance Metrics
    const totalVePaimon = totalVotingPower
      ? formatUnits(totalVotingPower as bigint, 18)
      : '0.00';

    const totalLockedPaimon = totalLocked
      ? formatUnits(totalLocked as bigint, 18)
      : '0.00';

    // DEX Metrics
    // Calculate total liquidity from known pairs (simplified: sum all reserves in USD equivalent)
    // Note: This is a simplified calculation assuming $1 for stablecoins
    // For accurate TVL, need price oracle integration
    let dexLiquidity = 0;
    if (pairReserves) {
      pairReserves.forEach((result) => {
        if (result.status === 'success' && result.result) {
          const [reserve0, reserve1] = result.result as [bigint, bigint, number];
          // Convert to USD equivalent (assuming 18 decimals)
          // For stablecoin pairs (USDP-USDC, HYD-USDP), reserves are roughly equal to USD
          const reserve0USD = parseFloat(formatUnits(reserve0, 18));
          const reserve1USD = parseFloat(formatUnits(reserve1, 18));
          dexLiquidity += reserve0USD + reserve1USD;
        }
      });
    }

    const dexTotalLiquidity = dexLiquidity.toFixed(2);
    const dexTotalPairs = totalPairs ? Number(totalPairs) : 0;

    // Calculate total TVL (sum of all protocol TVL)
    const vaultValue = parseFloat(usdpVaultTVL);
    const stabilityValue = parseFloat(usdpStabilityPoolTVL);
    const totalTVL = (vaultValue + stabilityValue + dexLiquidity).toFixed(2);

    // Mock data for metrics not yet available from contracts
    // TODO: Replace with real contract queries in Phase 3.2+
    return {
      // USDP Metrics
      usdpTotalSupply,
      usdpVaultTVL,
      usdpStabilityPoolTVL,

      // DEX Metrics
      dexTotalLiquidity,
      dexDailyVolume: '0.00', // TODO: Needs event indexing for 24h volume
      dexTotalPairs,

      // Governance Metrics
      totalVePaimon,
      totalLockedPaimon,
      activeVoters: 0, // TODO: Need GaugeController query

      // Launchpad Metrics (mock - replace with real data)
      totalRaised: '0.00',
      activeProjects: 0,
      totalParticipants: 0,

      // Emissions Metrics (mock - replace with real data)
      weeklyEmission: '0',
      currentEpoch: 0,

      // Overall TVL
      totalTVL,

      // Loading states
      isLoading,
      isError: false,
    };
  }, [
    usdpSupply,
    vaultTVL,
    stabilityPoolDeposits,
    totalPairs,
    pairReserves,
    totalVotingPower,
    totalLocked,
    isLoading,
  ]);

  return metrics;
}

/**
 * Hook to fetch specific system metric by key
 * 根据键获取特定系统指标的 Hook
 *
 * @param {keyof SystemMetrics} key - Metric key to fetch
 * @returns {string | number | boolean} Specific metric value
 *
 * @example
 * ```typescript
 * const tvl = useSystemMetric('totalTVL');
 * const supply = useSystemMetric('usdpTotalSupply');
 * ```
 */
export function useSystemMetric(
  key: keyof Omit<SystemMetrics, 'isLoading' | 'isError'>
): string | number {
  const metrics = useSystemMetrics();
  return metrics[key] as string | number;
}
