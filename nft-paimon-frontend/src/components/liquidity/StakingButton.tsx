'use client';

import { Button, CircularProgress } from '@mui/material';
import { StakingState } from './types';
import { LIQUIDITY_DESIGN_TOKENS, ANIMATION_CONFIG } from './constants';

interface StakingButtonProps {
  /** Current staking state */
  state: StakingState;
  /** On button click */
  onClick: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Error message */
  errorMessage?: string;
}

/**
 * getButtonText
 * Get button text based on state
 */
const getButtonText = (state: StakingState, action: 'stake' | 'unstake'): string => {
  switch (state) {
    case StakingState.IDLE:
      return action === 'stake' ? 'Enter Amount to Stake' : 'Enter Amount to Unstake';
    case StakingState.NEEDS_APPROVAL:
      return 'Approve LP Token';
    case StakingState.APPROVING:
      return 'Approving...';
    case StakingState.READY:
      return action === 'stake' ? 'Stake LP Tokens' : 'Unstake LP Tokens';
    case StakingState.STAKING:
      return 'Staking...';
    case StakingState.UNSTAKING:
      return 'Unstaking...';
    case StakingState.CLAIMING:
      return 'Claiming...';
    case StakingState.SUCCESS:
      return 'Success!';
    case StakingState.ERROR:
      return 'Try Again';
    default:
      return 'Unknown State';
  }
};

/**
 * getButtonColor
 * Get button color based on state
 */
const getButtonColor = (state: StakingState): string => {
  switch (state) {
    case StakingState.SUCCESS:
      return 'success.main';
    case StakingState.ERROR:
      return 'error.main';
    case StakingState.NEEDS_APPROVAL:
      return 'warning.main';
    default:
      return 'primary.main';
  }
};

/**
 * StakingButton Component
 * State-based button for staking operations
 *
 * Features:
 * - Pill-shaped design
 * - State-based text and color
 * - Loading spinner
 * - Pulse animation for ready state
 */
export const StakingButton: React.FC<StakingButtonProps> = ({
  state,
  onClick,
  disabled = false,
  errorMessage,
}) => {
  const isLoading =
    state === StakingState.APPROVING ||
    state === StakingState.STAKING ||
    state === StakingState.UNSTAKING ||
    state === StakingState.CLAIMING;

  const isDisabled = disabled || state === StakingState.IDLE || isLoading;

  // Assume 'stake' action for now (we'll get this from context in the hook)
  const action = 'stake';
  const buttonText = getButtonText(state, action);
  const buttonColor = getButtonColor(state);

  return (
    <Button
      fullWidth
      onClick={onClick}
      disabled={isDisabled}
      sx={{
        py: 2,
        borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_PILL,
        backgroundColor: buttonColor,
        color: 'white',
        fontWeight: 700,
        fontSize: '1.125rem',
        textTransform: 'none',
        boxShadow: state === StakingState.READY ? LIQUIDITY_DESIGN_TOKENS.SHADOW_BUTTON : 'none',
        transition: `all ${ANIMATION_CONFIG.DURATION_NORMAL} ${ANIMATION_CONFIG.EASE_OUT_EXPO}`,
        animation: state === StakingState.READY ? 'pulse 2s infinite' : 'none',

        '@keyframes pulse': {
          '0%, 100%': {
            boxShadow: LIQUIDITY_DESIGN_TOKENS.SHADOW_BUTTON,
          },
          '50%': {
            boxShadow: '0 4px 20px rgba(255, 152, 0, 0.4)',
          },
        },

        '&:hover': {
          backgroundColor: buttonColor,
          filter: 'brightness(1.1)',
          transform: isDisabled ? 'none' : 'scale(1.02)',
        },

        '&:disabled': {
          backgroundColor: 'action.disabledBackground',
          color: 'text.disabled',
        },
      }}
    >
      {isLoading && (
        <CircularProgress
          size={20}
          sx={{
            color: 'white',
            mr: 1,
          }}
        />
      )}
      {buttonText}
    </Button>
  );
};
