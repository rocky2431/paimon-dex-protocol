"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits, erc20Abi } from "viem";
import {
  RemoveLiquidityState,
  RemoveLiquidityFormData,
  RemoveLiquidityPreview,
  ValidationResult,
  LiquidityPool,
} from "../types";
import {
  calculateAmountMin,
  calculateDeadline,
  calculateRemoveAmount,
  formatPriceRatio,
  calculatePoolShare,
  DEFAULT_SLIPPAGE_BPS,
  DEFAULT_DEADLINE_MINUTES,
  VALIDATION_MESSAGES,
} from "../constants";
import { config } from "@/config";

/**
 * PancakeSwap Router ABI (minimal - removeLiquidity)
 */
const ROUTER_ABI = [
  {
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "liquidity", type: "uint256" },
      { name: "amountAMin", type: "uint256" },
      { name: "amountBMin", type: "uint256" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    name: "removeLiquidity",
    outputs: [
      { name: "amountA", type: "uint256" },
      { name: "amountB", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

/**
 * Pair contract ABI (minimal)
 */
const PAIR_ABI = [
  {
    inputs: [],
    name: "getReserves",
    outputs: [
      { name: "reserve0", type: "uint112" },
      { name: "reserve1", type: "uint112" },
      { name: "blockTimestampLast", type: "uint32" },
    ],
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
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * useRemoveLiquidity Hook
 * Manages the complete remove liquidity flow with wagmi integration
 *
 * Features:
 * - LP token balance fetching
 * - Allowance checking
 * - LP token approval
 * - Pool reserve fetching
 * - Removal amount calculation
 * - Remove liquidity transaction
 * - State machine management
 */
export const useRemoveLiquidity = () => {
  const { address } = useAccount();
  const routerAddress = config.dex.router as `0x${string}` | undefined;
  const { writeContractAsync } = useWriteContract();

  // ========== State ==========
  const [formData, setFormData] = useState<RemoveLiquidityFormData>({
    pool: null,
    lpBalance: 0n,
    lpBalanceFormatted: "0",
    percentage: 0,
    lpTokens: 0n,
    lpTokensFormatted: "0",
    slippageBps: DEFAULT_SLIPPAGE_BPS,
    deadlineMinutes: DEFAULT_DEADLINE_MINUTES,
  });

  const [removeLiquidityState, setRemoveLiquidityState] =
    useState<RemoveLiquidityState>(RemoveLiquidityState.IDLE);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);

  // ========== LP Token Balance Query ==========
  const { data: lpBalance, refetch: refetchBalance } = useReadContract({
    address: formData.pool?.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!formData.pool },
  });

  // ========== Allowance Query ==========
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: formData.pool?.address,
    abi: PAIR_ABI,
    functionName: "allowance",
    args: address && routerAddress ? [address, routerAddress] : undefined,
    query: { enabled: !!address && !!formData.pool && !!routerAddress },
  });

  // ========== Pool Reserve Queries ==========
  const { data: reserves } = useReadContract({
    address: formData.pool?.address,
    abi: PAIR_ABI,
    functionName: "getReserves",
    query: { enabled: !!formData.pool, refetchInterval: 10000 }, // Refresh every 10s
  });

  const { data: totalSupply } = useReadContract({
    address: formData.pool?.address,
    abi: PAIR_ABI,
    functionName: "totalSupply",
    query: { enabled: !!formData.pool, refetchInterval: 10000 },
  });

  // ========== Transaction Receipt ==========
  const { isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // ========== Handlers ==========

  /**
   * Handle pool selection
   */
  const handlePoolSelect = useCallback((pool: LiquidityPool) => {
    setFormData((prev) => ({
      ...prev,
      pool,
      percentage: 0,
      lpTokens: 0n,
      lpTokensFormatted: "0",
    }));
    setRemoveLiquidityState(RemoveLiquidityState.IDLE);
  }, []);

  /**
   * Handle percentage change
   */
  const handlePercentageChange = useCallback(
    (percentage: number) => {
      const currentBalance = lpBalance || 0n;
      const lpTokens = (currentBalance * BigInt(percentage)) / 100n;

      setFormData((prev) => ({
        ...prev,
        percentage,
        lpTokens,
        lpTokensFormatted: formatUnits(lpTokens, 18), // LP tokens are always 18 decimals
      }));
    },
    [lpBalance]
  );

  /**
   * Handle slippage change
   */
  const handleSlippageChange = useCallback((slippageBps: number) => {
    setFormData((prev) => ({ ...prev, slippageBps }));
  }, []);

  /**
   * Approve LP token
   */
  const approveLPToken = useCallback(async () => {
    if (!formData.pool || !formData.lpTokens || !address || !routerAddress)
      return;

    try {
      setRemoveLiquidityState(RemoveLiquidityState.APPROVING);
      const hash = await writeContractAsync({
        address: formData.pool.address,
        abi: erc20Abi,
        functionName: "approve",
        args: [routerAddress, formData.lpTokens],
      });
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for confirmation
      await refetchAllowance();
    } catch (error: any) {
      setRemoveLiquidityState(RemoveLiquidityState.ERROR);
      setErrorMessage(error.message || "Approval failed");
    }
  }, [formData, address, routerAddress, writeContractAsync, refetchAllowance]);

  /**
   * Remove liquidity
   */
  const removeLiquidity = useCallback(async () => {
    if (
      !formData.pool ||
      !formData.lpTokens ||
      !address ||
      !reserves ||
      !routerAddress
    )
      return;

    try {
      setRemoveLiquidityState(RemoveLiquidityState.REMOVING);

      const [reserve0, reserve1] = reserves;
      const amount0 = calculateRemoveAmount(
        formData.lpTokens,
        reserve0,
        totalSupply || 0n
      );
      const amount1 = calculateRemoveAmount(
        formData.lpTokens,
        reserve1,
        totalSupply || 0n
      );

      const amount0Min = calculateAmountMin(amount0, formData.slippageBps);
      const amount1Min = calculateAmountMin(amount1, formData.slippageBps);
      const deadline = calculateDeadline(formData.deadlineMinutes);

      const hash = await writeContractAsync({
        address: routerAddress,
        abi: ROUTER_ABI,
        functionName: "removeLiquidity",
        args: [
          formData.pool.token0.address,
          formData.pool.token1.address,
          formData.lpTokens,
          amount0Min,
          amount1Min,
          address,
          deadline,
        ],
      });

      setTxHash(hash);
    } catch (error: any) {
      setRemoveLiquidityState(RemoveLiquidityState.ERROR);
      setErrorMessage(error.message || "Transaction failed");
    }
  }, [
    formData,
    address,
    reserves,
    totalSupply,
    routerAddress,
    writeContractAsync,
  ]);

  /**
   * Main action handler (routes to appropriate function based on state)
   */
  const handleAction = useCallback(() => {
    if (removeLiquidityState === RemoveLiquidityState.NEEDS_APPROVAL) {
      approveLPToken();
    } else if (removeLiquidityState === RemoveLiquidityState.READY) {
      removeLiquidity();
    }
  }, [removeLiquidityState, approveLPToken, removeLiquidity]);

  // ========== Computed Values ==========

  /**
   * Remove liquidity preview (amounts to receive, price ratios)
   */
  const preview = useMemo((): RemoveLiquidityPreview | null => {
    if (
      !formData.pool ||
      !formData.lpTokens ||
      formData.lpTokens === 0n ||
      !reserves ||
      !totalSupply
    ) {
      return null;
    }

    const [reserve0, reserve1] = reserves;

    const amount0 = calculateRemoveAmount(
      formData.lpTokens,
      reserve0,
      totalSupply
    );
    const amount1 = calculateRemoveAmount(
      formData.lpTokens,
      reserve1,
      totalSupply
    );

    const amount0Min = calculateAmountMin(amount0, formData.slippageBps);
    const amount1Min = calculateAmountMin(amount1, formData.slippageBps);

    const currentBalance = lpBalance || 0n;
    const remainingLPTokens = currentBalance - formData.lpTokens;
    const remainingShare = calculatePoolShare(remainingLPTokens, totalSupply);

    const priceToken0 = formatPriceRatio(
      reserve0,
      reserve1,
      formData.pool.token0.decimals,
      formData.pool.token1.decimals
    );
    const priceToken1 = formatPriceRatio(
      reserve1,
      reserve0,
      formData.pool.token1.decimals,
      formData.pool.token0.decimals
    );

    return {
      amount0,
      amount0Formatted: formatUnits(amount0, formData.pool.token0.decimals),
      amount1,
      amount1Formatted: formatUnits(amount1, formData.pool.token1.decimals),
      amount0Min,
      amount1Min,
      remainingShare,
      priceToken0,
      priceToken1,
    };
  }, [formData, reserves, totalSupply, lpBalance]);

  /**
   * Input validation
   */
  const validation = useMemo((): ValidationResult => {
    if (!formData.pool) {
      return { isValid: false, error: VALIDATION_MESSAGES.NO_POOL_SELECTED };
    }

    if (formData.percentage === 0 || formData.lpTokens === 0n) {
      return { isValid: false, error: VALIDATION_MESSAGES.AMOUNT_ZERO };
    }

    if (formData.lpTokens > (lpBalance || 0n)) {
      return { isValid: false, error: "Insufficient LP token balance" };
    }

    return { isValid: true };
  }, [formData, lpBalance]);

  // ========== Side Effects ==========

  /**
   * Update LP balance when pool changes
   */
  useEffect(() => {
    if (lpBalance !== undefined) {
      setFormData((prev) => ({
        ...prev,
        lpBalance: lpBalance || 0n,
        lpBalanceFormatted: formatUnits(lpBalance || 0n, 18),
      }));
    }
  }, [lpBalance]);

  /**
   * Update state based on approval status
   */
  useEffect(() => {
    if (!formData.lpTokens || formData.lpTokens === 0n || !validation.isValid) {
      setRemoveLiquidityState(RemoveLiquidityState.IDLE);
      return;
    }

    const needsApproval = (allowance || 0n) < formData.lpTokens;

    if (needsApproval) {
      setRemoveLiquidityState(RemoveLiquidityState.NEEDS_APPROVAL);
    } else {
      setRemoveLiquidityState(RemoveLiquidityState.READY);
    }
  }, [formData.lpTokens, allowance, validation.isValid]);

  /**
   * Handle transaction success
   */
  useEffect(() => {
    if (isTxSuccess) {
      setRemoveLiquidityState(RemoveLiquidityState.SUCCESS);
      // Reset form after 3 seconds
      setTimeout(() => {
        setFormData((prev) => ({
          ...prev,
          percentage: 0,
          lpTokens: 0n,
          lpTokensFormatted: "0",
        }));
        setRemoveLiquidityState(RemoveLiquidityState.IDLE);
        refetchBalance();
      }, 3000);
    }
  }, [isTxSuccess, refetchBalance]);

  return {
    // Form data
    formData,
    // Actions
    handlePoolSelect,
    handlePercentageChange,
    handleSlippageChange,
    handleAction,
    // Computed
    preview,
    validation,
    // State
    removeLiquidityState,
    errorMessage,
  };
};
