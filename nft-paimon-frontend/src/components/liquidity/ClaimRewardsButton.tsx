'use client';

import { Button, Box, Stack, Typography, Chip, CircularProgress, Alert } from '@mui/material';
import { useClaimRewards } from './hooks/useClaimRewards';
import { LIQUIDITY_DESIGN_TOKENS, ANIMATION_CONFIG } from './constants';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

/**
 * ClaimRewardsButton Component (gap-3.1.4)
 *
 * Button component for claiming LP rewards from Gauge contracts.
 *
 * Features:
 * - Display total claimable rewards
 * - Claim all rewards at once
 * - Show claiming status
 * - Display error messages
 * - Animated reward counter
 *
 * @returns ClaimRewardsButton component
 */
export const ClaimRewardsButton: React.FC = () => {
  const {
    totalRewards,
    claimableGauges,
    isClaiming,
    isLoading,
    errorMessage,
    claimAll,
  } = useClaimRewards();

  const hasRewards = totalRewards.hasRewards;
  const claimableCount = claimableGauges.length;

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_LARGE,
        background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.12) 0%, rgba(255, 87, 34, 0.08) 100%)',
        backdropFilter: 'blur(20px)',
        border: '2px solid',
        borderColor: hasRewards ? 'primary.main' : 'rgba(255, 152, 0, 0.2)',
        position: 'relative',
        overflow: 'hidden',
        transition: `all ${ANIMATION_CONFIG.DURATION_NORMAL} ${ANIMATION_CONFIG.EASE_OUT_EXPO}`,

        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: hasRewards
            ? 'radial-gradient(circle at 50% 50%, rgba(255, 152, 0, 0.08) 0%, transparent 70%)'
            : 'none',
          animation: hasRewards ? 'pulse 2s infinite' : 'none',
        },

        '@keyframes pulse': {
          '0%, 100%': {
            opacity: 1,
          },
          '50%': {
            opacity: 0.5,
          },
        },

        '&:hover': {
          transform: hasRewards ? 'translateY(-2px)' : 'none',
          boxShadow: hasRewards ? LIQUIDITY_DESIGN_TOKENS.SHADOW_BUTTON : 'none',
        },
      }}
    >
      <Stack spacing={2} alignItems="center" sx={{ position: 'relative', zIndex: 1 }}>
        {/* Header with icon */}
        <Stack direction="row" alignItems="center" spacing={1}>
          <LocalFireDepartmentIcon
            sx={{
              fontSize: '1.5rem',
              color: 'primary.main',
              animation: hasRewards ? 'flicker 1.5s infinite' : 'none',

              '@keyframes flicker': {
                '0%, 100%': {
                  opacity: 1,
                  transform: 'scale(1)',
                },
                '50%': {
                  opacity: 0.8,
                  transform: 'scale(1.1)',
                },
              },
            }}
          />
          <Typography variant="subtitle2" color="text.secondary" fontSize="0.875rem" fontWeight={600}>
            LP Rewards
          </Typography>
        </Stack>

        {/* Total rewards display */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography
            variant="h4"
            fontWeight={700}
            color={hasRewards ? 'primary.main' : 'text.secondary'}
            sx={{
              fontSize: '2rem',
              textShadow: hasRewards ? '0 0 20px rgba(255, 152, 0, 0.3)' : 'none',
              transition: 'all 0.3s ease',
            }}
          >
            {isLoading ? '...' : totalRewards.formatted}
          </Typography>
          <Typography variant="body2" color="text.secondary" fontWeight={600} fontSize="0.75rem">
            PAIMON
          </Typography>
        </Box>

        {/* Claimable gauges count */}
        {claimableCount > 0 && (
          <Chip
            icon={<CheckCircleIcon />}
            label={`${claimableCount} Pool${claimableCount > 1 ? 's' : ''}`}
            size="small"
            sx={{
              backgroundColor: 'rgba(255, 152, 0, 0.15)',
              color: 'primary.main',
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          />
        )}

        {/* Error message */}
        {errorMessage && (
          <Alert severity="error" sx={{ width: '100%', fontSize: '0.75rem' }}>
            {errorMessage}
          </Alert>
        )}

        {/* Claim button */}
        <Button
          fullWidth
          onClick={claimAll}
          disabled={!hasRewards || isClaiming || isLoading}
          startIcon={
            isClaiming ? <CircularProgress size={16} color="inherit" /> : undefined
          }
          sx={{
            py: 1.25,
            borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_PILL,
            backgroundColor: 'primary.main',
            color: 'white',
            fontWeight: 700,
            fontSize: '0.875rem',
            textTransform: 'none',
            boxShadow: hasRewards ? LIQUIDITY_DESIGN_TOKENS.SHADOW_BUTTON : 'none',
            transition: `all ${ANIMATION_CONFIG.DURATION_NORMAL} ${ANIMATION_CONFIG.EASE_OUT_EXPO}`,

            '&:hover': {
              backgroundColor: 'primary.dark',
              transform: hasRewards ? 'scale(1.02)' : 'none',
            },

            '&:disabled': {
              backgroundColor: 'action.disabledBackground',
              color: 'text.disabled',
            },
          }}
        >
          {isClaiming ? 'Claiming...' : `Claim${claimableCount > 1 ? ' All' : ''} Rewards`}
        </Button>
      </Stack>
    </Box>
  );
};
