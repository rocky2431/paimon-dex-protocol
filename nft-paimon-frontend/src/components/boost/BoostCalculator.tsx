'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Alert,
  Divider,
} from '@mui/material';
import { Calculate as CalculateIcon, TrendingUp as TrendingUpIcon } from '@mui/icons-material';
import { BoostCalculatorProps } from './types';
import {
  calculateBoostMultiplier,
  formatBoostMultiplier,
  calculateRewardIncrease,
  BOOST_MULTIPLIER_MAX,
  BOOST_DESIGN_TOKENS,
} from './constants';

/**
 * BoostCalculator Component
 * Calculator for estimating boost rewards
 *
 * Features:
 * - Input validation (balance check, numeric only)
 * - Real-time boost multiplier preview
 * - Reward increase percentage
 * - Example rewards comparison
 * - Material Design 3 styling
 */
export function BoostCalculator({
  userBalance,
  currentMultiplier,
  onCalculate,
}: BoostCalculatorProps) {
  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Parse numeric values
  const balanceNum = parseFloat(userBalance) || 0;
  const amountNum = parseFloat(amount) || 0;

  // Calculate current staked amount from multiplier
  // Formula: multiplier = 10000 + (amount / 1000) * 100
  // Reverse: amount = (multiplier - 10000) * 1000 / 100 = (multiplier - 10000) * 10
  const currentStakedNum = ((currentMultiplier - 10000) * 10) || 0;

  // Calculate total after adding
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
      setError('');
      return true;
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

    // Only allow numeric input with decimals
    if (value && !/^\d*\.?\d*$/.test(value)) {
      return;
    }

    setAmount(value);
    validateAmount(value);

    // Call onCalculate callback
    if (onCalculate && value) {
      onCalculate(value);
    }
  };

  // Example rewards (100 base reward)
  const exampleBaseReward = 100;
  const exampleBoostedReward = (exampleBaseReward * estimatedMultiplier) / 10000;

  return (
    <Card
      sx={{
        borderRadius: BOOST_DESIGN_TOKENS.RADIUS_LARGE,
        border: `1px solid ${BOOST_DESIGN_TOKENS.COLOR_PRIMARY}40`,
        boxShadow: BOOST_DESIGN_TOKENS.SHADOW_CARD,
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <CalculateIcon sx={{ fontSize: 28, color: BOOST_DESIGN_TOKENS.COLOR_PRIMARY }} />
          <Typography variant="h6" fontWeight={700}>
            Boost Calculator
          </Typography>
        </Box>

        {/* Balance Display */}
        <Box
          sx={{
            mb: 2,
            p: 2,
            backgroundColor: 'rgba(255, 107, 0, 0.05)',
            borderRadius: BOOST_DESIGN_TOKENS.RADIUS_MEDIUM,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Available Balance
          </Typography>
          <Typography variant="h6" fontWeight={700} color={BOOST_DESIGN_TOKENS.COLOR_PRIMARY}>
            {userBalance} PAIMON
          </Typography>
        </Box>

        {/* Amount Input */}
        <TextField
          fullWidth
          label="Amount to Stake"
          placeholder="0.0"
          value={amount}
          onChange={handleAmountChange}
          error={!!error}
          helperText={error}
          disabled={balanceNum === 0}
          sx={{ mb: 2 }}
        />

        {/* Insufficient Balance Warning */}
        {balanceNum === 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Insufficient balance. You need PAIMON tokens to stake.
          </Alert>
        )}

        {/* Calculation Results */}
        {amountNum > 0 && !error && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
                <TrendingUpIcon sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5 }} />
                Estimated Boost
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
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

                <Divider sx={{ my: 2 }} />

                {/* Example Comparison */}
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  Example (100 PAIMON base reward):
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Base Reward:
                  </Typography>
                  <Typography variant="caption" fontWeight={600}>
                    {exampleBaseReward.toFixed(2)} PAIMON
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary">
                    Boosted Reward:
                  </Typography>
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    color={BOOST_DESIGN_TOKENS.COLOR_PRIMARY}
                  >
                    {exampleBoostedReward.toFixed(2)} PAIMON
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
      </CardContent>
    </Card>
  );
}
