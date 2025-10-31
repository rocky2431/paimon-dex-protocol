'use client';

import { Box, Typography, Grid, Divider, Button, Chip } from '@mui/material';
import {
  AccountBalance as CashIcon,
  TrendingUp as YieldIcon,
  AttachMoney as PrincipalIcon,
  Bolt as InstantIcon,
} from '@mui/icons-material';
import { CashSettlementOption } from '@/types/settlement';

interface CashOptionProps {
  option: CashSettlementOption;
  onSettle: () => void;
  settling: boolean;
}

/**
 * CashOption Component
 * Cash settlement option display with amount breakdown
 *
 * Features:
 * - Total amount display
 * - Breakdown (Principal + Base Yield + Remint)
 * - Instant settlement badge
 * - Benefits list
 * - Settlement button
 */
export function CashOption({ option, onSettle, settling }: CashOptionProps) {
  return (
    <Box
      sx={{
        p: 3,
        backgroundColor: 'background.paper',
        borderRadius: 2,
        border: '2px solid #FFB74D',
        boxShadow: '0 4px 16px rgba(255, 183, 77, 0.12)',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <CashIcon sx={{ fontSize: 28, color: '#FFB74D' }} />
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#FFB74D' }}>
          Cash (USDC)
        </Typography>
        <Chip
          label="Instant"
          size="small"
          icon={<InstantIcon sx={{ fontSize: 14 }} />}
          sx={{
            backgroundColor: '#8BC34A',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '0.7rem',
            ml: 'auto',
          }}
        />
      </Box>

      {/* Total Amount */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
          You will receive
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 800, color: '#FFB74D' }}>
          {option.totalAmount.toFixed(2)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          USDC (to your wallet)
        </Typography>
      </Box>

      {/* Amount Breakdown */}
      <Box
        sx={{
          mb: 3,
          p: 2,
          backgroundColor: 'rgba(255, 183, 77, 0.05)',
          borderRadius: 1,
          border: '1px solid rgba(255, 183, 77, 0.1)',
        }}
      >
        <Typography variant="caption" fontWeight={700} textTransform="uppercase" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
          Breakdown
        </Typography>

        <Grid container spacing={1.5}>
          {/* Principal */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <PrincipalIcon sx={{ fontSize: 16, color: '#FFB74D' }} />
                <Typography variant="body2" color="text.secondary">
                  Principal
                </Typography>
              </Box>
              <Typography variant="body2" fontWeight={700}>
                {option.principal.toFixed(2)} USDC
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ borderColor: 'rgba(255, 183, 77, 0.1)' }} />
          </Grid>

          {/* Base Yield */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <YieldIcon sx={{ fontSize: 16, color: '#8BC34A' }} />
                <Typography variant="body2" color="text.secondary">
                  Base Yield (90 days)
                </Typography>
              </Box>
              <Typography variant="body2" fontWeight={700} color="#8BC34A">
                +{option.baseYield.toFixed(2)} USDC
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ borderColor: 'rgba(255, 183, 77, 0.1)' }} />
          </Grid>

          {/* Remint Yield */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <YieldIcon sx={{ fontSize: 16, color: '#FF6B35' }} />
                <Typography variant="body2" color="text.secondary">
                  Remint Earnings
                </Typography>
              </Box>
              <Typography variant="body2" fontWeight={700} color="#FF6B35">
                +{option.remintYield.toFixed(2)} USDC
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ borderColor: 'rgba(255, 183, 77, 0.2)' }} />
          </Grid>

          {/* Total */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 0.5 }}>
              <Typography variant="body1" fontWeight={700}>
                Total
              </Typography>
              <Typography variant="h6" fontWeight={800} color="#FFB74D">
                {option.totalAmount.toFixed(2)} USDC
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Benefits List */}
      <Box sx={{ mb: 3, p: 2, backgroundColor: 'rgba(255, 183, 77, 0.02)', borderRadius: 1 }}>
        <Typography variant="caption" fontWeight={700} textTransform="uppercase" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          Benefits
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
          <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            Instant settlement - USDC sent to your wallet
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            No lock period - fully liquid
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            Low risk - stable asset
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            Flexibility - use funds immediately
          </Typography>
        </Box>
      </Box>

      {/* Settlement Button */}
      <Button
        variant="outlined"
        fullWidth
        size="large"
        disabled={settling}
        onClick={onSettle}
        sx={{
          py: 1.5,
          fontWeight: 700,
          fontSize: '1rem',
          textTransform: 'none',
          borderColor: '#FFB74D',
          borderWidth: 2,
          color: '#FFB74D',
          '&:hover': {
            borderColor: '#FFA726',
            borderWidth: 2,
            backgroundColor: 'rgba(255, 183, 77, 0.08)',
          },
        }}
      >
        {settling ? 'Processing...' : 'Settle to Cash'}
      </Button>

      {/* Info Note */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          mt: 2,
          display: 'block',
          textAlign: 'center',
          fontStyle: 'italic',
        }}
      >
        Recommended if you need immediate liquidity
      </Typography>
    </Box>
  );
}
