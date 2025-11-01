/**
 * Boost Module Type Definitions
 * Boost 模块类型定义
 */

/**
 * Boost Stake Information
 * 质押信息
 */
export interface BoostStake {
  /** Staked amount in wei */
  amount: bigint;
  /** Staked amount formatted (e.g., "1000.0") */
  amountFormatted: string;
  /** Stake timestamp (Unix timestamp in seconds) */
  stakeTime: number;
  /** Unlock time (Unix timestamp in seconds) */
  unlockTime: number;
  /** Current boost multiplier (10000-15000, representing 1.0x-1.5x) */
  boostMultiplier: number;
  /** Boost multiplier formatted (e.g., "1.25x") */
  boostMultiplierFormatted: string;
  /** Can unstake? (7 days passed) */
  canUnstake: boolean;
  /** Time remaining until unlock (in seconds) */
  timeRemaining: number;
}

/**
 * Boost Statistics
 * 统计信息
 */
export interface BoostStats {
  /** Total PAIMON staked in Boost contract */
  totalStaked: bigint;
  /** Total staked formatted */
  totalStakedFormatted: string;
  /** User's staked amount */
  userStaked: bigint;
  /** User's staked amount formatted */
  userStakedFormatted: string;
  /** User's boost multiplier */
  userMultiplier: number;
  /** User's boost multiplier formatted */
  userMultiplierFormatted: string;
  /** User's share of total staked (percentage) */
  userSharePercentage: string;
}

/**
 * Boost Calculation Result
 * 计算结果
 */
export interface BoostCalculation {
  /** Input amount */
  inputAmount: string;
  /** Estimated boost multiplier */
  estimatedMultiplier: number;
  /** Estimated multiplier formatted */
  estimatedMultiplierFormatted: string;
  /** Estimated reward increase (percentage) */
  rewardIncrease: string;
  /** Example: Base reward */
  exampleBaseReward: string;
  /** Example: Boosted reward */
  exampleBoostedReward: string;
}

/**
 * Boost History Entry
 * 历史记录条目
 */
export interface BoostHistoryEntry {
  /** Transaction hash */
  txHash: string;
  /** Action type */
  action: 'stake' | 'unstake';
  /** Amount */
  amount: string;
  /** Timestamp */
  timestamp: number;
  /** Boost multiplier after action */
  multiplierAfter: string;
}

/**
 * Component Props Types
 */

export interface BoostStakingCardProps {
  /** Current stake info */
  stake?: BoostStake;
  /** Loading state */
  isLoading?: boolean;
  /** Error message */
  error?: string;
}

export interface BoostCalculatorProps {
  /** Current user balance */
  userBalance: string;
  /** Current multiplier */
  currentMultiplier: number;
  /** On calculate callback */
  onCalculate?: (amount: string) => void;
}

export interface BoostHistoryProps {
  /** History entries */
  entries: BoostHistoryEntry[];
  /** Loading state */
  isLoading?: boolean;
}
