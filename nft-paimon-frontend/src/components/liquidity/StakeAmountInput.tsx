'use client';

import { Box, Stack, Typography, TextField, Tabs, Tab, InputAdornment, IconButton } from '@mui/material';
import { useState } from 'react';
import { formatUnits, parseUnits } from 'viem';
import { LIQUIDITY_DESIGN_TOKENS, ANIMATION_CONFIG } from './constants';

interface StakeAmountInputProps {
  /** Current action (stake or unstake) */
  action: 'stake' | 'unstake';
  /** On action change */
  onActionChange: (action: 'stake' | 'unstake') => void;
  /** LP token symbol */
  lpSymbol: string;
  /** Available balance (wallet for stake, gauge for unstake) */
  balance: bigint;
  /** Amount to stake/unstake */
  amount: bigint;
  /** On amount change */
  onAmountChange: (amount: bigint) => void;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * StakeAmountInput Component
 * Input field for staking/unstaking LP tokens
 *
 * Features:
 * - Stake/Unstake tabs
 * - LP token input
 * - MAX button
 * - Balance display
 */
export const StakeAmountInput: React.FC<StakeAmountInputProps> = ({
  action,
  onActionChange,
  lpSymbol,
  balance,
  amount,
  onAmountChange,
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState('');

  const balanceFormatted = formatUnits(balance, 18);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    try {
      if (value === '' || value === '.') {
        onAmountChange(0n);
        return;
      }
      const parsed = parseUnits(value, 18);
      onAmountChange(parsed);
    } catch {
      // Invalid input, keep previous amount
    }
  };

  const handleMaxClick = () => {
    setInputValue(balanceFormatted);
    onAmountChange(balance);
  };

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_MEDIUM,
        backgroundColor: 'background.elevated',
        border: '2px solid',
        borderColor: 'divider',
        transition: `all ${ANIMATION_CONFIG.DURATION_NORMAL} ${ANIMATION_CONFIG.EASE_OUT_EXPO}`,

        '&:focus-within': {
          borderColor: 'primary.main',
          backgroundColor: 'rgba(255, 152, 0, 0.05)',
        },
      }}
    >
      {/* Stake/Unstake Tabs */}
      <Tabs
        value={action}
        onChange={(_, newValue) => onActionChange(newValue)}
        sx={{
          mb: 2,
          minHeight: 36,
          '& .MuiTabs-indicator': {
            backgroundColor: 'primary.main',
            height: 3,
            borderRadius: '3px 3px 0 0',
          },
        }}
      >
        <Tab
          value="stake"
          label="Stake"
          disabled={disabled}
          sx={{
            minHeight: 36,
            py: 1,
            px: 3,
            borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_PILL,
            fontWeight: 600,
            fontSize: '0.875rem',
            textTransform: 'none',
            transition: `all ${ANIMATION_CONFIG.DURATION_NORMAL}`,

            '&.Mui-selected': {
              color: 'primary.main',
            },
          }}
        />
        <Tab
          value="unstake"
          label="Unstake"
          disabled={disabled}
          sx={{
            minHeight: 36,
            py: 1,
            px: 3,
            borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_PILL,
            fontWeight: 600,
            fontSize: '0.875rem',
            textTransform: 'none',
            transition: `all ${ANIMATION_CONFIG.DURATION_NORMAL}`,

            '&.Mui-selected': {
              color: 'primary.main',
            },
          }}
        />
      </Tabs>

      {/* Amount Input */}
      <Stack direction="row" alignItems="center" spacing={2}>
        <TextField
          fullWidth
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="0.0"
          disabled={disabled}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Typography variant="body2" fontWeight={600} color="text.secondary">
                  {lpSymbol} LP
                </Typography>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_MEDIUM,
              backgroundColor: 'background.paper',
              fontSize: '1.25rem',
              fontWeight: 600,

              '& fieldset': {
                border: 'none',
              },

              '&:hover fieldset': {
                border: 'none',
              },

              '&.Mui-focused fieldset': {
                border: 'none',
              },
            },

            '& input': {
              textAlign: 'left',
              padding: '12px 16px',
            },
          }}
        />
      </Stack>

      {/* Balance and MAX button */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.5 }}>
        <Typography variant="caption" color="text.secondary" fontSize="0.75rem">
          {action === 'stake' ? 'Available:' : 'Staked:'} {Number(balanceFormatted).toFixed(4)} {lpSymbol} LP
        </Typography>

        <Box
          onClick={handleMaxClick}
          sx={{
            px: 2,
            py: 0.5,
            borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_PILL,
            backgroundColor: 'rgba(255, 152, 0, 0.1)',
            border: '1px solid',
            borderColor: 'primary.main',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: `all ${ANIMATION_CONFIG.DURATION_NORMAL}`,
            opacity: disabled ? 0.5 : 1,

            '&:hover': {
              backgroundColor: disabled ? 'rgba(255, 152, 0, 0.1)' : 'rgba(255, 152, 0, 0.2)',
              transform: disabled ? 'none' : 'scale(1.05)',
            },
          }}
        >
          <Typography variant="caption" fontWeight={700} color="primary.main" fontSize="0.75rem">
            MAX
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
};
