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

  // Check if pair address exists (step 1)
  const pairAddressExists =
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
  const { data: allowanceA, refetch: refetchAllowanceA } = useReadContract({
    address: formData.selectedTokenA?.address,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && routerAddress ? [address, routerAddress] : undefined,
    query: { enabled: !!address && !!formData.selectedTokenA && !!routerAddress },
  });

  const { data: allowanceB, refetch: refetchAllowanceB } = useReadContract({
    address: formData.selectedTokenB?.address,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && routerAddress ? [address, routerAddress] : undefined,
    query: { enabled: !!address && !!formData.selectedTokenB && !!routerAddress },
  });

  // ========== Pool Reserve Queries (only if pair address exists) ==========
  const { data: reserves } = useReadContract({
    address: pairAddressFromFactory,
    abi: PAIR_ABI,
    functionName: "getReserves",
    query: { enabled: !!pairAddressExists, refetchInterval: 10000 },
  });

  const { data: totalSupply } = useReadContract({
    address: pairAddressFromFactory,
    abi: PAIR_ABI,
    functionName: "totalSupply",
    query: { enabled: !!pairAddressExists, refetchInterval: 10000 },
  });

  // Check if pool exists (step 2): address exists AND has liquidity
  // A pool with zero reserves should be treated as "new pool" (allows free input)
  const poolExists = pairAddressExists && reserves && (reserves[0] > 0n || reserves[1] > 0n);

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
   * Helper: Clean formatted amount - remove leading zeros but keep decimal values
   */
  const cleanFormattedAmount = (formatted: string): string => {
    if (!formatted || formatted === '0' || formatted === '0.0') return formatted;

    // Parse to number and back to string to remove leading zeros
    const num = parseFloat(formatted);
    if (isNaN(num)) return formatted;

    // Format back to string, preserving decimals
    return num.toString();
  };

  /**
   * Handle token A amount change
   */
  const handleTokenAChange = useCallback(
    (amount: string) => {
      if (!formData.selectedTokenA || !formData.selectedTokenB) return;

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

        // For new pools (reserves = 0), allow free input - don't force ratio
        if (!poolExists || !reserves || reserves[0] === 0n || reserves[1] === 0n) {
          // Clean Token A formatted amount to remove leading zeros
          const tokenAFormatted = cleanFormattedAmount(cleanAmount);

          setFormData((prev) => ({
            ...prev,
            tokenA: {
              token: prev.selectedTokenA!,
              amount: amountParsed,
              amountFormatted: tokenAFormatted,  // Use cleaned format
              balance: balanceA || 0n,
              balanceFormatted: formatUnits(
                balanceA || 0n,
                prev.selectedTokenA!.decimals
              ),
            },
            // For new pools, initialize Token B with 0 (user will input freely)
            tokenB: {
              token: prev.selectedTokenB!,
              amount: 0n,
              amountFormatted: "",
              balance: balanceB || 0n,
              balanceFormatted: formatUnits(
                balanceB || 0n,
                prev.selectedTokenB!.decimals
              ),
            },
          }));
          return;
        }

        // For existing pools (reserves > 0), enforce ratio
        // Determine if selectedTokenA is token0 or token1 (Uniswap V2 sorts by address)
        const isTokenAToken0 = formData.selectedTokenA.address.toLowerCase() < formData.selectedTokenB.address.toLowerCase();

        // Map reserves correctly based on token order
        const reserveA = isTokenAToken0 ? reserves[0] : reserves[1];
        const reserveB = isTokenAToken0 ? reserves[1] : reserves[0];

        // Calculate token B amount based on pool ratio
        const amountB = quoteTokenAmount(amountParsed, reserveA, reserveB);

        // Clean Token B formatted amount to remove leading zeros
        const tokenBFormatted = cleanFormattedAmount(
          formatUnits(amountB, formData.selectedTokenB!.decimals)
        );

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
            amountFormatted: tokenBFormatted,  // Use cleaned format
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
   * Handle token B amount change (for new pools)
   */
  const handleTokenBChange = useCallback(
    (amount: string) => {
      if (!formData.selectedTokenA || !formData.selectedTokenB) return;

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
            : parseUnits(cleanAmount, formData.selectedTokenB.decimals);

        // Clean the formatted amount to remove leading zeros
        const formattedAmount = cleanFormattedAmount(cleanAmount);

        // Update Token B amount (Token A remains unchanged)
        setFormData((prev) => ({
          ...prev,
          tokenB: {
            token: prev.selectedTokenB!,
            amount: amountParsed,
            amountFormatted: formattedAmount,  // Use cleaned format
            balance: balanceB || 0n,
            balanceFormatted: formatUnits(
              balanceB || 0n,
              prev.selectedTokenB!.decimals
            ),
          },
        }));
      } catch (error) {
        console.error("Invalid amount input:", error);
      }
    },
    [formData.selectedTokenA, formData.selectedTokenB, balanceB]
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

      // Wait for transaction confirmation
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Refetch allowances to update state
      await refetchAllowanceA();

      // Reset state to IDLE
      setAddLiquidityState(AddLiquidityState.IDLE);
    } catch (error: any) {
      setAddLiquidityState(AddLiquidityState.ERROR);
      setErrorMessage(error.message || "Approval failed");
    }
  }, [formData.tokenA, address, routerAddress, writeContractAsync, refetchAllowanceA]);

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

      // Wait for transaction confirmation
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Refetch allowances to update state
      await refetchAllowanceB();

      // Reset state to IDLE
      setAddLiquidityState(AddLiquidityState.IDLE);
    } catch (error: any) {
      setAddLiquidityState(AddLiquidityState.ERROR);
      setErrorMessage(error.message || "Approval failed");
    }
  }, [formData.tokenB, address, routerAddress, writeContractAsync, refetchAllowanceB]);

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

      // Wait for transaction confirmation
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Reset state to IDLE (data will refetch automatically via refetchInterval)
      setAddLiquidityState(AddLiquidityState.IDLE);

      // Reset form amounts
      setFormData((prev) => ({
        ...prev,
        tokenA: null,
        tokenB: null,
      }));
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

    // Determine if selectedTokenA is token0 or token1 (Uniswap V2 sorts by address)
    const isTokenAToken0 = formData.selectedTokenA.address.toLowerCase() < formData.selectedTokenB.address.toLowerCase();

    // Map reserves correctly based on token order
    const reserveA = isTokenAToken0 ? reserves[0] : reserves[1];
    const reserveB = isTokenAToken0 ? reserves[1] : reserves[0];

    const isFirstLP = totalSupply === 0n;

    const lpTokens = isFirstLP
      ? calculateFirstLiquidity(formData.tokenA.amount, formData.tokenB.amount)
      : calculateSubsequentLiquidity(
          formData.tokenA.amount,
          formData.tokenB.amount,
          reserveA,
          reserveB,
          totalSupply
        );

    const shareOfPool = calculatePoolShare(lpTokens, totalSupply);
    const priceToken0 = formatPriceRatio(
      reserveA,
      reserveB,
      formData.selectedTokenA.decimals,
      formData.selectedTokenB.decimals
    );
    const priceToken1 = formatPriceRatio(
      reserveB,
      reserveA,
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

    // For pools that truly don't exist (no pair address), allow "Create Pool" button
    if (!pairAddressExists) {
      return { isValid: true }; // Allow showing "Create Pool" button
    }

    // For pools that exist (with or without reserves), validate amounts
    if (!formData.tokenA || formData.tokenA.amount === 0n) {
      return { isValid: false, error: VALIDATION_MESSAGES.AMOUNT_ZERO };
    }

    if (formData.tokenA.amount > (balanceA || 0n)) {
      return {
        isValid: false,
        error: VALIDATION_MESSAGES.INSUFFICIENT_BALANCE_A,
      };
    }

    // For new pools (reserves = 0), also validate Token B amount
    if (!poolExists && formData.tokenB) {
      if (formData.tokenB.amount === 0n) {
        return { isValid: false, error: "Please enter amount for both tokens" };
      }
      if (formData.tokenB.amount > (balanceB || 0n)) {
        return {
          isValid: false,
          error: VALIDATION_MESSAGES.INSUFFICIENT_BALANCE_B,
        };
      }
    }

    // For existing pools, tokenB is auto-calculated and validated here
    if (formData.tokenB && formData.tokenB.amount > (balanceB || 0n)) {
      return {
        isValid: false,
        error: VALIDATION_MESSAGES.INSUFFICIENT_BALANCE_B,
      };
    }

    return { isValid: true };
  }, [formData, poolExists, pairAddressExists, balanceA, balanceB]);

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
      // Only show "Create Pool" if pair address doesn't exist at all
      // If pair exists but has no reserves, show normal form (IDLE state)
      if (!pairAddressExists && formData.selectedTokenA && formData.selectedTokenB) {
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
    // Skip if validation failed or no pair address exists
    if (!formData.tokenA || !formData.tokenB || !validation.isValid || !pairAddressExists) {
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
  }, [formData, allowanceA, allowanceB, validation.isValid, pairAddressExists]);

  /**
   * Handle transaction success
   * Distinguishes between approval and addLiquidity transactions
   */
  useEffect(() => {
    if (isTxSuccess && txHash) {
      // Check if this was an approval transaction
      if (addLiquidityState === AddLiquidityState.APPROVING_A) {
        // Refetch allowance A and reset txHash
        refetchAllowanceA();
        setTxHash(undefined);
        // State will auto-update via the allowance monitoring useEffect
      } else if (addLiquidityState === AddLiquidityState.APPROVING_B) {
        // Refetch allowance B and reset txHash
        refetchAllowanceB();
        setTxHash(undefined);
        // State will auto-update via the allowance monitoring useEffect
      } else if (addLiquidityState === AddLiquidityState.ADDING) {
        // This was the final addLiquidity transaction
        setAddLiquidityState(AddLiquidityState.SUCCESS);
        setTimeout(() => {
          setFormData((prev) => ({ ...prev, tokenA: null, tokenB: null }));
          setAddLiquidityState(AddLiquidityState.IDLE);
          setTxHash(undefined);
        }, 3000);
      }
    }
  }, [isTxSuccess, txHash, addLiquidityState, refetchAllowanceA, refetchAllowanceB]);

  return {
    // Form data
    formData,
    // Actions
    handleTokenASelect,
    handleTokenBSelect,
    handleTokenAChange,
    handleTokenBChange,
    handleSlippageChange,
    handleAction,
    // Computed
    preview,
    validation,
    poolExists,
    pairAddressExists,  // Export for UI warnings
    // State
    addLiquidityState,
    errorMessage,
  };
};
