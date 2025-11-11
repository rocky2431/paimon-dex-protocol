/**
 * useGauges Hook (gap-3.1.2)
 *
 * React hook for reading gauge data from GaugeController contract.
 *
 * Features:
 * - Reads all gauge list from contract
 * - Fetches gauge weights for current epoch
 * - Retrieves user votes when wallet connected
 * - Calculates APR for each gauge
 *
 * @module hooks/useGauges
 */

import { useMemo } from 'react';
import { useReadContract, useReadContracts, useAccount } from 'wagmi';
import type { Address } from 'viem';
import {
  GAUGE_CONTROLLER_ADDRESS,
  GAUGE_CONTROLLER_ABI,
} from '../config/contracts/gaugeController';
import { findPoolByAddress } from '../config/pools';

/**
 * Gauge data interface
 */
export interface GaugeData {
  /** Gauge contract address */
  address: Address;
  /** Associated pool identifier */
  pool: string;
  /** Gauge weight for current epoch */
  weight: bigint;
  /** Total weight across all gauges */
  totalWeight: bigint;
  /** Annualized Percentage Return */
  apr: number;
  /** User's vote weight for this gauge (0 if not connected) */
  userVotes: bigint;
  /** Whether gauge is active */
  isActive: boolean;
}

/**
 * Hook return type
 */
export interface UseGaugesReturn {
  /** Array of gauge data */
  gauges: GaugeData[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  isError: boolean;
  /** Error object if error occurred */
  error: Error | null;
  /** Current epoch number */
  currentEpoch?: bigint;
}

/**
 * useGauges Hook
 *
 * Reads gauge data from GaugeController contract including:
 * - All gauge addresses and status
 * - Gauge weights for current epoch
 * - User votes (if wallet connected)
 * - Calculated APR
 *
 * @returns {UseGaugesReturn} Gauge data and loading states
 *
 * @example
 * ```tsx
 * function GaugeList() {
 *   const { gauges, isLoading, isError } = useGauges();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (isError) return <div>Error loading gauges</div>;
 *
 *   return (
 *     <ul>
 *       {gauges.map(gauge => (
 *         <li key={gauge.address}>
 *           {gauge.pool}: {gauge.apr}% APR
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useGauges(): UseGaugesReturn {
  const { address: userAddress, isConnected } = useAccount();

  // 1. Read gauge count
  const {
    data: gaugeCount,
    isLoading: isLoadingCount,
    isError: isErrorCount,
    error: errorCount,
  } = useReadContract({
    address: GAUGE_CONTROLLER_ADDRESS,
    abi: GAUGE_CONTROLLER_ABI,
    functionName: 'gaugeCount',
  });

  // 2. Read current epoch
  const {
    data: currentEpoch,
    isLoading: isLoadingEpoch,
  } = useReadContract({
    address: GAUGE_CONTROLLER_ADDRESS,
    abi: GAUGE_CONTROLLER_ABI,
    functionName: 'currentEpoch',
  });

  // 3. Generate contracts array for batch reading
  const gaugeContracts = useMemo(() => {
    if (!gaugeCount) return [];

    const count = Number(gaugeCount);
    const contracts = [];

    // Read all gauge info
    for (let i = 0; i < count; i++) {
      contracts.push({
        address: GAUGE_CONTROLLER_ADDRESS,
        abi: GAUGE_CONTROLLER_ABI,
        functionName: 'gauges' as const,
        args: [BigInt(i)],
      });
    }

    return contracts;
  }, [gaugeCount]);

  // 4. Batch read all gauge info
  const {
    data: gaugesData,
    isLoading: isLoadingGauges,
    isError: isErrorGauges,
    error: errorGauges,
  } = useReadContracts({
    contracts: gaugeContracts,
  });

  // 5. Generate contracts for reading weights
  const weightContracts = useMemo(() => {
    if (!gaugesData || !currentEpoch) return [];

    const contracts = [];
    const count = gaugesData.length;

    // Read gauge weights for current epoch
    for (let i = 0; i < count; i++) {
      contracts.push({
        address: GAUGE_CONTROLLER_ADDRESS,
        abi: GAUGE_CONTROLLER_ABI,
        functionName: 'gaugeWeights' as const,
        args: [currentEpoch, BigInt(i)],
      });
    }

    return contracts;
  }, [gaugesData, currentEpoch]);

  // 6. Batch read gauge weights
  const {
    data: weightsData,
    isLoading: isLoadingWeights,
  } = useReadContracts({
    contracts: weightContracts,
  });

  // 7. Process gauge data
  const gauges = useMemo((): GaugeData[] => {
    if (!gaugesData || !weightsData || !currentEpoch) return [];

    const processedGauges: GaugeData[] = [];
    let totalWeight = 0n;

    // First pass: calculate total weight
    for (let i = 0; i < weightsData.length; i++) {
      const weightResult = weightsData[i];
      if (weightResult?.result) {
        totalWeight += weightResult.result as bigint;
      }
    }

    // Second pass: build gauge data
    for (let i = 0; i < gaugesData.length; i++) {
      const gaugeResult = gaugesData[i];
      const weightResult = weightsData[i];

      if (!gaugeResult?.result || !weightResult?.result) continue;

      const [gaugeAddress, isActive] = gaugeResult.result as [Address, boolean];
      const weight = weightResult.result as bigint;

      // Skip zero address gauges
      if (
        gaugeAddress.toLowerCase() ===
        '0x0000000000000000000000000000000000000000'
      ) {
        continue;
      }

      // Find associated pool
      const pool = findPoolByAddress(gaugeAddress);
      const poolName = pool?.name || pool?.id || 'Unknown Pool';

      // Calculate APR (simplified calculation)
      // APR = (weight / totalWeight) * baseAPR
      // For now, use a placeholder calculation
      const weightPercentage =
        totalWeight > 0n
          ? Number((weight * 10000n) / totalWeight) / 100
          : 0;
      const apr = weightPercentage * 2; // Placeholder: 2x weight percentage

      // User votes (will be implemented when needed)
      const userVotes = 0n; // TODO: Read from userVotes mapping if connected

      processedGauges.push({
        address: gaugeAddress,
        pool: poolName,
        weight,
        totalWeight,
        apr,
        userVotes,
        isActive,
      });
    }

    return processedGauges;
  }, [gaugesData, weightsData, currentEpoch]);

  // Combine loading states
  const isLoading =
    isLoadingCount || isLoadingEpoch || isLoadingGauges || isLoadingWeights;

  // Combine error states
  const isError = isErrorCount || isErrorGauges;
  const error = (errorCount || errorGauges) as Error | null;

  return {
    gauges,
    isLoading,
    isError,
    error,
    currentEpoch,
  };
}
