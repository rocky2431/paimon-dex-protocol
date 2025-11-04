/**
 * Analytics Dashboard Constants and Helper Functions
 */

import { formatUnits } from 'viem';
import { ProtocolTVL, APRCalculation } from './types';

// ==================== Constants ====================

/**
 * Refresh interval for analytics data (5 minutes)
 */
export const ANALYTICS_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes in ms

/**
 * HYD target price ($1.00 USD)
 */
export const USDP_TARGET_PRICE = 1.0;

/**
 * VotingEscrow MAXTIME (4 years in seconds)
 */
export const MAXTIME = 4 * 365 * 24 * 60 * 60; // 4 years

/**
 * Seconds per year
 */
export const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;

/**
 * Design tokens (OlympusDAO style)
 */
export const ANALYTICS_DESIGN_TOKENS = {
  /** Card border radius */
  RADIUS_CARD: '24px',
  /** Pill border radius */
  RADIUS_PILL: '100px',
  /** Card shadow */
  SHADOW_CARD: 'inset 0 -1px 0 0 rgba(255, 152, 0, 0.1)',
  /** Glow effect */
  GLOW_EFFECT: '0 0 20px rgba(255, 152, 0, 0.3)',
} as const;

// ==================== TVL Calculation ====================

/**
 * Calculate protocol TVL
 * Formula: TVL = PSM minted HYD (×$1) + DEX liquidity (USD)
 *
 * @param psmMinted - Total HYD minted by PSM (18 decimals)
 * @param dexLiquidity - Total DEX liquidity in USD (18 decimals)
 * @returns Protocol TVL breakdown
 */
export const calculateProtocolTVL = (
  psmMinted: bigint,
  dexLiquidity: bigint
): ProtocolTVL => {
  const total = psmMinted + dexLiquidity;

  return {
    total,
    totalFormatted: formatUnits(total, 18),
    psmMinted,
    psmMintedFormatted: formatUnits(psmMinted, 18),
    dexLiquidity,
    dexLiquidityFormatted: formatUnits(dexLiquidity, 18),
  };
};

/**
 * Format large numbers with K/M/B suffixes
 *
 * @param value - Number to format
 * @returns Formatted string (e.g., "1.2M", "500K")
 */
export const formatLargeNumber = (value: number): string => {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }
  return value.toFixed(2);
};

// ==================== APR Calculation ====================

/**
 * Calculate veNFT APR
 * Formula: APR = (annual rewards / lock amount) × 100%
 *
 * Assumptions (Phase 1, simplified):
 * - Annual rewards = protocol fees (70% of swap fees) distributed to veNFT holders
 * - Assume average daily volume = $100K → annual volume = $36.5M
 * - Swap fee = 0.25% → annual fees = $36.5M × 0.0025 = $91,250
 * - veNFT share = 70% → annual rewards = $91,250 × 0.7 = $63,875
 * - If 100K HYD locked → APR = ($63,875 / $100,000) × 100% = 63.88%
 *
 * TODO (Phase 2): Use real protocol fee data from The Graph
 *
 * @param lockAmount - Amount of HYD locked (18 decimals)
 * @param lockDuration - Lock duration in seconds
 * @param totalLockedHYD - Total HYD locked in VotingEscrow (18 decimals)
 * @param annualProtocolFees - Annual protocol fees in USD (18 decimals)
 * @returns APR calculation result
 */
export const calculateVeNFTAPR = (
  lockAmount: bigint,
  lockDuration: bigint,
  totalLockedHYD: bigint,
  annualProtocolFees: bigint = 63_875n * 10n ** 18n // Default: $63,875 (estimated)
): APRCalculation => {
  if (lockAmount === 0n || totalLockedHYD === 0n) {
    return {
      apr: '0%',
      annualRewards: 0n,
      annualRewardsFormatted: '0',
      votingPower: 0n,
      votingPowerFormatted: '0',
    };
  }

  // Calculate voting power (linear decay model)
  // voting power = lock amount × (lock duration / MAXTIME)
  const votingPower = (lockAmount * lockDuration) / BigInt(MAXTIME);

  // Calculate user's share of annual rewards
  // User share = (user voting power / total voting power) × annual fees
  // Simplified: assume total voting power ≈ total locked HYD (average lock time)
  const userShare = (votingPower * annualProtocolFees) / totalLockedHYD;

  // Calculate APR
  // APR = (annual rewards / lock amount) × 100%
  const aprBigInt = (userShare * 10000n) / lockAmount; // Multiply by 10000 for percentage with 2 decimals
  const apr = `${Number(aprBigInt) / 100}%`;

  return {
    apr,
    annualRewards: userShare,
    annualRewardsFormatted: formatUnits(userShare, 18),
    votingPower,
    votingPowerFormatted: formatUnits(votingPower, 18),
  };
};

/**
 * Calculate lock duration in weeks from seconds
 *
 * @param lockDuration - Lock duration in seconds
 * @returns Duration in weeks
 */
export const calculateLockWeeks = (lockDuration: bigint): number => {
  const SECONDS_PER_WEEK = 7 * 24 * 60 * 60;
  return Number(lockDuration) / SECONDS_PER_WEEK;
};

// ==================== Chart Helpers ====================

/**
 * Generate mock HYD price data (Phase 1)
 * TODO (Phase 2): Fetch real price data from The Graph
 *
 * @param dataPoints - Number of data points to generate
 * @returns Array of price data points
 */
export const generateMockPriceData = (dataPoints: number = 30) => {
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  return Array.from({ length: dataPoints }, (_, i) => {
    const timestamp = now - (dataPoints - i - 1) * DAY_MS;
    // Simulate price fluctuation around $1.00 (±2%)
    const priceVariation = (Math.random() - 0.5) * 0.04; // ±2%
    const price = USDP_TARGET_PRICE + priceVariation;

    return {
      timestamp,
      price: Number(price.toFixed(4)),
    };
  });
};

/**
 * Format timestamp for chart display
 *
 * @param timestamp - Unix timestamp (ms)
 * @returns Formatted date string
 */
export const formatChartDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};
