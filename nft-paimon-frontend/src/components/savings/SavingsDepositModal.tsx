/**
 * SavingsDepositModal Component
 * Modal for depositing and withdrawing USDP
 *
 * Features:
 * - Deposit/Withdraw tabs
 * - Balance display
 * - Amount input with 18-decimal validation
 * - Max button
 * - Large amount warning
 * - Transaction handling
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { useSavingPrincipal } from '@/hooks/useSavingRate';
import { testnet } from '@/config/chains/testnet';
import { USDP_ABI } from '@/config/contracts/usdp';
import { SAVINGRATE_ABI } from '@/config/contracts/savingRate';

interface SavingsDepositModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  locale?: 'en' | 'zh';
}

const translations = {
  en: {
    depositTitle: 'Deposit USDP',
    withdrawTitle: 'Withdraw USDP',
    depositTab: 'Deposit',
    withdrawTab: 'Withdraw',
    availableBalance: 'Available Balance',
    depositedAmount: 'Deposited Amount',
    enterAmount: 'Enter amount',
    max: 'Max',
    confirmDeposit: 'Confirm Deposit',
    confirmWithdraw: 'Confirm Withdraw',
    cancel: 'Cancel',
    connectWallet: 'Please connect wallet',
    loading: 'Loading...',
    failedToLoad: 'Failed to load balance',
    invalidAddress: 'Invalid address format',
    transactionFailed: 'Transaction failed, please try again',
    insufficientBalance: 'Insufficient balance',
    invalidAmount: 'Invalid amount',
    largeAmount: 'Warning: You are depositing/withdrawing a large amount (>90% of balance)',
    processing: 'Processing transaction...',
  },
  zh: {
    depositTitle: '存入 USDP',
    withdrawTitle: '提取 USDP',
    depositTab: '存入',
    withdrawTab: '提取',
    availableBalance: '可用余额',
    depositedAmount: '已存入金额',
    enterAmount: '输入金额',
    max: '最大',
    confirmDeposit: '确认存入',
    confirmWithdraw: '确认提取',
    cancel: '取消',
    connectWallet: '请连接钱包',
    loading: '加载中...',
    failedToLoad: '加载余额失败',
    invalidAddress: '地址格式无效',
    transactionFailed: '交易失败，请重试',
    insufficientBalance: '余额不足',
    invalidAmount: '金额无效',
    largeAmount: '警告：您正在存入/提取大额资金（>90% 余额）',
    processing: '处理交易中...',
  },
};

/**
 * Validate Ethereum address
 */
function isValidAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

/**
 * Format USDP amount
 */
