'use client';

import { Box, Container, Typography, CircularProgress } from '@mui/material';
import { useRewards } from './hooks/useRewards';
import { RewardsSummary } from './RewardsSummary';
import { PoolRewardsList } from './PoolRewardsList';
import { ClaimAllButton } from './ClaimAllButton';
import { VestingModeIndicator } from './VestingModeIndicator';
import { RewardBreakdown } from './RewardBreakdown';
import { RewardsDashboardState } from './types';
import { useRewardDistributorVesting } from '@/hooks/useRewardDistributor';

/**
 * RewardsDashboard Component
 * Main container for rewards management interface
 *
 * Features:
 * - Aggregated rewards summary
 * - Pool-by-pool breakdown
 * - One-click claim all rewards
 * - Real-time data updates
 */
export const RewardsDashboard: React.FC = () => {
  const {
    poolRewards,
    summary,
    dashboardState,
    validation,
    errorMessage,
    handleClaimSingle,
    handleClaimAll,
  } = useRewards();

  // Query vesting mode
  const { data: useEsVesting, isLoading: vestingLoading } = useRewardDistributorVesting();

  const isLoading =
    dashboardState === RewardsDashboardState.LOADING ||
    dashboardState === RewardsDashboardState.CLAIMING;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            mb: 1,
            background: 'linear-gradient(90deg, #ff9800, #ffb74d)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Rewards Dashboard
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Manage and claim your liquidity mining rewards
        </Typography>
      </Box>

      {/* Loading State */}
      {dashboardState === RewardsDashboardState.LOADING && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#ff9800' }} />
        </Box>
      )}

      {/* Content */}
      {dashboardState !== RewardsDashboardState.LOADING && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Vesting Mode Indicator */}
          <VestingModeIndicator useEsVesting={useEsVesting} loading={vestingLoading} />

          {/* Summary Card */}
          <RewardsSummary summary={summary} />

          {/* Reward Breakdown - Show example with first pool reward */}
          {poolRewards.length > 0 && poolRewards[0].earnedRewards > 0n && (
            <RewardBreakdown
              baseReward={poolRewards[0].earnedRewards}
              boostMultiplier={10000n} // TODO: Get from BoostStaking contract
              useEsVesting={useEsVesting || false}
            />
          )}

          {/* Two-Column Layout */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
              gap: 3,
            }}
          >
            {/* Left: Pool Rewards List */}
            <PoolRewardsList
              poolRewards={poolRewards}
              onClaimSingle={handleClaimSingle}
              isLoading={isLoading}
            />

            {/* Right: Claim All Button - Multi-Asset */}
            <ClaimAllButton
              summary={summary}
              dashboardState={dashboardState}
              validation={validation}
              onClaimAll={handleClaimAll}
            />
          </Box>

          {/* Error Message */}
          {errorMessage && (
            <Box
              sx={{
                p: 2,
                borderRadius: '12px',
                backgroundColor: 'rgba(244, 67, 54, 0.1)',
                border: '1px solid rgba(244, 67, 54, 0.3)',
              }}
            >
              <Typography variant="body2" sx={{ color: '#f44336' }}>
                {errorMessage}
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Container>
  );
};
