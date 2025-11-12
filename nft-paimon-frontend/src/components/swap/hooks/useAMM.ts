'use client';

import { useState, useMemo, useEffect } from 'react';
import { formatUnits } from 'viem';
import { useAMMSwap, type TokenConfig, SwapState as AMMSwapState } from '@/hooks/useAMMSwap';
import { SwapFormData, Token, TokenBalance, SwapState } from '../types';
import { config } from '@/config';

/**
 * Convert AMM SwapState to component SwapState
 */
function convertSwapState(ammState: AMMSwapState): SwapState {
  switch (ammState) {
    case AMMSwapState.IDLE:
      return SwapState.IDLE;
    case AMMSwapState.CALCULATING:
      return SwapState.INPUT; // Map CALCULATING to INPUT (closest equivalent)
    case AMMSwapState.APPROVING:
      return SwapState.APPROVING;
    case AMMSwapState.APPROVED:
      return SwapState.APPROVED;
    case AMMSwapState.SWAPPING:
      return SwapState.SWAPPING;
    case AMMSwapState.SUCCESS:
      return SwapState.SUCCESS;
    case AMMSwapState.ERROR:
      return SwapState.ERROR;
  }
}

/**
 * useAMM Hook
 * Wrapper for useAMMSwap that matches usePSMSwap interface
 *
 * Provides unified interface for SwapCard component:
 * - Manages form state (inputToken, outputToken, amounts)
 * - Converts Token enum to TokenConfig
 * - Adapts AMM-specific returns to match PSM interface
 */
export const useAMM = () => {
  // Form state (default: USDP → USDC - most common swap pair)
  const [formData, setFormData] = useState<SwapFormData>({
    inputAmount: '',
    outputAmount: '',
    inputToken: Token.USDP,
    outputToken: Token.USDC,
  });

  // Convert Token enum to TokenConfig for useAMMSwap
  const inputTokenConfig: TokenConfig = useMemo(() => {
    const tokenInfo = Object.values(config.tokenConfig).find(
      (t) => t.symbol === formData.inputToken
    );
    if (!tokenInfo) throw new Error(`Token not found: ${formData.inputToken}`);

    return {
      symbol: tokenInfo.symbol,
      address: tokenInfo.address,
      decimals: tokenInfo.decimals,
    };
  }, [formData.inputToken]);

  const outputTokenConfig: TokenConfig = useMemo(() => {
    const tokenInfo = Object.values(config.tokenConfig).find(
      (t) => t.symbol === formData.outputToken
    );
    if (!tokenInfo) throw new Error(`Token not found: ${formData.outputToken}`);

    return {
      symbol: tokenInfo.symbol,
      address: tokenInfo.address,
      decimals: tokenInfo.decimals,
    };
  }, [formData.outputToken]);

  // Call the underlying AMM hook
  const ammHook = useAMMSwap(
    inputTokenConfig,
    outputTokenConfig,
    50, // MEDIUM slippage (0.5%)
    20  // 20 minutes deadline
  );

  // Handle input amount change
  const handleInputAmountChange = (value: string) => {
    setFormData((prev) => ({ ...prev, inputAmount: value }));
    ammHook.setInputAmount(value);
  };

  // Handle switch tokens
  const handleSwitchTokens = () => {
    setFormData((prev) => ({
      ...prev,
      inputToken: prev.outputToken,
      outputToken: prev.inputToken,
      inputAmount: prev.outputAmount,
      outputAmount: prev.inputAmount,
    }));
  };

  // Handle max button click
  const handleMaxClick = () => {
    if (ammHook.inputBalance) {
      const maxAmount = ammHook.inputBalance.formatted;
      setFormData((prev) => ({ ...prev, inputAmount: maxAmount }));
      ammHook.setInputAmount(maxAmount);
    }
  };

  // Handle swap execution
  const handleSwap = async () => {
    await ammHook.handleSwap();
  };

  // Sync output amount from calculation
  useMemo(() => {
    if (ammHook.calculation) {
      const outputAmount = formatUnits(
        ammHook.calculation.amountOut,
        outputTokenConfig.decimals
      );
      setFormData((prev) => ({ ...prev, outputAmount }));
    } else {
      setFormData((prev) => ({ ...prev, outputAmount: '' }));
    }
  }, [ammHook.calculation, outputTokenConfig.decimals]);

  // Reset form on successful swap
  useEffect(() => {
    if (ammHook.swapState === AMMSwapState.SUCCESS) {
      setFormData((prev) => ({
        ...prev,
        inputAmount: '',
        outputAmount: '',
      }));
    }
  }, [ammHook.swapState]);

  // Adapt calculation to match PSM interface
  const calculation = useMemo(() => {
    if (!ammHook.calculation) return null;

    // Format fee with decimals
    const feeFormatted = `${(Number(ammHook.calculation.fee) / Math.pow(10, inputTokenConfig.decimals)).toFixed(6)} ${inputTokenConfig.symbol}`;

    return {
      inputAmount: ammHook.calculation.amountIn,
      outputAmount: ammHook.calculation.amountOut,
      fee: ammHook.calculation.fee,
      feeFormatted,
      feePercentage: ammHook.calculation.feePercentage.toString() + '%',
      priceImpact: ammHook.calculation.priceImpact.toString() + '%',
      exchangeRate: '1', // Not directly available, approximate
    };
  }, [ammHook.calculation, inputTokenConfig]);

  // Adapt validation to match PSM interface
  const validation = useMemo(() => {
    return ammHook.validation;
  }, [ammHook.validation]);

  // Return unified interface matching usePSMSwap
  return {
    formData,
    setFormData,
    inputBalance: ammHook.inputBalance as TokenBalance | undefined,
    outputBalance: ammHook.outputBalance as TokenBalance | undefined,
    calculation,
    validation,
    swapState: convertSwapState(ammHook.swapState),
    errorMessage: ammHook.error || undefined,
    handleInputAmountChange,
    handleSwitchTokens,
    handleMaxClick,
    handleSwap,
    route: ammHook.route, // AMM-specific: route array
    needsApproval: ammHook.needsApproval, // AMM-specific: approval check
  };
};
