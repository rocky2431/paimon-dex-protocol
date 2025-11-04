'use client';

import { Card, Typography, Box, Snackbar, Alert } from '@mui/material';
import { LockAmountInput } from './LockAmountInput';
import { LockDurationSlider } from './LockDurationSlider';
import { VotingPowerPreview } from './VotingPowerPreview';
import { CreateLockButton } from './CreateLockButton';
import { useVeNFT } from './hooks/useVeNFT';
import { LockState } from './types';
import { DESIGN_TOKENS, ANIMATION_CONFIG, VENFT_MESSAGES } from './constants';
import { useState, useEffect } from 'react';

/**
 * VeNFTCard Component
 * OlympusDAO-inspired veNFT locking interface
 *
 * Features:
 * - Lock PAIMON for voting power
 * - Duration slider (1 week - 4 years)
 * - Real-time voting power calculation
 * - Visual feedback with dynamic gradients
 */
export const VeNFTCard: React.FC = () => {
  const {
    formData,
    hydBalance,
    calculation,
    validation,
    lockState,
    errorMessage,
    handleAmountChange,
    handleDurationChange,
    handleMaxClick,
    handleCreateLock,
  } = useVeNFT();

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error'>('success');

  // Show toast on state changes
  useEffect(() => {
    if (lockState === LockState.SUCCESS) {
      setToastMessage(VENFT_MESSAGES.LOCK_SUCCESS);
      setToastSeverity('success');
      setShowToast(true);
    } else if (lockState === LockState.ERROR) {
      setToastMessage(errorMessage || VENFT_MESSAGES.LOCK_ERROR);
      setToastSeverity('error');
      setShowToast(true);
    }
  }, [lockState, errorMessage]);

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
          sx={{ mb: 1, fontSize: '1.5rem' }}
        >
          Lock PAIMON for Voting Power
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 4, fontSize: '0.875rem' }}
        >
          Lock your PAIMON tokens to earn vePAIMON and participate in governance
        </Typography>

        {/* Lock amount input */}
        <LockAmountInput
          amount={formData.lockAmount}
          onAmountChange={handleAmountChange}
          balance={hydBalance}
          showMaxButton={true}
          onMaxClick={handleMaxClick}
        />

        {/* Lock duration slider */}
        <Box sx={{ mt: 4 }}>
          <LockDurationSlider
            duration={formData.lockDuration}
            onDurationChange={handleDurationChange}
          />
        </Box>

        {/* Voting power preview */}
        {calculation && (
          <Box sx={{ mt: 4 }}>
            <VotingPowerPreview
              calculation={calculation}
              isLoading={lockState === LockState.CREATING}
            />
          </Box>
        )}

        {/* Create lock button */}
        <Box sx={{ mt: 4 }}>
          <CreateLockButton
            state={lockState}
            onClick={handleCreateLock}
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
