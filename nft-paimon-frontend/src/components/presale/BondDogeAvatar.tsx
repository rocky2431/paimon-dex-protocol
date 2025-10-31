'use client';

import { Box, Typography } from '@mui/material';
import Image from 'next/image';
import { BondDogeExpression, getBondDogeImagePath, getBondDogeColorTheme, BOND_DOGE_EXPRESSIONS } from '@/types/bondDoge';

interface BondDogeAvatarProps {
  expression: BondDogeExpression;
  size?: number; // Width and height in pixels
  showLabel?: boolean; // Show expression name below avatar
  animate?: boolean; // Animate entrance
}

/**
 * BondDogeAvatar Component
 * Displays Bond Doge mascot with specified expression
 *
 * Features:
 * - Responsive sizing
 * - Optional expression label
 * - Optional animation
 * - Color-themed border
 *
 * Usage:
 * <BondDogeAvatar expression={BondDogeExpression.HAPPY} size={200} />
 */
export function BondDogeAvatar({ expression, size = 150, showLabel = false, animate = false }: BondDogeAvatarProps) {
  const meta = BOND_DOGE_EXPRESSIONS[expression];
  const colorTheme = getBondDogeColorTheme(expression);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
      }}
    >
      {/* Avatar Container */}
      <Box
        sx={{
          position: 'relative',
          width: size,
          height: size,
          borderRadius: '50%',
          border: '4px solid',
          borderColor: colorTheme,
          overflow: 'hidden',
          backgroundColor: 'background.paper',
          boxShadow: `0 4px 16px ${colorTheme}40`,
          animation: animate ? 'bondDogeBounce 0.6s ease-in-out' : 'none',
          '@keyframes bondDogeBounce': {
            '0%': {
              transform: 'scale(0) rotate(-180deg)',
              opacity: 0,
            },
            '50%': {
              transform: 'scale(1.1) rotate(0deg)',
            },
            '100%': {
              transform: 'scale(1) rotate(0deg)',
              opacity: 1,
            },
          },
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          '&:hover': {
            transform: 'scale(1.05)',
            boxShadow: `0 6px 20px ${colorTheme}60`,
          },
        }}
      >
        <Image src={getBondDogeImagePath(expression)} alt={`Bond Doge - ${meta.name}`} fill style={{ objectFit: 'contain' }} priority />
      </Box>

      {/* Optional Label */}
      {showLabel && (
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            color: colorTheme,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          {meta.name}
        </Typography>
      )}
    </Box>
  );
}
