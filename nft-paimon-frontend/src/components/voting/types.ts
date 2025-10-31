/**
 * Voting Component Types
 * Gauge voting for ve33 tokenomics (Velodrome/Thena model)
 */

export enum VotingState {
  IDLE = 'idle',
  INPUT = 'input',
  VOTING = 'voting',
  SUCCESS = 'success',
  ERROR = 'error',
}

export interface Gauge {
  address: `0x${string}`;
  name: string;
  token0: string;
  token1: string;
  tvl: string;
  apr: string;
  weight: number; // Current weight (basis points)
}

export interface VoteAllocation {
  gauge: `0x${string}`;
  weight: number; // Basis points (0-10000)
}

export interface VotingFormData {
  allocations: Map<string, number>; // gauge address -> weight (%)
}

export interface VotingPower {
  total: bigint;
  totalFormatted: string;
  allocated: bigint;
  allocatedFormatted: string;
  remaining: bigint;
  remainingFormatted: string;
  allocationPercentage: number; // 0-100
}

export interface VoteValidation {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}
