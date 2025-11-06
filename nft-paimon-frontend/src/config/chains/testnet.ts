/**
 * BSC Testnet Address Configuration
 * BSC测试网地址配置
 *
 * 🤖 自动从部署结果同步 (Auto-synced from deployment)
 * 📝 运行 npm run sync-addresses 更新地址
 */

import { TESTNET_ADDRESSES } from './generated/testnet';

export const BSC_TESTNET = 97;

// ============================================================================
// Protocol Tokens
// 协议Token
// ============================================================================

export const tokens = {
  // Core Protocol Tokens (从生成文件导入)
  usdp: TESTNET_ADDRESSES.core.usdp, // USDP稳定币
  paimon: TESTNET_ADDRESSES.core.paimon, // PAIMON治理代币
  esPaimon: TESTNET_ADDRESSES.core.esPaimon, // esPAIMON归属代币
  hyd: TESTNET_ADDRESSES.core.hyd, // HYD测试RWA资产

  // Core Contracts (从生成文件导入)
  treasury: TESTNET_ADDRESSES.treasury.treasury, // Treasury资金库
  psm: TESTNET_ADDRESSES.core.psm, // PSM 1:1兑换
  votingEscrow: TESTNET_ADDRESSES.core.votingEscrow, // VotingEscrow基类
  vePaimon: TESTNET_ADDRESSES.core.votingEscrowPaimon, // vePAIMON NFT

  // Vault & Stability (从生成文件导入)
  vault: TESTNET_ADDRESSES.core.usdpVault, // USDPVault
  stabilityPool: TESTNET_ADDRESSES.core.stabilityPool, // StabilityPool

  // Incentives (从生成文件导入)
  boostStaking: TESTNET_ADDRESSES.incentives.boostStaking, // BoostStaking加速质押
  nitroPool: TESTNET_ADDRESSES.incentives.nitroPool, // NitroPool氮池
  savingRate: TESTNET_ADDRESSES.treasury.savingRate, // SavingRate储蓄利率

  // Governance & Emission (从生成文件导入)
  gaugeController: TESTNET_ADDRESSES.governance.gaugeController, // GaugeController
  rewardDistributor: TESTNET_ADDRESSES.governance.rewardDistributor, // RewardDistributor
  emissionManager: TESTNET_ADDRESSES.governance.emissionManager, // EmissionManager
  emissionRouter: TESTNET_ADDRESSES.governance.emissionRouter, // EmissionRouter
  bribeMarketplace: TESTNET_ADDRESSES.governance.bribeMarketplace, // BribeMarketplace

  // Launchpad (从生成文件导入)
  launchpad: TESTNET_ADDRESSES.launchpad.projectRegistry, // ProjectRegistry
  issuanceController: TESTNET_ADDRESSES.launchpad.issuanceController, // IssuanceController

  // Oracles (从生成文件导入)
  priceOracle: TESTNET_ADDRESSES.treasury.priceOracle, // PriceOracle
  rwaPriceOracle: TESTNET_ADDRESSES.treasury.rwaPriceOracle, // RWAPriceOracle

  // Presale Contracts (待部署 - 不在当前测试网部署范围)
  remintController: "0x0000000000000000000000000000000000000000" as const, // TODO: Phase 2 - RemintController
  bondNft: "0x0000000000000000000000000000000000000000" as const, // TODO: Phase 2 - RWABondNFT
  venft: "0x0000000000000000000000000000000000000000" as const, // TODO: Legacy (如需要)
  governance: "0x0000000000000000000000000000000000000000" as const, // TODO: Legacy (如需要)

  // External tokens (BSC Testnet - Mock合约，从生成文件导入)
  usdc: TESTNET_ADDRESSES.mocks.usdc, // Mock USDC (1B供应, 6位小数)
  wbnb: TESTNET_ADDRESSES.mocks.wbnb, // Mock WBNB (10,000供应)
  usdt: "0xaB1a4d4f1D656d2450692d237fdD6C7f9146e814" as const, // BSC Testnet USDT (外部)
  busd: "0x8301F2213c0eeD49a7E28aeCeC6D2392cdBcf994" as const, // BSC Testnet BUSD (外部)

  // Mock Oracles (仅测试网，从生成文件导入)
  usdcPriceFeed: TESTNET_ADDRESSES.mocks.usdcPriceFeed, // Mock USDC价格源
  bnbPriceFeed: TESTNET_ADDRESSES.mocks.bnbPriceFeed, // Mock BNB价格源
  hydPriceFeed: TESTNET_ADDRESSES.mocks.hydPriceFeed, // Mock HYD价格源
  pyth: TESTNET_ADDRESSES.mocks.pyth, // Mock Pyth
  vrfCoordinator: TESTNET_ADDRESSES.mocks.vrfCoordinator, // Mock VRF随机数

  // Chainlink Oracle (BSC Testnet真实地址 - 外部基础设施)
  chainlinkOracle: "0x625047aB43d9484e51169Ac68f639363f355906c" as const,
} as const;

