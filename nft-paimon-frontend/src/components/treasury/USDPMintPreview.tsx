/**
 * USDPMintPreview Component
 * Displays deposit preview with RWA value, LTV, HYD mint amount, and health factor
 */

'use client';

import { CardContent, Box, Typography, Divider, CircularProgress, Chip } from '@mui/material';
import { StyledCard } from '@/components/common';
import { DepositPreview } from '@/types/treasury';
import { formatUnits } from 'viem';
import { TREASURY_THEME, TREASURY_CONFIG } from './constants';

interface USDPMintPreviewProps {
  preview: DepositPreview | null;
  isLoading?: boolean;
}

export function USDPMintPreview({ preview, isLoading }: USDPMintPreviewProps) {
  if (isLoading) {
    return (
      <StyledCard variant="accent">
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress sx={{ color: TREASURY_THEME.PRIMARY }} />
          </Box>
        </CardContent>
      </StyledCard>
    );
  }

  if (!preview) {
    return (
      <StyledCard variant="accent">
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            Enter an amount to see deposit preview
          </Typography>
        </CardContent>
      </StyledCard>
    );
  }

  // Format values
  const rwaValueFormatted = parseFloat(formatUnits(preview.rwaValue, 18)).toFixed(2);
  const usdpMintAmountFormatted = parseFloat(formatUnits(preview.usdpMintAmount, 18)).toFixed(2);

  // Determine health factor status
  const getHealthFactorStatus = (hf: number) => {
    if (hf >= TREASURY_CONFIG.TARGET_HEALTH_FACTOR) {
      return { color: TREASURY_THEME.SUCCESS, label: 'Healthy' };
    } else if (hf >= TREASURY_CONFIG.LIQUIDATION_THRESHOLD) {
      return { color: TREASURY_THEME.WARNING, label: 'Warning' };
    } else {
      return { color: TREASURY_THEME.ERROR, label: 'At Risk' };
    }
  };

  const hfStatus = getHealthFactorStatus(preview.healthFactor);

  return (
    <StyledCard variant="accent">
      <CardContent>
        <Typography
          variant="h6"
          sx={{
            mb: 2,
            fontWeight: 700,
            color: TREASURY_THEME.PRIMARY,
            textAlign: 'center',
          }}
        >
          Deposit Preview
        </Typography>

        <Divider sx={{ mb: 2, borderColor: TREASURY_THEME.PRIMARY }} />

        {/* RWA Value */}
        <PreviewRow label="RWA Collateral Value" value={`$${rwaValueFormatted}`} />

        {/* LTV Ratio */}
        <PreviewRow label="LTV Ratio" value={`${preview.ltvRatio.toFixed(0)}%`} />

        {/* Mint Discount (if applicable) */}
        {preview.mintDiscount > 0 && (
          <PreviewRow
            label="Mint Discount"
            value={`${preview.mintDiscount.toFixed(2)}%`}
            valueColor={TREASURY_THEME.SUCCESS}
          />
        )}

        <Divider sx={{ my: 2, borderColor: TREASURY_THEME.SECONDARY }} />

        {/* HYD Mint Amount */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            HYD to be Minted
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: TREASURY_THEME.ACCENT,
            }}
          >
            {usdpMintAmountFormatted} USDP
          </Typography>
        </Box>

        <Divider sx={{ my: 2, borderColor: TREASURY_THEME.SECONDARY }} />

        {/* Health Factor */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 1.5,
            backgroundColor: `${hfStatus.color}15`,
            borderRadius: 1,
          }}
        >
          <Box>
            <Typography variant="body2" color="text.secondary">
              Health Factor
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: hfStatus.color,
              }}
            >
              {preview.healthFactor.toFixed(2)}%
            </Typography>
          </Box>
          <Chip
            label={hfStatus.label}
            size="small"
            sx={{
              backgroundColor: hfStatus.color,
              color: '#000',
              fontWeight: 700,
            }}
          />
        </Box>

        {/* Info text */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            mt: 2,
            display: 'block',
            textAlign: 'center',
            fontSize: '0.75rem',
          }}
        >
          Liquidation occurs at HF ≤ {TREASURY_CONFIG.LIQUIDATION_THRESHOLD}%
        </Typography>
      </CardContent>
    </StyledCard>
  );
}

// Helper component for preview rows
function PreviewRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 1.5,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant="body1"
        sx={{
          fontWeight: 600,
          color: valueColor || 'text.primary',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
