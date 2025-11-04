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
  // Protocol contracts - ALL DEPRECATED, awaiting redeployment
  // 所有协议合约地址已弃用，等待重新部署
  treasury: "0x0000000000000000000000000000000000000000" as const, // TODO: Update after redeployment
  usdp: "0x0000000000000000000000000000000000000000" as const, // TODO: Update after redeployment
  paimon: "0x0000000000000000000000000000000000000000" as const, // TODO: Update after redeployment
  esPaimon: "0x0000000000000000000000000000000000000000" as const, // TODO: Update after redeployment
  venft: "0x0000000000000000000000000000000000000000" as const, // TODO: Update after redeployment
  vePaimon: "0x0000000000000000000000000000000000000000" as const, // TODO: Update after redeployment
  launchpad: "0x0000000000000000000000000000000000000000" as const, // TODO: Update after redeployment
  governance: "0x0000000000000000000000000000000000000000" as const, // TODO: Update after redeployment
  psm: "0x0000000000000000000000000000000000000000" as const, // TODO: Update after redeployment
  votingEscrow: "0x0000000000000000000000000000000000000000" as const, // TODO: Update after redeployment
  remintController: "0x0000000000000000000000000000000000000000" as const, // TODO: Update after redeployment
  bondNft: "0x0000000000000000000000000000000000000000" as const, // TODO: Update after redeployment

  // New contracts (Task 17)
  boostStaking: "0x0000000000000000000000000000000000000000" as const, // TODO: Update after redeployment
  nitroPool: "0x0000000000000000000000000000000000000000" as const, // TODO: Update after redeployment
  savingRate: "0x0000000000000000000000000000000000000000" as const, // TODO: Update after redeployment

  // New contracts (Task 43)
  vault: "0x0000000000000000000000000000000000000000" as const, // TODO: Update after redeployment
  stabilityPool: "0x0000000000000000000000000000000000000000" as const, // TODO: Update after redeployment
  rewardDistributor: "0x0000000000000000000000000000000000000000" as const, // TODO: Update after redeployment
  emissionManager: "0x0000000000000000000000000000000000000000" as const, // TODO: Update after redeployment

  // External tokens (BSC Testnet - keep these)
  // 外部代币（BSC测试网 - 保留这些地址）
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
  router: "0x0000000000000000000000000000000000000000" as const, // TODO: Update after redeployment
  factory: "0x0000000000000000000000000000000000000000" as const, // TODO: Update after redeployment
  quoter: "0x0000000000000000000000000000000000000000" as const, // TODO: Update after redeployment
  multicall: "0x5BA1e12693Dc8F9c48aAD8770482f4739bEeD696" as const, // Keep: BSC Testnet Multicall3 (infrastructure)
} as const;

// ============================================================================
// Liquidity Pools
// 流动性池
// ============================================================================

export const pools = {
  hydUsdc: "0x0000000000000000000000000000000000000000" as const, // TODO: Update after redeployment
  hydWbnb: "0x0000000000000000000000000000000000000000" as const, // TODO: Update after redeployment
  paimonWbnb: "0x0000000000000000000000000000000000000000" as const, // TODO: Update after redeployment
  usdcBusd: "0x0000000000000000000000000000000000000000" as const, // TODO: Update after redeployment
  usdtUsdc: "0x0000000000000000000000000000000000000000" as const, // TODO: Update after redeployment
} as const;

// ============================================================================
// Gauge Addresses
// Gauge地址
// ============================================================================

export const gauges = {
  gaugeController: "0x0000000000000000000000000000000000000000" as const, // TODO: Update after redeployment
  hydUsdc: "0x0000000000000000000000000000000000000000" as const, // TODO: Update after redeployment
  hydWbnb: "0x0000000000000000000000000000000000000000" as const, // TODO: Update after redeployment
  usdcBusd: "0x0000000000000000000000000000000000000000" as const, // TODO: Update after redeployment
  paimonWbnb: "0x0000000000000000000000000000000000000000" as const, // TODO: Update after redeployment
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
