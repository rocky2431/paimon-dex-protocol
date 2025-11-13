/**
 * Liquidity Component Constants
 * Configuration for add/remove liquidity functionality
 */

import { Token, LiquidityPool, PoolType, SlippagePreset } from "./types";
import { formatUnits } from "viem";
import { config } from "@/config";

// ==================== Contract Addresses ====================

/**
 * Router and Factory addresses
 * @deprecated Use config.dex.router from @/config instead
 *
 * For backward compatibility, keeping these constants.
 * New code should use:
 * - config.dex.router for router
 * - config.dex.factory for factory
 */
export const LIQUIDITY_ADDRESSES = {
  /** PancakeSwap V2 Router on BSC Mainnet */
  PANCAKE_ROUTER: "0x10ED43C718714eb63d5aA57B78B54704E256024E" as `0x${string}`,
  /** PancakeSwap V2 Factory on BSC Mainnet */
  PANCAKE_FACTORY:
    "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73" as `0x${string}`,

  /** Custom Velodrome-style Router (if deployed) */
  // TODO: Template placeholder - update with real address if custom DEX is deployed
  VELODROME_ROUTER:
    "0x0000000000000000000000000000000000000000" as `0x${string}`,
  /** Custom Velodrome-style Factory (if deployed) */
  // TODO: Template placeholder - update with real address if custom DEX is deployed
  VELODROME_FACTORY:
    "0x0000000000000000000000000000000000000000" as `0x${string}`,
} as const;

// ==================== Token Definitions ====================

/**
 * Supported tokens for liquidity provision
 * Dynamically generated from centralized config with three-layer filtering
 *
 * BEFORE (hardcoded): Manually maintained list ['usdp', 'usdc', 'wbnb', 'paimon']
 * AFTER (dynamic): Automatically filtered from config.tokenConfig, excludes:
 *   1. Zero-address tokens (e.g., WBNB not deployed on testnet)
 *   2. Non-transferable tokens (e.g., esPAIMON - soulbound vesting token)
 *   3. Unwanted tokens (e.g., BUSD, USDT - not primary trading pairs)
 *
 * Suitable liquidity tokens: USDC, USDP, PAIMON, HYD
 */
const generateSupportedTokens = (): Record<string, Token> => {
  const { tokenConfig } = config;
  const tokens: Record<string, Token> = {};
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

  for (const [key, tokenData] of Object.entries(tokenConfig)) {
    // Layer 1: Filter out tokens with zero address (e.g., WBNB on testnet - not deployed yet)
    if (tokenData.address === ZERO_ADDRESS) {
      console.warn(`[LIQUIDITY_TOKENS] Skipping ${key.toUpperCase()} (zero address)`);
      continue;
    }

    // Layer 2: Filter out non-transferable tokens
    const NON_TRANSFERABLE_TOKENS = ['espaimon']; // esPAIMON is soulbound
    if (NON_TRANSFERABLE_TOKENS.includes(key.toLowerCase())) {
      console.warn(`[LIQUIDITY_TOKENS] Skipping ${key.toUpperCase()} (non-transferable)`);
      continue;
    }

    // Layer 3: Filter out unwanted tokens (not primary trading pairs)
    const UNWANTED_TOKENS = ['busd', 'usdt']; // BUSD/USDT - use USDC instead
    if (UNWANTED_TOKENS.includes(key.toLowerCase())) {
      console.warn(`[LIQUIDITY_TOKENS] Skipping ${key.toUpperCase()} (unwanted token)`);
      continue;
    }

    // Include token with uppercase symbol key (matching existing convention)
    tokens[tokenData.symbol.toUpperCase()] = {
      address: tokenData.address as `0x${string}`,
      symbol: tokenData.symbol,
      name: tokenData.name,
      decimals: tokenData.decimals,
      logoURI: tokenData.icon,
    };
  }

  return tokens;
};

export const SUPPORTED_TOKENS = generateSupportedTokens();

