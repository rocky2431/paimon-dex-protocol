/**
 * Config Index
 * 配置入口文件
 *
 * 导出所有配置，包括地址配置
 * Export all configurations including address configurations
 */

import { mainnet } from "./chains/mainnet";
import { testnet } from "./chains/testnet";

// Re-export types from chains
export type { Token } from "./chains/types";

// ============================================================================
// Address Exports
// 地址导出
// ============================================================================

export { mainnet, testnet };

export const BSC_MAINNET = mainnet.chainId;
export const BSC_TESTNET = testnet.chainId;

// Export config as alias to mainnet for backward compatibility
// 导出config作为mainnet的别名，保持向后兼容
export const config = mainnet;

// ============================================================================
// Contract Addresses
// 合约地址
// ============================================================================

/**
 * Zoro contract address
 * Zoro合约地址
 */
export const ZoroAddress =
  "0x0000000000000000000000000000000000001000" as const;

// ============================================================================
// Utility Functions
// 工具函数
// ============================================================================

/**
 * Get BSCScan transaction URL
 * 获取BSCScan交易链接
 *
 * @param hash - Transaction hash
 * @param chainId - Optional chain ID, if not provided will use config.chainId
 * @returns BSCScan transaction URL
 */
export function getBscScanLink(hash: string, chainId?: number): string {
  const currentChainId = chainId ?? config.chainId;
  // Check if current chain is testnet by comparing with testnet chainId
  const isTestnet = Number(currentChainId) === Number(testnet.chainId);
  const network = isTestnet ? "testnet." : "";
  return `https://${network}bscscan.com/tx/${hash}`;
}

/**
 * Get BSCScan address URL
 * 获取BSCScan地址链接
 *
 * @param address - Contract or wallet address
 * @param chainId - Optional chain ID, if not provided will use config.chainId
 * @returns BSCScan address URL
 */
export function getBscScanAddressLink(
  address: string,
  chainId?: number
): string {
  const currentChainId = chainId ?? config.chainId;
  // Check if current chain is testnet by comparing with testnet chainId
  const isTestnet = Number(currentChainId) === Number(testnet.chainId);
  const network = isTestnet ? "testnet." : "";
  return `https://${network}bscscan.com/address/${address}`;
}

// Default export mainnet
// 默认导出主网
export default testnet;
