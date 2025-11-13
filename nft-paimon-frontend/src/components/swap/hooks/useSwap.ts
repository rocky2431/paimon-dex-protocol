'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAccount, useBalance, useReadContract, useWriteContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import {
  Token,
  SwapState,
  SwapFormData,
  SwapCalculation,
  SwapValidation,
  TokenBalance,
} from '../types';
import {
  TOKEN_CONFIG,
  CONTRACT_ADDRESSES,
  SWAP_CONFIG,
  MESSAGES,
} from '../constants';

// PSM ABI (simplified for swap functionality)
const PSM_ABI = [
  {
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'minAmountOut', type: 'uint256' },
    ],
    name: 'swap',
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// ERC20 ABI (for approve)
const ERC20_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const useSwap = () => {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // Form state
  const [formData, setFormData] = useState<SwapFormData>({
    inputAmount: '',
    outputAmount: '',
    inputToken: "usdc" as Token,
    outputToken: "usdp" as Token,
  });

  // Swap state
  const [swapState, setSwapState] = useState<SwapState>(SwapState.IDLE);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Get token balances
  const { data: inputBalance } = useBalance({
    address,
    token: TOKEN_CONFIG[formData.inputToken].address,
  });

  const { data: outputBalance } = useBalance({
    address,
    token: TOKEN_CONFIG[formData.outputToken].address,
  });

  // Check allowance
  const { data: allowance } = useReadContract({
    address: TOKEN_CONFIG[formData.inputToken].address,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACT_ADDRESSES.PSM] : undefined,
  });

  // Calculate swap output
  const calculation = useMemo((): SwapCalculation | null => {
    if (!formData.inputAmount || formData.inputAmount === '0') {
      return null;
    }

    try {
      const inputToken = TOKEN_CONFIG[formData.inputToken];
      const outputToken = TOKEN_CONFIG[formData.outputToken];

      const inputAmountBigInt = parseUnits(
        formData.inputAmount,
        inputToken.decimals
      );

      // PSM 1:1 swap with 0.1% fee, considering decimals difference
      // USDC (6 decimals) ↔ USDP (18 decimals) requires SCALE = 10^12
      const isUSDCtoUSDP = formData.inputToken === "usdc";

      let outputAmountBigInt: bigint;
      let feeBigInt: bigint;

      if (isUSDCtoUSDP) {
        // USDC → USDP: scale up then apply fee
        // output = (input * SCALE * (10000 - 10)) / 10000
        outputAmountBigInt =
          (inputAmountBigInt * SWAP_CONFIG.SCALE * (SWAP_CONFIG.BPS_DIVISOR - SWAP_CONFIG.FEE_BPS)) /
          SWAP_CONFIG.BPS_DIVISOR;
        feeBigInt =
          (inputAmountBigInt * SWAP_CONFIG.SCALE * SWAP_CONFIG.FEE_BPS) / SWAP_CONFIG.BPS_DIVISOR;
      } else {
        // USDP → USDC: apply fee then scale down
        // output = (input * (10000 - 10)) / (10000 * SCALE)
        outputAmountBigInt =
          (inputAmountBigInt * (SWAP_CONFIG.BPS_DIVISOR - SWAP_CONFIG.FEE_BPS)) /
          (SWAP_CONFIG.BPS_DIVISOR * SWAP_CONFIG.SCALE);
        feeBigInt =
          (inputAmountBigInt * SWAP_CONFIG.FEE_BPS) / (SWAP_CONFIG.BPS_DIVISOR * SWAP_CONFIG.SCALE);
      }

      // Format exchange rate
      const exchangeRate = `1 ${inputToken.symbol} = ${(
        Number(SWAP_CONFIG.BPS_DIVISOR - SWAP_CONFIG.FEE_BPS) /
        Number(SWAP_CONFIG.BPS_DIVISOR)
      ).toFixed(4)} ${outputToken.symbol}`;

      // Format fee with correct decimals
      // IMPORTANT: Fee is calculated AFTER scaling, so it's in output token decimals
      const feeFormatted = `${formatUnits(feeBigInt, outputToken.decimals)} ${outputToken.symbol}`;

      return {
        inputAmount: inputAmountBigInt,
        outputAmount: outputAmountBigInt,
        fee: feeBigInt,
        feeFormatted,
        feePercentage: SWAP_CONFIG.FEE_PERCENTAGE,
        priceImpact: '0.00', // PSM has no price impact
        exchangeRate,
      };
    } catch (error) {
      return null;
    }
  }, [formData.inputAmount, formData.inputToken, formData.outputToken]);

  // Validate swap
  const validation = useMemo((): SwapValidation => {
    if (!isConnected) {
      return { isValid: false, error: MESSAGES.CONNECT_WALLET };
    }

    if (!formData.inputAmount || formData.inputAmount === '0') {
      return { isValid: false, error: MESSAGES.INVALID_AMOUNT };
    }

    if (!calculation) {
      return { isValid: false, error: MESSAGES.INVALID_AMOUNT };
    }

    if (inputBalance && calculation.inputAmount > inputBalance.value) {
      return { isValid: false, error: MESSAGES.INSUFFICIENT_BALANCE };
    }

    return { isValid: true };
  }, [isConnected, formData.inputAmount, calculation, inputBalance]);

  // Update input amount
  const handleInputAmountChange = useCallback((amount: string) => {
    setSwapState(SwapState.INPUT);

    // Calculate output and update both amounts
    setFormData((prev) => {
      if (!amount || amount === '0') {
        return { ...prev, inputAmount: amount, outputAmount: '' };
      }

      try {
        const inputToken = TOKEN_CONFIG[prev.inputToken];
        const outputToken = TOKEN_CONFIG[prev.outputToken];
        const inputAmountBigInt = parseUnits(amount, inputToken.decimals);

        // Apply SCALE for USDC↔USDP conversion
        const isUSDCtoUSDP = prev.inputToken === "usdc";
        const outputAmountBigInt = isUSDCtoUSDP
          ? (inputAmountBigInt * SWAP_CONFIG.SCALE * (SWAP_CONFIG.BPS_DIVISOR - SWAP_CONFIG.FEE_BPS)) / SWAP_CONFIG.BPS_DIVISOR
          : (inputAmountBigInt * (SWAP_CONFIG.BPS_DIVISOR - SWAP_CONFIG.FEE_BPS)) / (SWAP_CONFIG.BPS_DIVISOR * SWAP_CONFIG.SCALE);

        const outputAmount = formatUnits(
          outputAmountBigInt,
          outputToken.decimals
        );
        return { ...prev, inputAmount: amount, outputAmount };
      } catch (error) {
        return { ...prev, inputAmount: amount, outputAmount: '' };
      }
    });
  }, []);

  // Switch tokens
  const handleSwitchTokens = useCallback(() => {
    setFormData((prev) => ({
      inputAmount: prev.outputAmount,
      outputAmount: prev.inputAmount,
      inputToken: prev.outputToken,
      outputToken: prev.inputToken,
    }));
  }, []);

  // Set max amount
  const handleMaxClick = useCallback(() => {
    if (inputBalance) {
      const maxAmount = formatUnits(
        inputBalance.value,
        inputBalance.decimals
      );
      handleInputAmountChange(maxAmount);
    }
  }, [inputBalance, handleInputAmountChange]);

  // Approve token
  const handleApprove = useCallback(async () => {
    if (!address || !calculation) return;

    try {
      setSwapState(SwapState.APPROVING);

      await writeContractAsync({
        address: TOKEN_CONFIG[formData.inputToken].address,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESSES.PSM, calculation.inputAmount],
      });

      setSwapState(SwapState.APPROVED);
    } catch (error) {
      console.error('Approval error:', error);
      setSwapState(SwapState.ERROR);
      setErrorMessage(MESSAGES.APPROVAL_ERROR);
    }
  }, [address, calculation, formData.inputToken, writeContractAsync]);

  // Execute swap
  const handleSwap = useCallback(async () => {
    if (!address || !calculation || !validation.isValid) return;

    try {
      // Check if approval needed
      if (!allowance || allowance < calculation.inputAmount) {
        await handleApprove();
        return;
      }

      setSwapState(SwapState.SWAPPING);

      // Execute swap (minAmountOut = 0 for now, can add slippage later)
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.PSM,
        abi: PSM_ABI,
        functionName: 'swap',
        args: [calculation.inputAmount, BigInt(0)],
      });

      setSwapState(SwapState.SUCCESS);
      setFormData({
        inputAmount: '',
        outputAmount: '',
        inputToken: formData.inputToken,
        outputToken: formData.outputToken,
      });

      // Reset state after 3 seconds
      setTimeout(() => {
        setSwapState(SwapState.IDLE);
      }, 3000);
    } catch (error) {
      console.error('Swap error:', error);
      setSwapState(SwapState.ERROR);
      setErrorMessage(MESSAGES.SWAP_ERROR);
    }
  }, [
    address,
    calculation,
    validation,
    allowance,
    formData.inputToken,
    formData.outputToken,
    handleApprove,
    writeContractAsync,
  ]);

  return {
    // Form data
    formData,
    setFormData,

    // Balances
    inputBalance: inputBalance as TokenBalance | undefined,
    outputBalance: outputBalance as TokenBalance | undefined,

    // Calculation
    calculation,
    validation,

    // State
    swapState,
    errorMessage,

    // Actions
    handleInputAmountChange,
    handleSwitchTokens,
    handleMaxClick,
    handleSwap,
  };
};
