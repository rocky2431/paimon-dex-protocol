'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { DESIGN_TOKENS, ANIMATION_CONFIG } from './constants';

interface EpochCountdownProps {
  epochNumber: number;
  epochEndTime: number; // Unix timestamp in seconds
}

/**
 * EpochCountdown Component
 * OlympusDAO-style countdown timer for voting epoch
 *
 * Features:
 * - Live countdown (days, hours, minutes, seconds)
 * - Epoch number display
 * - Auto-updates every second
 * - Gradient background
 */
export const EpochCountdown: React.FC<EpochCountdownProps> = ({
  epochNumber,
  epochEndTime,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = epochEndTime - now;

      if (remaining <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(remaining / (24 * 60 * 60));
      const hours = Math.floor((remaining % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((remaining % (60 * 60)) / 60);
      const seconds = remaining % 60;

      setTimeRemaining({ days, hours, minutes, seconds });
    };

    // Calculate immediately
    calculateTimeRemaining();

    // Update every second
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [epochEndTime]);

  const TimeUnit: React.FC<{ value: number; label: string }> = ({ value, label }) => (
    <Box
      sx={{
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: DESIGN_TOKENS.RADIUS_SMALL,
        padding: 2,
        minWidth: 70,
        textAlign: 'center',
        backdropFilter: 'blur(10px)',
      }}
    >
      <Typography
        variant="h4"
        fontWeight={700}
        color="#FFFFFF"
        sx={{
          textShadow: '0 2px 4px rgba(0,0,0,0.2)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value.toString().padStart(2, '0')}
      </Typography>
      <Typography
        variant="caption"
        color="rgba(255, 255, 255, 0.8)"
        sx={{ fontSize: '0.7rem', textTransform: 'uppercase' }}
      >
        {label}
      </Typography>
    </Box>
  );

  return (
    <Box
      sx={{
        borderRadius: DESIGN_TOKENS.RADIUS_MEDIUM,
        padding: 3,
        background: 'linear-gradient(135deg, #F57C00 0%, #E65100 100%)',
        boxShadow: DESIGN_TOKENS.SHADOW_CARD,
        transition: `all ${ANIMATION_CONFIG.DURATION_NORMAL} ${ANIMATION_CONFIG.EASE_OUT_EXPO}`,
      }}
    >
      {/* Epoch Number */}
      <Typography
        variant="h6"
        fontWeight={700}
        color="#FFFFFF"
        sx={{
          mb: 2,
          textAlign: 'center',
          textShadow: '0 2px 4px rgba(0,0,0,0.2)',
        }}
      >
        Epoch {epochNumber}
      </Typography>

      {/* Countdown Timer */}
      <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ mb: 2 }}>
        <TimeUnit value={timeRemaining.days} label="Days" />
        <TimeUnit value={timeRemaining.hours} label="Hours" />
        <TimeUnit value={timeRemaining.minutes} label="Mins" />
        <TimeUnit value={timeRemaining.seconds} label="Secs" />
      </Stack>

      {/* Helper text */}
      <Typography
        variant="caption"
        color="rgba(255, 255, 255, 0.8)"
        sx={{
          display: 'block',
          textAlign: 'center',
          fontSize: '0.75rem',
        }}
      >
        Voting ends in
      </Typography>
    </Box>
  );
};
