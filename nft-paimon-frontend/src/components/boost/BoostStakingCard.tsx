'use client';

import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  Skeleton,
} from '@mui/material';
import { BoostStakingCardProps } from './types';
import { BOOST_DESIGN_TOKENS, formatTimeRemaining } from './constants';

/**
 * BoostStakingCard Component
 * Displays current Boost staking status
 *
 * Features:
 * - Current boost multiplier (1.0x-1.5x)
 * - Staked amount
 * - Unlock countdown
 * - Material Design 3 compliant
 * - Responsive layout
 */
export const BoostStakingCard: React.FC<BoostStakingCardProps> = ({
  stake,
  isLoading = false,
  error,
}) => {
  // Loading state
  if (isLoading) {
    return (
      <Card
        sx={{
          borderRadius: BOOST_DESIGN_TOKENS.RADIUS_LARGE,
          boxShadow: BOOST_DESIGN_TOKENS.SHADOW_CARD,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 3 }}>
            <Skeleton width={200} />
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Skeleton height={80} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Skeleton height={80} />
            </Grid>
          </Grid>
          <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
            Loading...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card
        sx={{
          borderRadius: BOOST_DESIGN_TOKENS.RADIUS_LARGE,
          boxShadow: BOOST_DESIGN_TOKENS.SHADOW_CARD,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  // Empty state (no stake)
  if (!stake) {
    return (
      <Card
        sx={{
          borderRadius: BOOST_DESIGN_TOKENS.RADIUS_LARGE,
          background: 'linear-gradient(135deg, rgba(255, 107, 0, 0.05) 0%, rgba(255, 107, 0, 0.02) 100%)',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${BOOST_DESIGN_TOKENS.COLOR_PRIMARY}33`,
          boxShadow: BOOST_DESIGN_TOKENS.SHADOW_CARD,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography
            variant="h6"
            sx={{
              mb: 2,
              fontWeight: 600,
              color: BOOST_DESIGN_TOKENS.COLOR_PRIMARY,
            }}
          >
            Boost Staking
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
            No active stake. Stake PAIMON to boost your rewards (1.0x - 1.5x).
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
            Formula: 1.0 + (amount / 1000) × 0.1, cap at 1.5x
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // Active stake state
  const unlockProgress = stake.timeRemaining === 0 ? 100 : ((7 * 24 * 60 * 60 - stake.timeRemaining) / (7 * 24 * 60 * 60)) * 100;

  return (
    <Card
      sx={{
        borderRadius: BOOST_DESIGN_TOKENS.RADIUS_LARGE,
        background: 'linear-gradient(135deg, rgba(255, 107, 0, 0.08) 0%, rgba(255, 107, 0, 0.03) 100%)',
        backdropFilter: 'blur(10px)',
        border: `1px solid ${BOOST_DESIGN_TOKENS.COLOR_PRIMARY}33`,
        boxShadow: BOOST_DESIGN_TOKENS.SHADOW_CARD,
        transition: 'box-shadow 0.3s ease',
        '&:hover': {
          boxShadow: BOOST_DESIGN_TOKENS.SHADOW_HOVER,
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              background: `linear-gradient(90deg, ${BOOST_DESIGN_TOKENS.COLOR_PRIMARY}, ${BOOST_DESIGN_TOKENS.COLOR_SECONDARY})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Active Boost
          </Typography>
          <Chip
            label={stake.canUnstake ? 'Ready' : formatTimeRemaining(stake.timeRemaining)}
            color={stake.canUnstake ? 'success' : 'default'}
            size="small"
            sx={{
              borderRadius: BOOST_DESIGN_TOKENS.RADIUS_PILL,
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          />
        </Box>

        {/* Stats Grid */}
        <Grid container spacing={3}>
          {/* Staked Amount */}
          <Grid item xs={12} sm={6}>
            <Box>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  mb: 1,
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                Staked Amount
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    color: BOOST_DESIGN_TOKENS.COLOR_PRIMARY,
                  }}
                >
                  {stake.amountFormatted}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    fontSize: '0.875rem',
                  }}
                >
                  PAIMON
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Boost Multiplier */}
          <Grid item xs={12} sm={6}>
            <Box>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  mb: 1,
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                Boost Multiplier
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    color: BOOST_DESIGN_TOKENS.COLOR_SECONDARY,
                  }}
                >
                  {stake.boostMultiplierFormatted}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    fontSize: '0.875rem',
                  }}
                >
                  ({((stake.boostMultiplier - 10000) / 100).toFixed(0)}% boost)
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Unlock Progress */}
        {!stake.canUnstake && (
          <Box sx={{ mt: 3 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 1,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                Unlock Progress
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: BOOST_DESIGN_TOKENS.COLOR_PRIMARY,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                {unlockProgress.toFixed(1)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={unlockProgress}
              sx={{
                height: 8,
                borderRadius: BOOST_DESIGN_TOKENS.RADIUS_PILL,
                backgroundColor: 'rgba(255, 107, 0, 0.1)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: BOOST_DESIGN_TOKENS.RADIUS_PILL,
                  background: `linear-gradient(90deg, ${BOOST_DESIGN_TOKENS.COLOR_PRIMARY}, ${BOOST_DESIGN_TOKENS.COLOR_SECONDARY})`,
                },
              }}
            />
          </Box>
        )}

        {/* Unlock Status */}
        {stake.canUnstake && (
          <Alert
            severity="success"
            sx={{
              mt: 3,
              borderRadius: BOOST_DESIGN_TOKENS.RADIUS_MEDIUM,
            }}
          >
            Your stake is unlocked! You can now unstake your PAIMON.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
