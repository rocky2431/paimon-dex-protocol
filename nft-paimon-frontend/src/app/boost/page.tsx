'use client';

import { Box, Container, Typography } from '@mui/material';
import { Navigation } from '@/components/layout';
import { BoostStakingCard } from '@/components/boost';
import { useAccount } from 'wagmi';
import {
  useBoostStakingAmount,
  useBoostStakingTime,
  useBoostMultiplier,
  useCanUnstake,
} from '@/hooks/useBoostStaking';
import { formatUnits } from 'viem';
import { formatBoostMultiplier, calculateTimeRemaining } from '@/components/boost/constants';
import { BoostStake } from '@/components/boost/types';

/**
 * Boost Page
 * Route: /boost
 *
 * Features:
 * - View current Boost staking status
 * - Display boost multiplier (1.0x - 1.5x)
 * - Show unlock countdown
 * - Stake/unstake PAIMON (future phase)
 *
 * Phase 1: Read-only display (completed)
 * Phase 2: Stake/unstake actions (TODO)
 * Phase 3: Calculator and history (TODO)
 */
export default function BoostPage() {
  const { address, isConnected } = useAccount();

  // Fetch boost staking data using wagmi hooks
  const { data: stakedAmount, isLoading: isLoadingAmount, error: errorAmount } = useBoostStakingAmount(address);
  const { data: stakeTime, isLoading: isLoadingTime } = useBoostStakingTime(address);
  const { data: boostMultiplier, isLoading: isLoadingMultiplier } = useBoostMultiplier(address);
  const { data: canUnstake, isLoading: isLoadingUnstake } = useCanUnstake(address);

  // Combine loading states
  const isLoading = isLoadingAmount || isLoadingTime || isLoadingMultiplier || isLoadingUnstake;

  // Error handling
  const error = errorAmount ? 'Failed to load boost data' : undefined;

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

            {/* Huge whitespace (OlympusDAO style) */}
            <Box sx={{ height: { xs: 40, sm: 60 } }} />

            {/* Phase 2 & 3 Placeholders (TODO) */}
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 4, textAlign: 'center' }}>
              🚧 Phase 2: Stake/Unstake actions (Coming soon)
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, textAlign: 'center' }}>
              🚧 Phase 3: Boost Calculator & History (Coming soon)
            </Typography>
          </>
        )}

        {/* Huge whitespace (OlympusDAO style) */}
        <Box sx={{ height: { xs: 40, sm: 60 } }} />
      </Container>
    </Box>
  );
}
