/**
 * PositionList Component
 * Display all user Treasury positions with auto-refresh and CSV export
 */

'use client';

import { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  CardContent,
  Alert,
  CircularProgress,
  Stack,
  Chip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import { useAccount } from 'wagmi';
import { StyledCard } from '@/components/common';
import { useUserPositions } from './hooks/useUserPositions';
import { useInterval } from './hooks/useInterval';
import { PositionCard } from './PositionCard';
import { HealthFactorGauge } from './HealthFactorGauge';
import { TREASURY_THEME } from './constants';

const AUTO_REFRESH_INTERVAL = 60000; // 60 seconds

export function PositionList() {
  const { address: userAddress, isConnected } = useAccount();
  const { positions, isLoading, refetchAll, totalCollateralUSD, totalDebtUSD, overallHealthFactor } =
    useUserPositions();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());

  // Manual refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetchAll();
    setLastRefreshTime(new Date());
    setIsRefreshing(false);
  }, [refetchAll]);

  // Auto-refresh every 60 seconds
  useInterval(
    () => {
      refetchAll();
      setLastRefreshTime(new Date());
    },
    isConnected ? AUTO_REFRESH_INTERVAL : null
  );

  // CSV Export
  const handleExportCSV = useCallback(() => {
    if (positions.length === 0) return;

    const headers = [
      'Asset Symbol',
      'Asset Name',
      'Tier',
      'Collateral Amount',
      'Collateral Value (USD)',
      'HYD Minted',
      'Health Factor (%)',
      'Collateralization Ratio (%)',
      'Current Price (USD)',
      'Can Redeem',
      'Deposit Time',
    ];

    const rows = positions.map((pos) => [
      pos.assetSymbol,
      pos.assetName,
      pos.assetTier,
      parseFloat(pos.rwaAmount.toString()) / 1e18,
      pos.rwaValueUSD.toFixed(2),
      parseFloat(pos.hydMinted.toString()) / 1e18,
      pos.healthFactor.toFixed(2),
      pos.collateralizationRatio.toFixed(2),
      pos.rwaPrice.toFixed(4),
      pos.canRedeem ? 'Yes' : 'No',
      new Date(Number(pos.depositTime) * 1000).toISOString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `treasury-positions-${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [positions]);

  // Wallet connection check
  if (!isConnected) {
    return (
      <Alert severity="warning" sx={{ mb: 3 }}>
        Please connect your wallet to view your Treasury positions
      </Alert>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: TREASURY_THEME.PRIMARY }} />
      </Box>
    );
  }

  // Empty state
  if (positions.length === 0) {
    return (
      <StyledCard
        variant="white"
        sx={{
          textAlign: 'center',
          py: 6,
        }}
      >
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, color: TREASURY_THEME.TITLE }}>
            No Treasury Positions Found
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, color: TREASURY_THEME.SUBTITLE }}>
            You haven&apos;t deposited any RWA collateral yet. Visit the Deposit page to get started.
          </Typography>
          <Button
            variant="contained"
            href="/treasury/deposit"
            sx={{
              backgroundColor: TREASURY_THEME.PRIMARY,
              color: '#000',
              fontWeight: 700,
              '&:hover': {
                backgroundColor: TREASURY_THEME.SECONDARY,
              },
            }}
          >
            Deposit RWA Collateral
          </Button>
        </CardContent>
      </StyledCard>
    );
  }

  return (
    <Box>
      {/* Header with actions */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: TREASURY_THEME.TITLE }}>
            Your Positions
          </Typography>
          <Typography variant="caption" sx={{ color: TREASURY_THEME.CAPTION }}>
            Last updated: {lastRefreshTime.toLocaleTimeString()} • Auto-refresh in 60s
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={isRefreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
            disabled={isRefreshing}
            onClick={handleRefresh}
            sx={{
              borderColor: TREASURY_THEME.EMPHASIS,
              color: TREASURY_THEME.EMPHASIS,
              fontWeight: 600,
              '&:hover': {
                borderColor: TREASURY_THEME.EMPHASIS,
                backgroundColor: `${TREASURY_THEME.EMPHASIS}10`,
              },
            }}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportCSV}
            sx={{
              borderColor: TREASURY_THEME.EMPHASIS,
              color: TREASURY_THEME.EMPHASIS,
              fontWeight: 600,
              '&:hover': {
                borderColor: TREASURY_THEME.EMPHASIS,
                backgroundColor: `${TREASURY_THEME.EMPHASIS}10`,
              },
            }}
          >
            Export CSV
          </Button>
        </Stack>
      </Box>

      {/* Overall stats summary */}
      <StyledCard variant="white" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: TREASURY_THEME.TITLE }}>
            Portfolio Overview
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <Box>
                <Typography variant="caption" sx={{ color: TREASURY_THEME.CAPTION }}>
                  Total Collateral
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: TREASURY_THEME.EMPHASIS }}>
                  ${totalCollateralUSD.toFixed(2)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box>
                <Typography variant="caption" sx={{ color: TREASURY_THEME.CAPTION }}>
                  Total Debt (HYD)
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: TREASURY_THEME.EMPHASIS }}>
                  ${totalDebtUSD.toFixed(2)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box>
                <Typography variant="caption" sx={{ mb: 1, display: 'block', color: TREASURY_THEME.CAPTION }}>
                  Overall Health Factor
                </Typography>
                <HealthFactorGauge healthFactor={overallHealthFactor} compact />
              </Box>
            </Grid>
          </Grid>
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={`${positions.length} Position${positions.length > 1 ? 's' : ''}`}
              size="small"
              sx={{ backgroundColor: TREASURY_THEME.SECONDARY, color: '#000', fontWeight: 600 }}
            />
            {positions.some((p) => p.healthFactor < 150) && (
              <Chip
                label="Action Required"
                size="small"
                color="warning"
                sx={{ fontWeight: 600 }}
              />
            )}
          </Box>
        </CardContent>
      </StyledCard>

      {/* Position cards grid */}
      <Grid container spacing={3}>
        {positions.map((position, index) => (
          <Grid item xs={12} md={6} lg={4} key={`${position.rwaAsset}-${index}`}>
            <PositionCard
              position={position}
              onRedeem={(assetAddress, amount) => {
                console.log('Redeem:', assetAddress, amount);
                // TODO: Implement redeem transaction
              }}
              onAddCollateral={(assetAddress, amount) => {
                console.log('Add collateral:', assetAddress, amount);
                // TODO: Implement add collateral transaction
              }}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
