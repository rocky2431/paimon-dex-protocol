/**
 * Convert Page - esPaimon Vesting Progress Display
 * Convert 页面 - esPaimon 归属进度显示
 */

'use client';

import React from 'react';
import { Container, Box, Typography, Paper, Grid, Alert } from '@mui/material';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import { useVestingPosition } from '@/hooks/useVestingPosition';
import VestingProgressBar from '@/components/convert/VestingProgressBar';
import ClaimVestedButton from '@/components/convert/ClaimVestedButton';

/**
 * Convert page displaying esPaimon vesting progress and claim functionality
 * 显示 esPaimon 归属进度和领取功能的页面
 */
export default function ConvertPage() {
  const { address, isConnected } = useAccount();
  const position = useVestingPosition(address);

  // Show connection prompt if wallet not connected
  if (!isConnected) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="info">
          Please connect your wallet to view your vesting position.
        </Alert>
      </Container>
    );
  }

  // Show loading state
  if (position.isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography>Loading vesting position...</Typography>
      </Container>
    );
  }

  // Show empty state if no vesting position
  if (position.totalVested === 0n) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="info">
          You don't have any esPAIMON vesting position yet.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 700, color: '#8B4513' }}>
        esPAIMON Convert
      </Typography>

      {/* Vesting Progress */}
      <Box sx={{ mb: 4 }}>
        <VestingProgressBar
          progress={position.vestingProgress}
          remainingDays={position.remainingDays}
        />
      </Box>

      {/* Vesting Details */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #FFF5E1 0%, #FFE4B5 100%)',
            }}
          >
            <Typography variant="body2" sx={{ color: '#8B4513', mb: 1 }}>
              Total Vested
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#FF6B00' }}>
              {formatUnits(position.totalVested, 18)} PAIMON
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #FFF5E1 0%, #FFE4B5 100%)',
            }}
          >
            <Typography variant="body2" sx={{ color: '#8B4513', mb: 1 }}>
              Already Vested
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#32CD32' }}>
              {formatUnits(position.vested, 18)} PAIMON
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #FFF5E1 0%, #FFE4B5 100%)',
            }}
          >
            <Typography variant="body2" sx={{ color: '#8B4513', mb: 1 }}>
              Locked
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#DC143C' }}>
              {formatUnits(position.locked, 18)} PAIMON
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper
            elevation={2}
            sx={{
              p: 3,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #FFF5E1 0%, #FFE4B5 100%)',
            }}
          >
            <Typography variant="body2" sx={{ color: '#8B4513', mb: 1 }}>
              Claimable Now
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#FFD700' }}>
              {formatUnits(position.claimable, 18)} PAIMON
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Claim Button */}
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <ClaimVestedButton claimableAmount={position.claimable} />
      </Box>

      {/* Early Exit Warning */}
      {position.vestingProgress < 100 && (
        <Alert severity="warning" sx={{ mt: 4 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Early Exit Penalty: 50%
          </Typography>
          <Typography variant="caption">
            If you exit before the full vesting period (365 days), you will forfeit 50% of your
            vested tokens. Current progress: {position.vestingProgress}%
          </Typography>
        </Alert>
      )}
    </Container>
  );
}
