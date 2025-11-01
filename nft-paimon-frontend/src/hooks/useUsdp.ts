/**
 * Custom wagmi hooks for USDP contract
 * USDP合约的自定义hooks
 */

import { useReadContract, useWriteContract, useAccount } from "wagmi";
import { USDP_ABI } from "@/config/contracts/usdp";
import { testnet } from "@/config/chains/testnet";

/**
 * Hook to read USDP balance
 * 读取USDP余额的Hook
 */
export function useUsdpBalance(address?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  const targetAddress = address || userAddress;

  return useReadContract({
    address: testnet.tokens.usdp,
    abi: USDP_ABI,
    functionName: "balanceOf",
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    },
  });
}

/**
 * Hook to read USDP shares
 * 读取USDP份额的Hook
 */
export function useUsdpShares(address?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  const targetAddress = address || userAddress;

  return useReadContract({
    address: testnet.tokens.usdp,
    abi: USDP_ABI,
    functionName: "sharesOf",
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    },
  });
}

/**
 * Hook to read USDP accrual index
 * 读取USDP累积指数的Hook
 */
export function useUsdpAccrualIndex() {
  return useReadContract({
    address: testnet.tokens.usdp,
    abi: USDP_ABI,
    functionName: "accrualIndex",
  });
}

/**
 * Hook to approve USDP
 * 授权USDP的Hook
 */
export function useUsdpApprove() {
  return useWriteContract();
}

/**
 * Hook to transfer USDP
 * 转账USDP的Hook
 */
export function useUsdpTransfer() {
  return useWriteContract();
}
