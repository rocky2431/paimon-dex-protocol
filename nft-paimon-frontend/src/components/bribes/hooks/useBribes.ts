"use client";

import { useState, useEffect, useMemo } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";
import {
  Bribe,
  CreateBribeFormData,
  ClaimBribeFormData,
  BribeMarketplaceState,
  ValidationResult,
  UserBribeClaimStatus,
} from "../types";
import {
  BRIBE_MARKETPLACE_ADDRESS,
  calculatePlatformFee,
  calculateNetBribeAmount,
  getBribeTokenByAddress,
  WHITELISTED_BRIBE_TOKENS,
} from "../constants";
import { LIQUIDITY_POOLS } from "../../liquidity/constants";
import { config } from "@/config";

// Helper function to get gauge address from pool name
function getGaugeAddressFromPoolName(
  poolName: string
): `0x${string}` | undefined {
  // Convert pool name to key (e.g., "HYD/USDC" -> "hydUsdc")
  const gaugeKey = poolName
    .replace("/", "")
    .toLowerCase()
    .replace(/\b\w/g, (l, i) => (i === 0 ? l.toLowerCase() : l.toUpperCase()))
    .replace(/\s+/g, "") as keyof typeof config.gauges;

  return config.gauges[gaugeKey] as `0x${string}` | undefined;
}

/**
 * BribeMarketplace ABI (minimal)
 */
const BRIBE_MARKETPLACE_ABI = [
  {
    inputs: [
      { name: "epoch", type: "uint256" },
      { name: "gauge", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "createBribe",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "bribeId", type: "uint256" },
      { name: "tokenId", type: "uint256" },
    ],
    name: "claimBribe",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "bribeId", type: "uint256" }],
    name: "getBribe",
    outputs: [
      { name: "epoch", type: "uint256" },
      { name: "gauge", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "creator", type: "address" },
      { name: "totalVotes", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "nextBribeId",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "token", type: "address" }],
    name: "isWhitelisted",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "bribeId", type: "uint256" },
      { name: "tokenId", type: "uint256" },
    ],
    name: "hasClaimed",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * ERC20 ABI (minimal for approval)
 */
