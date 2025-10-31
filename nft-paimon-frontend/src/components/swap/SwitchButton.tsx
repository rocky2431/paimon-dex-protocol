'use client';

import { IconButton } from '@mui/material';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import { DESIGN_TOKENS, ANIMATION_CONFIG } from './constants';

interface SwitchButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

/**
 * SwitchButton Component
 * OlympusDAO-style rotation animation on hover
 *
 * Features:
 * - 180° rotation on hover (OlympusDAO effect)
 * - Inset shadow border
 * - Smooth transition with cubic-bezier
 */
export const SwitchButton: React.FC<SwitchButtonProps> = ({
  onClick,
  disabled = false,
}) => {
  return (
    <IconButton
      onClick={onClick}
      disabled={disabled}
      sx={{
        my: 2,
        mx: 'auto',
        display: 'block',
        width: 48,
        height: 48,
        backgroundColor: 'background.elevated',
        boxShadow: DESIGN_TOKENS.INSET_BORDER_MEDIUM,
        transition: `all ${ANIMATION_CONFIG.DURATION_NORMAL} ${ANIMATION_CONFIG.EASE_OUT_EXPO}`,

        '&:hover': {
          backgroundColor: '#FFE0B2', // Peach color
          boxShadow: DESIGN_TOKENS.INSET_BORDER_STRONG,
          transform: 'rotate(180deg)', // OlympusDAO 180° rotation
        },

        '&:active': {
          transform: 'rotate(180deg) scale(0.95)',
        },

        '&.Mui-disabled': {
          backgroundColor: 'background.default',
          boxShadow: DESIGN_TOKENS.INSET_BORDER_LIGHT,
          opacity: 0.5,
        },
      }}
    >
      <SwapVertIcon
        sx={{
          color: 'primary.main',
          fontSize: '1.5rem',
          transition: `all ${ANIMATION_CONFIG.DURATION_NORMAL} ${ANIMATION_CONFIG.EASE_OUT_EXPO}`,
        }}
      />
    </IconButton>
  );
};
