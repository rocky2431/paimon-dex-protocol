/**
 * HealthFactorGauge Component
 * Visual gauge showing health factor with color-coded status
 */

'use client';

import { Box, Typography, LinearProgress, Chip } from '@mui/material';
import { TREASURY_THEME } from './constants';

interface HealthFactorGaugeProps {
  healthFactor: number;
  /**
   * Compact mode shows smaller layout
   */
  compact?: boolean;
}

/**
 * Get health factor status based on value
 * - Green (>150%): Healthy
 * - Yellow (115-150%): Warning
 * - Red (<115%): At Risk
 */
export function getHealthFactorStatus(healthFactor: number) {
  if (healthFactor >= 150) {
    return {
      color: '#8BC34A', // Light Green
      label: 'Healthy',
      bgColor: 'rgba(139, 195, 74, 0.15)',
    };
  } else if (healthFactor >= 115) {
    return {
      color: '#FFB74D', // Deep Orange 300
      label: 'Warning',
      bgColor: 'rgba(255, 183, 77, 0.15)',
    };
  } else {
    return {
      color: '#FF6B35', // Warm Red-Orange
      label: 'At Risk',
      bgColor: 'rgba(255, 107, 53, 0.15)',
    };
  }
}

/**
 * Calculate progress bar value (0-100)
 * Map health factor to visual progress:
 * - 0-115%: Red zone (0-40% of bar)
 * - 115-150%: Yellow zone (40-70% of bar)
 * - 150%+: Green zone (70-100% of bar)
 */
function calculateProgress(healthFactor: number): number {
  if (healthFactor < 115) {
    // Map 0-115% to 0-40% of progress bar
    return Math.min((healthFactor / 115) * 40, 40);
  } else if (healthFactor < 150) {
    // Map 115-150% to 40-70% of progress bar
    return 40 + ((healthFactor - 115) / 35) * 30;
  } else {
    // Map 150%+ to 70-100% of progress bar
    return Math.min(70 + ((healthFactor - 150) / 150) * 30, 100);
  }
}

export function HealthFactorGauge({ healthFactor, compact = false }: HealthFactorGaugeProps) {
  const status = getHealthFactorStatus(healthFactor);
  const progress = calculateProgress(healthFactor);

  // Handle extremely high health factors (e.g., 999 for no debt)
  const displayValue = healthFactor > 500 ? '∞' : `${healthFactor.toFixed(0)}%`;

  if (compact) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 80 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: status.color,
                borderRadius: 4,
              },
            }}
          />
        </Box>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            color: status.color,
            minWidth: 50,
            textAlign: 'right',
          }}
        >
          {displayValue}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 2,
        backgroundColor: status.bgColor,
        borderRadius: 2,
        border: `2px solid ${status.color}`,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1.5,
        }}
      >
        <Typography variant="subtitle2" color="text.secondary">
          Health Factor
        </Typography>
        <Chip
          label={status.label}
          size="small"
          sx={{
            backgroundColor: status.color,
            color: '#000',
            fontWeight: 700,
          }}
        />
      </Box>

      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          color: status.color,
          mb: 2,
        }}
      >
        {displayValue}
      </Typography>

      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 12,
          borderRadius: 6,
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          '& .MuiLinearProgress-bar': {
            backgroundColor: status.color,
            borderRadius: 6,
          },
        }}
      />

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mt: 1,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Liquidation: 115%
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Target: 150%+
        </Typography>
      </Box>
    </Box>
  );
}
