'use client';

import { useState } from 'react';
import { Box, Container, Typography, Button, Grid } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { Navigation } from '@/components/layout';
import {
  BoostStakingCard,
  BoostStakeModal,
  BoostUnstakeButton,
  BoostCalculator,
  BoostHistory,
} from '@/components/boost';
import { useAccount, useReadContract } from 'wagmi';
import {
  useBoostStakingAmount,
  useBoostStakingTime,
  useBoostMultiplier,
  useCanUnstake,
  useBoostStake,
  useBoostUnstake,
} from '@/hooks/useBoostStaking';
import { formatUnits, parseUnits } from 'viem';
import { formatBoostMultiplier, calculateTimeRemaining } from '@/components/boost/constants';
import { BoostStake } from '@/components/boost/types';
import { testnet } from '@/config/chains/testnet';

// Standard ERC20 ABI (balanceOf)
const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
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
] as const;

/**
 * Boost Page
 * Route: /boost
 *
 * Features:
 * - View current Boost staking status
 * - Display boost multiplier (1.0x - 1.5x)
 * - Show unlock countdown
 * - Stake PAIMON to boost rewards
 * - Unstake PAIMON (after 7-day lock)
 *
 * Phase 1: Read-only display (✅ completed)
 * Phase 2: Stake/unstake actions (✅ completed)
 * Phase 3: Calculator and history (✅ completed)
 */