function formatUSDPAmount(amount: bigint): string {
  const formatted = formatUnits(amount, 18);
  const number = parseFloat(formatted);
  return number.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function SavingsDepositModal({
  open,
  onClose,
  onSuccess,
  locale = 'en',
}: SavingsDepositModalProps) {
  const { address } = useAccount();
  const t = translations[locale];

  // State
  const [tab, setTab] = useState(0); // 0 = Deposit, 1 = Withdraw
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Read USDP balance (for deposit)
  const { data: usdpBalance, isLoading: loadingBalance, error: balanceError } = useReadContract({
    address: testnet.tokens.usdp,
    abi: USDP_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Read deposited principal (for withdraw)
  const { data: principal, isLoading: loadingPrincipal } = useSavingPrincipal(address);

  // Write contracts
  const { writeContract: deposit, isPending: isDepositing } = useWriteContract();
  const { writeContract: withdraw, isPending: isWithdrawing } = useWriteContract();

  // Validate address
  const addressValid = useMemo(() => {
    return address ? isValidAddress(address) : false;
  }, [address]);

  // Get current balance based on tab
  const currentBalance = useMemo(() => {
    return tab === 0 ? usdpBalance : principal;
  }, [tab, usdpBalance, principal]);

  // Validate amount
  const amountValid = useMemo(() => {
    if (!amount || amount === '') return false;
    try {
      const amountBigInt = parseUnits(amount, 18);
      return amountBigInt > BigInt(0) && (!currentBalance || amountBigInt <= currentBalance);
    } catch {
      return false;
    }
  }, [amount, currentBalance]);

  // Check if large amount (>90% of balance)
  const isLargeAmount = useMemo(() => {
    if (!amount || !currentBalance) return false;
    try {
      const amountBigInt = parseUnits(amount, 18);
      return amountBigInt > (currentBalance * BigInt(90)) / BigInt(100);
    } catch {
      return false;
    }
  }, [amount, currentBalance]);

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
    setAmount('');
    setError(null);
  };

  // Handle amount input
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Allow only numbers and dot
    if (value && !/^\d*\.?\d{0,18}$/.test(value)) {
      return;
    }

    // Filter negative sign
    const filteredValue = value.replace(/-/g, '');

    setAmount(filteredValue);
    setError(null);
  };

  // Handle Max button
  const handleMax = () => {
    if (currentBalance) {
      setAmount(formatUnits(currentBalance, 18));
    }
  };

  // Handle confirm
  const handleConfirm = async () => {
    if (!address || !addressValid) {
      setError(t.invalidAddress);
      return;
    }

    if (!amountValid) {
      setError(t.invalidAmount);
      return;
    }

    try {
      setError(null);
      const amountBigInt = parseUnits(amount, 18);

      if (tab === 0) {
        // Deposit
        await deposit({
          address: testnet.tokens.savingRate,
          abi: SAVINGRATE_ABI,
          functionName: 'deposit',
          args: [amountBigInt],
        });
      } else {
        // Withdraw
        await withdraw({
          address: testnet.tokens.savingRate,
          abi: SAVINGRATE_ABI,
          functionName: 'withdraw',
          args: [amountBigInt],
        });
      }

      // Success
      setAmount('');
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(t.transactionFailed);
    }
  };

  // Handle close
  const handleClose = () => {
    setAmount('');
    setError(null);
    onClose();
  };

  // Loading state
  const isLoading = loadingBalance || loadingPrincipal;
  const isProcessing = isDepositing || isWithdrawing;

  // Wallet not connected
  if (!address) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth data-testid="deposit-modal">
        <DialogContent>
          <Alert severity="info">{t.connectWallet}</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>{t.cancel}</Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Invalid address
  if (!addressValid) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth data-testid="deposit-modal">
        <DialogContent>
          <Alert severity="error">{t.invalidAddress}</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>{t.cancel}</Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Error state
  if (balanceError) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth data-testid="deposit-modal">
        <DialogContent>
          <Alert severity="error">{t.failedToLoad}</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>{t.cancel}</Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth data-testid="deposit-modal">
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress sx={{ color: '#ff6b00' }} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {t.loading}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>{t.cancel}</Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Main modal
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      data-testid="deposit-modal"
      PaperProps={{
        sx: {
          borderRadius: '24px',
          border: '1px solid rgba(255,107,0,0.3)',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#ff6b00' }}>
          {tab === 0 ? t.depositTitle : t.withdrawTitle}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {/* Tabs */}
        <Tabs value={tab} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab label={t.depositTab} sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab label={t.withdrawTab} sx={{ textTransform: 'none', fontWeight: 600 }} />
        </Tabs>

        <Divider sx={{ mb: 3 }} />

        {/* Balance Display */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" color="text.secondary">
            {tab === 0 ? t.availableBalance : t.depositedAmount}
          </Typography>
          <Typography variant="h6" fontWeight={600}>
            {currentBalance ? formatUSDPAmount(currentBalance) : '0.00'} USDP
          </Typography>
        </Box>

        {/* Amount Input */}
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            placeholder={t.enterAmount}
            value={amount}
            onChange={handleAmountChange}
            variant="outlined"
            InputProps={{
              endAdornment: (
                <Button
                  size="small"
                  onClick={handleMax}
                  sx={{
                    minWidth: 'auto',
                    px: 2,
                    bgcolor: 'rgba(255,107,0,0.1)',
                    color: '#ff6b00',
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': {
                      bgcolor: 'rgba(255,107,0,0.2)',
                    },
                  }}
                >
                  {t.max}
                </Button>
              ),
              sx: {
                borderRadius: '12px',
              },
            }}
          />
        </Box>

        {/* Large Amount Warning */}
        {isLargeAmount && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {t.largeAmount}
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Processing State */}
        {isProcessing && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {t.processing}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={handleClose}
          disabled={isProcessing}
          sx={{
            borderRadius: '12px',
            textTransform: 'none',
            px: 3,
          }}
        >
          {t.cancel}
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!amountValid || isProcessing}
          variant="contained"
          sx={{
            bgcolor: '#ff6b00',
            borderRadius: '12px',
            textTransform: 'none',
            px: 3,
            '&:hover': {
              bgcolor: '#e65c00',
            },
            '&:disabled': {
              bgcolor: 'rgba(0,0,0,0.12)',
              color: 'rgba(0,0,0,0.26)',
            },
          }}
        >
          {tab === 0 ? t.confirmDeposit : t.confirmWithdraw}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
