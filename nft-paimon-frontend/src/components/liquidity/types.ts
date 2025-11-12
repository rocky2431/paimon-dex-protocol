/**
 * Liquidity Component Type Definitions
 * Inspired by Velodrome Finance + Uniswap V2
 */

// ==================== Enums ====================

/**
 * State machine for add liquidity flow
 */
export enum AddLiquidityState {
  /** Initial state - waiting for user input */
  IDLE = "IDLE",
  /** Pool does not exist - needs creation */
  POOL_NOT_EXIST = "POOL_NOT_EXIST",
  /** Creating new pool */
  CREATING_POOL = "CREATING_POOL",
  /** Token A needs approval */
  NEEDS_APPROVAL_A = "NEEDS_APPROVAL_A",
  /** Token B needs approval */
  NEEDS_APPROVAL_B = "NEEDS_APPROVAL_B",
  /** Approving Token A */
  APPROVING_A = "APPROVING_A",
  /** Approving Token B */
  APPROVING_B = "APPROVING_B",
  /** Ready to add liquidity */
  READY = "READY",
  /** Adding liquidity transaction in progress */
  ADDING = "ADDING",
  /** Successfully added liquidity */
  SUCCESS = "SUCCESS",
  /** Error occurred */
  ERROR = "ERROR",
}

/**
 * State machine for remove liquidity flow
 */
export enum RemoveLiquidityState {
  /** Initial state - waiting for user input */
  IDLE = "IDLE",
  /** LP token needs approval */
  NEEDS_APPROVAL = "NEEDS_APPROVAL",
  /** Approving LP token */
  APPROVING = "APPROVING",
  /** Ready to remove liquidity */
  READY = "READY",
  /** Removing liquidity transaction in progress */
  REMOVING = "REMOVING",
  /** Successfully removed liquidity */
  SUCCESS = "SUCCESS",
  /** Error occurred */
  ERROR = "ERROR",
}

/**
 * Pool types (Velodrome-style)
 */
export enum PoolType {
  /** Volatile pool (xy=k) for uncorrelated assets */
  VOLATILE = "volatile",
  /** Stable pool (x³y+y³x=k) for correlated assets */
  STABLE = "stable",
}

// ==================== Interfaces ====================

/**
 * Token information
 * Token type imported from centralized config
 */
export type Token = import("@/config/chains/types").Token;

/**
 * Liquidity pool information
 */
export interface LiquidityPool {
  /** Pool pair address */
  address: `0x${string}`;
  /** Token A */
  token0: Token;
  /** Token B */
  token1: Token;
  /** Pool type (volatile or stable) */
  type: PoolType;
  /** Reserve of token0 */
  reserve0: bigint;
  /** Reserve of token1 */
  reserve1: bigint;
  /** Total LP token supply */
  totalSupply: bigint;
  /** Pool name (e.g., "USDP/USDC") */
  name: string;
  /** Annual Percentage Rate (for display) */
  apr?: string;
  /** Total Value Locked (for display) */
  tvl?: string;
}

/**
 * Token amount with balance
 */
export interface TokenAmount {
  /** Token information */
  token: Token;
  /** Amount to deposit (in wei) */
  amount: bigint;
  /** Amount in human-readable format */
  amountFormatted: string;
  /** User's wallet balance (in wei) */
  balance: bigint;
  /** Balance in human-readable format */
  balanceFormatted: string;
}

/**
 * Add liquidity form data
 */
export interface AddLiquidityFormData {
  /** Selected token A (user chooses freely) */
  selectedTokenA: Token | null;
  /** Selected token B (user chooses freely) */
  selectedTokenB: Token | null;
  /** Detected/created pool address */
  pairAddress: `0x${string}` | null;
  /** Pool information (fetched after pair detection) */
  pool: LiquidityPool | null;
  /** Token A amount */
  tokenA: TokenAmount | null;
  /** Token B amount (auto-calculated) */
  tokenB: TokenAmount | null;
  /** Slippage tolerance (in basis points, e.g., 50 = 0.5%) */
  slippageBps: number;
  /** Transaction deadline (in minutes) */
  deadlineMinutes: number;
}

/**
 * Liquidity preview data
 */
export interface LiquidityPreview {
  /** Expected LP tokens to receive */
  lpTokens: bigint;
  /** LP tokens in human-readable format */
  lpTokensFormatted: string;
  /** Pool share percentage (0-100) */
  shareOfPool: number;
  /** Price of token0 in terms of token1 */
  priceToken0: string;
  /** Price of token1 in terms of token0 */
  priceToken1: string;
  /** Minimum amount of tokenA (with slippage) */
  amountAMin: bigint;
  /** Minimum amount of tokenB (with slippage) */
  amountBMin: bigint;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether the input is valid */
  isValid: boolean;
  /** Error message if invalid */
  error?: string;
}

