'use client';

import { Box, Typography, Stack } from '@mui/material';
import { AnimatedNumber } from '../swap/AnimatedNumber';
import { VeNFTCalculation } from './types';
import {
  DESIGN_TOKENS,
  ANIMATION_CONFIG,
  NFT_VISUAL,
  formatUnlockDate,
} from './constants';

interface VotingPowerPreviewProps {
  calculation: VeNFTCalculation | null;
  isLoading?: boolean;
}

/**
 * VotingPowerPreview Component
 * OlympusDAO-style preview card showing voting power calculation
 *
 * Features:
 * - Dynamic gradient background based on power percentage
 * - Animated voting power counter
 * - Unlock date display
 * - Visual feedback of lock strength
 */
export const VotingPowerPreview: React.FC<VotingPowerPreviewProps> = ({
  calculation,
  isLoading = false,
}) => {
  if (!calculation || isLoading) {
    return null;
  }

  const { votingPowerFormatted, unlockDate, powerPercentage } = calculation;
  const gradient = NFT_VISUAL.getColorGradient(powerPercentage);

  return (
    <Box
      sx={{
        borderRadius: DESIGN_TOKENS.RADIUS_MEDIUM,
        padding: 4,
        background: gradient, // Dynamic gradient based on lock strength
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
            'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
          transition: 'left 0.5s',
        },

        '&:hover::before': {
          left: '100%',
        },
      }}
    >
      {/* Icon */}
      <Box
        sx={{
          fontSize: '3rem',
          textAlign: 'center',
          mb: 2,
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
        }}
      >
        💎
      </Box>

      {/* Title */}
      <Typography
        variant="h6"
        fontWeight={700}
        color="#FFFFFF"
        sx={{
          textAlign: 'center',
          mb: 3,
          textShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}
      >
        Voting Power Preview
      </Typography>

      {/* Voting Power Value */}
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
          variant="h3"
          fontWeight={700}
          color="#FFFFFF"
          sx={{
            textAlign: 'center',
            textShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        >
          <AnimatedNumber
            value={parseFloat(votingPowerFormatted)}
            decimals={2}
            suffix=" veHYD"
          />
        </Typography>

        <Typography
          variant="body2"
          color="rgba(255, 255, 255, 0.9)"
          sx={{ textAlign: 'center', mt: 1, fontWeight: 600 }}
        >
          {powerPercentage.toFixed(1)}% of locked amount
        </Typography>
      </Box>

      {/* Unlock Date */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          borderRadius: DESIGN_TOKENS.RADIUS_SMALL,
          padding: 2,
          backdropFilter: 'blur(10px)',
        }}
      >
        <Typography variant="body2" color="rgba(255, 255, 255, 0.9)" fontWeight={600}>
          Unlock Date
        </Typography>
        <Typography variant="body2" color="#FFFFFF" fontWeight={700}>
          {formatUnlockDate(Math.floor(unlockDate.getTime() / 1000))}
        </Typography>
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
        Voting power decays linearly until unlock
      </Typography>
    </Box>
  );
};
