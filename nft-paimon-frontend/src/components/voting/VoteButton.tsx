'use client';

import { Button, CircularProgress, Box } from '@mui/material';
import { VotingState } from './types';
import { DESIGN_TOKENS, ANIMATION_CONFIG } from './constants';

interface VoteButtonProps {
  state: VotingState;
  onClick: () => void;
  disabled?: boolean;
  errorMessage?: string;
  gaugeCount?: number; // Number of gauges being voted for
}

/**
 * VoteButton Component
 * OlympusDAO-style batch voting submission button
 *
 * Features:
 * - Pill-shaped (100px border-radius)
 * - Hover: translateY(-2px) + text translateY(-4px)
 * - Pulse animation during voting
 * - Shows gauge count
 */
export const VoteButton: React.FC<VoteButtonProps> = ({
  state,
  onClick,
  disabled = false,
  errorMessage,
  gaugeCount = 0,
}) => {
  const getButtonText = (): string => {
    switch (state) {
      case VotingState.IDLE:
      case VotingState.INPUT:
        if (gaugeCount === 0) {
          return 'Submit Votes';
        }
        return `Submit Votes (${gaugeCount} ${gaugeCount === 1 ? 'Gauge' : 'Gauges'})`;
      case VotingState.VOTING:
        return 'Submitting Votes...';
      case VotingState.SUCCESS:
        return 'Votes Submitted! 🎉';
      case VotingState.ERROR:
        return errorMessage || 'Try Again';
      default:
        return 'Submit Votes';
    }
  };

  const isLoading = state === VotingState.VOTING;
  const isSuccess = state === VotingState.SUCCESS;
  const isError = state === VotingState.ERROR;

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

        // Pulse animation during voting
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
