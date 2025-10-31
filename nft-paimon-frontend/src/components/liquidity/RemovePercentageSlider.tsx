'use client';

import { Box, Typography, Stack, Slider } from '@mui/material';
import { REMOVE_PERCENTAGE_PRESETS, LIQUIDITY_DESIGN_TOKENS, ANIMATION_CONFIG } from './constants';

/**
 * RemovePercentageSlider Component Props
 */
interface RemovePercentageSliderProps {
  /** Current percentage (0-100) */
  percentage: number;
  /** Callback when percentage changes */
  onChange: (percentage: number) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
}

/**
 * RemovePercentageSlider Component
 * OlympusDAO-inspired percentage selector for liquidity removal
 *
 * Features:
 * - 4 preset buttons (25%, 50%, 75%, 100%)
 * - Smooth slider with orange gradient track
 * - Visual feedback on selection
 * - Pill-shaped buttons
 */
export const RemovePercentageSlider: React.FC<RemovePercentageSliderProps> = ({
  percentage,
  onChange,
  disabled = false,
}) => {
  return (
    <Box
      sx={{
        borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_LARGE,
        padding: 3,
        backgroundColor: 'background.paper',
        boxShadow: LIQUIDITY_DESIGN_TOKENS.SHADOW_CARD,
        border: '2px solid',
        borderColor: 'rgba(255, 152, 0, 0.1)',
        transition: `all ${ANIMATION_CONFIG.DURATION_NORMAL} ${ANIMATION_CONFIG.EASE_OUT_EXPO}`,

        '&:hover': {
          borderColor: 'rgba(255, 152, 0, 0.3)',
          boxShadow: LIQUIDITY_DESIGN_TOKENS.SHADOW_CARD_HOVER,
        },
      }}
    >
      {/* Header */}
      <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mb: 2 }}>
        Remove Percentage
      </Typography>

      {/* Percentage display */}
      <Box
        sx={{
          mb: 3,
          textAlign: 'center',
          py: 2,
          borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_MEDIUM,
          background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(245, 124, 0, 0.15) 100%)',
          border: '1px solid rgba(255, 152, 0, 0.2)',
        }}
      >
        <Typography
          variant="h3"
          fontWeight={700}
          sx={{
            background: 'linear-gradient(90deg, #FF9800 0%, #F57C00 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {percentage}%
        </Typography>
      </Box>

      {/* Preset buttons */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 3 }}>
        {REMOVE_PERCENTAGE_PRESETS.map((preset) => {
          const isActive = percentage === preset;

          return (
            <Box
              key={preset}
              onClick={() => !disabled && onChange(preset)}
              sx={{
                flex: 1,
                py: 1.5,
                px: 2,
                borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_PILL,
                border: '2px solid',
                borderColor: isActive ? 'primary.main' : 'divider',
                background: isActive
                  ? 'linear-gradient(90deg, rgba(255, 152, 0, 0.15) 0%, rgba(245, 124, 0, 0.15) 100%)'
                  : 'transparent',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: `all ${ANIMATION_CONFIG.DURATION_NORMAL} ${ANIMATION_CONFIG.EASE_OUT_EXPO}`,
                textAlign: 'center',
                opacity: disabled ? 0.5 : 1,

                '&:hover': {
                  borderColor: disabled ? 'divider' : 'primary.main',
                  backgroundColor: disabled ? 'transparent' : 'rgba(255, 152, 0, 0.05)',
                  transform: disabled ? 'none' : 'translateY(-2px)',
                },
              }}
            >
              <Typography
                variant="body2"
                fontWeight={isActive ? 700 : 600}
                color={isActive ? 'primary.main' : 'text.secondary'}
                sx={{ fontSize: '1rem' }}
              >
                {preset}%
              </Typography>
            </Box>
          );
        })}
      </Stack>

      {/* Slider */}
      <Slider
        value={percentage}
        onChange={(_, value) => !disabled && onChange(value as number)}
        min={0}
        max={100}
        step={1}
        disabled={disabled}
        sx={{
          color: 'primary.main',
          height: 8,

          '& .MuiSlider-track': {
            background: 'linear-gradient(90deg, #FF9800 0%, #F57C00 100%)',
            border: 'none',
            height: 8,
          },

          '& .MuiSlider-rail': {
            backgroundColor: 'rgba(255, 152, 0, 0.1)',
            height: 8,
            opacity: 1,
          },

          '& .MuiSlider-thumb': {
            height: 24,
            width: 24,
            backgroundColor: '#fff',
            border: '3px solid currentColor',
            boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)',
            transition: `all ${ANIMATION_CONFIG.DURATION_NORMAL}`,

            '&:hover, &.Mui-focusVisible': {
              boxShadow: '0 6px 16px rgba(255, 152, 0, 0.5)',
              transform: 'scale(1.1)',
            },

            '&.Mui-active': {
              boxShadow: '0 8px 20px rgba(255, 152, 0, 0.6)',
            },
          },
        }}
      />

      {/* Helper text */}
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
        Select the percentage of LP tokens you want to redeem
      </Typography>
    </Box>
  );
};
