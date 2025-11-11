/**
 * Treasury Types
 * Type definitions for RWA Treasury operations
 */

export interface RWATier {
  oracle: string;
  tier: number;
  ltvRatio: bigint;
  mintDiscount: bigint;
  isActive: boolean;
}

export interface RWAAsset {
  address: string;
  name: string;
  symbol: string;
  tier: number;
  ltvRatio: number; // Percentage (e.g., 60 for 60%)
  mintDiscount: number; // Percentage (e.g., 0 for no discount)
  isActive: boolean;
  oracleAddress?: string; // RWAPriceOracle contract address for this asset
}

export interface UserPosition {
  rwaAsset: string;
  rwaAmount: bigint;
  usdpMinted: bigint;
  depositTime: bigint;
}

export interface DepositPreview {
  rwaValue: bigint; // RWA value in USD (18 decimals)
  usdpMintAmount: bigint; // USDP amount to mint (18 decimals)
  ltvRatio: number; // LTV ratio percentage
  healthFactor: number; // Health factor percentage
  mintDiscount: number; // Mint discount percentage
}

export interface DepositFormData {
  selectedAsset: string | null;
  amount: string;
}
