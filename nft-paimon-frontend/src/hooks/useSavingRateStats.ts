/**
 * Custom wagmi hooks for SavingRate contract stats
 * SavingRate合约统计信息的自定义hooks
 */

import { useReadContract } from "wagmi";
import { SAVINGRATE_ABI } from "@/config/contracts/savingRate";
import { testnet } from "@/config/chains/testnet";

/**
 * Hook to read total funded amount
 * 读取累计注资金额的Hook
 */
export function useSavingRateTotalFunded() {
  return useReadContract({
    address: testnet.tokens.savingRate,
    abi: SAVINGRATE_ABI,
    functionName: "totalFunded",
  });
}

/**
 * Hook to read annual rate
 * 读取年化利率的Hook
 */
export function useSavingRateAnnualRate() {
  return useReadContract({
    address: testnet.tokens.savingRate,
    abi: SAVINGRATE_ABI,
    functionName: "annualRate",
  });
}

/**
 * Hook to read last rate update time
 * 读取上次利率更新时间的Hook
 */
export function useSavingRateLastUpdateTime() {
  return useReadContract({
    address: testnet.tokens.savingRate,
    abi: SAVINGRATE_ABI,
    functionName: "lastRateUpdateTime",
  });
}

/**
 * Hook to read week start rate
 * 读取本周起始利率的Hook
 */
export function useSavingRateWeekStartRate() {
  return useReadContract({
    address: testnet.tokens.savingRate,
    abi: SAVINGRATE_ABI,
    functionName: "weekStartRate",
  });
}

/**
 * Hook to get all SavingRate stats
 * 获取所有SavingRate统计信息的Hook
 *
 * @returns {object} Stats object with all SavingRate metrics
 */
export function useSavingRateStats() {
  const totalFundedQuery = useSavingRateTotalFunded();
  const annualRateQuery = useSavingRateAnnualRate();
  const lastUpdateQuery = useSavingRateLastUpdateTime();
  const weekStartQuery = useSavingRateWeekStartRate();

  return {
    totalFunded: totalFundedQuery.data,
    annualRate: annualRateQuery.data,
    lastRateUpdateTime: lastUpdateQuery.data,
    weekStartRate: weekStartQuery.data,
    isLoading:
      totalFundedQuery.isLoading ||
      annualRateQuery.isLoading ||
      lastUpdateQuery.isLoading ||
      weekStartQuery.isLoading,
    isError:
      totalFundedQuery.isError ||
      annualRateQuery.isError ||
      lastUpdateQuery.isError ||
      weekStartQuery.isError,
  };
}
