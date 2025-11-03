/**
 * Custom hooks for RewardDistributor contract with vesting support
 * RewardDistributor合约的自定义hooks（支持归属化）
 */

import { useReadContract } from 'wagmi';
import { REWARD_DISTRIBUTOR_ABI } from '@/config/contracts/rewardDistributor';
import { testnet } from '@/config/chains/testnet';

/**
 * Hook to check if esPaimon vesting is enabled
 * 检查esPaimon归属化是否启用的Hook
 *
 * @returns {boolean} true if vesting is enabled, false otherwise
 *
 * @example
 * ```tsx
 * const { data: useEsVesting } = useRewardDistributorVesting();
 * if (useEsVesting) {
 *   // Show vesting indicator
 * }
 * ```
 */
export function useRewardDistributorVesting() {
  return useReadContract({
    address: testnet.tokens.rewardDistributor,
    abi: REWARD_DISTRIBUTOR_ABI,
    functionName: 'useEsVesting',
  });
}

/**
 * Hook to get esPaimon contract address
 * 获取esPaimon合约地址的Hook
 *
 * @returns {string} esPaimon contract address
 *
 * @example
 * ```tsx
 * const { data: esPaimonAddress } = useRewardDistributorEsPaimon();
 * ```
 */
export function useRewardDistributorEsPaimon() {
  return useReadContract({
    address: testnet.tokens.rewardDistributor,
    abi: REWARD_DISTRIBUTOR_ABI,
    functionName: 'esPaimonAddress',
  });
}

/**
 * Hook to get boost multiplier for current user
 * 获取当前用户的Boost乘数的Hook
 *
 * Boost multiplier is returned in basis points (10000 = 1.0x)
 * - 10000 = 1.0x (no boost)
 * - 12000 = 1.2x (20% boost)
 * - 15000 = 1.5x (50% boost)
 * - 20000 = 2.0x (100% boost, max)
 *
 * @returns {bigint} boost multiplier in basis points
 *
 * @example
 * ```tsx
 * const { data: boostMultiplier } = useRewardDistributorBoostMultiplier();
 * const actualReward = calculateActualReward(baseReward, boostMultiplier || 10000n);
 * ```
 */
export function useRewardDistributorBoostMultiplier() {
  // Note: This should query BoostStaking.getBoostMultiplier(user)
  // For now, we return the boostStaking contract address
  // TODO: Implement proper boost multiplier query from BoostStaking contract
  return useReadContract({
    address: testnet.tokens.rewardDistributor,
    abi: REWARD_DISTRIBUTOR_ABI,
    functionName: 'boostStaking',
  });
}

/**
 * Calculate actual reward amount with boost multiplier
 * 计算应用Boost乘数后的实际奖励金额
 *
 * Formula: actualReward = baseReward × (boostMultiplier / 10000)
 *
 * @param baseReward - Base reward amount (in wei)
 * @param boostMultiplier - Boost multiplier in basis points (10000 = 1.0x)
 * @returns Actual reward amount after boost
 *
 * @example
 * ```tsx
 * const baseReward = 1000n * 10n ** 18n; // 1000 tokens
 * const boostMultiplier = 12000n; // 1.2x
 * const actualReward = calculateActualReward(baseReward, boostMultiplier);
 * // actualReward = 1200 tokens
 * ```
 */
export function calculateActualReward(
  baseReward: bigint,
  boostMultiplier: bigint
): bigint {
  return (baseReward * boostMultiplier) / 10000n;
}
