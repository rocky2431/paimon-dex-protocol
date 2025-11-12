'use client';

import { Card, Typography, Box, Stack, IconButton, Collapse } from '@mui/material';
import { useState } from 'react';
import SettingsIcon from '@mui/icons-material/Settings';
import { TokenPairSelector } from './TokenPairSelector';
import { TokenInputPair } from './TokenInputPair';
import { LiquidityPreview } from './LiquidityPreview';
import { AddLiquidityButton } from './AddLiquidityButton';
import { useAddLiquidity } from './hooks/useAddLiquidity';
import { LIQUIDITY_DESIGN_TOKENS, ANIMATION_CONFIG, SLIPPAGE_PRESETS } from './constants';

/**
 * SlippageSettings Component
 * Collapsible settings panel for slippage tolerance
 */
const SlippageSettings: React.FC<{
  slippageBps: number;
  onChange: (bps: number) => void;
}> = ({ slippageBps, onChange }) => {
  return (
    <Box
      sx={{
        mt: 2,
        p: 2,
        borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_MEDIUM,
        backgroundColor: 'background.elevated',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
        Slippage Tolerance
      </Typography>

      <Stack direction="row" spacing={1}>
        {SLIPPAGE_PRESETS.map((preset) => {
          const bps = preset * 100;
          const isActive = slippageBps === bps;

          return (
            <Box
              key={preset}
              onClick={() => onChange(bps)}
              sx={{
                flex: 1,
                py: 1,
                px: 2,
                borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_PILL,
                border: '2px solid',
                borderColor: isActive ? 'primary.main' : 'divider',
                backgroundColor: isActive ? 'rgba(255, 152, 0, 0.1)' : 'transparent',
                cursor: 'pointer',
                transition: `all ${ANIMATION_CONFIG.DURATION_NORMAL} ${ANIMATION_CONFIG.EASE_OUT_EXPO}`,
                textAlign: 'center',

                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'rgba(255, 152, 0, 0.05)',
                },
              }}
            >
              <Typography
                variant="body2"
                fontWeight={isActive ? 700 : 600}
                color={isActive ? 'primary.main' : 'text.secondary'}
              >
                {preset}%
              </Typography>
            </Box>
          );
        })}
      </Stack>

      <Typography variant="caption" color="text.disabled" sx={{ mt: 1.5, display: 'block', fontSize: '0.6875rem' }}>
        Your transaction will revert if the price changes unfavorably by more than this percentage.
      </Typography>
    </Box>
  );
};

/**
 * AddLiquidityCard Component
 * OlympusDAO-inspired main container for add liquidity functionality
 *
 * Features:
 * - Token pair selection (dynamic pool detection)
 * - Pool creation support (if pair doesn't exist)
 * - Dual token input (only shown if pool exists)
 * - Slippage settings (collapsible)
 * - Liquidity preview
 * - Add liquidity button
 * - State management via useAddLiquidity hook
 */
export const AddLiquidityCard: React.FC = () => {
  const {
    formData,
    handleTokenASelect,
    handleTokenBSelect,
    handleTokenAChange,
    handleSlippageChange,
    handleAction,
    preview,
    validation,
    poolExists,
    addLiquidityState,
    errorMessage,
  } = useAddLiquidity();

  const [showSettings, setShowSettings] = useState(false);

  return (
    <Box sx={{ maxWidth: 600, margin: '0 auto' }}>
      <Card
        sx={{
          borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_LARGE,
          padding: 6,
          backgroundColor: 'background.paper',
          boxShadow: LIQUIDITY_DESIGN_TOKENS.SHADOW_CARD,
          transition: `all ${ANIMATION_CONFIG.DURATION_NORMAL} ${ANIMATION_CONFIG.EASE_OUT_EXPO}`,

          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: LIQUIDITY_DESIGN_TOKENS.SHADOW_CARD_HOVER,
          },
        }}
      >
        {/* Card header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
          <Box>
            <Typography variant="h5" component="h2" fontWeight={700} color="text.primary" sx={{ fontSize: '1.5rem' }}>
              Add Liquidity
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.875rem' }}>
              Provide liquidity to earn trading fees
            </Typography>
          </Box>

          {/* Settings button */}
          <IconButton
            onClick={() => setShowSettings(!showSettings)}
            sx={{
              backgroundColor: showSettings ? 'rgba(255, 152, 0, 0.1)' : 'background.elevated',
              transition: `all ${ANIMATION_CONFIG.DURATION_NORMAL}`,

              '&:hover': {
                backgroundColor: 'rgba(255, 152, 0, 0.2)',
                transform: 'rotate(45deg)',
              },
            }}
          >
            <SettingsIcon sx={{ color: showSettings ? 'primary.main' : 'text.secondary' }} />
          </IconButton>
        </Stack>

        {/* Slippage settings (collapsible) */}
        <Collapse in={showSettings}>
          <SlippageSettings slippageBps={formData.slippageBps} onChange={handleSlippageChange} />
        </Collapse>

        {/* Token pair selector */}
        <Box sx={{ mb: 3 }}>
          <TokenPairSelector
            selectedTokenA={formData.selectedTokenA}
            selectedTokenB={formData.selectedTokenB}
            onTokenASelect={handleTokenASelect}
            onTokenBSelect={handleTokenBSelect}
            poolExists={poolExists || false}
            pool={formData.pool}
            disabled={false}
          />
        </Box>

        {/* Token input pair - only show if pool exists */}
        {poolExists && formData.pool && (
          <Box sx={{ mb: 3 }}>
            <TokenInputPair
              tokenA={formData.tokenA}
              tokenB={formData.tokenB}
              onTokenAChange={handleTokenAChange}
              disabled={false}
            />
          </Box>
        )}

        {/* Liquidity preview */}
        {preview && formData.pool && (
          <Box sx={{ mb: 3 }}>
            <LiquidityPreview
              preview={preview}
              token0Symbol={formData.pool.token0.symbol}
              token1Symbol={formData.pool.token1.symbol}
              token0Decimals={formData.pool.token0.decimals}
              token1Decimals={formData.pool.token1.decimals}
            />
          </Box>
        )}

        {/* Add liquidity button */}
        <AddLiquidityButton
          state={addLiquidityState}
          onClick={handleAction}
          disabled={!validation.isValid}
          errorMessage={validation.error}
        />

        {/* Validation error message */}
        {!validation.isValid && validation.error && (
          <Typography
            variant="caption"
            color="error"
            sx={{
              display: 'block',
              mt: 2,
              textAlign: 'center',
              fontSize: '0.875rem',
            }}
          >
            {validation.error}
          </Typography>
        )}

        {/* Helper text */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: 'block',
            mt: 2,
            textAlign: 'center',
            fontSize: '0.75rem',
          }}
        >
          By adding liquidity you&apos;ll earn {formData.pool?.apr || '0%'} APR from trading fees
        </Typography>
      </Card>
    </Box>
  );
};
