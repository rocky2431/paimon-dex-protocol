'use client';

/**
 * veNFT APR Calculator Component
 * Interactive form to calculate estimated APR based on lock amount and duration
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Slider,
  Box,
  Grid,
} from '@mui/material';
import { parseUnits } from 'viem';
import {
  calculateVeNFTAPR,
  calculateLockWeeks,
  MAXTIME,
  ANALYTICS_DESIGN_TOKENS,
} from './constants';

// ==================== Props ====================

/**
 * APRCalculator component props
 */
export interface APRCalculatorProps {
  /** Total HYD locked in VotingEscrow (18 decimals) */
  totalLockedHYD: bigint;
}

// ==================== Constants ====================

/**
 * Lock duration marks for slider (in weeks)
 */
const LOCK_DURATION_MARKS = [
  { value: 1, label: '1W' },
  { value: 4, label: '1M' },
  { value: 13, label: '3M' },
  { value: 26, label: '6M' },
  { value: 52, label: '1Y' },
  { value: 104, label: '2Y' },
  { value: 208, label: '4Y' },
];

/**
 * Min/Max lock duration (in weeks)
 */
const MIN_LOCK_WEEKS = 1; // 1 week
const MAX_LOCK_WEEKS = 208; // 4 years

// ==================== Component ====================

/**
 * veNFT APR Calculator Component
 *
 * Features:
 * - Lock amount input (USDP)
 * - Lock duration slider (1 week - 4 years)
 * - Real-time APR calculation
 * - Voting power preview
 * - Orange theme
 *
 * @param props - Component props
 * @returns APR calculator component
 */
