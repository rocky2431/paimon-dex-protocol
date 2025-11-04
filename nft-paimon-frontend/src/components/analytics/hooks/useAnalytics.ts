'use client';

/**
 * Analytics Dashboard Hook
 * Uses wagmi v2 to query on-chain data for TVL calculation
 *
 * Data Sources:
 * - USDP.totalSupply() - Total USDP in circulation (replaces deprecated PSM.totalMintedUSDP)
 * - PriceOracle.getPrice("USDP") - Current USDP/USD price
 *
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
import { config } from '@/config';

// ==================== Contract ABIs ====================

/**
 * ERC20 Contract ABI (totalSupply function)
 * Standard ERC20 interface for querying USDP total supply
 */
const ERC20_ABI = [
  {
    inputs: [],
    name: 'totalSupply',
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
 * USDP Token Contract Address
 * Retrieved from centralized config
 */
const USDP_ADDRESS = config.tokenConfig.usdp.address as `0x${string}`;

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
 * - Queries USDP.totalSupply() for TVL calculation
 * - Queries PriceOracle.getPrice("USDP") for current price
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
   * Query USDP.totalSupply()
   * Returns total USDP in circulation (18 decimals)
   */
  const {
    data: totalUSDPSupply,
    isLoading: isUSDPLoading,
    isError: isUSDPError,
    error: usdpError,
    refetch: refetchUSDPSupply,
  } = useReadContract({
    address: USDP_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'totalSupply',
    query: {
      // Refresh every 5 minutes
      refetchInterval: ANALYTICS_REFRESH_INTERVAL,
      // Cache data for 1 minute
      staleTime: 60_000,
    },
  });

  /**
   * Query PriceOracle.getPrice("USDP")
   * Returns USDP price in USD (8 decimals, Chainlink format)
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
    args: ['USDP'],
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
  const isLoading = isUSDPLoading || isPriceLoading;

  /**
   * Combined error state
   */
  const hasError = isUSDPError || isPriceError;

  /**
   * Combined error message
   */
  const combinedError = hasError
    ? `Failed to fetch analytics data: ${
        usdpError?.message || priceError?.message || 'Unknown error'
      }`
    : undefined;

  /**
   * Parse USDP price (8 decimals → number)
   */
  const hydPrice = hydPriceRaw
    ? Number(formatUnits(hydPriceRaw, 8))
    : 1.0; // Default to $1.00

  /**
   * Calculate Protocol TVL
   * Formula: TVL = USDP total supply (×$1) + DEX liquidity (mock $0 for Phase 1)
   */
  const tvl: ProtocolTVL = totalUSDPSupply
    ? calculateProtocolTVL(
        totalUSDPSupply,
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
    Promise.all([refetchUSDPSupply(), refetchPrice()]).finally(() => {
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