// ==================== Pool Configurations ====================

/**
 * Predefined liquidity pools
 * Pool addresses are now retrieved from @/config
 *
 * This constant contains pool metadata. Pool addresses are retrieved from the centralized config.
 * Addresses are automatically selected based on current chain using config.pools[poolKey].
 */
export const LIQUIDITY_POOLS: LiquidityPool[] = [
  {
    // TODO: Fallback address used when config.pools.hydUsdc is not deployed
    address: (config.pools.hydUsdc ||
      "0x0000000000000000000000000000000000000010") as `0x${string}`,
    token0: SUPPORTED_TOKENS.USDP,
    token1: SUPPORTED_TOKENS.USDC,
    type: PoolType.STABLE,
    reserve0: 0n,
    reserve1: 0n,
    totalSupply: 0n,
    name: "USDP/USDC",
    apr: "25%",
    tvl: "$1,200,000",
  },
  {
    // TODO: Fallback address used when config.pools.hydWbnb is not deployed
    address: (config.pools.hydWbnb ||
      "0x0000000000000000000000000000000000000011") as `0x${string}`,
    token0: SUPPORTED_TOKENS.USDP,
    token1: SUPPORTED_TOKENS.WBNB,
    type: PoolType.VOLATILE,
    reserve0: 0n,
    reserve1: 0n,
    totalSupply: 0n,
    name: "USDP/WBNB",
    apr: "30%",
    tvl: "$850,000",
  },
  {
    // TODO: Fallback address used when config.pools.usdcBusd is not deployed
    address: (config.pools.usdcBusd ||
      "0x0000000000000000000000000000000000000012") as `0x${string}`,
    token0: SUPPORTED_TOKENS.USDC,
    token1: SUPPORTED_TOKENS.BUSD,
    type: PoolType.STABLE,
    reserve0: 0n,
    reserve1: 0n,
    totalSupply: 0n,
    name: "USDC/BUSD",
    apr: "5%",
    tvl: "$3,500,000",
  },
  {
    // TODO: Fallback address used when config.pools.paimonWbnb is not deployed
    address: (config.pools.paimonWbnb ||
      "0x0000000000000000000000000000000000000013") as `0x${string}`,
    token0: SUPPORTED_TOKENS.PAIMON,
    token1: SUPPORTED_TOKENS.WBNB,
    type: PoolType.VOLATILE,
    reserve0: 0n,
    reserve1: 0n,
    totalSupply: 0n,
    name: "PAIMON/WBNB",
    apr: "45%",
    tvl: "$600,000",
  },
];

// ==================== Default Parameters ====================

/**
 * Default slippage tolerance presets (in percentage)
 */
export const SLIPPAGE_PRESETS: SlippagePreset[] = [0.1, 0.5, 1.0, 5.0];

/**
 * Default slippage tolerance (0.5%)
 */
export const DEFAULT_SLIPPAGE_BPS = 50; // 0.5% = 50 basis points

/**
 * Default transaction deadline (20 minutes)
 */
export const DEFAULT_DEADLINE_MINUTES = 20;

/**
 * Minimum liquidity (Uniswap V2 style)
 * First LP minter pays 1000 wei to address(0)
 */
export const MINIMUM_LIQUIDITY = 1000n;

/**
 * Maximum slippage tolerance (5%)
 */
export const MAX_SLIPPAGE_BPS = 500; // 5%

/**
 * Minimum slippage tolerance (0.01%)
 */
export const MIN_SLIPPAGE_BPS = 1; // 0.01%

// ==================== Calculation Functions ====================

/**
 * Calculate minimum amount with slippage protection
 * @param amount - Desired amount (in wei)
 * @param slippageBps - Slippage in basis points (e.g., 50 = 0.5%)
 * @returns Minimum acceptable amount
 */
export const calculateAmountMin = (
  amount: bigint,
  slippageBps: number
): bigint => {
  if (amount === 0n) return 0n;
  const slippage = BigInt(slippageBps);
  return (amount * (10000n - slippage)) / 10000n;
};

