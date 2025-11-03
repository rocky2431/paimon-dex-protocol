'use client';

import { Box, Card, CardContent, Typography, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert } from '@mui/material';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations();

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
        label: t('vesting.mode.enabled'),
        description: t('vesting.description.365days'),
        color: '#ff9800' as const,
      }
    : {
        label: t('vesting.mode.disabled'),
        description: t('vesting.description.immediate'),
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
            {t('vesting.title')}
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
            {t('vesting.comparison')}
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('vesting.mode')}</TableCell>
                  <TableCell>{t('vesting.pros')}</TableCell>
                  <TableCell>{t('vesting.cons')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>{t('vesting.mode.enabled')}</TableCell>
                  <TableCell>{t('vesting.pros.vesting')}</TableCell>
                  <TableCell>{t('vesting.cons.vesting')}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t('vesting.mode.disabled')}</TableCell>
                  <TableCell>{t('vesting.pros.immediate')}</TableCell>
                  <TableCell>{t('vesting.cons.immediate')}</TableCell>
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
                {t('vesting.link.convert')} →
              </Typography>
            </Link>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
