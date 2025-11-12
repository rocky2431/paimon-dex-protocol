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

  // ==================== Liquidity Hub Queries ====================
  // Query all possible 2-hop routes through liquidity hubs
  // Each hub requires 2 queries: inputToken -> hub, hub -> outputToken
  //
  // Current liquidity hubs based on deployed pools:
  // - USDP: Has pairs with USDC, HYD (main liquidity hub)
  //
  // Future hubs (when more liquidity is added):
  // - USDC: Currently only has USDP pair
  // - PAIMON: Currently only has WBNB pair
  // - WBNB: Currently only has PAIMON pair

  // Hub 1: USDP (Priority 1 - main liquidity hub)
  const isInputUsdp = inputToken?.address.toLowerCase() === testnet.tokens.usdp.toLowerCase();
  const isOutputUsdp = outputToken?.address.toLowerCase() === testnet.tokens.usdp.toLowerCase();

  const { data: inputUsdpPair } = useReadContract({
    address: testnet.dex.factory,
    abi: PANCAKE_FACTORY_ABI,
    functionName: 'getPair',
    args: [inputToken.address, testnet.tokens.usdp],
    query: { enabled: !!inputToken && !isInputUsdp && !isOutputUsdp },
  });

  const { data: usdpOutputPair } = useReadContract({
    address: testnet.dex.factory,
    abi: PANCAKE_FACTORY_ABI,
    functionName: 'getPair',
    args: [testnet.tokens.usdp, outputToken.address],
    query: { enabled: !!outputToken && !isInputUsdp && !isOutputUsdp },
  });

  // Hub 2: USDC (Reserved for future - add when more USDC pairs exist)
  // const isInputUsdc = inputToken?.address.toLowerCase() === testnet.tokens.usdc.toLowerCase();
  // const isOutputUsdc = outputToken?.address.toLowerCase() === testnet.tokens.usdc.toLowerCase();
  // ... (queries commented out for now)

  // Hub 3: PAIMON (Reserved for future - add when more PAIMON pairs exist)
  // const isInputPaimon = inputToken?.address.toLowerCase() === testnet.tokens.paimon.toLowerCase();
  // const isOutputPaimon = outputToken?.address.toLowerCase() === testnet.tokens.paimon.toLowerCase();
  // ... (queries commented out for now)

  /**
   * Calculate optimal route with DYNAMIC liquidity hub discovery
   * Verifies each hop exists on-chain before returning route
   *
   * Current Algorithm:
   * 1. Try direct pair: inputToken -> outputToken
   * 2. Try via USDP: inputToken -> USDP -> outputToken (only if BOTH hops exist)
   * 3. Return null if no valid route exists
   *
   * ✅ Scalable Design:
   * To add new liquidity hubs (e.g., USDC, PAIMON) when more pairs exist:
   * - Uncomment hub queries above
   * - Add priority check below (e.g., "3. Via USDC")
   * - Add dependencies to useMemo array
   */
  const route = useMemo((): SwapRoute | null => {
    if (!inputToken || !outputToken) return null;

    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

    // 1. Direct pair exists - fastest route (no intermediate fees)
    if (directPairAddress && directPairAddress !== ZERO_ADDRESS) {
      return [inputToken.address, outputToken.address];
    }

    // 2. Via USDP (main liquidity hub - has USDC and HYD pairs)
    if (
      inputUsdpPair &&
      inputUsdpPair !== ZERO_ADDRESS &&
      usdpOutputPair &&
      usdpOutputPair !== ZERO_ADDRESS
    ) {
      return [inputToken.address, testnet.tokens.usdp, outputToken.address];
    }

    // Future: Add more hubs here when liquidity grows
    // Example:
    // 3. Via USDC (when more USDC pairs exist)
    // 4. Via PAIMON (when more PAIMON pairs exist)

    // No valid route found
    return null;
  }, [inputToken, outputToken, directPairAddress, inputUsdpPair, usdpOutputPair]);

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

  const { data: amountsOut, error: amountsOutError, isLoading: amountsOutLoading } = useReadContract({
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

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: inputToken.address,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: userAddress ? [userAddress, testnet.dex.router] : undefined,
    query: {
      enabled: !!userAddress && !!inputToken,
      refetchInterval: 2000, // Auto-refetch every 2 seconds
    },
  });

  const needsApproval = useMemo(() => {
    if (!calculation || allowance === undefined) return false;
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

    if (!route) {
      return { isValid: false, error: 'No liquidity route available for this pair' };
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
  }, [isConnected, inputAmount, route, calculation, inputBalance]);

  // ==================== Actions ====================

  /**
   * Approve input token
   */
  const handleApprove = useCallback(async () => {
    if (!userAddress || !calculation || !publicClient) {
      throw new Error('Missing user address or calculation');
    }

    try {
      setSwapState(SwapState.APPROVING);
      setError(null);

      const hash = await writeContractAsync({
        address: inputToken.address,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [testnet.dex.router, calculation.amountIn],
      });

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'success') {
        setSwapState(SwapState.APPROVED);
        // Refetch allowance immediately after approval
        await refetchAllowance();
      } else {
        setSwapState(SwapState.ERROR);
        setError('Approval transaction reverted.');
        throw new Error('Transaction reverted');
      }
    } catch (err) {
      console.error('Approval error:', err);
      setSwapState(SwapState.ERROR);
      setError('Approval failed. Please try again.');
      throw err;
    }
  }, [userAddress, calculation, inputToken, writeContractAsync, publicClient, refetchAllowance]);

  /**
   * Execute swap
   */
  const handleSwap = useCallback(async () => {
    if (!userAddress || !calculation || !validation.isValid || !publicClient) {
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
      const hash = await writeContractAsync({
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

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'success') {
        setSwapState(SwapState.SUCCESS);
        setInputAmount('');

        // Reset state after 3 seconds
        setTimeout(() => {
          setSwapState(SwapState.IDLE);
        }, 3000);
      } else {
        setSwapState(SwapState.ERROR);
        setError('Swap transaction reverted.');
        throw new Error('Transaction reverted');
      }
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
    publicClient,
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
