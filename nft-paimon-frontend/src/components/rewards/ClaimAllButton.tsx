'use client';

import { Button, Box, Typography } from '@mui/material';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { RewardsDashboardState, ValidationResult } from './types';
import { REWARDS_DESIGN_TOKENS } from './constants';

interface ClaimAllButtonProps {
  totalEarned: string;
  dashboardState: RewardsDashboardState;
  validation: ValidationResult;
  onClaimAll: () => void;
}

/**
 * ClaimAllButton Component
 * One-click claim button for all rewards
 *
 * Features:
 * - Displays total PAIMON to claim
 * - State-based button text and styling
 * - Disabled when no rewards or loading
 * - Success animation
 */
export const ClaimAllButton: React.FC<ClaimAllButtonProps> = ({
  totalEarned,
  dashboardState,
  validation,
  onClaimAll,
}) => {
  const isLoading =
    dashboardState === RewardsDashboardState.LOADING ||
    dashboardState === RewardsDashboardState.CLAIMING;
  const isSuccess = dashboardState === RewardsDashboardState.SUCCESS;
  const isDisabled = !validation.isValid || isLoading || isSuccess;

  const getButtonText = (): string => {
    if (isSuccess) return 'Success! 🎉';
    if (isLoading) return 'Claiming...';
    if (!validation.isValid) return validation.error || 'No rewards';
    return 'Claim All Rewards';
  };

  const getButtonIcon = () => {
    if (isSuccess) return <CheckCircleIcon sx={{ mr: 1 }} />;
    if (isLoading) return null;
    return <LocalFireDepartmentIcon sx={{ mr: 1 }} />;
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        p: 3,
        borderRadius: REWARDS_DESIGN_TOKENS.RADIUS_LARGE,
        background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(255, 152, 0, 0.05) 100%)',
        border: '1px solid rgba(255, 152, 0, 0.2)',
      }}
    >
      {/* Total Earned Display */}
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
          Total Claimable Rewards
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, justifyContent: 'center' }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(90deg, #ff9800, #ffb74d)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {parseFloat(totalEarned).toFixed(2)}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              fontWeight: 500,
            }}
          >
            PAIMON
          </Typography>
        </Box>
      </Box>

      {/* Claim All Button */}
      <Button
        variant="contained"
        size="large"
        fullWidth
        disabled={isDisabled}
        onClick={onClaimAll}
        sx={{
          borderRadius: REWARDS_DESIGN_TOKENS.RADIUS_PILL,
          height: 56,
          fontSize: '1.1rem',
          fontWeight: 600,
          background: isSuccess
            ? 'linear-gradient(90deg, #4caf50, #66bb6a)'
            : 'linear-gradient(90deg, #ff9800, #ffb74d)',
          boxShadow: isDisabled ? 'none' : REWARDS_DESIGN_TOKENS.SHADOW_BUTTON,
          '&:hover': {
            background: isSuccess
              ? 'linear-gradient(90deg, #66bb6a, #81c784)'
              : 'linear-gradient(90deg, #ffb74d, #ffc107)',
            boxShadow: '0 6px 16px rgba(255, 152, 0, 0.3)',
          },
          '&:disabled': {
            background: 'linear-gradient(90deg, rgba(255, 152, 0, 0.3), rgba(255, 152, 0, 0.2))',
            color: 'rgba(255, 255, 255, 0.5)',
          },
        }}
      >
        {getButtonIcon()}
        {getButtonText()}
      </Button>

      {/* Helper Text */}
      {validation.isValid && !isLoading && !isSuccess && (
        <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
          Claim rewards from all active pools in one transaction
        </Typography>
      )}
    </Box>
  );
};
