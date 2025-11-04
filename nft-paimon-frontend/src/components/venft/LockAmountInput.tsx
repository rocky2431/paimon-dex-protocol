'use client';

import { Box, TextField, Typography, Button } from '@mui/material';
import { AnimatedNumber } from '../swap/AnimatedNumber';
import { VeNFTBalance } from './types';
import { DESIGN_TOKENS, ANIMATION_CONFIG } from './constants';

interface LockAmountInputProps {
  amount: string;
  onAmountChange: (amount: string) => void;
  balance?: VeNFTBalance;
  showMaxButton?: boolean;
  onMaxClick?: () => void;
}

/**
 * LockAmountInput Component
 * OlympusDAO-style input for lock amount ((PAIMON token only))
 *
 * Features:
 * - Inset shadow borders
 * - Focus state transitions
 * - Animated balance display
 * - MAX button
 */
export const LockAmountInput: React.FC<LockAmountInputProps> = ({
  amount,
  onAmountChange,
  balance,
  showMaxButton = true,
  onMaxClick,
}) => {
  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;

    // Allow only numbers and single decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      onAmountChange(value);
    }
  };

  const balanceValue = balance ? parseFloat(balance.formatted) : 0;

  return (
    <Box>
      {/* Label */}
      <Typography
        variant="body2"
        color="text.secondary"
        fontWeight={600}
        sx={{ mb: 1.5, fontSize: '0.875rem' }}
      >
        Lock Amount
      </Typography>

      {/* Input container with inset shadow border */}
      <Box
        sx={{
          position: 'relative',
          borderRadius: DESIGN_TOKENS.RADIUS_MEDIUM,
          padding: 3,
          backgroundColor: 'background.elevated', // #FFF8E1
          boxShadow: DESIGN_TOKENS.INSET_BORDER_LIGHT,
          transition: `all ${ANIMATION_CONFIG.DURATION_NORMAL} ${ANIMATION_CONFIG.EASE_OUT_EXPO}`,

          // Focus state
          '&:focus-within': {
            backgroundColor: '#FFFFFF',
            boxShadow: DESIGN_TOKENS.INSET_BORDER_STRONG, // Orange border
          },

          '&:hover': {
            boxShadow: DESIGN_TOKENS.INSET_BORDER_MEDIUM,
          },
        }}
      >
        {/* Amount input + PAIMON label */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          {/* Amount input */}
          <TextField
            value={amount}
            onChange={handleAmountChange}
            placeholder="0.00"
            variant="standard"
            fullWidth
            inputProps={{
              'aria-label': 'Lock amount',
              style: { textAlign: 'left' },
            }}
            InputProps={{
              disableUnderline: true,
              sx: {
                fontSize: '2rem', // Large font (OlympusDAO style)
                fontWeight: 600,
                color: 'text.primary',
                '& input': {
                  padding: 0,
                  '&::placeholder': {
                    color: 'text.disabled',
                    opacity: 0.6,
                  },
                },
              },
            }}
          />

          {/* PAIMON label (static) */}
          <Box
            sx={{
              backgroundColor: 'background.elevated',
              borderRadius: DESIGN_TOKENS.RADIUS_PILL,
              padding: '8px 20px',
              boxShadow: DESIGN_TOKENS.INSET_BORDER_MEDIUM,
            }}
          >
            <Typography variant="body1" fontWeight={700} color="primary.main">
              PAIMON
            </Typography>
          </Box>
        </Box>

        {/* Balance + MAX button */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Balance display with animation */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: '0.875rem' }}
          >
            Balance:{' '}
            <AnimatedNumber
              value={balanceValue}
              decimals={4}
              suffix=" PAIMON"
            />
          </Typography>

          {/* MAX button */}
          {showMaxButton && onMaxClick && (
            <Button
              variant="outlined"
              size="small"
              onClick={onMaxClick}
              sx={{
                borderRadius: DESIGN_TOKENS.RADIUS_SMALL,
                padding: '4px 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'primary.main',
                borderColor: 'transparent',
                backgroundColor: 'transparent',
                boxShadow: DESIGN_TOKENS.INSET_BORDER_LIGHT,
                transition: `all ${ANIMATION_CONFIG.DURATION_FAST} ${ANIMATION_CONFIG.EASE_OUT_EXPO}`,
                textTransform: 'uppercase',

                '&:hover': {
                  backgroundColor: '#FFE0B2',
                  boxShadow: DESIGN_TOKENS.INSET_BORDER_MEDIUM,
                  borderColor: 'transparent',
                  transform: 'translateY(-1px)',
                },
              }}
            >
              MAX
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};
