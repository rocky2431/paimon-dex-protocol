'use client';

import React, { useState, useMemo } from 'react';
import { Button, Tooltip, CircularProgress } from '@mui/material';
import { Bribe, BribeMarketplaceState } from './types';
import { BRIBES_DESIGN_TOKENS } from './constants';
import { useBribes } from './hooks/useBribes';

/**
 * Props for ClaimBribeButton component
 */
interface ClaimBribeButtonProps {
  /** Bribe to claim */
  bribe: Bribe;
  /** User's veNFT token ID */
  tokenId: bigint;
  /** Optional custom styling */
  size?: 'small' | 'medium' | 'large';
}

/**
 * ClaimBribeButton Component
 * Button to claim bribe rewards
 *
 * Features:
 * - Display claimable amount
 * - Verify user voted for gauge
 * - State-based button text
 * - Loading/success states
 * - Pill-shaped design
 * - Error handling
 */
export const ClaimBribeButton: React.FC<ClaimBribeButtonProps> = ({ bribe, tokenId, size = 'small' }) => {
  const { state, handleClaimBribe, validateClaimBribe } = useBribes();

  const [localState, setLocalState] = useState<BribeMarketplaceState>(BribeMarketplaceState.READY);
  const [claimableAmount, setClaimableAmount] = useState<bigint>(0n);
  const [hasClaimed, setHasClaimed] = useState<boolean>(false);
  const [hasVoted, setHasVoted] = useState<boolean>(true); // TODO: Query from contract

  // ==================== Validation ====================

  const validation = useMemo(() => {
    return validateClaimBribe({
      bribe,
      tokenId,
      claimableAmount,
      claimableAmountFormatted: claimableAmount.toString(),
    });
  }, [bribe, tokenId, claimableAmount, validateClaimBribe]);

  // ==================== Calculated Values ====================

  /**
   * Calculate claimable amount
   * Formula: (user vote weight / total votes) × bribe amount
   */
  const calculateClaimableAmount = (): bigint => {
    // TODO: Query user's vote weight for this gauge
    // For now, return a mock value
    if (bribe.totalVotes === 0n) return 0n;

    // Mock: assume user has 10% of total votes
    return (bribe.amount * 10n) / 100n;
  };

  // ==================== Effects ====================

  React.useEffect(() => {
    // Calculate claimable amount on mount
    const amount = calculateClaimableAmount();
    setClaimableAmount(amount);

    // TODO: Query hasClaimed status from contract
    // setHasClaimed(status);
  }, [bribe]);

  // ==================== Handlers ====================

  const handleClaim = async () => {
    if (!validation.isValid) return;

    try {
      setLocalState(BribeMarketplaceState.CLAIMING);
      await handleClaimBribe(bribe.bribeId, tokenId);
      setLocalState(BribeMarketplaceState.SUCCESS);
      setHasClaimed(true);

      // Reset to ready after 2 seconds
      setTimeout(() => {
        setLocalState(BribeMarketplaceState.READY);
      }, 2000);
    } catch (error) {
      console.error('Claim failed:', error);
      setLocalState(BribeMarketplaceState.ERROR);

      // Reset to ready after 2 seconds
      setTimeout(() => {
        setLocalState(BribeMarketplaceState.READY);
      }, 2000);
    }
  };

  // ==================== Button States ====================

  const getButtonText = () => {
    if (hasClaimed) return 'Claimed';
    if (!hasVoted) return 'Not Voted';
    if (localState === BribeMarketplaceState.CLAIMING) return 'Claiming...';
    if (localState === BribeMarketplaceState.SUCCESS) return 'Success!';
    if (localState === BribeMarketplaceState.ERROR) return 'Failed';
    if (claimableAmount === 0n) return 'Not Eligible';
    return 'Claim';
  };

  const isDisabled =
    hasClaimed ||
    !hasVoted ||
    claimableAmount === 0n ||
    localState === BribeMarketplaceState.CLAIMING ||
    localState === BribeMarketplaceState.SUCCESS;

  const getButtonColor = () => {
    if (hasClaimed) return 'default';
    if (!hasVoted || claimableAmount === 0n) return 'default';
    if (localState === BribeMarketplaceState.SUCCESS) return 'success';
    if (localState === BribeMarketplaceState.ERROR) return 'error';
    return 'primary';
  };

  // ==================== Tooltip Message ====================

  const getTooltipMessage = () => {
    if (hasClaimed) return 'You have already claimed this bribe';
    if (!hasVoted) return 'You must vote for this gauge to claim bribes';
    if (claimableAmount === 0n) return 'No rewards available to claim';
    if (!validation.isValid && validation.error) return validation.error;
    return `Claim ${claimableAmount.toString()} ${bribe.tokenSymbol}`;
  };

  // ==================== Render ====================

  return (
    <Tooltip title={getTooltipMessage()} arrow placement="top">
      <span>
        <Button
          variant={isDisabled ? 'outlined' : 'contained'}
          size={size}
          onClick={handleClaim}
          disabled={isDisabled}
          color={getButtonColor() as any}
          startIcon={
            localState === BribeMarketplaceState.CLAIMING ? <CircularProgress size={16} color="inherit" /> : null
          }
          sx={{
            borderRadius: BRIBES_DESIGN_TOKENS.RADIUS_PILL,
            textTransform: 'none',
            fontWeight: 600,
            minWidth: 100,
            background:
              !isDisabled && localState === BribeMarketplaceState.READY
                ? 'linear-gradient(135deg, #FF9800 0%, #FF5722 100%)'
                : undefined,
            '&:hover': {
              background:
                !isDisabled && localState === BribeMarketplaceState.READY
                  ? 'linear-gradient(135deg, #FB8C00 0%, #F4511E 100%)'
                  : undefined,
            },
            ...(localState === BribeMarketplaceState.SUCCESS && {
              background: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
              color: 'white',
            }),
            ...(localState === BribeMarketplaceState.ERROR && {
              background: 'linear-gradient(135deg, #F44336 0%, #D32F2F 100%)',
              color: 'white',
            }),
          }}
        >
          {getButtonText()}
        </Button>
      </span>
    </Tooltip>
  );
};
