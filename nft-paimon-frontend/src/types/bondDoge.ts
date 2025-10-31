/**
 * Bond Doge Mascot Type Definitions
 * Types and utilities for Bond Doge (Shiba Inu) mascot expressions
 */

/**
 * Bond Doge expression enum
 * Maps to image files in /public/images/bond-doge/
 */
export enum BondDogeExpression {
  HAPPY = 'happy',
  SAD = 'sad',
  SHOCKED = 'shocked',
  NEUTRAL = 'neutral',
  THINKING = 'thinking',
  RICH = 'rich',
  CELEBRATING = 'celebrating',
  WAVING = 'waving',
  SLEEPING = 'sleeping',
  DANCING = 'dancing',
}

/**
 * Expression metadata
 */
export interface BondDogeExpressionMeta {
  expression: BondDogeExpression;
  name: string;
  useCase: string;
  colorTheme: string;
  imagePath: string;
}

/**
 * All Bond Doge expressions with metadata
 */
export const BOND_DOGE_EXPRESSIONS: Record<BondDogeExpression, BondDogeExpressionMeta> = {
  [BondDogeExpression.HAPPY]: {
    expression: BondDogeExpression.HAPPY,
    name: 'Happy',
    useCase: 'High dice roll (result > 10 on Gold, = 6 on Normal)',
    colorTheme: '#8BC34A',
    imagePath: '/images/bond-doge/happy.svg',
  },
  [BondDogeExpression.SAD]: {
    expression: BondDogeExpression.SAD,
    name: 'Sad',
    useCase: 'Low dice roll (result < 3)',
    colorTheme: '#9E9E9E',
    imagePath: '/images/bond-doge/sad.svg',
  },
  [BondDogeExpression.SHOCKED]: {
    expression: BondDogeExpression.SHOCKED,
    name: 'Shocked',
    useCase: 'Natural 20 on Diamond Dice (jackpot)',
    colorTheme: '#FF9800',
    imagePath: '/images/bond-doge/shocked.svg',
  },
  [BondDogeExpression.NEUTRAL]: {
    expression: BondDogeExpression.NEUTRAL,
    name: 'Neutral',
    useCase: 'Default state, waiting, before rolling',
    colorTheme: '#FFB74D',
    imagePath: '/images/bond-doge/neutral.svg',
  },
  [BondDogeExpression.THINKING]: {
    expression: BondDogeExpression.THINKING,
    name: 'Thinking',
    useCase: 'Settlement decision (veNFT vs Cash)',
    colorTheme: '#9C27B0',
    imagePath: '/images/bond-doge/thinking.svg',
  },
  [BondDogeExpression.RICH]: {
    expression: BondDogeExpression.RICH,
    name: 'Rich',
    useCase: 'Legendary rarity tier (≥8 USDC Remint)',
    colorTheme: '#FFD700',
    imagePath: '/images/bond-doge/rich.svg',
  },
  [BondDogeExpression.CELEBRATING]: {
    expression: BondDogeExpression.CELEBRATING,
    name: 'Celebrating',
    useCase: 'Successful settlement (Bond redeemed)',
    colorTheme: '#FF6B35',
    imagePath: '/images/bond-doge/celebrating.svg',
  },
  [BondDogeExpression.WAVING]: {
    expression: BondDogeExpression.WAVING,
    name: 'Waving',
    useCase: 'Referral system (invite friends)',
    colorTheme: '#FF8A65',
    imagePath: '/images/bond-doge/waving.svg',
  },
  [BondDogeExpression.SLEEPING]: {
    expression: BondDogeExpression.SLEEPING,
    name: 'Sleeping',
    useCase: 'Bond not yet matured (before 90 days)',
    colorTheme: '#BCAAA4',
    imagePath: '/images/bond-doge/sleeping.svg',
  },
  [BondDogeExpression.DANCING]: {
    expression: BondDogeExpression.DANCING,
    name: 'Dancing',
    useCase: 'Leaderboard top 3 position',
    colorTheme: '#FF6B35',
    imagePath: '/images/bond-doge/dancing.svg',
  },
};

/**
 * Helper function to get expression based on dice roll result
 * @param result - Dice roll result (1-20)
 * @param diceType - Type of dice (Normal: 1-6, Gold: 1-12, Diamond: 1-20)
 * @returns Appropriate Bond Doge expression
 */
export function getBondDogeExpressionForDiceRoll(result: number, diceType: 'normal' | 'gold' | 'diamond'): BondDogeExpression {
  // Natural 20 on Diamond Dice
  if (diceType === 'diamond' && result === 20) {
    return BondDogeExpression.SHOCKED;
  }

  // High rolls
  if (diceType === 'normal' && result === 6) {
    return BondDogeExpression.HAPPY;
  }
  if (diceType === 'gold' && result > 10) {
    return BondDogeExpression.HAPPY;
  }
  if (diceType === 'diamond' && result > 15) {
    return BondDogeExpression.HAPPY;
  }

  // Low rolls
  if (result < 3) {
    return BondDogeExpression.SAD;
  }

  // Default
  return BondDogeExpression.NEUTRAL;
}

/**
 * Helper function to get expression based on rarity tier
 * @param rarityTier - Bond NFT rarity tier
 * @returns Appropriate Bond Doge expression
 */
export function getBondDogeExpressionForRarity(rarityTier: string): BondDogeExpression {
  if (rarityTier === 'Legendary') {
    return BondDogeExpression.RICH;
  }
  if (rarityTier === 'Diamond' || rarityTier === 'Gold') {
    return BondDogeExpression.HAPPY;
  }
  return BondDogeExpression.NEUTRAL;
}

/**
 * Helper function to get expression based on bond maturity status
 * @param isMatured - Whether bond is matured
 * @returns Appropriate Bond Doge expression
 */
export function getBondDogeExpressionForMaturity(isMatured: boolean): BondDogeExpression {
  return isMatured ? BondDogeExpression.CELEBRATING : BondDogeExpression.SLEEPING;
}

/**
 * Helper function to get expression based on leaderboard rank
 * @param rank - User's rank on leaderboard
 * @returns Appropriate Bond Doge expression
 */
export function getBondDogeExpressionForLeaderboard(rank: number): BondDogeExpression {
  if (rank <= 3) {
    return BondDogeExpression.DANCING;
  }
  if (rank <= 10) {
    return BondDogeExpression.HAPPY;
  }
  return BondDogeExpression.NEUTRAL;
}

/**
 * Get image path for expression
 * @param expression - Bond Doge expression
 * @returns Path to image file
 */
export function getBondDogeImagePath(expression: BondDogeExpression): string {
  return BOND_DOGE_EXPRESSIONS[expression].imagePath;
}

/**
 * Get color theme for expression
 * @param expression - Bond Doge expression
 * @returns Hex color code
 */
export function getBondDogeColorTheme(expression: BondDogeExpression): string {
  return BOND_DOGE_EXPRESSIONS[expression].colorTheme;
}
