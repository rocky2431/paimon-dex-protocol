'use client';

import { Box, Container } from '@mui/material';
import { BribesMarketplace } from '@/components/bribes/BribesMarketplace';
import { Navigation, VoteTabs } from '@/components/layout';

/**
 * Bribes Page
 * Route: /bribes
 *
 * Main page for the bribes marketplace
 * Integrated with Vote navigation tabs
 */
export default function BribesPage() {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Top navigation bar */}
      <Navigation activePage="vote" />

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

        {/* Vote sub-navigation tabs */}
        <VoteTabs activeTab="bribes" />

        {/* Bribes Marketplace */}
        <BribesMarketplace />

        {/* Huge whitespace (OlympusDAO style) */}
        <Box sx={{ height: { xs: 40, sm: 60 } }} />
      </Container>
    </Box>
  );
}
