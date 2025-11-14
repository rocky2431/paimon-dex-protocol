'use client';

import { Box, Typography, Stack, Alert, Chip, Divider } from '@mui/material';
import { TokenSelector } from './TokenSelector';
import { Token, LiquidityPool } from './types';
import { LIQUIDITY_DESIGN_TOKENS, ANIMATION_CONFIG } from './constants';

/**
 * TokenPairSelector Component Props
 */
interface TokenPairSelectorProps {
  /** Currently selected token A */
  selectedTokenA: Token | null;
  /** Currently selected token B */
  selectedTokenB: Token | null;
  /** Callback when token A is selected */
  onTokenASelect: (token: Token) => void;
  /** Callback when token B is selected */
  onTokenBSelect: (token: Token) => void;
  /** Whether the pool exists (has reserves > 0) for this token pair */
  poolExists: boolean;
  /** Whether the pair address exists (even if reserves = 0) */
  pairAddressExists: boolean;
  /** Pool information (if exists) */
  pool: LiquidityPool | null;
  /** Whether the component is disabled */
  disabled?: boolean;
}

/**
 * TokenPairSelector Component
 * Replaces PoolSelector with dynamic token pair selection
 *
 * Features:
 * - Two independent token selectors
 * - Automatic pool detection via Factory.getPair()
 * - Pool status display (exists/doesn't exist)
 * - Pool information display (reserves, TVL, APR) when pool exists
 * - Warning message when pool doesn't exist
 */
export const TokenPairSelector: React.FC<TokenPairSelectorProps> = ({
  selectedTokenA,
  selectedTokenB,
  onTokenASelect,
  onTokenBSelect,
  poolExists,
  pairAddressExists,
  pool,
  disabled = false,
}) => {
  const bothTokensSelected = !!selectedTokenA && !!selectedTokenB;

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
        Select Token Pair
      </Typography>

      {/* Token Selectors */}
      <Stack spacing={2.5}>
        <TokenSelector
          label="Token A"
          selectedToken={selectedTokenA}
          onTokenSelect={onTokenASelect}
          excludeToken={selectedTokenB}
          disabled={disabled}
        />

        <TokenSelector
          label="Token B"
          selectedToken={selectedTokenB}
          onTokenSelect={onTokenBSelect}
          excludeToken={selectedTokenA}
          disabled={disabled}
        />
      </Stack>

      {/* Pool Status Section */}
      {bothTokensSelected && (
        <Box sx={{ mt: 3 }}>
          <Divider sx={{ mb: 2 }} />

          {/* Pool Exists - Show Info */}
          {poolExists && pool && (
            <Box>
              <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                Pool Information
              </Typography>

              <Stack spacing={2}>
                {/* Pool Name & Type */}
                <Stack direction="row" spacing={2} alignItems="center">
                  <Typography variant="body1" fontWeight={700} color="text.primary">
                    {pool.name}
                  </Typography>
                  <Chip
                    label={pool.type === 'stable' ? 'Stable' : 'Volatile'}
                    size="small"
                    sx={{
                      backgroundColor:
                        pool.type === 'stable'
                          ? 'rgba(6, 214, 160, 0.1)'
                          : 'rgba(255, 107, 53, 0.1)',
                      color: pool.type === 'stable' ? '#06d6a0' : '#ff6b35',
                      fontWeight: 700,
                      fontSize: '0.6875rem',
                    }}
                  />
                </Stack>

                {/* TVL & APR */}
                <Stack direction="row" justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      Total Value Locked
                    </Typography>
                    <Typography variant="body2" fontWeight={700} color="text.primary">
                      {pool.tvl || 'N/A'}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      APR
                    </Typography>
                    <Typography variant="body2" fontWeight={700} color="primary.main">
                      {pool.apr || 'N/A'}
                    </Typography>
                  </Box>
                </Stack>

                {/* Reserves */}
                {pool.reserve0 && pool.reserve1 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.5, display: 'block' }}>
                      Reserves
                    </Typography>
                    <Stack direction="row" spacing={2}>
                      <Typography variant="caption" color="text.primary">
                        {pool.token0.symbol}: {(Number(pool.reserve0) / 10 ** pool.token0.decimals).toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">•</Typography>
                      <Typography variant="caption" color="text.primary">
                        {pool.token1.symbol}: {(Number(pool.reserve1) / 10 ** pool.token1.decimals).toLocaleString()}
                      </Typography>
                    </Stack>
                  </Box>
                )}
              </Stack>
            </Box>
          )}

          {/* Pool Doesn't Exist - Show Warning (only when pair address truly doesn't exist) */}
          {!pairAddressExists && (
            <Alert
              severity="warning"
              sx={{
                borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_MEDIUM,
                backgroundColor: 'rgba(255, 152, 0, 0.1)',
                border: '1px solid rgba(255, 152, 0, 0.3)',
                '& .MuiAlert-icon': {
                  color: 'primary.main',
                },
              }}
            >
              <Typography variant="body2" fontWeight={600} color="text.primary">
                Pool does not exist
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                This token pair has no liquidity pool yet. You'll need to create it first by clicking the "Create Pool" button below.
              </Typography>
            </Alert>
          )}
        </Box>
      )}

      {/* No Tokens Selected - Show Hint */}
      {!bothTokensSelected && (
        <Box sx={{ mt: 3 }}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
            Select both tokens to check pool status
          </Typography>
        </Box>
      )}
    </Box>
  );
};
