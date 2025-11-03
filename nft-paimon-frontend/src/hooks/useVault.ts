/**
 * Custom wagmi hooks for USDPVault contract
 * USDP Vault合约的自定义hooks
 */

import { useReadContract, useWriteContract, useAccount } from "wagmi";
import { VAULT_ABI } from "@/config/contracts/vault";
import { testnet } from "@/config/chains/testnet";

/**
 * Hook to deposit collateral into vault
 * 抵押资产到Vault的Hook
 */
export function useVaultDeposit() {
  return useWriteContract();
}

/**
 * Hook to withdraw collateral from vault
 * 从Vault提取抵押资产的Hook
 */
export function useVaultWithdraw() {
  return useWriteContract();
}

/**
 * Hook to borrow USDP against collateral
 * 抵押借款USDP的Hook
 */
export function useVaultBorrow() {
  return useWriteContract();
}

/**
 * Hook to repay USDP debt
 * 偿还USDP债务的Hook
 */
export function useVaultRepay() {
  return useWriteContract();
}

/**
 * Hook to read user's debt amount
 * 读取用户债务金额的Hook
 */
export function useVaultDebtOf(address?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  const targetAddress = address || userAddress;

  return useReadContract({
    address: testnet.tokens.vault,
    abi: VAULT_ABI,
    functionName: "debtOf",
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    },
  });
}

/**
 * Hook to read user's health factor
 * 读取用户健康系数的Hook
 */
export function useVaultHealthFactor(address?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  const targetAddress = address || userAddress;

  return useReadContract({
    address: testnet.tokens.vault,
    abi: VAULT_ABI,
    functionName: "healthFactor",
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    },
  });
}

/**
 * Hook to read user's collateral balance
 * 读取用户抵押资产余额的Hook
 */
export function useVaultCollateralBalance(
  userAddress?: `0x${string}`,
  collateralAddress?: `0x${string}`
) {
  return useReadContract({
    address: testnet.tokens.vault,
    abi: VAULT_ABI,
    functionName: "getCollateralBalance",
    args: userAddress && collateralAddress ? [userAddress, collateralAddress] : undefined,
    query: {
      enabled: !!userAddress && !!collateralAddress,
    },
  });
}

/**
 * Hook to read user's collateral value in USD
 * 读取用户抵押资产美元价值的Hook
 */
export function useVaultCollateralValueUSD(
  userAddress?: `0x${string}`,
  collateralAddress?: `0x${string}`
) {
  return useReadContract({
    address: testnet.tokens.vault,
    abi: VAULT_ABI,
    functionName: "getCollateralValueUSD",
    args: userAddress && collateralAddress ? [userAddress, collateralAddress] : undefined,
    query: {
      enabled: !!userAddress && !!collateralAddress,
    },
  });
}
