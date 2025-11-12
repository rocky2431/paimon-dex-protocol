'use client';

import { Grid, Card, Typography, Box, Chip, Button, Alert, Snackbar } from '@mui/material';
import { TokenInput } from './TokenInput';
import { SwitchButton } from './SwitchButton';
import { SwapDetails } from './SwapDetails';
import { SwapButton } from './SwapButton';
import { PriceChart } from './PriceChart';
import { useAMM } from './hooks/useAMM';
import { SwapState } from './types';
import { DESIGN_TOKENS, ANIMATION_CONFIG, MESSAGES } from './constants';
import { useState, useEffect, useMemo } from 'react';
import { config } from '@/config';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import InfoIcon from '@mui/icons-material/Info';
import type { Address } from 'viem';

/**
 * SwapWithInfo Component
 * ThenaSwap-style layout with state lifting for left-right synchronization
 *
 * Features:
 * - Left panel: Swap interface (From/To inputs, details, button)
 * - Right panel: Price chart + Route visualization
 * - Shared state via useAMM hook for real-time updates
 * - Unified styling (white Material-UI cards)
 */
export const SwapWithInfo: React.FC = () => {
  // Shared state via useAMM hook
  const {
    formData,
    setFormData,
    inputBalance,
    outputBalance,
    calculation,
    validation,
    swapState,
    errorMessage,
    handleInputAmountChange,
    handleSwitchTokens,
    handleMaxClick,
    handleSwap,
    route, // Dynamic route from blockchain query
    needsApproval, // AMM-specific: approval check
  } = useAMM();

  // Create token address-to-symbol mapping
  const tokenMap = useMemo(() => {
    const map: Record<string, string> = {};
    Object.values(config.tokenConfig).forEach((token) => {
      map[token.address.toLowerCase()] = token.symbol;
    });
    return map;
  }, []);

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error'>('success');

  // Show toast on state changes
  useEffect(() => {
    if (swapState === SwapState.SUCCESS) {
      setToastMessage(MESSAGES.SWAP_SUCCESS);
      setToastSeverity('success');
      setShowToast(true);
    } else if (swapState === SwapState.ERROR) {
      setToastMessage(errorMessage || MESSAGES.SWAP_ERROR);
      setToastSeverity('error');
      setShowToast(true);
    }
  }, [swapState, errorMessage]);

  const handleCloseToast = () => {
    setShowToast(false);
  };

  // Get token symbol from address
  const getTokenSymbol = (address: Address): string => {
    const symbol = tokenMap[address.toLowerCase()] || tokenMap[address];
    if (symbol) return symbol;
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  };

  // Calculate hop count
  const hopCount = route ? route.length - 1 : 0;
  const isDirect = hopCount === 1;

  return (
    <>
      <Grid container spacing={3}>
        {/* Left Panel: Swap Interface */}
        <Grid item xs={12} lg={5}>
          <Card
            sx={{
              borderRadius: DESIGN_TOKENS.RADIUS_LARGE,
              padding: 6,
              backgroundColor: 'background.paper',
              boxShadow: DESIGN_TOKENS.SHADOW_CARD,
              transition: `all ${ANIMATION_CONFIG.DURATION_NORMAL} ${ANIMATION_CONFIG.EASE_OUT_EXPO}`,
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: DESIGN_TOKENS.SHADOW_CARD_HOVER,
              },
            }}
          >
            {/* Card Title */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
              <Typography
                variant="h5"
                component="h2"
                fontWeight={700}
                color="text.primary"
                sx={{ fontSize: '1.5rem' }}
              >
                Swap
              </Typography>
            </Box>

            {/* Input Token */}
            <TokenInput
              label="From"
              amount={formData.inputAmount}
              onAmountChange={handleInputAmountChange}
              selectedToken={formData.inputToken}
              onTokenChange={(token) =>
                setFormData((prev) => ({ ...prev, inputToken: token }))
              }
              balance={inputBalance}
              excludeToken={formData.outputToken}
              showMaxButton={true}
              onMaxClick={handleMaxClick}
              data-testid-prefix="from"
            />

            {/* Switch Button */}
            <SwitchButton onClick={handleSwitchTokens} />

            {/* Output Token */}
            <TokenInput
              label="To"
              amount={formData.outputAmount}
              onAmountChange={() => {}}
              selectedToken={formData.outputToken}
              onTokenChange={(token) =>
                setFormData((prev) => ({ ...prev, outputToken: token }))
              }
              balance={outputBalance}
              readOnly={true}
              excludeToken={formData.inputToken}
              showMaxButton={false}
              data-testid-prefix="to"
            />

            {/* Swap Details */}
            <SwapDetails
              calculation={calculation}
              isLoading={swapState === SwapState.SWAPPING}
            />

            {/* Swap Button */}
            <Box sx={{ mt: 4 }}>
              <SwapButton
                state={swapState}
                onClick={handleSwap}
                disabled={!validation.isValid}
                errorMessage={validation.error}
                needsApproval={needsApproval}
                tokenSymbol={formData.inputToken}
              />
            </Box>

            {/* Validation Error */}
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
          </Card>
        </Grid>

        {/* Right Panel: Price Chart & Route Visualization */}
        <Grid item xs={12} lg={7}>
          <Card
            sx={{
              backgroundColor: 'background.paper',
              borderRadius: DESIGN_TOKENS.RADIUS_LARGE,
              p: 3,
              minHeight: 500,
              boxShadow: DESIGN_TOKENS.SHADOW_CARD,
            }}
          >
            {/* Price Header */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="h6" fontWeight={700} color="#ff6b00">
                  {formData.inputToken}/{formData.outputToken}
                </Typography>
                <Chip
                  label="+0.00%"
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(255, 152, 0, 0.2)',
                    color: '#FF9800',
                    fontWeight: 600,
                  }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {new Date().toLocaleString('zh-CN')}
              </Typography>
            </Box>

            {/* Price Chart */}
            <Box sx={{ mb: 3 }}>
              <PriceChart
                pair={`${formData.inputToken}/${formData.outputToken}`}
                height={280}
              />
            </Box>

            {/* Route Visualization */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} color="#ff6b00">
                  兑换路由
                </Typography>
                <Button
                  size="small"
                  startIcon={<TrendingUpIcon />}
                  onClick={() => handleInputAmountChange(formData.inputAmount)}
                  sx={{
                    color: '#FF9800',
                    fontSize: '0.75rem',
                    textTransform: 'none',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    },
                  }}
                >
                  刷新报价
                </Button>
              </Box>

              {/* Route Path */}
              {route && route.length > 0 ? (
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: 'rgba(255, 107, 0, 0.05)',
                    border: '1px solid rgba(255, 107, 0, 0.2)',
                    mb: 2,
                  }}
                >
                  {/* Exchange Rate */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="body2" fontWeight={600}>
                      1 {formData.inputToken}
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="primary">
                      ≈ {calculation ? (Number(calculation.outputAmount) / Number(calculation.inputAmount)).toFixed(4) : '0.00'} {formData.outputToken}
                    </Typography>
                  </Box>

                  {/* Horizontal Route Bar */}
                  <Box sx={{ position: 'relative', height: 60 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        height: 40,
                        borderRadius: 2,
                        overflow: 'hidden',
                        mb: 1,
                      }}
                    >
                      {route.map((tokenAddress, index) => (
                        <Box
                          key={`${tokenAddress}-${index}`}
                          sx={{
                            flex: index === 0 || index === route.length - 1 ? '0 0 45%' : '0 0 10%',
                            background: index === 0 || index === route.length - 1
                              ? `linear-gradient(90deg, ${index === 0 ? '#FF6B00' : '#FF9800'} 0%, ${index === 0 ? '#FF9800' : '#FFB74D'} 100%)`
                              : 'rgba(255, 107, 0, 0.6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Typography
                            variant="caption"
                            fontWeight={600}
                            color="white"
                            fontSize={index === 0 || index === route.length - 1 ? '0.875rem' : '0.65rem'}
                          >
                            {getTokenSymbol(tokenAddress)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>

                    {/* Pool Names */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
                      <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
                        • Paimon DEX
                      </Typography>
                      {!isDirect && (
                        <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
                          • Wrapped BNB
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              ) : (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  No route available. Please enter an amount.
                </Alert>
              )}

              {/* Route Stats */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ flex: 1, p: 1.5, borderRadius: 1, backgroundColor: 'rgba(255, 107, 0, 0.05)' }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    交易对数
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {isDirect ? 'Direct' : `${hopCount} hops`}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, p: 1.5, borderRadius: 1, backgroundColor: 'rgba(255, 107, 0, 0.05)' }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    预计滑点
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    0.5%
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Card>

          {/* Info Alert */}
          <Alert severity="info" icon={<InfoIcon />} sx={{ mt: 2 }}>
            For USDC ↔ USDP 1:1 swap (0.1% fee), visit USDP Hub → PSM Tab
          </Alert>
        </Grid>
      </Grid>

      {/* Toast Notification */}
      <Snackbar
        open={showToast}
        autoHideDuration={6000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseToast}
          severity={toastSeverity}
          sx={{
            borderRadius: DESIGN_TOKENS.RADIUS_PILL,
            px: 4,
            py: 1.5,
            fontSize: '1rem',
            fontWeight: 600,
            backgroundColor: toastSeverity === 'success' ? '#FF9800' : '#D84315',
            color: '#FFFFFF',
            boxShadow: DESIGN_TOKENS.SHADOW_BUTTON,
            '& .MuiAlert-icon': {
              color: '#FFFFFF',
            },
          }}
        >
          {toastMessage}
        </Alert>
      </Snackbar>
    </>
  );
};
