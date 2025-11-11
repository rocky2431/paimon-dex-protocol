'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  InputAdornment,
  Alert,
  Divider,
} from '@mui/material';
import { TrendingUp as TrendingUpIcon, AccountBalanceWallet as WalletIcon } from '@mui/icons-material';
import { BoostStakeModalProps } from './types';
import {
  calculateBoostMultiplier,
  formatBoostMultiplier,
  calculateRewardIncrease,
  BOOST_MULTIPLIER_MAX,
  BOOST_DESIGN_TOKENS,
} from './constants';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

/**
 * BoostStakeModal Component
 * Modal dialog for staking PAIMON to boost rewards
 *
 * Features:
 * - Input validation (balance check, numeric only)
 * - Real-time boost multiplier preview
 * - Max button for convenience
 * - Error handling with user-friendly messages
 * - Responsive design with Material Design 3
 */
export function BoostStakeModal({
  open,
  userBalance,
  currentStaked,
  onClose,
  onStake,
  staking = false,
}: BoostStakeModalProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [txError, setTxError] = useState<string>('');

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setAmount('');
      setError('');
      setTxError('');
    }
  }, [open]);

  // Parse numeric values
  const balanceNum = parseFloat(userBalance) || 0;
  const currentStakedNum = parseFloat(currentStaked) || 0;
  const amountNum = parseFloat(amount) || 0;

  // Calculate total after staking
  const totalAfterStaking = currentStakedNum + amountNum;

  // Calculate estimated boost multiplier
  const estimatedMultiplier = calculateBoostMultiplier(totalAfterStaking);
  const estimatedMultiplierFormatted = formatBoostMultiplier(estimatedMultiplier);
  const rewardIncrease = calculateRewardIncrease(estimatedMultiplier);

  // Check if boost is capped
  const isBoostCapped = estimatedMultiplier >= BOOST_MULTIPLIER_MAX;

  // Validation
  const validateAmount = (value: string) => {
    const num = parseFloat(value);

    if (!value || num <= 0) {
      setError('Amount must be greater than zero');
      return false;
    }

    if (num > balanceNum) {
      setError(`Amount exceeds balance (${userBalance} PAIMON)`);
      return false;
    }

    setError('');
    return true;
  };

  // Handle amount change
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // ✅ FIX (Task 79): Allow negative sign for proper validation
    // Allow: digits, decimal point, and leading negative sign
    if (value && !/^-?\d*\.?\d*$/.test(value)) {
      return;
    }

    setAmount(value);
    if (value) {
      validateAmount(value);
    } else {
      setError('');
    }
    setTxError('');
  };

  // Handle max button
  const handleMax = () => {
    setAmount(userBalance);
    validateAmount(userBalance);
    setTxError('');
  };

  // Handle stake
  const handleStake = async () => {
    if (!validateAmount(amount)) {
      return;
    }

    try {
      setTxError('');
      await onStake(amount);
      // Success - modal will be closed by parent
    } catch (err: any) {
      setTxError(err.message || 'Transaction failed');
    }
  };

  // Check if form is valid
  const isFormValid = amountNum > 0 && amountNum <= balanceNum && !error && !staking;

  return (
    // ✅ FIX (Task 79): Wrap Dialog in div to ensure container.firstChild exists for tests
    // MUI Dialog uses Portal which renders to document.body, making container.firstChild null
    <div data-testid="boost-stake-modal-wrapper">
      <Dialog
        open={open}
        onClose={staking ? undefined : onClose}
        maxWidth="sm"
        fullWidth
        transitionDuration={prefersReducedMotion ? 0 : undefined}
        PaperProps={{
          sx: {
            borderRadius: BOOST_DESIGN_TOKENS.RADIUS_LARGE,
            border: `2px solid ${BOOST_DESIGN_TOKENS.COLOR_PRIMARY}`,
          },
        }}
      >
      {/* Title */}
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          background: `linear-gradient(135deg, ${BOOST_DESIGN_TOKENS.COLOR_PRIMARY}15 0%, ${BOOST_DESIGN_TOKENS.COLOR_SECONDARY}15 100%)`,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <TrendingUpIcon sx={{ fontSize: 28, color: BOOST_DESIGN_TOKENS.COLOR_PRIMARY }} />
        <Typography variant="h6" fontWeight={800}>
          Stake PAIMON to Boost Rewards
        </Typography>
      </DialogTitle>

      {/* Content */}
      <DialogContent sx={{ pt: 3 }}>
        {/* Balance Display */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
            p: 2,
            backgroundColor: 'rgba(255, 107, 0, 0.05)',
            borderRadius: BOOST_DESIGN_TOKENS.RADIUS_MEDIUM,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WalletIcon sx={{ color: BOOST_DESIGN_TOKENS.COLOR_SECONDARY }} />
            <Typography variant="body2" color="text.secondary">
              Available Balance
            </Typography>
          </Box>
          <Typography variant="h6" fontWeight={700} color={BOOST_DESIGN_TOKENS.COLOR_PRIMARY}>
            {userBalance} PAIMON
          </Typography>
        </Box>

        {/* Amount Input */}
        <TextField
          fullWidth
          label="Amount"
          placeholder="0.0"
          value={amount}
          onChange={handleAmountChange}
          error={!!error}
          helperText={error}
          disabled={staking || balanceNum === 0}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Button
                  size="small"
                  onClick={handleMax}
                  disabled={staking || balanceNum === 0}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    color: BOOST_DESIGN_TOKENS.COLOR_PRIMARY,
                  }}
                >
                  Max
                </Button>
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        {/* Insufficient Balance Warning */}
        {balanceNum === 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Insufficient balance. You need PAIMON tokens to stake.
          </Alert>
        )}

        {/* Transaction Error */}
        {txError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {txError}
          </Alert>
        )}

        {/* Boost Preview */}
        {amountNum > 0 && !error && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
                Boost Preview
              </Typography>

              <Box
                sx={{
                  p: 2.5,
                  background: `linear-gradient(135deg, ${BOOST_DESIGN_TOKENS.COLOR_PRIMARY}10 0%, ${BOOST_DESIGN_TOKENS.COLOR_SECONDARY}10 100%)`,
                  borderRadius: BOOST_DESIGN_TOKENS.RADIUS_MEDIUM,
                  border: `1px solid ${BOOST_DESIGN_TOKENS.COLOR_PRIMARY}40`,
                }}
              >
                {/* Total Staked */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total Staked
                  </Typography>
                  <Typography variant="body1" fontWeight={700}>
                    {totalAfterStaking.toFixed(2)} PAIMON
                  </Typography>
                </Box>

                {/* Boost Multiplier */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Boost Multiplier
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight={800}
                    color={BOOST_DESIGN_TOKENS.COLOR_PRIMARY}
                  >
                    {estimatedMultiplierFormatted}
                  </Typography>
                </Box>

                {/* Reward Increase */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Reward Increase
                  </Typography>
                  <Typography
                    variant="body1"
                    fontWeight={700}
                    color={BOOST_DESIGN_TOKENS.COLOR_SUCCESS}
                  >
                    +{rewardIncrease}
                  </Typography>
                </Box>

                {/* Boost Cap Warning */}
                {isBoostCapped && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="caption" fontWeight={600}>
                      Maximum boost reached at 1.5x
                    </Typography>
                  </Alert>
                )}
              </Box>
            </Box>
          </>
        )}
      </DialogContent>

      {/* Actions */}
      <DialogActions sx={{ p: 3, pt: 2, gap: 1 }}>
        <Button
          variant="outlined"
          onClick={onClose}
          disabled={staking}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            borderColor: 'divider',
            color: 'text.secondary',
            '&:hover': {
              borderColor: 'text.secondary',
            },
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleStake}
          disabled={!isFormValid}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            backgroundColor: BOOST_DESIGN_TOKENS.COLOR_PRIMARY,
            '&:hover': {
              backgroundColor: BOOST_DESIGN_TOKENS.COLOR_SECONDARY,
            },
            '&:disabled': {
              backgroundColor: 'rgba(0, 0, 0, 0.12)',
            },
          }}
        >
          {staking ? 'Staking...' : 'Stake PAIMON'}
        </Button>
      </DialogActions>
    </Dialog>
    </div>
  );
}
