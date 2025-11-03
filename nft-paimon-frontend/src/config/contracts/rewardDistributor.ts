/**
 * RewardDistributor Contract ABI
 * RewardDistributor合约ABI配置
 */

export const REWARD_DISTRIBUTOR_ABI = [
  {
    "type": "constructor",
    "inputs": [
      { "name": "_votingEscrow", "type": "address", "internalType": "address" },
      { "name": "_boostStaking", "type": "address", "internalType": "address" },
      { "name": "_treasury", "type": "address", "internalType": "address" }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "EPOCH_DURATION",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "claim",
    "inputs": [
      { "name": "epoch", "type": "uint256", "internalType": "uint256" },
      { "name": "token", "type": "address", "internalType": "address" },
      { "name": "amount", "type": "uint256", "internalType": "uint256" },
      { "name": "proof", "type": "bytes32[]", "internalType": "bytes32[]" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "isClaimed",
    "inputs": [
      { "name": "user", "type": "address", "internalType": "address" },
      { "name": "epoch", "type": "uint256", "internalType": "uint256" },
      { "name": "token", "type": "address", "internalType": "address" }
    ],
    "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "claimed",
    "inputs": [
      { "name": "user", "type": "address", "internalType": "address" },
      { "name": "epoch", "type": "uint256", "internalType": "uint256" },
      { "name": "token", "type": "address", "internalType": "address" }
    ],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "currentEpoch",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getCurrentEpoch",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "merkleRoots",
    "inputs": [
      { "name": "epoch", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "boostStaking",
    "inputs": [],
    "outputs": [{ "name": "", "type": "address", "internalType": "contract BoostStaking" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "votingEscrow",
    "inputs": [],
    "outputs": [{ "name": "", "type": "address", "internalType": "address" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "paimonToken",
    "inputs": [],
    "outputs": [{ "name": "", "type": "address", "internalType": "address" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "esPaimonAddress",
    "inputs": [],
    "outputs": [{ "name": "", "type": "address", "internalType": "address" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "treasury",
    "inputs": [],
    "outputs": [{ "name": "", "type": "address", "internalType": "address" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [{ "name": "", "type": "address", "internalType": "address" }],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "Claim",
    "inputs": [
      { "name": "user", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "epoch", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "token", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "amount", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  }
] as const;
