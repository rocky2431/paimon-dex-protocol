'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import type { Address } from 'viem';
import { useGauges } from '@/hooks/useGauges';

/**
 * Gauge ABI for reward claiming
 * Minimal ABI containing only reward-related functions
 */
export const GAUGE_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getReward',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

/**
 * Gauge rewards info
 */
export interface GaugeRewardsInfo {
  /** Gauge address */
  address: Address;
  /** Pool name (e.g., "USDP/USDC") */
  poolName: string;
  /** Earned rewards amount */
  earned: bigint;
  /** Formatted earned amount */
  earnedFormatted: string;
  /** Has rewards to claim */
  hasRewards: boolean;
}

/**
 * useClaimRewards Hook (gap-3.1.4)
 *
 * Hook for claiming LP rewards from Gauge contracts.
 *
 * Features:
 * - Query earned rewards from multiple gauges
 * - Claim rewards from single gauge
 * - Batch claim rewards from multiple gauges
 * - State management for claiming status
 * - Auto-refresh after successful claims
 *
 * @returns Hook state and methods
 */
export const useClaimRewards = () => {
  const { address, isConnected } = useAccount();
  const { gauges, isLoading: isLoadingGauges } = useGauges();
  const { writeContract, data: txHash, isPending: isWriting } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // State
  const [isClaiming, setIsClaiming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Build contracts array for batch reading earned rewards
  const earnedContracts = useMemo(() => {
    if (!address || gauges.length === 0) return [];

    return gauges.map((gauge) => ({
      address: gauge.address,
      abi: GAUGE_ABI,
      functionName: 'earned' as const,
      args: [address],
    }));
  }, [address, gauges]);

  // Query earned rewards from all gauges
  const { data: earnedData, refetch: refetchEarned } = useReadContracts({
    contracts: earnedContracts,
    query: {
      enabled: earnedContracts.length > 0,
    },
  });

  // Transform earned data into structured format
  const gaugeRewards: GaugeRewardsInfo[] = useMemo(() => {
    if (!earnedData || earnedData.length === 0) return [];

    return gauges.map((gauge, index) => {
      const earned = (earnedData[index]?.result as bigint) || BigInt(0);
      const earnedFormatted = (Number(earned) / 1e18).toFixed(4);

      return {
        address: gauge.address,
        poolName: gauge.pool,
        earned,
        earnedFormatted,
        hasRewards: earned > BigInt(0),
      };
    });
  }, [gauges, earnedData]);

  // Calculate total rewards across all gauges
  const totalRewards = useMemo(() => {
    const total = gaugeRewards.reduce((sum, gauge) => sum + gauge.earned, BigInt(0));
    const formatted = (Number(total) / 1e18).toFixed(4);

    return {
      amount: total,
      formatted,
      hasRewards: total > BigInt(0),
    };
  }, [gaugeRewards]);

  // Get gauges with claimable rewards
  const claimableGauges = useMemo(() => {
    return gaugeRewards.filter((g) => g.hasRewards);
  }, [gaugeRewards]);

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed) {
      setIsClaiming(false);
      refetchEarned();
    }
  }, [isConfirmed, refetchEarned]);

  // Claim rewards from single gauge
  const claimFromGauge = useCallback(
    async (gaugeAddress: Address) => {
      if (!isConnected || isClaiming) return;

      try {
        setIsClaiming(true);
        setErrorMessage('');

        await writeContract({
          address: gaugeAddress,
          abi: GAUGE_ABI,
          functionName: 'getReward',
        });
      } catch (error) {
        console.error('Claim error:', error);
        setIsClaiming(false);
        setErrorMessage('Failed to claim rewards. Please try again.');
      }
    },
    [isConnected, isClaiming, writeContract]
  );

  // Claim rewards from all gauges with rewards
  const claimAll = useCallback(async () => {
    if (!isConnected || isClaiming || claimableGauges.length === 0) return;

    try {
      setIsClaiming(true);
      setErrorMessage('');

      // Claim from each gauge sequentially
      // Note: For better UX, this could be optimized with multicall in production
      for (const gauge of claimableGauges) {
        await writeContract({
          address: gauge.address,
          abi: GAUGE_ABI,
          functionName: 'getReward',
        });
      }
    } catch (error) {
      console.error('Batch claim error:', error);
      setIsClaiming(false);
      setErrorMessage('Failed to claim all rewards. Please try again.');
    }
  }, [isConnected, isClaiming, claimableGauges, writeContract]);

  return {
    // Gauges info
    gaugeRewards,
    claimableGauges,
    totalRewards,

    // State
    isClaiming: isClaiming || isWriting || isConfirming,
    isLoading: isLoadingGauges,
    errorMessage,

    // Actions
    claimFromGauge,
    claimAll,
    refetchEarned,
  };
};
