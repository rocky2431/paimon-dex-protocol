/**
 * Swap Constants
 * OlympusDAO-inspired design parameters
 */

import { Token, TokenInfo } from "./types";
import { config } from "@/config";

// Animation parameters (OlympusDAO cubic-bezier curve)
export const ANIMATION_CONFIG = {
  // OlympusDAO signature easing: cubic-bezier(0.16, 1, 0.3, 1)
  EASE_OUT_EXPO: "cubic-bezier(0.16, 1, 0.3, 1)",
  DURATION_FAST: "0.3s",
  DURATION_NORMAL: "0.5s",
  DURATION_SLOW: "0.8s",

  // Counter animation (OlympusDAO uses 400-1600ms)
  COUNTER_DURATION: 800,

  // Debounce delay
  INPUT_DEBOUNCE: 300,
};

// Design tokens (OlympusDAO-inspired)
export const DESIGN_TOKENS = {
  // Border radius
  RADIUS_PILL: "100px", // OlympusDAO signature pill shape
  RADIUS_LARGE: "24px", // Card containers
  RADIUS_MEDIUM: "16px", // Input fields
  RADIUS_SMALL: "12px", // Small elements

  // Spacing
  SPACING_HUGE: 120, // Massive whitespace (OlympusDAO style)
  SPACING_LARGE: 48, // Card padding
  SPACING_MEDIUM: 24,
  SPACING_SMALL: 16,

  // Shadows
  SHADOW_CARD: "0 4px 20px rgba(62, 39, 35, 0.08)",
  SHADOW_CARD_HOVER: "0 8px 40px rgba(62, 39, 35, 0.12)",
  SHADOW_BUTTON: "0 4px 12px rgba(255, 152, 0, 0.3)",
  SHADOW_BUTTON_HOVER: "0 8px 24px rgba(255, 152, 0, 0.4)",

  // Inset shadows (OlympusDAO style - replaces borders)
  INSET_BORDER_LIGHT: "inset 0 0 0 2px rgba(255, 152, 0, 0.15)",
  INSET_BORDER_MEDIUM: "inset 0 0 0 2px rgba(255, 152, 0, 0.2)",
  INSET_BORDER_STRONG: "inset 0 0 0 2px #FF9800",
  INSET_DIVIDER: "inset 0 1px 0 0 rgba(255, 152, 0, 0.15)",
};

// PSM fee configuration
export const SWAP_CONFIG = {
  FEE_BPS: BigInt(10), // 0.1% = 10 basis points
  BPS_DIVISOR: BigInt(10000), // 100% = 10000 basis points
  FEE_PERCENTAGE: "0.1", // Display value

  // Minimum amounts
  MIN_SWAP_AMOUNT: "0.01",

  // Maximum slippage (for UI validation)
  MAX_SLIPPAGE_BPS: 50, // 0.5%
};

// Token configuration
/**
 * Token configuration from centralized config
 * Token配置从中央配置获取
 */
export const TOKEN_CONFIG: Record<Token, TokenInfo> = {
  [Token.USDC]: {
    symbol: Token.USDC,
    name: config.tokenConfig.usdc.name,
    decimals: config.tokenConfig.usdc.decimals,
    address: config.tokenConfig.usdc.address as `0x${string}`,
    icon: config.tokenConfig.usdc.icon,
  },
  [Token.USDP]: {
    symbol: Token.USDP,
    name: config.tokenConfig.usdp.name,
    decimals: config.tokenConfig.usdp.decimals,
    address: config.tokenConfig.usdp.address as `0x${string}`,
    icon: config.tokenConfig.usdp.icon,
  },
};

// Contract addresses
/**
 * @deprecated Contract addresses should be retrieved from @/config
 * Use getContractAddress(chainId, 'protocol.psm') instead of environment variables
 *
 * This is kept for backward compatibility only.
 */
export const CONTRACT_ADDRESSES = {
  PSM: config.tokens.psm as `0x${string}`,
};

// Toast messages
export const MESSAGES = {
  SWAP_SUCCESS: "Swap successful! 🎉",
  SWAP_ERROR: "Swap failed. Please try again.",
  APPROVAL_SUCCESS: "Token approved successfully",
  APPROVAL_ERROR: "Approval failed. Please try again.",
  INSUFFICIENT_BALANCE: "Insufficient balance",
  INVALID_AMOUNT: "Please enter a valid amount",
  CONNECT_WALLET: "Please connect your wallet",
};
