'use client';

import { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { AccessTime as TimeIcon } from '@mui/icons-material';

interface CountdownTimerProps {
  targetDate: Date;
  onComplete?: () => void;
}

/**
 * CountdownTimer Component
 * Display countdown to bond maturity
 *
 * Features:
 * - Real-time countdown (days, hours, minutes, seconds)
 * - Auto-refresh every second
 * - Callback when countdown reaches zero
 * - Material Design 3 warm colors
 */
export function CountdownTimer({ targetDate, onComplete }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    const now = new Date().getTime();
    const target = targetDate.getTime();
    const difference = target - now;

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isMatured: true };
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, isMatured: false };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);

      if (newTimeLeft.isMatured && onComplete) {
        onComplete();
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onComplete]);

  if (timeLeft.isMatured) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1,
          backgroundColor: 'rgba(139, 195, 74, 0.1)',
          borderRadius: 1,
          border: '1px solid rgba(139, 195, 74, 0.3)',
        }}
      >
        <TimeIcon sx={{ fontSize: 20, color: '#8BC34A' }} />
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            color: '#8BC34A',
          }}
        >
          Matured - Ready to Settle
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <TimeIcon sx={{ fontSize: 20, color: '#FFB74D' }} />
      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'baseline' }}>
        {timeLeft.days > 0 && (
          <>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                color: '#FF6B35',
                lineHeight: 1,
              }}
            >
              {timeLeft.days}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontWeight: 600,
              }}
            >
              d
            </Typography>
          </>
        )}
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            color: '#FF6B35',
            lineHeight: 1,
          }}
        >
          {String(timeLeft.hours).padStart(2, '0')}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontWeight: 600,
          }}
        >
          :
        </Typography>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            color: '#FF6B35',
            lineHeight: 1,
          }}
        >
          {String(timeLeft.minutes).padStart(2, '0')}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontWeight: 600,
          }}
        >
          :
        </Typography>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            color: '#FF6B35',
            lineHeight: 1,
          }}
        >
          {String(timeLeft.seconds).padStart(2, '0')}
        </Typography>
      </Box>
    </Box>
  );
}
