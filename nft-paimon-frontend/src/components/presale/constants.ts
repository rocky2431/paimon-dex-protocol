/**
 * Presale Bond NFT Constants
 * Addresses, ABIs, and configuration for RWA Bond NFT minting
 */

import { config } from "@/config";

// Contract Addresses from centralized config
export const BOND_NFT_ADDRESSES = {
  97: config.tokens.bondNft as `0x${string}`, // BSC Testnet
  56: config.tokens.bondNft as `0x${string}`, // BSC Mainnet
} as const;

export const USDC_ADDRESSES = {
  97: config.tokens.usdc as `0x${string}`, // BSC Testnet
  56: config.tokens.usdc as `0x${string}`, // BSC Mainnet
} as const;

// Minting Configuration
export const MINT_CONFIG = {
  MIN_QUANTITY: 1,
  MAX_QUANTITY: 500, // Max per address
  NFT_PRICE: 100, // 100 USDC per NFT
  MAX_SUPPLY: 5000,
  DECIMALS: 6, // USDC decimals
} as const;

// Bond NFT Parameters
export const BOND_PARAMS = {
  MATURITY_DAYS: 90,
  BASE_YIELD: 0.5, // 0.5 USDC (2% APY)
  MAX_REMINT: 1.5, // 1.5 USDC max Remint per NFT
} as const;

// Rarity Tiers
export const RARITY_TIERS = {
  BRONZE: { threshold: 0, label: "Bronze", color: "#CD7F32" },
  SILVER: { threshold: 2, label: "Silver", color: "#C0C0C0" },
  GOLD: { threshold: 5, label: "Gold", color: "#FFD700" },
  PLATINUM: { threshold: 10, label: "Platinum", color: "#E5E4E2" },
  DIAMOND: { threshold: 20, label: "Diamond", color: "#B9F2FF" },
} as const;

// RWABondNFT ABI (simplified for minting)
export const BOND_NFT_ABI = [
  {
    inputs: [{ name: "quantity", type: "uint256" }],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "getRarityTier",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ERC20 (USDC) ABI
export const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// OpenSea Base URLs
export const OPENSEA_URLS = {
  97: "https://testnets.opensea.io/assets/bsc-testnet",
  56: "https://opensea.io/assets/bsc",
} as const;

// Messages
export const PRESALE_MESSAGES = {
  APPROVAL_PENDING: "Approving USDC...",
  APPROVAL_SUCCESS: "USDC approved successfully!",
  APPROVAL_ERROR: "Failed to approve USDC",
  MINT_PENDING: "Minting Bond NFTs...",
  MINT_SUCCESS: "Bond NFTs minted successfully!",
  MINT_ERROR: "Failed to mint Bond NFTs",
  INSUFFICIENT_BALANCE: "Insufficient USDC balance",
  MAX_QUANTITY_EXCEEDED: "Maximum 500 NFTs per address",
  SOLD_OUT: "Presale sold out! All 5,000 NFTs minted.",
} as const;
