#!/usr/bin/env tsx
/**
 * Address Verification Script
 *
 * 验证所有合约地址配置，确保无零地址和配置错误
 *
 * 用法:
 *   npm run verify-addresses
 *
 * 功能:
 * 1. 从生成的配置文件读取地址
 * 2. 递归验证所有地址（包括嵌套结构）
 * 3. 检测零地址、空地址、格式错误
 * 4. 生成验证报告
 * 5. 验证失败时退出码为 1
 */

import * as path from 'path';
import { fileURLToPath } from 'url';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Zero address constant
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * 验证结果接口
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  totalAddresses: number;
  validAddresses: number;
}

/**
 * 递归验证所有地址
 */
function validateAddressStructure(
  obj: any,
  path: string = ''
): ValidationResult {
  const errors: string[] = [];
  let totalAddresses = 0;
  let validAddresses = 0;

  function traverse(current: any, currentPath: string) {
    if (typeof current === 'string') {
      // This is an address
      totalAddresses++;

      if (!current) {
        errors.push(`${currentPath}: Address is empty or undefined`);
      } else if (current === ZERO_ADDRESS) {
        errors.push(`${currentPath}: Address is zero address (${ZERO_ADDRESS})`);
      } else if (!current.startsWith('0x')) {
        errors.push(`${currentPath}: Address does not start with 0x (${current})`);
      } else if (current.length !== 42) {
        errors.push(`${currentPath}: Address has invalid length (expected 42, got ${current.length})`);
      } else {
        validAddresses++;
      }
    } else if (typeof current === 'object' && current !== null) {
      // Recursively traverse nested objects
      for (const [key, value] of Object.entries(current)) {
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        traverse(value, newPath);
      }
    }
  }

  traverse(obj, path);

  return {
    isValid: errors.length === 0,
    errors,
    totalAddresses,
    validAddresses,
  };
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  console.log('🔍 Starting address verification...\n');

  try {
    // 动态导入生成的配置文件
    const configPath = path.resolve(__dirname, '../src/config/chains/generated/testnet.ts');
    const { TESTNET_ADDRESSES } = await import(configPath);

    console.log(`📖 Reading addresses from: ${configPath}\n`);

    // 验证地址
    const result = validateAddressStructure(TESTNET_ADDRESSES);

    // 显示结果
    if (result.isValid) {
      console.log('✅ All addresses are valid!\n');
      console.log('📊 Statistics:');
      console.log(`  - Total addresses: ${result.totalAddresses}`);
      console.log(`  - Valid addresses: ${result.validAddresses}`);
      console.log(`  - Invalid addresses: 0\n`);
      console.log('🎉 Verification completed successfully!');
      process.exit(0);
    } else {
      console.error('❌ Validation failed! Found the following issues:\n');

      result.errors.forEach((error, index) => {
        console.error(`  ${index + 1}. ${error}`);
      });

      console.error('\n📊 Statistics:');
      console.error(`  - Total addresses: ${result.totalAddresses}`);
      console.error(`  - Valid addresses: ${result.validAddresses}`);
      console.error(`  - Invalid addresses: ${result.errors.length}`);
      console.error(`  - Success rate: ${((result.validAddresses / result.totalAddresses) * 100).toFixed(2)}%\n`);

      console.error('💡 To fix these issues:');
      console.error('  1. Check the deployment addresses in paimon-rwa-contracts/deployments/testnet/addresses.json');
      console.error('  2. Run: npm run sync-addresses');
      console.error('  3. Run: npm run verify-addresses again\n');

      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Verification script failed:', error);
    console.error('\n💡 Make sure to run "npm run sync-addresses" first to generate the configuration.\n');
    process.exit(1);
  }
}

// 执行脚本
main();
