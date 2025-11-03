/**
 * Custom hook for esPaimon vesting position tracking
 * esPaimon 归属进度跟踪的自定义 Hook
 */

import { useReadContract, useAccount } from "wagmi";
import { useMemo } from "react";
import { ESPAIMON_ABI } from "@/config/contracts/esPaimon";
import { testnet } from "@/config/chains/testnet";

/**
 * Vesting position data structure
 * 归属仓位数据结构
 */
export interface VestingPosition {
  totalVested: bigint; // Total amount vested (总归属金额)
  vested: bigint; // Amount already vested based on time (已释放金额)
  locked: bigint; // Amount still locked (仍锁定金额)
  claimable: bigint; // Amount that can be claimed now (可领取金额)
  vestingProgress: number; // Vesting progress percentage 0-100 (归属进度百分比)
  remainingDays: number; // Days remaining until fully vested (剩余天数)
  isLoading: boolean; // Loading state (加载状态)
  error: Error | null; // Error state (错误状态)
}

/**
 * Hook to get user's vesting position details
 * 获取用户归属仓位详情的 Hook
 *
 * @param address - Optional user address (defaults to connected wallet)
 * @returns Vesting position details with calculations
 *
 * @example
 * ```tsx
 * const position = useVestingPosition();
 * console.log(`Progress: ${position.vestingProgress}%`);
 * console.log(`Claimable: ${formatUnits(position.claimable, 18)} PAIMON`);
 * ```
 */
export function useVestingPosition(address?: `0x${string}`): VestingPosition {
  const { address: userAddress } = useAccount();
  const targetAddress = address || userAddress;

  // Read vesting position from contract
  const { data, isLoading, error } = useReadContract({
    address: testnet.tokens.esPaimon,
    abi: ESPAIMON_ABI,
    functionName: "positions",
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    },
  });

  // Calculate vesting metrics
  const position = useMemo<VestingPosition>(() => {
    // Handle loading/error states
    if (isLoading || !data) {
      return {
        totalVested: 0n,
        vested: 0n,
        locked: 0n,
        claimable: 0n,
        vestingProgress: 0,
        remainingDays: 0,
        isLoading,
        error: error as Error | null,
      };
    }

    // Parse contract data: [totalAmount, claimedAmount, startTime, lastClaimTime]
    const [totalAmount, claimedAmount, startTime] = data as [bigint, bigint, bigint, bigint];

    // Handle empty position
    if (!totalAmount || totalAmount === 0n) {
      return {
        totalVested: 0n,
        vested: 0n,
        locked: 0n,
        claimable: 0n,
        vestingProgress: 0,
        remainingDays: 0,
        isLoading: false,
        error: null,
      };
    }

    // Handle malformed data
    if (totalAmount === null || claimedAmount === null || startTime === null) {
      return {
        totalVested: 0n,
        vested: 0n,
        locked: 0n,
        claimable: 0n,
        vestingProgress: 0,
        remainingDays: 0,
        isLoading: false,
        error: null,
      };
    }

    // Constants
    const VESTING_PERIOD = 365n * 24n * 60n * 60n; // 365 days in seconds
    const currentTime = BigInt(Math.floor(Date.now() / 1000));

    // Calculate elapsed time (prevent negative if start time is in future - invalid state)
    const elapsed = currentTime > startTime ? currentTime - startTime : 0n;

    // Calculate vested amount: min(totalAmount, totalAmount * elapsed / VESTING_PERIOD)
    let vestedAmount: bigint;
    if (elapsed >= VESTING_PERIOD) {
      vestedAmount = totalAmount; // Fully vested
    } else {
      // Linear vesting: vestedAmount = totalAmount * elapsed / VESTING_PERIOD
      vestedAmount = (totalAmount * elapsed) / VESTING_PERIOD;
    }

    // Calculate locked amount (remaining unvested)
    const lockedAmount = totalAmount > vestedAmount ? totalAmount - vestedAmount : 0n;

    // Calculate claimable amount (vested but not yet claimed)
    // Prevent negative if claimed > vested (shouldn't happen, but defensive programming)
    const claimableAmount = vestedAmount > claimedAmount ? vestedAmount - claimedAmount : 0n;

    // Calculate vesting progress percentage (0-100)
    const progress = elapsed >= VESTING_PERIOD ? 100 : Number((elapsed * 100n) / VESTING_PERIOD);

    // Calculate remaining days
    const remainingSeconds = elapsed >= VESTING_PERIOD ? 0n : VESTING_PERIOD - elapsed;
    const remainingDays = Number(remainingSeconds / (24n * 60n * 60n));

    return {
      totalVested: totalAmount,
      vested: vestedAmount,
      locked: lockedAmount,
      claimable: claimableAmount,
      vestingProgress: progress,
      remainingDays,
      isLoading: false,
      error: null,
    };
  }, [data, isLoading, error]);

  return position;
}
