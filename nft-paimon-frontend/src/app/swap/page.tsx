'use client';

import { Container, Typography, Box } from '@mui/material';
import { Navigation } from '@/components/layout/Navigation';
import { SwapCard } from '@/components/swap/SwapCard';

/**
 * Swap Page (V3 - DEX Only)
 *
 * 功能: DEX AMM交易
 * 路由: /swap
 * Note: PSM swap功能已移至 /usdp 页面的 PSM Tab
 *
 * 设计理念:
 * - 支持所有代币对交易（USDC/USDP/WBNB/HYD/etc.）
 * - 通过AMM池子执行，显示多跳路由
 * - USDC ↔ USDP 1:1交换请访问 /usdp → PSM Tab
 */
export default function SwapPage() {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Top navigation bar */}
      <Navigation />

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

        {/* Page title */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              color: '#ff6b00',
              mb: 2,
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
            }}
          >
            DEX Swap
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{
              maxWidth: 700,
              mx: 'auto',
              fontSize: { xs: '1rem', sm: '1.125rem' },
            }}
          >
            Trade any token pair via AMM pools
          </Typography>
        </Box>

        {/* Swap Card */}
        <SwapCard />

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
          ve33 DEX • Automated Market Maker • BSC Network
        </Typography>
      </Container>
    </Box>
  );
}
