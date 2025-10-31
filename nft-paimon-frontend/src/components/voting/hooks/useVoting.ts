'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { formatUnits } from 'viem';
import {
  VotingState,
  VotingFormData,
  VotingPower,
  VoteValidation,
  VoteAllocation,
  Gauge,
} from '../types';
import {
  VOTING_ADDRESSES,
  VOTING_CONFIG,
  VOTING_MESSAGES,
  MOCK_GAUGES,
  calculateVotingPower,
} from '../constants';

// GaugeController ABI (simplified for voting)
const GAUGE_CONTROLLER_ABI = [
  {
    inputs: [
      { name: '_gauges', type: 'address[]' },
      { name: '_weights', type: 'uint256[]' },
    ],
    name: 'vote',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// VotingEscrow ABI (to get user's voting power)
const VOTING_ESCROW_ABI = [
  {
    inputs: [{ name: '_addr', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const useVoting = () => {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // Form state - using Map for allocations
  const [allocations, setAllocations] = useState<Map<string, number>>(new Map());

  // Voting state
  const [votingState, setVotingState] = useState<VotingState>(VotingState.IDLE);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Get user's voting power from VotingEscrow
  const { data: votingPowerData } = useReadContract({
    address: VOTING_ADDRESSES.VOTING_ESCROW,
    abi: VOTING_ESCROW_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // Mock gauges (in production, fetch from GaugeController)
  const gauges: Gauge[] = MOCK_GAUGES;

  // Calculate current epoch (mock - in production, fetch from GaugeController)
  const currentEpoch = useMemo(() => {
    return {
      number: 152,
      endTime: Math.floor(Date.now() / 1000) + 6 * 24 * 60 * 60, // 6 days from now
    };
  }, []);

  // Calculate voting power breakdown
  const votingPower = useMemo((): VotingPower | null => {
    if (!votingPowerData || votingPowerData === BigInt(0)) {
      return null;
    }

    const total = votingPowerData;
    const totalFormatted = formatUnits(total, 18);

    // Calculate total allocated percentage
    let totalAllocatedPercentage = 0;
    allocations.forEach((percentage) => {
      totalAllocatedPercentage += percentage;
    });

    // Calculate allocated and remaining power
    const allocated = calculateVotingPower(total, totalAllocatedPercentage);
    const allocatedFormatted = formatUnits(allocated, 18);

    const remaining = total - allocated;
    const remainingFormatted = formatUnits(remaining, 18);

    return {
      total,
      totalFormatted,
      allocated,
      allocatedFormatted,
      remaining,
      remainingFormatted,
      allocationPercentage: totalAllocatedPercentage,
    };
  }, [votingPowerData, allocations]);

  // Validate votes
  const validation = useMemo((): VoteValidation => {
    if (!isConnected) {
      return { isValid: false, error: VOTING_MESSAGES.CONNECT_WALLET };
    }

    if (!votingPower || votingPower.total === BigInt(0)) {
      return { isValid: false, error: VOTING_MESSAGES.NO_VOTING_POWER };
    }

    if (allocations.size === 0) {
      return { isValid: false, error: VOTING_MESSAGES.NO_ALLOCATION };
    }

    // Check total allocation doesn't exceed 100%
    let totalPercentage = 0;
    allocations.forEach((percentage) => {
      totalPercentage += percentage;
    });

    if (totalPercentage > 100) {
      return { isValid: false, error: VOTING_MESSAGES.INVALID_ALLOCATION };
    }

    return { isValid: true };
  }, [isConnected, votingPower, allocations]);

  // Update allocation for a gauge
  const handleAllocationChange = useCallback(
    (gaugeAddress: `0x${string}`, percentage: number) => {
      setAllocations((prev) => {
        const newAllocations = new Map(prev);
        if (percentage === 0) {
          newAllocations.delete(gaugeAddress);
        } else {
          newAllocations.set(gaugeAddress, percentage);
        }
        return newAllocations;
      });
      setVotingState(VotingState.INPUT);
    },
    []
  );

  // Reset all allocations
  const handleResetAllocations = useCallback(() => {
    setAllocations(new Map());
    setVotingState(VotingState.IDLE);
  }, []);

  // Submit votes to GaugeController
  const handleSubmitVotes = useCallback(async () => {
    if (!address || !validation.isValid || allocations.size === 0) return;

    try {
      setVotingState(VotingState.VOTING);

      // Convert allocations to arrays for contract call
      const voteAllocations: VoteAllocation[] = [];
      allocations.forEach((percentage, gaugeAddress) => {
        // Convert percentage to basis points (1% = 100 basis points)
        const weight = Math.floor(percentage * 100);
        voteAllocations.push({
          gauge: gaugeAddress as `0x${string}`,
          weight,
        });
      });

      const gaugeAddresses = voteAllocations.map((v) => v.gauge);
      const weights = voteAllocations.map((v) => BigInt(v.weight));

      // Submit batch vote to GaugeController
      await writeContractAsync({
        address: VOTING_ADDRESSES.GAUGE_CONTROLLER,
        abi: GAUGE_CONTROLLER_ABI,
        functionName: 'vote',
        args: [gaugeAddresses, weights],
      });

      setVotingState(VotingState.SUCCESS);

      // Reset state after 3 seconds
      setTimeout(() => {
        setVotingState(VotingState.IDLE);
        handleResetAllocations();
      }, 3000);
    } catch (error) {
      console.error('Voting error:', error);
      setVotingState(VotingState.ERROR);
      setErrorMessage(VOTING_MESSAGES.VOTE_ERROR);
    }
  }, [address, validation, allocations, writeContractAsync, handleResetAllocations]);

  return {
    // Gauges
    gauges,

    // Allocations
    allocations,
    handleAllocationChange,
    handleResetAllocations,

    // Voting power
    votingPower,

    // Validation
    validation,

    // State
    votingState,
    errorMessage,

    // Epoch
    currentEpoch,

    // Actions
    handleSubmitVotes,
  };
};