// ============================================================================
// DEX Contracts
// DEX合约
// ============================================================================

export const dex = {
  router: TESTNET_ADDRESSES.dex.router, // DEXRouter (已部署)
  factory: TESTNET_ADDRESSES.dex.factory, // DEXFactory (已部署)
  quoter: "0x0000000000000000000000000000000000000000" as const, // TODO: Phase 2 - Quoter
  multicall: "0x5BA1e12693Dc8F9c48aAD8770482f4739bEeD696" as const, // Keep: BSC Testnet Multicall3 (外部基础设施)
} as const;

// ============================================================================
// Liquidity Pools
// 流动性池
// ============================================================================

export const pools = {
  // 已部署的交易对 (从生成文件导入)
  usdpUsdc: TESTNET_ADDRESSES.dex.pairs.usdpUsdc, // USDP-USDC交易对
  paimonWbnb: TESTNET_ADDRESSES.dex.pairs.paimonBnb, // PAIMON-BNB交易对
  hydUsdp: TESTNET_ADDRESSES.dex.pairs.hydUsdp, // HYD-USDP交易对

  // 待部署 (不在当前测试网部署范围)
  hydUsdc: "0x0000000000000000000000000000000000000000" as const, // TODO: Phase 2 - HYD-USDC
  hydWbnb: "0x0000000000000000000000000000000000000000" as const, // TODO: Phase 2 - HYD-WBNB
  usdcBusd: "0x0000000000000000000000000000000000000000" as const, // TODO: Phase 2 - USDC-BUSD
  usdtUsdc: "0x0000000000000000000000000000000000000000" as const, // TODO: Phase 2 - USDT-USDC
} as const;

// ============================================================================
// Gauge Addresses
// Gauge地址
// ============================================================================

export const gauges = {
  gaugeController: TESTNET_ADDRESSES.governance.gaugeController, // GaugeController (已部署)

  // 待部署的Gauge合约 (不在当前测试网部署范围 - Phase 2)
  usdpUsdc: "0x0000000000000000000000000000000000000000" as const, // TODO: Phase 2 - USDP-USDC Gauge
  paimonWbnb: "0x0000000000000000000000000000000000000000" as const, // TODO: Phase 2 - PAIMON-WBNB Gauge
  hydUsdp: "0x0000000000000000000000000000000000000000" as const, // TODO: Phase 2 - HYD-USDP Gauge
  hydUsdc: "0x0000000000000000000000000000000000000000" as const, // TODO: Phase 2 - HYD-USDC Gauge
  hydWbnb: "0x0000000000000000000000000000000000000000" as const, // TODO: Phase 2 - HYD-WBNB Gauge
  usdcBusd: "0x0000000000000000000000000000000000000000" as const, // TODO: Phase 2 - USDC-BUSD Gauge
} as const;

// ============================================================================
// Token Configurations (for Swap/UI)
// Token配置（用于交换/UI）
// ============================================================================

export const tokenConfig = {
  usdc: {
    symbol: "USDC" as const,
    name: "USD Coin",
    decimals: 6, // BSC Testnet Mock USDC uses 6 decimals
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
  hyd: {
    symbol: "HYD" as const,
    name: "Hydra RWA Token",
    decimals: 18,
    address: tokens.hyd,
    icon: "/tokens/hyd.svg",
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
