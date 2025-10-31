/**
 * Treasury Contract Configuration
 * Contract address and ABI for RWA Treasury
 *
 * Note: Address is now managed in @/config
 * Use getContractAddress(chainId, 'protocol.treasury') to get the address
 */

// For backward compatibility, export a function that gets the address
// Users should use getContractAddress from @/config instead
export const TREASURY_ADDRESS =
  "0x0000000000000000000000000000000000000000" as const;

// Minimal ABI for Treasury contract (only functions we need for deposit page)
export const TREASURY_ABI = [
  // Read Functions
  {
    type: "function",
    name: "rwaAssets",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [
      { name: "oracle", type: "address" },
      { name: "tier", type: "uint8" },
      { name: "ltvRatio", type: "uint256" },
      { name: "mintDiscount", type: "uint256" },
      { name: "isActive", type: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUserPosition",
    inputs: [
      { name: "user", type: "address" },
      { name: "asset", type: "address" },
    ],
    outputs: [
      { name: "rwaAsset", type: "address" },
      { name: "rwaAmount", type: "uint256" },
      { name: "hydMinted", type: "uint256" },
      { name: "depositTime", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getHealthFactor",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "BPS_DENOMINATOR",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  // Write Functions
  {
    type: "function",
    name: "depositRWA",
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "redeemRWA",
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "addCollateral",
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "canRedeem",
    inputs: [
      { name: "user", type: "address" },
      { name: "asset", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "REDEMPTION_COOLDOWN",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;
