'use client';

import { Box, Card, CardContent, Typography, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert } from '@mui/material';
import Link from 'next/link';
import { REWARDS_DESIGN_TOKENS } from './constants';

interface VestingModeIndicatorProps {
  useEsVesting: boolean | undefined;
  loading: boolean;
}

/**
 * VestingModeIndicator Component
 * Displays the current reward vesting mode (vesting or immediate)
 * 显示当前奖励归属化模式（归属化或即时发放）
 *
 * Features:
 * - Mode badge (Vesting Enabled / Direct Distribution)
 * - 365-day vesting explanation
 * - Pros/cons comparison table
 * - Link to Convert page when vesting is enabled
 *
 * @param useEsVesting - Whether esPaimon vesting is enabled
 * @param loading - Whether data is loading
 */
export const VestingModeIndicator: React.FC<VestingModeIndicatorProps> = ({
  useEsVesting,
  loading,
}) => {
  // Handle loading state
  if (loading) {
    return (
      <Card
        role="article"
        sx={{
          background: 'linear-gradient(135deg, rgba(18, 18, 18, 0.6), rgba(18, 18, 18, 0.8))',
          borderRadius: REWARDS_DESIGN_TOKENS.RADIUS_LARGE,
          border: '1px solid rgba(255, 152, 0, 0.1)',
        }}
      >
        <CardContent>
          <Typography variant="body1">Loading...</Typography>
        </CardContent>
      </Card>
    );
  }

  // Handle undefined/unavailable state
  if (useEsVesting === undefined || useEsVesting === null) {
    return (
      <Card
        role="article"
        sx={{
          background: 'linear-gradient(135deg, rgba(18, 18, 18, 0.6), rgba(18, 18, 18, 0.8))',
          borderRadius: REWARDS_DESIGN_TOKENS.RADIUS_LARGE,
          border: '1px solid rgba(255, 152, 0, 0.1)',
        }}
      >
        <CardContent>
          <Typography variant="body1">Unavailable</Typography>
        </CardContent>
      </Card>
    );
  }

  const vestingMode = useEsVesting
    ? {
        label: 'Vesting Enabled',
        description: 'Rewards vest over 365 days as esPAIMON tokens',
        color: '#ff9800' as const,
      }
    : {
        label: 'Direct Distribution',
        description: 'Rewards distributed immediately as PAIMON tokens',
        color: '#ffa726' as const,
      };

  return (
    <Card
      role="article"
      sx={{
        background: 'linear-gradient(135deg, rgba(18, 18, 18, 0.6), rgba(18, 18, 18, 0.8))',
        borderRadius: REWARDS_DESIGN_TOKENS.RADIUS_LARGE,
        border: '1px solid rgba(255, 152, 0, 0.1)',
        boxShadow: REWARDS_DESIGN_TOKENS.SHADOW_CARD,
      }}
    >
      <CardContent>
        {/* Header with mode badge */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography
            role="heading"
            variant="h6"
            sx={{ fontWeight: 600, color: '#ff9800', mr: 2 }}
          >
            Vesting Mode
          </Typography>
          <Chip
            label={vestingMode.label}
            sx={{
              backgroundColor: vestingMode.color,
              color: 'white',
              fontWeight: 600,
            }}
          />
        </Box>

        {/* Mode description */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">{vestingMode.description}</Typography>
        </Alert>

        {/* Comparison table */}
        <Box sx={{ mb: 3 }}>
          <Typography role="heading" variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Comparison
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Mode</TableCell>
                  <TableCell>Pros</TableCell>
                  <TableCell>Cons</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>Vesting Enabled</TableCell>
                  <TableCell>Full reward amount (100%), long-term value</TableCell>
                  <TableCell>365-day lock period</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Direct Distribution</TableCell>
                  <TableCell>Immediate liquidity, no lock</TableCell>
                  <TableCell>Reduced reward (50% penalty)</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Link to Convert page (only when vesting is enabled) */}
        {useEsVesting && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Link href="/convert" passHref style={{ textDecoration: 'none' }}>
              <Typography
                variant="body2"
                sx={{
                  color: '#ff9800',
                  fontWeight: 600,
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                Go to Convert Page →
              </Typography>
            </Link>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
