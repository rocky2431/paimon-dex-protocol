'use client';

import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { SortOption, ProjectStatus, AssetTier } from '@/types/launchpad';
import type { ProjectFilters as ProjectFiltersType } from '@/types/launchpad';

interface ProjectFiltersProps {
  filters: ProjectFiltersType;
  sortBy: SortOption;
  onFilterChange: (filters: ProjectFiltersType) => void;
  onSortChange: (sortBy: SortOption) => void;
}

/**
 * ProjectFilters Component
 *
 * Filter and sort controls for project list
 *
 * Features:
 * - Status filter (All/Voting/Active/Completed)
 * - Asset tier filter (All/T1/T2/T3)
 * - Search by project name or issuer
 * - Sort by raise amount, deadline, APY, newest
 *
 * @param filters - Current filter state
 * @param sortBy - Current sort option
 * @param onFilterChange - Filter change handler
 * @param onSortChange - Sort change handler
 */
export function ProjectFilters({
  filters,
  sortBy,
  onFilterChange,
  onSortChange,
}: ProjectFiltersProps) {
  const handleStatusChange = (status: string) => {
    if (status === 'all') {
      onFilterChange({ ...filters, status: undefined });
    } else {
      const statusEnum = parseInt(status) as ProjectStatus;
      onFilterChange({ ...filters, status: [statusEnum] });
    }
  };

  const handleAssetTierChange = (tier: string) => {
    if (tier === 'all') {
      onFilterChange({ ...filters, assetTier: undefined });
    } else {
      onFilterChange({ ...filters, assetTier: [tier as AssetTier] });
    }
  };

  const handleSearchChange = (query: string) => {
    onFilterChange({ ...filters, searchQuery: query });
  };

  const handleSortChange = (sort: string) => {
    onSortChange(sort as SortOption);
  };

  return (
    <Box
      display="flex"
      gap={2}
      flexWrap="wrap"
      sx={{
        p: 3,
        backgroundColor: '#FFF8F0',
        borderRadius: 2,
        border: '1px solid #FFE0B2',
      }}
    >
      {/* Search */}
      <TextField
        placeholder="Search projects..."
        size="small"
        value={filters.searchQuery || ''}
        onChange={(e) => handleSearchChange(e.target.value)}
        sx={{
          flexGrow: 1,
          minWidth: 200,
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#FFE0B2',
            },
            '&:hover fieldset': {
              borderColor: '#FF6B35',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#FF6B35',
            },
          },
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: '#FFB74D' }} />
            </InputAdornment>
          ),
        }}
      />

      {/* Status Filter */}
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel
          sx={{
            '&.Mui-focused': {
              color: '#FF6B35',
            },
          }}
        >
          Status
        </InputLabel>
        <Select
          label="Status"
          value={filters.status?.[0]?.toString() || 'all'}
          onChange={(e) => handleStatusChange(e.target.value)}
          sx={{
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#FFE0B2',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#FF6B35',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#FF6B35',
            },
          }}
        >
          <MenuItem value="all">All Status</MenuItem>
          <MenuItem value={ProjectStatus.Voting.toString()}>Voting</MenuItem>
          <MenuItem value={ProjectStatus.Active.toString()}>Active</MenuItem>
          <MenuItem value={ProjectStatus.Completed.toString()}>Completed</MenuItem>
        </Select>
      </FormControl>

      {/* Asset Tier Filter */}
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel
          sx={{
            '&.Mui-focused': {
              color: '#FF6B35',
            },
          }}
        >
          Asset Tier
        </InputLabel>
        <Select
          label="Asset Tier"
          value={filters.assetTier?.[0] || 'all'}
          onChange={(e) => handleAssetTierChange(e.target.value)}
          sx={{
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#FFE0B2',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#FF6B35',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#FF6B35',
            },
          }}
        >
          <MenuItem value="all">All Tiers</MenuItem>
          <MenuItem value={AssetTier.T1}>T1 (US Treasuries)</MenuItem>
          <MenuItem value={AssetTier.T2}>T2 (Investment Grade)</MenuItem>
          <MenuItem value={AssetTier.T3}>T3 (Revenue Pools)</MenuItem>
        </Select>
      </FormControl>

      {/* Sort */}
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel
          sx={{
            '&.Mui-focused': {
              color: '#FF6B35',
            },
          }}
        >
          Sort By
        </InputLabel>
        <Select
          label="Sort By"
          value={sortBy}
          onChange={(e) => handleSortChange(e.target.value)}
          sx={{
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#FFE0B2',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#FF6B35',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#FF6B35',
            },
          }}
        >
          <MenuItem value={SortOption.RaiseAmount}>Raise Amount (High to Low)</MenuItem>
          <MenuItem value={SortOption.EndDate}>Ending Soonest</MenuItem>
          <MenuItem value={SortOption.APY}>APY (High to Low)</MenuItem>
          <MenuItem value={SortOption.Newest}>Newest First</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
}
