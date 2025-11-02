'use client';

import { Card, Typography, Box, Snackbar, Alert, Chip } from '@mui/material';
import { TokenInput } from './TokenInput';
import { SwitchButton } from './SwitchButton';
import { SwapDetails } from './SwapDetails';
import { SwapButton } from './SwapButton';
import { usePSMSwap } from './hooks/usePSMSwap';
import { SwapState, Token } from './types';
import { DESIGN_TOKENS, ANIMATION_CONFIG, MESSAGES } from './constants';
import { useState, useEffect } from 'react';

/**
 * PSMSwapCard Component
 * Dedicated USDC ↔ USDP 1:1 swap interface via PSM contract
 *
 * Features:
 * - 1:1 exchange rate with 0.1% fee
 * - Prominent PSM badge
 * - Only supports USDC ↔ USDP swaps
 * - Fee display
 */
export const PSMSwapCard: React.FC = () => {
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
  } = usePSMSwap();

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
        {/* Card title with PSM badge */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
          <Typography
            variant="h5"
            component="h2"
            fontWeight={700}
            color="text.primary"
            sx={{ fontSize: '1.5rem' }}
          >
            PSM Swap
          </Typography>
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
        </Box>

        {/* Input token (USDC or USDP) */}
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
        />

        {/* Switch button */}
        <SwitchButton onClick={handleSwitchTokens} />

        {/* Output token (USDP or USDC) */}
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
        />

        {/* Swap details (fee, price) */}
        <SwapDetails
          calculation={calculation}
          isLoading={swapState === SwapState.SWAPPING}
        />

        {/* PSM Info Box */}
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
