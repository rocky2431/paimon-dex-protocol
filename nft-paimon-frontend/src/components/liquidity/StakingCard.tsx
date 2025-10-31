'use client';

import { Card, Typography, Box, Stack, Grid } from '@mui/material';
import { PoolSelector } from './PoolSelector';
import { StakeAmountInput } from './StakeAmountInput';
import { StakingStats } from './StakingStats';
import { RewardsDisplay } from './RewardsDisplay';
import { StakingButton } from './StakingButton';
import { useStaking } from './hooks/useStaking';
import { LIQUIDITY_DESIGN_TOKENS, ANIMATION_CONFIG } from './constants';

/**
 * StakingCard Component
 * OlympusDAO-inspired main container for liquidity mining staking
 *
 * Features:
 * - Pool selection
 * - Stake/Unstake tabs with amount input
 * - Staking statistics
 * - Rewards display with claim button
 * - Staking button with state machine
 * - State management via useStaking hook
 */
export const StakingCard: React.FC = () => {
  const {
    formData,
    stakingState,
    validation,
    errorMessage,
    stakingInfo,
    handlePoolSelect,
    handleActionChange,
    handleAmountChange,
    handleAction,
    handleClaimRewards,
  } = useStaking();

  return (
    <Box sx={{ maxWidth: 900, margin: '0 auto' }}>
      <Card
        sx={{
          borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_LARGE,
          padding: 6,
          backgroundColor: 'background.paper',
          boxShadow: LIQUIDITY_DESIGN_TOKENS.SHADOW_CARD,
          transition: `all ${ANIMATION_CONFIG.DURATION_NORMAL} ${ANIMATION_CONFIG.EASE_OUT_EXPO}`,

          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: LIQUIDITY_DESIGN_TOKENS.SHADOW_CARD_HOVER,
          },
        }}
      >
        {/* Card header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h2" fontWeight={700} color="text.primary" sx={{ fontSize: '2rem' }}>
            Liquidity Mining
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5, fontSize: '1rem' }}>
            Stake LP tokens to earn PAIMON rewards
          </Typography>
        </Box>

        {/* Pool selector */}
        <Box sx={{ mb: 3 }}>
          <PoolSelector
            selectedPool={formData.pool}
            onPoolSelect={handlePoolSelect}
            disabled={false}
          />
        </Box>

        {formData.pool && (
          <>
            {/* Two column layout */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              {/* Left column: Staking actions */}
              <Grid item xs={12} md={6}>
                <Stack spacing={3}>
                  {/* Stake/Unstake input */}
                  <StakeAmountInput
                    action={formData.action}
                    onActionChange={handleActionChange}
                    lpSymbol={formData.pool.name}
                    balance={formData.action === 'stake' ? formData.lpBalance : formData.stakedBalance}
                    amount={formData.amount}
                    onAmountChange={handleAmountChange}
                    disabled={false}
                  />

                  {/* Staking button */}
                  <StakingButton
                    state={stakingState}
                    onClick={handleAction}
                    disabled={!validation.isValid}
                    errorMessage={validation.error}
                  />

                  {/* Validation error message */}
                  {!validation.isValid && validation.error && (
                    <Typography
                      variant="caption"
                      color="error"
                      sx={{
                        display: 'block',
                        textAlign: 'center',
                        fontSize: '0.875rem',
                      }}
                    >
                      {validation.error}
                    </Typography>
                  )}
                </Stack>
              </Grid>

              {/* Right column: Stats and rewards */}
              <Grid item xs={12} md={6}>
                <Stack spacing={3}>
                  {/* Staking stats */}
                  {stakingInfo && (
                    <StakingStats
                      stakedBalance={formData.stakedBalance}
                      lpSymbol={formData.pool.name}
                      totalStaked={stakingInfo.totalStaked}
                      apr={stakingInfo.apr}
                      tvl={formData.pool.tvl}
                    />
                  )}
                </Stack>
              </Grid>
            </Grid>

            {/* Rewards display (full width) */}
            <Box sx={{ mb: 3 }}>
              <RewardsDisplay
                earnedRewards={formData.earnedRewards}
                onClaim={handleClaimRewards}
                isClaiming={stakingState === 'CLAIMING'}
                disabled={false}
              />
            </Box>
          </>
        )}

        {/* Helper text */}
        {formData.pool && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'block',
              mt: 2,
              textAlign: 'center',
              fontSize: '0.75rem',
            }}
          >
            Stake your {formData.pool.name} LP tokens to earn {formData.pool.apr} APR in PAIMON rewards
          </Typography>
        )}
      </Card>
    </Box>
  );
};
