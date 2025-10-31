'use client';

import { Box, Typography, LinearProgress, Chip } from '@mui/material';
import { TrendingUp as TrendingUpIcon } from '@mui/icons-material';
import { RarityTier, RARITY_COLORS, RARITY_THRESHOLDS, getNextRarityTier } from '@/types/bond';

interface RemintProgressProps {
  remintAmount: number;
  currentTier: RarityTier;
  progress: number; // 0-100%
}

/**
 * RemintProgress Component
 * Display Remint progress towards next rarity tier
 *
 * Features:
 * - Current tier badge
 * - Progress bar to next tier
 * - Amount display
 * - Tier-specific colors
 */
export function RemintProgress({ remintAmount, currentTier, progress }: RemintProgressProps) {
  const nextTier = getNextRarityTier(currentTier);
  const tierColor = RARITY_COLORS[currentTier];
  const nextThreshold = nextTier ? RARITY_THRESHOLDS[nextTier] : null;

  return (
    <Box>
      {/* Current Tier Badge */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Chip
          label={currentTier}
          size="small"
          sx={{
            backgroundColor: `${tierColor}20`,
            color: tierColor,
            fontWeight: 700,
            fontSize: '0.75rem',
            height: 24,
          }}
        />
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            color: tierColor,
          }}
        >
          {remintAmount.toFixed(2)} USDC
        </Typography>
      </Box>

      {/* Progress Bar */}
      {nextTier ? (
        <>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: `${tierColor}20`,
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                backgroundColor: tierColor,
              },
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontWeight: 600,
              }}
            >
              Next: {nextTier}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: tierColor,
                fontWeight: 700,
              }}
            >
              {nextThreshold ? `${(nextThreshold - remintAmount).toFixed(2)} USDC` : ''}
            </Typography>
          </Box>
        </>
      ) : (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1,
            backgroundColor: `${tierColor}10`,
            borderRadius: 1,
            border: `1px solid ${tierColor}30`,
          }}
        >
          <TrendingUpIcon sx={{ fontSize: 16, color: tierColor }} />
          <Typography
            variant="caption"
            sx={{
              color: tierColor,
              fontWeight: 700,
            }}
          >
            Maximum Tier Achieved!
          </Typography>
        </Box>
      )}
    </Box>
  );
}
