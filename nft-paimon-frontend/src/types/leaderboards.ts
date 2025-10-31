/**
 * Leaderboard Type Definitions
 * Types for the leaderboard system matching RemintController contract
 */

/**
 * Leaderboard types matching contract constants
 * LEADERBOARD_TOP_EARNERS = 0
 * LEADERBOARD_LUCKIEST_ROLLERS = 1
 * LEADERBOARD_SOCIAL_CHAMPIONS = 2
 */
export enum LeaderboardType {
  TOP_EARNERS = 0,
  LUCKIEST_ROLLERS = 1,
  SOCIAL_CHAMPIONS = 2,
}

/**
 * Single leaderboard entry
 */
export interface LeaderboardEntry {
  /** Rank position (1-indexed) */
  rank: number;
  /** User wallet address */
  address: string;
  /** User's NFT token ID */
  tokenId: number;
  /** Score value (depends on leaderboard type) */
  score: number;
  /** User's display name or shortened address */
  displayName?: string;
}

/**
 * Complete leaderboard data
 */
export interface LeaderboardData {
  /** Leaderboard type */
  type: LeaderboardType;
  /** Leaderboard title */
  title: string;
  /** Leaderboard description */
  description: string;
  /** Score label (e.g., "USDC Earned", "Points Rolled") */
  scoreLabel: string;
  /** Icon name for display */
  icon: string;
  /** Top entries (default: top 10) */
  entries: LeaderboardEntry[];
  /** Total number of entries in full leaderboard */
  totalEntries: number;
  /** Last update timestamp */
  lastUpdated: number;
}

/**
 * User's rank information
 */
export interface UserRank {
  /** User's wallet address */
  address: string;
  /** User's NFT token ID */
  tokenId: number;
  /** User's rank for each leaderboard type */
  ranks: {
    [LeaderboardType.TOP_EARNERS]: number | null;
    [LeaderboardType.LUCKIEST_ROLLERS]: number | null;
    [LeaderboardType.SOCIAL_CHAMPIONS]: number | null;
  };
  /** User's scores for each leaderboard type */
  scores: {
    [LeaderboardType.TOP_EARNERS]: number;
    [LeaderboardType.LUCKIEST_ROLLERS]: number;
    [LeaderboardType.SOCIAL_CHAMPIONS]: number;
  };
}

/**
 * Leaderboard configuration
 */
export const LEADERBOARD_CONFIG = {
  [LeaderboardType.TOP_EARNERS]: {
    title: 'Top Earners',
    description: 'Highest total Remint rewards earned',
    scoreLabel: 'USDC Earned',
    icon: 'AttachMoney',
    color: '#FFB74D', // Warm amber
  },
  [LeaderboardType.LUCKIEST_ROLLERS]: {
    title: 'Luckiest Rollers',
    description: 'Highest single dice roll recorded',
    scoreLabel: 'Best Roll',
    icon: 'Casino',
    color: '#FF6B35', // Primary orange
  },
  [LeaderboardType.SOCIAL_CHAMPIONS]: {
    title: 'Social Champions',
    description: 'Most social tasks completed',
    scoreLabel: 'Tasks Done',
    icon: 'EmojiEvents',
    color: '#8BC34A', // Warm green
  },
} as const;

/**
 * Dice data returned from contract
 */
export interface DiceData {
  diceType: number;
  rollsThisWeek: number;
  lastRollTimestamp: bigint;
  totalRemintEarned: bigint;
  lastWeekNumber: bigint;
}
