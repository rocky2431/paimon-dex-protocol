/**
 * DepositWithdrawForm Component
 * Form for depositing/withdrawing USDP from stability pool
 *
 * Features:
 * - Deposit/Withdraw tabs
 * - Balance display
 * - Amount input with validation
 * - Share preview
 * - Transaction handling
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  Button,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import {
  useStabilityPoolDeposit,
  useStabilityPoolWithdraw,
  useStabilityPoolBalance,
} from '@/hooks/useStabilityPool';
import { testnet } from '@/config/chains/testnet';
import { USDP_ABI } from '@/config/contracts/usdp';

interface DepositWithdrawFormProps {
  locale?: 'en' | 'zh';
  onSuccess?: () => void;
}

const translations = {
  en: {
    deposit: 'Deposit',
    withdraw: 'Withdraw',
    availableBalance: 'Available Balance',
    depositedAmount: 'Deposited Amount',
    enterAmount: 'Enter amount',
    max: 'Max',
    expectedShares: 'Expected Shares',
    confirmDeposit: 'Confirm Deposit',
    confirmWithdraw: 'Confirm Withdraw',
    approveUsdp: 'Approve USDP',
    connectWallet: 'Connect Wallet',
    insufficientBalance: 'Insufficient balance',
    invalidAmount: 'Please enter a valid amount',
    processing: 'Processing...',
    usdp: 'USDP',
  },
  zh: {
    deposit: '存入',
    withdraw: '提取',
    availableBalance: '可用余额',
    depositedAmount: '已存入金额',
    enterAmount: '输入金额',
    max: '最大',
    expectedShares: '预期份额',
    confirmDeposit: '确认存入',
    confirmWithdraw: '确认提取',
    approveUsdp: '授权 USDP',
    connectWallet: '连接钱包',
    insufficientBalance: '余额不足',
    invalidAmount: '请输入有效金额',
    processing: '处理中...',
    usdp: 'USDP',
  },
};

export function DepositWithdrawForm({ locale = 'en', onSuccess }: DepositWithdrawFormProps) {
  const t = translations[locale];
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState(0); // 0 = deposit, 1 = withdraw
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  // Read USDP balance
  const { data: usdpBalanceRaw } = useReadContract({
    address: testnet.tokens.usdp,
    abi: USDP_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Read deposited balance
  const { data: depositedBalanceRaw } = useStabilityPoolBalance(address);

  // Write contracts
  const { writeContract: deposit, data: depositTxHash, isPending: isDepositPending } = useStabilityPoolDeposit();
  const { writeContract: withdraw, data: withdrawTxHash, isPending: isWithdrawPending } = useStabilityPoolWithdraw();

  // Wait for transaction
  const { isLoading: isDepositLoading } = useWaitForTransactionReceipt({ hash: depositTxHash });
  const { isLoading: isWithdrawLoading } = useWaitForTransactionReceipt({ hash: withdrawTxHash });

  const usdpBalance = useMemo(() => {
    if (!usdpBalanceRaw) return 0;
    return Number(formatUnits(usdpBalanceRaw, 18));
  }, [usdpBalanceRaw]);

  const depositedBalance = useMemo(() => {
    if (!depositedBalanceRaw) return 0;
    return Number(formatUnits(depositedBalanceRaw, 18));
  }, [depositedBalanceRaw]);

  const handleTabChange = (_: any, newValue: number) => {
    setActiveTab(newValue);
    setAmount('');
    setError('');
  };

  const handleMaxClick = () => {
    if (activeTab === 0) {
      // Deposit: use USDP balance
      setAmount(usdpBalance.toString());
    } else {
      // Withdraw: use deposited balance
      setAmount(depositedBalance.toString());
    }
    setError('');
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      setError('');
    }
  };

  const handleSubmit = async () => {
    if (!address) {
      setError(t.connectWallet);
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setError(t.invalidAmount);
      return;
    }

    const amountNumber = Number(amount);

    if (activeTab === 0) {
      // Deposit
      if (amountNumber > usdpBalance) {
        setError(t.insufficientBalance);
        return;
      }

      try {
        deposit({
          address: testnet.tokens.stabilityPool,
          abi: [{
            name: 'deposit',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [{ name: 'amount', type: 'uint256' }],
            outputs: [],
          }],
          functionName: 'deposit',
          args: [parseUnits(amount, 18)],
        });
      } catch (err) {
        console.error('Deposit error:', err);
        setError('Transaction failed');
      }
    } else {
      // Withdraw
      if (amountNumber > depositedBalance) {
        setError(t.insufficientBalance);
        return;
      }

      try {
        withdraw({
          address: testnet.tokens.stabilityPool,
          abi: [{
            name: 'withdraw',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [{ name: 'amount', type: 'uint256' }],
            outputs: [],
          }],
          functionName: 'withdraw',
          args: [parseUnits(amount, 18)],
        });
      } catch (err) {
        console.error('Withdraw error:', err);
        setError('Transaction failed');
      }
    }
  };

  const isProcessing = isDepositPending || isWithdrawPending || isDepositLoading || isWithdrawLoading;

  return (
    <Card
      sx={{
        backgroundColor: 'rgba(255, 107, 0, 0.05)',
        border: '1px solid rgba(255, 107, 0, 0.2)',
      }}
    >
      <CardContent>
        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            mb: 3,
            '& .MuiTab-root': {
              color: 'text.secondary',
              '&.Mui-selected': {
                color: '#ff6b00',
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#ff6b00',
            },
          }}
        >
          <Tab label={t.deposit} />
          <Tab label={t.withdraw} />
        </Tabs>

        {/* Balance Display */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {activeTab === 0 ? t.availableBalance : t.depositedAmount}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {(activeTab === 0 ? usdpBalance : depositedBalance).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            {t.usdp}
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Amount Input */}
        <TextField
          fullWidth
          label={t.enterAmount}
          value={amount}
          onChange={handleAmountChange}
          placeholder="0.00"
          InputProps={{
            endAdornment: (
              <Button
                size="small"
                onClick={handleMaxClick}
                sx={{
                  color: '#ff6b00',
                  fontWeight: 600,
                  minWidth: 'auto',
                }}
              >
                {t.max}
              </Button>
            ),
          }}
          sx={{ mb: 2 }}
        />

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Submit Button */}
        <Button
          fullWidth
          variant="contained"
          onClick={handleSubmit}
          disabled={!address || isProcessing || !amount}
          sx={{
            backgroundColor: '#ff6b00',
            '&:hover': {
              backgroundColor: '#e66100',
            },
            '&:disabled': {
              backgroundColor: 'rgba(255, 107, 0, 0.3)',
            },
          }}
        >
          {isProcessing ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              {t.processing}
            </>
          ) : address ? (
            activeTab === 0 ? t.confirmDeposit : t.confirmWithdraw
          ) : (
            t.connectWallet
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
