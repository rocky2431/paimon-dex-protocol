/**
 * PositionCard Component
 * Display individual Treasury position with actions
 */

'use client';

import { useState } from 'react';
import {
  CardContent,
  Box,
  Typography,
  Button,
  Chip,
  Divider,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { formatUnits } from 'viem';
import { StyledCard } from '@/components/common';
import { PositionWithMetadata } from './hooks/useUserPositions';
import { HealthFactorGauge, getHealthFactorStatus } from './HealthFactorGauge';
import { TREASURY_THEME } from './constants';

interface PositionCardProps {
  position: PositionWithMetadata;
  onRedeem?: (assetAddress: string, amount: string) => void;
  onAddCollateral?: (assetAddress: string, amount: string) => void;
}

/**
 * Format time remaining until redemption
 */
function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'Available';

  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Get liquidation price for RWA asset
 * Price at which health factor drops to 115%
 */
function getLiquidationPrice(position: PositionWithMetadata): number {
  const rwaAmount = parseFloat(formatUnits(position.rwaAmount, 18));
  const usdpMinted = parseFloat(formatUnits(position.usdpMinted, 18));

  if (rwaAmount === 0) return 0;

  // Liquidation occurs at 115% health factor
  // HF = (rwaValue / hydValue) * 100
  // 115 = (rwaAmount * liquidationPrice / usdpMinted) * 100
  // liquidationPrice = (115 * usdpMinted) / (100 * rwaAmount)
  const liquidationPrice = (115 * usdpMinted) / (100 * rwaAmount);
  return liquidationPrice;
}

export function PositionCard({ position, onRedeem, onAddCollateral }: PositionCardProps) {
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);
  const [addCollateralDialogOpen, setAddCollateralDialogOpen] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState('');
  const [addAmount, setAddAmount] = useState('');

  const hfStatus = getHealthFactorStatus(position.healthFactor);
  const liquidationPrice = getLiquidationPrice(position);
  const rwaAmountFloat = parseFloat(formatUnits(position.rwaAmount, 18));
  const usdpMintedFloat = parseFloat(formatUnits(position.usdpMinted, 18));

  const isAtRisk = position.healthFactor < 150;

  // Handle redeem
  const handleRedeemClick = () => {
    setRedeemDialogOpen(true);
  };

  const handleRedeemConfirm = () => {
    if (onRedeem && redeemAmount) {
      onRedeem(position.rwaAsset as string, redeemAmount);
      setRedeemDialogOpen(false);
      setRedeemAmount('');
    }
  };

  // Handle add collateral
  const handleAddCollateralClick = () => {
    setAddCollateralDialogOpen(true);
  };

  const handleAddCollateralConfirm = () => {
    if (onAddCollateral && addAmount) {
      onAddCollateral(position.rwaAsset as string, addAmount);
      setAddCollateralDialogOpen(false);
      setAddAmount('');
    }
  };

  return (
    <>
      <StyledCard
        variant="white"
        hoverLift
        sx={{
          ...(isAtRisk && {
            border: `1px solid ${hfStatus.color}`,
            boxShadow: `0 4px 12px ${hfStatus.color}40`,
            '&:hover': {
              boxShadow: `0 6px 20px ${hfStatus.color}50`,
            },
          }),
        }}
      >
        <CardContent>
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: TREASURY_THEME.PRIMARY }}>
                {position.assetSymbol}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {position.assetName}
              </Typography>
            </Box>
            <Chip
              label={`T${position.assetTier}`}
              size="small"
              sx={{
                backgroundColor: TREASURY_THEME.PRIMARY,
                color: '#000',
                fontWeight: 700,
              }}
            />
          </Box>

          {/* Liquidation warning */}
          {isAtRisk && (
            <Alert
              severity={position.healthFactor < 115 ? 'error' : 'warning'}
              icon={<WarningAmberIcon />}
              sx={{ mb: 2 }}
            >
              {position.healthFactor < 115
                ? 'Position at risk of liquidation!'
                : 'Health factor below recommended threshold'}
            </Alert>
          )}

          {/* Health Factor Gauge */}
          <Box sx={{ mb: 2 }}>
            <HealthFactorGauge healthFactor={position.healthFactor} />
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Position stats */}
          <Stack spacing={1.5}>
            <StatRow label="Collateral Amount" value={`${rwaAmountFloat.toFixed(2)} ${position.assetSymbol}`} />
            <StatRow label="Collateral Value" value={`$${position.rwaValueUSD.toFixed(2)}`} />
            <StatRow label="USDP Minted" value={`${usdpMintedFloat.toFixed(2)} HYD`} />
            <StatRow label="Collateralization Ratio" value={`${position.collateralizationRatio.toFixed(0)}%`} />
            <StatRow
              label="Liquidation Price"
              value={`$${liquidationPrice.toFixed(4)}`}
              valueColor={isAtRisk ? hfStatus.color : undefined}
            />
            <StatRow label="Current Price" value={`$${position.rwaPrice.toFixed(4)}`} />
          </Stack>

          <Divider sx={{ my: 2 }} />

          {/* Actions */}
          <Stack spacing={1.5}>
            {/* Redeem button */}
            <Button
              variant={position.canRedeem ? 'contained' : 'outlined'}
              fullWidth
              disabled={!position.canRedeem}
              onClick={handleRedeemClick}
              startIcon={position.canRedeem ? <RemoveCircleOutlineIcon /> : <AccessTimeIcon />}
              sx={{
                backgroundColor: position.canRedeem ? TREASURY_THEME.PRIMARY : 'transparent',
                color: position.canRedeem ? '#000' : 'text.secondary',
                fontWeight: 700,
                '&:hover': {
                  backgroundColor: position.canRedeem ? TREASURY_THEME.SECONDARY : 'transparent',
                },
                '&.Mui-disabled': {
                  backgroundColor: 'transparent',
                  borderColor: 'rgba(255, 255, 255, 0.12)',
                },
              }}
            >
              {position.canRedeem
                ? 'Redeem Collateral'
                : `Cooldown: ${formatTimeRemaining(position.timeUntilRedemption)}`}
            </Button>

            {/* Add collateral button */}
            <Button
              variant="outlined"
              fullWidth
              onClick={handleAddCollateralClick}
              startIcon={<AddCircleOutlineIcon />}
              sx={{
                borderColor: TREASURY_THEME.EMPHASIS,
                color: TREASURY_THEME.EMPHASIS,
                fontWeight: 700,
                '&:hover': {
                  borderColor: TREASURY_THEME.EMPHASIS,
                  backgroundColor: `${TREASURY_THEME.EMPHASIS}10`,
                },
              }}
            >
              Add Collateral
            </Button>
          </Stack>
        </CardContent>
      </StyledCard>

      {/* Redeem Dialog */}
      <Dialog open={redeemDialogOpen} onClose={() => setRedeemDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: TREASURY_THEME.PRIMARY }}>Redeem Collateral</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter the amount of {position.assetSymbol} to redeem. You will need to burn the corresponding USDP
            stablecoins.
          </Typography>
          <TextField
            fullWidth
            type="number"
            label="Redeem Amount"
            value={redeemAmount}
            onChange={(e) => setRedeemAmount(e.target.value)}
            placeholder="0.0"
            sx={{ mt: 1 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Available: {rwaAmountFloat.toFixed(2)} {position.assetSymbol}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRedeemDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleRedeemConfirm}
            disabled={!redeemAmount || parseFloat(redeemAmount) <= 0}
            sx={{
              backgroundColor: TREASURY_THEME.PRIMARY,
              color: '#000',
              fontWeight: 700,
            }}
          >
            Confirm Redeem
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Collateral Dialog */}
      <Dialog
        open={addCollateralDialogOpen}
        onClose={() => setAddCollateralDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, color: TREASURY_THEME.PRIMARY }}>Add Collateral</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add more {position.assetSymbol} collateral to improve your health factor.
          </Typography>
          <TextField
            fullWidth
            type="number"
            label="Amount to Add"
            value={addAmount}
            onChange={(e) => setAddAmount(e.target.value)}
            placeholder="0.0"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddCollateralDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddCollateralConfirm}
            disabled={!addAmount || parseFloat(addAmount) <= 0}
            sx={{
              backgroundColor: TREASURY_THEME.PRIMARY,
              color: '#000',
              fontWeight: 700,
            }}
          >
            Confirm Add
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// Helper component for stat rows
function StatRow({
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
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant="body2"
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