export const APRCalculator: React.FC<APRCalculatorProps> = ({
  totalLockedHYD,
}) => {
  // ==================== State ====================

  const [lockAmountInput, setLockAmountInput] = useState<string>('10000'); // Default: 10,000 USDP
  const [lockDurationWeeks, setLockDurationWeeks] = useState<number>(52); // Default: 1 year

  // ==================== Derived State ====================

  /**
   * Parse lock amount (string → bigint)
   */
  const lockAmount = (() => {
    try {
      return parseUnits(lockAmountInput || '0', 18);
    } catch {
      return 0n;
    }
  })();

  /**
   * Convert lock duration (weeks → seconds)
   */
  const lockDuration = BigInt(lockDurationWeeks * 7 * 24 * 60 * 60);

  /**
   * Calculate APR
   */
  const aprResult = calculateVeNFTAPR(
    lockAmount,
    lockDuration,
    totalLockedHYD || 100_000n * 10n ** 18n // Default: 100K HYD locked
  );

  // ==================== Event Handlers ====================

  /**
   * Handle lock amount input change
   */
  const handleLockAmountChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    // Allow only numbers and decimal point
    if (/^\d*\.?\d*$/.test(value)) {
      setLockAmountInput(value);
    }
  };

  /**
   * Handle lock duration slider change
   */
  const handleLockDurationChange = (
    _event: Event,
    newValue: number | number[]
  ) => {
    setLockDurationWeeks(newValue as number);
  };

  // ==================== Render ====================

  return (
    <Card
      sx={{
        borderRadius: ANALYTICS_DESIGN_TOKENS.RADIUS_CARD,
        boxShadow: ANALYTICS_DESIGN_TOKENS.SHADOW_CARD,
        border: '1px solid rgba(255, 152, 0, 0.2)',
      }}
    >
      <CardContent sx={{ padding: 3 }}>
        {/* Card Title */}
        <Typography
          variant="h6"
          component="div"
          sx={{
            fontWeight: 700,
            color: '#FF9800',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: 3,
          }}
        >
          veNFT APR Calculator
        </Typography>

        <Grid container spacing={4}>
          {/* Left Column: Input Form */}
          <Grid item xs={12} md={6}>
            {/* Lock Amount Input */}
            <Box sx={{ marginBottom: 4 }}>
              <Typography
                variant="subtitle2"
                component="div"
                sx={{
                  fontWeight: 600,
                  color: '#424242',
                  marginBottom: 1,
                }}
              >
                Lock Amount (USDP)
              </Typography>
              <TextField
                fullWidth
                value={lockAmountInput}
                onChange={handleLockAmountChange}
                placeholder="Enter amount"
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: ANALYTICS_DESIGN_TOKENS.RADIUS_PILL,
                    '& fieldset': {
                      borderColor: 'rgba(255, 152, 0, 0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 152, 0, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#FF9800',
                    },
                  },
                }}
              />
            </Box>

            {/* Lock Duration Slider */}
            <Box>
              <Typography
                variant="subtitle2"
                component="div"
                sx={{
                  fontWeight: 600,
                  color: '#424242',
                  marginBottom: 1,
                }}
              >
                Lock Duration: {lockDurationWeeks} weeks (
                {(lockDurationWeeks / 52).toFixed(1)} years)
              </Typography>
              <Slider
                value={lockDurationWeeks}
                onChange={handleLockDurationChange}
                min={MIN_LOCK_WEEKS}
                max={MAX_LOCK_WEEKS}
                marks={LOCK_DURATION_MARKS}
                sx={{
                  color: '#FF9800',
                  '& .MuiSlider-thumb': {
                    width: 20,
                    height: 20,
                    '&:hover, &.Mui-focusVisible': {
                      boxShadow: ANALYTICS_DESIGN_TOKENS.GLOW_EFFECT,
                    },
                  },
                  '& .MuiSlider-rail': {
                    opacity: 0.3,
                  },
                  '& .MuiSlider-mark': {
                    backgroundColor: '#FF9800',
                    height: 8,
                    width: 2,
                  },
                  '& .MuiSlider-markLabel': {
                    fontSize: '0.75rem',
                    color: '#757575',
                  },
                }}
              />
            </Box>
          </Grid>

          {/* Right Column: Results */}
          <Grid item xs={12} md={6}>
            {/* APR Result */}
            <Box
              sx={{
                background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                borderRadius: ANALYTICS_DESIGN_TOKENS.RADIUS_CARD,
                padding: 3,
                marginBottom: 2,
                color: '#FFFFFF',
              }}
            >
              <Typography
                variant="caption"
                component="div"
                sx={{
                  fontWeight: 600,
                  marginBottom: 1,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  opacity: 0.9,
                }}
              >
                Estimated APR
              </Typography>
              <Typography
                variant="h3"
                component="div"
                sx={{
                  fontWeight: 900,
                  fontSize: { xs: '2rem', md: '2.5rem' },
                }}
              >
                {aprResult.apr}
              </Typography>
            </Box>

            {/* Voting Power */}
            <Box
              sx={{
                background: 'rgba(255, 152, 0, 0.1)',
                borderRadius: ANALYTICS_DESIGN_TOKENS.RADIUS_PILL,
                padding: 2,
                marginBottom: 2,
              }}
            >
              <Typography
                variant="caption"
                component="div"
                sx={{
                  fontWeight: 600,
                  color: '#757575',
                  marginBottom: 0.5,
                }}
              >
                Voting Power
              </Typography>
              <Typography
                variant="h6"
                component="div"
                sx={{
                  fontWeight: 700,
                  color: '#FF9800',
                }}
              >
                {parseFloat(aprResult.votingPowerFormatted).toFixed(2)} veHYD
              </Typography>
            </Box>

            {/* Annual Rewards */}
            <Box
              sx={{
                background: 'rgba(255, 152, 0, 0.1)',
                borderRadius: ANALYTICS_DESIGN_TOKENS.RADIUS_PILL,
                padding: 2,
              }}
            >
              <Typography
                variant="caption"
                component="div"
                sx={{
                  fontWeight: 600,
                  color: '#757575',
                  marginBottom: 0.5,
                }}
              >
                Annual Rewards
              </Typography>
              <Typography
                variant="h6"
                component="div"
                sx={{
                  fontWeight: 700,
                  color: '#FF9800',
                }}
              >
                ${parseFloat(aprResult.annualRewardsFormatted).toFixed(2)}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Phase 1 Note */}
        <Typography
          variant="caption"
          component="div"
          sx={{
            marginTop: 3,
            color: '#757575',
            fontStyle: 'italic',
            textAlign: 'center',
          }}
        >
          * APR calculation based on estimated protocol fees ($63,875/year). Actual
          APR may vary based on real trading volume and protocol revenue.
        </Typography>
      </CardContent>
    </Card>
  );
};

// ==================== Export ====================

export default APRCalculator;
