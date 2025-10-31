/**
 * BSC Mainnet Address Configuration
 * BSC主网地址配置
 */

export const BSC_MAINNET = 56;

// ============================================================================
// Protocol Tokens
// 协议Token
// ============================================================================

export const tokens = {
  // Protocol contracts
  treasury: "0x0000000000000000000000000000000000000000" as const, // TODO: Update after deployment
  hyd: "0x0000000000000000000000000000000000000001" as const, // TODO: Update after deployment
  paimon: "0x0000000000000000000000000000000000000002" as const, // TODO: Update after deployment
  venft: "0x0000000000000000000000000000000000000003" as const, // TODO: Update after deployment
  launchpad: "0x0000000000000000000000000000000000000004" as const, // TODO: Update after deployment
  governance: "0x0000000000000000000000000000000000000005" as const, // TODO: Update after deployment
  psm: "0x0000000000000000000000000000000000000006" as const, // TODO: Update after deployment
  votingEscrow: "0x0000000000000000000000000000000000000007" as const, // TODO: Update after deployment
  remintController: "0x0000000000000000000000000000000000000008" as const, // TODO: Update after deployment
  bondNft: "0x0000000000000000000000000000000000000009" as const, // TODO: Update after deployment

  // External tokens
  usdc: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d" as const,
  usdt: "0x55d398326f99059fF775485246999027B3197955" as const,
  busd: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56" as const,
  wbnb: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c" as const,
  dai: "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3" as const,
  eth: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8" as const,
  btcb: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c" as const,
  cake: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82" as const,
  chainlinkOracle: "0x0567F2323751a0F8E2B0613786a0D3c8976a5B42" as const,
} as const;

// ============================================================================
// DEX Contracts
// DEX合约
// ============================================================================

export const dex = {
  router: "0x10ED43C718714eb63d5aA57B78B54704E256024E" as const,
  factory: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73" as const,
  quoter: "0xb048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997" as const,
  multicall: "0x5BA1e12693Dc8F9c48aAD8770482f4739bEeD696" as const,
} as const;

// ============================================================================
// Liquidity Pools
// 流动性池
// ============================================================================

export const pools = {
  hydUsdc: "0x0000000000000000000000000000000000000010" as const, // TODO: Update after deployment
  hydWbnb: "0x0000000000000000000000000000000000000011" as const, // TODO: Update after deployment
  paimonWbnb: "0x0000000000000000000000000000000000000012" as const, // TODO: Update after deployment
  usdcBusd: "0x0000000000000000000000000000000000000013" as const,
  usdtUsdc: "0x0000000000000000000000000000000000000014" as const,
} as const;

// ============================================================================
// Gauge Addresses
// Gauge地址
// ============================================================================

export const gauges = {
  gaugeController: "0xe52BcFa9e30b58d8278864d5FAA9ea2E64742426" as const,
  hydUsdc: "0x0000000000000000000000000000000000000100" as const, // TODO: Update after deployment
  hydWbnb: "0x0000000000000000000000000000000000000101" as const, // TODO: Update after deployment
  usdcBusd: "0x0000000000000000000000000000000000000102" as const, // TODO: Update after deployment
  paimonWbnb: "0x0000000000000000000000000000000000000103" as const, // TODO: Update after deployment
} as const;

// ============================================================================
// Token Configurations (for Swap/UI)
// Token配置（用于交换/UI）
// ============================================================================

export const tokenConfig = {
  usdc: {
    symbol: "USDC" as const,
    name: "USD Coin",
    decimals: 18, // BSC USDC uses 18 decimals
    address: tokens.usdc,
    icon: "/tokens/usdc.svg",
  },
  hyd: {
    symbol: "HYD" as const,
    name: "Hydra Token",
    decimals: 18,
    address: tokens.hyd,
    icon: "/tokens/hyd.svg",
  },
  busd: {
    symbol: "BUSD" as const,
    name: "Binance USD",
    decimals: 18,
    address: tokens.busd,
    icon: "/tokens/busd.svg",
  },
  wbnb: {
    symbol: "WBNB" as const,
    name: "Wrapped BNB",
    decimals: 18,
    address: tokens.wbnb,
    icon: "/tokens/wbnb.svg",
  },
  paimon: {
    symbol: "PAIMON" as const,
    name: "Paimon Governance Token",
    decimals: 18,
    address: tokens.paimon,
    icon: "/tokens/paimon.svg",
  },
} as const;

// ============================================================================
// Mainnet Config
// 主网配置
// ============================================================================

export const mainnet = {
  chainId: BSC_MAINNET,
  tokens,
  dex,
  pools,
  gauges,
  tokenConfig,
} as const;
