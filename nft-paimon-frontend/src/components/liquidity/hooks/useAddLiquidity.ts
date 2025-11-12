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
  PoolType,
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
 * Factory ABI (minimal)
 */
const FACTORY_ABI = [
  {
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
    ],
    name: "getPair",
    outputs: [{ name: "pair", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
    ],
    name: "createPair",
    outputs: [{ name: "pair", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

/**
 * Router ABI (minimal)
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
 * useAddLiquidity Hook (Refactored)
 * Supports dynamic token pair selection and automatic pool creation
 *
 * Flow:
 * 1. User selects Token A and Token B
 * 2. Query Factory.getPair(tokenA, tokenB)
 * 3. If pair exists (address !== 0x0000...0000):
 *    - Fetch reserves and proceed to add liquidity
 * 4. If pair does not exist:
 *    - Show "Create Pool" button
 *    - User clicks → Call Factory.createPair()
 *    - After creation, proceed to add liquidity
 */
export const useAddLiquidity = () => {
  const { address } = useAccount();
  const routerAddress = config.dex.router as `0x${string}` | undefined;
  const factoryAddress = config.dex.factory as `0x${string}` | undefined;
  const { writeContractAsync } = useWriteContract();

  // ========== State ==========
  const [formData, setFormData] = useState<AddLiquidityFormData>({
    selectedTokenA: null,
    selectedTokenB: null,
    pairAddress: null,
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

  // ========== Query Pair Address from Factory ==========
  const { data: pairAddressFromFactory, refetch: refetchPairAddress } = useReadContract({
    address: factoryAddress,
    abi: FACTORY_ABI,
    functionName: "getPair",
    args:
      formData.selectedTokenA && formData.selectedTokenB
        ? [formData.selectedTokenA.address, formData.selectedTokenB.address]
        : undefined,
    query: {
      enabled: !!factoryAddress && !!formData.selectedTokenA && !!formData.selectedTokenB,
    },
  });

  // Check if pool exists (address !== 0x0000...0000)
  const poolExists =
    pairAddressFromFactory && pairAddressFromFactory !== ("0x0000000000000000000000000000000000000000" as `0x${string}`);

  // ========== Token Balance Queries ==========
  const { data: balanceA } = useReadContract({
    address: formData.selectedTokenA?.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!formData.selectedTokenA },
  });

  const { data: balanceB } = useReadContract({
    address: formData.selectedTokenB?.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!formData.selectedTokenB },
  });

  // ========== Allowance Queries ==========
  const { data: allowanceA } = useReadContract({
    address: formData.selectedTokenA?.address,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && routerAddress ? [address, routerAddress] : undefined,
    query: { enabled: !!address && !!formData.selectedTokenA && !!routerAddress },
  });

  const { data: allowanceB } = useReadContract({
    address: formData.selectedTokenB?.address,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && routerAddress ? [address, routerAddress] : undefined,
    query: { enabled: !!address && !!formData.selectedTokenB && !!routerAddress },
  });

  // ========== Pool Reserve Queries (only if pool exists) ==========
  const { data: reserves } = useReadContract({
    address: pairAddressFromFactory,
    abi: PAIR_ABI,
    functionName: "getReserves",
    query: { enabled: !!poolExists, refetchInterval: 10000 },
  });

  const { data: totalSupply } = useReadContract({
    address: pairAddressFromFactory,
    abi: PAIR_ABI,
    functionName: "totalSupply",
    query: { enabled: !!poolExists, refetchInterval: 10000 },
  });

  // ========== Transaction Receipt ==========
  const { isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // ========== Handlers ==========

  /**
   * Handle token A selection
   */
  const handleTokenASelect = useCallback((token: Token) => {
    setFormData((prev) => ({
      ...prev,
      selectedTokenA: token,
      tokenA: null, // Reset amount
      tokenB: null,
      pairAddress: null,
      pool: null,
    }));
    setAddLiquidityState(AddLiquidityState.IDLE);
  }, []);

  /**
   * Handle token B selection
   */
  const handleTokenBSelect = useCallback((token: Token) => {
    setFormData((prev) => ({
      ...prev,
      selectedTokenB: token,
      tokenA: null, // Reset amount
      tokenB: null,
      pairAddress: null,
      pool: null,
    }));
    setAddLiquidityState(AddLiquidityState.IDLE);
  }, []);

  /**
   * Handle token A amount change
   */
  const handleTokenAChange = useCallback(
    (amount: string) => {
      if (!formData.selectedTokenA || !formData.selectedTokenB || !poolExists || !reserves) return;

      try {
        // Clean input: remove trailing dot and leading zeros
        let cleanAmount = amount.trim();
        if (cleanAmount.endsWith('.')) {
          cleanAmount = cleanAmount.slice(0, -1);
        }
        if (cleanAmount === '' || cleanAmount === '.') {
          cleanAmount = '0';
        }

        const amountParsed =
          cleanAmount === "" || cleanAmount === "0"
            ? 0n
            : parseUnits(cleanAmount, formData.selectedTokenA.decimals);
        const [reserve0, reserve1] = reserves;

        // Calculate token B amount based on pool ratio
        const amountB =
          reserve0 > 0n
            ? quoteTokenAmount(amountParsed, reserve0, reserve1)
            : 0n;

        setFormData((prev) => ({
          ...prev,
          tokenA: {
            token: formData.selectedTokenA!,
            amount: amountParsed,
            amountFormatted: amount,
            balance: balanceA || 0n,
            balanceFormatted: formatUnits(
              balanceA || 0n,
              formData.selectedTokenA!.decimals
            ),
          },
          tokenB: {
            token: formData.selectedTokenB!,
            amount: amountB,
            amountFormatted: formatUnits(
              amountB,
              formData.selectedTokenB!.decimals
            ),
            balance: balanceB || 0n,
            balanceFormatted: formatUnits(
              balanceB || 0n,
              formData.selectedTokenB!.decimals
            ),
          },
        }));
      } catch (error) {
        console.error("Invalid amount input:", error);
      }
    },
    [formData.selectedTokenA, formData.selectedTokenB, poolExists, reserves, balanceA, balanceB]
  );

  /**
   * Handle slippage change
   */
  const handleSlippageChange = useCallback((slippageBps: number) => {
    setFormData((prev) => ({ ...prev, slippageBps }));
  }, []);

  /**
   * Create new pool
   */
  const createPool = useCallback(async () => {
    if (!formData.selectedTokenA || !formData.selectedTokenB || !factoryAddress) return;

    try {
      setAddLiquidityState(AddLiquidityState.CREATING_POOL);
      const hash = await writeContractAsync({
        address: factoryAddress,
        abi: FACTORY_ABI,
        functionName: "createPair",
        args: [formData.selectedTokenA.address, formData.selectedTokenB.address],
      });

      // Wait for transaction confirmation
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Refetch pair address
      await refetchPairAddress();

      setAddLiquidityState(AddLiquidityState.IDLE);
    } catch (error: any) {
      setAddLiquidityState(AddLiquidityState.ERROR);
      setErrorMessage(error.message || "Pool creation failed");
    }
  }, [formData.selectedTokenA, formData.selectedTokenB, factoryAddress, writeContractAsync, refetchPairAddress]);

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
      await new Promise((resolve) => setTimeout(resolve, 2000));
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
      await new Promise((resolve) => setTimeout(resolve, 2000));
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
      !formData.selectedTokenA ||
      !formData.selectedTokenB ||
      !formData.tokenA ||
      !formData.tokenB ||
      !address ||
      !routerAddress ||
      !reserves
    )
      return;

    try {
      setAddLiquidityState(AddLiquidityState.ADDING);

      const [reserve0, reserve1] = reserves;
      const isNewPool = reserve0 === 0n && reserve1 === 0n;

      const amountAMin = isNewPool
        ? 0n
        : calculateAmountMin(formData.tokenA.amount, formData.slippageBps);
      const amountBMin = isNewPool
        ? 0n
        : calculateAmountMin(formData.tokenB.amount, formData.slippageBps);

      const deadline = calculateDeadline(formData.deadlineMinutes);

      const hash = await writeContractAsync({
        address: routerAddress,
        abi: ROUTER_ABI,
        functionName: "addLiquidity",
        args: [
          formData.selectedTokenA.address,
          formData.selectedTokenB.address,
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
  }, [formData, address, routerAddress, reserves, writeContractAsync]);

  /**
   * Main action handler
   */
  const handleAction = useCallback(() => {
    if (addLiquidityState === AddLiquidityState.POOL_NOT_EXIST) {
      createPool();
    } else if (addLiquidityState === AddLiquidityState.NEEDS_APPROVAL_A) {
      approveTokenA();
    } else if (addLiquidityState === AddLiquidityState.NEEDS_APPROVAL_B) {
      approveTokenB();
    } else if (addLiquidityState === AddLiquidityState.READY) {
      addLiquidity();
    }
  }, [addLiquidityState, createPool, approveTokenA, approveTokenB, addLiquidity]);

  // ========== Computed Values ==========

  /**
   * Liquidity preview
   */
  const preview = useMemo((): LiquidityPreview | null => {
    if (!formData.tokenA || !formData.tokenB || !reserves || !totalSupply || !formData.selectedTokenA || !formData.selectedTokenB)
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
      formData.selectedTokenA.decimals,
      formData.selectedTokenB.decimals
    );
    const priceToken1 = formatPriceRatio(
      reserve1,
      reserve0,
      formData.selectedTokenB.decimals,
      formData.selectedTokenA.decimals
    );

    return {
      lpTokens,
      lpTokensFormatted: formatUnits(lpTokens, 18),
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
    if (!formData.selectedTokenA || !formData.selectedTokenB) {
      return { isValid: false, error: "Please select both tokens" };
    }

    if (!poolExists) {
      return { isValid: true }; // Allow showing "Create Pool" button
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
  }, [formData, poolExists, balanceA, balanceB]);

  // ========== Side Effects ==========

  /**
   * Update pair address when factory returns result
   */
  useEffect(() => {
    if (pairAddressFromFactory) {
      // Determine token0/token1 order (Uniswap V2 sorts by address)
      let token0: Token | undefined;
      let token1: Token | undefined;
      let reserve0: bigint | undefined;
      let reserve1: bigint | undefined;

      if (formData.selectedTokenA && formData.selectedTokenB) {
        const isToken0 = formData.selectedTokenA.address.toLowerCase() < formData.selectedTokenB.address.toLowerCase();
        if (isToken0) {
          token0 = formData.selectedTokenA;
          token1 = formData.selectedTokenB;
          reserve0 = reserves ? reserves[0] : 0n;
          reserve1 = reserves ? reserves[1] : 0n;
        } else {
          token0 = formData.selectedTokenB;
          token1 = formData.selectedTokenA;
          reserve0 = reserves ? reserves[1] : 0n; // Swapped!
          reserve1 = reserves ? reserves[0] : 0n; // Swapped!
        }
      }

      setFormData((prev) => ({
        ...prev,
        pairAddress: pairAddressFromFactory,
        pool: poolExists && token0 && token1 && reserve0 !== undefined && reserve1 !== undefined
          ? {
              address: pairAddressFromFactory,
              token0,
              token1,
              type: PoolType.VOLATILE, // Default to volatile
              reserve0,
              reserve1,
              totalSupply: totalSupply || 0n,
              name: `${formData.selectedTokenA!.symbol}/${formData.selectedTokenB!.symbol}`,
            }
          : null,
      }));

      // Set state based on pool existence
      if (!poolExists && formData.selectedTokenA && formData.selectedTokenB) {
        setAddLiquidityState(AddLiquidityState.POOL_NOT_EXIST);
      } else {
        setAddLiquidityState(AddLiquidityState.IDLE);
      }
    }
  }, [pairAddressFromFactory, poolExists, formData.selectedTokenA, formData.selectedTokenB, reserves, totalSupply]);

  /**
   * Update state based on approval status
   */
  useEffect(() => {
    if (!formData.tokenA || !formData.tokenB || !validation.isValid || !poolExists) {
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
  }, [formData, allowanceA, allowanceB, validation.isValid, poolExists]);

  /**
   * Handle transaction success
   */
  useEffect(() => {
    if (isTxSuccess) {
      setAddLiquidityState(AddLiquidityState.SUCCESS);
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
    handleTokenASelect,
    handleTokenBSelect,
    handleTokenAChange,
    handleSlippageChange,
    handleAction,
    // Computed
    preview,
    validation,
    poolExists,
    // State
    addLiquidityState,
    errorMessage,
  };
};
