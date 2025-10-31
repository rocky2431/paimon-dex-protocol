/**
 * Presale Bond NFT Type Definitions
 */

// Minting Form Data
export interface MintFormData {
  quantity: number;
}

// Minting State
export interface MintState {
  quantity: number;
  isApproving: boolean;
  isMinting: boolean;
  isApproved: boolean;
  txHash?: string;
  error?: string;
  mintedTokenIds: number[];
}

// NFT Display Data
export interface BondNFT {
  tokenId: number;
  owner: string;
  mintTime: number;
  maturityDate: number;
  rarity: string;
  openseaUrl: string;
}

// Cost Calculation
export interface CostCalculation {
  quantity: number;
  pricePerNFT: number;
  totalCost: number;
  formattedCost: string;
}

// Validation Result
export interface MintValidation {
  isValid: boolean;
  error?: string;
}

// Contract Read Data
export interface ContractData {
  totalSupply: number;
  userBalance: number;
  usdcBalance: string;
  allowance: string;
}

// Transaction Status
export type TxStatus = 'idle' | 'pending' | 'success' | 'error';

export interface TransactionState {
  approvalStatus: TxStatus;
  mintStatus: TxStatus;
  approvalTxHash?: string;
  mintTxHash?: string;
  error?: string;
}
