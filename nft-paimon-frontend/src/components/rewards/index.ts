/**
 * Rewards Components Export
 * Central export file for all rewards-related components
 */

// ==================== Main Components ====================
export { RewardsDashboard } from './RewardsDashboard';
export { RewardsSummary } from './RewardsSummary';
export { PoolRewardsList } from './PoolRewardsList';
export { ClaimAllButton } from './ClaimAllButton';

// ==================== Hooks ====================
export { useRewards } from './hooks/useRewards';

// ==================== Types ====================
export type {
  PoolReward,
  RewardsSummary as RewardsSummaryType,
  ClaimHistoryEntry,
  ValidationResult as RewardsValidationResult,
} from './types';

export { RewardsDashboardState } from './types';

// ==================== Constants ====================
export {
  PAIMON_TOKEN_ADDRESS,
  REWARDS_REFRESH_INTERVAL_MS,
  MAX_CLAIM_HISTORY_ENTRIES,
  COUNTER_ANIMATION_DURATION_MS,
  REWARDS_DESIGN_TOKENS,
  formatTimestamp,
  calculateAverageAPR,
  sortPoolsByRewards,
} from './constants';
