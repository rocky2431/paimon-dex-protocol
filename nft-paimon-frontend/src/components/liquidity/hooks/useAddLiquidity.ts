"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, formatUnits, erc20Abi } from "viem";
import {
  AddLiquidityState,
  AddLiquidityFormData,
  LiquidityPreview,
  ValidationResult,
  Token,
  TokenAmount,
  LiquidityPool,
  AddLiquidityParams,
} from "../types";
import {
  calculateAmountMin,
  calculateDeadline,
  quoteTokenAmount,
  calculateFirstLiquidity,
  calculateSubsequentLiquidity,
  calculatePoolShare,
  formatPriceRatio,
  DEFAULT_SLIPPAGE_BPS,
  DEFAULT_DEADLINE_MINUTES,
  VALIDATION_MESSAGES,
} from "../constants";
import { config } from "@/config";

/**
 * PancakeSwap Router ABI (minimal)
 */
const ROUTER_ABI = [
  {
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "amountADesired", type: "uint256" },
      { name: "amountBDesired", type: "uint256" },
      { name: "amountAMin", type: "uint256" },
      { name: "amountBMin", type: "uint256" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    name: "addLiquidity",
    outputs: [
      { name: "amountA", type: "uint256" },
      { name: "amountB", type: "uint256" },
      { name: "liquidity", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "amountA", type: "uint256" },
      { name: "reserveA", type: "uint256" },
      { name: "reserveB", type: "uint256" },
    ],
    name: "quote",
    outputs: [{ name: "amountB", type: "uint256" }],
    stateMutability: "pure",
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
] as const;

/**
 * useAddLiquidity Hook
 * Manages the complete add liquidity flow with wagmi integration
 *
 * Features:
 * - Token balance fetching
 * - Allowance checking
 * - Token approval
 * - Pool reserve fetching
 * - Liquidity calculation
 * - Add liquidity transaction
 * - State machine management
 */
export const useAddLiquidity = () => {
  const { address } = useAccount();
  const routerAddress = config.dex.router as `0x${string}` | undefined;
  const { writeContractAsync } = useWriteContract();

  // ========== State ==========
  const [formData, setFormData] = useState<AddLiquidityFormData>({
    pool: null,
    tokenA: null,
    tokenB: null,
    slippageBps: DEFAULT_SLIPPAGE_BPS,
    deadlineMinutes: DEFAULT_DEADLINE_MINUTES,
  });

  const [addLiquidityState, setAddLiquidityState] = useState<AddLiquidityState>(
    AddLiquidityState.IDLE
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);

  // ========== Token Balance Queries ==========
  const { data: balanceA } = useReadContract({
    address: formData.pool?.token0.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!formData.pool },
  });

  const { data: balanceB } = useReadContract({
    address: formData.pool?.token1.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!formData.pool },
  });

  // ========== Allowance Queries ==========
  const { data: allowanceA } = useReadContract({
    address: formData.pool?.token0.address,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && routerAddress ? [address, routerAddress] : undefined,
    query: { enabled: !!address && !!formData.pool && !!routerAddress },
  });

  const { data: allowanceB } = useReadContract({
    address: formData.pool?.token1.address,
    abi: erc20Abi,
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
      tokenA: null,
      tokenB: null,
    }));
    setAddLiquidityState(AddLiquidityState.IDLE);
  }, []);

  /**
   * Handle token A amount change
   */
  const handleTokenAChange = useCallback(
    (amount: string) => {
      if (!formData.pool || !reserves) return;

      try {
        const amountParsed =
          amount === ""
            ? 0n
            : parseUnits(amount, formData.pool.token0.decimals);
        const [reserve0, reserve1] = reserves;

        // Calculate token B amount based on pool ratio
        const amountB =
          reserve0 > 0n
            ? quoteTokenAmount(amountParsed, reserve0, reserve1)
            : 0n;

        setFormData((prev) => ({
          ...prev,
          tokenA: {
            token: formData.pool!.token0,
            amount: amountParsed,
            amountFormatted: amount,
            balance: balanceA || 0n,
            balanceFormatted: formatUnits(
              balanceA || 0n,
              formData.pool!.token0.decimals
            ),
          },
          tokenB: {
            token: formData.pool!.token1,
            amount: amountB,
            amountFormatted: formatUnits(
              amountB,
              formData.pool!.token1.decimals
            ),
            balance: balanceB || 0n,
            balanceFormatted: formatUnits(
              balanceB || 0n,
              formData.pool!.token1.decimals
            ),
          },
        }));
      } catch (error) {
        console.error("Invalid amount input:", error);
      }
    },
    [formData.pool, reserves, balanceA, balanceB]
  );

  /**
   * Handle slippage change
   */
  const handleSlippageChange = useCallback((slippageBps: number) => {
    setFormData((prev) => ({ ...prev, slippageBps }));
  }, []);

  /**
   * Approve Token A
   */
  const approveTokenA = useCallback(async () => {
    if (!formData.tokenA || !address || !routerAddress) return;

    try {
      setAddLiquidityState(AddLiquidityState.APPROVING_A);
      const hash = await writeContractAsync({
        address: formData.tokenA.token.address,
        abi: erc20Abi,
        functionName: "approve",
        args: [routerAddress, formData.tokenA.amount],
      });
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for confirmation
    } catch (error: any) {
      setAddLiquidityState(AddLiquidityState.ERROR);
      setErrorMessage(error.message || "Approval failed");
    }
  }, [formData.tokenA, address, routerAddress, writeContractAsync]);

  /**
   * Approve Token B
   */
  const approveTokenB = useCallback(async () => {
    if (!formData.tokenB || !address || !routerAddress) return;

    try {
      setAddLiquidityState(AddLiquidityState.APPROVING_B);
      const hash = await writeContractAsync({
        address: formData.tokenB.token.address,
        abi: erc20Abi,
        functionName: "approve",
        args: [routerAddress, formData.tokenB.amount],
      });
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for confirmation
    } catch (error: any) {
      setAddLiquidityState(AddLiquidityState.ERROR);
      setErrorMessage(error.message || "Approval failed");
    }
  }, [formData.tokenB, address, routerAddress, writeContractAsync]);

  /**
   * Add liquidity
   */
  const addLiquidity = useCallback(async () => {
    if (
      !formData.pool ||
      !formData.tokenA ||
      !formData.tokenB ||
      !address ||
      !routerAddress
    )
      return;

    try {
      setAddLiquidityState(AddLiquidityState.ADDING);

      const amountAMin = calculateAmountMin(
        formData.tokenA.amount,
        formData.slippageBps
      );
      const amountBMin = calculateAmountMin(
        formData.tokenB.amount,
        formData.slippageBps
      );
      const deadline = calculateDeadline(formData.deadlineMinutes);

      const hash = await writeContractAsync({
        address: routerAddress,
        abi: ROUTER_ABI,
        functionName: "addLiquidity",
        args: [
          formData.pool.token0.address,
          formData.pool.token1.address,
          formData.tokenA.amount,
          formData.tokenB.amount,
          amountAMin,
          amountBMin,
          address,
          deadline,
        ],
      });

      setTxHash(hash);
    } catch (error: any) {
      setAddLiquidityState(AddLiquidityState.ERROR);
      setErrorMessage(error.message || "Transaction failed");
    }
  }, [formData, address, routerAddress, writeContractAsync]);

  /**
   * Main action handler (routes to appropriate function based on state)
   */
  const handleAction = useCallback(() => {
    if (addLiquidityState === AddLiquidityState.NEEDS_APPROVAL_A) {
      approveTokenA();
    } else if (addLiquidityState === AddLiquidityState.NEEDS_APPROVAL_B) {
      approveTokenB();
    } else if (addLiquidityState === AddLiquidityState.READY) {
      addLiquidity();
    }
  }, [addLiquidityState, approveTokenA, approveTokenB, addLiquidity]);

  // ========== Computed Values ==========

  /**
   * Liquidity preview (LP tokens, pool share, price ratios)
   */
  const preview = useMemo((): LiquidityPreview | null => {
    if (!formData.tokenA || !formData.tokenB || !reserves || !totalSupply)
      return null;

    const [reserve0, reserve1] = reserves;
    const isFirstLP = totalSupply === 0n;

    const lpTokens = isFirstLP
      ? calculateFirstLiquidity(formData.tokenA.amount, formData.tokenB.amount)
      : calculateSubsequentLiquidity(
          formData.tokenA.amount,
          formData.tokenB.amount,
          reserve0,
          reserve1,
          totalSupply
        );

    const shareOfPool = calculatePoolShare(lpTokens, totalSupply);
    const priceToken0 = formatPriceRatio(
      reserve0,
      reserve1,
      formData.pool!.token0.decimals,
      formData.pool!.token1.decimals
    );
    const priceToken1 = formatPriceRatio(
      reserve1,
      reserve0,
      formData.pool!.token1.decimals,
      formData.pool!.token0.decimals
    );

    return {
      lpTokens,
      lpTokensFormatted: formatUnits(lpTokens, 18), // LP tokens are always 18 decimals
      shareOfPool,
      priceToken0,
      priceToken1,
      amountAMin: calculateAmountMin(
        formData.tokenA.amount,
        formData.slippageBps
      ),
      amountBMin: calculateAmountMin(
        formData.tokenB.amount,
        formData.slippageBps
      ),
    };
  }, [formData, reserves, totalSupply]);

  /**
   * Input validation
   */
  const validation = useMemo((): ValidationResult => {
    if (!formData.pool) {
      return { isValid: false, error: VALIDATION_MESSAGES.NO_POOL_SELECTED };
    }

    if (!formData.tokenA || formData.tokenA.amount === 0n) {
      return { isValid: false, error: VALIDATION_MESSAGES.AMOUNT_ZERO };
    }

    if (formData.tokenA.amount > (balanceA || 0n)) {
      return {
        isValid: false,
        error: VALIDATION_MESSAGES.INSUFFICIENT_BALANCE_A,
      };
    }

    if (formData.tokenB && formData.tokenB.amount > (balanceB || 0n)) {
      return {
        isValid: false,
        error: VALIDATION_MESSAGES.INSUFFICIENT_BALANCE_B,
      };
    }

    return { isValid: true };
  }, [formData, balanceA, balanceB]);

  // ========== Side Effects ==========

  /**
   * Update state based on approval status
   */
  useEffect(() => {
    if (!formData.tokenA || !formData.tokenB || !validation.isValid) {
      setAddLiquidityState(AddLiquidityState.IDLE);
      return;
    }

    const needsApprovalA = (allowanceA || 0n) < formData.tokenA.amount;
    const needsApprovalB = (allowanceB || 0n) < formData.tokenB.amount;

    if (needsApprovalA) {
      setAddLiquidityState(AddLiquidityState.NEEDS_APPROVAL_A);
    } else if (needsApprovalB) {
      setAddLiquidityState(AddLiquidityState.NEEDS_APPROVAL_B);
    } else {
      setAddLiquidityState(AddLiquidityState.READY);
    }
  }, [formData, allowanceA, allowanceB, validation.isValid]);

  /**
   * Handle transaction success
   */
  useEffect(() => {
    if (isTxSuccess) {
      setAddLiquidityState(AddLiquidityState.SUCCESS);
      // Reset form after 3 seconds
      setTimeout(() => {
        setFormData((prev) => ({ ...prev, tokenA: null, tokenB: null }));
        setAddLiquidityState(AddLiquidityState.IDLE);
      }, 3000);
    }
  }, [isTxSuccess]);

  return {
    // Form data
    formData,
    // Actions
    handlePoolSelect,
    handleTokenAChange,
    handleSlippageChange,
    handleAction,
    // Computed
    preview,
    validation,
    // State
    addLiquidityState,
    errorMessage,
  };
};
