'use client';

import { Box, CardContent, Typography, Divider } from '@mui/material';
import { StyledCard } from '@/components/common';
import { MINT_CONFIG, BOND_PARAMS } from './constants';
import type { CostCalculation } from './types';

interface CostDisplayProps {
  calculation: CostCalculation;
  userBalance?: string;
}

/**
 * Cost Display Component
 * Shows total cost breakdown and user's USDC balance
 */
export function CostDisplay({ calculation, userBalance }: CostDisplayProps) {
  const hasInsufficientBalance = userBalance && parseFloat(userBalance) < calculation.totalCost;

  return (
    <StyledCard variant="accent">
      <CardContent>
        <Typography variant="h6" sx={{ color: 'rgba(0, 0, 0, 0.85)', mb: 2, fontWeight: 700 }}>
          Cost Breakdown
        </Typography>

        {/* Price per NFT */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body1" sx={{ color: 'rgba(0, 0, 0, 0.7)', fontWeight: 600 }}>
            Price per NFT:
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 700, color: 'rgba(255, 255, 255, 0.95)' }}>
            {MINT_CONFIG.NFT_PRICE} USDC
          </Typography>
        </Box>

        {/* Quantity */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body1" sx={{ color: 'rgba(0, 0, 0, 0.7)', fontWeight: 600 }}>
            Quantity:
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 700, color: 'rgba(255, 255, 255, 0.95)' }}>
            × {calculation.quantity}
          </Typography>
        </Box>

        <Divider sx={{ my: 2, borderColor: 'rgba(0, 0, 0, 0.15)' }} />

        {/* Total Cost */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ color: 'rgba(0, 0, 0, 0.85)', fontWeight: 700 }}>
            Total Cost:
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: hasInsufficientBalance ? '#D32F2F' : 'rgba(255, 255, 255, 0.95)',
            }}
          >
            {calculation.formattedCost} USDC
          </Typography>
        </Box>

        {/* User Balance */}
        {userBalance && (
          <>
            <Divider sx={{ my: 2, borderColor: 'rgba(0, 0, 0, 0.15)' }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body1" sx={{ color: 'rgba(0, 0, 0, 0.7)', fontWeight: 600 }}>
                Your USDC Balance:
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  fontWeight: 700,
                  color: hasInsufficientBalance ? '#D32F2F' : 'rgba(255, 255, 255, 0.95)',
                }}
              >
                {parseFloat(userBalance).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                USDC
              </Typography>
            </Box>
          </>
        )}

        {/* Warning if insufficient balance */}
        {hasInsufficientBalance && (
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mt: 2,
              p: 1,
              bgcolor: '#FFEBEE',
              borderRadius: 1,
              color: '#C62828',
              textAlign: 'center',
            }}
          >
            ⚠️ Insufficient USDC balance
          </Typography>
        )}

        {/* Info about investment */}
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 2,
            textAlign: 'center',
            color: '#A0522D',
          }}
        >
          Each NFT matures in {BOND_PARAMS.MATURITY_DAYS} days with guaranteed yield
        </Typography>
      </CardContent>
    </StyledCard>
  );
}
