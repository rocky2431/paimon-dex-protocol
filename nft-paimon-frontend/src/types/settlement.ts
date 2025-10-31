/**
 * Settlement Type Definitions
 * Types for Bond NFT settlement system matching SettlementRouter contract
 */

import { BondData } from './bond';

/**
 * Settlement option enum
 */
export enum SettlementOption {
  VE_NFT = 'veNFT',
  CASH = 'cash',
}

/**
 * Lock duration presets (in months)
 */
export const LOCK_DURATION_PRESETS = [
  { months: 3, days: 90, label: '3 Months' },
  { months: 6, days: 180, label: '6 Months' },
  { months: 12, days: 365, label: '1 Year' },
  { months: 24, days: 730, label: '2 Years' },
  { months: 36, days: 1095, label: '3 Years' },
  { months: 48, days: 1460, label: '4 Years' },
] as const;

/**
 * Settlement constants from SettlementRouter contract
 */
export const SETTLEMENT_CONSTANTS = {
  MIN_LOCK_DURATION_DAYS: 90, // 3 months
  MAX_LOCK_DURATION_DAYS: 1460, // 4 years
  MIN_LOCK_DURATION_MONTHS: 3,
  MAX_LOCK_DURATION_MONTHS: 48,
  USDC_TO_HYD_RATIO: 1, // 1:1 ratio
} as const;

/**
 * veNFT Settlement Option Data
 */
export interface VeNFTSettlementOption {
  // Input
  lockDurationDays: number;
  lockDurationMonths: number;

  // Calculated
  hydAmount: number; // HYD tokens to be locked (1:1 with USDC)
  votingPower: number; // Estimated voting power based on lock duration
  estimatedAPY: number; // Estimated APY from fees/bribes
  lockEndDate: Date; // When the lock expires

  // Comparison metrics
  ongoingRewards: boolean; // true - earns protocol fees + bribes
  liquidity: 'Locked' | 'Liquid'; // Locked until lock end date
  riskLevel: 'Low' | 'Medium' | 'High';
}

/**
 * Cash Settlement Option Data
 */
export interface CashSettlementOption {
  // Calculated
  principal: number; // 100 USDC
  baseYield: number; // 0.5 USDC
  remintYield: number; // Accumulated Remint earnings
  totalAmount: number; // principal + baseYield + remintYield

  // Comparison metrics
  ongoingRewards: boolean; // false - one-time payment
  liquidity: 'Locked' | 'Liquid'; // Liquid - immediate withdrawal
  riskLevel: 'Low' | 'Medium' | 'High';
}

/**
 * Settlement Data (combines bond info with settlement options)
 */
export interface SettlementData {
  bond: BondData;
  veNFTOption: VeNFTSettlementOption;
  cashOption: CashSettlementOption;
}

/**
 * Settlement Transaction Status
 */
export interface SettlementTransaction {
  status: 'idle' | 'confirming' | 'pending' | 'success' | 'error';
  option?: SettlementOption;
  txHash?: string;
  errorMessage?: string;
  veNFTTokenId?: number; // Only for veNFT settlement
}

/**
 * Helper function to calculate voting power
 * Formula: votingPower = hydAmount * (lockDurationDays / MAX_LOCK_DURATION_DAYS)
 */
export function calculateVotingPower(hydAmount: number, lockDurationDays: number): number {
  const maxDuration = SETTLEMENT_CONSTANTS.MAX_LOCK_DURATION_DAYS;
  return hydAmount * (lockDurationDays / maxDuration);
}

/**
 * Helper function to calculate estimated APY based on lock duration
 * Longer locks → higher APY from fee distribution
 * This is a simplified model, actual APY depends on protocol performance
 */
export function calculateEstimatedAPY(lockDurationDays: number): number {
  const maxDuration = SETTLEMENT_CONSTANTS.MAX_LOCK_DURATION_DAYS;
  const baseAPY = 5; // 5% base APY
  const bonusAPY = 15; // Up to 15% bonus for max lock

  const lockRatio = lockDurationDays / maxDuration;
  return baseAPY + (bonusAPY * lockRatio);
}

/**
 * Helper function to calculate lock end date
 */
export function calculateLockEndDate(lockDurationDays: number): Date {
  const now = new Date();
  const endDate = new Date(now.getTime() + lockDurationDays * 24 * 60 * 60 * 1000);
  return endDate;
}

/**
 * Helper function to convert days to months (rounded)
 */
export function daysToMonths(days: number): number {
  return Math.round(days / 30);
}

/**
 * Helper function to convert months to days
 */
export function monthsToDays(months: number): number {
  return Math.round(months * 30);
}

/**
 * Helper function to create veNFT settlement option from bond data
 */
export function createVeNFTOption(
  bond: BondData,
  lockDurationDays: number
): VeNFTSettlementOption {
  const totalUSDC = bond.principal + bond.totalYield;
  const hydAmount = totalUSDC; // 1:1 ratio

  return {
    lockDurationDays,
    lockDurationMonths: daysToMonths(lockDurationDays),
    hydAmount,
    votingPower: calculateVotingPower(hydAmount, lockDurationDays),
    estimatedAPY: calculateEstimatedAPY(lockDurationDays),
    lockEndDate: calculateLockEndDate(lockDurationDays),
    ongoingRewards: true,
    liquidity: 'Locked',
    riskLevel: lockDurationDays > 730 ? 'Medium' : 'Low',
  };
}

/**
 * Helper function to create cash settlement option from bond data
 */
export function createCashOption(bond: BondData): CashSettlementOption {
  return {
    principal: bond.principal,
    baseYield: bond.baseYield,
    remintYield: bond.accumulatedRemint,
    totalAmount: bond.principal + bond.totalYield,
    ongoingRewards: false,
    liquidity: 'Liquid',
    riskLevel: 'Low',
  };
}

/**
 * Comparison metric type
 */
export interface ComparisonMetric {
  label: string;
  veNFTValue: string | number | boolean;
  cashValue: string | number | boolean;
  veNFTHighlight?: boolean; // Highlight if veNFT option is better for this metric
}

/**
 * Helper function to generate comparison metrics
 */
export function generateComparisonMetrics(
  veNFTOption: VeNFTSettlementOption,
  cashOption: CashSettlementOption
): ComparisonMetric[] {
  return [
    {
      label: 'Amount Received',
      veNFTValue: `${veNFTOption.hydAmount.toFixed(2)} HYD`,
      cashValue: `${cashOption.totalAmount.toFixed(2)} USDC`,
      veNFTHighlight: false,
    },
    {
      label: 'Lock Period',
      veNFTValue: `${veNFTOption.lockDurationMonths} months`,
      cashValue: 'No lock',
      veNFTHighlight: false,
    },
    {
      label: 'Voting Power',
      veNFTValue: veNFTOption.votingPower.toFixed(2),
      cashValue: '0',
      veNFTHighlight: true,
    },
    {
      label: 'Estimated APY',
      veNFTValue: `${veNFTOption.estimatedAPY.toFixed(1)}%`,
      cashValue: '0%',
      veNFTHighlight: true,
    },
    {
      label: 'Ongoing Rewards',
      veNFTValue: 'Yes',
      cashValue: 'No',
      veNFTHighlight: true,
    },
    {
      label: 'Liquidity',
      veNFTValue: veNFTOption.liquidity,
      cashValue: cashOption.liquidity,
      veNFTHighlight: false,
    },
    {
      label: 'Risk Level',
      veNFTValue: veNFTOption.riskLevel,
      cashValue: cashOption.riskLevel,
      veNFTHighlight: false,
    },
  ];
}
