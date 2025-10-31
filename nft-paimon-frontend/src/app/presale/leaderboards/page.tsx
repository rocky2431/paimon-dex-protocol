import { Box, Container } from '@mui/material';
import { Navigation } from '@/components/layout/Navigation';
import { LeaderboardDashboard } from '@/components/presale/LeaderboardDashboard';

/**
 * Presale Leaderboards Page
 * Display competitive rankings for bond NFT holders
 *
 * Features:
 * - Top Earners leaderboard (highest Remint)
 * - Luckiest Rollers leaderboard (highest single roll)
 * - Social Champions leaderboard (most tasks completed)
 * - User rank summary across all leaderboards
 * - Real-time updates from blockchain
 */
export default function PresaleLeaderboardsPage() {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Navigation activePage="presale" />
      <Container
        maxWidth="lg"
        sx={{
          pt: 12,
          pb: 8,
          px: { xs: 2, sm: 3 },
        }}
      >
        <LeaderboardDashboard />
      </Container>
    </Box>
  );
}
