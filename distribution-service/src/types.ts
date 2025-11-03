import { BigNumberish } from 'ethers';

/**
 * Snapshot data for a single user across all reward sources
 */
export interface UserSnapshot {
  address: string;
  // Debt in USDP (from USDPVault)
  debt: bigint;
  // LP shares for each pool
  lpShares: Record<string, bigint>;
  // Stability pool shares
  stabilityPoolShares: bigint;
  // Timestamp of snapshot
  timestamp: number;
}

/**
 * Aggregated snapshot for an epoch
 */
export interface EpochSnapshot {
  epoch: number;
  startBlock: number;
  endBlock: number;
  timestamp: number;
  users: UserSnapshot[];
  // Total values for validation
  totalDebt: bigint;
  totalLpShares: Record<string, bigint>;
  totalStabilityPoolShares: bigint;
}

/**
 * TWAD (Time-Weighted Average Debt) calculation result
 */
export interface TWADWeight {
  address: string;
  // Weight for debt-based rewards (0-1)
  debtWeight: number;
  // Weight for LP-based rewards per pool
  lpWeights: Record<string, number>;
  // Weight for stability pool rewards
  stabilityPoolWeight: number;
}

/**
 * Reward allocation for a single user
 */
export interface UserReward {
  address: string;
  // Total reward amount
  totalReward: bigint;
  // Breakdown by source
  debtReward: bigint;
  lpRewards: Record<string, bigint>;
  stabilityPoolReward: bigint;
  // Merkle proof
  proof: string[];
}

/**
 * Complete reward distribution data
 */
export interface RewardDistribution {
  epoch: number;
  merkleRoot: string;
  totalRewards: bigint;
  recipients: UserReward[];
  // Metadata for validation
  weeklyBudget: bigint;
  timestamp: number;
}

/**
 * Configuration for snapshot service
 */
export interface SnapshotConfig {
  rpcUrl: string;
  contracts: {
    usdpVault: string;
    stabilityPool: string;
    gaugeController: string;
    rewardDistributor: string;
    emissionManager: string;
    lpTokens: string[];
  };
  snapshot: {
    blockRange: number;
    interval: number;
  };
  merkle: {
    treeHeight: number;
  };
  output: {
    dir: string;
    snapshotCsv: string;
    weightsCsv: string;
    rewardsCsv: string;
    merkleJson: string;
  };
  validation: {
    maxRewardDeviation: number;
  };
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    totalRewards: bigint;
    weeklyBudget: bigint;
    recipientCount: number;
    rewardDeviation: number;
  };
}
