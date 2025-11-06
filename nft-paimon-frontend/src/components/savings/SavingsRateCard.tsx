/**
 * SavingsRateCard Component
 * Display USDP savings rate and user deposit information
 *
 * Features:
 * - Current APR display
 * - User principal balance
 * - Accrued interest
 * - Interest source explanation
 * - Deposit/Claim actions
 */

'use client';

import React, { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
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
  Add as AddIcon,
} from '@mui/icons-material';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import {
  useSavingAnnualRate,
  useSavingPrincipal,
  useSavingAccruedInterest,
  useSavingCurrentInterest,
  useSavingClaimInterest,
} from '@/hooks/useSavingRate';

interface SavingsRateCardProps {
  locale?: 'en' | 'zh';
  onDepositClick?: () => void;
}

const translations = {
  en: {
    title: 'USDP Savings',
    annualRate: 'Annual Rate',
    myDeposit: 'My Deposit',
    accruedInterest: 'Accrued Interest',
    currentInterest: 'Current Interest',
    deposit: 'Deposit',
    claimInterest: 'Claim Interest',
    interestSource: 'Interest comes from RWA yield distribution (2% of treasury revenue)',
    connectWallet: 'Please connect wallet to view your savings',
    noDeposit: 'No deposit yet',
    depositToEarn: 'Deposit USDP to start earning interest',
    failedToLoad: 'Failed to load savings data',
    networkError: 'Network error, please try again',
    invalidAddress: 'Invalid address format',
    transactionFailed: 'Transaction failed, please try again',
    loading: 'Loading...',
  },
  zh: {
    title: 'USDP 储蓄',
    annualRate: '年化利率',
    myDeposit: '我的存款',
    accruedInterest: '已累积利息',
    currentInterest: '当前利息',
    deposit: '存入',
    claimInterest: '领取利息',
    interestSource: '利息来源于 RWA 收益分配（国库收入的 2%）',
    connectWallet: '请连接钱包查看您的储蓄',
    noDeposit: '暂无存款',
    depositToEarn: '存入 USDP 开始赚取利息',
    failedToLoad: '加载储蓄数据失败',
    networkError: '网络错误，请重试',
    invalidAddress: '地址格式无效',
    transactionFailed: '交易失败，请重试',
    loading: '加载中...',
  },
};

/**
 * Validate Ethereum address format
 */
function isValidAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

/**
 * Format APR from basis points to percentage
 */
function formatAPR(bps: bigint): string {
  return (Number(bps) / 100).toFixed(2);
}

/**
 * Format USDP amount with thousands separator
 */
