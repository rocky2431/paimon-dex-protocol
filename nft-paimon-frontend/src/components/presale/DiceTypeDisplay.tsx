'use client';

import { Box, Chip, Typography } from '@mui/material';
import { Casino, Stars, Diamond } from '@mui/icons-material';

export type DiceType = 'NORMAL' | 'GOLD' | 'DIAMOND';

interface DiceTypeDisplayProps {
  type: DiceType;
}

/**
 * Dice Type Display Component
 * Shows current dice type with icon and color (warm colors only)
 */
export function DiceTypeDisplay({ type }: DiceTypeDisplayProps) {
  const getTypeConfig = () => {
    switch (type) {
      case 'NORMAL':
        return {
          label: 'Normal Dice',
          icon: <Casino />,
          color: '#FF8C00', // Orange
          range: '1-6',
          description: 'Basic dice roll',
        };
      case 'GOLD':
        return {
          label: 'Gold Dice',
          icon: <Stars />,
          color: '#FFD700', // Gold
          range: '1-12',
          description: 'Enhanced dice roll',
        };
      case 'DIAMOND':
        return {
          label: 'Diamond Dice',
          icon: <Diamond />,
          color: '#DC143C', // Crimson
          range: '1-20',
          description: 'Premium dice roll',
        };
    }
  };

  const config = getTypeConfig();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        p: 2,
        borderRadius: '12px',
        background: 'rgba(255, 255, 255, 0.9)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }}
    >
      <Chip
        icon={config.icon}
        label={config.label}
        sx={{
          backgroundColor: config.color,
          color: '#fff',
          fontWeight: 'bold',
          fontSize: '16px',
          px: 2,
          py: 3,
        }}
      />
      <Typography variant="body2" color="text.secondary">
        Range: {config.range}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {config.description}
      </Typography>
    </Box>
  );
}
