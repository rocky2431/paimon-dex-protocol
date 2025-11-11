#!/usr/bin/env ts-node
/**
 * Address Sync Script
 *
 * 从合约部署结果自动同步地址到前端配置
 *
 * 用法:
 *   npm run sync-addresses
 *
 * 功能:
 * 1. 读取 paimon-rwa-contracts/deployments/testnet/addresses.json
 * 2. 生成 TypeScript 配置文件 src/config/chains/generated/testnet.ts
 * 3. 自动添加类型断言 `0x${string}`
 * 4. 添加文件头注释: "Auto-generated, DO NOT EDIT MANUALLY"
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 路径配置
const CONTRACTS_REPO_PATH = path.resolve(__dirname, '../../paimon-rwa-contracts');
const SOURCE_FILE = path.join(CONTRACTS_REPO_PATH, 'deployments/testnet/addresses.json');
const OUTPUT_DIR = path.resolve(__dirname, '../src/config/chains/generated');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'testnet.ts');

/**
 * 部署地址文件结构
 */
interface DeploymentAddresses {
  network: string;
  chainId: number;
  deployer: string;
  timestamp: number;
  contracts: {
    core: Record<string, string>;
    governance: Record<string, string>;
    incentives: Record<string, string>;
    dex: Record<string, string>;
    treasury: Record<string, string>;
    launchpad: Record<string, string>;
    mocks: Record<string, string>;
  };
}

/**
 * 地址验证结果
 */
export interface ValidationResult {
  isValid: boolean;
  zeroAddresses: string[];
  totalContracts: number;
  validContracts: number;
}

/**
 * 验证地址（检查零地址）
 * Exported for testing
 */
export function validateAddresses(addresses: DeploymentAddresses): ValidationResult {
  const zeroAddress = '0x0000000000000000000000000000000000000000';
  const zeroAddresses: string[] = [];
  let totalContracts = 0;
  let validContracts = 0;

  // Validate contracts object exists
  if (!addresses.contracts || typeof addresses.contracts !== 'object') {
    throw new Error('Invalid deployment data: contracts object is missing or malformed');
  }

  // Check all contract categories
  for (const [category, contracts] of Object.entries(addresses.contracts)) {
    if (!contracts || typeof contracts !== 'object') {
      continue; // Skip invalid categories
    }

    for (const [name, address] of Object.entries(contracts)) {
      totalContracts++;
      if (!address || address === zeroAddress || address === '') {
        zeroAddresses.push(`${category}.${name}`);
      } else {
        validContracts++;
      }
    }
  }

  return {
    isValid: zeroAddresses.length === 0,
    zeroAddresses,
    totalContracts,
    validContracts,
  };
}

/**
 * 读取部署地址 JSON
 */
function readDeploymentAddresses(): DeploymentAddresses {
  console.log(`📖 Reading deployment addresses from: ${SOURCE_FILE}`);

  if (!fs.existsSync(SOURCE_FILE)) {
    throw new Error(`❌ Source file not found: ${SOURCE_FILE}`);
  }

  const content = fs.readFileSync(SOURCE_FILE, 'utf-8');
  return JSON.parse(content) as DeploymentAddresses;
}

/**
 * 生成 TypeScript 配置文件内容
 */
