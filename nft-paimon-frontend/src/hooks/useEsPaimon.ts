/**
 * Custom wagmi hooks for esPaimon contract
 * esPaimon合约的自定义hooks
 */

import { useReadContract, useWriteContract, useAccount } from "wagmi";
import { ESPAIMON_ABI } from "@/config/contracts/esPaimon";
import { testnet } from "@/config/chains/testnet";

/**
 * Hook to read esPaimon position
 * 读取esPaimon持仓的Hook
 */
export function useEsPaimonPosition(address?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  const targetAddress = address || userAddress;

  return useReadContract({
    address: testnet.tokens.esPaimon,
    abi: ESPAIMON_ABI,
    functionName: "positions",
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    },
  });
}

/**
 * Hook to get vested amount
 * 获取已释放数量的Hook
 */
export function useEsPaimonVestedAmount(address?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  const targetAddress = address || userAddress;

  return useReadContract({
    address: testnet.tokens.esPaimon,
    abi: ESPAIMON_ABI,
    functionName: "getVestedAmount",
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    },
  });
}

/**
 * Hook to get claimable amount
 * 获取可领取数量的Hook
 */
export function useEsPaimonClaimableAmount(address?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  const targetAddress = address || userAddress;

  return useReadContract({
    address: testnet.tokens.esPaimon,
    abi: ESPAIMON_ABI,
    functionName: "getClaimableAmount",
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    },
  });
}

/**
 * Hook to get boost weight
 * 获取Boost权重的Hook
 */
export function useEsPaimonBoostWeight(address?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  const targetAddress = address || userAddress;

  return useReadContract({
    address: testnet.tokens.esPaimon,
    abi: ESPAIMON_ABI,
    functionName: "getBoostWeight",
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    },
  });
}

/**
 * Hook to claim esPaimon
 * 领取esPaimon的Hook
 */
export function useEsPaimonClaim() {
  return useWriteContract();
}

/**
 * Hook to exit esPaimon vesting
 * 提前退出esPaimon的Hook
 */
export function useEsPaimonExit() {
  return useWriteContract();
}
