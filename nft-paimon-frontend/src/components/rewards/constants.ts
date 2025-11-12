/**
 * Rewards Dashboard Constants
 */

import { TESTNET_ADDRESSES } from '@/config/chains/generated/testnet';

/**
 * PAIMON token address
 * Auto-synced from deployment (BSC Testnet)
 */
export const PAIMON_TOKEN_ADDRESS = TESTNET_ADDRESSES.core.paimon;

/**
 * Refresh interval for rewards data (10 seconds)
 */
export const REWARDS_REFRESH_INTERVAL_MS = 10000;

/**
 * Maximum number of claim history entries to display
 */
export const MAX_CLAIM_HISTORY_ENTRIES = 50;

/**
 * Animation duration for counter (ms)
 */
export const COUNTER_ANIMATION_DURATION_MS = 1000;

/**
 * Design tokens (OlympusDAO style)
 */
export const REWARDS_DESIGN_TOKENS = {
  /** Pill-shaped border radius */
  RADIUS_PILL: '100px',
  /** Large border radius for cards */
  RADIUS_LARGE: '24px',
  /** Card shadow (inset style) */
  SHADOW_CARD: 'inset 0 -1px 0 0 rgba(255, 152, 0, 0.1)',
  /** Button shadow */
  SHADOW_BUTTON: '0 4px 12px rgba(255, 152, 0, 0.2)',
} as const;

/**
 * Format timestamp to human-readable string
 * @param timestamp - Unix timestamp (seconds)
 * @returns Formatted date string (e.g., "2025-10-25 14:30")
 */
export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

/**
 * Calculate weighted average APR
 * @param pools - Array of pool rewards with APR
 * @returns Weighted average APR string (e.g., "35.5%")
 */
export const calculateAverageAPR = (pools: Array<{ stakedBalance: bigint; apr: string }>): string => {
  if (pools.length === 0) return '0%';

  let totalStaked = 0n;
  let weightedSum = 0;

  pools.forEach(({ stakedBalance, apr }) => {
    if (stakedBalance > 0n) {
      totalStaked += stakedBalance;
      const aprValue = parseFloat(apr.replace('%', ''));
      weightedSum += aprValue * Number(stakedBalance);
    }
  });

  if (totalStaked === 0n) return '0%';

  const averageAPR = weightedSum / Number(totalStaked);
  return `${averageAPR.toFixed(1)}%`;
};

/**
 * Sort pools by earned rewards (descending)
 * @param pools - Array of pool rewards
 * @returns Sorted array (highest rewards first)
 */
export const sortPoolsByRewards = <T extends { earnedRewards: bigint }>(pools: T[]): T[] => {
  return [...pools].sort((a, b) => {
    if (a.earnedRewards > b.earnedRewards) return -1;
    if (a.earnedRewards < b.earnedRewards) return 1;
    return 0;
  });
};
