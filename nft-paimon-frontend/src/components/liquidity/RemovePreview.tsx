'use client';

import { Box, Typography, Stack, Divider } from '@mui/material';
import { RemoveLiquidityPreview } from './types';
import { LIQUIDITY_DESIGN_TOKENS, ANIMATION_CONFIG } from './constants';

/**
 * RemovePreview Component Props
 */
interface RemovePreviewProps {
  /** Remove liquidity preview data */
  preview: RemoveLiquidityPreview;
  /** Token0 symbol */
  token0Symbol: string;
  /** Token1 symbol */
  token1Symbol: string;
}

/**
 * RemovePreview Component
 * OlympusDAO-inspired liquidity removal preview
 *
 * Features:
 * - Display tokens to receive
 * - Price ratios
 * - Remaining pool share
 * - Glassmorphism effects
 * - Orange gradient accents
 */
export const RemovePreview: React.FC<RemovePreviewProps> = ({
  preview,
  token0Symbol,
  token1Symbol,
}) => {
  return (
    <Box
      sx={{
        borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_LARGE,
        padding: 3,
        backgroundColor: 'background.paper',
        boxShadow: LIQUIDITY_DESIGN_TOKENS.SHADOW_CARD,
        border: '2px solid',
        borderColor: 'rgba(255, 152, 0, 0.1)',
        transition: `all ${ANIMATION_CONFIG.DURATION_NORMAL} ${ANIMATION_CONFIG.EASE_OUT_EXPO}`,

        '&:hover': {
          borderColor: 'rgba(255, 152, 0, 0.3)',
          boxShadow: LIQUIDITY_DESIGN_TOKENS.SHADOW_CARD_HOVER,
        },
      }}
    >
      {/* Header */}
      <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mb: 3 }}>
        You Will Receive
      </Typography>

      {/* Token amounts */}
      <Stack spacing={2.5}>
        {/* Token0 */}
        <Box
          sx={{
            p: 2.5,
            borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_MEDIUM,
            background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.05) 0%, rgba(245, 124, 0, 0.08) 100%)',
            border: '1px solid rgba(255, 152, 0, 0.15)',
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary" fontWeight={600}>
              {token0Symbol}
            </Typography>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h6" fontWeight={700} color="text.primary">
                {preview.amount0Formatted}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Min: {parseFloat(preview.amount0Formatted) * 0.995}
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Token1 */}
        <Box
          sx={{
            p: 2.5,
            borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_MEDIUM,
            background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.05) 0%, rgba(245, 124, 0, 0.08) 100%)',
            border: '1px solid rgba(255, 152, 0, 0.15)',
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary" fontWeight={600}>
              {token1Symbol}
            </Typography>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h6" fontWeight={700} color="text.primary">
                {preview.amount1Formatted}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Min: {parseFloat(preview.amount1Formatted) * 0.995}
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Stack>

      <Divider sx={{ my: 3, borderColor: 'rgba(255, 152, 0, 0.1)' }} />

      {/* Price ratios */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block', fontSize: '0.75rem' }}>
          Price Ratios
        </Typography>

        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              1 {token0Symbol} =
            </Typography>
            <Typography variant="body2" fontWeight={600} color="text.primary">
              {preview.priceToken0} {token1Symbol}
            </Typography>
          </Stack>

          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              1 {token1Symbol} =
            </Typography>
            <Typography variant="body2" fontWeight={600} color="text.primary">
              {preview.priceToken1} {token0Symbol}
            </Typography>
          </Stack>
        </Stack>
      </Box>

      {/* Remaining pool share */}
      <Box
        sx={{
          p: 2,
          borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_MEDIUM,
          backgroundColor: 'background.elevated',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            Remaining Pool Share
          </Typography>
          <Typography
            variant="body2"
            fontWeight={700}
            sx={{
              background: 'linear-gradient(90deg, #FF9800 0%, #F57C00 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {preview.remainingShare.toFixed(4)}%
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
};
