'use client';

import { Box, Typography, Stack } from '@mui/material';
import { LIQUIDITY_DESIGN_TOKENS, ANIMATION_CONFIG } from './constants';

/**
 * LPTokenDisplay Component Props
 */
interface LPTokenDisplayProps {
  /** Total LP token balance */
  lpBalance: bigint;
  /** LP token balance (formatted) */
  lpBalanceFormatted: string;
  /** LP tokens to remove */
  lpTokens: bigint;
  /** LP tokens to remove (formatted) */
  lpTokensFormatted: string;
  /** Pool name (e.g., "USDP/USDC") */
  poolName: string;
  /** Current percentage selected */
  percentage: number;
}

/**
 * LPTokenDisplay Component
 * OlympusDAO-inspired LP token balance and removal preview
 *
 * Features:
 * - Display total LP balance
 * - Show selected amount to remove
 * - Orange gradient background
 * - Glassmorphism effects
 */
export const LPTokenDisplay: React.FC<LPTokenDisplayProps> = ({
  lpBalance,
  lpBalanceFormatted,
  lpTokens,
  lpTokensFormatted,
  poolName,
  percentage,
}) => {
  return (
    <Box
      sx={{
        borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_LARGE,
        padding: 3,
        background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.08) 0%, rgba(245, 124, 0, 0.12) 100%)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 152, 0, 0.2)',
        boxShadow: LIQUIDITY_DESIGN_TOKENS.SHADOW_CARD,
        transition: `all ${ANIMATION_CONFIG.DURATION_NORMAL} ${ANIMATION_CONFIG.EASE_OUT_EXPO}`,

        '&:hover': {
          borderColor: 'rgba(255, 152, 0, 0.4)',
          boxShadow: LIQUIDITY_DESIGN_TOKENS.SHADOW_CARD_HOVER,
        },
      }}
    >
      {/* Header */}
      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block', fontSize: '0.75rem' }}>
        Your LP Tokens
      </Typography>

      {/* Total balance */}
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" fontWeight={600}>
          Total Balance
        </Typography>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="h6" fontWeight={700} color="text.primary">
            {lpBalanceFormatted}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
            {poolName} LP
          </Typography>
        </Box>
      </Stack>

      {/* Divider */}
      <Box
        sx={{
          height: 1,
          background: 'linear-gradient(90deg, transparent 0%, rgba(255, 152, 0, 0.3) 50%, transparent 100%)',
          mb: 3,
        }}
      />

      {/* Amount to remove */}
      <Stack direction="row" justifyContent="space-between" alignItems="baseline">
        <Typography variant="body2" color="primary.main" fontWeight={700}>
          To Remove ({percentage}%)
        </Typography>
        <Box sx={{ textAlign: 'right' }}>
          <Typography
            variant="h5"
            fontWeight={700}
            sx={{
              background: 'linear-gradient(90deg, #FF9800 0%, #F57C00 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {lpTokensFormatted}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
            {poolName} LP
          </Typography>
        </Box>
      </Stack>

      {/* Info card */}
      <Box
        sx={{
          mt: 3,
          p: 2,
          borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_MEDIUM,
          backgroundColor: 'rgba(255, 152, 0, 0.05)',
          border: '1px solid rgba(255, 152, 0, 0.15)',
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6875rem', lineHeight: 1.5 }}>
          💡 Tip: Burning LP tokens will return the underlying token pair to your wallet proportionally.
        </Typography>
      </Box>
    </Box>
  );
};
