'use client';

/**
 * Analytics Dashboard Container
 * Main container component with Grid layout
 */

import React from 'react';
import { Container, Grid, Alert, CircularProgress, Box } from '@mui/material';
import { useAnalytics } from './hooks/useAnalytics';
import { TVLCard } from './TVLCard';
import { PriceChart } from './PriceChart';
import { APRCalculator } from './APRCalculator';
import { AnalyticsDashboardState } from './types';

// ==================== Component ====================

/**
 * Analytics Dashboard Container
 *
 * Features:
 * - Grid layout with TVLCard, PriceChart, APRCalculator
 * - Calls useAnalytics hook for data
 * - Loading state
 * - Error handling
 * - Responsive design
 *
 * @returns Analytics dashboard container
 */
export const AnalyticsDashboard: React.FC = () => {
  // ==================== Data Fetching ====================

  const { summary, isLoading, error } = useAnalytics();

  // ==================== Loading State ====================

  if (
    isLoading ||
    summary.dashboardState === AnalyticsDashboardState.LOADING
  ) {
    return (
      <Container maxWidth="lg" sx={{ paddingY: 4 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
          }}
        >
          <CircularProgress sx={{ color: '#FF9800' }} size={60} />
        </Box>
      </Container>
    );
  }

  // ==================== Error State ====================

  if (error || summary.dashboardState === AnalyticsDashboardState.ERROR) {
    return (
      <Container maxWidth="lg" sx={{ paddingY: 4 }}>
        <Alert severity="error" sx={{ borderRadius: '16px' }}>
          {error || summary.errorMessage || 'Failed to load analytics data'}
        </Alert>
      </Container>
    );
  }

  // ==================== Render ====================

  return (
    <Container maxWidth="lg" sx={{ paddingY: 4 }}>
      <Grid container spacing={3}>
        {/* Row 1: TVL Card + Price Chart */}
        <Grid item xs={12} md={6}>
          <TVLCard tvl={summary.tvl} isLoading={false} />
        </Grid>
        <Grid item xs={12} md={6}>
          <PriceChart currentPrice={summary.hydPrice} isLoading={false} />
        </Grid>

        {/* Row 2: APR Calculator */}
        <Grid item xs={12}>
          <APRCalculator
            totalLockedHYD={100_000n * 10n ** 18n} // Mock: 100K HYD locked
          />
        </Grid>
      </Grid>
    </Container>
  );
};

// ==================== Export ====================

export default AnalyticsDashboard;
