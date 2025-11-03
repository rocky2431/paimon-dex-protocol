/**
 * Custom hook for aggregating user's vault position data
 * 聚合用户Vault仓位数据的自定义Hook
 */

import {
  useVaultDebtOf,
  useVaultHealthFactor,
  useVaultCollateralBalance,
  useVaultCollateralValueUSD,
} from "./useVault";

/**
 * Hook to get complete vault position for a user
 * 获取用户完整Vault仓位的Hook
 *
 * @param userAddress - User's wallet address
 * @param collateralAddress - Collateral token address
 * @returns Aggregated position data with loading and error states
 */
export function useVaultPosition(
  userAddress?: `0x${string}`,
  collateralAddress?: `0x${string}`
) {
  // Fetch all position data in parallel
  const debtQuery = useVaultDebtOf(userAddress);
  const healthFactorQuery = useVaultHealthFactor(userAddress);
  const collateralBalanceQuery = useVaultCollateralBalance(userAddress, collateralAddress);
  const collateralValueQuery = useVaultCollateralValueUSD(userAddress, collateralAddress);

  // Aggregate loading state - true if any query is loading
  const isLoading =
    debtQuery.isLoading ||
    healthFactorQuery.isLoading ||
    collateralBalanceQuery.isLoading ||
    collateralValueQuery.isLoading;

  // Aggregate error state - true if any query errored
  const isError =
    debtQuery.isError ||
    healthFactorQuery.isError ||
    collateralBalanceQuery.isError ||
    collateralValueQuery.isError;

  return {
    // Position data
    debt: debtQuery.data,
    healthFactor: healthFactorQuery.data,
    collateralBalance: collateralBalanceQuery.data,
    collateralValueUSD: collateralValueQuery.data,

    // Aggregated states
    isLoading,
    isError,

    // Individual errors for debugging
    errors: {
      debt: debtQuery.error,
      healthFactor: healthFactorQuery.error,
      collateralBalance: collateralBalanceQuery.error,
      collateralValue: collateralValueQuery.error,
    },

    // Refetch functions for manual refresh
    refetch: {
      debt: debtQuery.refetch,
      healthFactor: healthFactorQuery.refetch,
      collateralBalance: collateralBalanceQuery.refetch,
      collateralValue: collateralValueQuery.refetch,
    },
  };
}
