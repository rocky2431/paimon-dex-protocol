/**
 * Boost Module Constants
 * Boost 模块常量
 */

/**
 * Boost multiplier range (basis points)
 * 10000 = 1.0x (minimum)
 * 15000 = 1.5x (maximum)
 */
export const BOOST_MULTIPLIER_MIN = 10000;
export const BOOST_MULTIPLIER_MAX = 15000;

/**
 * Minimum stake duration (7 days in seconds)
 */
export const MIN_STAKE_DURATION_SECONDS = 7 * 24 * 60 * 60;

/**
 * Boost formula constant
 * Multiplier = 10000 + (amount / 1000) * 100
 * Cap at 15000 (1.5x)
 */
export const BOOST_FORMULA_DIVISOR = 1000;
export const BOOST_FORMULA_FACTOR = 100;

/**
 * Refresh interval for boost data (10 seconds)
 */
export const BOOST_REFRESH_INTERVAL_MS = 10000;

/**
 * Design tokens (Material Design 3 + warm colors)
 */
export const BOOST_DESIGN_TOKENS = {
  /** Pill-shaped border radius */
  RADIUS_PILL: '100px',
  /** Large border radius for cards */
  RADIUS_LARGE: '24px',
  /** Medium border radius */
  RADIUS_MEDIUM: '16px',
  /** Small border radius */
  RADIUS_SMALL: '12px',
  /** Card shadow (elevated) */
  SHADOW_CARD: '0 2px 8px rgba(255, 107, 0, 0.12)',
  /** Button shadow */
  SHADOW_BUTTON: '0 4px 12px rgba(255, 107, 0, 0.2)',
  /** Hover shadow */
  SHADOW_HOVER: '0 8px 24px rgba(255, 107, 0, 0.24)',
  /** Primary color (orange) */
  COLOR_PRIMARY: '#ff6b00',
  /** Secondary color (lighter orange) */
  COLOR_SECONDARY: '#ff8c00',
  /** Accent color (warm yellow) */
  COLOR_ACCENT: '#ffa000',
  /** Success color (warm green) */
  COLOR_SUCCESS: '#8bc34a',
  /** Warning color (amber) */
  COLOR_WARNING: '#ffb300',
} as const;

/**
 * Calculate boost multiplier from staked amount
 * Formula: 1.0 + (amount / 1000) * 0.1, cap at 1.5x
 *
 * @param amount - Staked amount in PAIMON (not wei)
 * @returns Boost multiplier in basis points (10000-15000)
 *
 * @example
 * calculateBoostMultiplier(0) => 10000 (1.0x)
 * calculateBoostMultiplier(1000) => 11000 (1.1x)
 * calculateBoostMultiplier(5000) => 15000 (1.5x, capped)
 */
export const calculateBoostMultiplier = (amount: number): number => {
  const multiplier = BOOST_MULTIPLIER_MIN + Math.floor((amount / BOOST_FORMULA_DIVISOR) * BOOST_FORMULA_FACTOR);
  return Math.min(multiplier, BOOST_MULTIPLIER_MAX);
};

/**
 * Format boost multiplier to human-readable string
 *
 * @param multiplier - Multiplier in basis points (10000-15000)
 * @returns Formatted string (e.g., "1.25x")
 *
 * @example
 * formatBoostMultiplier(10000) => "1.0x"
 * formatBoostMultiplier(12500) => "1.25x"
 * formatBoostMultiplier(15000) => "1.5x"
 */
export const formatBoostMultiplier = (multiplier: number): string => {
  return `${(multiplier / 10000).toFixed(2)}x`;
};

/**
 * Calculate time remaining until unlock
 *
 * @param stakeTime - Stake timestamp (Unix seconds)
 * @returns Time remaining in seconds (0 if unlocked)
 */
export const calculateTimeRemaining = (stakeTime: number): number => {
  const unlockTime = stakeTime + MIN_STAKE_DURATION_SECONDS;
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, unlockTime - now);
};

/**
 * Format time remaining to human-readable string
 *
 * @param seconds - Time remaining in seconds
 * @returns Formatted string (e.g., "2d 5h", "12h 30m", "45m")
 *
 * @example
 * formatTimeRemaining(0) => "Ready"
 * formatTimeRemaining(3600) => "1h"
 * formatTimeRemaining(90000) => "1d 1h"
 */
export const formatTimeRemaining = (seconds: number): string => {
  if (seconds === 0) return 'Ready';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

/**
 * Format timestamp to human-readable date
 *
 * @param timestamp - Unix timestamp (seconds)
 * @returns Formatted date string (e.g., "2025-11-02 20:45")
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
 * Calculate reward increase percentage
 *
 * @param multiplier - Boost multiplier in basis points
 * @returns Percentage increase (e.g., "25%")
 *
 * @example
 * calculateRewardIncrease(11000) => "10%"
 * calculateRewardIncrease(12500) => "25%"
 * calculateRewardIncrease(15000) => "50%"
 */
export const calculateRewardIncrease = (multiplier: number): string => {
  const increase = ((multiplier - BOOST_MULTIPLIER_MIN) / BOOST_MULTIPLIER_MIN) * 100;
  return `${increase.toFixed(1)}%`;
};
