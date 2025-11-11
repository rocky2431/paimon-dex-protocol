/**
 * DepositForm Component
 * Main form for RWA deposit with amount input, balance check, and approve/deposit buttons
 */

'use client';

import { useState, useMemo } from 'react';
import {
  CardContent,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link,
} from '@mui/material';
import { useAccount } from 'wagmi';
import { StyledCard } from '@/components/common';
import { RWAAssetSelector } from './RWAAssetSelector';
import { USDPMintPreview } from './USDPMintPreview';
import { useRWABalance } from './hooks/useRWABalance';
import { useDepositPreview } from './hooks/useDepositPreview';
import { useTreasuryDeposit } from './hooks/useTreasuryDeposit';
import { RWA_ASSETS, TREASURY_CONFIG, TREASURY_THEME } from './constants';
import { getBscScanLink } from '@/config';

export function DepositForm() {
  const { address: userAddress, isConnected } = useAccount();
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>('');

  // Get selected asset details
  const assetDetails = useMemo(
    () => RWA_ASSETS.find((asset) => asset.address === selectedAsset),
    [selectedAsset]
  );

  // Query RWA balance and allowance
  const {
    balance,
    allowance,
    decimals,
    isLoading: isBalanceLoading,
    refetchBalance,
    refetchAllowance,
  } = useRWABalance(selectedAsset || undefined);

  // Calculate deposit preview
  const { preview, isLoading: isPreviewLoading } = useDepositPreview({
    assetAddress: selectedAsset || undefined,
    amount,
    oracleAddress: assetDetails?.oracleAddress, // ✅ Use Oracle address from asset config
    ltvRatio: assetDetails?.ltvRatio,
  });

  // Deposit transaction hooks
  const {
    txStep,
    resetStep,
    approve,
    isApprovePending,
    isApproveConfirming,
    isApproveSuccess,
    approveError,
    approveHash,
    deposit,
    isDepositPending,
    isDepositConfirming,
    isDepositSuccess,
    depositError,
    depositHash,
    isLoading: isTxLoading,
    isError: isTxError,
  } = useTreasuryDeposit({
    tokenAddress: selectedAsset || undefined,
    amount,
    decimals,
  });

  // Validation
  const amountNum = parseFloat(amount || '0');
  const isAmountValid =
    amountNum > 0 &&
    amountNum >= TREASURY_CONFIG.MIN_DEPOSIT_AMOUNT &&
    amountNum <= TREASURY_CONFIG.MAX_DEPOSIT_AMOUNT;
  const hasSufficientBalance = amountNum > 0 && amountNum <= balance;
  const hasSufficientAllowance = amountNum > 0 && amountNum <= allowance;
  const canApprove = isConnected && selectedAsset && isAmountValid && hasSufficientBalance;
  const canDeposit = canApprove && hasSufficientAllowance;

  // Handle approve
  const handleApprove = async () => {
    try {
      await approve();
      await refetchAllowance();
    } catch (error) {
      console.error('Approve error:', error);
    }
  };

  // Handle deposit
  const handleDeposit = async () => {
    try {
      await deposit();
      // Reset form on success
      if (txStep === 'completed') {
        setAmount('');
        resetStep();
        refetchBalance();
        refetchAllowance();
      }
    } catch (error) {
      console.error('Deposit error:', error);
    }
  };

  // Handle max button
  const handleSetMax = () => {
    setAmount(balance.toString());
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
      {/* Left: Form */}
      <Box sx={{ flex: 1 }}>
        <StyledCard variant="white">
          <CardContent>
            <Typography
              variant="h5"
              sx={{
                mb: 3,
                fontWeight: 700,
                color: TREASURY_THEME.TITLE,
              }}
            >
              Deposit RWA Collateral
            </Typography>

            {/* Wallet connection check */}
            {!isConnected && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Please connect your wallet to deposit RWA assets
              </Alert>
            )}

            {/* Asset selector */}
            <Box sx={{ mb: 3 }}>
              <RWAAssetSelector selectedAsset={selectedAsset} onSelectAsset={setSelectedAsset} />
            </Box>

            {/* Amount input */}
            {selectedAsset && (
              <>
                <Box sx={{ mb: 3 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 1,
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: TREASURY_THEME.SUBTITLE }}>
                      Deposit Amount
                    </Typography>
                    <Typography variant="caption" sx={{ color: TREASURY_THEME.CAPTION }}>
                      Balance: {isBalanceLoading ? '...' : balance.toFixed(2)}{' '}
                      {assetDetails?.symbol}
                    </Typography>
                  </Box>
                  <TextField
                    fullWidth
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    InputProps={{
                      endAdornment: (
                        <Button
                          size="small"
                          onClick={handleSetMax}
                          sx={{
                            color: TREASURY_THEME.ACCENT,
                            fontWeight: 700,
                            minWidth: 'auto',
                          }}
                        >
                          MAX
                        </Button>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                          borderColor: TREASURY_THEME.EMPHASIS, // #FF8C00 deep orange
                        },
                        '&:hover fieldset': {
                          borderColor: TREASURY_THEME.EMPHASIS,
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: TREASURY_THEME.EMPHASIS,
                        },
                      },
                    }}
                  />
                  {!isAmountValid && amountNum > 0 && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                      Amount must be between {TREASURY_CONFIG.MIN_DEPOSIT_AMOUNT} and{' '}
                      {TREASURY_CONFIG.MAX_DEPOSIT_AMOUNT}
                    </Typography>
                  )}
                  {!hasSufficientBalance && amountNum > 0 && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                      Insufficient balance
                    </Typography>
                  )}
                </Box>

                {/* Action buttons */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Approve button */}
                  {!hasSufficientAllowance && (
                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      disabled={!canApprove || isApprovePending || isApproveConfirming}
                      onClick={handleApprove}
                      sx={{
                        backgroundColor: TREASURY_THEME.SECONDARY,
                        color: '#000',
                        fontWeight: 700,
                        '&:hover': {
                          backgroundColor: TREASURY_THEME.ACCENT,
                        },
                        '&:disabled': {
                          backgroundColor: '#ccc',
                        },
                      }}
                    >
                      {isApprovePending || isApproveConfirming ? (
                        <>
                          <CircularProgress size={20} sx={{ mr: 1, color: '#000' }} />
                          Approving...
                        </>
                      ) : (
                        'Approve'
                      )}
                    </Button>
                  )}

                  {/* Deposit button */}
                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    disabled={!canDeposit || isDepositPending || isDepositConfirming}
                    onClick={handleDeposit}
                    sx={{
                      backgroundColor: TREASURY_THEME.PRIMARY,
                      color: '#000',
                      fontWeight: 700,
                      '&:hover': {
                        backgroundColor: TREASURY_THEME.ACCENT,
                      },
                      '&:disabled': {
                        backgroundColor: '#ccc',
                      },
                    }}
                  >
                    {isDepositPending || isDepositConfirming ? (
                      <>
                        <CircularProgress size={20} sx={{ mr: 1, color: '#000' }} />
                        Depositing...
                      </>
                    ) : (
                      'Deposit'
                    )}
                  </Button>
                </Box>

                {/* Transaction status */}
                {isApproveSuccess && approveHash && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    Approval successful!{' '}
                    <Link
                      href={getBscScanLink(approveHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View on BSCScan
                    </Link>
                  </Alert>
                )}
                {isDepositSuccess && depositHash && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    Deposit successful!{' '}
                    <Link
                      href={getBscScanLink(depositHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View on BSCScan
                    </Link>
                  </Alert>
                )}
                {isTxError && (approveError || depositError) && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    Transaction failed: {approveError?.message || depositError?.message}
                  </Alert>
                )}
              </>
            )}
          </CardContent>
        </StyledCard>
      </Box>

      {/* Right: Preview */}
      <Box sx={{ flex: 1 }}>
        <USDPMintPreview preview={preview} isLoading={isPreviewLoading} />
      </Box>
    </Box>
  );
}
