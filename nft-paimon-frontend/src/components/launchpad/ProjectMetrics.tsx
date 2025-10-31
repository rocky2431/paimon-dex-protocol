'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  LinearProgress,
  Chip,
  Grid,
  Divider,
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { ProjectStatus } from '@/types/launchpad';
import type { RWAProject } from '@/types/launchpad';

interface ProjectMetricsProps {
  project: RWAProject;
}

/**
 * ProjectMetrics Component
 *
 * Display project overview, statistics, and countdown timer
 *
 * Features:
 * - Real-time countdown timer
 * - Progress bar for raise amount
 * - Key metrics (APY, status, issuer)
 * - Status badge with color coding
 * - Responsive grid layout
 */
export function ProjectMetrics({ project }: ProjectMetricsProps) {
  const [timeRemaining, setTimeRemaining] = useState(project.timeRemaining);

  // Real-time countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getStatusColor = (status: ProjectStatus): string => {
    switch (status) {
      case ProjectStatus.Voting:
        return '#FFB74D'; // Amber
      case ProjectStatus.Active:
        return '#FF6B35'; // Warm orange
      case ProjectStatus.Completed:
        return '#8BC34A'; // Green
      case ProjectStatus.Rejected:
        return '#9E9E9E'; // Gray
      default:
        return '#FFB74D';
    }
  };

  const getStatusLabel = (status: ProjectStatus): string => {
    switch (status) {
      case ProjectStatus.Voting:
        return 'Voting';
      case ProjectStatus.Active:
        return 'Active';
      case ProjectStatus.Completed:
        return 'Completed';
      case ProjectStatus.Rejected:
        return 'Rejected';
      default:
        return 'Unknown';
    }
  };

  const formatTimeRemaining = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const formatAmount = (amount: bigint): string => {
    // USDC has 6 decimals
    const usdcAmount = Number(amount) / 1_000_000;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(usdcAmount);
  };

  return (
    <Card
      sx={{
        borderRadius: 2,
        border: '1px solid #FFE0B2',
        backgroundColor: '#FFFFFF',
      }}
    >
      <CardContent>
        {/* Status Badge and Timer */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Chip
            label={getStatusLabel(project.status)}
            sx={{
              backgroundColor: getStatusColor(project.status),
              color: 'white',
              fontWeight: 'bold',
              fontSize: '0.875rem',
            }}
          />

          {(project.status === ProjectStatus.Active ||
            project.status === ProjectStatus.Voting) && (
            <Box display="flex" alignItems="center" gap={1}>
              <AccessTimeIcon sx={{ color: '#FFB74D', fontSize: 20 }} />
              <Typography variant="body2" fontWeight="600" color="#FF6B35">
                {formatTimeRemaining(timeRemaining)}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Progress Section */}
        <Box mb={3}>
          <Typography variant="h5" fontWeight="bold" color="#FF6B35" mb={1}>
            {formatAmount(project.totalRaised)}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            raised of {formatAmount(project.targetRaise)} goal
          </Typography>

          <LinearProgress
            variant="determinate"
            value={project.progress}
            sx={{
              height: 10,
              borderRadius: 5,
              backgroundColor: '#FFE0B2',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#FF6B35',
                borderRadius: 5,
              },
            }}
          />

          <Box display="flex" justifyContent="space-between" mt={1}>
            <Typography variant="caption" color="text.secondary">
              {project.progress.toFixed(1)}% funded
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatAmount(project.targetRaise - project.totalRaised)} remaining
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 3, borderColor: '#FFE0B2' }} />

        {/* Key Metrics Grid */}
        <Grid container spacing={2}>
          {/* APY */}
          {project.apy && (
            <Grid item xs={6}>
              <Box
                sx={{
                  p: 2,
                  backgroundColor: '#FFF8F0',
                  borderRadius: 2,
                  border: '1px solid #FFE0B2',
                }}
              >
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <TrendingUpIcon sx={{ fontSize: 18, color: '#FF6B35' }} />
                  <Typography variant="caption" color="text.secondary">
                    Expected APY
                  </Typography>
                </Box>
                <Typography variant="h6" fontWeight="bold" color="#FF6B35">
                  {project.apy.toFixed(1)}%
                </Typography>
              </Box>
            </Grid>
          )}

          {/* RWA Token Address */}
          <Grid item xs={6}>
            <Box
              sx={{
                p: 2,
                backgroundColor: '#FFF8F0',
                borderRadius: 2,
                border: '1px solid #FFE0B2',
              }}
            >
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <AccountBalanceWalletIcon sx={{ fontSize: 18, color: '#FF6B35' }} />
                <Typography variant="caption" color="text.secondary">
                  RWA Token
                </Typography>
              </Box>
              <Typography variant="body2" fontWeight="600" color="text.primary" noWrap>
                {project.rwaToken.slice(0, 6)}...{project.rwaToken.slice(-4)}
              </Typography>
            </Box>
          </Grid>

          {/* Issuer Address */}
          <Grid item xs={6}>
            <Box
              sx={{
                p: 2,
                backgroundColor: '#FFF8F0',
                borderRadius: 2,
                border: '1px solid #FFE0B2',
              }}
            >
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <PeopleIcon sx={{ fontSize: 18, color: '#FF6B35' }} />
                <Typography variant="caption" color="text.secondary">
                  Issuer
                </Typography>
              </Box>
              <Typography variant="body2" fontWeight="600" color="text.primary" noWrap>
                {project.issuer.slice(0, 6)}...{project.issuer.slice(-4)}
              </Typography>
            </Box>
          </Grid>

          {/* Voting Stats (for voting projects) */}
          {project.status === ProjectStatus.Voting && (
            <Grid item xs={6}>
              <Box
                sx={{
                  p: 2,
                  backgroundColor: '#FFF8F0',
                  borderRadius: 2,
                  border: '1px solid #FFE0B2',
                }}
              >
                <Typography variant="caption" color="text.secondary" mb={1}>
                  Voting Stats
                </Typography>
                <Box display="flex" justifyContent="space-between" mt={1}>
                  <Typography variant="caption" color="#8BC34A" fontWeight="600">
                    ✓ Approve: {Number(project.approveVotes) / 1e18}
                  </Typography>
                  <Typography variant="caption" color="#F44336" fontWeight="600">
                    ✗ Reject: {Number(project.rejectVotes) / 1e18}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
}
