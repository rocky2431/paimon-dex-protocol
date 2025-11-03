/**
 * Stability Pool Page
 * Main page for USDP Stability Pool
 *
 * Features:
 * - Pool overview (total deposits, user share, APY)
 * - Deposit/Withdraw form
 * - Liquidation rewards panel
 * - Historical liquidation records
 * - Responsive design
 * - Bilingual support (EN/ZH)
 */

'use client';

import { Container, Typography, Box, Grid } from '@mui/material';
import { Navigation } from '@/components/layout/Navigation';
import { StabilityPoolOverview } from '@/components/stability-pool/StabilityPoolOverview';
import { DepositWithdrawForm } from '@/components/stability-pool/DepositWithdrawForm';
import { LiquidationRewardsPanel } from '@/components/stability-pool/LiquidationRewardsPanel';
import { LiquidationHistory } from '@/components/stability-pool/LiquidationHistory';

export default function StabilityPoolPage() {
  // TODO: Add locale support via next-intl
  const locale = 'en';

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
          USDP Stability Pool
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
          Deposit USDP to earn liquidation rewards. Help maintain system stability and earn
          collateral from liquidated vaults.
        </Typography>

        {/* Spacer */}
        <Box sx={{ height: 40 }} />

        {/* Main Content Grid */}
        <Grid container spacing={3}>
          {/* Overview Card */}
          <Grid item xs={12}>
            <StabilityPoolOverview locale={locale} />
          </Grid>

          {/* Deposit/Withdraw Form */}
          <Grid item xs={12} md={6}>
            <DepositWithdrawForm locale={locale} />
          </Grid>

          {/* Liquidation Rewards Panel */}
          <Grid item xs={12} md={6}>
            <LiquidationRewardsPanel locale={locale} />
          </Grid>

          {/* Liquidation History */}
          <Grid item xs={12}>
            <LiquidationHistory locale={locale} />
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
          USDP Stability Pool • Earn Liquidation Rewards • BSC Network
        </Typography>
      </Container>
    </Box>
  );
}
