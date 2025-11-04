"use client";

import { useState, useEffect, useMemo } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, formatUnits, erc20Abi } from "viem";
import {
  StakingState,
  StakingFormData,
  LiquidityPool,
  ValidationResult,
  StakingInfo,
} from "../types";
import { config } from "@/config";

/**
 * Gauge ABI
 * Minimal ABI for liquidity mining gauge
 */
const GAUGE_ABI = [
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getReward",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "earned",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
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
    inputs: [],
    name: "rewardRate",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * useStaking Hook
 * Complete hook for liquidity mining staking operations
 *
 * Features:
 * - LP token balance query
 * - Staked balance query (gauge.balanceOf)
 * - Earned rewards query (gauge.earned)
 * - Allowance check (lp.allowance)
 * - Approve LP token (lp.approve)
 * - Stake (gauge.deposit)
 * - Unstake (gauge.withdraw)
 * - Claim rewards (gauge.getReward)
 * - State machine management
 */
export const useStaking = () => {
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

  // Form state
  const [formData, setFormData] = useState<StakingFormData>({
    pool: null,
    lpBalance: 0n,
    stakedBalance: 0n,
    earnedRewards: 0n,
    amount: 0n,
    action: "stake",
  });

  const [stakingState, setStakingState] = useState<StakingState>(
    StakingState.IDLE
  );
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Get gauge address
  const gaugeAddress = formData.pool
    ? getGaugeAddressFromPoolName(formData.pool.name)
    : null;

  // Helper function to get gauge address from pool name
  function getGaugeAddressFromPoolName(poolName: string): `0x${string}` | null {
    // Convert pool name to key (e.g., "USDP/USDC" -> "hydUsdc")
    const gaugeKey = poolName
      .replace("/", "")
      .toLowerCase()
      .replace(/\b\w/g, (l, i) => (i === 0 ? l.toLowerCase() : l.toUpperCase()))
      .replace(/\s+/g, "") as keyof typeof config.gauges;

    const address = config.gauges[gaugeKey] as string | undefined;
    return address ? (address as `0x${string}`) : null;
  }

  // ==================== Queries ====================

  // Query: LP token balance
  const { data: lpBalanceData, refetch: refetchLpBalance } = useReadContract({
    address: formData.pool?.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!formData.pool && !!address,
    },
  });

  // Query: Staked balance in gauge
  const { data: stakedBalanceData, refetch: refetchStakedBalance } =
    useReadContract({
      address: gaugeAddress || undefined,
      abi: GAUGE_ABI,
      functionName: "balanceOf",
      args: address ? [address] : undefined,
      query: {
        enabled: !!gaugeAddress && !!address,
      },
    });

  // Query: Earned rewards
  const { data: earnedRewardsData, refetch: refetchEarnedRewards } =
    useReadContract({
      address: gaugeAddress || undefined,
      abi: GAUGE_ABI,
      functionName: "earned",
      args: address ? [address] : undefined,
      query: {
        enabled: !!gaugeAddress && !!address,
      },
    });

  // Query: LP token allowance for gauge
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: formData.pool?.address,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && gaugeAddress ? [address, gaugeAddress] : undefined,
    query: {
      enabled: !!formData.pool && !!address && !!gaugeAddress,
    },
  });

  // Query: Total staked in gauge
  const { data: totalStakedData } = useReadContract({
    address: gaugeAddress || undefined,
    abi: GAUGE_ABI,
    functionName: "totalSupply",
    query: {
      enabled: !!gaugeAddress,
    },
  });

  // Query: Reward rate
  const { data: rewardRateData } = useReadContract({
    address: gaugeAddress || undefined,
    abi: GAUGE_ABI,
    functionName: "rewardRate",
    query: {
      enabled: !!gaugeAddress,
    },
  });

  // ==================== Update Form Data ====================

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      lpBalance: lpBalanceData || 0n,
      stakedBalance: stakedBalanceData || 0n,
      earnedRewards: earnedRewardsData || 0n,
    }));
  }, [lpBalanceData, stakedBalanceData, earnedRewardsData]);

  // ==================== Staking Info ====================

  const stakingInfo: StakingInfo | null = useMemo(() => {
    if (!gaugeAddress) return null;

    return {
      gauge: gaugeAddress,
      totalStaked: totalStakedData || 0n,
      rewardRate: rewardRateData || 0n,
      apr: formData.pool?.apr || "0%",
      userStaked: formData.stakedBalance,
      userEarned: formData.earnedRewards,
    };
  }, [
    gaugeAddress,
    totalStakedData,
    rewardRateData,
    formData.pool,
    formData.stakedBalance,
    formData.earnedRewards,
  ]);

  // ==================== State Machine Logic ====================

  useEffect(() => {
    if (!isConnected || !formData.pool) {
      setStakingState(StakingState.IDLE);
      return;
    }

    if (formData.amount === 0n) {
      setStakingState(StakingState.IDLE);
      return;
    }

    // For staking: check if approval is needed
    if (formData.action === "stake") {
      const allowance = allowanceData || 0n;
      if (allowance < formData.amount) {
        setStakingState(StakingState.NEEDS_APPROVAL);
      } else {
        setStakingState(StakingState.READY);
      }
    } else {
      // For unstaking: no approval needed
      setStakingState(StakingState.READY);
    }
  }, [
    isConnected,
    formData.pool,
    formData.amount,
    formData.action,
    allowanceData,
  ]);

  // Transaction status handling
  useEffect(() => {
    if (isWriting) {
      if (stakingState === StakingState.NEEDS_APPROVAL) {
        setStakingState(StakingState.APPROVING);
      } else if (formData.action === "stake") {
        setStakingState(StakingState.STAKING);
      } else {
        setStakingState(StakingState.UNSTAKING);
      }
    }

    if (isConfirming) {
      // Keep current state while confirming
    }

    if (isConfirmed) {
      setStakingState(StakingState.SUCCESS);
      // Refetch balances
      refetchLpBalance();
      refetchStakedBalance();
      refetchEarnedRewards();
      refetchAllowance();

      // Reset form after success
      setTimeout(() => {
        setFormData((prev) => ({ ...prev, amount: 0n }));
        setStakingState(StakingState.IDLE);
      }, 2000);
    }
  }, [isWriting, isConfirming, isConfirmed, stakingState, formData.action]);

  // ==================== Validation ====================

  const validation: ValidationResult = useMemo(() => {
    if (!isConnected) {
      return { isValid: false, error: "Please connect wallet" };
    }

    if (!formData.pool) {
      return { isValid: false, error: "Please select a pool" };
    }

    if (formData.amount === 0n) {
      return { isValid: false, error: "Enter amount" };
    }

    if (formData.action === "stake") {
      if (formData.amount > formData.lpBalance) {
        return { isValid: false, error: "Insufficient LP token balance" };
      }
    } else {
      if (formData.amount > formData.stakedBalance) {
        return { isValid: false, error: "Insufficient staked balance" };
      }
    }

    return { isValid: true };
  }, [isConnected, formData]);

  // ==================== Handlers ====================

  const handlePoolSelect = (pool: LiquidityPool | null) => {
    setFormData((prev) => ({
      ...prev,
      pool,
      amount: 0n,
      lpBalance: 0n,
      stakedBalance: 0n,
      earnedRewards: 0n,
    }));
    setStakingState(StakingState.IDLE);
    setErrorMessage("");
  };

  const handleActionChange = (action: "stake" | "unstake") => {
    setFormData((prev) => ({ ...prev, action, amount: 0n }));
    setStakingState(StakingState.IDLE);
  };

  const handleAmountChange = (amount: bigint) => {
    setFormData((prev) => ({ ...prev, amount }));
  };

  const handleApprove = async () => {
    if (!formData.pool || !gaugeAddress) return;

    try {
      await writeContract({
        address: formData.pool.address,
        abi: erc20Abi,
        functionName: "approve",
        args: [gaugeAddress, formData.amount],
      });
    } catch (error) {
      console.error("Approve error:", error);
      setStakingState(StakingState.ERROR);
      setErrorMessage("Failed to approve LP token");
    }
  };

  const handleStake = async () => {
    if (!gaugeAddress) return;

    try {
      await writeContract({
        address: gaugeAddress,
        abi: GAUGE_ABI,
        functionName: "deposit",
        args: [formData.amount],
      });
    } catch (error) {
      console.error("Stake error:", error);
      setStakingState(StakingState.ERROR);
      setErrorMessage("Failed to stake LP tokens");
    }
  };

  const handleUnstake = async () => {
    if (!gaugeAddress) return;

    try {
      await writeContract({
        address: gaugeAddress,
        abi: GAUGE_ABI,
        functionName: "withdraw",
        args: [formData.amount],
      });
    } catch (error) {
      console.error("Unstake error:", error);
      setStakingState(StakingState.ERROR);
      setErrorMessage("Failed to unstake LP tokens");
    }
  };

  const handleClaimRewards = async () => {
    if (!gaugeAddress) return;

    try {
      setStakingState(StakingState.CLAIMING);
      await writeContract({
        address: gaugeAddress,
        abi: GAUGE_ABI,
        functionName: "getReward",
      });
    } catch (error) {
      console.error("Claim error:", error);
      setStakingState(StakingState.ERROR);
      setErrorMessage("Failed to claim rewards");
    }
  };

  const handleAction = () => {
    if (stakingState === StakingState.NEEDS_APPROVAL) {
      handleApprove();
    } else if (stakingState === StakingState.READY) {
      if (formData.action === "stake") {
        handleStake();
      } else {
        handleUnstake();
      }
    }
  };

  // ==================== Return ====================

  return {
    formData,
    stakingState,
    validation,
    errorMessage,
    stakingInfo,
    handlePoolSelect,
    handleActionChange,
    handleAmountChange,
    handleAction,
    handleClaimRewards,
  };
};
