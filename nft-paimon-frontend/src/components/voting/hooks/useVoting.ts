'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, useReadContracts } from 'wagmi';
import { formatUnits, type Address } from 'viem';
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
  calculateVotingPower,
} from '../constants';
import { useGauges } from '@/hooks/useGauges';
import {
  GAUGE_CONTROLLER_ABI,
  GAUGE_CONTROLLER_ADDRESS,
} from '@/config/contracts/gaugeController';
import { findPoolByAddress } from '@/config/pools';

// VotingEscrow ABI (to get user's voting power and token ID)
const VOTING_ESCROW_ABI = [
  {
    inputs: [{ name: '_addr', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '_owner', type: 'address' }, { name: '_index', type: 'uint256' }],
    name: 'tokenOfOwnerByIndex',
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

  // Get real gauge data from useGauges hook
  const { gauges: gaugeData, currentEpoch: currentEpochData, isLoading: isLoadingGauges } = useGauges();

  // Get user's voting power and token ID from VotingEscrow
  const { data: votingPowerData } = useReadContract({
    address: VOTING_ADDRESSES.VOTING_ESCROW,
    abi: VOTING_ESCROW_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // Get user's first veNFT token ID (for voting)
  const { data: tokenIdData } = useReadContract({
    address: VOTING_ADDRESSES.VOTING_ESCROW,
    abi: VOTING_ESCROW_ABI,
    functionName: 'tokenOfOwnerByIndex',
    args: address && votingPowerData && votingPowerData > BigInt(0)
      ? [address, BigInt(0)]
      : undefined,
  });

  // Transform GaugeData to Gauge format for UI
  const gauges: Gauge[] = useMemo(() => {
    return gaugeData.map((g) => {
      const pool = findPoolByAddress(g.address);
      const tokens = g.pool.split('/');

      return {
        address: g.address,
        name: g.pool,
        token0: tokens[0] || '',
        token1: tokens[1] || '',
        tvl: 'N/A', // TVL data needs separate data source
        apr: `${g.apr.toFixed(1)}%`,
        weight: Number((g.weight * BigInt(10000)) / (g.totalWeight || BigInt(1))),
      };
    });
  }, [gaugeData]);

  // Calculate current epoch from real data
  const currentEpoch = useMemo(() => {
    if (!currentEpochData) {
      return {
        number: 0,
        endTime: Math.floor(Date.now() / 1000) + 6 * 24 * 60 * 60,
      };
    }

    const epochNumber = Number(currentEpochData);
    const epochDuration = 7 * 24 * 60 * 60; // 7 days in seconds
    const currentTime = Math.floor(Date.now() / 1000);

    // Calculate epoch end time (assuming epochs start at a known time)
    // This is a simplified calculation - adjust based on actual contract logic
    const epochEndTime = currentTime + epochDuration - (currentTime % epochDuration);

    return {
      number: epochNumber,
      endTime: epochEndTime,
    };
  }, [currentEpochData]);

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
    if (!address || !validation.isValid || allocations.size === 0 || !tokenIdData) {
      if (!tokenIdData) {
        setErrorMessage('No veNFT found. Please lock PAIMON to create a veNFT first.');
      }
      return;
    }

    try {
      setVotingState(VotingState.VOTING);

      // Convert allocations to gauge IDs and weights for contract call
      const gaugeIds: bigint[] = [];
      const weights: bigint[] = [];

      allocations.forEach((percentage, gaugeAddress) => {
        // Convert percentage to basis points (1% = 100 basis points)
        const weight = Math.floor(percentage * 100);

        // Find the gauge index in gaugeData (gauge ID = index in controller)
        const gaugeIndex = gaugeData.findIndex(
          (g) => g.address.toLowerCase() === gaugeAddress.toLowerCase()
        );

        if (gaugeIndex >= 0) {
          gaugeIds.push(BigInt(gaugeIndex));
          weights.push(BigInt(weight));
        }
      });

      // Submit batch vote to GaugeController
      await writeContractAsync({
        address: GAUGE_CONTROLLER_ADDRESS,
        abi: GAUGE_CONTROLLER_ABI,
        functionName: 'batchVote',
        args: [tokenIdData, gaugeIds, weights],
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
  }, [address, validation, allocations, tokenIdData, gaugeData, writeContractAsync, handleResetAllocations]);

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
