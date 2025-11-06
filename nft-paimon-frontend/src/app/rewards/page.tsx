'use client';

import { Box, Container } from '@mui/material';
import { RewardsDashboard } from '@/components/rewards/RewardsDashboard';
import { Navigation, VoteTabs } from '@/components/layout';

/**
 * Rewards Page
 * Route: /rewards
 *
 * Features:
 * - View rewards from all staked pools
 * - Claim all rewards in one transaction
 * - Track rewards history
 * - Integrated with Vote navigation tabs
 */
export default function RewardsPage() {
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

        {/* Vote sub-navigation tabs */}
        <VoteTabs activeTab="rewards" />

        {/* Rewards Dashboard */}
        <RewardsDashboard />

        {/* Huge whitespace (OlympusDAO style) */}
        <Box sx={{ height: { xs: 40, sm: 60 } }} />
      </Container>
    </Box>
  );
}
