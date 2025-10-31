/**
 * useRWABalance Hook
 * Queries user's RWA token balance and Treasury allowance
 */

import { useReadContract, useAccount } from "wagmi";
import { ERC20_ABI } from "@/config/contracts/erc20";
import { config } from "@/config";
import { formatUnits } from "viem";

export function useRWABalance(tokenAddress?: string) {
  const { address: userAddress } = useAccount();
  const treasuryAddress = config.tokens.treasury as `0x${string}` | undefined;

  // Query RWA token balance
  const {
    data: balanceData,
    isLoading: isBalanceLoading,
    refetch: refetchBalance,
  } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled:
        !!tokenAddress &&
        !!userAddress &&
        tokenAddress !== "0x0000000000000000000000000000000000000000",
    },
  });

  // Query allowance for Treasury contract
  const {
    data: allowanceData,
    isLoading: isAllowanceLoading,
    refetch: refetchAllowance,
  } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "allowance",
    args:
      userAddress && treasuryAddress
        ? [userAddress, treasuryAddress]
        : undefined,
    query: {
      enabled:
        !!tokenAddress &&
        !!userAddress &&
        !!treasuryAddress &&
        tokenAddress !== "0x0000000000000000000000000000000000000000",
    },
  });

  // Query token decimals
  const { data: decimalsData } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: {
      enabled:
        !!tokenAddress &&
        tokenAddress !== "0x0000000000000000000000000000000000000000",
    },
  });

  const decimals = decimalsData || 18;
  const balance = balanceData
    ? parseFloat(formatUnits(balanceData, decimals))
    : 0;
  const allowance = allowanceData
    ? parseFloat(formatUnits(allowanceData, decimals))
    : 0;

  return {
    balance,
    allowance,
    balanceRaw: balanceData || 0n,
    allowanceRaw: allowanceData || 0n,
    decimals,
    isLoading: isBalanceLoading || isAllowanceLoading,
    refetchBalance,
    refetchAllowance,
  };
}
