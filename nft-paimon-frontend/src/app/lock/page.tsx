'use client';

import { Container, Typography, Box } from '@mui/material';
import { VeNFTCard } from '@/components/venft/VeNFTCard';
import { Navigation } from '@/components/layout/Navigation';

export default function LockPage() {
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

        {/* Spacer to match VoteTabs/LiquidityTabs height for consistent card position */}
        <Box sx={{ height: 80, mb: 0 }} />

        {/* VeNFTCard */}
        <VeNFTCard />

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
          Vote-Escrowed NFT • BSC Network
        </Typography>
      </Container>
    </Box>
  );
}
