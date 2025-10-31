'use client';

import { useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import { ProjectCard } from './ProjectCard';
import { ProjectFilters } from './ProjectFilters';
import { ViewMode, SortOption, ProjectStatus } from '@/types/launchpad';
import type { RWAProject, ProjectFilters as ProjectFiltersType } from '@/types/launchpad';

/**
 * ProjectList Component
 *
 * Main component for displaying RWA projects with filters and sorting
 *
 * Features:
 * - Grid/List view toggle
 * - Project filtering by status and asset tier
 * - Sorting by various criteria
 * - Loading and error states
 * - Responsive layout
 *
 * @example
 * ```tsx
 * <ProjectList />
 * ```
 */
export function ProjectList() {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Grid);
  const [sortBy, setSortBy] = useState<SortOption>(SortOption.RaiseAmount);
  const [filters, setFilters] = useState<ProjectFiltersType>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: Replace with actual blockchain data fetching using wagmi hooks
  // For now, using mock data to demonstrate structure
  const mockProjects: RWAProject[] = [
    {
      id: 1,
      issuer: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      rwaToken: '0x1234567890123456789012345678901234567890',
      targetRaise: BigInt('500000000000'), // 500K USDC (6 decimals)
      totalRaised: BigInt('350000000000'), // 350K USDC
      votingEndTime: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days from now
      saleEndTime: Math.floor(Date.now() / 1000) + 86400 * 30, // 30 days from now
      complianceDocURI: 'ipfs://QmExample1',
      auditReportURI: 'ipfs://QmExample2',
      disclosureURI: 'ipfs://QmExample3',
      status: ProjectStatus.Active,
      approveVotes: BigInt('1000000000000000000'), // 1 voting power
      rejectVotes: BigInt('500000000000000000'),
      progress: 70, // 350K / 500K * 100
      timeRemaining: 86400 * 30, // 30 days in seconds
      apy: 8.5,
    },
  ];

  const projects = mockProjects;

  const handleViewModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: ViewMode | null
  ) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  const handleFilterChange = (newFilters: ProjectFiltersType) => {
    setFilters(newFilters);
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress sx={{ color: '#FF6B35' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={4}
        flexWrap="wrap"
        gap={2}
      >
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold" color="#FF6B35">
            RWA Launchpad
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Discover tokenized real-world asset investment opportunities
          </Typography>
        </Box>

        {/* View Mode Toggle */}
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewModeChange}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              color: '#FFB74D',
              borderColor: '#FFB74D',
              '&.Mui-selected': {
                backgroundColor: '#FF6B35',
                color: 'white',
                '&:hover': {
                  backgroundColor: '#FF8A65',
                },
              },
            },
          }}
        >
          <ToggleButton value={ViewMode.Grid} aria-label="grid view">
            <GridViewIcon />
          </ToggleButton>
          <ToggleButton value={ViewMode.List} aria-label="list view">
            <ViewListIcon />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Filters */}
      <ProjectFilters
        filters={filters}
        sortBy={sortBy}
        onFilterChange={handleFilterChange}
        onSortChange={handleSortChange}
      />

      {/* Project Grid/List */}
      {projects.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Typography variant="h6" color="text.secondary">
            No projects found
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Try adjusting your filters or check back later for new opportunities
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3} mt={2}>
          {projects.map((project) => (
            <Grid
              item
              key={project.id}
              xs={12}
              sm={viewMode === ViewMode.Grid ? 6 : 12}
              md={viewMode === ViewMode.Grid ? 4 : 12}
            >
              <ProjectCard project={project} viewMode={viewMode} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
