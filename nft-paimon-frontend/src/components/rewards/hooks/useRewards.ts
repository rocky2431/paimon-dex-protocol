"use client";

import { useState, useEffect, useMemo } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits } from "viem";
import {
  PoolReward,
  RewardsSummary,
  RewardsDashboardState,
  ValidationResult,
} from "../types";
import { LIQUIDITY_POOLS } from "../../liquidity/constants";
import { config } from "@/config";
import { calculateAverageAPR } from "../constants";

// Helper function to get gauge address from pool name
function getGaugeAddressFromPoolName(
  poolName: string
): `0x${string}` | undefined {
  // Convert pool name to key (e.g., "HYD/USDC" -> "hydUsdc")
  const gaugeKey = poolName
    .replace("/", "")
    .toLowerCase()
    .replace(/\b\w/g, (l, i) => (i === 0 ? l.toLowerCase() : l.toUpperCase()))
    .replace(/\s+/g, "") as keyof typeof config.gauges;

  return config.gauges[gaugeKey] as `0x${string}` | undefined;
}

/**
 * Gauge ABI (minimal)
 */
const GAUGE_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "earned",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getReward",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

/**
 * useRewards Hook
 * Aggregates rewards data from all liquidity pools
 *
 * Features:
 * - Query staked balance and earned rewards for all pools
 * - Calculate total rewards and summary statistics
 * - Claim all rewards in one transaction (batch claim)
 * - Real-time data refresh
 *
 * Note: Hardcoded for 4 pools to satisfy React Hooks rules
 */
