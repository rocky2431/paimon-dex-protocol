/**
 * veNFT Component Types
 * Vote-Escrowed NFT for Velodrome/Thena-style ve33 tokenomics
 */

export enum LockState {
  IDLE = 'idle',
  INPUT = 'input',
  APPROVING = 'approving',
  APPROVED = 'approved',
  CREATING = 'creating',
  SUCCESS = 'success',
  ERROR = 'error',
}

export interface VeNFTFormData {
  lockAmount: string;
  lockDuration: number; // in seconds
}

export interface VeNFTCalculation {
  lockAmount: bigint;
  lockDuration: number; // in seconds
  votingPower: bigint;
  votingPowerFormatted: string;
  unlockDate: Date;
  powerPercentage: number; // % of locked amount (0-100)
}

export interface VeNFTPosition {
  tokenId: bigint;
  amount: bigint;
  amountFormatted: string;
  votingPower: bigint;
  votingPowerFormatted: string;
  unlockTime: number; // timestamp in seconds
  unlockDate: Date;
  isExpired: boolean;
}

export interface LockValidation {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

export interface VeNFTBalance {
  formatted: string;
  value: bigint;
  decimals: number;
  symbol: string;
}
