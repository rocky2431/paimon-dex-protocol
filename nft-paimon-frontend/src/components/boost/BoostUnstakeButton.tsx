'use client';

import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import {
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { BoostUnstakeButtonProps } from './types';
import { BOOST_DESIGN_TOKENS } from './constants';

/**
 * BoostUnstakeButton Component
 * Button to unstake PAIMON tokens with confirmation dialog
 *
 * Features:
 * - Locked/unlocked state visualization
 * - Confirmation dialog with consequences
 * - Error handling
 * - Double-click prevention
 * - Material Design 3 styling
 */
export function BoostUnstakeButton({
  canUnstake,
  stakedAmount,
  onUnstake,
  unstaking = false,
}: BoostUnstakeButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string>('');

  const stakedNum = parseFloat(stakedAmount) || 0;
  const isDisabled = !canUnstake || stakedNum === 0 || unstaking;

  // Handle unstake button click
  const handleUnstakeClick = () => {
    setConfirmOpen(true);
    setError('');
  };

  // Handle confirm unstake
  const handleConfirmUnstake = async () => {
    try {
      setError('');
      await onUnstake();
      setConfirmOpen(false);
      // Success - parent will update state
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setConfirmOpen(false);
    setError('');
  };

  return (
    <>
      {/* Unstake Button */}
      <Button
        variant={canUnstake ? 'contained' : 'outlined'}
        onClick={handleUnstakeClick}
        disabled={isDisabled}
        startIcon={canUnstake ? <LockOpenIcon /> : <LockIcon />}
        sx={{
          textTransform: 'none',
          fontWeight: 700,
          ...(canUnstake
            ? {
                backgroundColor: BOOST_DESIGN_TOKENS.COLOR_WARNING,
                color: '#fff',
                '&:hover': {
                  backgroundColor: '#FFA000',
                },
                '&:disabled': {
                  backgroundColor: 'rgba(0, 0, 0, 0.12)',
                },
              }
            : {
                borderColor: 'divider',
                color: 'text.disabled',
              }),
        }}
      >
        {unstaking ? 'Unstaking...' : canUnstake ? 'Unstake PAIMON' : 'Locked (7 days)'}
      </Button>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmOpen}
        onClose={unstaking ? undefined : handleCancel}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: BOOST_DESIGN_TOKENS.RADIUS_LARGE,
            border: `2px solid ${BOOST_DESIGN_TOKENS.COLOR_WARNING}`,
          },
        }}
      >
        {/* Title */}
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            backgroundColor: 'rgba(255, 179, 0, 0.05)',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <WarningIcon sx={{ fontSize: 28, color: BOOST_DESIGN_TOKENS.COLOR_WARNING }} />
          <Typography variant="h6" fontWeight={800}>
            Confirm Unstake
          </Typography>
        </DialogTitle>

        {/* Content */}
        <DialogContent sx={{ pt: 3 }}>
          {/* Warning Alert */}
          <Alert
            severity="warning"
            icon={<WarningIcon />}
            sx={{
              mb: 3,
              backgroundColor: 'rgba(255, 152, 0, 0.08)',
              border: '1px solid rgba(255, 152, 0, 0.2)',
            }}
          >
            <Typography variant="body2" fontWeight={600}>
              This action is irreversible!
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Your boost multiplier will be reset to 1.0x and you&apos;ll lose all reward bonuses.
            </Typography>
          </Alert>

          {/* Unstake Summary */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
              Unstake Summary
            </Typography>

            <Box>
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" color="text.secondary">
                  You will receive
                </Typography>
                <Typography
                  variant="h5"
                  fontWeight={800}
                  color={BOOST_DESIGN_TOKENS.COLOR_WARNING}
                >
                  {stakedAmount} PAIMON
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  (returned to your wallet immediately)
                </Typography>
              </Box>

              <Box
                sx={{
                  p: 2,
                  backgroundColor: 'rgba(255, 179, 0, 0.05)',
                  borderRadius: BOOST_DESIGN_TOKENS.RADIUS_MEDIUM,
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  • Current Boost: <strong>Will be reset to 1.0x</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  • Reward Multiplier: <strong>Will be lost</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Lock Period: <strong>Will restart if you stake again</strong>
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* What Will Happen */}
          <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              What will happen:
            </Typography>
            <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
              <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Your staked {stakedAmount} PAIMON will be returned to your wallet
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Your boost multiplier will reset to 1.0x (no bonus)
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Future rewards will no longer receive boost bonuses
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary">
                You&apos;ll need to stake again and wait 7 days to re-activate boost
              </Typography>
            </Box>
          </Box>

          {/* Transaction Error */}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>

        {/* Actions */}
        <DialogActions sx={{ p: 3, pt: 2, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={handleCancel}
            disabled={unstaking}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderColor: 'divider',
              color: 'text.secondary',
              '&:hover': {
                borderColor: 'text.secondary',
              },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmUnstake}
            disabled={unstaking}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              backgroundColor: BOOST_DESIGN_TOKENS.COLOR_WARNING,
              '&:hover': {
                backgroundColor: '#FFA000',
              },
            }}
          >
            {unstaking ? 'Unstaking...' : 'Yes, Unstake My PAIMON'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
