/**
 * StabilityPoolOverview Component
 * Display stability pool statistics and user participation info
 *
 * Features:
 * - Total deposits amount
 * - User share percentage
 * - Estimated APY based on liquidation frequency
 * - User balance
 */

'use client';

import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  AccountBalance as AccountBalanceIcon,
  TrendingUp as TrendingUpIcon,
  PieChart as PieChartIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import {
  useStabilityPoolBalance,
  useStabilityPoolShares,
  useStabilityPoolTotalDeposits,
  useStabilityPoolTotalShares,
} from '@/hooks/useStabilityPool';

interface StabilityPoolOverviewProps {
  locale?: 'en' | 'zh';
}

const translations = {
  en: {
    title: 'Stability Pool Overview',
    totalDeposits: 'Total Deposits',
    yourBalance: 'Your Balance',
    yourShare: 'Your Share',
    estimatedAPY: 'Estimated APY',
    connectWallet: 'Connect Wallet',
    loading: 'Loading...',
    error: 'Error loading data',
    apyTooltip: 'APY estimated based on historical liquidation frequency',
  },
  zh: {
    title: '稳定池概览',
    totalDeposits: '总存款',
    yourBalance: '您的余额',
    yourShare: '您的份额',
    estimatedAPY: '预估年化收益',
    connectWallet: '连接钱包',
    loading: '加载中...',
    error: '加载数据失败',
    apyTooltip: '基于历史清算频率估算的年化收益',
  },
};

/**
 * Format token amount with proper decimals and commas
 */
function formatTokenAmount(amount: bigint | undefined): string {
  if (amount === undefined) return '--';
  try {
    const formatted = formatUnits(amount, 18);
    const num = parseFloat(formatted);
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  } catch {
    return '--';
  }
}

/**
 * Calculate share percentage
 */
function calculateSharePercentage(
  userShares: bigint | undefined,
  totalShares: bigint | undefined
): string {
  if (!userShares || !totalShares || totalShares === BigInt(0)) {
    return '0.0%';
  }

  try {
    const percentage = (Number(userShares) / Number(totalShares)) * 100;
    if (percentage >= 100) {
      return '100.0%';
    } else if (percentage < 0.01) {
      return '0.01%';
    } else {
      return percentage.toFixed(2) + '%';
    }
  } catch {
    return '0.0%';
  }
}

/**
 * Calculate estimated APY based on liquidation frequency
 * TODO: Replace with actual calculation based on historical liquidations
 */
function calculateEstimatedAPY(): string {
  // Mock calculation: assume 8% APY based on typical liquidation frequency
  return '8.0%';
}

export function StabilityPoolOverview({ locale = 'en' }: StabilityPoolOverviewProps) {
  const t = translations[locale];
  const { address, isConnected } = useAccount();

  // Fetch pool data
  const {
    data: totalDeposits,
    isLoading: isLoadingTotalDeposits,
    isError: isErrorTotalDeposits,
  } = useStabilityPoolTotalDeposits();

  const {
    data: userBalance,
    isLoading: isLoadingBalance,
    isError: isErrorBalance,
  } = useStabilityPoolBalance(address);

  const {
    data: userShares,
    isLoading: isLoadingShares,
    isError: isErrorShares,
  } = useStabilityPoolShares(address);

  const {
    data: totalShares,
    isLoading: isLoadingTotalShares,
    isError: isErrorTotalShares,
  } = useStabilityPoolTotalShares();

  // Calculate derived values
  const sharePercentage = useMemo(
    () => calculateSharePercentage(userShares, totalShares),
    [userShares, totalShares]
  );

  const estimatedAPY = useMemo(() => calculateEstimatedAPY(), []);

  // Handle loading state
  const isLoading =
    isLoadingTotalDeposits || isLoadingBalance || isLoadingShares || isLoadingTotalShares;

  // Handle error state
  const isError =
    isErrorTotalDeposits || isErrorBalance || isErrorShares || isErrorTotalShares;

  if (!isConnected) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t.title}
          </Typography>
          <Alert severity="info">{t.connectWallet}</Alert>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t.title}
          </Typography>
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
            <Typography variant="body2" ml={2}>
              {t.loading}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t.title}
          </Typography>
          <Alert severity="error">{t.error}</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {t.title}
        </Typography>

        <Grid container spacing={3} sx={{ mt: 1 }}>
          {/* Total Deposits */}
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Box display="flex" alignItems="center" mb={1}>
                <AccountBalanceIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  {t.totalDeposits}
                </Typography>
              </Box>
              <Typography variant="h5">
                {formatTokenAmount(totalDeposits)} USDP
              </Typography>
            </Box>
          </Grid>

          {/* Your Balance */}
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Box display="flex" alignItems="center" mb={1}>
                <PieChartIcon color="secondary" sx={{ mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  {t.yourBalance}
                </Typography>
              </Box>
              <Typography variant="h5">
                {formatTokenAmount(userBalance)} USDP
              </Typography>
            </Box>
          </Grid>

          {/* Your Share */}
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Box display="flex" alignItems="center" mb={1}>
                <Typography variant="body2" color="text.secondary">
                  {t.yourShare}
                </Typography>
              </Box>
              <Typography variant="h5">{sharePercentage}</Typography>
            </Box>
          </Grid>

          {/* Estimated APY */}
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Box display="flex" alignItems="center" mb={1}>
                <TrendingUpIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  {t.estimatedAPY}
                </Typography>
                <Tooltip title={t.apyTooltip}>
                  <InfoIcon sx={{ ml: 0.5, fontSize: 16, color: 'text.disabled' }} />
                </Tooltip>
              </Box>
              <Typography variant="h5" color="success.main">
                {estimatedAPY}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