function generateTypeScriptConfig(addresses: DeploymentAddresses): string {
  const timestamp = new Date(addresses.timestamp * 1000).toISOString();

  return `/**
 * 🤖 AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 *
 * Generated from: paimon-rwa-contracts/deployments/testnet/addresses.json
 * Network: ${addresses.network} (Chain ID: ${addresses.chainId})
 * Deployed by: ${addresses.deployer}
 * Deployment time: ${timestamp}
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
    usdp: "${addresses.contracts.core.USDP}" as Address,
    paimon: "${addresses.contracts.core.PAIMON}" as Address,
    esPaimon: "${addresses.contracts.core.esPAIMON}" as Address,
    hyd: "${addresses.contracts.core.HYD}" as Address,
    psm: "${addresses.contracts.core.PSM}" as Address,
    votingEscrow: "${addresses.contracts.core.VotingEscrow}" as Address,
    votingEscrowPaimon: "${addresses.contracts.core.VotingEscrowPaimon}" as Address,
    usdpVault: "${addresses.contracts.core.USDPVault}" as Address,
    stabilityPool: "${addresses.contracts.core.StabilityPool}" as Address,
  },

  // ========================================
  // Governance Contracts (治理合约)
  // ========================================
  governance: {
    gaugeController: "${addresses.contracts.governance.GaugeController}" as Address,
    rewardDistributor: "${addresses.contracts.governance.RewardDistributor}" as Address,
    bribeMarketplace: "${addresses.contracts.governance.BribeMarketplace}" as Address,
    emissionManager: "${addresses.contracts.governance.EmissionManager}" as Address,
    emissionRouter: "${addresses.contracts.governance.EmissionRouter}" as Address,
  },

  // ========================================
  // Incentive Contracts (激励合约)
  // ========================================
  incentives: {
    boostStaking: "${addresses.contracts.incentives.BoostStaking}" as Address,
    nitroPool: "${addresses.contracts.incentives.NitroPool}" as Address,
  },

  // ========================================
  // DEX Contracts (去中心化交易所)
  // ========================================
  dex: {
    factory: "${addresses.contracts.dex.DEXFactory}" as Address,
    router: "${addresses.contracts.dex.DEXRouter}" as Address,
    pairs: {
      usdpUsdc: "${addresses.contracts.dex.USDP_USDC_Pair}" as Address,
      paimonBnb: "${addresses.contracts.dex.PAIMON_BNB_Pair}" as Address,
      hydUsdp: "${addresses.contracts.dex.HYD_USDP_Pair}" as Address,
    },
  },

  // ========================================
  // Treasury Contracts (国库合约)
  // ========================================
  treasury: {
    treasury: "${addresses.contracts.treasury.Treasury}" as Address,
    savingRate: "${addresses.contracts.treasury.SavingRate}" as Address,
    priceOracle: "${addresses.contracts.treasury.PriceOracle}" as Address,
    rwaPriceOracle: "${addresses.contracts.treasury.RWAPriceOracle}" as Address,
  },

  // ========================================
  // Launchpad Contracts (启动平台)
  // ========================================
  launchpad: {
    projectRegistry: "${addresses.contracts.launchpad.ProjectRegistry}" as Address,
    issuanceController: "${addresses.contracts.launchpad.IssuanceController}" as Address,
  },

  // ========================================
  // Mock Contracts (测试网模拟合约)
  // ========================================
  mocks: {
    usdc: "${addresses.contracts.mocks.USDC}" as Address,
    wbnb: "${addresses.contracts.mocks.WBNB}" as Address,
    usdcPriceFeed: "${addresses.contracts.mocks.USDCPriceFeed}" as Address,
    bnbPriceFeed: "${addresses.contracts.mocks.BNBPriceFeed}" as Address,
    hydPriceFeed: "${addresses.contracts.mocks.HYDPriceFeed}" as Address,
    pyth: "${addresses.contracts.mocks.Pyth}" as Address,
    vrfCoordinator: "${addresses.contracts.mocks.VRFCoordinator}" as Address,
  },
} as const;

/**
 * 部署元数据
 */
export const TESTNET_DEPLOYMENT_METADATA = {
  network: "${addresses.network}",
  chainId: ${addresses.chainId},
  deployer: "${addresses.deployer}" as Address,
  timestamp: ${addresses.timestamp},
  deployedAt: new Date(${addresses.timestamp} * 1000).toISOString(),
} as const;
`;
}

/**
 * 写入生成的配置文件
 */
function writeGeneratedConfig(content: string): void {
  console.log(`📝 Generating TypeScript config file: ${OUTPUT_FILE}`);

  // 确保输出目录存在
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`✅ Created directory: ${OUTPUT_DIR}`);
  }

  // 写入文件
  fs.writeFileSync(OUTPUT_FILE, content, 'utf-8');
  console.log(`✅ Generated file: ${OUTPUT_FILE}`);
}

/**
 * 主函数
 */
function main(): void {
  console.log('🚀 Starting address sync process...\n');

  try {
    // 1. 读取部署地址
    const addresses = readDeploymentAddresses();
    console.log(`✅ Loaded ${Object.keys(addresses.contracts).length} contract categories\n`);

    // 2. 验证地址（零地址检测）
    console.log('🔍 Validating contract addresses...');
    const validation = validateAddresses(addresses);

    if (!validation.isValid) {
      console.warn(`\n⚠️  Found ${validation.zeroAddresses.length} zero address(es):`);
      validation.zeroAddresses.forEach(addr => {
        console.warn(`   ❌ ${addr}`);
      });
      console.warn(`\n⚠️  Warning: Zero addresses detected! Please check deployment.\n`);
    } else {
      console.log(`✅ All ${validation.totalContracts} contract addresses are valid (non-zero)\n`);
    }

    // 3. 生成 TypeScript 配置
    const configContent = generateTypeScriptConfig(addresses);

    // 4. 写入文件
    writeGeneratedConfig(configContent);

    // 5. 成功消息
    console.log('\n🎉 Address sync completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`  - Core contracts: ${Object.keys(addresses.contracts.core).length}`);
    console.log(`  - Governance contracts: ${Object.keys(addresses.contracts.governance).length}`);
    console.log(`  - Incentive contracts: ${Object.keys(addresses.contracts.incentives).length}`);
    console.log(`  - DEX contracts: ${Object.keys(addresses.contracts.dex).length}`);
    console.log(`  - Treasury contracts: ${Object.keys(addresses.contracts.treasury).length}`);
    console.log(`  - Launchpad contracts: ${Object.keys(addresses.contracts.launchpad).length}`);
    console.log(`  - Mock contracts: ${Object.keys(addresses.contracts.mocks).length}`);
    console.log(`\n📈 Validation:`);
    console.log(`  - Total contracts: ${validation.totalContracts}`);
    console.log(`  - Valid addresses: ${validation.validContracts}`);
    console.log(`  - Zero addresses: ${validation.zeroAddresses.length}`);

    if (validation.isValid) {
      console.log(`\n✅ Next step: Update src/config/chains/testnet.ts to import from generated/testnet.ts`);
    } else {
      console.log(`\n⚠️  Please fix zero addresses before using in production!`);
    }
  } catch (error) {
    console.error('\n❌ Address sync failed:', error);
    process.exit(1);
  }
}

// 执行脚本
main();
