/**
 * useAMMSwap Hook
 * AMM交易hook - 支持DEX Router进行代币交换
 *
 * 功能:
 * - 路径计算 (单跳/多跳)
 * - 价格影响计算 (基于x*y=k)
 * - 滑点保护
 * - Deadline设置
 */

'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  useAccount,
  useBalance,
  useReadContract,
  useWriteContract,
  usePublicClient,
} from 'wagmi';
import { parseUnits, formatUnits, type Address } from 'viem';
import { DEX_ROUTER_ABI } from '@/config/contracts/abis/dexRouter';
import { PANCAKE_FACTORY_ABI } from '@/config/contracts/abis/dex';
import { ERC20_ABI } from '@/config/contracts/abis/external';
import { testnet } from '@/config/chains/testnet';

/**
 * Token configuration interface
 */
export interface TokenConfig {
  symbol: string;
  address: Address;
  decimals: number;
}

/**
 * Swap route (array of token addresses)
 */
export type SwapRoute = Address[];

/**
 * Swap state machine
 */
export enum SwapState {
  IDLE = 'idle',
  CALCULATING = 'calculating',
  APPROVING = 'approving',
  APPROVED = 'approved',
  SWAPPING = 'swapping',
  SUCCESS = 'success',
  ERROR = 'error',
}

/**
 * Swap calculation result
 */
export interface SwapCalculation {
  route: SwapRoute; // Token路径
  amountIn: bigint; // 输入金额
  amountOut: bigint; // 预期输出金额
  minAmountOut: bigint; // 最小输出金额 (含滑点保护)
  priceImpact: number; // 价格影响百分比
  fee: bigint; // 手续费
  feePercentage: number; // 手续费百分比
}

/**
 * Slippage tolerance (in basis points)
 * 50 = 0.5%, 100 = 1%, 500 = 5%
 */
export const SLIPPAGE_OPTIONS = {
  AUTO: 50, // 0.5%
  LOW: 10, // 0.1%
  MEDIUM: 50, // 0.5%
  HIGH: 100, // 1%
  VERY_HIGH: 500, // 5%
} as const;

const BPS_DIVISOR = 10000n; // 100% = 10000 basis points

/**
 * useAMMSwap Hook
 *
 * @param inputToken - 输入代币配置
 * @param outputToken - 输出代币配置
 * @param slippageBps - 滑点容忍度 (basis points)
 * @param deadlineMinutes - 交易截止时间 (分钟)
 */
