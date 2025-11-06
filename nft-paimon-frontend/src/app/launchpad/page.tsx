import { Container } from '@mui/material';
import { Navigation } from '@/components/layout/Navigation';
import { ProjectList } from '@/components/launchpad/ProjectList';

/**
 * RWA Launchpad Page
 * Display list of RWA tokenization projects with filters and sorting
 *
 * Route: /launchpad
 *
 * Features:
 * - Grid/list view toggle
 * - Project cards with status badges
 * - Real-time blockchain data
 * - Filter by status and asset tier
 * - Sort by raise amount, deadline, APY
 * - Responsive design (mobile + desktop)
 * - Material Design 3 with warm color palette
 */
export default function LaunchpadPage() {
  return (
    <>
      <Navigation />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <ProjectList />
      </Container>
    </>
  );
}
