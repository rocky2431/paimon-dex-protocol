/**
 * Custom wagmi hooks for VotingEscrowPaimon contract
 * vePaimon合约的自定义hooks
 */

import { useReadContract, useWriteContract, useAccount } from "wagmi";
import { VEPAIMON_ABI } from "@/config/contracts/vePaimon";
import { testnet } from "@/config/chains/testnet";

/**
 * Hook to read vePaimon NFT balance
 * 读取vePaimon NFT数量的Hook
 */
export function useVePaimonBalance(address?: `0x${string}`) {
  const { address: userAddress } = useAccount();
  const targetAddress = address || userAddress;

  return useReadContract({
    address: testnet.tokens.vePaimon,
    abi: VEPAIMON_ABI,
    functionName: "balanceOf",
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    },
  });
}

/**
 * Hook to read vePaimon locked position
 * 读取vePaimon锁仓位置的Hook
 */
export function useVePaimonLocked(tokenId?: bigint) {
  return useReadContract({
    address: testnet.tokens.vePaimon,
    abi: VEPAIMON_ABI,
    functionName: "locked",
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    },
  });
}

/**
 * Hook to read vePaimon voting power
 * 读取vePaimon投票权重的Hook
 */
export function useVePaimonVotingPower(tokenId?: bigint) {
  return useReadContract({
    address: testnet.tokens.vePaimon,
    abi: VEPAIMON_ABI,
    functionName: "balanceOfNFT",
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
    },
  });
}

/**
 * Hook to read MAX_TIME
 * 读取最大锁仓时间的Hook
 */
export function useVePaimonMaxTime() {
  return useReadContract({
    address: testnet.tokens.vePaimon,
    abi: VEPAIMON_ABI,
    functionName: "MAX_TIME",
  });
}

/**
 * Hook to create vePaimon lock
 * 创建vePaimon锁仓的Hook
 */
export function useVePaimonCreateLock() {
  return useWriteContract();
}

/**
 * Hook to increase vePaimon amount
 * 增加vePaimon数量的Hook
 */
export function useVePaimonIncreaseAmount() {
  return useWriteContract();
}

/**
 * Hook to increase vePaimon unlock time
 * 延长vePaimon解锁时间的Hook
 */
export function useVePaimonIncreaseUnlockTime() {
  return useWriteContract();
}

/**
 * Hook to withdraw vePaimon
 * 提取vePaimon的Hook
 */
export function useVePaimonWithdraw() {
  return useWriteContract();
}
