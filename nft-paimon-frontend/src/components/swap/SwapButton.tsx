'use client';

import { Button, CircularProgress, Box } from '@mui/material';
import { SwapState } from './types';
import { DESIGN_TOKENS, ANIMATION_CONFIG } from './constants';

interface SwapButtonProps {
  state: SwapState;
  onClick: () => void;
  disabled?: boolean;
  errorMessage?: string;
  needsApproval?: boolean;
  tokenSymbol?: string;
}

/**
 * SwapButton Component
 * OlympusDAO "Enter App" style button with hover effects
 *
 * Features:
 * - Pill-shaped (100px border-radius)
 * - Hover: translateY(-2px) + text translateY(-4px)
 * - Pulse animation during loading
 * - State-based button text
 * - Auto-displays "Approve" when needed
 */
export const SwapButton: React.FC<SwapButtonProps> = ({
  state,
  onClick,
  disabled = false,
  errorMessage,
  needsApproval = false,
  tokenSymbol = '',
}) => {
  const getButtonText = (): string => {
    // Show "Approve" button when approval needed
    if (needsApproval && (state === SwapState.IDLE || state === SwapState.INPUT)) {
      return `Approve ${tokenSymbol}`;
    }

    switch (state) {
      case SwapState.IDLE:
      case SwapState.INPUT:
        return 'Swap Now';
      case SwapState.APPROVING:
        return 'Approving...';
      case SwapState.APPROVED:
        return 'Swap Now';
      case SwapState.SWAPPING:
        return 'Swapping...';
      case SwapState.SUCCESS:
        return 'Swap Successful!';
      case SwapState.ERROR:
        return errorMessage || 'Try Again';
      default:
        return 'Swap Now';
    }
  };

  const isLoading = state === SwapState.APPROVING || state === SwapState.SWAPPING;
  const isSuccess = state === SwapState.SUCCESS;
  const isError = state === SwapState.ERROR;

  return (
    <Button
      variant="contained"
      fullWidth
      onClick={onClick}
      disabled={disabled || isLoading || isSuccess}
      sx={{
        borderRadius: DESIGN_TOKENS.RADIUS_PILL, // 100px pill shape
        padding: '16px 0',
        fontSize: '1.25rem',
        fontWeight: 700,
        backgroundColor: isError ? 'error.main' : 'primary.main',
        color: '#FFFFFF',
        textTransform: 'none',
        boxShadow: DESIGN_TOKENS.SHADOW_BUTTON,
        transition: `all ${ANIMATION_CONFIG.DURATION_NORMAL} ${ANIMATION_CONFIG.EASE_OUT_EXPO}`,
        position: 'relative',
        overflow: 'hidden',

        // Pulse animation during loading
        ...(isLoading && {
          '@keyframes pulse': {
            '0%': {
              boxShadow: '0 0 0 0 rgba(255, 152, 0, 0.7)',
            },
            '70%': {
              boxShadow: '0 0 0 10px rgba(255, 152, 0, 0)',
            },
            '100%': {
              boxShadow: '0 0 0 0 rgba(255, 152, 0, 0)',
            },
          },
          animation: 'pulse 1.5s cubic-bezier(0.16, 1, 0.3, 1) infinite',
        }),

        // Success state
        ...(isSuccess && {
          backgroundColor: 'primary.main',
          opacity: 0.8,
        }),

        '&:hover:not(:disabled)': {
          backgroundColor: isError ? '#D84315' : '#F57C00', // Deep orange
          boxShadow: DESIGN_TOKENS.SHADOW_BUTTON_HOVER,
          transform: 'translateY(-2px)', // Button lift

          '& .button-text': {
            transform: 'translateY(-4px)', // OlympusDAO text lift
          },
        },

        '&:active:not(:disabled)': {
          transform: 'translateY(0)',
        },

        '&.Mui-disabled': {
          backgroundColor: 'text.disabled',
          color: '#FFFFFF',
          opacity: 0.6,
        },
      }}
    >
      <Box
        className="button-text"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.5,
          transition: `transform ${ANIMATION_CONFIG.DURATION_NORMAL} ${ANIMATION_CONFIG.EASE_OUT_EXPO}`,
        }}
      >
        {isLoading && (
          <CircularProgress
            size={24}
            sx={{
              color: '#FFFFFF',
            }}
          />
        )}
        <span>{getButtonText()}</span>
      </Box>
    </Button>
  );
};