function formatUSDPAmount(amount: bigint): string {
  const formatted = formatUnits(amount, 18);
  const number = parseFloat(formatted);
  return number.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function SavingsRateCard({ locale = 'en', onDepositClick }: SavingsRateCardProps) {
  const { address } = useAccount();
  const t = translations[locale];
  const [error, setError] = useState<string | null>(null);

  // Read contract data
  const { data: annualRate, isLoading: loadingRate, error: rateError } = useSavingAnnualRate();
  const { data: principal, isLoading: loadingPrincipal, error: principalError } = useSavingPrincipal(address);
  const { data: accruedInterest, isLoading: loadingInterest, error: interestError } = useSavingAccruedInterest(address);
  const { data: currentInterest, isLoading: loadingCurrent } = useSavingCurrentInterest(address);
  const { writeContract: claimInterest } = useSavingClaimInterest();

  // Validate address
  const addressValid = useMemo(() => {
    return address ? isValidAddress(address) : false;
  }, [address]);

  // Check for errors
  const hasError = rateError || principalError || interestError;

  // Calculate values with defaults
  const aprValue = useMemo(() => {
    return annualRate !== undefined ? formatAPR(annualRate) : '0.00';
  }, [annualRate]);

  const principalValue = useMemo(() => {
    return principal !== undefined ? formatUSDPAmount(principal) : '0.00';
  }, [principal]);

  const interestValue = useMemo(() => {
    return accruedInterest !== undefined ? formatUSDPAmount(accruedInterest) : '0.00';
  }, [accruedInterest]);

  const currentInterestValue = useMemo(() => {
    return currentInterest !== undefined ? formatUSDPAmount(currentInterest) : '0.00';
  }, [currentInterest]);

  // Handle claim interest
  const handleClaimInterest = async () => {
    try {
      setError(null);
      await claimInterest({
        address: address!,
        abi: [], // Will be filled by hook
        functionName: 'claimInterest',
      });
    } catch (err) {
      setError(t.transactionFailed);
    }
  };

  // Handle loading state
  const isLoading = loadingRate || loadingPrincipal || loadingInterest || loadingCurrent;

  // Wallet not connected
  if (!address) {
    return (
      <Card
        data-testid="savings-rate-card"
        sx={{ borderRadius: '24px', border: '1px solid rgba(255,107,0,0.3)' }}
      >
        <CardContent>
          <Alert severity="info">{t.connectWallet}</Alert>
        </CardContent>
      </Card>
    );
  }

  // Invalid address
  if (!addressValid) {
    return (
      <Card
        data-testid="savings-rate-card"
        sx={{ borderRadius: '24px', border: '1px solid rgba(255,107,0,0.3)' }}
      >
        <CardContent>
          <Alert severity="error">{t.invalidAddress}</Alert>
        </CardContent>
      </Card>
    );
  }

  // Note: Removed error state early return - show full UI even with network errors
  // Error will be displayed as alert at top of card

  // Loading state
  if (isLoading) {
    return (
      <Card
        data-testid="savings-rate-card"
        sx={{ borderRadius: '24px', border: '1px solid rgba(255,107,0,0.3)' }}
      >
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress sx={{ color: '#ff6b00' }} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {t.loading}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // No deposit state
  const hasDeposit = principal && principal > BigInt(0);
  if (!hasDeposit) {
    return (
      <Card
        data-testid="savings-rate-card"
        sx={{
          borderRadius: '24px',
          border: '1px solid rgba(255,107,0,0.3)',
        }}
      >
        <CardContent>
          {/* Network Error Alert - Show but don't block UI */}
          {hasError && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {rateError ? t.failedToLoad : t.networkError}
            </Alert>
          )}

          <Box sx={{ textAlign: 'center', py: 4 }}>
            <AccountBalanceIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              {t.noDeposit}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
              {t.depositToEarn}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onDepositClick}
              sx={{
                bgcolor: '#ff6b00',
                borderRadius: '12px',
                textTransform: 'none',
                '&:hover': {
                  bgcolor: '#e65c00',
                },
              }}
            >
              {t.deposit}
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Main card with data
  return (
    <Card
      data-testid="savings-rate-card"
      sx={{
        borderRadius: '24px',
        border: '1px solid rgba(255,107,0,0.3)',
        background: 'linear-gradient(135deg, rgba(255,107,0,0.05) 0%, rgba(255,180,80,0.05) 100%)',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Network Error Alert - Show but don't block UI */}
        {hasError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {rateError ? t.failedToLoad : t.networkError}
          </Alert>
        )}

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#ff6b00' }}>
            {t.title}
          </Typography>
          <Tooltip title={t.interestSource} arrow>
            <IconButton size="small" data-testid="interest-source-info">
              <InfoIcon sx={{ fontSize: 20, color: '#ff6b00' }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* APR Display */}
        <Box
          sx={{
            mb: 3,
            p: 2,
            bgcolor: 'rgba(255,107,0,0.1)',
            borderRadius: '12px',
            textAlign: 'center',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {t.annualRate}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff6b00', mt: 0.5 }}>
            {aprValue}%
          </Typography>
        </Box>

        {/* Balance Info */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              {t.myDeposit}
            </Typography>
            <Typography variant="h6" fontWeight={600}>
              {principalValue}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              USDP
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              {t.accruedInterest}
            </Typography>
            <Typography variant="h6" fontWeight={600} color="#ff6b00">
              {interestValue}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              USDP
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Current Interest (real-time) */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" color="text.secondary">
            {t.currentInterest}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <TrendingUpIcon sx={{ fontSize: 20, color: '#ff6b00' }} />
            <Typography variant="body1" fontWeight={600}>
              {currentInterestValue} USDP
            </Typography>
          </Box>
        </Box>

        {/* Error message */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onDepositClick}
            sx={{
              bgcolor: '#ff6b00',
              borderRadius: '12px',
              textTransform: 'none',
              flex: 1,
              '&:hover': {
                bgcolor: '#e65c00',
              },
            }}
          >
            {t.deposit}
          </Button>
          <Button
            variant="outlined"
            startIcon={<TrendingUpIcon />}
            disabled={!accruedInterest || accruedInterest === BigInt(0)}
            onClick={handleClaimInterest}
            sx={{
              borderColor: '#ff6b00',
              color: '#ff6b00',
              borderRadius: '12px',
              textTransform: 'none',
              flex: 1,
              '&:hover': {
                borderColor: '#e65c00',
                bgcolor: 'rgba(255,107,0,0.05)',
              },
              '&:disabled': {
                borderColor: 'rgba(0,0,0,0.12)',
                color: 'rgba(0,0,0,0.26)',
              },
            }}
          >
            {t.claimInterest}
          </Button>
        </Box>

        {/* Footer note */}
        <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid rgba(255,107,0,0.2)' }}>
          <Typography variant="caption" color="text.secondary">
            {locale === 'zh'
              ? '利息每日累积，可随时领取。本金和利息均可取出。'
              : 'Interest accrues daily and can be claimed anytime. Both principal and interest are withdrawable.'}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
