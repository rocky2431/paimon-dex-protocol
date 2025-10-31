'use client';

/**
 * Analytics Dashboard Hook
 * Uses wagmi v2 to query on-chain data (PSM, PriceOracle)
 * Auto-refreshes every 5 minutes
 */

import { useEffect, useState } from 'react';
import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import {
  AnalyticsSummary,
  AnalyticsDashboardState,
  ProtocolTVL,
} from '../types';
import {
  calculateProtocolTVL,
  ANALYTICS_REFRESH_INTERVAL,
} from '../constants';

// ==================== Contract ABIs ====================

/**
 * PSM Contract ABI (totalMintedHYD function)
 */
const PSM_ABI = [
  {
    inputs: [],
    name: 'totalMintedHYD',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * PriceOracle Contract ABI (getPrice function)
 */
const PRICE_ORACLE_ABI = [
  {
    inputs: [{ name: 'symbol', type: 'string' }],
    name: 'getPrice',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ==================== Contract Addresses ====================

/**
 * PSM Contract Address (Mock for Phase 1)
 * TODO (Phase 2): Replace with actual deployed address
 */
const PSM_ADDRESS = '0x0000000000000000000000000000000000000900' as `0x${string}`;

/**
 * PriceOracle Contract Address (Mock for Phase 1)
 * TODO (Phase 2): Replace with actual deployed address
 */
const PRICE_ORACLE_ADDRESS =
  '0x0000000000000000000000000000000000000A00' as `0x${string}`;

// ==================== Hook Return Type ====================

/**
 * useAnalytics hook return value
 */
export interface UseAnalyticsResult {
  /** Analytics data summary */
  summary: AnalyticsSummary;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | undefined;
  /** Refetch function */
  refetch: () => void;
}

// ==================== Main Hook ====================

/**
 * Analytics Dashboard Hook
 *
 * Features:
 * - Queries PSM.totalMintedHYD() for TVL calculation
 * - Queries PriceOracle.getPrice("HYD") for current price
 * - Auto-refreshes every 5 minutes
 * - Returns aggregated analytics data
 *
 * @returns Analytics data and controls
 */
export const useAnalytics = (): UseAnalyticsResult => {
  // ==================== State ====================

  const [dashboardState, setDashboardState] = useState<AnalyticsDashboardState>(
    AnalyticsDashboardState.LOADING
  );
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  // ==================== Contract Reads ====================

  /**
   * Query PSM.totalMintedHYD()
   * Returns total HYD minted through PSM (18 decimals)
   */
  const {
    data: totalMintedHYD,
    isLoading: isPSMLoading,
    isError: isPSMError,
    error: psmError,
    refetch: refetchPSM,
  } = useReadContract({
    address: PSM_ADDRESS,
    abi: PSM_ABI,
    functionName: 'totalMintedHYD',
    query: {
      // Refresh every 5 minutes
      refetchInterval: ANALYTICS_REFRESH_INTERVAL,
      // Cache data for 1 minute
      staleTime: 60_000,
    },
  });

  /**
   * Query PriceOracle.getPrice("HYD")
   * Returns HYD price in USD (8 decimals, Chainlink format)
   */
  const {
    data: hydPriceRaw,
    isLoading: isPriceLoading,
    isError: isPriceError,
    error: priceError,
    refetch: refetchPrice,
  } = useReadContract({
    address: PRICE_ORACLE_ADDRESS,
    abi: PRICE_ORACLE_ABI,
    functionName: 'getPrice',
    args: ['HYD'],
    query: {
      // Refresh every 5 minutes
      refetchInterval: ANALYTICS_REFRESH_INTERVAL,
      // Cache data for 1 minute
      staleTime: 60_000,
    },
  });

  // ==================== Derived State ====================

  /**
   * Combined loading state
   */
  const isLoading = isPSMLoading || isPriceLoading;

  /**
   * Combined error state
   */
  const hasError = isPSMError || isPriceError;

  /**
   * Combined error message
   */
  const combinedError = hasError
    ? `Failed to fetch analytics data: ${
        psmError?.message || priceError?.message || 'Unknown error'
      }`
    : undefined;

  /**
   * Parse HYD price (8 decimals → number)
   */
  const hydPrice = hydPriceRaw
    ? Number(formatUnits(hydPriceRaw, 8))
    : 1.0; // Default to $1.00

  /**
   * Calculate Protocol TVL
   * Formula: TVL = PSM minted HYD (×$1) + DEX liquidity (mock $0 for Phase 1)
   */
  const tvl: ProtocolTVL = totalMintedHYD
    ? calculateProtocolTVL(
        totalMintedHYD,
        0n // DEX liquidity (Phase 2)
      )
    : {
        total: 0n,
        totalFormatted: '0',
        psmMinted: 0n,
        psmMintedFormatted: '0',
        dexLiquidity: 0n,
        dexLiquidityFormatted: '0',
      };

  // ==================== Effects ====================

  /**
   * Update dashboard state based on loading/error status
   */
  useEffect(() => {
    if (isLoading) {
      setDashboardState(AnalyticsDashboardState.LOADING);
      setErrorMessage(undefined);
    } else if (hasError) {
      setDashboardState(AnalyticsDashboardState.ERROR);
      setErrorMessage(combinedError);
    } else {
      setDashboardState(AnalyticsDashboardState.READY);
      setErrorMessage(undefined);
    }
  }, [isLoading, hasError, combinedError]);

  // ==================== Refetch Function ====================

  /**
   * Manually refetch all data
   */
  const refetch = () => {
    setDashboardState(AnalyticsDashboardState.REFRESHING);
    Promise.all([refetchPSM(), refetchPrice()]).finally(() => {
      // State will be updated by useEffect
    });
  };

  // ==================== Return ====================

  const summary: AnalyticsSummary = {
    tvl,
    hydPrice,
    dashboardState,
    errorMessage,
  };

  return {
    summary,
    isLoading,
    error: errorMessage,
    refetch,
  };
};

// ==================== Export ====================

export default useAnalytics;
