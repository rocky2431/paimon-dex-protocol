'use client';

import { Card, Typography, Box, Snackbar, Alert, Stack, Button as MuiButton } from '@mui/material';
import { GaugeCard } from './GaugeCard';
import { MyVotingPower } from './MyVotingPower';
import { EpochCountdown } from './EpochCountdown';
import { VoteButton } from './VoteButton';
import { useVoting } from './hooks/useVoting';
import { VotingState } from './types';
import { DESIGN_TOKENS, ANIMATION_CONFIG, VOTING_MESSAGES } from './constants';
import { useState, useEffect } from 'react';
import RefreshIcon from '@mui/icons-material/Refresh';

/**
 * VotingCard Component
 * OlympusDAO-inspired governance voting interface
 *
 * Features:
 * - Batch voting for multiple gauges
 * - Real-time voting power allocation
 * - Epoch countdown timer
 * - Reset functionality
 */
export const VotingCard: React.FC = () => {
  const {
    gauges,
    allocations,
    handleAllocationChange,
    handleResetAllocations,
    votingPower,
    validation,
    votingState,
    errorMessage,
    currentEpoch,
    handleSubmitVotes,
  } = useVoting();

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error'>('success');

  // Show toast on state changes
  useEffect(() => {
    if (votingState === VotingState.SUCCESS) {
      setToastMessage(VOTING_MESSAGES.VOTE_SUCCESS);
      setToastSeverity('success');
      setShowToast(true);
    } else if (votingState === VotingState.ERROR) {
      setToastMessage(errorMessage || VOTING_MESSAGES.VOTE_ERROR);
      setToastSeverity('error');
      setShowToast(true);
    }
  }, [votingState, errorMessage]);

  const handleCloseToast = () => {
    setShowToast(false);
  };

  // Count gauges with allocation > 0
  const gaugeCount = allocations.size;

  return (
    <>
      <Box sx={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Epoch Countdown - Full Width */}
        <Box sx={{ mb: 4 }}>
          <EpochCountdown
            epochNumber={currentEpoch.number}
            epochEndTime={currentEpoch.endTime}
          />
        </Box>

        {/* My Voting Power - Full Width */}
        {votingPower && (
          <Box sx={{ mb: 4 }}>
            <MyVotingPower votingPower={votingPower} />
          </Box>
        )}

        {/* Main Voting Card */}
        <Card
          sx={{
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
          {/* Card header with title and reset button */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 4 }}
          >
            <Box>
              <Typography
                variant="h5"
                component="h2"
                fontWeight={700}
                color="text.primary"
                sx={{ fontSize: '1.5rem' }}
              >
                Vote for Gauges
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5, fontSize: '0.875rem' }}
              >
                Allocate your voting power to direct PAIMON emissions
              </Typography>
            </Box>

            {/* Reset button */}
            {gaugeCount > 0 && (
              <MuiButton
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={handleResetAllocations}
                sx={{
                  borderRadius: DESIGN_TOKENS.RADIUS_PILL,
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  '&:hover': {
                    borderColor: 'primary.dark',
                    backgroundColor: 'background.elevated',
                  },
                }}
              >
                Reset
              </MuiButton>
            )}
          </Stack>

          {/* Gauge Cards List */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 4 }}>
            {gauges.map((gauge) => (
              <GaugeCard
                key={gauge.address}
                gauge={gauge}
                allocation={allocations.get(gauge.address) || 0}
                onAllocationChange={handleAllocationChange}
              />
            ))}
          </Box>

          {/* Vote Button */}
          <VoteButton
            state={votingState}
            onClick={handleSubmitVotes}
            disabled={!validation.isValid}
            errorMessage={validation.error}
            gaugeCount={gaugeCount}
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
            Your votes will be applied at the start of the next epoch
          </Typography>
        </Card>
      </Box>

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
