/**
 * Custom wagmi hooks for EmissionManager contract
 * EmissionManager合约的自定义hooks
 */

import { useReadContract } from "wagmi";
import { EMISSION_MANAGER_ABI } from "@/config/contracts/emissionManager";
import { testnet } from "@/config/chains/testnet";

/**
 * Hook to read weekly emission budget for a specific week
 * 读取指定周的排放预算的Hook
 */
export function useEmissionWeeklyBudget(week?: number) {
  return useReadContract({
    address: testnet.tokens.emissionManager,
    abi: EMISSION_MANAGER_ABI,
    functionName: "getWeeklyBudget",
    args: week !== undefined ? [BigInt(week)] : undefined,
    query: {
      enabled: week !== undefined,
    },
  });
}

/**
 * Hook to read emission phase parameters
 * 读取排放阶段参数的Hook
 */
export function useEmissionPhaseParams(
  paramName:
    | "PHASE_A_END"
    | "PHASE_A_WEEKLY"
    | "PHASE_B_END"
    | "PHASE_C_END"
    | "PHASE_C_WEEKLY"
) {
  return useReadContract({
    address: testnet.tokens.emissionManager,
    abi: EMISSION_MANAGER_ABI,
    functionName: paramName,
  });
}

/**
 * Hook to read emission distribution basis points
 * 读取排放分配比例的Hook (basis points: 10000 = 100%)
 */
export function useEmissionDistributionBps(
  paramName:
    | "LP_TOTAL_BPS"
    | "DEBT_BPS"
    | "STABILITY_POOL_BPS"
    | "ECO_BPS"
    | "BASIS_POINTS"
) {
  return useReadContract({
    address: testnet.tokens.emissionManager,
    abi: EMISSION_MANAGER_ABI,
    functionName: paramName,
  });
}
