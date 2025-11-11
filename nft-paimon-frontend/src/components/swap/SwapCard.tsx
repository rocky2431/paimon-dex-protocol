'use client';

import { Card, Typography, Box, Snackbar, Alert, Chip } from '@mui/material';
import { TokenInput } from './TokenInput';
import { SwitchButton } from './SwitchButton';
import { SwapDetails } from './SwapDetails';
import { SwapButton } from './SwapButton';
import { RouteDisplay } from './RouteDisplay';
import { useAMM } from './hooks/useAMM';
import { usePSMSwap } from './hooks/usePSMSwap';
import { SwapState, Token } from './types';
import { DESIGN_TOKENS, ANIMATION_CONFIG, MESSAGES } from './constants';
import { useState, useEffect, useMemo } from 'react';
import { config } from '@/config';

/**
 * SwapCard Component
 * OlympusDAO-inspired swap interface with PSM/AMM auto-detection
 *
 * Features:
 * - Large card with 24px border radius
 * - Hover lift effect
 * - 48px internal padding (luxury spacing)
 * - Maximum width 480px
 * - Centered on page
 * - Automatic PSM/AMM mode detection based on token pair
 *
 * Mode Detection:
 * - PSM Mode: USDC ↔ USDP (1:1 swap with 0.1% fee)
 * - AMM Mode: All other pairs (DEX Router with slippage)
 */
export const SwapCard: React.FC = () => {
  // Detect PSM mode: USDC ↔ USDP only
  const [formData, setFormData] = useState({
    inputAmount: '',
    outputAmount: '',
    inputToken: Token.USDC,
    outputToken: Token.USDP,
  });

  const isPSMMode = useMemo(() => {
    return (
      (formData.inputToken === Token.USDC && formData.outputToken === Token.USDP) ||
      (formData.inputToken === Token.USDP && formData.outputToken === Token.USDC)
    );
  }, [formData.inputToken, formData.outputToken]);

  // Use appropriate hook based on mode
  const psmHook = usePSMSwap();
  const ammHook = useAMM();

  const {
    formData: hookFormData,
    setFormData: hookSetFormData,
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
    route, // AMM-specific: swap route for visualization
  } = isPSMMode ? psmHook : ammHook;

  // Sync form data between component and hook
  useEffect(() => {
    if (
      hookFormData.inputToken !== formData.inputToken ||
      hookFormData.outputToken !== formData.outputToken
    ) {
      hookSetFormData(formData);
    }
  }, [formData, hookFormData, hookSetFormData]);

  // Create token address-to-symbol mapping for RouteDisplay (AMM mode)
  const tokenMap = useMemo(() => {
    const map: Record<string, string> = {};

    // Add all configured tokens (USDC, USDP, WBNB, HYD, etc.)
    Object.values(config.tokenConfig).forEach((token) => {
      map[token.address.toLowerCase()] = token.symbol;
    });

    return map;
  }, []);

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

  return (
    <>
      <Card
        data-testid="swap-card"
        sx={{
          maxWidth: 480,
          margin: '0 auto',
          borderRadius: DESIGN_TOKENS.RADIUS_LARGE, // 24px
          padding: 6, // 48px (luxury spacing)
          backgroundColor: 'background.paper',
          boxShadow: DESIGN_TOKENS.SHADOW_CARD,
          transition: `all ${ANIMATION_CONFIG.DURATION_NORMAL} ${ANIMATION_CONFIG.EASE_OUT_EXPO}`,

          '&:hover': {
            transform: 'translateY(-4px)', // Card lift on hover
            boxShadow: DESIGN_TOKENS.SHADOW_CARD_HOVER,
          },
        }}
      >
        {/* Card title with mode indicator */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <Typography
            variant="h5"
            component="h2"
            fontWeight={700}
            color="text.primary"
            sx={{ fontSize: '1.5rem' }}
          >
            {isPSMMode ? 'PSM Swap' : 'Swap'}
          </Typography>
          {isPSMMode && (
            <Chip
              label="1:1"
              sx={{
                backgroundColor: '#FF9800',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.875rem',
                borderRadius: DESIGN_TOKENS.RADIUS_PILL,
                px: 2,
              }}
            />
          )}
        </Box>

        {/* Input token */}
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

        {/* Switch button */}
        <SwitchButton onClick={handleSwitchTokens} />

        {/* Output token */}
        <TokenInput
          label="To"
          amount={formData.outputAmount}
          onAmountChange={() => {}} // Read-only
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

        {/* Swap details (fee, price) */}
        <SwapDetails
          calculation={calculation}
          isLoading={swapState === SwapState.SWAPPING}
        />

        {/* PSM Info Box (only shown in PSM mode) */}
        {isPSMMode && (
          <Box
            sx={{
              mt: 3,
              p: 2,
              borderRadius: DESIGN_TOKENS.RADIUS_MEDIUM,
              backgroundColor: 'rgba(255, 152, 0, 0.1)',
              border: '1px solid rgba(255, 152, 0, 0.3)',
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: '0.875rem', lineHeight: 1.6 }}
            >
              💡 <strong>PSM (Peg Stability Module):</strong> 1:1 swap between USDC and USDP with only 0.1% fee. No slippage, no price impact.
            </Typography>
          </Box>
        )}

        {/* Route Display (only shown in AMM mode) */}
        {!isPSMMode && route && (
          <Box sx={{ mt: 3 }}>
            <RouteDisplay route={route} tokenMap={tokenMap} />
          </Box>
        )}

        {/* Swap button */}
        <Box sx={{ mt: 4 }}>
          <SwapButton
            state={swapState}
            onClick={handleSwap}
            disabled={!validation.isValid}
            errorMessage={validation.error}
          />
        </Box>

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
      </Card>

      {/* Toast notification (OlympusDAO pill shape) */}
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
            borderRadius: DESIGN_TOKENS.RADIUS_PILL, // Pill shape
            px: 4,
            py: 1.5,
            fontSize: '1rem',
            fontWeight: 600,
            backgroundColor:
              toastSeverity === 'success' ? '#FF9800' : '#D84315',
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
