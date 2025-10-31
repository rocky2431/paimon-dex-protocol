'use client';

import { Container, Typography, Box } from '@mui/material';
import { AddLiquidityCard } from '@/components/liquidity/AddLiquidityCard';
import { Navigation, LiquidityTabs } from '@/components/layout';

export default function AddLiquidityPage() {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Top navigation bar */}
      <Navigation activePage="liquidity" />

      {/* Main content area (centered AddLiquidityCard) */}
      <Container
        maxWidth="lg"
        sx={{
          pt: 12, // Account for fixed navbar
          pb: 8,
          px: {
            xs: 2, // Mobile: 16px padding
            sm: 3, // Desktop: 24px padding
          },
          minHeight: '100vh',
        }}
      >
        {/* Huge whitespace (OlympusDAO style) */}
        <Box sx={{ height: { xs: 40, sm: 60 } }} />

        {/* Liquidity sub-navigation tabs */}
        <LiquidityTabs activeTab="add" />

        {/* AddLiquidityCard */}
        <AddLiquidityCard />

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
          Add Liquidity • Earn Trading Fees • ve33 DEX
        </Typography>
      </Container>
    </Box>
  );
}
