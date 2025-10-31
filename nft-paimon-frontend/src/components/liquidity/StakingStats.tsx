'use client';

import { Box, Stack, Typography } from '@mui/material';
import { formatUnits } from 'viem';
import { LIQUIDITY_DESIGN_TOKENS } from './constants';

interface StakingStatsProps {
  /** User's staked LP tokens */
  stakedBalance: bigint;
  /** LP token symbol */
  lpSymbol: string;
  /** Total staked in gauge */
  totalStaked: bigint;
  /** Annual Percentage Rate */
  apr: string;
  /** Total Value Locked */
  tvl?: string;
}

/**
 * StatItem Component
 * Individual stat display
 */
const StatItem: React.FC<{
  label: string;
  value: string;
  highlight?: boolean;
}> = ({ label, value, highlight = false }) => (
  <Box>
    <Typography variant="caption" color="text.secondary" fontSize="0.75rem" sx={{ mb: 0.5, display: 'block' }}>
      {label}
    </Typography>
    <Typography
      variant="h6"
      fontWeight={700}
      color={highlight ? 'primary.main' : 'text.primary'}
      fontSize="1.125rem"
    >
      {value}
    </Typography>
  </Box>
);

/**
 * StakingStats Component
 * Display staking statistics
 *
 * Features:
 * - Staked balance
 * - APR
 * - Total staked TVL
 * - Grid layout
 */
export const StakingStats: React.FC<StakingStatsProps> = ({
  stakedBalance,
  lpSymbol,
  totalStaked,
  apr,
  tvl,
}) => {
  const stakedFormatted = formatUnits(stakedBalance, 18);
  const totalStakedFormatted = formatUnits(totalStaked, 18);

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_MEDIUM,
        backgroundColor: 'background.elevated',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography variant="subtitle2" color="text.secondary" fontSize="0.875rem" fontWeight={600} sx={{ mb: 2 }}>
        Staking Statistics
      </Typography>

      <Stack spacing={2}>
        {/* Staked Balance */}
        <StatItem
          label="Your Staked LP"
          value={`${Number(stakedFormatted).toFixed(4)} ${lpSymbol}`}
        />

        {/* APR */}
        <StatItem
          label="Current APR"
          value={apr}
          highlight={true}
        />

        {/* Total Staked */}
        <StatItem
          label="Total Staked"
          value={`${Number(totalStakedFormatted).toFixed(2)} ${lpSymbol}`}
        />

        {/* TVL */}
        {tvl && (
          <StatItem
            label="Total Value Locked"
            value={tvl}
          />
        )}
      </Stack>
    </Box>
  );
};
