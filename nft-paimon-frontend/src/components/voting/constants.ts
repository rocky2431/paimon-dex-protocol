/**
 * Voting Constants (gap-3.1.3)
 * Gauge voting configuration (Velodrome/Thena model)
 *
 * Real data integration: Gauges now fetched from GaugeController via useGauges hook
 */

import { ANIMATION_CONFIG, DESIGN_TOKENS } from "../swap/constants";
import { config } from "@/config";

// Re-export design tokens
export { ANIMATION_CONFIG, DESIGN_TOKENS };

// Voting configuration
export const VOTING_CONFIG = {
  MAX_WEIGHT: 10000, // 100% = 10000 basis points
  MIN_ALLOCATION: 0, // 0% minimum per gauge
  MAX_ALLOCATION: 10000, // 100% maximum per gauge
};

// Contract addresses
export const VOTING_ADDRESSES = {
  GAUGE_CONTROLLER: config.tokens.gaugeController as `0x${string}`,
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
