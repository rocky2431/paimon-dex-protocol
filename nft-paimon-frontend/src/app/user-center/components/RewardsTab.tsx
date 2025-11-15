/**
 * Rewards Tab Component
 *
 * Migrated from /portfolio page (Task 30)
 *
 * Features:
 * - Rewards dashboard with one-click claim
 * - esPAIMON vesting progress and claims
 * - Boost staking card and calculator
 * - Boost history tracking
 */

'use client';

import { Grid, Box, Typography, Alert } from '@mui/material';
import { useAccount } from 'wagmi';
import { RewardsDashboard } from '@/components/rewards/RewardsDashboard';
import { VestingProgressBar, ClaimVestedButton } from '@/components/convert';
import { BoostStakingCard, BoostCalculator, BoostHistory } from '@/components/boost';
import { useVestingPosition } from '@/hooks/useVestingPosition';
import { useBoostData } from '@/hooks/useBoostData';

export function RewardsTab() {
  const { address } = useAccount();

  // Vesting data
  const vestingPosition = useVestingPosition(address);

  // Boost data
  const { stake: boostStake, userBalance: paimonBalance, currentMultiplier } = useBoostData();

  return (
    <>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff6b00', mb: 1 }}>
          Rewards Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Claim all rewards and manage your esPAIMON vesting and boost staking
        </Typography>
      </Box>

      {/* Rewards Dashboard */}
      <Box sx={{ mb: 6 }}>
        <RewardsDashboard />
      </Box>

      {/* esPAIMON Vesting Section */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, color: '#8B4513' }}>
          esPAIMON Vesting
        </Typography>

        {vestingPosition && vestingPosition.totalVested === 0n && (
          <Alert severity="info" sx={{ mb: 3 }}>
            No esPAIMON vesting position yet. Enable vesting in Rewards settings.
          </Alert>
        )}

        {vestingPosition && (
          <>
            <VestingProgressBar
              progress={vestingPosition.vestingProgress}
              remainingDays={vestingPosition.remainingDays}
            />

            <Box sx={{ mt: 3 }}>
              <ClaimVestedButton claimableAmount={vestingPosition.claimable || 0n} />
            </Box>
          </>
        )}
      </Box>

      {/* Boost Staking Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, color: '#D2691E' }}>
          Boost Staking
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} lg={6}>
            <BoostStakingCard stake={boostStake} />
          </Grid>
          <Grid item xs={12} lg={6}>
            <BoostCalculator userBalance={paimonBalance} currentMultiplier={currentMultiplier} />
          </Grid>
          <Grid item xs={12}>
            <BoostHistory entries={[]} />
          </Grid>
        </Grid>
      </Box>
    </>
  );
}
