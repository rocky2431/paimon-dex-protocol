'use client';

import { Button, CircularProgress, Typography } from '@mui/material';
import { AddLiquidityState } from './types';
import { LIQUIDITY_DESIGN_TOKENS, ANIMATION_CONFIG } from './constants';

/**
 * AddLiquidityButton Component Props
 */
interface AddLiquidityButtonProps {
  /** Current add liquidity state */
  state: AddLiquidityState;
  /** Click handler */
  onClick: () => void;
  /** Whether the button is disabled */
  disabled: boolean;
  /** Error message (if any) */
  errorMessage?: string;
}

/**
 * AddLiquidityButton Component
 * OlympusDAO-inspired pill-shaped action button
 *
 * Features:
 * - State-based text display (including pool creation)
 * - Loading spinner during transactions
 * - Pulse animation during pool creation/approval/adding
 * - Orange gradient background
 * - Hover lift effect
 * - Handles complete flow: Create Pool → Approve Tokens → Add Liquidity
 */
export const AddLiquidityButton: React.FC<AddLiquidityButtonProps> = ({
  state,
  onClick,
  disabled,
  errorMessage,
}) => {
  /**
   * Get button text based on current state
   */
  const getButtonText = (): string => {
    switch (state) {
      case AddLiquidityState.IDLE:
        return 'Enter Amounts';
      case AddLiquidityState.POOL_NOT_EXIST:
        return 'Create Pool';
      case AddLiquidityState.CREATING_POOL:
        return 'Creating Pool...';
      case AddLiquidityState.NEEDS_APPROVAL_A:
        return 'Approve Token A';
      case AddLiquidityState.NEEDS_APPROVAL_B:
        return 'Approve Token B';
      case AddLiquidityState.APPROVING_A:
        return 'Approving Token A...';
      case AddLiquidityState.APPROVING_B:
        return 'Approving Token B...';
      case AddLiquidityState.READY:
        return 'Add Liquidity';
      case AddLiquidityState.ADDING:
        return 'Adding Liquidity...';
      case AddLiquidityState.SUCCESS:
        return 'Liquidity Added! 🎉';
      case AddLiquidityState.ERROR:
        return 'Try Again';
      default:
        return 'Add Liquidity';
    }
  };

  /**
   * Whether the button is in a loading state
   */
  const isLoading =
    state === AddLiquidityState.CREATING_POOL ||
    state === AddLiquidityState.APPROVING_A ||
    state === AddLiquidityState.APPROVING_B ||
    state === AddLiquidityState.ADDING;

  /**
   * Whether the button should pulse (during approval/adding)
   */
  const shouldPulse = isLoading;

  return (
    <Button
      fullWidth
      variant="contained"
      size="large"
      onClick={onClick}
      disabled={disabled || isLoading}
      sx={{
        height: 60,
        borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_PILL,
        fontSize: '1.125rem',
        fontWeight: 700,
        textTransform: 'none',
        background: state === AddLiquidityState.SUCCESS
          ? 'linear-gradient(90deg, #06d6a0 0%, #1b9aaa 100%)' // Success: Green gradient
          : state === AddLiquidityState.ERROR
          ? 'linear-gradient(90deg, #ff6b35 0%, #d84315 100%)' // Error: Red gradient
          : 'linear-gradient(90deg, #FF9800 0%, #F57C00 100%)', // Default: Orange gradient
        color: '#FFFFFF',
        boxShadow: LIQUIDITY_DESIGN_TOKENS.SHADOW_BUTTON,
        transition: `all ${ANIMATION_CONFIG.DURATION_NORMAL} ${ANIMATION_CONFIG.EASE_OUT_EXPO}`,
        position: 'relative',
        overflow: 'hidden',

        // Pulse animation
        ...(shouldPulse && {
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          '@keyframes pulse': {
            '0%, 100%': {
              opacity: 1,
            },
            '50%': {
              opacity: 0.8,
            },
          },
        }),

        '&:hover': {
          transform: disabled || isLoading ? 'none' : 'translateY(-2px)',
          boxShadow: disabled || isLoading ? LIQUIDITY_DESIGN_TOKENS.SHADOW_BUTTON : '0 8px 20px rgba(255, 152, 0, 0.4)',
        },

        '&:disabled': {
          background: 'linear-gradient(90deg, rgba(255, 152, 0, 0.3) 0%, rgba(245, 124, 0, 0.3) 100%)',
          color: 'rgba(255, 255, 255, 0.5)',
        },
      }}
    >
      {/* Loading spinner */}
      {isLoading && (
        <CircularProgress
          size={20}
          sx={{
            position: 'absolute',
            left: 24,
            color: '#FFFFFF',
          }}
        />
      )}

      {/* Button text */}
      <Typography variant="button" fontWeight={700} sx={{ fontSize: '1.125rem' }}>
        {getButtonText()}
      </Typography>

      {/* Success checkmark */}
      {state === AddLiquidityState.SUCCESS && (
        <Typography
          component="span"
          sx={{
            position: 'absolute',
            right: 24,
            fontSize: '1.5rem',
          }}
        >
          ✓
        </Typography>
      )}
    </Button>
  );
};
