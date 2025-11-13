/**
 * Swap Component Types
 * OlympusDAO-inspired design system
 */

import { config } from '@/config';

export enum SwapState {
  IDLE = 'idle',
  INPUT = 'input',
  APPROVING = 'approving',
  APPROVED = 'approved',
  SWAPPING = 'swapping',
  SUCCESS = 'success',
  ERROR = 'error',
}

/**
 * Token type - dynamically derived from config
 * 从配置动态推导的Token类型
 *
 * BEFORE (hardcoded): enum Token { USDC = 'USDC', USDP = 'USDP', HYD = 'HYD', WBNB = 'WBNB' }
 * AFTER (dynamic): Type derived from config.tokenConfig keys (lowercase: usdc, usdp, hyd, etc.)
 */
export type Token = keyof typeof config.tokenConfig;

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
  feeFormatted: string; // Formatted fee string with token symbol (e.g., "1.00 USDC")
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
