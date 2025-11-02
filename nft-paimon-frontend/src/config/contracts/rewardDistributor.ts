/**
 * RewardDistributor Contract Configuration
 * RewardDistributor分发合约配置
 *
 * RewardDistributor handles multi-token reward distribution to veNFT holders
 * using Merkle tree-based proofs for efficient gas usage.
 *
 * Supported reward tokens:
 * - esPAIMON: Escrowed PAIMON with linear vesting
 * - USDC: Stablecoin rewards from protocol fees
 * - USDP: Protocol stablecoin with accrual index
 */

export const REWARD_DISTRIBUTOR_ADDRESS =
  "0x0000000000000000000000000000000000000000" as const; // TODO: Update after deployment

/**
 * Reward token addresses
 * Note: Import from tokens config for consistency
 */
export const REWARD_TOKENS = {
  esPAIMON: "0x0000000000000000000000000000000000000002" as const,
  USDC: "0xaa3F4B0cEF6F8f4C584cc6fD3A5e79E68dAa13b2" as const,
  USDP: "0x0000000000000000000000000000000000000001" as const,
} as const;

// Minimal ABI for RewardDistributor contract
export const REWARD_DISTRIBUTOR_ABI = [
  // Read Functions
  {
    type: "function",
    name: "currentEpoch",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "epochStartTime",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "EPOCH_DURATION",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "merkleRoots",
    inputs: [
      { name: "epoch", type: "uint256" },
      { name: "token", type: "address" },
    ],
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "claimed",
    inputs: [
      { name: "epoch", type: "uint256" },
      { name: "token", type: "address" },
      { name: "user", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  // Write Functions
  {
    type: "function",
    name: "claim",
    inputs: [
      { name: "epoch", type: "uint256" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "proof", type: "bytes32[]" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setMerkleRoot",
    inputs: [
      { name: "epoch", type: "uint256" },
      { name: "token", type: "address" },
      { name: "merkleRoot", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // Events
  {
    type: "event",
    name: "RewardClaimed",
    inputs: [
      { name: "epoch", type: "uint256", indexed: true },
      { name: "user", type: "address", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "BoostApplied",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "baseReward", type: "uint256", indexed: false },
      { name: "boostMultiplier", type: "uint256", indexed: false },
      { name: "actualReward", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "MerkleRootSet",
    inputs: [
      { name: "epoch", type: "uint256", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "merkleRoot", type: "bytes32", indexed: false },
    ],
  },
] as const;
