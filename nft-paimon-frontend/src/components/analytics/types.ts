/**
 * Analytics Dashboard Type Definitions
 */

// ==================== Core Types ====================

/**
 * Protocol TVL (Total Value Locked) breakdown
 */
export interface ProtocolTVL {
  /** Total TVL in USD */
  total: bigint;
  /** Total TVL formatted */
  totalFormatted: string;
  /** PSM total minted HYD (USD value, assuming $1) */
  psmMinted: bigint;
  /** PSM total minted formatted */
  psmMintedFormatted: string;
  /** DEX total liquidity (USD value) */
  dexLiquidity: bigint;
  /** DEX liquidity formatted */
  dexLiquidityFormatted: string;
}

/**
 * HYD price data point
 */
export interface PriceDataPoint {
  /** Timestamp */
  timestamp: number;
  /** Price in USD */
  price: number;
}

/**
 * 24h volume data
 */
export interface VolumeData {
  /** 24h volume in USD */
  volume24h: bigint;
  /** 24h volume formatted */
  volume24hFormatted: string;
  /** Last updated timestamp */
  lastUpdated: number;
}

/**
 * veNFT APR calculation result
 */
export interface APRCalculation {
  /** Estimated APR percentage */
  apr: string;
  /** Annual rewards in PAIMON */
  annualRewards: bigint;
  /** Annual rewards formatted */
  annualRewardsFormatted: string;
  /** veNFT voting power */
  votingPower: bigint;
  /** veNFT voting power formatted */
  votingPowerFormatted: string;
}

/**
 * Analytics dashboard state
 */
export enum AnalyticsDashboardState {
  /** Loading data */
  LOADING = 'LOADING',
  /** Ready to display */
  READY = 'READY',
  /** Error occurred */
  ERROR = 'ERROR',
  /** Refreshing data */
  REFRESHING = 'REFRESHING',
}

/**
 * Analytics data summary
 */
export interface AnalyticsSummary {
  /** Protocol TVL */
  tvl: ProtocolTVL;
  /** Current USDP price */
  hydPrice: number;
  /** 24h volume (Phase 2) */
  volume24h?: VolumeData;
  /** Dashboard state */
  dashboardState: AnalyticsDashboardState;
  /** Error message */
  errorMessage?: string;
}

// ==================== Helper Types ====================

/**
 * Chart time range options
 */
export enum ChartTimeRange {
  /** 24 hours */
  DAY = '24H',
  /** 7 days */
  WEEK = '7D',
  /** 30 days */
  MONTH = '30D',
  /** All time */
  ALL = 'ALL',
}

/**
 * APR calculation form data
 */
export interface APRFormData {
  /** Lock amount (USDP) */
  lockAmount: bigint;
  /** Lock amount formatted */
  lockAmountFormatted: string;
  /** Lock duration (seconds) */
  lockDuration: bigint;
  /** Lock duration (weeks) */
  lockDurationWeeks: number;
}
