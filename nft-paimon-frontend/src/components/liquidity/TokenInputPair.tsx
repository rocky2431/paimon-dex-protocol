'use client';

import { Box, Typography, TextField, Button, Stack } from '@mui/material';
import { TokenAmount } from './types';
import { LIQUIDITY_DESIGN_TOKENS, ANIMATION_CONFIG } from './constants';

/**
 * TokenInputPair Component Props
 */
interface TokenInputPairProps {
  /** Token A information and amount */
  tokenA: TokenAmount | null;
  /** Token B information and amount */
  tokenB: TokenAmount | null;
  /** Callback when token A amount changes */
  onTokenAChange: (amount: string) => void;
  /** Callback when token B amount changes (optional, for new pools) */
  onTokenBChange?: (amount: string) => void;
  /** Whether Token B should be editable (true for new pools, false for existing) */
  tokenBEditable?: boolean;
  /** Whether the component is disabled */
  disabled?: boolean;
}

/**
 * TokenInputPair Component
 * OlympusDAO-inspired dual token input for liquidity provision
 *
 * Features:
 * - Token A input (user-controlled)
 * - Token B input (auto-calculated based on pool ratio)
 * - Balance display with MAX button
 * - Orange gradient borders
 * - Input validation
 */
export const TokenInputPair: React.FC<TokenInputPairProps> = ({
  tokenA,
  tokenB,
  onTokenAChange,
  onTokenBChange,
  tokenBEditable = false,
  disabled = false,
}) => {
  const handleMaxA = () => {
    if (tokenA?.balanceFormatted) {
      onTokenAChange(tokenA.balanceFormatted);
    }
  };

  const handleMaxB = () => {
    if (tokenB?.balanceFormatted && onTokenBChange) {
      onTokenBChange(tokenB.balanceFormatted);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Token A Input */}
      <Box
        sx={{
          borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_LARGE,
          padding: 3,
          backgroundColor: 'background.paper',
          boxShadow: LIQUIDITY_DESIGN_TOKENS.SHADOW_CARD,
          border: '2px solid',
          borderColor: 'rgba(255, 152, 0, 0.1)',
          transition: `all ${ANIMATION_CONFIG.DURATION_NORMAL} ${ANIMATION_CONFIG.EASE_OUT_EXPO}`,

          '&:hover': {
            borderColor: 'rgba(255, 152, 0, 0.3)',
            boxShadow: LIQUIDITY_DESIGN_TOKENS.SHADOW_CARD_HOVER,
          },
        }}
      >
        {/* Header: Token name + Balance */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight={600} color="text.primary">
            {tokenA?.token.symbol || 'Select Token'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
            Balance: {tokenA?.balanceFormatted || '0.00'}
          </Typography>
        </Stack>

        {/* Input field */}
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            fullWidth
            variant="standard"
            placeholder="0.00"
            value={tokenA?.amountFormatted || ''}
            onChange={(e) => onTokenAChange(e.target.value)}
            disabled={disabled}
            InputProps={{
              disableUnderline: true,
              sx: {
                fontSize: '2rem',
                fontWeight: 700,
                color: 'text.primary',
              },
            }}
            sx={{
              '& input::placeholder': {
                color: 'text.disabled',
                opacity: 0.5,
              },
            }}
          />

          {/* MAX button */}
          <Button
            size="small"
            onClick={handleMaxA}
            disabled={disabled || !tokenA}
            sx={{
              minWidth: '60px',
              height: '32px',
              borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_PILL,
              backgroundColor: 'primary.main',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              transition: `all ${ANIMATION_CONFIG.DURATION_NORMAL} ${ANIMATION_CONFIG.EASE_OUT_EXPO}`,

              '&:hover': {
                backgroundColor: 'primary.dark',
                transform: 'translateY(-2px)',
                boxShadow: LIQUIDITY_DESIGN_TOKENS.SHADOW_BUTTON,
              },

              '&:disabled': {
                backgroundColor: 'action.disabledBackground',
                color: 'action.disabled',
              },
            }}
          >
            MAX
          </Button>
        </Stack>
      </Box>

      {/* Plus icon separator */}
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: 'background.elevated',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid',
            borderColor: 'rgba(255, 152, 0, 0.2)',
          }}
        >
          <Typography variant="h6" color="primary" fontWeight={700}>
            +
          </Typography>
        </Box>
      </Box>

      {/* Token B Input (Editable for new pools, read-only for existing pools) */}
      <Box
        sx={{
          borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_LARGE,
          padding: 3,
          backgroundColor: 'background.paper',
          boxShadow: LIQUIDITY_DESIGN_TOKENS.SHADOW_CARD,
          border: '2px solid',
          borderColor: 'rgba(255, 152, 0, 0.1)',
          opacity: disabled ? 0.6 : 1,
          transition: `all ${ANIMATION_CONFIG.DURATION_NORMAL} ${ANIMATION_CONFIG.EASE_OUT_EXPO}`,

          '&:hover': tokenBEditable
            ? {
                borderColor: 'rgba(255, 152, 0, 0.3)',
                boxShadow: LIQUIDITY_DESIGN_TOKENS.SHADOW_CARD_HOVER,
              }
            : {},
        }}
      >
        {/* Header: Token name + Balance */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight={600} color="text.primary">
            {tokenB?.token.symbol || 'Select Token'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
            Balance: {tokenB?.balanceFormatted || '0.00'}
          </Typography>
        </Stack>

        {tokenBEditable ? (
          /* Editable input field for new pools */
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              fullWidth
              variant="standard"
              placeholder="0.00"
              value={tokenB?.amountFormatted || ''}
              onChange={(e) => onTokenBChange && onTokenBChange(e.target.value)}
              disabled={disabled}
              InputProps={{
                disableUnderline: true,
                sx: {
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: 'text.primary',
                },
              }}
              sx={{
                '& input::placeholder': {
                  color: 'text.disabled',
                  opacity: 0.5,
                },
              }}
            />

            {/* MAX button */}
            <Button
              size="small"
              onClick={handleMaxB}
              disabled={disabled}
              sx={{
                minWidth: 'auto',
                px: 2,
                py: 0.5,
                borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_PILL,
                backgroundColor: 'rgba(255, 152, 0, 0.1)',
                color: 'primary.main',
                fontWeight: 700,
                fontSize: '0.75rem',
                transition: `all ${ANIMATION_CONFIG.DURATION_NORMAL}`,

                '&:hover': {
                  backgroundColor: 'rgba(255, 152, 0, 0.2)',
                },
              }}
            >
              MAX
            </Button>
          </Stack>
        ) : (
          /* Read-only display for existing pools */
          <Typography
            variant="h4"
            fontWeight={700}
            color={tokenB?.amountFormatted ? 'text.primary' : 'text.disabled'}
            sx={{
              fontSize: '2rem',
              opacity: tokenB?.amountFormatted ? 1 : 0.5,
            }}
          >
            {tokenB?.amountFormatted || '0.00'}
          </Typography>
        )}
      </Box>
    </Box>
  );
};
