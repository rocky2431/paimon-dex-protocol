'use client';

import { Box, Stack, Typography } from '@mui/material';
import { SwapCalculation } from './types';
import { DESIGN_TOKENS } from './constants';

interface SwapDetailsProps {
  calculation: SwapCalculation | null;
  isLoading?: boolean;
}

/**
 * SwapDetails Component
 * OlympusDAO-style info display with inset shadow divider
 *
 * Features:
 * - Inset shadow divider (replaces solid border-top)
 * - Clean two-column layout
 * - Shows fee, exchange rate
 */
export const SwapDetails: React.FC<SwapDetailsProps> = ({
  calculation,
  isLoading = false,
}) => {
  if (!calculation || isLoading) {
    return null;
  }

  return (
    <Box
      sx={{
        mt: 3,
        pt: 3,
        borderTop: 'none', // No solid border
        boxShadow: DESIGN_TOKENS.INSET_DIVIDER, // Inset shadow divider
      }}
    >
      {/* Fee row */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 1.5 }}
        data-testid="swap-fee"
      >
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontSize: '0.875rem' }}
        >
          Fee ({calculation.feePercentage}%)
        </Typography>
        <Typography
          variant="body2"
          fontWeight={600}
          color="text.primary"
          sx={{ fontSize: '0.875rem' }}
        >
          {calculation.feeFormatted}
        </Typography>
      </Stack>

      {/* Exchange rate row */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        data-testid="exchange-rate"
      >
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontSize: '0.875rem' }}
        >
          Price
        </Typography>
        <Typography
          variant="body2"
          fontWeight={600}
          color="text.primary"
          sx={{ fontSize: '0.875rem' }}
        >
          {calculation.exchangeRate}
        </Typography>
      </Stack>
    </Box>
  );
};
