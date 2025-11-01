/**
 * Custom wagmi hooks for BoostStaking contract
 * BoostStaking合约的自定义hooks
 */

import { useReadContract, useWriteContract, useAccount } from "wagmi";
import { BOOSTSTAKING_ABI } from "@/config/contracts/boostStaking";
import { testnet } from "@/config/chains/testnet";

/**
 * Hook to read stake amount
 * 读取质押数量的Hook
 */
export function useBoostStakingAmount(address?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  const targetAddress = address || userAddress;

  return useReadContract({
    address: testnet.tokens.boostStaking,
    abi: BOOSTSTAKING_ABI,
    functionName: "stakeAmount",
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    },
  });
}

/**
 * Hook to read stake time
 * 读取质押时间的Hook
 */
export function useBoostStakingTime(address?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  const targetAddress = address || userAddress;

  return useReadContract({
    address: testnet.tokens.boostStaking,
    abi: BOOSTSTAKING_ABI,
    functionName: "stakeTime",
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    },
  });
}

/**
 * Hook to get boost multiplier
 * 获取Boost倍数的Hook
 */
export function useBoostMultiplier(address?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  const targetAddress = address || userAddress;

  return useReadContract({
    address: testnet.tokens.boostStaking,
    abi: BOOSTSTAKING_ABI,
    functionName: "getBoostMultiplier",
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    },
  });
}

/**
 * Hook to check if can unstake
 * 检查是否可以解除质押的Hook
 */
export function useCanUnstake(address?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  const targetAddress = address || userAddress;

  return useReadContract({
    address: testnet.tokens.boostStaking,
    abi: BOOSTSTAKING_ABI,
    functionName: "canUnstake",
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    },
  });
}

/**
 * Hook to stake PAIMON
 * 质押PAIMON的Hook
 */
export function useBoostStake() {
  return useWriteContract();
}

/**
 * Hook to unstake PAIMON
 * 解除质押PAIMON的Hook
 */
export function useBoostUnstake() {
  return useWriteContract();
}
