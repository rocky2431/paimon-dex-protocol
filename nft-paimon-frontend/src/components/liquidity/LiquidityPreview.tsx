'use client';

import { Box, Typography, Stack, LinearProgress } from '@mui/material';
import { LiquidityPreview as LiquidityPreviewType } from './types';
import { LIQUIDITY_DESIGN_TOKENS, ANIMATION_CONFIG } from './constants';

/**
 * LiquidityPreview Component Props
 */
interface LiquidityPreviewProps {
  /** Liquidity preview data */
  preview: LiquidityPreviewType | null;
  /** Token0 symbol */
  token0Symbol: string;
  /** Token1 symbol */
  token1Symbol: string;
}

/**
 * LiquidityPreview Component
 * OlympusDAO-inspired liquidity preview panel
 *
 * Features:
 * - Expected LP tokens display
 * - Pool share percentage with progress bar
 * - Price ratios (both directions)
 * - Minimum amounts (slippage protection)
 * - Orange gradient background
 * - Glassmorphism effects
 */
export const LiquidityPreview: React.FC<LiquidityPreviewProps> = ({
  preview,
  token0Symbol,
  token1Symbol,
}) => {
  if (!preview) return null;

  return (
    <Box
      sx={{
        borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_LARGE,
        padding: 4,
        background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
        boxShadow: LIQUIDITY_DESIGN_TOKENS.SHADOW_BUTTON,
        position: 'relative',
        overflow: 'hidden',
        transition: `all ${ANIMATION_CONFIG.DURATION_NORMAL} ${ANIMATION_CONFIG.EASE_OUT_EXPO}`,

        // Shimmer effect on hover
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
          transition: `left ${ANIMATION_CONFIG.DURATION_SLOW} ${ANIMATION_CONFIG.EASE_OUT_EXPO}`,
        },

        '&:hover::before': {
          left: '100%',
        },
      }}
    >
      {/* Title */}
      <Typography
        variant="h6"
        component="h3"
        fontWeight={700}
        color="#FFFFFF"
        sx={{ mb: 3, fontSize: '1.125rem' }}
      >
        Liquidity Preview
      </Typography>

      {/* LP Tokens Expected */}
      <Box
        sx={{
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_MEDIUM,
          padding: 2,
          backdropFilter: 'blur(8px)',
          mb: 2,
        }}
      >
        <Typography variant="caption" color="rgba(255, 255, 255, 0.8)" sx={{ fontSize: '0.75rem' }}>
          LP Tokens to Receive
        </Typography>
        <Typography variant="h5" fontWeight={700} color="#FFFFFF" sx={{ mt: 0.5 }}>
          {preview.lpTokensFormatted}
        </Typography>
      </Box>

      {/* Pool Share */}
      <Box
        sx={{
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_MEDIUM,
          padding: 2,
          backdropFilter: 'blur(8px)',
          mb: 3,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="caption" color="rgba(255, 255, 255, 0.8)" sx={{ fontSize: '0.75rem' }}>
            Your Share of Pool
          </Typography>
          <Typography variant="body2" fontWeight={700} color="#FFFFFF">
            {preview.shareOfPool.toFixed(4)}%
          </Typography>
        </Stack>

        <LinearProgress
          variant="determinate"
          value={Math.min(preview.shareOfPool, 100)}
          sx={{
            height: 12,
            borderRadius: '100px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            '& .MuiLinearProgress-bar': {
              borderRadius: '100px',
              background: 'linear-gradient(90deg, #FFFFFF 0%, #FFE0B2 100%)',
            },
          }}
        />
      </Box>

      {/* Price Ratios */}
      <Stack spacing={1.5}>
        <Box
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_MEDIUM,
            padding: 1.5,
            backdropFilter: 'blur(4px)',
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="rgba(255, 255, 255, 0.8)" sx={{ fontSize: '0.75rem' }}>
              1 {token0Symbol} =
            </Typography>
            <Typography variant="body2" fontWeight={700} color="#FFFFFF">
              {preview.priceToken0} {token1Symbol}
            </Typography>
          </Stack>
        </Box>

        <Box
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_MEDIUM,
            padding: 1.5,
            backdropFilter: 'blur(4px)',
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="rgba(255, 255, 255, 0.8)" sx={{ fontSize: '0.75rem' }}>
              1 {token1Symbol} =
            </Typography>
            <Typography variant="body2" fontWeight={700} color="#FFFFFF">
              {preview.priceToken1} {token0Symbol}
            </Typography>
          </Stack>
        </Box>
      </Stack>

      {/* Helper text */}
      <Typography
        variant="caption"
        color="rgba(255, 255, 255, 0.7)"
        sx={{
          display: 'block',
          mt: 2,
          fontSize: '0.6875rem',
          textAlign: 'center',
        }}
      >
        Output is estimated. You will receive at least {preview.amountAMin.toString()} {token0Symbol} and{' '}
        {preview.amountBMin.toString()} {token1Symbol} or the transaction will revert.
      </Typography>
    </Box>
  );
};