const ERC20_ABI = [
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

/**
 * useBribes Hook
 * Manages bribes marketplace interactions
 *
 * Features:
 * - Query all active bribes
 * - Query user's claimable bribes
 * - Create new bribes (with token approval)
 * - Claim bribes
 * - State management
 */
export const useBribes = () => {
  const { address, isConnected } = useAccount();
  const {
    writeContract,
    data: txHash,
    isPending: isWriting,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: txHash,
    });

  const [state, setState] = useState<BribeMarketplaceState>(
    BribeMarketplaceState.LOADING
  );
  const [errorMessage, setErrorMessage] = useState<string>("");

  // ==================== Query Total Bribes Count ====================

  const { data: nextBribeId, refetch: refetchBribeCount } = useReadContract({
    address: BRIBE_MARKETPLACE_ADDRESS,
    abi: BRIBE_MARKETPLACE_ABI,
    functionName: "nextBribeId",
  });

  // ==================== Hardcoded Bribe Queries (Max 10 bribes) ====================
  // Note: Hardcoded to satisfy React Hooks rules (no hooks in loops)

  const { data: bribe0 } = useReadContract({
    address: BRIBE_MARKETPLACE_ADDRESS,
    abi: BRIBE_MARKETPLACE_ABI,
    functionName: "getBribe",
    args: [0n],
    query: {
      enabled: !!nextBribeId && nextBribeId > 0n,
    },
  });

  const { data: bribe1 } = useReadContract({
    address: BRIBE_MARKETPLACE_ADDRESS,
    abi: BRIBE_MARKETPLACE_ABI,
    functionName: "getBribe",
    args: [1n],
    query: {
      enabled: !!nextBribeId && nextBribeId > 1n,
    },
  });

  const { data: bribe2 } = useReadContract({
    address: BRIBE_MARKETPLACE_ADDRESS,
    abi: BRIBE_MARKETPLACE_ABI,
    functionName: "getBribe",
    args: [2n],
    query: {
      enabled: !!nextBribeId && nextBribeId > 2n,
    },
  });

  const { data: bribe3 } = useReadContract({
    address: BRIBE_MARKETPLACE_ADDRESS,
    abi: BRIBE_MARKETPLACE_ABI,
    functionName: "getBribe",
    args: [3n],
    query: {
      enabled: !!nextBribeId && nextBribeId > 3n,
    },
  });

  const { data: bribe4 } = useReadContract({
    address: BRIBE_MARKETPLACE_ADDRESS,
    abi: BRIBE_MARKETPLACE_ABI,
    functionName: "getBribe",
    args: [4n],
    query: {
      enabled: !!nextBribeId && nextBribeId > 4n,
    },
  });

  const { data: bribe5 } = useReadContract({
    address: BRIBE_MARKETPLACE_ADDRESS,
    abi: BRIBE_MARKETPLACE_ABI,
    functionName: "getBribe",
    args: [5n],
    query: {
      enabled: !!nextBribeId && nextBribeId > 5n,
    },
  });

  const { data: bribe6 } = useReadContract({
    address: BRIBE_MARKETPLACE_ADDRESS,
    abi: BRIBE_MARKETPLACE_ABI,
    functionName: "getBribe",
    args: [6n],
    query: {
      enabled: !!nextBribeId && nextBribeId > 6n,
    },
  });

  const { data: bribe7 } = useReadContract({
    address: BRIBE_MARKETPLACE_ADDRESS,
    abi: BRIBE_MARKETPLACE_ABI,
    functionName: "getBribe",
    args: [7n],
    query: {
      enabled: !!nextBribeId && nextBribeId > 7n,
    },
  });

  const { data: bribe8 } = useReadContract({
    address: BRIBE_MARKETPLACE_ADDRESS,
    abi: BRIBE_MARKETPLACE_ABI,
    functionName: "getBribe",
    args: [8n],
    query: {
      enabled: !!nextBribeId && nextBribeId > 8n,
    },
  });

  const { data: bribe9 } = useReadContract({
    address: BRIBE_MARKETPLACE_ADDRESS,
    abi: BRIBE_MARKETPLACE_ABI,
    functionName: "getBribe",
    args: [9n],
    query: {
      enabled: !!nextBribeId && nextBribeId > 9n,
    },
  });

  // ==================== Aggregate Bribes ====================

  const allBribes: Bribe[] = useMemo(() => {
    const bribes: Bribe[] = [];
    const bribeData = [
      bribe0,
      bribe1,
      bribe2,
      bribe3,
      bribe4,
      bribe5,
      bribe6,
      bribe7,
      bribe8,
      bribe9,
    ];

    for (let i = 0; i < (Number(nextBribeId) || 0) && i < 10; i++) {
      const data = bribeData[i];
      if (!data) continue;

      const [epoch, gauge, token, amount, creator, totalVotes] = data;

      // Find token info
      const tokenInfo = getBribeTokenByAddress(token);
      if (!tokenInfo) continue;

      // Find gauge/pool name
      const pool = LIQUIDITY_POOLS.find((p) => {
        const gaugeAddr = getGaugeAddressFromPoolName(p.name);
        return gaugeAddr?.toLowerCase() === gauge.toLowerCase();
      });

      bribes.push({
        bribeId: BigInt(i),
        epoch,
        gauge,
        gaugeName: pool?.name || "Unknown Pool",
        token,
        tokenSymbol: tokenInfo.symbol,
        amount,
        amountFormatted: formatUnits(amount, tokenInfo.decimals),
        creator,
        totalVotes,
        apr: calculateBribeAPR(amount, totalVotes),
      });
    }

    return bribes;
  }, [
    nextBribeId,
    bribe0,
    bribe1,
    bribe2,
    bribe3,
    bribe4,
    bribe5,
    bribe6,
    bribe7,
    bribe8,
    bribe9,
  ]);

  // ==================== Update State ====================

  useEffect(() => {
    if (allBribes.length > 0 || nextBribeId !== undefined) {
      setState(BribeMarketplaceState.READY);
    }
  }, [allBribes, nextBribeId]);

  // ==================== Create Bribe Handlers ====================

  /**
   * Check token allowance
   */
  const checkAllowance = async (
    tokenAddress: `0x${string}`,
    amount: bigint
  ): Promise<{ needsApproval: boolean; currentAllowance: bigint }> => {
    if (!address) return { needsApproval: true, currentAllowance: 0n };

    // Query current allowance (using a simple read pattern)
    // Note: In production, use useReadContract with proper state management
    return { needsApproval: true, currentAllowance: 0n };
  };

  /**
   * Approve token spending
   */
  const handleApproveToken = async (
    tokenAddress: `0x${string}`,
    amount: bigint
  ) => {
    try {
      setState(BribeMarketplaceState.CREATING);
      await writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [BRIBE_MARKETPLACE_ADDRESS, amount],
      });
    } catch (error) {
      console.error("Approve error:", error);
      setState(BribeMarketplaceState.ERROR);
      setErrorMessage("Failed to approve token");
      throw error;
    }
  };

  /**
   * Create new bribe
   */
  const handleCreateBribe = async (formData: CreateBribeFormData) => {
    if (!formData.pool || !formData.token) {
      setErrorMessage("Please select pool and token");
      return;
    }

    const gauge = getGaugeAddressFromPoolName(formData.pool.name);
    if (!gauge) {
      setErrorMessage("Gauge not found for selected pool");
      return;
    }

    try {
      setState(BribeMarketplaceState.CREATING);

      // Check allowance
      const { needsApproval } = await checkAllowance(
        formData.token.address,
        formData.amount
      );

      // Approve if needed
      if (needsApproval) {
        await handleApproveToken(formData.token.address, formData.amount);
        // Wait for approval confirmation before proceeding
        // In production, split this into separate steps with proper state management
      }

      // Create bribe
      await writeContract({
        address: BRIBE_MARKETPLACE_ADDRESS,
        abi: BRIBE_MARKETPLACE_ABI,
        functionName: "createBribe",
        args: [formData.epoch, gauge, formData.token.address, formData.amount],
      });
    } catch (error) {
      console.error("Create bribe error:", error);
      setState(BribeMarketplaceState.ERROR);
      setErrorMessage("Failed to create bribe");
    }
  };

  // ==================== Claim Bribe Handlers ====================

  /**
   * Claim bribe
   */
  const handleClaimBribe = async (bribeId: bigint, tokenId: bigint) => {
    try {
      setState(BribeMarketplaceState.CLAIMING);
      await writeContract({
        address: BRIBE_MARKETPLACE_ADDRESS,
        abi: BRIBE_MARKETPLACE_ABI,
        functionName: "claimBribe",
        args: [bribeId, tokenId],
      });
    } catch (error) {
      console.error("Claim bribe error:", error);
      setState(BribeMarketplaceState.ERROR);
      setErrorMessage("Failed to claim bribe");
    }
  };

  // ==================== Validation ====================

  const validateCreateBribe = (
    formData: CreateBribeFormData
  ): ValidationResult => {
    if (!isConnected) {
      return { isValid: false, error: "Please connect wallet" };
    }

    if (!formData.pool) {
      return { isValid: false, error: "Please select a pool" };
    }

    if (!formData.token) {
      return { isValid: false, error: "Please select a bribe token" };
    }

    if (formData.amount === 0n) {
      return { isValid: false, error: "Please enter an amount" };
    }

    return { isValid: true };
  };

  const validateClaimBribe = (
    formData: ClaimBribeFormData
  ): ValidationResult => {
    if (!isConnected) {
      return { isValid: false, error: "Please connect wallet" };
    }

    if (!formData.bribe) {
      return { isValid: false, error: "No bribe selected" };
    }

    if (formData.tokenId === 0n) {
      return { isValid: false, error: "Invalid veNFT token ID" };
    }

    if (formData.claimableAmount === 0n) {
      return { isValid: false, error: "No rewards to claim" };
    }

    return { isValid: true };
  };

  // ==================== Transaction Status Handling ====================

  useEffect(() => {
    if (isWriting) {
      // State already set in handler functions
    }

    if (isConfirming) {
      // Keep current state
    }

    if (isConfirmed) {
      setState(BribeMarketplaceState.SUCCESS);

      // Refetch bribe count
      refetchBribeCount();

      // Reset to ready after 2 seconds
      setTimeout(() => {
        setState(BribeMarketplaceState.READY);
      }, 2000);
    }
  }, [isWriting, isConfirming, isConfirmed, refetchBribeCount]);

  // ==================== Helper Functions ====================

  /**
   * Calculate estimated bribe APR
   * Formula: (bribe amount / total votes) × 100%
   * This is a simplified calculation
   */
  const calculateBribeAPR = (
    bribeAmount: bigint,
    totalVotes: bigint
  ): string => {
    if (totalVotes === 0n) return "0%";

    // Simplified APR calculation
    // In production, factor in epoch duration, TVL, etc.
    const apr = Number((bribeAmount * 100n) / totalVotes) / 100;
    return `${apr.toFixed(1)}%`;
  };

  /**
   * Get user's claimable bribes
   * Note: Requires tokenId from veNFT
   */
  const getUserClaimableBribes = (tokenId: bigint): UserBribeClaimStatus[] => {
    // In production, query hasClaimed status for each bribe
    // For now, return empty array
    return [];
  };

  // ==================== Return ====================

  return {
    allBribes,
    state,
    errorMessage,
    isLoading: state === BribeMarketplaceState.LOADING,
    isCreating: state === BribeMarketplaceState.CREATING,
    isClaiming: state === BribeMarketplaceState.CLAIMING,
    isSuccess: state === BribeMarketplaceState.SUCCESS,
    handleCreateBribe,
    handleClaimBribe,
    handleApproveToken,
    validateCreateBribe,
    validateClaimBribe,
    getUserClaimableBribes,
    whitelistedTokens: WHITELISTED_BRIBE_TOKENS,
    calculatePlatformFee,
    calculateNetBribeAmount,
  };
};
