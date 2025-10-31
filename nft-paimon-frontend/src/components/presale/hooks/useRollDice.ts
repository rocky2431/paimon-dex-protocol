"use client";

import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import { useState, useEffect } from "react";
import { parseAbiItem } from "viem";
import { config } from "@/config";

// Contract addresses
const REMINT_CONTROLLER_ADDRESS = config.tokens
  .remintController as `0x${string}`;
const BOND_NFT_ADDRESS = config.tokens.bondNft as `0x${string}`;

// Minimal ABI for RemintController
const REMINT_CONTROLLER_ABI = [
  parseAbiItem(
    "function rollDice(uint256 tokenId) external returns (uint256 requestId)"
  ),
  parseAbiItem(
    "function getDiceData(uint256 tokenId) external view returns (uint8 diceType, uint8 rollsThisWeek, uint256 lastRollTimestamp, uint256 totalRemintEarned, uint256 lastWeekNumber, uint8 highestDiceRoll)"
  ),
  parseAbiItem(
    "event DiceRolled(uint256 indexed tokenId, uint256 requestId, uint8 diceType, uint8 result, uint256 remintAmount)"
  ),
] as const;

// Minimal ABI for Bond NFT
const BOND_NFT_ABI = [
  parseAbiItem(
    "function balanceOf(address owner) external view returns (uint256)"
  ),
  parseAbiItem(
    "function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)"
  ),
] as const;

export interface DiceData {
  diceType: number; // 0=Normal, 1=Gold, 2=Diamond
  rollsThisWeek: number;
  lastRollTimestamp: number;
  totalRemintEarned: bigint;
  lastWeekNumber: bigint;
  highestDiceRoll: number;
}

export interface RollResult {
  requestId?: bigint;
  diceType?: number;
  result?: number;
  remintAmount?: bigint;
}

/**
 * useRollDice Hook
 * Manages dice rolling functionality with RemintController
 */
export function useRollDice(tokenId?: number) {
  const { address } = useAccount();
  const [rollResult, setRollResult] = useState<RollResult | null>(null);
  const [canRoll, setCanRoll] = useState(false);

  // Read user's NFT balance
  const { data: nftBalance } = useReadContract({
    address: BOND_NFT_ADDRESS,
    abi: BOND_NFT_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // Read first tokenId if not provided
  const { data: firstTokenId } = useReadContract({
    address: BOND_NFT_ADDRESS,
    abi: BOND_NFT_ABI,
    functionName: "tokenOfOwnerByIndex",
    args: address && nftBalance && nftBalance > 0 ? [address, 0n] : undefined,
  });

  // Use provided tokenId or first owned token
  const activeTokenId =
    tokenId ?? (firstTokenId ? Number(firstTokenId) : undefined);

  // Read dice data
  const { data: diceData, refetch: refetchDiceData } = useReadContract({
    address: REMINT_CONTROLLER_ADDRESS,
    abi: REMINT_CONTROLLER_ABI,
    functionName: "getDiceData",
    args: activeTokenId !== undefined ? [BigInt(activeTokenId)] : undefined,
  });

  // Parse dice data
  const parsedDiceData: DiceData | null = diceData
    ? {
        diceType: diceData[0],
        rollsThisWeek: diceData[1],
        lastRollTimestamp: Number(diceData[2]),
        totalRemintEarned: diceData[3],
        lastWeekNumber: diceData[4],
        highestDiceRoll: diceData[5],
      }
    : null;

  // Check if can roll (7 days = 604800 seconds)
  useEffect(() => {
    if (!parsedDiceData) {
      setCanRoll(false);
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const nextRollTime = parsedDiceData.lastRollTimestamp + 7 * 24 * 60 * 60;
    setCanRoll(now >= nextRollTime);
  }, [parsedDiceData]);

  // Write contract: rollDice
  const {
    writeContract,
    data: hash,
    isPending: isRolling,
    error: rollError,
  } = useWriteContract();

  // Wait for transaction
  const { isSuccess: isRollSuccess, isLoading: isWaitingForReceipt } =
    useWaitForTransactionReceipt({
      hash,
    });

  // Handle successful roll
  useEffect(() => {
    if (isRollSuccess) {
      refetchDiceData();
      // Note: In production, you'd listen for DiceRolled event to get result
      // For now, we'll simulate a result
      setTimeout(() => {
        const maxValue = parsedDiceData
          ? [6, 12, 20][parsedDiceData.diceType]
          : 6;
        const simulatedResult = Math.floor(Math.random() * maxValue) + 1;
        setRollResult({
          result: simulatedResult,
          diceType: parsedDiceData?.diceType || 0,
        });
      }, 1000);
    }
  }, [isRollSuccess, refetchDiceData, parsedDiceData]);

  // Roll dice handler
  const handleRollDice = async () => {
    if (!activeTokenId) {
      console.error("No token ID available");
      return;
    }

    try {
      setRollResult(null);
      writeContract({
        address: REMINT_CONTROLLER_ADDRESS,
        abi: REMINT_CONTROLLER_ABI,
        functionName: "rollDice",
        args: [BigInt(activeTokenId)],
      });
    } catch (error) {
      console.error("Error rolling dice:", error);
    }
  };

  return {
    // State
    tokenId: activeTokenId,
    diceData: parsedDiceData,
    rollResult,
    canRoll,

    // Actions
    rollDice: handleRollDice,

    // Status
    isRolling: isRolling || isWaitingForReceipt,
    isSuccess: isRollSuccess,
    error: rollError,

    // Tx
    txHash: hash,
  };
}
