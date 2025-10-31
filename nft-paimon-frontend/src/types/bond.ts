/**
 * Bond NFT Type Definitions
 * Types for the RWA Bond NFT system matching RWABondNFT contract
 */

/**
 * Dice type enum
 */
export enum DiceType {
  NORMAL = 0,
  GOLD = 1,
  DIAMOND = 2,
}

/**
 * Rarity tier enum (based on accumulated Remint)
 */
export enum RarityTier {
  BRONZE = 'Bronze',
  SILVER = 'Silver',
  GOLD = 'Gold',
  DIAMOND = 'Diamond',
  LEGENDARY = 'Legendary',
}

/**
 * Bond information from contract
 */
export interface BondInfo {
  tokenId: number;
  principal: bigint; // 100 USDC (100 * 10^6)
  mintTime: bigint;
  maturityDate: bigint; // mintTime + 90 days
  accumulatedRemint: bigint; // USDC earned from dice
  diceType: DiceType;
  weeklyRollsLeft: number;
}

/**
 * Calculated bond data for UI
 */
export interface BondData {
  tokenId: number;
  principal: number; // In USDC (100)
  mintTime: Date;
  maturityDate: Date;
  accumulatedRemint: number; // In USDC
  diceType: DiceType;
  diceTypeName: string;
  weeklyRollsLeft: number;

  // Calculated fields
  baseYield: number; // Base yield in USDC
  totalYield: number; // Base + Remint
  rarityTier: RarityTier;
  daysUntilMaturity: number;
  isMatured: boolean;

  // Progress
  maturityProgress: number; // 0-100%
  remintProgress: number; // 0-100% to next rarity tier
}

/**
 * Rarity tier thresholds (in USDC)
 */
export const RARITY_THRESHOLDS = {
  [RarityTier.BRONZE]: 0,
  [RarityTier.SILVER]: 2,
  [RarityTier.GOLD]: 4,
  [RarityTier.DIAMOND]: 6,
  [RarityTier.LEGENDARY]: 8,
} as const;

/**
 * Rarity tier colors (warm palette)
 */
export const RARITY_COLORS = {
  [RarityTier.BRONZE]: '#CD7F32',  // Bronze
  [RarityTier.SILVER]: '#C0C0C0',  // Silver (gray, but acceptable)
  [RarityTier.GOLD]: '#FFD700',    // Gold
  [RarityTier.DIAMOND]: '#FF8A65', // Diamond (warm coral)
  [RarityTier.LEGENDARY]: '#FF6B35', // Legendary (primary orange)
} as const;

/**
 * Dice type configuration
 */
export const DICE_CONFIG = {
  [DiceType.NORMAL]: {
    name: 'Normal Dice',
    color: '#FF8A65', // Warm coral
    maxPoints: 6,
  },
  [DiceType.GOLD]: {
    name: 'Gold Dice',
    color: '#FFD54F', // Gold
    maxPoints: 12,
  },
  [DiceType.DIAMOND]: {
    name: 'Diamond Dice',
    color: '#FFB74D', // Warm amber
    maxPoints: 20,
  },
} as const;

/**
 * Settlement option
 */
export enum SettlementOption {
  VE_NFT = 'veNFT',
  CASH = 'cash',
}

/**
 * Helper function to calculate rarity tier
 */
export function calculateRarityTier(remintAmount: number): RarityTier {
  if (remintAmount >= RARITY_THRESHOLDS[RarityTier.LEGENDARY]) return RarityTier.LEGENDARY;
  if (remintAmount >= RARITY_THRESHOLDS[RarityTier.DIAMOND]) return RarityTier.DIAMOND;
  if (remintAmount >= RARITY_THRESHOLDS[RarityTier.GOLD]) return RarityTier.GOLD;
  if (remintAmount >= RARITY_THRESHOLDS[RarityTier.SILVER]) return RarityTier.SILVER;
  return RarityTier.BRONZE;
}

/**
 * Helper function to get next rarity tier
 */
export function getNextRarityTier(currentTier: RarityTier): RarityTier | null {
  const tiers = [
    RarityTier.BRONZE,
    RarityTier.SILVER,
    RarityTier.GOLD,
    RarityTier.DIAMOND,
    RarityTier.LEGENDARY,
  ];
  const currentIndex = tiers.indexOf(currentTier);
  if (currentIndex >= tiers.length - 1) return null;
  return tiers[currentIndex + 1];
}

/**
 * Helper function to calculate progress to next tier
 */
export function calculateRemintProgress(remintAmount: number, currentTier: RarityTier): number {
  const nextTier = getNextRarityTier(currentTier);
  if (!nextTier) return 100; // Already at max tier

  const currentThreshold = RARITY_THRESHOLDS[currentTier];
  const nextThreshold = RARITY_THRESHOLDS[nextTier];

  const progress = ((remintAmount - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
  return Math.min(Math.max(progress, 0), 100);
}
