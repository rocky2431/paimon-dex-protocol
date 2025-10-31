'use client';

import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Alert } from '@mui/material';
import { Warning as WarningIcon, Lock as LockIcon, AccountBalance as CashIcon } from '@mui/icons-material';
import { SettlementOption, VeNFTSettlementOption, CashSettlementOption } from '@/types/settlement';

interface ConfirmationModalProps {
  open: boolean;
  option: SettlementOption;
  veNFTOption?: VeNFTSettlementOption;
  cashOption?: CashSettlementOption;
  tokenId: number;
  onConfirm: () => void;
  onCancel: () => void;
  confirming: boolean;
}

/**
 * ConfirmationModal Component
 * Confirmation dialog before irreversible settlement
 *
 * Features:
 * - Option-specific details
 * - Warning about irreversibility
 * - Summary of what will happen
 * - Confirm/Cancel buttons
 */
export function ConfirmationModal({
  open,
  option,
  veNFTOption,
  cashOption,
  tokenId,
  onConfirm,
  onCancel,
  confirming,
}: ConfirmationModalProps) {
  const isVeNFT = option === SettlementOption.VE_NFT;

  return (
    <Dialog
      open={open}
      onClose={confirming ? undefined : onCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          border: `2px solid ${isVeNFT ? '#FF6B35' : '#FFB74D'}`,
        },
      }}
    >
      {/* Title */}
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          backgroundColor: isVeNFT ? 'rgba(255, 107, 53, 0.05)' : 'rgba(255, 183, 77, 0.05)',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        {isVeNFT ? (
          <LockIcon sx={{ fontSize: 28, color: '#FF6B35' }} />
        ) : (
          <CashIcon sx={{ fontSize: 28, color: '#FFB74D' }} />
        )}
        <Typography variant="h6" fontWeight={800}>
          Confirm {isVeNFT ? 'veNFT' : 'Cash'} Settlement
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
            Once confirmed, your Bond NFT #{tokenId} will be burned and cannot be recovered.
          </Typography>
        </Alert>

        {/* Settlement Summary */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
            Settlement Summary
          </Typography>

          {isVeNFT && veNFTOption ? (
            <Box>
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" color="text.secondary">
                  You will receive
                </Typography>
                <Typography variant="h5" fontWeight={800} color="#FF6B35">
                  {veNFTOption.hydAmount.toFixed(2)} HYD
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  (locked for {veNFTOption.lockDurationMonths} months)
                </Typography>
              </Box>

              <Box sx={{ p: 2, backgroundColor: 'rgba(255, 107, 53, 0.05)', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  • Voting Power: <strong>{veNFTOption.votingPower.toFixed(2)}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  • Estimated APY: <strong>{veNFTOption.estimatedAPY.toFixed(1)}%</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Lock expires: <strong>{veNFTOption.lockEndDate.toLocaleDateString()}</strong>
                </Typography>
              </Box>
            </Box>
          ) : cashOption ? (
            <Box>
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" color="text.secondary">
                  You will receive
                </Typography>
                <Typography variant="h5" fontWeight={800} color="#FFB74D">
                  {cashOption.totalAmount.toFixed(2)} USDC
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  (sent to your wallet immediately)
                </Typography>
              </Box>

              <Box sx={{ p: 2, backgroundColor: 'rgba(255, 183, 77, 0.05)', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  • Principal: <strong>{cashOption.principal.toFixed(2)} USDC</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  • Base Yield: <strong>{cashOption.baseYield.toFixed(2)} USDC</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Remint Earnings: <strong>{cashOption.remintYield.toFixed(2)} USDC</strong>
                </Typography>
              </Box>
            </Box>
          ) : null}
        </Box>

        {/* What Will Happen */}
        <Box>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
            What will happen:
          </Typography>
          <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
            {isVeNFT ? (
              <>
                <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Your Bond NFT #{tokenId} will be burned
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  {veNFTOption?.hydAmount.toFixed(2)} HYD will be minted to VotingEscrow
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  A new veNFT will be created with a {veNFTOption?.lockDurationMonths}-month lock
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  You&apos;ll earn protocol fees and bribes during the lock period
                </Typography>
              </>
            ) : (
              <>
                <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Your Bond NFT #{tokenId} will be burned
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Treasury will transfer {cashOption?.totalAmount.toFixed(2)} USDC to your wallet
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  You&apos;ll have full control and liquidity of your funds
                </Typography>
              </>
            )}
          </Box>
        </Box>
      </DialogContent>

      {/* Actions */}
      <DialogActions sx={{ p: 3, pt: 2, gap: 1 }}>
        <Button
          variant="outlined"
          onClick={onCancel}
          disabled={confirming}
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
          onClick={onConfirm}
          disabled={confirming}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            backgroundColor: isVeNFT ? '#FF6B35' : '#FFB74D',
            '&:hover': {
              backgroundColor: isVeNFT ? '#FF5722' : '#FFA726',
            },
          }}
        >
          {confirming ? 'Confirming...' : 'Yes, Proceed with Settlement'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
