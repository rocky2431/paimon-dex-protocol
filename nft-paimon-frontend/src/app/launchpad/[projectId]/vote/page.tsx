'use client';

import { Container, Box, Grid, Typography, Button, Alert, Breadcrumbs, Link } from '@mui/material';
import { useRouter } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';
import { Navigation } from '@/components/layout/Navigation';
import { VotingUI } from '@/components/launchpad/VotingUI';
import { VoteHistory } from '@/components/launchpad/VoteHistory';
import { VoteExecutionPanel } from '@/components/launchpad/VoteExecutionPanel';
import { ProjectStatus } from '@/types/launchpad';
import type { RWAProject } from '@/types/launchpad';

/**
 * Governance Voting Page
 *
 * Dedicated page for veNFT governance voting on RWA projects
 *
 * Route: /launchpad/[projectId]/vote
 *
 * Features:
 * - Full voting interface with detailed stats
 * - Vote execution panel (when threshold met)
 * - User voting history across all projects
 * - Breadcrumb navigation
 * - Wallet connection requirement
 *
 * Priority: P0 (Governance Critical)
 * Task: RWA-005
 */
export default function VotingPage({
  params,
}: {
  params: { projectId: string };
}) {
  const router = useRouter();
  const projectId = parseInt(params.projectId, 10);

  // TODO: Replace with actual wagmi hooks for blockchain data fetching
  // Will integrate with:
  // - useReadContract for ProjectRegistry.getProject()
  // - useAccount for user wallet connection
  // - useReadContract for VotingEscrow.balanceOf() (voting power)
  const mockProject: RWAProject = {
    id: projectId,
    issuer: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    rwaToken: '0x1234567890123456789012345678901234567890',
    targetRaise: BigInt('500000000000'), // 500K USDC
    totalRaised: BigInt('350000000000'), // 350K USDC
    votingEndTime: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days
    saleEndTime: Math.floor(Date.now() / 1000) + 86400 * 30, // 30 days
    complianceDocURI: 'ipfs://QmExample1',
    auditReportURI: 'ipfs://QmExample2',
    disclosureURI: 'ipfs://QmExample3',
    status: ProjectStatus.Voting,
    approveVotes: BigInt('6000000000000000000'), // 6 voting power (60%)
    rejectVotes: BigInt('3000000000000000000'), // 3 voting power (30%)
    progress: 70,
    timeRemaining: 86400 * 30,
    apy: 8.5,
  };

  const project = mockProject;

  // TODO: Get user address from wagmi useAccount()
  const mockUserAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

  // Handle invalid project ID
  if (isNaN(projectId)) {
    return (
      <>
        <Navigation />
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Alert severity="error">Invalid project ID</Alert>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/launchpad')}
            sx={{ mt: 2 }}
          >
            Back to Launchpad
          </Button>
        </Container>
      </>
    );
  }

  // Only allow voting page for projects in Voting status
  if (project.status !== ProjectStatus.Voting) {
    return (
      <>
        <Navigation />
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Alert severity="warning">
            This project is not in voting phase. Voting is only available for projects
            with status &quot;Voting&quot;.
          </Alert>
          <Box display="flex" gap={2} mt={2}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push(`/launchpad/${projectId}`)}
            >
              View Project Details
            </Button>
            <Button onClick={() => router.push('/launchpad')}>
              Back to Launchpad
            </Button>
          </Box>
        </Container>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
          <Link
            underline="hover"
            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            color="inherit"
            onClick={() => router.push('/')}
          >
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Home
          </Link>
          <Link
            underline="hover"
            color="inherit"
            sx={{ cursor: 'pointer' }}
            onClick={() => router.push('/launchpad')}
          >
            Launchpad
          </Link>
          <Link
            underline="hover"
            color="inherit"
            sx={{ cursor: 'pointer' }}
            onClick={() => router.push(`/launchpad/${projectId}`)}
          >
            Project #{projectId}
          </Link>
          <Typography color="text.primary">Governance Voting</Typography>
        </Breadcrumbs>

        {/* Page Header */}
        <Box mb={4}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push(`/launchpad/${projectId}`)}
            sx={{
              mb: 2,
              color: '#FF6B35',
              '&:hover': { backgroundColor: '#FFF8F0' },
            }}
          >
            Back to Project Details
          </Button>

          <Typography variant="h4" component="h1" fontWeight="bold" color="#FF6B35">
            Governance Voting
          </Typography>
          <Typography variant="h6" color="text.secondary" mt={0.5}>
            RWA Project #{project.id}
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Cast your vote to approve or reject this project. Voting is weighted by your
            veNFT balance.
          </Typography>
        </Box>

        {/* Main Content Grid */}
        <Grid container spacing={4}>
          {/* Left Column: Voting Interface */}
          <Grid item xs={12} md={6}>
            <VotingUI project={project} />
          </Grid>

          {/* Right Column: Vote Execution */}
          <Grid item xs={12} md={6}>
            <VoteExecutionPanel project={project} />
          </Grid>

          {/* Full Width: Vote History */}
          <Grid item xs={12}>
            <VoteHistory userAddress={mockUserAddress} />
          </Grid>
        </Grid>

        {/* Information Alert */}
        <Alert
          severity="info"
          sx={{ mt: 4, backgroundColor: '#FFF8F0', border: '1px solid #FFE0B2' }}
        >
          <Typography variant="body2" fontWeight="600" mb={1}>
            How Governance Voting Works
          </Typography>
          <Typography variant="caption" component="div" mb={0.5}>
            • Only veNFT holders can participate in governance voting
          </Typography>
          <Typography variant="caption" component="div" mb={0.5}>
            • Your voting power is determined by your veNFT balance at the time of voting
          </Typography>
          <Typography variant="caption" component="div" mb={0.5}>
            • Each veNFT can only vote once per project (approve or reject)
          </Typography>
          <Typography variant="caption" component="div" mb={0.5}>
            • A project is approved if it receives {'>'}50% of total voting power in approve
            votes
          </Typography>
          <Typography variant="caption" component="div">
            • Anyone can execute the vote result once the threshold is met
          </Typography>
        </Alert>
      </Container>
    </>
  );
}
