/**
 * Voting Constants
 * Gauge voting configuration (Velodrome/Thena model)
 */

import { ANIMATION_CONFIG, DESIGN_TOKENS } from "../swap/constants";
import { Gauge } from "./types";
import { config } from "@/config";

// Re-export design tokens
export { ANIMATION_CONFIG, DESIGN_TOKENS };

// Voting configuration
export const VOTING_CONFIG = {
  MAX_WEIGHT: 10000, // 100% = 10000 basis points
  MIN_ALLOCATION: 0, // 0% minimum per gauge
  MAX_ALLOCATION: 10000, // 100% maximum per gauge
};

// Mock gauges (replace with actual data from GaugeController)
export const MOCK_GAUGES: Gauge[] = [
  {
    address: "0x1111111111111111111111111111111111111111" as `0x${string}`,
    name: "HYD/USDC Pool",
    token0: "HYD",
    token1: "USDC",
    tvl: "$1,200,000",
    apr: "25%",
    weight: 3500, // 35% current weight
  },
  {
    address: "0x2222222222222222222222222222222222222222" as `0x${string}`,
    name: "HYD/ETH Pool",
    token0: "HYD",
    token1: "ETH",
    tvl: "$800,000",
    apr: "18%",
    weight: 2500, // 25% current weight
  },
  {
    address: "0x3333333333333333333333333333333333333333" as `0x${string}`,
    name: "USDC/ETH Pool",
    token0: "USDC",
    token1: "ETH",
    tvl: "$1,500,000",
    apr: "15%",
    weight: 4000, // 40% current weight
  },
];

// Contract addresses
export const VOTING_ADDRESSES = {
  GAUGE_CONTROLLER: config.gauges.gaugeController as `0x${string}`,
  VOTING_ESCROW: config.tokens.votingEscrow as `0x${string}`,
};

// Messages
export const VOTING_MESSAGES = {
  VOTE_SUCCESS: "Votes submitted successfully! 🎉",
  VOTE_ERROR: "Failed to submit votes. Please try again.",
  INSUFFICIENT_POWER: "Insufficient voting power",
  INVALID_ALLOCATION: "Total allocation must be ≤ 100%",
  NO_ALLOCATION: "Please allocate voting power to at least one gauge",
  CONNECT_WALLET: "Please connect your wallet",
  NO_VOTING_POWER: "You need veNFT to vote. Lock PAIMON first!",
};

// Helper functions
export const formatWeight = (weight: number): string => {
  return `${(weight / 100).toFixed(1)}%`;
};

export const calculateVotingPower = (
  totalPower: bigint,
  allocationPercentage: number
): bigint => {
  return (
    (totalPower * BigInt(Math.floor(allocationPercentage * 100))) /
    BigInt(10000)
  );
};
