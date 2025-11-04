/**
 * Bribes Marketplace Type Definitions
 */

import { LiquidityPool } from "../liquidity/types";

// ==================== Interfaces ====================

/**
 * Bribe information
 */
export interface Bribe {
  /** Bribe ID */
  bribeId: bigint;
  /** Target epoch */
  epoch: bigint;
  /** Target gauge address */
  gauge: `0x${string}`;
  /** Gauge/Pool name (e.g., "USDP/USDC") */
  gaugeName: string;
  /** Bribe token address */
  token: `0x${string}`;
  /** Bribe token symbol (e.g., "USDC") */
  tokenSymbol: string;
  /** Net bribe amount (after 2% fee) */
  amount: bigint;
  /** Amount (formatted) */
  amountFormatted: string;
  /** Bribe creator address */
  creator: `0x${string}`;
  /** Total votes for gauge (cached) */
  totalVotes: bigint;
  /** Bribe APR (estimated) */
  apr?: string;
}

/**
 * Create bribe form data
 */
export interface CreateBribeFormData {
  /** Selected gauge/pool */
  pool: LiquidityPool | null;
  /** Selected bribe token */
  token: { address: `0x${string}`; symbol: string; decimals: number } | null;
  /** Bribe amount (raw input) */
  amount: bigint;
  /** Amount (formatted) */
  amountFormatted: string;
  /** Target epoch */
  epoch: bigint;
}

/**
 * Claim bribe form data
 */
export interface ClaimBribeFormData {
  /** Bribe to claim */
  bribe: Bribe | null;
  /** veNFT token ID */
  tokenId: bigint;
  /** Estimated claimable amount */
  claimableAmount: bigint;
  /** Claimable amount (formatted) */
  claimableAmountFormatted: string;
}

/**
 * Bribe marketplace state
 */
export enum BribeMarketplaceState {
  /** Loading data */
  LOADING = "LOADING",
  /** Ready to interact */
  READY = "READY",
  /** Creating bribe */
  CREATING = "CREATING",
  /** Claiming bribe */
  CLAIMING = "CLAIMING",
  /** Success */
  SUCCESS = "SUCCESS",
  /** Error */
  ERROR = "ERROR",
}

/**
 * User bribe claim status
 */
export interface UserBribeClaimStatus {
  /** Bribe ID */
  bribeId: bigint;
  /** veNFT token ID */
  tokenId: bigint;
  /** Has claimed */
  claimed: boolean;
  /** Claimable amount (if not claimed) */
  claimableAmount: bigint;
}

// ==================== Helper Types ====================

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether the action is valid */
  isValid: boolean;
  /** Error message if invalid */
  error?: string;
}

/**
 * Bribe token (whitelisted)
 * Token type imported from centralized config
 */
export type BribeToken = import("@/config/chains/types").Token;
