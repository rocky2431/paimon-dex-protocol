/**
 * Swap Component Types
 * OlympusDAO-inspired design system
 */

export enum SwapState {
  IDLE = 'idle',
  INPUT = 'input',
  APPROVING = 'approving',
  APPROVED = 'approved',
  SWAPPING = 'swapping',
  SUCCESS = 'success',
  ERROR = 'error',
}

export enum Token {
  USDC = 'USDC',
  HYD = 'HYD',
}

export interface TokenInfo {
  symbol: Token;
  name: string;
  decimals: number;
  address: `0x${string}`;
  icon: string;
}

export interface SwapFormData {
  inputAmount: string;
  outputAmount: string;
  inputToken: Token;
  outputToken: Token;
}

export interface SwapCalculation {
  inputAmount: bigint;
  outputAmount: bigint;
  fee: bigint;
  feePercentage: string;
  priceImpact: string;
  exchangeRate: string;
}

export interface SwapValidation {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

export interface TokenBalance {
  formatted: string;
  value: bigint;
  decimals: number;
  symbol: string;
}
