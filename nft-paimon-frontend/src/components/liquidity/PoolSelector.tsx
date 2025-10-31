'use client';

import { Box, Typography, MenuItem, Select, Stack, Chip } from '@mui/material';
import { LiquidityPool, PoolType } from './types';
import { LIQUIDITY_POOLS, LIQUIDITY_DESIGN_TOKENS, ANIMATION_CONFIG } from './constants';

/**
 * PoolSelector Component Props
 */
interface PoolSelectorProps {
  /** Currently selected pool */
  selectedPool: LiquidityPool | null;
  /** Callback when pool is selected */
  onPoolSelect: (pool: LiquidityPool) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
}

/**
 * PoolSelector Component
 * OlympusDAO-inspired pool selector dropdown
 *
 * Features:
 * - Dropdown list of available pools
 * - Pool type indicator (Stable/Volatile)
 * - APR and TVL display
 * - Orange gradient styling
 */
export const PoolSelector: React.FC<PoolSelectorProps> = ({
  selectedPool,
  onPoolSelect,
  disabled = false,
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
      <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mb: 2 }}>
        Select Liquidity Pool
      </Typography>

      {/* Pool selector dropdown */}
      <Select
        fullWidth
        value={selectedPool?.address || ''}
        onChange={(e) => {
          const pool = LIQUIDITY_POOLS.find((p) => p.address === e.target.value);
          if (pool) onPoolSelect(pool);
        }}
        disabled={disabled}
        displayEmpty
        sx={{
          borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_MEDIUM,
          backgroundColor: 'background.elevated',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255, 152, 0, 0.2)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'primary.main',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: 'primary.main',
            borderWidth: '2px',
          },
        }}
      >
        <MenuItem value="" disabled>
          <Typography color="text.disabled">Choose a pool...</Typography>
        </MenuItem>

        {LIQUIDITY_POOLS.map((pool) => (
          <MenuItem key={pool.address} value={pool.address}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
              {/* Pool name */}
              <Typography variant="body1" fontWeight={600} color="text.primary" sx={{ flexGrow: 1 }}>
                {pool.name}
              </Typography>

              {/* Pool type chip */}
              <Chip
                label={pool.type === PoolType.STABLE ? 'Stable' : 'Volatile'}
                size="small"
                sx={{
                  backgroundColor:
                    pool.type === PoolType.STABLE
                      ? 'rgba(6, 214, 160, 0.1)'
                      : 'rgba(255, 107, 53, 0.1)',
                  color: pool.type === PoolType.STABLE ? '#06d6a0' : '#ff6b35',
                  fontWeight: 700,
                  fontSize: '0.6875rem',
                }}
              />

              {/* APR */}
              <Typography variant="caption" color="primary" fontWeight={700}>
                APR: {pool.apr}
              </Typography>
            </Stack>
          </MenuItem>
        ))}
      </Select>

      {/* Selected pool details */}
      {selectedPool && (
        <Box
          sx={{
            mt: 2,
            pt: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack direction="row" justifyContent="space-between" spacing={2}>
            {/* TVL */}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Total Value Locked
              </Typography>
              <Typography variant="body2" fontWeight={700} color="text.primary">
                {selectedPool.tvl}
              </Typography>
            </Box>

            {/* APR */}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Annual Percentage Rate
              </Typography>
              <Typography variant="body2" fontWeight={700} color="primary.main">
                {selectedPool.apr}
              </Typography>
            </Box>

            {/* Pool type */}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Pool Type
              </Typography>
              <Typography variant="body2" fontWeight={700} color="text.primary">
                {selectedPool.type === PoolType.STABLE ? 'Stable (x³y+y³x=k)' : 'Volatile (xy=k)'}
              </Typography>
            </Box>
          </Stack>
        </Box>
      )}
    </Box>
  );
};
