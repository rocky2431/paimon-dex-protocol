'use client';

import { Button, CircularProgress, Typography } from '@mui/material';
import { RemoveLiquidityState } from './types';
import { LIQUIDITY_DESIGN_TOKENS, ANIMATION_CONFIG } from './constants';

/**
 * RemoveLiquidityButton Component Props
 */
interface RemoveLiquidityButtonProps {
  /** Current remove liquidity state */
  state: RemoveLiquidityState;
  /** Click handler */
  onClick: () => void;
  /** Whether the button is disabled */
  disabled: boolean;
  /** Error message (if any) */
  errorMessage?: string;
}

/**
 * RemoveLiquidityButton Component
 * OlympusDAO-inspired pill-shaped action button
 *
 * Features:
 * - State-based text display
 * - Loading spinner during transactions
 * - Pulse animation during approval/removing
 * - Orange gradient background
 * - Hover lift effect
 */
export const RemoveLiquidityButton: React.FC<RemoveLiquidityButtonProps> = ({
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
      case RemoveLiquidityState.IDLE:
        return 'Select Percentage';
      case RemoveLiquidityState.NEEDS_APPROVAL:
        return 'Approve LP Token';
      case RemoveLiquidityState.APPROVING:
        return 'Approving LP Token...';
      case RemoveLiquidityState.READY:
        return 'Remove Liquidity';
      case RemoveLiquidityState.REMOVING:
        return 'Removing Liquidity...';
      case RemoveLiquidityState.SUCCESS:
        return 'Liquidity Removed! 🎉';
      case RemoveLiquidityState.ERROR:
        return 'Try Again';
      default:
        return 'Remove Liquidity';
    }
  };

  /**
   * Whether the button is in a loading state
   */
  const isLoading =
    state === RemoveLiquidityState.APPROVING ||
    state === RemoveLiquidityState.REMOVING;

  /**
   * Whether the button should pulse (during approval/removing)
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
        background: state === RemoveLiquidityState.SUCCESS
          ? 'linear-gradient(90deg, #06d6a0 0%, #1b9aaa 100%)' // Success: Green gradient
          : state === RemoveLiquidityState.ERROR
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
      {state === RemoveLiquidityState.SUCCESS && (
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
