/**
 * Custom wagmi hooks for NitroPool contract
 * NitroPool合约的自定义hooks
 */

import { useReadContract, useWriteContract, useAccount } from "wagmi";
import { NITROPOOL_ABI } from "@/config/contracts/nitroPool";
import { testnet } from "@/config/chains/testnet";

/**
 * Hook to read Nitro pool info
 * 读取Nitro池信息的Hook
 */
export function useNitroPoolInfo(poolId?: bigint) {
  return useReadContract({
    address: testnet.tokens.nitroPool,
    abi: NITROPOOL_ABI,
    functionName: "pools",
    args: poolId !== undefined ? [poolId] : undefined,
    query: {
      enabled: poolId !== undefined,
    },
  });
}

/**
 * Hook to get Nitro pool reward tokens
 * 获取Nitro池奖励代币的Hook
 */
export function useNitroPoolRewardTokens(poolId?: bigint) {
  return useReadContract({
    address: testnet.tokens.nitroPool,
    abi: NITROPOOL_ABI,
    functionName: "getPoolRewardTokens",
    args: poolId !== undefined ? [poolId] : undefined,
    query: {
      enabled: poolId !== undefined,
    },
  });
}

/**
 * Hook to read user stake in Nitro pool
 * 读取用户在Nitro池的质押的Hook
 */
export function useNitroUserStake(
  poolId?: bigint,
  address?: `0x${string}`
) {
  const { address: userAddress } = useAccount();
  const targetAddress = address || userAddress;

  return useReadContract({
    address: testnet.tokens.nitroPool,
    abi: NITROPOOL_ABI,
    functionName: "userStakes",
    args:
      poolId !== undefined && targetAddress
        ? [poolId, targetAddress]
        : undefined,
    query: {
      enabled: poolId !== undefined && !!targetAddress,
    },
  });
}

/**
 * Hook to get pending rewards
 * 获取待领取奖励的Hook
 */
export function useNitroPendingRewards(
  poolId?: bigint,
  rewardToken?: `0x${string}`,
  address?: `0x${string}`
) {
  const { address: userAddress } = useAccount();
  const targetAddress = address || userAddress;

  return useReadContract({
    address: testnet.tokens.nitroPool,
    abi: NITROPOOL_ABI,
    functionName: "getPendingRewards",
    args:
      poolId !== undefined && rewardToken && targetAddress
        ? [poolId, targetAddress, rewardToken]
        : undefined,
    query: {
      enabled: poolId !== undefined && !!rewardToken && !!targetAddress,
    },
  });
}

/**
 * Hook to check if can exit Nitro pool
 * 检查是否可以退出Nitro池的Hook
 */
export function useCanExitNitro(poolId?: bigint, address?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  const targetAddress = address || userAddress;

  return useReadContract({
    address: testnet.tokens.nitroPool,
    abi: NITROPOOL_ABI,
    functionName: "canExit",
    args:
      poolId !== undefined && targetAddress
        ? [poolId, targetAddress]
        : undefined,
    query: {
      enabled: poolId !== undefined && !!targetAddress,
    },
  });
}

/**
 * Hook to create Nitro pool
 * 创建Nitro池的Hook
 */
export function useCreateNitroPool() {
  return useWriteContract();
}

/**
 * Hook to enter Nitro pool
 * 加入Nitro池的Hook
 */
export function useEnterNitroPool() {
  return useWriteContract();
}

/**
 * Hook to exit Nitro pool
 * 退出Nitro池的Hook
 */
export function useExitNitroPool() {
  return useWriteContract();
}

/**
 * Hook to claim Nitro rewards
 * 领取Nitro奖励的Hook
 */
export function useClaimNitroRewards() {
  return useWriteContract();
}
