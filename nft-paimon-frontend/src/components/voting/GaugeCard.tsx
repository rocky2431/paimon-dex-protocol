'use client';

import { Box, Typography, Slider, Stack } from '@mui/material';
import { Gauge } from './types';
import { DESIGN_TOKENS, ANIMATION_CONFIG, formatWeight } from './constants';

interface GaugeCardProps {
  gauge: Gauge;
  allocation: number; // percentage (0-100)
  onAllocationChange: (gauge: `0x${string}`, allocation: number) => void;
  disabled?: boolean;
}

export const GaugeCard: React.FC<GaugeCardProps> = ({
  gauge,
  allocation,
  onAllocationChange,
  disabled = false,
}) => {
  const handleChange = (_event: Event, value: number | number[]) => {
    onAllocationChange(gauge.address, value as number);
  };

  return (
    <Box
      sx={{
        borderRadius: DESIGN_TOKENS.RADIUS_MEDIUM,
        padding: 3,
        backgroundColor: 'background.elevated',
        boxShadow: DESIGN_TOKENS.INSET_BORDER_LIGHT,
        transition: `all ${ANIMATION_CONFIG.DURATION_NORMAL} ${ANIMATION_CONFIG.EASE_OUT_EXPO}`,
        '&:hover': {
          boxShadow: DESIGN_TOKENS.INSET_BORDER_MEDIUM,
        },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={700} color="text.primary">
          {gauge.name}
        </Typography>
        <Typography variant="h5" fontWeight={700} color="primary.main">
          {allocation.toFixed(0)}%
        </Typography>
      </Stack>

      <Slider
        value={allocation}
        onChange={handleChange}
        min={0}
        max={100}
        step={1}
        disabled={disabled}
        sx={{
          color: 'primary.main',
          height: 6,
          '& .MuiSlider-track': {
            border: 'none',
            background: 'linear-gradient(90deg, #FFB74D 0%, #FF9800 100%)',
          },
          '& .MuiSlider-thumb': {
            width: 20,
            height: 20,
            backgroundColor: '#FF9800',
            '&:hover, &.Mui-focusVisible': {
              boxShadow: '0 0 0 8px rgba(255, 152, 0, 0.16)',
            },
          },
        }}
      />

      <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
        <Typography variant="caption" color="text.secondary">
          APR: {gauge.apr}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          TVL: {gauge.tvl}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Current: {formatWeight(gauge.weight)}
        </Typography>
      </Stack>
    </Box>
  );
};