export function useAMMSwap(
  inputToken: TokenConfig,
  outputToken: TokenConfig,
  slippageBps: number = SLIPPAGE_OPTIONS.MEDIUM,
  deadlineMinutes: number = 20
) {
  const { address: userAddress, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  // ==================== State ====================
  const [inputAmount, setInputAmount] = useState<string>('');
  const [swapState, setSwapState] = useState<SwapState>(SwapState.IDLE);
  const [error, setError] = useState<string | null>(null);

  // ==================== Balances ====================
  const { data: inputBalance } = useBalance({
    address: userAddress,
    token: inputToken.address,
  });

  const { data: outputBalance } = useBalance({
    address: userAddress,
    token: outputToken.address,
  });

  // ==================== Route Calculation ====================

  /**
   * Check if direct pair exists
   */
  const { data: directPairAddress } = useReadContract({
    address: testnet.dex.factory,
    abi: PANCAKE_FACTORY_ABI,
    functionName: 'getPair',
    args: [inputToken.address, outputToken.address],
    query: {
      enabled: !!inputToken && !!outputToken,
    },
  });

  /**
   * Calculate optimal route
   * 1. Check direct pair: inputToken -> outputToken
   * 2. If no direct pair, route through WBNB: inputToken -> WBNB -> outputToken
   */
  const route = useMemo((): SwapRoute | null => {
    if (!inputToken || !outputToken) return null;

    // Direct pair exists (not zero address)
    if (
      directPairAddress &&
      directPairAddress !== '0x0000000000000000000000000000000000000000'
    ) {
      return [inputToken.address, outputToken.address];
    }

    // Multi-hop through WBNB
    return [inputToken.address, testnet.tokens.wbnb, outputToken.address];
  }, [inputToken, outputToken, directPairAddress]);

  // ==================== Quote Calculation ====================

  /**
   * Get amounts out for given input amount
   */
  const inputAmountBigInt = useMemo(() => {
    if (!inputAmount || inputAmount === '0' || !inputToken) return null;
    try {
      return parseUnits(inputAmount, inputToken.decimals);
    } catch {
      return null;
    }
  }, [inputAmount, inputToken]);

  const { data: amountsOut } = useReadContract({
    address: testnet.dex.router,
    abi: DEX_ROUTER_ABI,
    functionName: 'getAmountsOut',
    args: inputAmountBigInt && route ? [inputAmountBigInt, route] : undefined,
    query: {
      enabled: !!inputAmountBigInt && !!route,
    },
  });

  /**
   * Calculate swap details
   */
  const calculation = useMemo((): SwapCalculation | null => {
    if (
      !inputAmountBigInt ||
      !route ||
      !amountsOut ||
      amountsOut.length === 0
    ) {
      return null;
    }

    const amountOut = amountsOut[amountsOut.length - 1]; // Last element is final output

    // Calculate minimum amount out with slippage protection
    // minAmountOut = amountOut * (10000 - slippageBps) / 10000
    const minAmountOut =
      (amountOut * (BPS_DIVISOR - BigInt(slippageBps))) / BPS_DIVISOR;

    // Calculate price impact
    // Price impact = (amountIn / amountOut - marketPrice) / marketPrice
    // For simplicity, approximate as: (expectedOut - actualOut) / expectedOut
    // This is rough estimation; real calculation requires reserves
    const priceImpact = 0.3; // Placeholder - will be calculated from reserves in next iteration

    // Calculate fee (0.3% DEX fee per hop)
    const feePercentage = route.length === 2 ? 0.3 : 0.6; // 0.3% per hop
    const feeBps = route.length === 2 ? 30 : 60; // 30 bps per hop
    const fee = (inputAmountBigInt * BigInt(feeBps)) / BPS_DIVISOR;

    return {
      route,
      amountIn: inputAmountBigInt,
      amountOut,
      minAmountOut,
      priceImpact,
      fee,
      feePercentage,
    };
  }, [inputAmountBigInt, route, amountsOut, slippageBps]);

  // ==================== Allowance Check ====================

  const { data: allowance } = useReadContract({
    address: inputToken.address,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: userAddress ? [userAddress, testnet.dex.router] : undefined,
    query: {
      enabled: !!userAddress && !!inputToken,
    },
  });

  const needsApproval = useMemo(() => {
    if (!calculation || !allowance) return false;
    return allowance < calculation.amountIn;
  }, [calculation, allowance]);

  // ==================== Validation ====================

  const validation = useMemo(() => {
    if (!isConnected) {
      return { isValid: false, error: 'Please connect wallet' };
    }

    if (!inputAmount || inputAmount === '0') {
      return { isValid: false, error: 'Enter an amount' };
    }

    if (!calculation) {
      return { isValid: false, error: 'Invalid amount' };
    }

    if (inputBalance && calculation.amountIn > inputBalance.value) {
      return { isValid: false, error: 'Insufficient balance' };
    }

    if (calculation.priceImpact > 15) {
      return {
        isValid: false,
        error: 'Price impact too high (>15%)',
      };
    }

    return { isValid: true };
  }, [isConnected, inputAmount, calculation, inputBalance]);

  // ==================== Actions ====================

  /**
   * Approve input token
   */
  const handleApprove = useCallback(async () => {
    if (!userAddress || !calculation) {
      throw new Error('Missing user address or calculation');
    }

    try {
      setSwapState(SwapState.APPROVING);
      setError(null);

      await writeContractAsync({
        address: inputToken.address,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [testnet.dex.router, calculation.amountIn],
      });

      setSwapState(SwapState.APPROVED);
    } catch (err) {
      console.error('Approval error:', err);
      setSwapState(SwapState.ERROR);
      setError('Approval failed. Please try again.');
      throw err;
    }
  }, [userAddress, calculation, inputToken, writeContractAsync]);

  /**
   * Execute swap
   */
  const handleSwap = useCallback(async () => {
    if (!userAddress || !calculation || !validation.isValid) {
      throw new Error('Invalid swap parameters');
    }

    try {
      // Check if approval needed first
      if (needsApproval) {
        await handleApprove();
        return; // Wait for user to click swap again after approval
      }

      setSwapState(SwapState.SWAPPING);
      setError(null);

      // Calculate deadline (current timestamp + deadlineMinutes)
      const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineMinutes * 60);

      // Execute swap with DEXRouter
      await writeContractAsync({
        address: testnet.dex.router,
        abi: DEX_ROUTER_ABI,
        functionName: 'swapExactTokensForTokens',
        args: [
          calculation.amountIn,
          calculation.minAmountOut,
          calculation.route,
          userAddress,
          deadline,
        ],
      });

      setSwapState(SwapState.SUCCESS);
      setInputAmount('');

      // Reset state after 3 seconds
      setTimeout(() => {
        setSwapState(SwapState.IDLE);
      }, 3000);
    } catch (err) {
      console.error('Swap error:', err);
      setSwapState(SwapState.ERROR);
      setError('Swap failed. Please try again.');
      throw err;
    }
  }, [
    userAddress,
    calculation,
    validation,
    needsApproval,
    handleApprove,
    deadlineMinutes,
    writeContractAsync,
  ]);

  /**
   * Set max input amount
   */
  const handleMaxClick = useCallback(() => {
    if (inputBalance) {
      const maxAmount = formatUnits(inputBalance.value, inputBalance.decimals);
      setInputAmount(maxAmount);
    }
  }, [inputBalance]);

  /**
   * Switch input and output tokens
   * Note: This should be handled by parent component by swapping token configs
   */
  const handleSwitchTokens = useCallback(() => {
    // This is a no-op in this hook
    // Parent component should swap inputToken and outputToken configs
    console.warn(
      'handleSwitchTokens called - parent component should swap token configs'
    );
  }, []);

  // ==================== Return API ====================

  return {
    // Input state
    inputAmount,
    setInputAmount,

    // Balances
    inputBalance: inputBalance
      ? {
          value: inputBalance.value,
          decimals: inputBalance.decimals,
          formatted: inputBalance.formatted,
          symbol: inputBalance.symbol,
        }
      : null,
    outputBalance: outputBalance
      ? {
          value: outputBalance.value,
          decimals: outputBalance.decimals,
          formatted: outputBalance.formatted,
          symbol: outputBalance.symbol,
        }
      : null,

    // Calculation
    calculation,
    validation,

    // Route info
    route,
    routeDisplay: route
      ? route.map((addr) => {
          if (addr === testnet.tokens.wbnb) return 'WBNB';
          if (addr === inputToken.address) return inputToken.symbol;
          if (addr === outputToken.address) return outputToken.symbol;
          return addr;
        })
      : null,

    // Approval
    needsApproval,
    allowance,

    // State
    swapState,
    error,
    isLoading:
      swapState === SwapState.CALCULATING ||
      swapState === SwapState.APPROVING ||
      swapState === SwapState.SWAPPING,

    // Actions
    handleSwap,
    handleApprove,
    handleMaxClick,
    handleSwitchTokens,
  };
}

/**
 * Helper: Format route for display
 */
export function formatRoute(route: SwapRoute): string {
  return route
    .map((addr, idx) => {
      // This is a placeholder - should use token registry
      if (addr === testnet.tokens.wbnb) return 'WBNB';
      return `Token${idx}`;
    })
    .join(' → ');
}

/**
 * Helper: Calculate price impact from reserves
 * TODO: Implement accurate price impact calculation using pair reserves
 */
export function calculatePriceImpact(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint
): number {
  // x * y = k formula
  // amountOut = (amountIn * reserveOut) / (reserveIn + amountIn)
  // priceImpact = (idealOut - actualOut) / idealOut * 100

  const amountInWithFee = (amountIn * 997n) / 1000n; // 0.3% fee
  const amountOut =
    (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee);

  // Ideal rate = reserveOut / reserveIn
  const idealOut = (amountIn * reserveOut) / reserveIn;

  if (idealOut === 0n) return 0;

  const impact = Number((idealOut - amountOut) * 10000n / idealOut) / 100;
  return impact;
}
