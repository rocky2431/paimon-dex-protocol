/**
 * Custom wagmi hooks for USDPStabilityPool contract
 * USDP StabilityPool合约的自定义hooks
 */

import { useReadContract, useWriteContract, useAccount } from "wagmi";
import { STABILITY_POOL_ABI } from "@/config/contracts/stabilityPool";
import { testnet } from "@/config/chains/testnet";

/**
 * Hook to deposit USDP into stability pool
 * 向稳定池存入USDP的Hook
 */
export function useStabilityPoolDeposit() {
  return useWriteContract();
}

/**
 * Hook to withdraw USDP from stability pool
 * 从稳定池提取USDP的Hook
 */
export function useStabilityPoolWithdraw() {
  return useWriteContract();
}

/**
 * Hook to claim liquidation collateral gains
 * 领取清算收益的Hook
 */
export function useStabilityPoolClaim() {
  return useWriteContract();
}

/**
 * Hook to read user's USDP balance in stability pool
 * 读取用户在稳定池的USDP余额的Hook
 */
export function useStabilityPoolBalance(address?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  const targetAddress = address || userAddress;

  return useReadContract({
    address: testnet.tokens.stabilityPool,
    abi: STABILITY_POOL_ABI,
    functionName: "balanceOf",
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    },
  });
}

/**
 * Hook to read user's shares in stability pool
 * 读取用户在稳定池的份额的Hook
 */
export function useStabilityPoolShares(address?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  const targetAddress = address || userAddress;

  return useReadContract({
    address: testnet.tokens.stabilityPool,
    abi: STABILITY_POOL_ABI,
    functionName: "sharesOf",
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    },
  });
}

/**
 * Hook to read total deposits in stability pool
 * 读取稳定池总存款的Hook
 */
export function useStabilityPoolTotalDeposits() {
  return useReadContract({
    address: testnet.tokens.stabilityPool,
    abi: STABILITY_POOL_ABI,
    functionName: "totalDeposits",
  });
}

/**
 * Hook to read total shares in stability pool
 * 读取稳定池总份额的Hook
 */
export function useStabilityPoolTotalShares() {
  return useReadContract({
    address: testnet.tokens.stabilityPool,
    abi: STABILITY_POOL_ABI,
    functionName: "totalShares",
  });
}

/**
 * Hook to read pending collateral gain for user
 * 读取用户待领取清算收益的Hook
 */
export function useStabilityPoolPendingGain(
  userAddress?: `0x${string}`,
  collateralAddress?: `0x${string}`
) {
  return useReadContract({
    address: testnet.tokens.stabilityPool,
    abi: STABILITY_POOL_ABI,
    functionName: "pendingCollateralGain",
    args: userAddress && collateralAddress ? [userAddress, collateralAddress] : undefined,
    query: {
      enabled: !!userAddress && !!collateralAddress,
    },
  });
}
