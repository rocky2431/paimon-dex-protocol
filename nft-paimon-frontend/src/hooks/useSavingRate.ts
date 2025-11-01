/**
 * Custom wagmi hooks for SavingRate contract
 * SavingRate合约的自定义hooks
 */

import { useReadContract, useWriteContract, useAccount } from "wagmi";
import { SAVINGRATE_ABI } from "@/config/contracts/savingRate";
import { testnet } from "@/config/chains/testnet";

/**
 * Hook to read annual rate
 * 读取年化利率的Hook
 */
export function useSavingAnnualRate() {
  return useReadContract({
    address: testnet.tokens.savingRate,
    abi: SAVINGRATE_ABI,
    functionName: "annualRate",
  });
}

/**
 * Hook to read user deposit
 * 读取用户存款的Hook
 */
export function useSavingDeposit(address?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  const targetAddress = address || userAddress;

  return useReadContract({
    address: testnet.tokens.savingRate,
    abi: SAVINGRATE_ABI,
    functionName: "deposits",
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    },
  });
}

/**
 * Hook to get principal
 * 获取本金的Hook
 */
export function useSavingPrincipal(address?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  const targetAddress = address || userAddress;

  return useReadContract({
    address: testnet.tokens.savingRate,
    abi: SAVINGRATE_ABI,
    functionName: "getPrincipal",
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    },
  });
}

/**
 * Hook to get accrued interest
 * 获取已累积利息的Hook
 */
export function useSavingAccruedInterest(address?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  const targetAddress = address || userAddress;

  return useReadContract({
    address: testnet.tokens.savingRate,
    abi: SAVINGRATE_ABI,
    functionName: "getAccruedInterest",
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    },
  });
}

/**
 * Hook to get total balance (principal + interest)
 * 获取总余额(本金+利息)的Hook
 */
export function useSavingTotalBalance(address?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  const targetAddress = address || userAddress;

  return useReadContract({
    address: testnet.tokens.savingRate,
    abi: SAVINGRATE_ABI,
    functionName: "getTotalBalance",
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    },
  });
}

/**
 * Hook to calculate current interest
 * 计算当前利息的Hook
 */
export function useSavingCurrentInterest(address?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  const targetAddress = address || userAddress;

  return useReadContract({
    address: testnet.tokens.savingRate,
    abi: SAVINGRATE_ABI,
    functionName: "calculateCurrentInterest",
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    },
  });
}

/**
 * Hook to deposit USDP
 * 存入USDP的Hook
 */
export function useSavingDeposit() {
  return useWriteContract();
}

/**
 * Hook to withdraw USDP
 * 提取USDP的Hook
 */
export function useSavingWithdraw() {
  return useWriteContract();
}

/**
 * Hook to claim interest
 * 领取利息的Hook
 */
export function useSavingClaimInterest() {
  return useWriteContract();
}
