/**
 * BSC Testnet Address Configuration
 * BSC测试网地址配置
 *
 * 🚀 已同步测试网部署地址 (2025-11-07)
 * ✅ 34个合约已部署
 */

export const BSC_TESTNET = 97;

// ============================================================================
// Protocol Tokens
// 协议Token
// ============================================================================

export const tokens = {
  // Core Protocol Tokens (已部署)
  usdp: "0x69cA4879c52A0935561F9D8165e4CB3b91f951a6" as const, // USDP稳定币
  paimon: "0x4FfBD9CC8e5E26Ec1559D754cC71a061D1820fDF" as const, // PAIMON治理代币
  esPaimon: "0xA848c9F841bB2deDC160DCb5108F2aac610CA02a" as const, // esPAIMON归属代币
  hyd: "0xbBeAE7204fab9ae9F9eF67866C0eB6274db0549c" as const, // HYD测试RWA资产

  // Core Contracts (已部署)
  treasury: "0x8CA5Cd0293b9d3C8BC796083E806bc5bC381772A" as const, // Treasury资金库
  psm: "0x46eB7627024cEd13826359a5c0aEc57c7255b330" as const, // PSM 1:1兑换
  votingEscrow: "0x8CC8a97Cf7a05d5308b49CFdF24De5Fa66F696B7" as const, // VotingEscrow基类
  vePaimon: "0xdEe148Cd27a9923DE1986399a6629aB375F244e1" as const, // vePAIMON NFT

  // Vault & Stability (Task 43) (已部署)
  vault: "0xF98B41CD89e5434Cae982d4b7EB326D2C1222867" as const, // USDPVault
  stabilityPool: "0x4f40786fB0722A10822E3929d331c07042B68838" as const, // StabilityPool

  // Incentives (Task 17) (已部署)
  boostStaking: "0x0998dA12E9A61a7957e37feE9bBdAe7DDA6Ef314" as const, // BoostStaking加速质押
  nitroPool: "0x89f108938951CF996cD3c26556dAF525aD4d9957" as const, // NitroPool氮池
  savingRate: "0xB89188bD9b635EC9Dd73f73C9E3bE17dB83D01B2" as const, // SavingRate储蓄利率

  // Governance & Emission (已部署)
  gaugeController: "0x4fDF9e1640722455cdA32dC2cceD85AeA8a3dB1A" as const, // GaugeController
  rewardDistributor: "0x94c9E4eb5F82D381e889178d322b7b36601AD11a" as const, // RewardDistributor
  emissionManager: "0x13536aDe0a7b8Ec6B07FcFc29a6915881c50EA38" as const, // EmissionManager
  emissionRouter: "0x0B6638cb031b880238DC5793aD1B3CFCE10DA852" as const, // EmissionRouter
  bribeMarketplace: "0x748800E079eC6605D23d9803A6248613e80253B1" as const, // BribeMarketplace

  // Launchpad (已部署)
  launchpad: "0x764a546351cc7C74f68D10b15C18b8d4D7bBB08A" as const, // ProjectRegistry
  issuanceController: "0xd7b22158801C22fFc0Ff81a1C5B000f29779530E" as const, // IssuanceController

  // Oracles (已部署)
  priceOracle: "0x5Ae36173EA62B33590857eD2E77580A9680d4d33" as const, // PriceOracle
  rwaPriceOracle: "0xa6dD28dfCa8448965BE9D97BBBAaf82c45CE25C7" as const, // RWAPriceOracle

  // Presale Contracts (待部署)
  remintController: "0x0000000000000000000000000000000000000000" as const, // TODO: RemintController
  bondNft: "0x0000000000000000000000000000000000000000" as const, // TODO: RWABondNFT
  venft: "0x0000000000000000000000000000000000000000" as const, // TODO: Legacy veNFT (如需要)
  governance: "0x0000000000000000000000000000000000000000" as const, // TODO: Legacy (如需要)

  // External tokens (BSC Testnet - Mock合约)
  // 外部代币（BSC测试网 - Mock合约）
  usdc: "0xA1112f596A73111E102b4a9c39064b2b2383EC38" as const, // Mock USDC (1B供应, 6位小数)
  wbnb: "0xe3402BAd7951c00e2B077A745C9e8B14122f05ED" as const, // Mock WBNB (10,000供应)
  usdt: "0xaB1a4d4f1D656d2450692d237fdD6C7f9146e814" as const, // BSC Testnet USDT
  busd: "0x8301F2213c0eeD49a7E28aeCeC6D2392cdBcf994" as const, // BSC Testnet BUSD

  // Mock Oracles (仅测试网)
  usdcPriceFeed: "0xD36eff69950c1eE2713BB1d204f875434Da28aB7" as const, // Mock USDC价格源
  bnbPriceFeed: "0x6D0a11083DCe3Fe5a2498b4B37f8edb30b29645B" as const, // Mock BNB价格源
  hydPriceFeed: "0x536608101E17e4C2c7b0d5eCc4e5659a75fE1489" as const, // Mock HYD价格源
  pyth: "0x4B4a7949694c9bcb7B4731dA60C511DD73f7FBB8" as const, // Mock Pyth
  vrfCoordinator: "0xeAcAa0e6c5965f680fc6470745dE63E53A5D249c" as const, // Mock VRF随机数

  // Chainlink Oracle (BSC Testnet真实地址)
  chainlinkOracle: "0x625047aB43d9484e51169Ac68f639363f355906c" as const,
} as const;

