/**
 * Treasury Constants
 * Configuration for RWA Treasury deposit functionality
 */

import { RWAAsset } from '@/types/treasury';
import { TESTNET_ADDRESSES } from '@/config/chains/generated/testnet';

// Whitelisted RWA Assets
// Note: Only HYD is currently deployed on testnet
// Other RWA tokens are placeholder configurations for future deployment
export const RWA_ASSETS: RWAAsset[] = [
  {
    // TODO Phase 3.2+: Deploy tUST token contract and update with real address
    address: '0x0000000000000000000000000000000000000001',
    name: 'Tokenized US Treasury Bond',
    symbol: 'tUST',
    tier: 1,
    ltvRatio: 60, // 60% LTV for T1
    mintDiscount: 0,
    isActive: false, // Not yet deployed - will be activated in Phase 3.2+
  },
  {
    // TODO Phase 3.2+: Deploy tCORPBOND token contract and update with real address
    address: '0x0000000000000000000000000000000000000002',
    name: 'Tokenized Corporate Bond',
    symbol: 'tCORPBOND',
    tier: 2,
    ltvRatio: 50, // 50% LTV for T2
    mintDiscount: 0,
    isActive: false, // Not yet deployed - will be activated in Phase 3.2+
  },
  {
    // TODO Phase 3.2+: Deploy tRE token contract and update with real address
    address: '0x0000000000000000000000000000000000000003',
    name: 'Tokenized Real Estate',
    symbol: 'tRE',
    tier: 3,
    ltvRatio: 40, // 40% LTV for T3
    mintDiscount: 0,
    isActive: false, // Not yet deployed - will be activated in Phase 3.2+
  },
  {
    address: TESTNET_ADDRESSES.core.hyd, // Real deployed address from testnet
    name: 'HYD Real World Asset Token',
    symbol: 'HYD',
    tier: 1,
    ltvRatio: 60, // 60% LTV for T1 (high-quality RWA)
    mintDiscount: 0,
    isActive: true, // Deployed and active
    oracleAddress: TESTNET_ADDRESSES.treasury.rwaPriceOracle, // RWAPriceOracle for HYD
  },
];

// Treasury Configuration
export const TREASURY_CONFIG = {
  MIN_DEPOSIT_AMOUNT: 10, // Minimum 10 RWA tokens
  MAX_DEPOSIT_AMOUNT: 1000000, // Maximum 1M RWA tokens
  COOLDOWN_PERIOD_DAYS: 7,
  REDEMPTION_FEE_BPS: 50, // 0.5%
  BPS_DENOMINATOR: 10000,
  TARGET_HEALTH_FACTOR: 125, // 125%
  LIQUIDATION_THRESHOLD: 115, // 115%
  LIQUIDATION_PENALTY: 5, // 5%
} as const;

// Color Theme (warm colors - matching Presale style for consistency)
export const TREASURY_THEME = {
  // Text colors (matching Presale for unified UX)
  TITLE: '#D17A00', // Deep orange-brown (main headings)
  SUBTITLE: '#8B4000', // Brown (descriptions, body text)
  CAPTION: '#A0522D', // Light brown (small text, captions)
  EMPHASIS: '#FF8C00', // Deep orange (values, emphasis)

  // UI colors
  PRIMARY: '#FFD700', // Warm gold (borders, accents)
  SECONDARY: '#FF8C00', // Dark orange
  ACCENT: '#FFA500', // Orange
  SUCCESS: '#8BC34A', // Light Green (for health factor)
  WARNING: '#FFB74D', // Deep Orange (for health factor)
  ERROR: '#FF6B35', // Warm Red-Orange (for health factor)
  BACKGROUND: '#FFF8E7', // Cornsilk
  CARD_BG: '#FFF8E1', // Light yellow (card backgrounds, matching Presale)
} as const;

/**
 * Card styles are now unified in StyledCard component
 * Import { StyledCard } from '@/components/common'
 *
 * Usage:
 * - <StyledCard variant="white"> for form inputs
 * - <StyledCard variant="accent"> for highlighted information
 */
