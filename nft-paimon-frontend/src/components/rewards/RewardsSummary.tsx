'use client';

import { Box, Card, CardContent, Typography, Grid } from '@mui/material';
import { RewardsSummary as RewardsSummaryType } from './types';
import { REWARDS_DESIGN_TOKENS } from './constants';

interface RewardsSummaryProps {
  summary: RewardsSummaryType;
}

/**
 * RewardsSummary Component
 * Displays aggregated rewards statistics
 *
 * Features:
 * - Total earned PAIMON
 * - Total staked value (USD)
 * - Average APR
 * - Active positions count
 */
export const RewardsSummary: React.FC<RewardsSummaryProps> = ({ summary }) => {
  const statItems = [
    {
      label: 'Total Earned PAIMON',
      value: parseFloat(summary.totalEarnedPAIMONFormatted).toFixed(2),
      unit: 'PAIMON',
      color: '#ff9800',
    },
    {
      label: 'Total Staked Value',
      value: summary.totalStakedValueUSD,
      unit: '',
      color: '#ffb74d',
    },
    {
      label: 'Average APR',
      value: summary.averageAPR,
      unit: '',
      color: '#ffa726',
    },
    {
      label: 'Active Positions',
      value: summary.activePositions.toString(),
      unit: summary.activePositions === 1 ? 'pool' : 'pools',
      color: '#ff9800',
    },
  ];

  return (
    <Card
      sx={{
        borderRadius: REWARDS_DESIGN_TOKENS.RADIUS_LARGE,
        background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.05) 0%, rgba(255, 152, 0, 0.02) 100%)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 152, 0, 0.1)',
        boxShadow: REWARDS_DESIGN_TOKENS.SHADOW_CARD,
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Typography
          variant="h6"
          sx={{
            mb: 3,
            fontWeight: 600,
            background: 'linear-gradient(90deg, #ff9800, #ffb74d)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Rewards Summary
        </Typography>

        <Grid container spacing={3}>
          {statItems.map((item, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Box>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    mb: 1,
                    fontSize: '0.875rem',
                  }}
                >
                  {item.label}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      color: item.color,
                    }}
                  >
                    {item.value}
                  </Typography>
                  {item.unit && (
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'text.secondary',
                        fontSize: '0.75rem',
                      }}
                    >
                      {item.unit}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};
