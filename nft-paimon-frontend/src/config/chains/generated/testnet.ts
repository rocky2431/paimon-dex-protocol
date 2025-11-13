/**
 * 🤖 AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 *
 * Generated from: paimon-rwa-contracts/deployments/testnet/addresses.json
 * Network: BSC Testnet (Chain ID: 97)
 * Deployed by: 0x90465a524Fd4c54470f77a11DeDF7503c951E62F
 * Deployment time: 2025-11-13T05:42:22.000Z
 *
 * To regenerate this file, run:
 *   npm run sync-addresses
 */

import type { Address } from 'viem';

/**
 * BSC Testnet 合约地址配置 (自动生成)
 */
export const TESTNET_ADDRESSES = {
  // ========================================
  // Core Contracts (核心合约)
  // ========================================
  core: {
    usdp: "0x6F7021C9B4DCD61b26d1aF5ACd1394A79eb49051" as Address,
    paimon: "0x9c85485176fcD2db01eD0af66ed63680Eb9e5CB2" as Address,
    esPaimon: "0x16f3a36Adae84c9c980D6C96510F37A5861DF2C6" as Address,
    hyd: "0x3803E40C522E23163078c6fB2980288974645d85" as Address,
    psm: "0xC04288c5f143541d38D5E7EAd152dB69b386a384" as Address,
    votingEscrow: "0x1A54aA3302a1F2F5BF852517A92587E9c43B15e8" as Address,
    votingEscrowPaimon: "0x9f70D468BBdC4e4b0789732DDBCa7eF01E671cC4" as Address,
    usdpVault: "0x94E9F52F90609a6941ACc20996CCF9F738Eb22A1" as Address,
    stabilityPool: "0x594D48f69B14D3f22fa18682F48Bd6fBcB829dA0" as Address,
  },

  // ========================================
  // Governance Contracts (治理合约)
  // ========================================
  governance: {
    gaugeController: "0x229d5744Edc1684C30A8A393e3d66428bd904b26" as Address,
    rewardDistributor: "0xc1867Dea89CaBcCdf207f348C420850dA4DeFF38" as Address,
    bribeMarketplace: "0x0B6454BF8C2a1111F1ba888AE29000c5FC52d7dF" as Address,
    emissionManager: "0x8bF29ACdeFFBCc3965Aaa225C4CB3EA479e7615a" as Address,
    emissionRouter: "0x122e31af6BefAEC17EC5eE2402e31364aCAbE60b" as Address,
  },

  // ========================================
  // Incentive Contracts (激励合约)
  // ========================================
  incentives: {
    boostStaking: "0xd7b1C5F77F2a2BEB06E3f145eF5cce53E566D2FF" as Address,
    nitroPool: "0x52712Ef3aa240Bdd46180f3522c1bf7573C1abbA" as Address,
  },

  // ========================================
  // DEX Contracts (去中心化交易所)
  // ========================================
  dex: {
    factory: "0xc32F700393F6d9d39b4f3b30ceF02e7A0795DB5A" as Address,
    router: "0x77a9B25d69746d9b51455c2EE71dbcc934365dDB" as Address,
    pairs: {
      usdpUsdc: "undefined" as Address,
      paimonBnb: "undefined" as Address,
      hydUsdp: "undefined" as Address,
    },
  },

  // ========================================
  // Treasury Contracts (国库合约)
  // ========================================
  treasury: {
    treasury: "0x0BdBeC0efe5f3Db5b771AB095aF1A7051B304E05" as Address,
    savingRate: "0x3977DB6503795E3c1812765f6910D96848b1e025" as Address,
    priceOracle: "0x53E69De7747a373071867eD1f0E0fFd4fC3C7357" as Address,
    rwaPriceOracle: "0xbEf3913a7FA99985c1C7FfAb9B948C5f93eC2A8b" as Address,
  },

  // ========================================
  // Launchpad Contracts (启动平台)
  // ========================================
  launchpad: {
    projectRegistry: "0x03799e8F66027cE3A96e03bA3a39A641D72961dC" as Address,
    issuanceController: "0xA417eA34907F30DaC280E736b07B867ADB187E0e" as Address,
  },

  // ========================================
  // Mock Contracts (测试网模拟合约)
  // ========================================
  mocks: {
    usdc: "0x2Dbcd194F22858Ae139Ba026830cBCc5C730FdF4" as Address,
    wbnb: "undefined" as Address,
    usdcPriceFeed: "0xC3071490d44f6122e892b37996308f073D75C4B7" as Address,
    bnbPriceFeed: "undefined" as Address,
    hydPriceFeed: "0x45E3E8bB1169283Ae9d5B7B65aE5D72227Ea83BF" as Address,
    pyth: "0x04c8ca319FBd3378E56bDe0EbDbDb7200f462084" as Address,
    vrfCoordinator: "0x2aAb24fC469334EE2e81F4A647c876EF921C1A2c" as Address,
  },
} as const;

/**
 * 部署元数据
 */
export const TESTNET_DEPLOYMENT_METADATA = {
  network: "BSC Testnet",
  chainId: 97,
  deployer: "0x90465a524Fd4c54470f77a11DeDF7503c951E62F" as Address,
  timestamp: 1763012542,
  deployedAt: new Date(1763012542 * 1000).toISOString(),
} as const;
