/**
 * BSC Testnet Address Configuration
 * BSC测试网地址配置
 */

export const BSC_TESTNET = 97;

// ============================================================================
// Protocol Tokens
// 协议Token
// ============================================================================

export const tokens = {
  // Protocol contracts
  treasury: "0xFfFB900a2BC2eeDA59347883e4B07B1747C8f81e" as const,
  hyd: "0x13487611cDb4A729ca449F0586F1d0E5F586949C" as const,
  usdp: "0x0000000000000000000000000000000000000001" as const, // TODO: Update after deployment
  paimon: "0x97cdb42F7E751CD0Cf90b0b0F14f6c61854146e3" as const,
  esPaimon: "0x0000000000000000000000000000000000000002" as const, // TODO: Update after deployment
  venft: "0x0000000000000000000000000000000000000003" as const, // TODO: Update after deployment
  vePaimon: "0x0000000000000000000000000000000000000010" as const, // TODO: Update after deployment
  launchpad: "0x0000000000000000000000000000000000000004" as const, // TODO: Update after deployment
  governance: "0x0000000000000000000000000000000000000005" as const, // TODO: Update after deployment
  psm: "0xBF194c604462168747C66b077F722C7F4a550AdC" as const, // TODO: Update after deployment
  votingEscrow: "0x0566FF5A8b3bb5c4801E6D4b43e58B81070572F0" as const, // TODO: Update after deployment
  remintController: "0x0000000000000000000000000000000000000008" as const, // TODO: Update after deployment
  bondNft: "0x0000000000000000000000000000000000000009" as const, // TODO: Update after deployment

  // New contracts (Task 17)
  boostStaking: "0x0000000000000000000000000000000000000011" as const, // TODO: Update after deployment
  nitroPool: "0x0000000000000000000000000000000000000012" as const, // TODO: Update after deployment
  savingRate: "0x0000000000000000000000000000000000000013" as const, // TODO: Update after deployment

  // New contracts (Task 43)
  vault: "0x0000000000000000000000000000000000000014" as const, // TODO: Update after deployment
  stabilityPool: "0x0000000000000000000000000000000000000015" as const, // TODO: Update after deployment
  rewardDistributor: "0x0000000000000000000000000000000000000016" as const, // TODO: Update after deployment
  emissionManager: "0x0000000000000000000000000000000000000017" as const, // TODO: Update after deployment

  // External tokens
  usdc: "0xaa3F4B0cEF6F8f4C584cc6fD3A5e79E68dAa13b2" as const,
  usdt: "0xaB1a4d4f1D656d2450692d237fdD6C7f9146e814" as const,
  busd: "0x8301F2213c0eeD49a7E28aeCeC6D2392cdBcf994" as const,
  wbnb: "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd" as const,
  chainlinkOracle: "0x625047aB43d9484e51169Ac68f639363f355906c" as const,
} as const;

// ============================================================================
// DEX Contracts
// DEX合约
// ============================================================================

export const dex = {
  router: "0xD99D1c33F9fC3444f8101754aBC46c52416550D1" as const,
  factory: "0xE6b040EB6DF3756A277C2167724593Da95623f97" as const,
  quoter: "0x4D93D31d8F4d5E00D22C9B5a9D8c79E263D7e2b0" as const,
  multicall: "0x5BA1e12693Dc8F9c48aAD8770482f4739bEeD696" as const,
} as const;

// ============================================================================
// Liquidity Pools
// 流动性池
// ============================================================================

export const pools = {
  hydUsdc: "0xC83061529c27C571AdA08D23cE59F724B8598A2C" as const,
  hydWbnb: "0x0000000000000000000000000000000000000011" as const, // TODO: Update after deployment
  paimonWbnb: "0x0000000000000000000000000000000000000012" as const, // TODO: Update after deployment
  usdcBusd: "0x0000000000000000000000000000000000000013" as const, // Using placeholder
  usdtUsdc: "0x0000000000000000000000000000000000000014" as const, // Using placeholder
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
    decimals: 6, // BSC Testnet USDC uses 6 decimals (verified on-chain)
    address: tokens.usdc,
    icon: "/tokens/usdc.svg",
  },
  usdp: {
    symbol: "USDP" as const,
    name: "USD Paimon",
    decimals: 18,
    address: tokens.usdp,
    icon: "/tokens/usdp.svg",
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
  esPaimon: {
    symbol: "esPAIMON" as const,
    name: "Escrowed Paimon",
    decimals: 18,
    address: tokens.esPaimon,
    icon: "/tokens/espaimon.svg",
  },
} as const;

// ============================================================================
// Testnet Config
// 测试网配置
// ============================================================================

export const testnet = {
  chainId: BSC_TESTNET,
  tokens,
  dex,
  pools,
  gauges,
  tokenConfig,
} as const;
