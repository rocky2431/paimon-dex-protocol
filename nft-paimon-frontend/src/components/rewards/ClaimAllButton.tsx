'use client';

import { Button, Box, Typography, Chip, Stack } from '@mui/material';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { RewardsDashboardState, ValidationResult, RewardsSummary } from './types';
import { REWARDS_DESIGN_TOKENS } from './constants';

interface ClaimAllButtonProps {
  summary: RewardsSummary;
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
  summary,
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
      {/* Total Earned Display - Multi-Asset */}
      <Box sx={{ textAlign: 'center', width: '100%' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
          Total Claimable Rewards
        </Typography>

        {/* Multi-Asset Breakdown */}
        <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center" sx={{ mb: 1 }}>
          {parseFloat(summary.totalEarnedPAIMONFormatted) > 0 && (
            <Chip
              label={`${parseFloat(summary.totalEarnedPAIMONFormatted).toFixed(2)} PAIMON`}
              sx={{
                background: 'linear-gradient(90deg, #ff9800, #ffb74d)',
                color: 'white',
                fontWeight: 600,
              }}
            />
          )}
          {parseFloat(summary.totalEarnedESPAIMONFormatted) > 0 && (
            <Chip
              label={`${parseFloat(summary.totalEarnedESPAIMONFormatted).toFixed(2)} esPAIMON`}
              sx={{
                background: 'linear-gradient(90deg, #ffa726, #ffb74d)',
                color: 'white',
                fontWeight: 600,
              }}
            />
          )}
          {parseFloat(summary.totalEarnedUSDCFormatted) > 0 && (
            <Chip
              label={`${parseFloat(summary.totalEarnedUSDCFormatted).toFixed(2)} USDC`}
              sx={{
                background: 'linear-gradient(90deg, #ff7043, #ffab91)',
                color: 'white',
                fontWeight: 600,
              }}
            />
          )}
          {parseFloat(summary.totalEarnedUSDPFormatted) > 0 && (
            <Chip
              label={`${parseFloat(summary.totalEarnedUSDPFormatted).toFixed(2)} USDP`}
              sx={{
                background: 'linear-gradient(90deg, #ff6f00, #ff9800)',
                color: 'white',
                fontWeight: 600,
              }}
            />
          )}
        </Stack>

        {/* Fallback if no chips displayed */}
        {parseFloat(summary.totalEarnedPAIMONFormatted) === 0 &&
          parseFloat(summary.totalEarnedESPAIMONFormatted) === 0 &&
          parseFloat(summary.totalEarnedUSDCFormatted) === 0 &&
          parseFloat(summary.totalEarnedUSDPFormatted) === 0 && (
            <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              0.00
            </Typography>
          )}
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
