'use client';

import { Box, keyframes } from '@mui/material';
import { useState, useEffect } from 'react';

/**
 * Dice Type: Normal (1-6), Gold (1-12), Diamond (1-20)
 */
export type DiceType = 'NORMAL' | 'GOLD' | 'DIAMOND';

interface DiceAnimationProps {
  type: DiceType;
  result?: number;
  isRolling: boolean;
}

// Clean rotation animation - simple and professional
const rollAnimation = keyframes`
  0% {
    transform: rotateY(0deg);
  }
  100% {
    transform: rotateY(360deg);
  }
`;

/**
 * Dice Animation Component
 * Clean rotation without excessive effects
 */
export function DiceAnimation({ type, result, isRolling }: DiceAnimationProps) {
  const [displayNumber, setDisplayNumber] = useState(1);

  // Update display number when rolling stops
  useEffect(() => {
    if (!isRolling && result) {
      setDisplayNumber(result);
    }
  }, [isRolling, result]);

  // Get dice color based on type (warm colors only)
  const getDiceColor = () => {
    switch (type) {
      case 'NORMAL':
        return 'linear-gradient(135deg, #FF8C00 0%, #FF6347 100%)'; // Orange to Tomato
      case 'GOLD':
        return 'linear-gradient(135deg, #FFD700 0%, #FF8C00 100%)'; // Gold to Orange
      case 'DIAMOND':
        return 'linear-gradient(135deg, #FF6347 0%, #DC143C 100%)'; // Tomato to Crimson
      default:
        return 'linear-gradient(135deg, #FF8C00 0%, #FF6347 100%)';
    }
  };

  // Get max value for dice type
  const getMaxValue = () => {
    switch (type) {
      case 'NORMAL':
        return 6;
      case 'GOLD':
        return 12;
      case 'DIAMOND':
        return 20;
      default:
        return 6;
    }
  };

  return (
    <Box
      sx={{
        perspective: '1000px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '300px',
      }}
    >
      <Box
        sx={{
          width: '150px',
          height: '150px',
          position: 'relative',
          transformStyle: 'preserve-3d',
          animation: isRolling ? `${rollAnimation} 1s linear infinite` : 'none',
          transition: 'transform 0.5s ease',
        }}
      >
        {/* Dice Face */}
        <Box
          sx={{
            width: '100%',
            height: '100%',
            background: getDiceColor(),
            borderRadius: '15px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '64px',
            fontWeight: 'bold',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          {isRolling ? '?' : displayNumber}
        </Box>
      </Box>

      {/* Dice Type Label */}
      <Box
        sx={{
          position: 'absolute',
          bottom: -40,
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#666',
          textAlign: 'center',
        }}
      >
        {type} (1-{getMaxValue()})
      </Box>
    </Box>
  );
}
