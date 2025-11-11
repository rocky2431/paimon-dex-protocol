'use client';

import { Box, TextField, Typography, Button } from '@mui/material';
import { Token, TokenBalance } from './types';
import { TokenSelector } from './TokenSelector';
import { AnimatedNumber } from './AnimatedNumber';
import { DESIGN_TOKENS, ANIMATION_CONFIG } from './constants';

interface TokenInputProps {
  label: string;
  amount: string;
  onAmountChange: (amount: string) => void;
  selectedToken: Token;
  onTokenChange: (token: Token) => void;
  balance?: TokenBalance;
  readOnly?: boolean;
  excludeToken?: Token;
  showMaxButton?: boolean;
  onMaxClick?: () => void;
  'data-testid-prefix'?: string; // E.g., "from" or "to" for generating test IDs
}

/**
 * TokenInput Component
 * OlympusDAO-style input with inset shadow borders
 *
 * Features:
 * - Inset shadow borders (replaces solid borders)
 * - Focus state with color transition
 * - Animated balance counter
 * - MAX button for quick balance input
 * - Large font size (2rem, OlympusDAO style)
 */
export const TokenInput: React.FC<TokenInputProps> = ({
  label,
  amount,
  onAmountChange,
  selectedToken,
  onTokenChange,
  balance,
  readOnly = false,
  excludeToken,
  showMaxButton = true,
  onMaxClick,
  'data-testid-prefix': testIdPrefix,
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
        {label}
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

          // Hover state (only if not read-only)
          ...(!readOnly && {
            '&:hover': {
              boxShadow: DESIGN_TOKENS.INSET_BORDER_MEDIUM,
            },
          }),
        }}
      >
        {/* Amount input + Token selector */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          {/* Amount input */}
          <TextField
            value={amount}
            onChange={handleAmountChange}
            placeholder="0.00"
            variant="standard"
            fullWidth
            disabled={readOnly}
            inputProps={{
              'aria-label': `${label} amount`,
              'data-testid': testIdPrefix ? `${testIdPrefix}-amount-input` : undefined,
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
                '&.Mui-disabled': {
                  color: 'text.primary',
                  WebkitTextFillColor: 'text.primary',
                },
              },
            }}
          />

          {/* Token selector */}
          <TokenSelector
            selectedToken={selectedToken}
            onTokenChange={onTokenChange}
            disabled={readOnly}
            excludeToken={excludeToken}
            data-testid={testIdPrefix ? `${testIdPrefix}-token-selector` : undefined}
          />
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
            data-testid={testIdPrefix ? `${testIdPrefix}-balance` : undefined}
            sx={{ fontSize: '0.875rem' }}
          >
            Balance:{' '}
            <AnimatedNumber
              value={balanceValue}
              decimals={balance?.decimals === 6 ? 2 : 4}
              suffix={` ${balance?.symbol || ''}`}
            />
          </Typography>

          {/* MAX button */}
          {showMaxButton && !readOnly && onMaxClick && (
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