/**
 * Calculate deadline timestamp
 * @param deadlineMinutes - Deadline in minutes from now
 * @returns Unix timestamp (in seconds)
 */
export const calculateDeadline = (deadlineMinutes: number): bigint => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return BigInt(nowSeconds + deadlineMinutes * 60);
};

/**
 * Calculate optimal amount of tokenB given amountA
 * Based on current pool reserves: amountB = (amountA * reserveB) / reserveA
 * @param amountA - Amount of tokenA (in wei)
 * @param reserveA - Reserve of tokenA in pool
 * @param reserveB - Reserve of tokenB in pool
 * @returns Optimal amount of tokenB
 */
export const quoteTokenAmount = (
  amountA: bigint,
  reserveA: bigint,
  reserveB: bigint
): bigint => {
  if (amountA === 0n || reserveA === 0n || reserveB === 0n) return 0n;
  return (amountA * reserveB) / reserveA;
};

/**
 * Integer square root (for LP token calculation)
 * Babylonian method
 * @param x - Input value
 * @returns Square root of x
 */
export const sqrt = (x: bigint): bigint => {
  if (x < 2n) return x;
  let z = x;
  let y = x / 2n + 1n;
  while (y < z) {
    z = y;
    y = (x / y + y) / 2n;
  }
  return z;
};

/**
 * Calculate expected LP tokens (first liquidity provision)
 * Formula: sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY
 * @param amount0 - Amount of token0
 * @param amount1 - Amount of token1
 * @returns Expected LP tokens
 */
export const calculateFirstLiquidity = (
  amount0: bigint,
  amount1: bigint
): bigint => {
  if (amount0 === 0n || amount1 === 0n) return 0n;
  const liquidity = sqrt(amount0 * amount1);
  return liquidity > MINIMUM_LIQUIDITY ? liquidity - MINIMUM_LIQUIDITY : 0n;
};

/**
 * Calculate expected LP tokens (subsequent liquidity provision)
 * Formula: min((amount0 * totalSupply) / reserve0, (amount1 * totalSupply) / reserve1)
 * @param amount0 - Amount of token0
 * @param amount1 - Amount of token1
 * @param reserve0 - Current reserve of token0
 * @param reserve1 - Current reserve of token1
 * @param totalSupply - Current total LP token supply
 * @returns Expected LP tokens
 */
export const calculateSubsequentLiquidity = (
  amount0: bigint,
  amount1: bigint,
  reserve0: bigint,
  reserve1: bigint,
  totalSupply: bigint
): bigint => {
  if (
    amount0 === 0n ||
    amount1 === 0n ||
    reserve0 === 0n ||
    reserve1 === 0n ||
    totalSupply === 0n
  ) {
    return 0n;
  }

  const liquidity0 = (amount0 * totalSupply) / reserve0;
  const liquidity1 = (amount1 * totalSupply) / reserve1;

  return liquidity0 < liquidity1 ? liquidity0 : liquidity1;
};

/**
 * Calculate pool share percentage
 * @param lpTokens - LP tokens to receive
 * @param totalSupply - Current total LP token supply
 * @returns Pool share percentage (0-100)
 */
export const calculatePoolShare = (
  lpTokens: bigint,
  totalSupply: bigint
): number => {
  if (lpTokens === 0n || totalSupply === 0n) return 0;
  const newTotalSupply = totalSupply + lpTokens;
  const shareRatio = Number((lpTokens * 10000n) / newTotalSupply) / 100;
  return Math.min(shareRatio, 100);
};

/**
 * Format token price ratio
 * @param reserve0 - Reserve of token0
 * @param reserve1 - Reserve of token1
 * @param decimals0 - Decimals of token0
 * @param decimals1 - Decimals of token1
 * @returns Price ratio string (e.g., "1.5432")
 */