// ============================================================================
// DEX Contracts
// DEX合约
// ============================================================================

export const dex = {
  router: "0x066Db99AE64B1524834a1f97aa1613e2411E13AC" as const, // DEXRouter (已部署)
  factory: "0x1c1339F5A11f462A354D49ee03377D55B03E7f3D" as const, // DEXFactory (已部署)
  quoter: "0x0000000000000000000000000000000000000000" as const, // TODO: Quoter (待部署)
  multicall: "0x5BA1e12693Dc8F9c48aAD8770482f4739bEeD696" as const, // Keep: BSC Testnet Multicall3 (基础设施)
} as const;

// ============================================================================
// Liquidity Pools
// 流动性池
// ============================================================================

export const pools = {
  // 已部署的交易对
  usdpUsdc: "0x3B8D3c266B2BbE588188cA70525a2da456a848d2" as const, // USDP-USDC交易对
  paimonWbnb: "0xc625Ab8646582100D48Ae4FC68c1E8B0976111fA" as const, // PAIMON-BNB交易对
  hydUsdp: "0x2361484f586eEf76dCbaE9e4dD37C2b3d10d9110" as const, // HYD-USDP交易对

  // 待部署或legacy
  hydUsdc: "0x0000000000000000000000000000000000000000" as const, // TODO: HYD-USDC (待部署)
  hydWbnb: "0x0000000000000000000000000000000000000000" as const, // TODO: HYD-WBNB (待部署)
  usdcBusd: "0x0000000000000000000000000000000000000000" as const, // TODO: USDC-BUSD (待部署)
  usdtUsdc: "0x0000000000000000000000000000000000000000" as const, // TODO: USDT-USDC (待部署)
} as const;

// ============================================================================
// Gauge Addresses
// Gauge地址
// ============================================================================

export const gauges = {
  gaugeController: "0x4fDF9e1640722455cdA32dC2cceD85AeA8a3dB1A" as const, // GaugeController (已部署)

  // 待部署的Gauge合约
  usdpUsdc: "0x0000000000000000000000000000000000000000" as const, // TODO: USDP-USDC Gauge
  paimonWbnb: "0x0000000000000000000000000000000000000000" as const, // TODO: PAIMON-WBNB Gauge
  hydUsdp: "0x0000000000000000000000000000000000000000" as const, // TODO: HYD-USDP Gauge
  hydUsdc: "0x0000000000000000000000000000000000000000" as const, // TODO: HYD-USDC Gauge
  hydWbnb: "0x0000000000000000000000000000000000000000" as const, // TODO: HYD-WBNB Gauge
  usdcBusd: "0x0000000000000000000000000000000000000000" as const, // TODO: USDC-BUSD Gauge
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
