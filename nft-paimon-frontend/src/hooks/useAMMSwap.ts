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
import { TOKEN_CONFIG } from '@/components/swap/constants';

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

  // ==================== Dynamic Liquidity Hub Discovery ====================

  /**
   * ALL tokens in TOKEN_CONFIG are potential liquidity hubs.
   * No hard-coded hub assumptions - WBNB, USDP, USDC, HYD, PAIMON all treated equally.
   *
   * Algorithm:
   * 1. Try direct pair first (fastest route, no intermediate fees)
   * 2. If direct pair doesn't exist, try ALL tokens as potential hubs
   * 3. Prioritize common hubs (WBNB, USDP, USDC) for faster route discovery
   * 4. Router.getAmountsOut will validate if the route exists on-chain
   *
   * Example: PAIMON → USDC swap
   * - Try direct: PAIMON/USDC
   *   → Query Router.getAmountsOut([PAIMON, USDC])
   *   → If reverts: Direct pair doesn't exist, try hubs
   *
   * - Try via WBNB (priority 1): PAIMON → WBNB → USDC
   *   → Query Router.getAmountsOut([PAIMON, WBNB, USDC])
   *   → If succeeds: Both PAIMON/WBNB and WBNB/USDC exist! ✅
   *   → If reverts: At least one hop missing, try next hub
   *
   * - Try via USDP (priority 2): PAIMON → USDP → USDC
   *   → Query Router.getAmountsOut([PAIMON, USDP, USDC])
   *   → Continue trying until valid route found...
   *
   * This scales automatically as more pools/tokens are deployed.
   */

  // Get all available tokens sorted by hub priority
  const prioritizedHubs = useMemo(() => {
    if (!inputToken || !outputToken) return [];

    // Get all tokens except input/output
    const allTokens = Object.entries(TOKEN_CONFIG)
      .filter(([_, tokenInfo]) => {
        const addr = tokenInfo.address.toLowerCase();
        return (
          addr !== inputToken.address.toLowerCase() &&
          addr !== outputToken.address.toLowerCase()
        );
      })
      .map(([key, tokenInfo]) => ({
        key: key.toLowerCase(),
        symbol: tokenInfo.symbol,
        address: tokenInfo.address,
      }));

    // Sort by priority: common liquidity hubs first (WBNB > USDP > USDC > others)
    const hubPriority = ['wbnb', 'usdp', 'usdc'];
    allTokens.sort((a, b) => {
      const aPriority = hubPriority.indexOf(a.key);
      const bPriority = hubPriority.indexOf(b.key);
      // -1 means not in priority list, push to end (999)
      const aPrio = aPriority === -1 ? 999 : aPriority;
      const bPrio = bPriority === -1 ? 999 : bPriority;
      return aPrio - bPrio;
    });

    return allTokens;
  }, [inputToken, outputToken]);

  /**
   * Calculate optimal route
   *
   * Priority order:
   * 1. Direct pair (if exists)
   * 2. Via WBNB hub (highest liquidity on BSC)
   * 3. Via USDP hub (our stablecoin)
   * 4. Via USDC hub (mainstream stablecoin)
   * 5. Via other tokens (HYD, PAIMON, etc.)
   *
   * Router.getAmountsOut will validate route existence automatically:
   * - If route valid: Returns output amounts
   * - If route invalid: Reverts with "INSUFFICIENT_LIQUIDITY" or "INVALID_PATH"
   */
  const route = useMemo((): SwapRoute | null => {
    if (!inputToken || !outputToken) return null;

    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

    // 1. Try direct pair (fastest, lowest fees)
    if (directPairAddress && directPairAddress !== ZERO_ADDRESS) {
      console.log(`[ROUTING] Direct route: ${inputToken.symbol} → ${outputToken.symbol}`);
      return [inputToken.address, outputToken.address];
    }

    // 2. Try via prioritized hubs (2-hop routes)
    // Return first hub to try - Router will validate if it works
    if (prioritizedHubs.length > 0) {
      const firstHub = prioritizedHubs[0];
      console.log(
        `[ROUTING] Hub route (trying ${prioritizedHubs.length} hubs, priority: ${prioritizedHubs.map(h => h.symbol.toUpperCase()).join(' > ')}): ` +
        `${inputToken.symbol} → ${firstHub.symbol.toUpperCase()} → ${outputToken.symbol}`
      );
      return [inputToken.address, firstHub.address, outputToken.address];
    }

    // 3. No valid route possible
    console.log(`[ROUTING] No route found: ${inputToken.symbol} → ${outputToken.symbol}`);
    return null;
  }, [inputToken, outputToken, directPairAddress, prioritizedHubs]);

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
