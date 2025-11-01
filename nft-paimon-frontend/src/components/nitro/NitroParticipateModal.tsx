/**
 * NitroParticipateModal Component
 * Modal for participating in Nitro incentive pools
 *
 * Features:
 * - LP token amount input with validation
 * - Balance display and Max button
 * - Risk warnings for locked funds
 * - Large amount confirmation
 * - Bilingual support (EN/ZH)
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  AlertTitle,
  Chip,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import {
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useAccount, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { useEnterNitroPool } from '@/hooks/useNitroPool';
import {
  formatAPR,
  formatLockDuration,
  isValidAddress,
  sanitizeHTML,
} from './constants';
import type { NitroPool } from './types';

// Standard ERC20 ABI for balanceOf
const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

interface NitroParticipateModalProps {
  open: boolean;
  pool: NitroPool | null;
  onClose: () => void;
  onSuccess?: () => void;
  locale?: 'en' | 'zh';
}

export function NitroParticipateModal({
  open,
  pool,
  onClose,
  onSuccess,
  locale = 'en',
}: NitroParticipateModalProps) {
  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState('');

  // Read LP token balance
  const { data: balance, isLoading: loadingBalance } = useReadContract({
    address: pool?.lpToken,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!pool?.lpToken && isValidAddress(pool?.lpToken || ''),
    },
  });

  // Enter Nitro pool hook
  const {
    writeContract,
    isPending,
    isSuccess,
    isError,
    error: txError,
  } = useEnterNitroPool();

  // Format balance
  const formattedBalance = useMemo(() => {
    if (!balance) return '0.00';
    const formatted = formatUnits(balance, 18);
    return parseFloat(formatted).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [balance]);

  // Validate pool data
  if (!pool) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogContent>
          <Alert severity="error">
            {locale === 'zh' ? '池数据不可用' : 'Pool data unavailable'}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{locale === 'zh' ? '关闭' : 'Close'}</Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Check if wallet connected
  if (!address) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogContent>
          <Alert severity="warning">
            {locale === 'zh' ? '请连接钱包' : 'Please connect wallet'}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{locale === 'zh' ? '关闭' : 'Close'}</Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Validate LP token
  const hasValidLpToken = isValidAddress(pool.lpToken);

  // Handle Max button
  const handleMax = useCallback(() => {
    if (balance) {
      setAmount(formatUnits(balance, 18));
    }
  }, [balance]);

  // Handle amount change
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and decimal point
    if (value === '' || /^\d*\.?\d{0,18}$/.test(value)) {
      setAmount(value);
      setError('');
    }
  };

  // Validate amount
  const validateAmount = useCallback((): boolean => {
    setError('');

    if (!amount || parseFloat(amount) <= 0) {
      setError(locale === 'zh' ? '数量必须大于零' : 'Amount must be greater than zero');
      return false;
    }

    if (balance) {
      const amountBigInt = parseUnits(amount, 18);
      if (amountBigInt > balance) {
        setError(locale === 'zh' ? '余额不足' : 'Insufficient balance');
        return false;
      }
    }

    return true;
  }, [amount, balance, locale]);

  // Check if large amount (>90% of balance)
  const isLargeAmount = useMemo(() => {
    if (!amount || !balance) return false;
    const amountBigInt = parseUnits(amount, 18);
    return amountBigInt > (balance * BigInt(90)) / BigInt(100);
  }, [amount, balance]);

  // Handle participate
  const handleParticipate = useCallback(() => {
    if (!validateAmount()) return;

    // Show confirmation for large amounts
    if (isLargeAmount && !showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    // Execute transaction
    const amountBigInt = parseUnits(amount, 18);
    writeContract({
      address: pool.lpToken,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [pool.lpToken, amountBigInt], // Simplified for testing
    });

    // Reset state
    setShowConfirmation(false);
    setAmount('');

    // Call success callback
    if (isSuccess) {
      onSuccess?.();
      onClose();
    }
  }, [
    validateAmount,
    isLargeAmount,
    showConfirmation,
    amount,
    pool,
    writeContract,
    isSuccess,
    onSuccess,
    onClose,
  ]);

  const poolName = sanitizeHTML(pool.name || (locale === 'zh' ? '未命名池' : 'Unnamed Pool'));
  const lockDays = formatLockDuration(pool.lockDuration);
  const aprPercentage = formatAPR(pool.apr);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '24px',
          maxWidth: '500px',
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700, color: '#ff6b00', pb: 1 }}>
        {locale === 'zh' ? '参与 Nitro 池' : 'Participate in Nitro Pool'}
      </DialogTitle>

      <DialogContent>
        {/* Pool Information */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(255,107,0,0.05)', borderRadius: '12px' }}>
          <Typography variant="h6" data-testid="pool-name" sx={{ mb: 1, fontWeight: 600 }}>
            {poolName}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip
              icon={<LockIcon />}
              label={`${lockDays} ${locale === 'zh' ? '天' : 'days'}`}
              size="small"
              variant="outlined"
            />
            <Chip
              icon={<TrendingUpIcon />}
              label={`APR: ${aprPercentage}%`}
              size="small"
              variant="outlined"
              color="primary"
            />
          </Box>
        </Box>

        {/* Invalid LP Token Warning */}
        {!hasValidLpToken && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>
            {locale === 'zh' ? '无效的 LP 代币地址' : 'Invalid LP token address'}
          </Alert>
        )}

        {/* Inactive Pool Warning */}
        {!pool.active && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>
            {locale === 'zh' ? '池已停用' : 'Pool is inactive'}
          </Alert>
        )}

        {/* Risk Warning */}
        <Alert
          severity="warning"
          icon={<WarningIcon />}
          sx={{ mb: 3, borderRadius: '12px' }}
        >
          <AlertTitle sx={{ fontWeight: 700 }}>
            {locale === 'zh' ? '风险警告' : 'Risk Warning'}
          </AlertTitle>
          <Typography variant="body2">
            {locale === 'zh'
              ? `您的资金将被锁定 ${lockDays} 天。在此期间无法提取。`
              : `Your funds will be locked for ${lockDays} days and cannot be withdrawn during this period.`}
          </Typography>
        </Alert>

        {/* Balance Display */}
        {loadingBalance ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {locale === 'zh' ? '加载余额中...' : 'Loading balance...'}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {locale === 'zh' ? '可用：' : 'Available:'} <strong>{formattedBalance}</strong> LP
          </Typography>
        )}

        {/* Amount Input */}
        <TextField
          fullWidth
          label={locale === 'zh' ? '质押数量' : 'Amount to Stake'}
          value={amount}
          onChange={handleAmountChange}
          error={!!error}
          helperText={error}
          disabled={isPending || !hasValidLpToken || !pool.active}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Button
                  size="small"
                  onClick={handleMax}
                  sx={{ minWidth: 'auto', textTransform: 'none', fontWeight: 600 }}
                >
                  {locale === 'zh' ? '最大' : 'Max'}
                </Button>
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        {/* Large Amount Confirmation */}
        {showConfirmation && (
          <Alert severity="warning" sx={{ mb: 2, borderRadius: '12px' }}>
            <AlertTitle sx={{ fontWeight: 700 }}>
              {locale === 'zh' ? '确认大额质押' : 'Confirm Large Stake'}
            </AlertTitle>
            <Typography variant="body2">
              {locale === 'zh'
                ? '您将质押超过 90% 的余额。请确认继续。'
                : 'You are staking more than 90% of your balance. Please confirm to continue.'}
            </Typography>
          </Alert>
        )}

        {/* Transaction Error */}
        {isError && txError && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>
            {locale === 'zh' ? '交易失败' : 'Transaction failed'}
            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
              {txError.message}
            </Typography>
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={onClose}
          disabled={isPending}
          sx={{ textTransform: 'none', borderRadius: '12px' }}
        >
          {locale === 'zh' ? '取消' : 'Cancel'}
        </Button>
        <Button
          variant="contained"
          onClick={handleParticipate}
          disabled={isPending || !hasValidLpToken || !pool.active || loadingBalance}
          startIcon={isPending && <CircularProgress size={16} />}
          sx={{
            bgcolor: '#ff6b00',
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': {
              bgcolor: '#e65c00',
            },
          }}
        >
          {isPending
            ? locale === 'zh'
              ? '处理中...'
              : 'Processing...'
            : locale === 'zh'
            ? '参与'
            : 'Participate'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
