'use client';

import { useState, useMemo } from 'react';
import { Container, Typography, Box, Grid } from '@mui/material';
import { Navigation } from '@/components/layout/Navigation';
import { SavingsRateCard } from '@/components/savings/SavingsRateCard';
import { SavingsDepositModal } from '@/components/savings/SavingsDepositModal';
import { InterestChart, ChartDataPoint } from '@/components/savings/InterestChart';
import { useAccount } from 'wagmi';
import { useSavingPrincipal, useSavingAccruedInterest } from '@/hooks/useSavingRate';

/**
 * Savings Page
 * Display USDP Savings Rate and user deposit information
 *
 * Components:
 * - SavingsRateCard: Current APR, deposits, interest
 * - InterestChart: Historical APR and interest curve
 * - SavingsDepositModal: Deposit/Withdraw interface
 */
export default function SavingsPage() {
  const { address } = useAccount();
  const [depositModalOpen, setDepositModalOpen] = useState(false);

  // Read user data for chart
  const { data: principal } = useSavingPrincipal(address);
  const { data: accruedInterest } = useSavingAccruedInterest(address);

  // Generate mock historical data (TODO: Replace with real API call)
  const historicalData = useMemo<ChartDataPoint[]>(() => {
    const now = Date.now();
    const data: ChartDataPoint[] = [];

    // Generate 30 days of historical data
    for (let i = 29; i >= 0; i--) {
      const timestamp = now - i * 24 * 60 * 60 * 1000;

      // Mock APR data (2.0% - 2.8% range)
      const apr = 2.3 + Math.sin(i / 5) * 0.3 + Math.random() * 0.1;

      // Mock cumulative interest (growing over time)
      const daysSinceStart = 29 - i;
      const dailyRate = apr / 100 / 365;
      const principalAmount = principal ? Number(principal) / 1e18 : 1000;
      const interest = principalAmount * dailyRate * (daysSinceStart + 1);

      data.push({
        timestamp,
        apr: Number(apr.toFixed(2)),
        interest: Number(interest.toFixed(2)),
      });
    }

    return data;
  }, [principal]);

  const handleDepositClick = () => {
    setDepositModalOpen(true);
  };

  const handleDepositClose = () => {
    setDepositModalOpen(false);
  };

  const handleDepositSuccess = () => {
    // Trigger data refresh (wagmi will auto-refresh)
    setDepositModalOpen(false);
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Top navigation bar */}
      <Navigation activePage="savings" />

      {/* Main content area */}
      <Container
        maxWidth="lg"
        sx={{
          pt: 12, // Account for fixed navbar
          pb: 8,
          px: {
            xs: 2,
            sm: 3,
          },
          minHeight: '100vh',
        }}
      >
        {/* Huge whitespace (OlympusDAO style) */}
        <Box sx={{ height: { xs: 40, sm: 60 } }} />

        {/* Page Title */}
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: '#ff6b00',
            mb: 2,
            textAlign: 'center',
          }}
        >
          USDP Savings
        </Typography>

        <Typography
          variant="body1"
          color="text.secondary"
          sx={{
            mb: 4,
            textAlign: 'center',
            maxWidth: 600,
            mx: 'auto',
          }}
        >
          Earn interest on your USDP deposits. Interest comes from RWA yield distribution
          (2% of treasury revenue).
        </Typography>

        {/* Spacer */}
        <Box sx={{ height: 40 }} />

        {/* Main Content Grid */}
        <Grid container spacing={3}>
          {/* Savings Rate Card */}
          <Grid item xs={12} md={6}>
            <SavingsRateCard locale="en" onDepositClick={handleDepositClick} />
          </Grid>

          {/* Interest Chart */}
          <Grid item xs={12} md={6}>
            <InterestChart data={historicalData} locale="en" />
          </Grid>
        </Grid>

        {/* Huge whitespace (OlympusDAO style) */}
        <Box sx={{ height: { xs: 40, sm: 60 } }} />

        {/* Footer info */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 4,
            textAlign: 'center',
            fontSize: '0.875rem',
          }}
        >
          USDP Savings • Backed by Real World Assets • BSC Network
        </Typography>
      </Container>

      {/* Deposit/Withdraw Modal */}
      <SavingsDepositModal
        open={depositModalOpen}
        onClose={handleDepositClose}
        onSuccess={handleDepositSuccess}
        locale="en"
      />
    </Box>
  );
}
