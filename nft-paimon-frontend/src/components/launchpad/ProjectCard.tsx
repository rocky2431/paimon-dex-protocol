'use client';

import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  LinearProgress,
  Button,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import VerifiedIcon from '@mui/icons-material/Verified';
import { ProjectStatus, ViewMode } from '@/types/launchpad';
import type { RWAProject } from '@/types/launchpad';

interface ProjectCardProps {
  project: RWAProject;
  viewMode: ViewMode;
}

/**
 * ProjectCard Component
 *
 * Display individual RWA project with key metrics
 *
 * Features:
 * - Status badge (Pending/Active/Completed)
 * - Raise progress bar
 * - Countdown timer
 * - APY display
 * - Compliance verification badge
 * - Click to view details
 *
 * @param project - RWA project data
 * @param viewMode - Grid or list view mode
 */
export function ProjectCard({ project, viewMode }: ProjectCardProps) {
  const router = useRouter();

  const getStatusColor = (status: ProjectStatus): string => {
    switch (status) {
      case ProjectStatus.Voting:
        return '#FFB74D'; // Amber for voting
      case ProjectStatus.Active:
        return '#FF6B35'; // Warm orange for active
      case ProjectStatus.Completed:
        return '#8BC34A'; // Green for completed
      case ProjectStatus.Rejected:
        return '#9E9E9E'; // Gray for rejected
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

    if (days > 0) {
      return `${days}d ${hours}h remaining`;
    }
    return `${hours}h remaining`;
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

  const handleCardClick = () => {
    router.push(`/launchpad/${project.id}`);
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        border: '1px solid #FFE0B2',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 24px rgba(255, 107, 53, 0.2)',
          borderColor: '#FF6B35',
        },
      }}
      onClick={handleCardClick}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        {/* Status Badge */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Chip
            label={getStatusLabel(project.status)}
            size="small"
            sx={{
              backgroundColor: getStatusColor(project.status),
              color: 'white',
              fontWeight: 'bold',
            }}
          />
          {project.complianceDocURI && (
            <VerifiedIcon sx={{ color: '#8BC34A', fontSize: 20 }} />
          )}
        </Box>

        {/* Project Name */}
        <Typography variant="h6" component="h3" fontWeight="bold" mb={1}>
          RWA Project #{project.id}
        </Typography>

        {/* Issuer */}
        <Typography variant="body2" color="text.secondary" mb={2} noWrap>
          Issuer: {project.issuer.slice(0, 6)}...{project.issuer.slice(-4)}
        </Typography>

        {/* Progress Bar */}
        <Box mb={2}>
          <Box display="flex" justifyContent="space-between" mb={0.5}>
            <Typography variant="body2" color="text.secondary">
              Progress
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="#FF6B35">
              {project.progress.toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={project.progress}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: '#FFE0B2',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#FF6B35',
                borderRadius: 4,
              },
            }}
          />
          <Box display="flex" justifyContent="space-between" mt={0.5}>
            <Typography variant="caption" color="text.secondary">
              {formatAmount(project.totalRaised)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatAmount(project.targetRaise)}
            </Typography>
          </Box>
        </Box>

        {/* Metrics */}
        <Box display="flex" gap={2} flexWrap="wrap">
          {/* APY */}
          {project.apy && (
            <Box display="flex" alignItems="center" gap={0.5}>
              <TrendingUpIcon sx={{ fontSize: 16, color: '#FF6B35' }} />
              <Typography variant="body2" color="text.secondary">
                APY:
              </Typography>
              <Typography variant="body2" fontWeight="bold" color="#FF6B35">
                {project.apy.toFixed(1)}%
              </Typography>
            </Box>
          )}

          {/* Time Remaining */}
          {project.status === ProjectStatus.Active && (
            <Box display="flex" alignItems="center" gap={0.5}>
              <AccessTimeIcon sx={{ fontSize: 16, color: '#FFB74D' }} />
              <Typography variant="caption" color="text.secondary">
                {formatTimeRemaining(project.timeRemaining)}
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>

      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button
          variant="contained"
          fullWidth
          sx={{
            backgroundColor: '#FF6B35',
            color: 'white',
            fontWeight: 'bold',
            '&:hover': {
              backgroundColor: '#FF8A65',
            },
          }}
          onClick={handleCardClick}
        >
          View Details
        </Button>
      </CardActions>
    </Card>
  );
}
