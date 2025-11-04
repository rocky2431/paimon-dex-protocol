'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAccount, useBalance, useReadContract, useWriteContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import {
  LockState,
  VeNFTFormData,
  VeNFTCalculation,
  LockValidation,
  VeNFTBalance,
} from '../types';
import {
  VENFT_ADDRESSES,
  LOCK_DURATION,
  VOTING_POWER,
  VENFT_MESSAGES,
  MIN_LOCK_AMOUNT,
  SLIDER_CONFIG,
} from '../constants';

// VotingEscrow ABI (simplified)
const VOTING_ESCROW_ABI = [
  {
    inputs: [
      { name: '_value', type: 'uint256' },
      { name: '_lockDuration', type: 'uint256' },
    ],
    name: 'createLock',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// ERC20 ABI (for approve)
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

export const useVeNFT = () => {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // Form state
  const [formData, setFormData] = useState<VeNFTFormData>({
    lockAmount: '',
    lockDuration: SLIDER_CONFIG.DEFAULT_DURATION, // 1 year default
  });

  // Lock state
  const [lockState, setLockState] = useState<LockState>(LockState.IDLE);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Get USDP balance
  const { data: hydBalance } = useBalance({
    address,
    token: VENFT_ADDRESSES.USDP_TOKEN,
  });

  // Check allowance
  const { data: allowance } = useReadContract({
    address: VENFT_ADDRESSES.USDP_TOKEN,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, VENFT_ADDRESSES.VOTING_ESCROW] : undefined,
  });

  // Calculate voting power
  const calculation = useMemo((): VeNFTCalculation | null => {
    if (!formData.lockAmount || formData.lockAmount === '0') {
      return null;
    }

    try {
      const lockAmountBigInt = parseUnits(formData.lockAmount, 18); // USDP has 18 decimals

      // Calculate voting power
      const votingPowerBigInt = VOTING_POWER.calculateVotingPower(
        lockAmountBigInt,
        formData.lockDuration
      );

      // Calculate unlock date
      const unlockDate = new Date(Date.now() + formData.lockDuration * 1000);

      // Calculate power percentage
      const powerPercentage = VOTING_POWER.calculatePowerPercentage(
        formData.lockDuration
      );

      return {
        lockAmount: lockAmountBigInt,
        lockDuration: formData.lockDuration,
        votingPower: votingPowerBigInt,
        votingPowerFormatted: formatUnits(votingPowerBigInt, 18),
        unlockDate,
        powerPercentage,
      };
    } catch (error) {
      return null;
    }
  }, [formData.lockAmount, formData.lockDuration]);

  // Validate lock
  const validation = useMemo((): LockValidation => {
    if (!isConnected) {
      return { isValid: false, error: VENFT_MESSAGES.CONNECT_WALLET };
    }

    if (!formData.lockAmount || formData.lockAmount === '0') {
      return { isValid: false, error: VENFT_MESSAGES.INVALID_AMOUNT };
    }

    const lockAmountNumber = parseFloat(formData.lockAmount);
    if (lockAmountNumber < parseFloat(MIN_LOCK_AMOUNT)) {
      return { isValid: false, error: VENFT_MESSAGES.MIN_LOCK_AMOUNT };
    }

    if (
      formData.lockDuration < LOCK_DURATION.MIN_LOCK ||
      formData.lockDuration > LOCK_DURATION.MAX_LOCK
    ) {
      return { isValid: false, error: VENFT_MESSAGES.INVALID_DURATION };
    }

    if (!calculation) {
      return { isValid: false, error: VENFT_MESSAGES.INVALID_AMOUNT };
    }

    if (hydBalance && calculation.lockAmount > hydBalance.value) {
      return { isValid: false, error: VENFT_MESSAGES.INSUFFICIENT_BALANCE };
    }

    return { isValid: true };
  }, [isConnected, formData, calculation, hydBalance]);

  // Update lock amount
  const handleAmountChange = useCallback((amount: string) => {
    setFormData((prev) => ({ ...prev, lockAmount: amount }));
    setLockState(LockState.INPUT);
  }, []);

  // Update lock duration
  const handleDurationChange = useCallback((duration: number) => {
    setFormData((prev) => ({ ...prev, lockDuration: duration }));
    setLockState(LockState.INPUT);
  }, []);

  // Set max amount
  const handleMaxClick = useCallback(() => {
    if (hydBalance) {
      const maxAmount = formatUnits(hydBalance.value, hydBalance.decimals);
      handleAmountChange(maxAmount);
    }
  }, [hydBalance, handleAmountChange]);

  // Approve USDP
  const handleApprove = useCallback(async () => {
    if (!address || !calculation) return;

    try {
      setLockState(LockState.APPROVING);

      await writeContractAsync({
        address: VENFT_ADDRESSES.USDP_TOKEN,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [VENFT_ADDRESSES.VOTING_ESCROW, calculation.lockAmount],
      });

      setLockState(LockState.APPROVED);
    } catch (error) {
      console.error('Approval error:', error);
      setLockState(LockState.ERROR);
      setErrorMessage(VENFT_MESSAGES.APPROVAL_ERROR);
    }
  }, [address, calculation, writeContractAsync]);

  // Create lock
  const handleCreateLock = useCallback(async () => {
    if (!address || !calculation || !validation.isValid) return;

    try {
      // Check if approval needed
      if (!allowance || allowance < calculation.lockAmount) {
        await handleApprove();
        return;
      }

      setLockState(LockState.CREATING);

      // Create lock on VotingEscrow contract
      await writeContractAsync({
        address: VENFT_ADDRESSES.VOTING_ESCROW,
        abi: VOTING_ESCROW_ABI,
        functionName: 'createLock',
        args: [calculation.lockAmount, BigInt(calculation.lockDuration)],
      });

      setLockState(LockState.SUCCESS);
      setFormData({
        lockAmount: '',
        lockDuration: SLIDER_CONFIG.DEFAULT_DURATION,
      });

      // Reset state after 3 seconds
      setTimeout(() => {
        setLockState(LockState.IDLE);
      }, 3000);
    } catch (error) {
      console.error('Create lock error:', error);
      setLockState(LockState.ERROR);
      setErrorMessage(VENFT_MESSAGES.LOCK_ERROR);
    }
  }, [
    address,
    calculation,
    validation,
    allowance,
    handleApprove,
    writeContractAsync,
  ]);

  return {
    // Form data
    formData,
    setFormData,

    // Balance
    hydBalance: hydBalance as VeNFTBalance | undefined,

    // Calculation
    calculation,
    validation,

    // State
    lockState,
    errorMessage,

    // Actions
    handleAmountChange,
    handleDurationChange,
    handleMaxClick,
    handleCreateLock,
  };
};
