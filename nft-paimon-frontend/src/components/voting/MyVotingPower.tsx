'use client';

import { Box, Typography, Stack, LinearProgress } from '@mui/material';
import { AnimatedNumber } from '../swap/AnimatedNumber';
import { VotingPower } from './types';
import { DESIGN_TOKENS, ANIMATION_CONFIG } from './constants';

interface MyVotingPowerProps {
  votingPower: VotingPower | null;
  isLoading?: boolean;
}

/**
 * MyVotingPower Component
 * OlympusDAO-style display of user's voting power and allocation
 *
 * Features:
 * - Total voting power (from veNFT)
 * - Allocated vs remaining power
 * - Visual progress bar
 * - Animated counters
 */
export const MyVotingPower: React.FC<MyVotingPowerProps> = ({
  votingPower,
  isLoading = false,
}) => {
  if (!votingPower || isLoading) {
    return null;
  }

  const {
    totalFormatted,
    allocatedFormatted,
    remainingFormatted,
    allocationPercentage,
  } = votingPower;

  const totalValue = parseFloat(totalFormatted);
  const allocatedValue = parseFloat(allocatedFormatted);
  const remainingValue = parseFloat(remainingFormatted);

  return (
    <Box
      sx={{
        borderRadius: DESIGN_TOKENS.RADIUS_MEDIUM,
        padding: 4,
        background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
        boxShadow: DESIGN_TOKENS.SHADOW_CARD,
        transition: `all ${ANIMATION_CONFIG.DURATION_NORMAL} ${ANIMATION_CONFIG.EASE_OUT_EXPO}`,
        position: 'relative',
        overflow: 'hidden',

        // Subtle shimmer effect
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background:
            'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
          transition: 'left 0.5s',
        },

        '&:hover::before': {
          left: '100%',
        },
      }}
    >
      {/* Title */}
      <Typography
        variant="h6"
        fontWeight={700}
        color="#FFFFFF"
        sx={{
          mb: 3,
          textShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}
      >
        My Voting Power
      </Typography>

      {/* Total Power */}
      <Box
        sx={{
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          borderRadius: DESIGN_TOKENS.RADIUS_MEDIUM,
          padding: 3,
          mb: 2,
          backdropFilter: 'blur(10px)',
        }}
      >
        <Typography
          variant="body2"
          color="rgba(255, 255, 255, 0.9)"
          fontWeight={600}
          sx={{ mb: 1 }}
        >
          Total Power
        </Typography>
        <Typography
          variant="h3"
          fontWeight={700}
          color="#FFFFFF"
          sx={{
            textShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        >
          <AnimatedNumber
            value={totalValue}
            decimals={2}
            suffix=" vePower"
          />
        </Typography>
      </Box>

      {/* Allocation Progress Bar */}
      <Box sx={{ mb: 2 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 1 }}
        >
          <Typography variant="body2" color="rgba(255, 255, 255, 0.9)" fontWeight={600}>
            Allocated
          </Typography>
          <Typography variant="body2" color="#FFFFFF" fontWeight={700}>
            {allocationPercentage.toFixed(1)}%
          </Typography>
        </Stack>

        <LinearProgress
          variant="determinate"
          value={allocationPercentage}
          sx={{
            height: 12,
            borderRadius: DESIGN_TOKENS.RADIUS_SMALL,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            '& .MuiLinearProgress-bar': {
              borderRadius: DESIGN_TOKENS.RADIUS_SMALL,
              background: 'linear-gradient(90deg, #FFFFFF 0%, #FFE0B2 100%)',
              boxShadow: '0 2px 8px rgba(255, 255, 255, 0.4)',
            },
          }}
        />
      </Box>

      {/* Allocated vs Remaining */}
      <Stack
        direction="row"
        justifyContent="space-between"
        sx={{
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          borderRadius: DESIGN_TOKENS.RADIUS_SMALL,
          padding: 2,
          backdropFilter: 'blur(10px)',
        }}
      >
        <Box>
          <Typography variant="caption" color="rgba(255, 255, 255, 0.8)">
            Allocated
          </Typography>
          <Typography variant="h6" fontWeight={700} color="#FFFFFF">
            <AnimatedNumber
              value={allocatedValue}
              decimals={2}
            />
          </Typography>
        </Box>

        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="caption" color="rgba(255, 255, 255, 0.8)">
            Remaining
          </Typography>
          <Typography variant="h6" fontWeight={700} color="#FFFFFF">
            <AnimatedNumber
              value={remainingValue}
              decimals={2}
            />
          </Typography>
        </Box>
      </Stack>

      {/* Helper text */}
      <Typography
        variant="caption"
        color="rgba(255, 255, 255, 0.8)"
        sx={{
          display: 'block',
          mt: 2,
          textAlign: 'center',
          fontSize: '0.75rem',
        }}
      >
        Allocate your voting power to gauges below
      </Typography>
    </Box>
  );
};
