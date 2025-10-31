'use client';

import { Box, Container } from '@mui/material';
import { TaskDashboard } from '@/components/presale/TaskDashboard';
import { Navigation } from '@/components/layout';

/**
 * Social Tasks Dashboard Page
 * Route: /presale/tasks
 *
 * Displays Twitter tasks, Discord tasks, and referral system
 * Users can complete tasks to unlock better dice (Gold/Diamond)
 */
export default function PresaleTasksPage() {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Top navigation bar */}
      <Navigation activePage="presale" />

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

        {/* Task Dashboard */}
        <TaskDashboard />
      </Container>
    </Box>
  );
}
