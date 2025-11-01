/**
 * VotingEscrowPaimon Contract Configuration
 * vePaimon治理锁仓合约配置
 *
 * VotingEscrowPaimon is a vote-escrowed NFT contract for PAIMON governance.
 * Lock duration: 1 week to 4 years, voting power decays linearly.
 */

export const VEPAIMON_ADDRESS =
  "0x0000000000000000000000000000000000000000" as const;

// Minimal ABI for VotingEscrowPaimon contract
export const VEPAIMON_ABI = [
  // ERC721 Standard Functions
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "ownerOf",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "transferFrom",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "tokenURI",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  // VotingEscrow Specific Functions
  {
    type: "function",
    name: "MAX_TIME",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "token",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "locked",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "amount", type: "int128" },
      { name: "end", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOfNFT",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOfNFTAt",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "timestamp", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "createLock",
    inputs: [
      { name: "value", type: "uint256" },
      { name: "lockDuration", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "increaseAmount",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "value", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "increaseUnlockTime",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "lockDuration", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "merge",
    inputs: [
      { name: "from", type: "uint256" },
      { name: "to", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // Events
  {
    type: "event",
    name: "Deposit",
    inputs: [
      { name: "provider", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: false },
      { name: "value", type: "uint256", indexed: false },
      { name: "locktime", type: "uint256", indexed: true },
      { name: "depositType", type: "uint8", indexed: false },
      { name: "ts", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Withdraw",
    inputs: [
      { name: "provider", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: false },
      { name: "value", type: "uint256", indexed: false },
      { name: "ts", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
    ],
  },
] as const;
