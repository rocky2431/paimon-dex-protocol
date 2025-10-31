'use client';

import { Box, Typography, LinearProgress } from '@mui/material';
import { AccessTime } from '@mui/icons-material';
import { useState, useEffect } from 'react';

interface RollCooldownTimerProps {
  lastRollTimestamp: number; // Unix timestamp in seconds
  cooldownPeriod?: number; // In seconds (default: 7 days)
}

/**
 * Roll Cooldown Timer Component
 * Displays time remaining until next roll is available
 */
export function RollCooldownTimer({ lastRollTimestamp, cooldownPeriod = 7 * 24 * 60 * 60 }: RollCooldownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const nextRollTime = lastRollTimestamp + cooldownPeriod;
      const remaining = Math.max(0, nextRollTime - now);

      setTimeLeft(remaining);
      setProgress((1 - remaining / cooldownPeriod) * 100);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [lastRollTimestamp, cooldownPeriod]);

  const formatTime = (seconds: number) => {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const mins = Math.floor((seconds % (60 * 60)) / 60);
    const secs = seconds % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${mins}m ${secs}s`;
    } else if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    } else if (mins > 0) {
      return `${mins}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const canRoll = timeLeft === 0;

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: '12px',
        background: canRoll ? 'linear-gradient(135deg, #C8E6C9 0%, #81C784 100%)' : 'rgba(255, 255, 255, 0.9)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <AccessTime color={canRoll ? 'success' : 'action'} />
        <Typography variant="h6" fontWeight="bold">
          {canRoll ? 'Ready to Roll!' : 'Next Roll Available In'}
        </Typography>
      </Box>

      {!canRoll && (
        <>
          <Typography variant="h4" fontWeight="bold" color="primary" sx={{ mb: 2, textAlign: 'center' }}>
            {formatTime(timeLeft)}
          </Typography>

          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: '10px',
              borderRadius: '5px',
              backgroundColor: '#FFE8CC',
              '& .MuiLinearProgress-bar': {
                background: 'linear-gradient(90deg, #FFD700 0%, #FFA000 100%)',
              },
            }}
          />

          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
            {progress.toFixed(1)}% complete
          </Typography>
        </>
      )}

      {canRoll && (
        <Typography variant="body1" color="success.main" fontWeight="medium" textAlign="center">
          Your dice roll is ready! Click the button below to roll.
        </Typography>
      )}
    </Box>
  );
}