/**
 * Add liquidity result
 */
export interface AddLiquidityResult {
  /** Transaction hash */
  hash: `0x${string}`;
  /** Actual amount of tokenA added */
  amountA: bigint;
  /** Actual amount of tokenB added */
  amountB: bigint;
  /** Actual LP tokens received */
  liquidity: bigint;
}

// ==================== Helper Types ====================

/**
 * Slippage preset options
 */
export type SlippagePreset = 0.1 | 0.5 | 1.0 | 5.0; // in percentage

/**
 * Router function parameters
 */
export interface AddLiquidityParams {
  tokenA: `0x${string}`;
  tokenB: `0x${string}`;
  stable: boolean;
  amountADesired: bigint;
  amountBDesired: bigint;
  amountAMin: bigint;
  amountBMin: bigint;
  to: `0x${string}`;
  deadline: bigint;
}

// ==================== Remove Liquidity Types ====================

/**
 * Remove liquidity form data
 */
export interface RemoveLiquidityFormData {
  /** Selected pool */
  pool: LiquidityPool | null;
  /** LP token balance */
  lpBalance: bigint;
  /** LP token balance (formatted) */
  lpBalanceFormatted: string;
  /** Percentage to remove (0-100) */
  percentage: number;
  /** LP tokens to burn */
  lpTokens: bigint;
  /** LP tokens to burn (formatted) */
  lpTokensFormatted: string;
  /** Slippage tolerance (in basis points) */
  slippageBps: number;
  /** Transaction deadline (in minutes) */
  deadlineMinutes: number;
}

/**
 * Remove liquidity preview data
 */
export interface RemoveLiquidityPreview {
  /** Amount of token0 to receive */
  amount0: bigint;
  /** Amount of token0 to receive (formatted) */
  amount0Formatted: string;
  /** Amount of token1 to receive */
  amount1: bigint;
  /** Amount of token1 to receive (formatted) */
  amount1Formatted: string;
  /** Minimum amount of token0 (with slippage) */
  amount0Min: bigint;
  /** Minimum amount of token1 (with slippage) */
  amount1Min: bigint;
  /** Pool share percentage after removal */
  remainingShare: number;
  /** Price of token0 in terms of token1 */
  priceToken0: string;
  /** Price of token1 in terms of token0 */
  priceToken1: string;
}

/**
 * Remove liquidity result
 */
export interface RemoveLiquidityResult {
  /** Transaction hash */
  hash: `0x${string}`;
  /** Actual amount of token0 received */
  amount0: bigint;
  /** Actual amount of token1 received */
  amount1: bigint;
}

/**
 * Router remove liquidity parameters
 */
export interface RemoveLiquidityParams {
  tokenA: `0x${string}`;
  tokenB: `0x${string}`;
  stable: boolean;
  liquidity: bigint;
  amountAMin: bigint;
  amountBMin: bigint;
  to: `0x${string}`;
  deadline: bigint;
}

/**
 * Percentage preset options for remove liquidity
 */
export type RemovePercentagePreset = 25 | 50 | 75 | 100; // in percentage

// ==================== Staking Types ====================

/**
 * State machine for staking flow
 */
export enum StakingState {
  /** Initial state - waiting for user input */
  IDLE = "IDLE",
  /** LP token needs approval */
  NEEDS_APPROVAL = "NEEDS_APPROVAL",
  /** Approving LP token */
  APPROVING = "APPROVING",
  /** Ready to stake/unstake */
  READY = "READY",
  /** Staking transaction in progress */
  STAKING = "STAKING",
  /** Unstaking transaction in progress */
  UNSTAKING = "UNSTAKING",
  /** Claiming rewards transaction in progress */
  CLAIMING = "CLAIMING",
  /** Successfully completed */
  SUCCESS = "SUCCESS",
  /** Error occurred */
  ERROR = "ERROR",
}

/**
 * Staking form data
 */
export interface StakingFormData {
  /** Selected pool */
  pool: LiquidityPool | null;
  /** LP token balance */
  lpBalance: bigint;
  /** Staked balance in gauge */
  stakedBalance: bigint;
  /** Earned rewards (PAIMON) */
  earnedRewards: bigint;
  /** Amount to stake/unstake */
  amount: bigint;
  /** Stake or unstake action */
  action: "stake" | "unstake";
}

/**
 * Staking info from gauge
 */
export interface StakingInfo {
  /** Gauge contract address */
  gauge: `0x${string}`;
  /** Total staked in gauge */
  totalStaked: bigint;
  /** Reward rate (PAIMON per second) */
  rewardRate: bigint;
  /** Annual Percentage Rate */
  apr: string;
  /** User's staked amount */
  userStaked: bigint;
  /** User's earned rewards */
  userEarned: bigint;
}
