'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import type { Address } from 'viem';

/**
 * Approval State Enum
 * Tracks the current state of the token approval process
 */
export enum ApprovalState {
  IDLE = 'idle',           // Initial state, no action taken
  CHECKING = 'checking',   // Checking current allowance
  APPROVING = 'approving', // Approval transaction in progress
  APPROVED = 'approved',   // Sufficient allowance exists
  ERROR = 'error',         // Error occurred during approval
}

/**
 * ERC20 ABI subset for approve and allowance functions
 */
const ERC20_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * useTokenApproval Hook Configuration
 */
export interface UseTokenApprovalConfig {
  tokenAddress: Address;      // ERC20 token to approve
  spenderAddress: Address;     // Contract that will spend tokens
  amount: bigint | undefined;  // Amount to approve
}

/**
 * useTokenApproval Hook Return Type
 */
export interface UseTokenApprovalReturn {
  needsApproval: boolean;                 // Whether approval is needed
  state: ApprovalState;                   // Current approval state
  handleApprove: () => Promise<void>;     // Execute approval transaction
  isLoading: boolean;                     // Loading indicator
  error: string | null;                   // Error message
}

/**
 * useTokenApproval Hook
 * Generic ERC20 token approval hook for reusable authorization logic
 *
 * Features:
 * - Checks current allowance
 * - Determines if approval is needed
 * - Executes approval transaction
 * - State management: idle | checking | approving | approved | error
 * - Prevents double approval
 * - Handles errors gracefully
 *
 * @param config - Hook configuration
 * @returns Hook state and methods
 *
 * @example
 * ```typescript
 * const {
 *   needsApproval,
 *   state,
 *   handleApprove,
 *   isLoading,
 *   error,
 * } = useTokenApproval({
 *   tokenAddress: USDC_ADDRESS,
 *   spenderAddress: PSM_ADDRESS,
 *   amount: parseUnits('100', 6),
 * });
 *
 * // UI Integration
 * {needsApproval ? (
 *   <Button onClick={handleApprove} disabled={isLoading}>
 *     {isLoading ? 'Authorizing...' : 'Authorize'}
 *   </Button>
 * ) : (
 *   <Button onClick={handleDeposit}>Deposit</Button>
 * )}
 * ```
 */
export const useTokenApproval = ({
  tokenAddress,
  spenderAddress,
  amount,
}: UseTokenApprovalConfig): UseTokenApprovalReturn => {
  const { address: userAddress, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // Local state management
  const [state, setState] = useState<ApprovalState>(ApprovalState.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState<boolean>(false);

  // Use ref to track approval in-flight to prevent double approval
  const isApprovingRef = useRef<boolean>(false);

  // Check current allowance
  const { data: allowance, isLoading: isCheckingAllowance, isError: allowanceError } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: userAddress && spenderAddress ? [userAddress, spenderAddress] : undefined,
    query: {
      enabled: Boolean(userAddress && isConnected && tokenAddress && spenderAddress),
    },
  });

  // Determine if approval is needed
  const needsApproval = useMemo(() => {
    // Not connected - no approval needed
    if (!isConnected || !userAddress) {
      return false;
    }

    // Invalid amount - no approval needed
    if (!amount || amount === BigInt(0)) {
      return false;
    }

    // No allowance data yet or error - assume needs approval
    if (allowanceError || allowance === undefined) {
      return true;
    }

    // Check if current allowance is sufficient
    return allowance < amount;
  }, [isConnected, userAddress, amount, allowance, allowanceError]);

  // Update state based on allowance check
  useEffect(() => {
    // Skip state updates while approving to avoid race conditions
    if (isApproving) {
      return;
    }

    if (!isConnected || !userAddress) {
      setState(ApprovalState.IDLE);
      return;
    }

    // Undefined amount should remain IDLE, not APPROVED
    if (amount === undefined) {
      setState(ApprovalState.IDLE);
      return;
    }

    if (amount === BigInt(0)) {
      setState(ApprovalState.APPROVED);
      return;
    }

    if (isCheckingAllowance) {
      setState(ApprovalState.CHECKING);
      return;
    }

    if (allowanceError) {
      setState(ApprovalState.IDLE);
      return;
    }

    if (allowance !== undefined && allowance >= amount) {
      setState(ApprovalState.APPROVED);
    } else if (state !== ApprovalState.ERROR) {
      setState(ApprovalState.IDLE);
    }
  }, [isConnected, userAddress, amount, allowance, isCheckingAllowance, allowanceError, state, isApproving]);

  /**
   * Execute approval transaction
   * Prevents double approval while transaction is pending
   */
  const handleApprove = useCallback(async () => {
    // Validation checks
    if (!userAddress || !isConnected) {
      setError('Wallet not connected');
      setState(ApprovalState.ERROR);
      return;
    }

    if (!amount || amount === BigInt(0)) {
      setError('Invalid amount');
      setState(ApprovalState.ERROR);
      return;
    }

    // Prevent double approval using ref (immediate check, no closure issue)
    if (isApprovingRef.current) {
      return;
    }

    try {
      isApprovingRef.current = true;
      setIsApproving(true);
      setState(ApprovalState.APPROVING);
      setError(null);

      // Execute approval transaction
      const tx = await writeContractAsync({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spenderAddress, amount],
      });

      // Success - state will be updated by useEffect after allowance refetch
      // Just mark as no longer approving
      // setState will be handled by useEffect when allowance updates
    } catch (err: any) {
      // Handle errors
      const errorMessage = err?.message || 'Approval failed';
      setError(errorMessage);
      setState(ApprovalState.ERROR);
      console.error('Approval error:', err);
    } finally {
      isApprovingRef.current = false;
      setIsApproving(false);
    }
  }, [
    userAddress,
    isConnected,
    amount,
    isApproving,
    tokenAddress,
    spenderAddress,
    writeContractAsync,
  ]);

  // Compute loading state
  const isLoading = isCheckingAllowance || isApproving || state === ApprovalState.APPROVING;

  return {
    needsApproval,
    state,
    handleApprove,
    isLoading,
    error,
  };
};
