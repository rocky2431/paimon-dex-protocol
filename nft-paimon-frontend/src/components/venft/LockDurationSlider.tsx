'use client';

import { Box, Slider, Typography, Stack } from '@mui/material';
import {
  LOCK_DURATION,
  SLIDER_CONFIG,
  formatLockDuration,
  DESIGN_TOKENS,
  ANIMATION_CONFIG,
} from './constants';

interface LockDurationSliderProps {
  duration: number; // in seconds
  onDurationChange: (duration: number) => void;
  disabled?: boolean;
}

/**
 * LockDurationSlider Component
 * OlympusDAO-style slider for selecting lock duration (1 week - 4 years)
 *
 * Features:
 * - Custom marks for common durations (1W, 1M, 3M, 6M, 1Y, 2Y, 4Y)
 * - Warm orange color (no blue)
 * - Smooth transitions
 * - Formatted duration display
 */
export const LockDurationSlider: React.FC<LockDurationSliderProps> = ({
  duration,
  onDurationChange,
  disabled = false,
}) => {
  const handleChange = (_event: Event, newValue: number | number[]) => {
    onDurationChange(newValue as number);
  };

  // Calculate power percentage for color intensity
  const powerPercentage = (duration / LOCK_DURATION.MAX_LOCK) * 100;

  return (
    <Box>
      {/* Label */}
      <Typography
        variant="body2"
        color="text.secondary"
        fontWeight={600}
        sx={{ mb: 1.5, fontSize: '0.875rem' }}
      >
        Lock Duration
      </Typography>

      {/* Slider container with inset shadow */}
      <Box
        sx={{
          borderRadius: DESIGN_TOKENS.RADIUS_MEDIUM,
          padding: 4,
          backgroundColor: 'background.elevated',
          boxShadow: DESIGN_TOKENS.INSET_BORDER_LIGHT,
          transition: `all ${ANIMATION_CONFIG.DURATION_NORMAL} ${ANIMATION_CONFIG.EASE_OUT_EXPO}`,
        }}
      >
        {/* Selected duration display */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="baseline"
          sx={{ mb: 3 }}
        >
          <Typography variant="h4" fontWeight={700} color="primary.main">
            {formatLockDuration(duration)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {powerPercentage.toFixed(1)}% voting power
          </Typography>
        </Stack>

        {/* Slider */}
        <Slider
          value={duration}
          onChange={handleChange}
          min={LOCK_DURATION.MIN_LOCK}
          max={LOCK_DURATION.MAX_LOCK}
          step={24 * 60 * 60} // 1 day step
          marks={SLIDER_CONFIG.MARKS}
          disabled={disabled}
          sx={{
            color: 'primary.main', // Orange color
            height: 8,

            '& .MuiSlider-track': {
              border: 'none',
              background: 'linear-gradient(90deg, #FFB74D 0%, #FF9800 100%)',
            },

            '& .MuiSlider-rail': {
              backgroundColor: 'background.default',
              opacity: 1,
            },

            '& .MuiSlider-thumb': {
              width: 24,
              height: 24,
              backgroundColor: '#FF9800',
              boxShadow: '0 3px 8px rgba(255, 152, 0, 0.4)',
              transition: `all ${ANIMATION_CONFIG.DURATION_NORMAL} ${ANIMATION_CONFIG.EASE_OUT_EXPO}`,

              '&:hover, &.Mui-focusVisible': {
                boxShadow: '0 0 0 8px rgba(255, 152, 0, 0.16)',
              },

              '&:active': {
                width: 28,
                height: 28,
                boxShadow: '0 0 0 12px rgba(255, 152, 0, 0.16)',
              },
            },

            '& .MuiSlider-mark': {
              backgroundColor: 'text.disabled',
              width: 2,
              height: 12,
            },

            '& .MuiSlider-markActive': {
              backgroundColor: '#FFFFFF',
            },

            '& .MuiSlider-markLabel': {
              fontSize: '0.75rem',
              color: 'text.secondary',
              fontWeight: 600,
              mt: 1,
            },

            '& .MuiSlider-markLabelActive': {
              color: 'primary.main',
            },
          }}
        />

        {/* Helper text */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 3, textAlign: 'center' }}
        >
          Longer locks = Higher voting power
        </Typography>
      </Box>
    </Box>
  );
};