export const formatPriceRatio = (
  reserve0: bigint,
  reserve1: bigint,
  decimals0: number,
  decimals1: number
): string => {
  if (reserve0 === 0n || reserve1 === 0n) return "0";

  const reserve0Formatted = Number(formatUnits(reserve0, decimals0));
  const reserve1Formatted = Number(formatUnits(reserve1, decimals1));
  const ratio = reserve1Formatted / reserve0Formatted;

  return ratio.toFixed(4);
};

// ==================== Validation Messages ====================

export const VALIDATION_MESSAGES = {
  NO_POOL_SELECTED: "Please select a liquidity pool",
  INSUFFICIENT_BALANCE_A: "Insufficient balance for Token A",
  INSUFFICIENT_BALANCE_B: "Insufficient balance for Token B",
  AMOUNT_ZERO: "Amount must be greater than 0",
  AMOUNT_TOO_SMALL: "Amount is too small (dust)",
  SLIPPAGE_TOO_HIGH: "Slippage tolerance is too high (max 5%)",
  SLIPPAGE_TOO_LOW: "Slippage tolerance is too low (min 0.01%)",
} as const;

// ==================== Design Tokens (OlympusDAO Style) ====================

export const LIQUIDITY_DESIGN_TOKENS = {
  /** Pill-shaped border radius (OlympusDAO signature) */
  RADIUS_PILL: "100px",
  /** Large border radius for cards */
  RADIUS_LARGE: "24px",
  /** Medium border radius for inputs */
  RADIUS_MEDIUM: "16px",

  /** Card shadow (inset style) */
  SHADOW_CARD: "inset 0 -1px 0 0 rgba(255, 152, 0, 0.1)",
  /** Card hover shadow */
  SHADOW_CARD_HOVER: "inset 0 -2px 0 0 rgba(255, 152, 0, 0.2)",
  /** Button shadow */
  SHADOW_BUTTON: "0 4px 12px rgba(255, 152, 0, 0.2)",
} as const;

/**
 * Animation configuration
 */
export const ANIMATION_CONFIG = {
  /** Duration for normal transitions */
  DURATION_NORMAL: "0.3s",
  /** Duration for slow transitions */
  DURATION_SLOW: "0.5s",
  /** OlympusDAO signature easing */
  EASE_OUT_EXPO: "cubic-bezier(0.16, 1, 0.3, 1)",
} as const;

// ==================== Remove Liquidity Constants ====================

/**
 * Percentage presets for remove liquidity
 */
export const REMOVE_PERCENTAGE_PRESETS: number[] = [25, 50, 75, 100];

/**
 * Calculate amount to receive when removing liquidity
 * @param liquidity - LP tokens to burn
 * @param reserve - Pool reserve
 * @param totalSupply - Total LP token supply
 * @returns Amount of token to receive
 */
export const calculateRemoveAmount = (
  liquidity: bigint,
  reserve: bigint,
  totalSupply: bigint
): bigint => {
  if (liquidity === 0n || reserve === 0n || totalSupply === 0n) return 0n;
  return (liquidity * reserve) / totalSupply;
};

// ==================== Staking Constants ====================

/**
 * Get gauge address for a pool
 * Gauge addresses are now retrieved from @/config
 *
 * @param poolName - Pool name (e.g., "USDP/USDC")
 * @returns Gauge address or null
 *
 * @deprecated Use config.gauges[gaugeKey] directly instead
 * This function is kept for backward compatibility
 */
export const getGaugeAddress = (poolName: string): `0x${string}` | null => {
  // Convert pool name to key (e.g., "USDP/USDC" -> "hydUsdc")
  const gaugeKey = poolName
    .replace("/", "")
    .toLowerCase()
    .replace(/\b\w/g, (l, i) => (i === 0 ? l.toLowerCase() : l.toUpperCase()))
    .replace(/\s+/g, "") as keyof typeof config.gauges;

  const address = config.gauges[gaugeKey] as string | undefined;
  return address ? (address as `0x${string}`) : null;
};
