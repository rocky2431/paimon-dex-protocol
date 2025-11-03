/**
 * Custom wagmi hooks for RewardDistributor contract
 * RewardDistributor合约的自定义hooks
 */

import { useReadContract, useWriteContract, useAccount } from "wagmi";
import { REWARD_DISTRIBUTOR_ABI } from "@/config/contracts/rewardDistributor";
import { testnet } from "@/config/chains/testnet";

/**
 * Hook to claim rewards with Merkle proof
 * 使用Merkle证明领取奖励的Hook
 */
export function useDistributorClaim() {
  return useWriteContract();
}

/**
 * Hook to check if user has claimed for specific epoch
 * 检查用户是否已领取指定周期奖励的Hook
 */
export function useDistributorIsClaimed(
  userAddress?: `0x${string}`,
  epoch?: number,
  tokenAddress?: `0x${string}`
) {
  return useReadContract({
    address: testnet.tokens.rewardDistributor,
    abi: REWARD_DISTRIBUTOR_ABI,
    functionName: "isClaimed",
    args:
      userAddress && epoch !== undefined && tokenAddress
        ? [userAddress, BigInt(epoch), tokenAddress]
        : undefined,
    query: {
      enabled: !!userAddress && epoch !== undefined && !!tokenAddress,
    },
  });
}

/**
 * Hook to read claimed amount for user and epoch
 * 读取用户在指定周期的已领取金额的Hook
 */
export function useDistributorClaimedAmount(
  userAddress?: `0x${string}`,
  epoch?: number,
  tokenAddress?: `0x${string}`
) {
  return useReadContract({
    address: testnet.tokens.rewardDistributor,
    abi: REWARD_DISTRIBUTOR_ABI,
    functionName: "claimed",
    args:
      userAddress && epoch !== undefined && tokenAddress
        ? [userAddress, BigInt(epoch), tokenAddress]
        : undefined,
    query: {
      enabled: !!userAddress && epoch !== undefined && !!tokenAddress,
    },
  });
}

/**
 * Hook to read current epoch
 * 读取当前周期的Hook
 */
export function useDistributorCurrentEpoch() {
  return useReadContract({
    address: testnet.tokens.rewardDistributor,
    abi: REWARD_DISTRIBUTOR_ABI,
    functionName: "currentEpoch",
  });
}

/**
 * Hook to read boost multiplier for user
 * 读取用户Boost乘数的Hook
 * Note: This fetches from BoostStaking contract
 */
export function useDistributorBoostMultiplier(address?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  const targetAddress = address || userAddress;

  // Note: In a real implementation, this would call BoostStaking.getBoostMultiplier(user)
  // For now, we'll read from the RewardDistributor's boostStaking reference
  return useReadContract({
    address: testnet.tokens.rewardDistributor,
    abi: REWARD_DISTRIBUTOR_ABI,
    functionName: "boostStaking",
    query: {
      enabled: !!targetAddress,
    },
  });
}
