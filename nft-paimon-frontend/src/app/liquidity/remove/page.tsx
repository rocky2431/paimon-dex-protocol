'use client';

import { Box, Container, Typography } from '@mui/material';
import { RemoveLiquidityCard } from '@/components/liquidity/RemoveLiquidityCard';
import { Navigation, LiquidityTabs } from '@/components/layout';

/**
 * Remove Liquidity Page
 * OlympusDAO-inspired liquidity removal interface
 *
 * Features:
 * - Navigation with LiquidityTabs
 * - RemoveLiquidityCard integration
 * - Responsive layout
 * - Orange gradient accents
 */
export default function RemoveLiquidityPage() {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Top navigation bar */}
      <Navigation activePage="liquidity" />

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

        {/* Liquidity sub-navigation tabs */}
        <LiquidityTabs activeTab="remove" />

        {/* Main content */}
        <Box sx={{ mb: 8 }}>
          <RemoveLiquidityCard />
        </Box>

        {/* Footer text */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: 'block',
            textAlign: 'center',
            fontSize: '0.75rem',
          }}
        >
          Remove Liquidity • Redeem Underlying Tokens
        </Typography>

        {/* Huge whitespace (OlympusDAO style) */}
        <Box sx={{ height: { xs: 40, sm: 60 } }} />
      </Container>
    </Box>
  );
}
