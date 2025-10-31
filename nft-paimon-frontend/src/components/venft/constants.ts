/**
 * veNFT Constants
 * Vote-Escrowed NFT configuration (Velodrome/Thena model)
 */

import { ANIMATION_CONFIG, DESIGN_TOKENS } from "../swap/constants";
import { config } from "@/config";

// Re-export design tokens for consistency
export { ANIMATION_CONFIG, DESIGN_TOKENS };

// Lock duration constants (Velodrome/Curve model)
export const LOCK_DURATION = {
  MIN_LOCK: 7 * 24 * 60 * 60, // 1 week in seconds (604800)
  MAX_LOCK: 4 * 365 * 24 * 60 * 60, // 4 years in seconds (126144000)

  // Common presets
  ONE_WEEK: 7 * 24 * 60 * 60,
  ONE_MONTH: 30 * 24 * 60 * 60,
  THREE_MONTHS: 90 * 24 * 60 * 60,
  SIX_MONTHS: 180 * 24 * 60 * 60,
  ONE_YEAR: 365 * 24 * 60 * 60,
  TWO_YEARS: 2 * 365 * 24 * 60 * 60,
  FOUR_YEARS: 4 * 365 * 24 * 60 * 60,
};

// Voting power calculation
export const VOTING_POWER = {
  /**
   * Calculate voting power based on lock duration
   * Formula: voting_power = amount × (lock_duration / MAX_LOCK)
   *
   * Examples:
   * - 100 HYD locked for 4 years = 100 veHYD (100% voting power)
   * - 100 HYD locked for 2 years = 50 veHYD (50% voting power)
   * - 100 HYD locked for 1 year = 25 veHYD (25% voting power)
   */
  calculateVotingPower: (amount: bigint, durationSeconds: number): bigint => {
    return (amount * BigInt(durationSeconds)) / BigInt(LOCK_DURATION.MAX_LOCK);
  },

  /**
   * Calculate power percentage (0-100)
   */
  calculatePowerPercentage: (durationSeconds: number): number => {
    return (durationSeconds / LOCK_DURATION.MAX_LOCK) * 100;
  },
};

// Slider configuration
export const SLIDER_CONFIG = {
  // Marks for the duration slider
  MARKS: [
    { value: LOCK_DURATION.ONE_WEEK, label: "1W" },
    { value: LOCK_DURATION.ONE_MONTH, label: "1M" },
    { value: LOCK_DURATION.THREE_MONTHS, label: "3M" },
    { value: LOCK_DURATION.SIX_MONTHS, label: "6M" },
    { value: LOCK_DURATION.ONE_YEAR, label: "1Y" },
    { value: LOCK_DURATION.TWO_YEARS, label: "2Y" },
    { value: LOCK_DURATION.FOUR_YEARS, label: "4Y" },
  ],

  // Default lock duration (1 year)
  DEFAULT_DURATION: LOCK_DURATION.ONE_YEAR,
};

// Contract addresses
export const VENFT_ADDRESSES = {
  VOTING_ESCROW: config.tokens.votingEscrow as `0x${string}`,
  HYD_TOKEN: config.tokens.hyd as `0x${string}`,
};

// Messages
export const VENFT_MESSAGES = {
  LOCK_SUCCESS: "Lock created successfully! 🎉",
  LOCK_ERROR: "Failed to create lock. Please try again.",
  APPROVAL_SUCCESS: "HYD approved successfully",
  APPROVAL_ERROR: "Approval failed. Please try again.",
  INSUFFICIENT_BALANCE: "Insufficient HYD balance",
  INVALID_AMOUNT: "Please enter a valid amount",
  INVALID_DURATION: "Lock duration must be between 1 week and 4 years",
  CONNECT_WALLET: "Please connect your wallet",
  MIN_LOCK_AMOUNT: "Minimum lock amount is 0.01 HYD",
};

// Minimum lock amount
export const MIN_LOCK_AMOUNT = "0.01";

// NFT visual configuration (for future dynamic NFT rendering)
export const NFT_VISUAL = {
  // Color gradient based on lock duration
  getColorGradient: (powerPercentage: number): string => {
    // 0-25%: Light orange
    if (powerPercentage < 25)
      return "linear-gradient(135deg, #FFE0B2 0%, #FFCC80 100%)";
    // 25-50%: Medium orange
    if (powerPercentage < 50)
      return "linear-gradient(135deg, #FFB74D 0%, #FFA726 100%)";
    // 50-75%: Deep orange
    if (powerPercentage < 75)
      return "linear-gradient(135deg, #FF9800 0%, #FB8C00 100%)";
    // 75-100%: Dark orange
    return "linear-gradient(135deg, #F57C00 0%, #E65100 100%)";
  },

  // Size based on locked amount (for visual scaling)
  getSizeMultiplier: (amountFormatted: number): number => {
    if (amountFormatted < 100) return 1.0;
    if (amountFormatted < 1000) return 1.2;
    if (amountFormatted < 10000) return 1.4;
    return 1.6;
  },
};

// Date formatting helpers
export const formatLockDuration = (seconds: number): string => {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const years = Math.floor(days / 365);
  const remainingDays = days % 365;
  const months = Math.floor(remainingDays / 30);
  const remainingDaysAfterMonths = remainingDays % 30;

  const parts: string[] = [];
  if (years > 0) parts.push(`${years}Y`);
  if (months > 0) parts.push(`${months}M`);
  if (remainingDaysAfterMonths > 0) parts.push(`${remainingDaysAfterMonths}D`);

  return parts.join(" ") || "0D";
};

export const formatUnlockDate = (unlockTime: number): string => {
  const date = new Date(unlockTime * 1000);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};