export const useRewards = () => {
  const { address, isConnected } = useAccount();
  const {
    writeContract,
    data: txHash,
    isPending: isWriting,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: txHash,
    });

  const [dashboardState, setDashboardState] = useState<RewardsDashboardState>(
    RewardsDashboardState.LOADING
  );
  const [errorMessage, setErrorMessage] = useState<string>("");

  // ==================== Query Pool 0 (HYD/USDC) ====================
  const pool0 = LIQUIDITY_POOLS[0];
  const gauge0 = getGaugeAddressFromPoolName(pool0.name);

  const { data: stakedBalance0 } = useReadContract({
    address: gauge0 || undefined,
    abi: GAUGE_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!gauge0 && !!address,
    },
  });

  const { data: earnedRewards0 } = useReadContract({
    address: gauge0 || undefined,
    abi: GAUGE_ABI,
    functionName: "earned",
    args: address ? [address] : undefined,
    query: {
      enabled: !!gauge0 && !!address,
    },
  });

  // ==================== Query Pool 1 (HYD/WBNB) ====================
  const pool1 = LIQUIDITY_POOLS[1];
  const gauge1 = getGaugeAddressFromPoolName(pool1.name);

  const { data: stakedBalance1 } = useReadContract({
    address: gauge1 || undefined,
    abi: GAUGE_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!gauge1 && !!address,
    },
  });

  const { data: earnedRewards1 } = useReadContract({
    address: gauge1 || undefined,
    abi: GAUGE_ABI,
    functionName: "earned",
    args: address ? [address] : undefined,
    query: {
      enabled: !!gauge1 && !!address,
    },
  });

  // ==================== Query Pool 2 (USDC/BUSD) ====================
  const pool2 = LIQUIDITY_POOLS[2];
  const gauge2 = getGaugeAddressFromPoolName(pool2.name);

  const { data: stakedBalance2 } = useReadContract({
    address: gauge2 || undefined,
    abi: GAUGE_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!gauge2 && !!address,
    },
  });

  const { data: earnedRewards2 } = useReadContract({
    address: gauge2 || undefined,
    abi: GAUGE_ABI,
    functionName: "earned",
    args: address ? [address] : undefined,
    query: {
      enabled: !!gauge2 && !!address,
    },
  });

  // ==================== Query Pool 3 (PAIMON/WBNB) ====================
  const pool3 = LIQUIDITY_POOLS[3];
  const gauge3 = getGaugeAddressFromPoolName(pool3.name);

  const { data: stakedBalance3 } = useReadContract({
    address: gauge3 || undefined,
    abi: GAUGE_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!gauge3 && !!address,
    },
  });

  const { data: earnedRewards3 } = useReadContract({
    address: gauge3 || undefined,
    abi: GAUGE_ABI,
    functionName: "earned",
    args: address ? [address] : undefined,
    query: {
      enabled: !!gauge3 && !!address,
    },
  });

  // ==================== Aggregate Pool Rewards ====================

  const poolRewards: PoolReward[] = useMemo(() => {
    if (!isConnected) return [];

    const rewards: PoolReward[] = [];

    // Pool 0
    if (gauge0) {
      rewards.push({
        pool: pool0,
        gauge: gauge0 as `0x${string}`,
        earnedRewards: earnedRewards0 || 0n,
        earnedRewardsFormatted: formatUnits(earnedRewards0 || 0n, 18),
        stakedBalance: stakedBalance0 || 0n,
        stakedBalanceFormatted: formatUnits(stakedBalance0 || 0n, 18),
        apr: pool0.apr || "0%",
      });
    }

    // Pool 1
    if (gauge1) {
      rewards.push({
        pool: pool1,
        gauge: gauge1 as `0x${string}`,
        earnedRewards: earnedRewards1 || 0n,
        earnedRewardsFormatted: formatUnits(earnedRewards1 || 0n, 18),
        stakedBalance: stakedBalance1 || 0n,
        stakedBalanceFormatted: formatUnits(stakedBalance1 || 0n, 18),
        apr: pool1.apr || "0%",
      });
    }

    // Pool 2
    if (gauge2) {
      rewards.push({
        pool: pool2,
        gauge: gauge2 as `0x${string}`,
        earnedRewards: earnedRewards2 || 0n,
        earnedRewardsFormatted: formatUnits(earnedRewards2 || 0n, 18),
        stakedBalance: stakedBalance2 || 0n,
        stakedBalanceFormatted: formatUnits(stakedBalance2 || 0n, 18),
        apr: pool2.apr || "0%",
      });
    }

    // Pool 3
    if (gauge3) {
      rewards.push({
        pool: pool3,
        gauge: gauge3 as `0x${string}`,
        earnedRewards: earnedRewards3 || 0n,
        earnedRewardsFormatted: formatUnits(earnedRewards3 || 0n, 18),
        stakedBalance: stakedBalance3 || 0n,
        stakedBalanceFormatted: formatUnits(stakedBalance3 || 0n, 18),
        apr: pool3.apr || "0%",
      });
    }

    return rewards;
  }, [
    isConnected,
    gauge0,
    gauge1,
    gauge2,
    gauge3,
    stakedBalance0,
    stakedBalance1,
    stakedBalance2,
    stakedBalance3,
    earnedRewards0,
    earnedRewards1,
    earnedRewards2,
    earnedRewards3,
    pool0,
    pool1,
    pool2,
    pool3,
  ]);

  // ==================== Update Dashboard State ====================

  useEffect(() => {
    setDashboardState(RewardsDashboardState.READY);
  }, [poolRewards]);

  // ==================== Summary Statistics ====================

  const summary: RewardsSummary = useMemo(() => {
    const totalEarnedPAIMON = poolRewards.reduce(
      (sum, pool) => sum + pool.earnedRewards,
      0n
    );
    const activePositions = poolRewards.filter(
      (pool) => pool.stakedBalance > 0n
    ).length;
    const averageAPR = calculateAverageAPR(poolRewards);

    return {
      totalEarnedPAIMON,
      totalEarnedPAIMONFormatted: formatUnits(totalEarnedPAIMON, 18),
      totalStakedValueUSD: "$0", // TODO: Calculate from oracle prices
      averageAPR,
      activePositions,
    };
  }, [poolRewards]);

  // ==================== Validation ====================

  const validation: ValidationResult = useMemo(() => {
    if (!isConnected) {
      return { isValid: false, error: "Please connect wallet" };
    }

    const hasRewards = summary.totalEarnedPAIMON > 0n;
    if (!hasRewards) {
      return { isValid: false, error: "No rewards to claim" };
    }

    return { isValid: true };
  }, [isConnected, summary]);

  // ==================== Claim Handlers ====================

  /**
   * Claim rewards from a single pool
   */
  const handleClaimSingle = async (gaugeAddress: `0x${string}`) => {
    try {
      setDashboardState(RewardsDashboardState.CLAIMING);
      await writeContract({
        address: gaugeAddress,
        abi: GAUGE_ABI,
        functionName: "getReward",
      });
    } catch (error) {
      console.error("Claim single error:", error);
      setDashboardState(RewardsDashboardState.ERROR);
      setErrorMessage("Failed to claim rewards");
    }
  };

  /**
   * Claim all rewards from all pools
   * TODO: Implement batch claim for gas savings
   */
  const handleClaimAll = async () => {
    const poolsWithRewards = poolRewards.filter(
      (pool) => pool.earnedRewards > 0n
    );

    if (poolsWithRewards.length === 0) {
      setErrorMessage("No rewards to claim");
      return;
    }

    try {
      setDashboardState(RewardsDashboardState.CLAIMING);

      // Claim from first pool (TODO: batch claim)
      if (poolsWithRewards.length > 0) {
        await writeContract({
          address: poolsWithRewards[0].gauge,
          abi: GAUGE_ABI,
          functionName: "getReward",
        });
      }
    } catch (error) {
      console.error("Claim all error:", error);
      setDashboardState(RewardsDashboardState.ERROR);
      setErrorMessage("Failed to claim all rewards");
    }
  };

  // ==================== Transaction Status Handling ====================

  useEffect(() => {
    if (isWriting) {
      setDashboardState(RewardsDashboardState.CLAIMING);
    }

    if (isConfirming) {
      // Keep claiming state
    }

    if (isConfirmed) {
      setDashboardState(RewardsDashboardState.SUCCESS);

      // Reset to ready after 2 seconds
      setTimeout(() => {
        setDashboardState(RewardsDashboardState.READY);
      }, 2000);
    }
  }, [isWriting, isConfirming, isConfirmed]);

  // ==================== Return ====================

  return {
    poolRewards,
    summary,
    dashboardState,
    validation,
    errorMessage,
    handleClaimSingle,
    handleClaimAll,
  };
};
