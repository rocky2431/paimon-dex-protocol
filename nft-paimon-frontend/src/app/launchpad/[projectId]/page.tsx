'use client';

import { Container, Box, Grid, Typography, Button, Alert } from '@mui/material';
import { useRouter } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Navigation } from '@/components/layout/Navigation';
import { ComplianceDocViewer } from '@/components/launchpad/ComplianceDocViewer';
import { ProjectMetrics } from '@/components/launchpad/ProjectMetrics';
import { ParticipateForm } from '@/components/launchpad/ParticipateForm';
import { VotingUI } from '@/components/launchpad/VotingUI';
import { ProjectStatus } from '@/types/launchpad';
import type { RWAProject } from '@/types/launchpad';

/**
 * Project Details Page
 *
 * Dynamic route: /launchpad/[projectId]
 *
 * Features:
 * - Compliance document viewer (CRITICAL - Above the fold)
 * - Project metrics and countdown timer
 * - Participate form with USDC balance check
 * - veNFT governance voting interface
 * - Real-time blockchain data updates
 *
 * Priority: P0 (Highest)
 * Complexity: 6/10
 */
export default function ProjectDetailsPage({
  params,
}: {
  params: { projectId: string };
}) {
  const router = useRouter();
  const projectId = parseInt(params.projectId, 10);

  // TODO: Replace with actual wagmi hooks for blockchain data fetching
  // For now, using mock data to demonstrate structure
  // Will integrate with:
  // - useReadContract for ProjectRegistry.getProject()
  // - useReadContract for IssuanceController.getSale()
  // - useAccount for user wallet connection
  // - useBalance for USDC balance
  const mockProject: RWAProject = {
    id: projectId,
    issuer: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    rwaToken: '0x1234567890123456789012345678901234567890',
    targetRaise: BigInt('500000000000'), // 500K USDC (6 decimals)
    totalRaised: BigInt('350000000000'), // 350K USDC
    votingEndTime: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days from now
    saleEndTime: Math.floor(Date.now() / 1000) + 86400 * 30, // 30 days from now
    complianceDocURI: 'ipfs://QmExample1OfferingMemo',
    auditReportURI: 'ipfs://QmExample2AuditReport',
    disclosureURI: 'ipfs://QmExample3RiskDisclosure',
    status: ProjectStatus.Active,
    approveVotes: BigInt('1000000000000000000'), // 1 voting power
    rejectVotes: BigInt('500000000000000000'),
    progress: 70, // 350K / 500K * 100
    timeRemaining: 86400 * 30, // 30 days in seconds
    apy: 8.5,
  };

  const project = mockProject;

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

  // TODO: Handle loading and error states from blockchain data fetching
  // if (isLoading) return <LoadingSpinner />
  // if (error) return <ErrorMessage />

  return (
    <>
      <Navigation />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Back Button */}
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/launchpad')}
          sx={{
            mb: 3,
            color: '#FF6B35',
            '&:hover': { backgroundColor: '#FFF8F0' },
          }}
        >
          Back to Launchpad
        </Button>

        {/* Page Header */}
        <Box mb={4}>
          <Typography variant="h4" component="h1" fontWeight="bold" color="#FF6B35">
            RWA Project #{project.id}
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Issuer: {project.issuer}
          </Typography>
        </Box>

        {/* CRITICAL SECTION: Compliance Documents - Must be above the fold */}
        <ComplianceDocViewer
          complianceDocURI={project.complianceDocURI}
          auditReportURI={project.auditReportURI}
          disclosureURI={project.disclosureURI}
        />

        {/* Main Content Grid */}
        <Grid container spacing={4}>
          {/* Left Column: Project Metrics */}
          <Grid item xs={12} md={7}>
            <ProjectMetrics project={project} />
          </Grid>

          {/* Right Column: Participate Form or Voting UI */}
          <Grid item xs={12} md={5}>
            {project.status === ProjectStatus.Voting ? (
              <VotingUI project={project} />
            ) : project.status === ProjectStatus.Active ? (
              <ParticipateForm project={project} />
            ) : (
              <Alert severity="info" sx={{ mb: 3 }}>
                {project.status === ProjectStatus.Completed
                  ? 'This project has been completed'
                  : 'This project is no longer accepting participants'}
              </Alert>
            )}
          </Grid>
        </Grid>
      </Container>
    </>
  );
}
