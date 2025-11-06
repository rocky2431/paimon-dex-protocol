/**
 * 🤖 AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 *
 * Generated from: paimon-rwa-contracts/deployments/testnet/addresses.json
 * Network: BSC Testnet (Chain ID: 97)
 * Deployed by: 0x90465a524Fd4c54470f77a11DeDF7503c951E62F
 * Deployment time: 2025-11-06T18:02:44.000Z
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
    usdp: "0x69cA4879c52A0935561F9D8165e4CB3b91f951a6" as Address,
    paimon: "0x4FfBD9CC8e5E26Ec1559D754cC71a061D1820fDF" as Address,
    esPaimon: "0xA848c9F841bB2deDC160DCb5108F2aac610CA02a" as Address,
    hyd: "0xbBeAE7204fab9ae9F9eF67866C0eB6274db0549c" as Address,
    psm: "0x46eB7627024cEd13826359a5c0aEc57c7255b330" as Address,
    votingEscrow: "0x8CC8a97Cf7a05d5308b49CFdF24De5Fa66F696B7" as Address,
    votingEscrowPaimon: "0xdEe148Cd27a9923DE1986399a6629aB375F244e1" as Address,
    usdpVault: "0xF98B41CD89e5434Cae982d4b7EB326D2C1222867" as Address,
    stabilityPool: "0x4f40786fB0722A10822E3929d331c07042B68838" as Address,
  },

  // ========================================
  // Governance Contracts (治理合约)
  // ========================================
  governance: {
    gaugeController: "0x4fDF9e1640722455cdA32dC2cceD85AeA8a3dB1A" as Address,
    rewardDistributor: "0x94c9E4eb5F82D381e889178d322b7b36601AD11a" as Address,
    bribeMarketplace: "0x748800E079eC6605D23d9803A6248613e80253B1" as Address,
    emissionManager: "0x13536aDe0a7b8Ec6B07FcFc29a6915881c50EA38" as Address,
    emissionRouter: "0x0B6638cb031b880238DC5793aD1B3CFCE10DA852" as Address,
  },

  // ========================================
  // Incentive Contracts (激励合约)
  // ========================================
  incentives: {
    boostStaking: "0x0998dA12E9A61a7957e37feE9bBdAe7DDA6Ef314" as Address,
    nitroPool: "0x89f108938951CF996cD3c26556dAF525aD4d9957" as Address,
  },

  // ========================================
  // DEX Contracts (去中心化交易所)
  // ========================================
  dex: {
    factory: "0x1c1339F5A11f462A354D49ee03377D55B03E7f3D" as Address,
    router: "0x066Db99AE64B1524834a1f97aa1613e2411E13AC" as Address,
    pairs: {
      usdpUsdc: "0x3B8D3c266B2BbE588188cA70525a2da456a848d2" as Address,
      paimonBnb: "0xc625Ab8646582100D48Ae4FC68c1E8B0976111fA" as Address,
      hydUsdp: "0x2361484f586eEf76dCbaE9e4dD37C2b3d10d9110" as Address,
    },
  },

  // ========================================
  // Treasury Contracts (国库合约)
  // ========================================
  treasury: {
    treasury: "0x8CA5Cd0293b9d3C8BC796083E806bc5bC381772A" as Address,
    savingRate: "0xB89188bD9b635EC9Dd73f73C9E3bE17dB83D01B2" as Address,
    priceOracle: "0x5Ae36173EA62B33590857eD2E77580A9680d4d33" as Address,
    rwaPriceOracle: "0xa6dD28dfCa8448965BE9D97BBBAaf82c45CE25C7" as Address,
  },

  // ========================================
  // Launchpad Contracts (启动平台)
  // ========================================
  launchpad: {
    projectRegistry: "0x764a546351cc7C74f68D10b15C18b8d4D7bBB08A" as Address,
    issuanceController: "0xd7b22158801C22fFc0Ff81a1C5B000f29779530E" as Address,
  },

  // ========================================
  // Mock Contracts (测试网模拟合约)
  // ========================================
  mocks: {
    usdc: "0xA1112f596A73111E102b4a9c39064b2b2383EC38" as Address,
    wbnb: "0xe3402BAd7951c00e2B077A745C9e8B14122f05ED" as Address,
    usdcPriceFeed: "0xD36eff69950c1eE2713BB1d204f875434Da28aB7" as Address,
    bnbPriceFeed: "0x6D0a11083DCe3Fe5a2498b4B37f8edb30b29645B" as Address,
    hydPriceFeed: "0x536608101E17e4C2c7b0d5eCc4e5659a75fE1489" as Address,
    pyth: "0x4B4a7949694c9bcb7B4731dA60C511DD73f7FBB8" as Address,
    vrfCoordinator: "0xeAcAa0e6c5965f680fc6470745dE63E53A5D249c" as Address,
  },
} as const;

/**
 * 部署元数据
 */
export const TESTNET_DEPLOYMENT_METADATA = {
  network: "BSC Testnet",
  chainId: 97,
  deployer: "0x90465a524Fd4c54470f77a11DeDF7503c951E62F" as Address,
  timestamp: 1762452164,
  deployedAt: new Date(1762452164 * 1000).toISOString(),
} as const;
