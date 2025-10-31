'use client';

import { Card, Typography, Box, Snackbar, Alert } from '@mui/material';
import { TokenInput } from './TokenInput';
import { SwitchButton } from './SwitchButton';
import { SwapDetails } from './SwapDetails';
import { SwapButton } from './SwapButton';
import { useSwap } from './hooks/useSwap';
import { SwapState } from './types';
import { DESIGN_TOKENS, ANIMATION_CONFIG, MESSAGES } from './constants';
import { useState, useEffect } from 'react';

/**
 * SwapCard Component
 * OlympusDAO-inspired swap interface
 *
 * Features:
 * - Large card with 24px border radius
 * - Hover lift effect
 * - 48px internal padding (luxury spacing)
 * - Maximum width 480px
 * - Centered on page
 */
export const SwapCard: React.FC = () => {
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
  } = useSwap();

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
        {/* Card title */}
        <Typography
          variant="h5"
          component="h2"
          fontWeight={700}
          color="text.primary"
          sx={{ mb: 4, fontSize: '1.5rem' }}
        >
          Swap
        </Typography>

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
        />

        {/* Swap details (fee, price) */}
        <SwapDetails
          calculation={calculation}
          isLoading={swapState === SwapState.SWAPPING}
        />

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