export default function BoostPage() {
  const { address, isConnected } = useAccount();

  // Modal state
  const [stakeModalOpen, setStakeModalOpen] = useState(false);

  // Write hooks
  const { writeContractAsync: stakeAsync, isPending: isStaking } = useBoostStake();
  const { writeContractAsync: unstakeAsync, isPending: isUnstaking } = useBoostUnstake();

  // Read hooks - Boost staking data
  const { data: stakedAmount, isLoading: isLoadingAmount, error: errorAmount, refetch: refetchAmount } = useBoostStakingAmount(address);
  const { data: stakeTime, isLoading: isLoadingTime, refetch: refetchTime } = useBoostStakingTime(address);
  const { data: boostMultiplier, isLoading: isLoadingMultiplier, refetch: refetchMultiplier } = useBoostMultiplier(address);
  const { data: canUnstake, isLoading: isLoadingUnstake, refetch: refetchUnstake } = useCanUnstake(address);

  // Read PAIMON balance
  const { data: paimonBalance, refetch: refetchBalance } = useReadContract({
    address: testnet.tokens.paimon,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Combine loading states
  const isLoading = isLoadingAmount || isLoadingTime || isLoadingMultiplier || isLoadingUnstake;

  // Error handling
  const error = errorAmount ? 'Failed to load boost data' : undefined;

  // Format balance
  const paimonBalanceFormatted = paimonBalance
    ? formatUnits(paimonBalance as bigint, 18)
    : '0';

  // Format current staked
  const currentStakedFormatted = stakedAmount
    ? formatUnits(stakedAmount as bigint, 18)
    : '0';

  // Transform data to BoostStake type
  let stake: BoostStake | undefined;
  if (
    stakedAmount !== undefined &&
    stakeTime !== undefined &&
    boostMultiplier !== undefined &&
    canUnstake !== undefined
  ) {
    const amount = stakedAmount as bigint;
    const time = Number(stakeTime);
    const multiplier = Number(boostMultiplier);
    const unlocked = canUnstake as boolean;

    // Only create stake object if user has staked amount
    if (amount > 0n) {
      stake = {
        amount,
        amountFormatted: formatUnits(amount, 18),
        stakeTime: time,
        unlockTime: time + 7 * 24 * 60 * 60, // 7 days
        boostMultiplier: multiplier,
        boostMultiplierFormatted: formatBoostMultiplier(multiplier),
        canUnstake: unlocked,
        timeRemaining: calculateTimeRemaining(time),
      };
    }
  }

  // Handle stake
  const handleStake = async (amount: string) => {
    if (!address) return;

    try {
      // 1. Approve BoostStaking contract to spend PAIMON
      await stakeAsync({
        address: testnet.tokens.paimon,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [testnet.tokens.boostStaking, parseUnits(amount, 18)],
      });

      // 2. Stake PAIMON
      await stakeAsync({
        address: testnet.tokens.boostStaking,
        abi: [
          {
            inputs: [{ name: 'amount', type: 'uint256' }],
            name: 'stake',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
          },
        ] as const,
        functionName: 'stake',
        args: [parseUnits(amount, 18)],
      });

      // 3. Refetch data
      await Promise.all([
        refetchAmount(),
        refetchTime(),
        refetchMultiplier(),
        refetchUnstake(),
        refetchBalance(),
      ]);

      // 4. Close modal
      setStakeModalOpen(false);
    } catch (error) {
      // Error will be displayed by modal
      throw error;
    }
  };

  // Handle unstake
  const handleUnstake = async () => {
    if (!address) return;

    try {
      // Unstake PAIMON
      await unstakeAsync({
        address: testnet.tokens.boostStaking,
        abi: [
          {
            inputs: [],
            name: 'unstake',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
          },
        ] as const,
        functionName: 'unstake',
      });

      // Refetch data
      await Promise.all([
        refetchAmount(),
        refetchTime(),
        refetchMultiplier(),
        refetchUnstake(),
        refetchBalance(),
      ]);
    } catch (error) {
      // Error will be displayed by button component
      throw error;
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Top navigation bar */}
      <Navigation activePage="boost" />

      {/* Main content area */}
      <Container
        maxWidth="lg"
        sx={{
          pt: 12, // Account for fixed navbar
          pb: 8,
          px: {
            xs: 2,
            sm: 3,
          },
          minHeight: '100vh',
        }}
      >
        {/* Huge whitespace (OlympusDAO style) */}
        <Box sx={{ height: { xs: 40, sm: 60 } }} />

        {/* Page Title */}
        <Typography
          variant="h3"
          sx={{
            mb: 2,
            fontWeight: 700,
            background: 'linear-gradient(90deg, #ff6b00, #ff8c00)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Boost Staking
        </Typography>

        <Typography
          variant="body1"
          sx={{
            mb: 4,
            color: 'text.secondary',
            maxWidth: '600px',
          }}
        >
          Stake PAIMON to boost your rewards from 1.0x to 1.5x. Minimum 7-day lock period.
        </Typography>

        {/* Wallet Connection Check */}
        {!isConnected ? (
          <Box
            sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: '24px',
              border: '1px solid rgba(255, 107, 0, 0.2)',
              backgroundColor: 'rgba(255, 107, 0, 0.05)',
            }}
          >
            <Typography variant="h6" sx={{ color: '#ff6b00', mb: 1 }}>
              Connect Wallet
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Please connect your wallet to view your Boost staking status.
            </Typography>
          </Box>
        ) : (
          <>
            {/* Boost Staking Card */}
            <BoostStakingCard stake={stake} isLoading={isLoading} error={error} />

            {/* Action Buttons */}
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12} sm={6}>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<AddIcon />}
                  onClick={() => setStakeModalOpen(true)}
                  disabled={isStaking}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    py: 1.5,
                    backgroundColor: '#ff6b00',
                    '&:hover': {
                      backgroundColor: '#ff8c00',
                    },
                  }}
                >
                  Stake PAIMON
                </Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <BoostUnstakeButton
                  canUnstake={stake?.canUnstake || false}
                  stakedAmount={stake?.amountFormatted || '0'}
                  onUnstake={handleUnstake}
                  unstaking={isUnstaking}
                />
              </Grid>
            </Grid>

            {/* Huge whitespace (OlympusDAO style) */}
            <Box sx={{ height: { xs: 40, sm: 60 } }} />

            {/* Calculator & History Section */}
            <Grid container spacing={3}>
              {/* Boost Calculator */}
              <Grid item xs={12} lg={6}>
                <BoostCalculator
                  userBalance={paimonBalanceFormatted}
                  currentMultiplier={boostMultiplier ? Number(boostMultiplier) : 10000}
                />
              </Grid>

              {/* Boost History */}
              <Grid item xs={12} lg={6}>
                <BoostHistory
                  entries={[]}
                  isLoading={false}
                />
              </Grid>
            </Grid>
          </>
        )}

        {/* Huge whitespace (OlympusDAO style) */}
        <Box sx={{ height: { xs: 40, sm: 60 } }} />
      </Container>

      {/* Stake Modal */}
      <BoostStakeModal
        open={stakeModalOpen}
        userBalance={paimonBalanceFormatted}
        currentStaked={currentStakedFormatted}
        onClose={() => setStakeModalOpen(false)}
        onStake={handleStake}
        staking={isStaking}
      />
    </Box>
  );
}
