/**
 * NitroPool Contract Configuration
 * Nitro外部激励池合约配置
 *
 * NitroPool allows external projects to create incentivized liquidity pools
 * with vePaimon governance approval.
 */

export const NITROPOOL_ADDRESS =
  "0x89f108938951CF996cD3c26556dAF525aD4d9957" as const;

// Minimal ABI for NitroPool contract
export const NITROPOOL_ABI = [
  // Read Functions
  {
    type: "function",
    name: "votingEscrow",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MIN_VOTING_POWER",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "PLATFORM_FEE",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pools",
    inputs: [{ name: "poolId", type: "uint256" }],
    outputs: [
      { name: "lpToken", type: "address" },
      { name: "lockDuration", type: "uint256" },
      { name: "minLiquidity", type: "uint256" },
      { name: "totalStaked", type: "uint256" },
      { name: "isActive", type: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPoolRewardTokens",
    inputs: [{ name: "poolId", type: "uint256" }],
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "userStakes",
    inputs: [
      { name: "poolId", type: "uint256" },
      { name: "user", type: "address" },
    ],
    outputs: [
      { name: "amount", type: "uint256" },
      { name: "stakeTime", type: "uint256" },
      { name: "unlockTime", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPendingRewards",
    inputs: [
      { name: "poolId", type: "uint256" },
      { name: "user", type: "address" },
      { name: "rewardToken", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "canExit",
    inputs: [
      { name: "poolId", type: "uint256" },
      { name: "user", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  // Write Functions
  {
    type: "function",
    name: "createNitroPool",
    inputs: [
      { name: "lpToken", type: "address" },
      { name: "lockDuration", type: "uint256" },
      { name: "minLiquidity", type: "uint256" },
      { name: "rewardTokens", type: "address[]" },
      { name: "rewardAmounts", type: "uint256[]" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "enterNitroPool",
    inputs: [
      { name: "poolId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "exitNitroPool",
    inputs: [{ name: "poolId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimRewards",
    inputs: [
      { name: "poolId", type: "uint256" },
      { name: "rewardToken", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // Events
  {
    type: "event",
    name: "NitroCreated",
    inputs: [
      { name: "poolId", type: "uint256", indexed: true },
      { name: "lpToken", type: "address", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "lockDuration", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "NitroEntered",
    inputs: [
      { name: "poolId", type: "uint256", indexed: true },
      { name: "user", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "NitroRewardClaimed",
    inputs: [
      { name: "poolId", type: "uint256", indexed: true },
      { name: "user", type: "address", indexed: true },
      { name: "rewardToken", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;
