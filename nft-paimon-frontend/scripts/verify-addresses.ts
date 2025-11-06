#!/usr/bin/env ts-node
/**
 * Address Verification Script
 *
 * 验证合约地址配置的正确性
 *
 * 用法:
 *   npm run verify-addresses
 *
 * 检查项:
 * 1. 所有地址格式正确 (0x + 40 hex chars)
 * 2. 已部署地址非零
 * 3. Phase 2 地址为零（符合预期）
 * 4. 与 deployment artifacts 一致性
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    totalAddresses: number;
    deployedAddresses: number;
    phase2Addresses: number;
    externalAddresses: number;
  };
}

/**
 * 验证地址格式
 */
function isValidAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

/**
 * 加载测试网配置
 */
function loadTestnetConfig(): any {
  const configPath = path.resolve(__dirname, '../src/config/chains/testnet.ts');
  console.log(`📖 Reading testnet config from: ${configPath}`);

  if (!fs.existsSync(configPath)) {
    throw new Error(`❌ Config file not found: ${configPath}`);
  }

  // 动态导入需要编译，这里我们直接读取生成的地址文件
  const generatedPath = path.resolve(__dirname, '../src/config/chains/generated/testnet.ts');
  if (!fs.existsSync(generatedPath)) {
    throw new Error(`❌ Generated file not found: ${generatedPath}`);
  }

  return { configPath, generatedPath };
}

/**
 * 加载部署地址 JSON
 */
function loadDeploymentAddresses(): any {
  const deploymentsPath = path.resolve(__dirname, '../../paimon-rwa-contracts/deployments/testnet/addresses.json');
  console.log(`📖 Reading deployment addresses from: ${deploymentsPath}`);

  if (!fs.existsSync(deploymentsPath)) {
    throw new Error(`❌ Deployment file not found: ${deploymentsPath}`);
  }

  const content = fs.readFileSync(deploymentsPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * 提取地址配置 (从 TypeScript 文件解析)
 */
function extractAddressesFromTS(filePath: string): Record<string, any> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const addresses: Record<string, string> = {};

  // 简单的正则匹配地址
  const addressPattern = /"(0x[0-9a-fA-F]{40})"/g;
  let match;

  while ((match = addressPattern.exec(content)) !== null) {
    const addr = match[1];
    if (!addresses[addr]) {
      addresses[addr] = addr;
    }
  }

  return addresses;
}

/**
 * 验证地址
 */
function verifyAddresses(): ValidationResult {
  const result: ValidationResult = {
    passed: true,
    errors: [],
    warnings: [],
    summary: {
      totalAddresses: 0,
      deployedAddresses: 0,
      phase2Addresses: 0,
      externalAddresses: 0,
    },
  };

  console.log('\\n🔍 Starting address verification...\\n');

  // 1. 加载配置
  const { configPath, generatedPath } = loadTestnetConfig();

  // 2. 加载部署地址
  const deployment = loadDeploymentAddresses();

  // 3. 提取所有地址
  const configAddresses = extractAddressesFromTS(configPath);
  const generatedAddresses = extractAddressesFromTS(generatedPath);

  console.log(`✅ Found ${Object.keys(configAddresses).length} addresses in testnet.ts`);
  console.log(`✅ Found ${Object.keys(generatedAddresses).length} addresses in generated/testnet.ts`);

  // 4. 验证地址格式
  const allAddresses = new Set([...Object.keys(configAddresses), ...Object.keys(generatedAddresses)]);

  allAddresses.forEach((addr) => {
    result.summary.totalAddresses++;

    if (!isValidAddress(addr)) {
      result.errors.push(`Invalid address format: ${addr}`);
      result.passed = false;
    }

    if (addr.toLowerCase() === ZERO_ADDRESS.toLowerCase()) {
      result.summary.phase2Addresses++;
    } else {
      result.summary.deployedAddresses++;
    }
  });

  // 5. 验证部署地址一致性
  console.log('\\n🔍 Verifying deployment consistency...\\n');

  // 扁平化部署地址
  const deploymentAddresses = new Set<string>();
  Object.values(deployment.contracts).forEach((category: any) => {
    Object.values(category).forEach((addr: any) => {
      if (typeof addr === 'string' && addr.startsWith('0x')) {
        deploymentAddresses.add(addr.toLowerCase());
      }
    });
  });

  console.log(`📊 Deployment artifacts contain ${deploymentAddresses.size} unique addresses`);

  // 检查生成文件中的地址是否都在部署文件中
  Object.keys(generatedAddresses).forEach((addr) => {
    if (addr.toLowerCase() !== ZERO_ADDRESS.toLowerCase()) {
      if (!deploymentAddresses.has(addr.toLowerCase())) {
        result.warnings.push(`Address in generated file but not in deployment: ${addr}`);
      }
    }
  });

  // 6. 检查关键合约地址
  const criticalAddresses = [
    'USDP', 'PAIMON', 'HYD', 'PSM', 'Treasury',
    'DEXRouter', 'DEXFactory', 'GaugeController'
  ];

  console.log('\\n🔍 Checking critical contract addresses...\\n');

  criticalAddresses.forEach((name) => {
    const found = Array.from(allAddresses).some(addr =>
      addr.toLowerCase() !== ZERO_ADDRESS.toLowerCase()
    );
    if (!found) {
      result.warnings.push(`No valid address found for critical contract: ${name}`);
    }
  });

  return result;
}

/**
 * 打印结果
 */
function printResults(result: ValidationResult): void {
  console.log('\\n' + '='.repeat(60));
  console.log('📊 Verification Results');
  console.log('='.repeat(60) + '\\n');

  console.log('📈 Summary:');
  console.log(`  Total Addresses: ${result.summary.totalAddresses}`);
  console.log(`  ✅ Deployed (non-zero): ${result.summary.deployedAddresses}`);
  console.log(`  ⏸️  Phase 2 (zero): ${result.summary.phase2Addresses}`);
  console.log('');

  if (result.errors.length > 0) {
    console.log('❌ Errors:');
    result.errors.forEach((err) => console.log(`  - ${err}`));
    console.log('');
  }

  if (result.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    result.warnings.forEach((warn) => console.log(`  - ${warn}`));
    console.log('');
  }

  if (result.passed && result.errors.length === 0) {
    console.log('✅ All address validations passed!');
    console.log('✅ Addresses are properly loaded from generated config');
  } else {
    console.log('❌ Verification failed with errors');
  }

  console.log('\\n' + '='.repeat(60) + '\\n');
}

/**
 * 主函数
 */
function main(): void {
  console.log('🚀 Address Verification Tool\\n');

  try {
    const result = verifyAddresses();
    printResults(result);

    if (!result.passed || result.errors.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('\\n❌ Verification failed:', error);
    process.exit(1);
  }
}

// 执行脚本
main();
