'use client';

import { Box, Stack, Typography, Button } from '@mui/material';
import { useState, useEffect } from 'react';
import { formatUnits } from 'viem';
import { LIQUIDITY_DESIGN_TOKENS, ANIMATION_CONFIG } from './constants';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';

interface RewardsDisplayProps {
  /** Earned rewards in PAIMON */
  earnedRewards: bigint;
  /** On claim button click */
  onClaim: () => void;
  /** Claiming state */
  isClaiming: boolean;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * useAnimatedCounter Hook
 * Animate number from previous value to current value
 */
const useAnimatedCounter = (value: number) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const duration = 1000; // 1 second animation
    const steps = 60; // 60 fps
    const stepDuration = duration / steps;
    const increment = (value - displayValue) / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      setDisplayValue((prev) => prev + increment);

      if (currentStep >= steps) {
        setDisplayValue(value);
        clearInterval(timer);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value]);

  return displayValue;
};

/**
 * RewardsDisplay Component
 * Display earned PAIMON rewards with claim button
 *
 * Features:
 * - Animated counter
 * - Orange gradient background (glassmorphism)
 * - Claim button
 * - Fire icon
 */
export const RewardsDisplay: React.FC<RewardsDisplayProps> = ({
  earnedRewards,
  onClaim,
  isClaiming,
  disabled = false,
}) => {
  const rewardsFormatted = Number(formatUnits(earnedRewards, 18));
  const animatedRewards = useAnimatedCounter(rewardsFormatted);

  const hasRewards = earnedRewards > 0n;

  return (
    <Box
      sx={{
        p: 4,
        borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_LARGE,
        background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.15) 0%, rgba(255, 87, 34, 0.1) 100%)',
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
            ? 'radial-gradient(circle at 50% 50%, rgba(255, 152, 0, 0.1) 0%, transparent 70%)'
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
          transform: hasRewards ? 'translateY(-4px)' : 'none',
          boxShadow: hasRewards ? LIQUIDITY_DESIGN_TOKENS.SHADOW_BUTTON : 'none',
        },
      }}
    >
      <Stack spacing={2} alignItems="center" sx={{ position: 'relative', zIndex: 1 }}>
        {/* Fire icon */}
        <LocalFireDepartmentIcon
          sx={{
            fontSize: '2rem',
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

        {/* Label */}
        <Typography variant="subtitle2" color="text.secondary" fontSize="0.875rem" fontWeight={600}>
          Earned Rewards
        </Typography>

        {/* Animated reward amount */}
        <Typography
          variant="h3"
          fontWeight={700}
          color="primary.main"
          sx={{
            fontSize: '2.5rem',
            textShadow: hasRewards ? '0 0 20px rgba(255, 152, 0, 0.3)' : 'none',
          }}
        >
          {animatedRewards.toFixed(4)}
        </Typography>

        <Typography variant="body2" color="text.secondary" fontWeight={600}>
          PAIMON
        </Typography>

        {/* Claim button */}
        <Button
          fullWidth
          onClick={onClaim}
          disabled={!hasRewards || isClaiming || disabled}
          sx={{
            mt: 2,
            py: 1.5,
            borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_PILL,
            backgroundColor: 'primary.main',
            color: 'white',
            fontWeight: 700,
            fontSize: '1rem',
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
          {isClaiming ? 'Claiming...' : 'Claim Rewards'}
        </Button>
      </Stack>
    </Box>
  );
};
