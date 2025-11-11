/**
 * Boost Data Integration Hook
 * 集成所有 Boost 相关数据的 Hook
 *
 * Aggregates:
 * - Staked amount
 * - Boost multiplier
 * - Unlock time
 * - Can unstake status
 * - User balance (for calculator)
 *
 * Task: gap-3.2.4 - Remove mock data, use real contract data
 */

'use client';

import { useMemo } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import {
  useBoostStakingAmount,
  useBoostStakingTime,
  useBoostMultiplier,
  useCanUnstake,
} from './useBoostStaking';
import {
  calculateTimeRemaining,
  formatBoostMultiplier,
  formatTimeRemaining,
  MIN_STAKE_DURATION_SECONDS,
} from '@/components/boost/constants';
import { BoostStake } from '@/components/boost/types';
import { testnet } from '@/config/chains/testnet';

/**
 * Hook to get aggregated Boost data
 * 获取聚合的 Boost 数据
 */
export const useBoostData = () => {
  const { address, isConnected } = useAccount();

  // Query user's PAIMON balance
  const { data: paimonBalance } = useBalance({
    address,
    token: testnet.tokens.paimon,
    query: {
      enabled: !!address && isConnected,
    },
  });

  // Query Boost staking data
  const { data: stakedAmount } = useBoostStakingAmount(address);
  const { data: stakeTime } = useBoostStakingTime(address);
  const { data: boostMultiplier } = useBoostMultiplier(address);
  const { data: canUnstake } = useCanUnstake(address);

  // Aggregate into BoostStake object
  const stake: BoostStake | undefined = useMemo(() => {
    if (!isConnected || !stakedAmount || stakedAmount === 0n) {
      return undefined; // No active stake
    }

    const stakeTimeNumber = Number(stakeTime || 0);
    const multiplier = Number(boostMultiplier || 10000);
    const canUnstakeStatus = Boolean(canUnstake);

    // Calculate time remaining
    const timeRemaining = stakeTimeNumber > 0 ? calculateTimeRemaining(stakeTimeNumber) : 0;

    // Calculate unlock time
    const unlockTime = stakeTimeNumber + MIN_STAKE_DURATION_SECONDS;

    return {
      amount: stakedAmount,
      amountFormatted: formatUnits(stakedAmount, 18),
      stakeTime: stakeTimeNumber,
      unlockTime,
      boostMultiplier: multiplier,
      boostMultiplierFormatted: formatBoostMultiplier(multiplier),
      canUnstake: canUnstakeStatus,
      timeRemaining,
    };
  }, [stakedAmount, stakeTime, boostMultiplier, canUnstake, isConnected]);

  // User's PAIMON balance (for calculator)
  const userBalance = useMemo(() => {
    if (!paimonBalance) return '0';
    return formatUnits(paimonBalance.value, paimonBalance.decimals);
  }, [paimonBalance]);

  // Current multiplier (for calculator)
  const currentMultiplier = useMemo(() => {
    if (!boostMultiplier) return 10000; // 1.0x default
    return Number(boostMultiplier);
  }, [boostMultiplier]);

  // Loading states
  const isLoading = !isConnected || (isConnected && stakedAmount === undefined);

  return {
    stake,
    userBalance,
    currentMultiplier,
    isLoading,
    isConnected,
  };
};
