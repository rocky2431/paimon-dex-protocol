/**
 * StyledCard Component
 * Reusable card component with two variants:
 * - white: Clean white background for form inputs
 * - accent: Deep orange gradient for highlighted information
 */

'use client';

import { Card, CardProps } from '@mui/material';
import { ReactNode } from 'react';

export type CardVariant = 'white' | 'accent';

interface StyledCardProps extends Omit<CardProps, 'variant'> {
  variant?: CardVariant;
  children: ReactNode;
  /**
   * Enable hover lift effect (4px up + enhanced shadow)
   * Default: false
   */
  hoverLift?: boolean;
}

/**
 * Design tokens from swap/vote components
 */
const DESIGN_TOKENS = {
  RADIUS_LARGE: 3, // 24px
  RADIUS_MEDIUM: 2, // 16px
  SHADOW_CARD: '0 2px 8px rgba(255, 140, 0, 0.1)',
  SHADOW_CARD_HOVER: '0 8px 24px rgba(255, 140, 0, 0.2)',
  ANIMATION_DURATION: '0.3s',
  ANIMATION_EASE: 'cubic-bezier(0.16, 1, 0.3, 1)',
};

/**
 * Card variant styles
 */
const CARD_STYLES = {
  white: {
    backgroundColor: 'background.paper', // White
    boxShadow: DESIGN_TOKENS.SHADOW_CARD,
  },
  accent: {
    background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)', // Deep orange gradient
    boxShadow: DESIGN_TOKENS.SHADOW_CARD,
    color: '#FFFFFF',
    position: 'relative' as const,
    overflow: 'hidden' as const,

    // Subtle shimmer effect on hover
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: '-100%',
      width: '100%',
      height: '100%',
      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
      transition: 'left 0.5s',
    },
    '&:hover::before': {
      left: '100%',
    },
  },
};

export function StyledCard({
  variant = 'white',
  hoverLift = false,
  children,
  sx,
  ...props
}: StyledCardProps) {
  const baseStyles = CARD_STYLES[variant];

  const hoverStyles = hoverLift
    ? {
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: DESIGN_TOKENS.SHADOW_CARD_HOVER,
        },
      }
    : {};

  return (
    <Card
      sx={{
        borderRadius: DESIGN_TOKENS.RADIUS_LARGE, // 24px
        padding: 6, // 48px (luxury spacing)
        transition: `all ${DESIGN_TOKENS.ANIMATION_DURATION} ${DESIGN_TOKENS.ANIMATION_EASE}`,
        ...baseStyles,
        ...hoverStyles,
        ...sx, // Allow custom styles override
      }}
      {...props}
    >
      {children}
    </Card>
  );
}
