/**
 * StabilityPoolOverview Component
 * Display stability pool overview information
 *
 * Features:
 * - Total deposits in pool
 * - User share percentage
 * - Estimated APY (based on liquidation frequency)
 * - Pool health metrics
 */

'use client';

import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Chip,
  Tooltip,
  IconButton,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Info as InfoIcon,
  AccountBalance as AccountBalanceIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import {
  useStabilityPoolBalance,
  useStabilityPoolTotalDeposits,
  useStabilityPoolTotalShares,
} from '@/hooks/useStabilityPool';

interface StabilityPoolOverviewProps {
  locale?: 'en' | 'zh';
}

// Translations
const translations = {
  en: {
    title: 'Stability Pool Overview',
    totalDeposits: 'Total Deposits',
    yourShare: 'Your Share',
    estimatedAPY: 'Estimated APY',
    poolHealth: 'Pool Health',
    liquidationCapacity: 'Max Liquidation Capacity',
    connectWallet: 'Connect wallet to view your position',
    loading: 'Loading...',
    error: 'Error loading data',
    basedOnLiquidations: 'Based on historical liquidation frequency',
    healthy: 'Healthy',
    usdp: 'USDP',
  },
  zh: {
    title: '稳定池概览',
    totalDeposits: '总存款',
    yourShare: '您的份额',
    estimatedAPY: '预估年化收益',
    poolHealth: '池子健康度',
    liquidationCapacity: '最大清算承接量',
    connectWallet: '连接钱包查看您的仓位',
    loading: '加载中...',
    error: '加载数据失败',
    basedOnLiquidations: '基于历史清算频率预估',
    healthy: '健康',
    usdp: 'USDP',
  },
};

/**
 * Format large numbers with commas
 */
function formatNumber(value: number, decimals: number = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Calculate estimated APY based on pool size and liquidation frequency
 * This is a simplified estimation - real APY depends on actual liquidations
 */
function calculateEstimatedAPY(totalDeposits: bigint): number {
  // Assume average liquidation rate of 2% of total pool per year
  // with 10% liquidation penalty that goes to stability pool
  const liquidationRate = 0.02; // 2% of pool gets liquidated per year
  const liquidationPenalty = 0.10; // 10% penalty

  return liquidationRate * liquidationPenalty * 100; // Convert to percentage
}

export function StabilityPoolOverview({ locale = 'en' }: StabilityPoolOverviewProps) {
  const t = translations[locale];
  const { address } = useAccount();

  // Read contract data
  const {
    data: totalDepositsRaw,
    isLoading: totalDepositsLoading,
    isError: totalDepositsError,
  } = useStabilityPoolTotalDeposits();

  const {
    data: userBalanceRaw,
    isLoading: userBalanceLoading,
    isError: userBalanceError,
  } = useStabilityPoolBalance(address);

  const {
    data: totalSharesRaw,
    isLoading: totalSharesLoading,
    isError: totalSharesError,
  } = useStabilityPoolTotalShares();

  // Format data
  const totalDeposits = useMemo(() => {
    if (!totalDepositsRaw) return 0;
    return Number(formatUnits(totalDepositsRaw, 18));
  }, [totalDepositsRaw]);

  const userBalance = useMemo(() => {
    if (!userBalanceRaw) return 0;
    return Number(formatUnits(userBalanceRaw, 18));
  }, [userBalanceRaw]);

  const userSharePercentage = useMemo(() => {
    if (!totalDeposits || totalDeposits === 0) return 0;
    return (userBalance / totalDeposits) * 100;
  }, [userBalance, totalDeposits]);

  const estimatedAPY = useMemo(() => {
    if (!totalDepositsRaw) return 0;
    return calculateEstimatedAPY(totalDepositsRaw);
  }, [totalDepositsRaw]);

  const maxLiquidationCapacity = useMemo(() => {
    // Assume pool can handle liquidations up to 80% of its size
    return totalDeposits * 0.8;
  }, [totalDeposits]);

  // Loading state
  const isLoading = totalDepositsLoading || userBalanceLoading || totalSharesLoading;

  // Error state
  const hasError = totalDepositsError || userBalanceError || totalSharesError;

  if (hasError) {
    return (
      <Card
        sx={{
          backgroundColor: 'rgba(255, 107, 0, 0.05)',
          border: '1px solid rgba(255, 107, 0, 0.2)',
        }}
      >
        <CardContent>
          <Alert severity="error">{t.error}</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        backgroundColor: 'rgba(255, 107, 0, 0.05)',
        border: '1px solid rgba(255, 107, 0, 0.2)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 16px rgba(255, 107, 0, 0.2)',
        },
      }}
    >
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountBalanceIcon sx={{ color: '#ff6b00', fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#ff6b00' }}>
              {t.title}
            </Typography>
          </Box>
          <Tooltip title={t.basedOnLiquidations}>
            <IconButton size="small">
              <InfoIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            </IconButton>
          </Tooltip>
        </Box>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Metrics Grid */}
            <Grid container spacing={2}>
              {/* Total Deposits */}
              <Grid item xs={12} sm={6}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {t.totalDeposits}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary', mt: 0.5 }}>
                    {formatNumber(totalDeposits, 2)} <span style={{ fontSize: '0.7em', color: '#888' }}>{t.usdp}</span>
                  </Typography>
                </Box>
              </Grid>

              {/* User Share */}
              <Grid item xs={12} sm={6}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {t.yourShare}
                  </Typography>
                  {address ? (
                    <Typography variant="h5" sx={{ fontWeight: 600, color: '#ff6b00', mt: 0.5 }}>
                      {formatNumber(userSharePercentage, 2)}%
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                      {t.connectWallet}
                    </Typography>
                  )}
                </Box>
              </Grid>

              {/* Divider */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>

              {/* Estimated APY */}
              <Grid item xs={12} sm={6}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TrendingUpIcon fontSize="small" />
                    {t.estimatedAPY}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#ff6b00', mt: 0.5 }}>
                    {formatNumber(estimatedAPY, 2)}%
                  </Typography>
                </Box>
              </Grid>

              {/* Pool Health */}
              <Grid item xs={12} sm={6}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <SpeedIcon fontSize="small" />
                    {t.poolHealth}
                  </Typography>
                  <Chip
                    label={t.healthy}
                    size="small"
                    sx={{
                      mt: 0.5,
                      backgroundColor: 'rgba(76, 175, 80, 0.1)',
                      color: '#4caf50',
                      fontWeight: 600,
                    }}
                  />
                </Box>
              </Grid>

              {/* Max Liquidation Capacity */}
              <Grid item xs={12}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {t.liquidationCapacity}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mt: 0.5 }}>
                    {formatNumber(maxLiquidationCapacity, 2)} {t.usdp}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </>
        )}
      </CardContent>
    </Card>
  );
}
