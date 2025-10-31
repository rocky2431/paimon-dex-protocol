'use client';

import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  Alert,
  Divider,
} from '@mui/material';
import { parseUnits, formatUnits } from 'viem';
import { useAccount } from 'wagmi';
import { CreateBribeFormData, BribeMarketplaceState } from './types';
import { BRIBES_DESIGN_TOKENS, WHITELISTED_BRIBE_TOKENS, calculatePlatformFee, calculateNetBribeAmount } from './constants';
import { LIQUIDITY_POOLS } from '../liquidity/constants';
import { useBribes } from './hooks/useBribes';

/**
 * CreateBribeForm Component
 * Form for creating new bribes
 *
 * Features:
 * - Select gauge/pool
 * - Select bribe token (whitelisted only)
 * - Input amount
 * - Show platform fee (2%) and net amount
 * - Token approval handling
 * - State machine UI
 * - OlympusDAO design aesthetics
 */
export const CreateBribeForm: React.FC = () => {
  const { isConnected } = useAccount();
  const {
    state,
    handleCreateBribe,
    handleApproveToken,
    validateCreateBribe,
    calculatePlatformFee,
    calculateNetBribeAmount,
    whitelistedTokens,
  } = useBribes();

  // ==================== Form State ====================

  const [formData, setFormData] = useState<CreateBribeFormData>({
    pool: null,
    token: null,
    amount: 0n,
    amountFormatted: '',
    epoch: 0n, // TODO: Get current epoch from contract
  });

  const [needsApproval, setNeedsApproval] = useState<boolean>(true);

  // ==================== Validation ====================

  const validation = useMemo(() => {
    return validateCreateBribe(formData);
  }, [formData, validateCreateBribe]);

  // ==================== Calculated Values ====================

  const platformFee = useMemo(() => {
    if (formData.amount === 0n || !formData.token) return { raw: 0n, formatted: '0' };

    const fee = calculatePlatformFee(formData.amount);
    return {
      raw: fee,
      formatted: formatUnits(fee, formData.token.decimals),
    };
  }, [formData.amount, formData.token, calculatePlatformFee]);

  const netAmount = useMemo(() => {
    if (formData.amount === 0n || !formData.token) return { raw: 0n, formatted: '0' };

    const net = calculateNetBribeAmount(formData.amount);
    return {
      raw: net,
      formatted: formatUnits(net, formData.token.decimals),
    };
  }, [formData.amount, formData.token, calculateNetBribeAmount]);

  // ==================== Handlers ====================

  const handlePoolChange = (event: any) => {
    const poolName = event.target.value;
    const pool = LIQUIDITY_POOLS.find((p) => p.name === poolName);
    setFormData({ ...formData, pool: pool || null });
  };

  const handleTokenChange = (event: any) => {
    const tokenAddress = event.target.value as `0x${string}`;
    const token = whitelistedTokens.find((t) => t.address === tokenAddress);
    setFormData({
      ...formData,
      token: token || null,
      amount: 0n,
      amountFormatted: '',
    });
    setNeedsApproval(true);
  };

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;

    if (!formData.token) return;

    try {
      // Allow empty input
      if (value === '') {
        setFormData({ ...formData, amount: 0n, amountFormatted: '' });
        return;
      }

      // Parse and validate
      const amount = parseUnits(value, formData.token.decimals);
      setFormData({ ...formData, amount, amountFormatted: value });
    } catch (error) {
      // Invalid input, keep previous value
      console.error('Invalid amount:', error);
    }
  };

  const handleApprove = async () => {
    if (!formData.token) return;

    try {
      await handleApproveToken(formData.token.address, formData.amount);
      setNeedsApproval(false);
    } catch (error) {
      console.error('Approval failed:', error);
    }
  };

  const handleSubmit = async () => {
    if (!validation.isValid) return;

    await handleCreateBribe(formData);
  };

  // ==================== Button States ====================

  const getApproveButtonText = () => {
    if (state === BribeMarketplaceState.CREATING) return 'Approving...';
    return `Approve ${formData.token?.symbol || 'Token'}`;
  };

  const getCreateButtonText = () => {
    if (state === BribeMarketplaceState.CREATING) return 'Creating Bribe...';
    if (state === BribeMarketplaceState.SUCCESS) return 'Success!';
    return 'Create Bribe';
  };

  const isCreateDisabled = !validation.isValid || needsApproval || state === BribeMarketplaceState.CREATING;

  // ==================== Render ====================

  return (
    <Card
      sx={{
        p: 4,
        borderRadius: BRIBES_DESIGN_TOKENS.RADIUS_LARGE,
        boxShadow: BRIBES_DESIGN_TOKENS.SHADOW_CARD,
      }}
    >
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
        Create Bribe
      </Typography>

      {!isConnected && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Please connect your wallet to create a bribe
        </Alert>
      )}

      {/* Pool Selection */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Select Gauge/Pool</InputLabel>
        <Select
          value={formData.pool?.name || ''}
          onChange={handlePoolChange}
          label="Select Gauge/Pool"
          disabled={!isConnected}
        >
          {LIQUIDITY_POOLS.map((pool) => (
            <MenuItem key={pool.address} value={pool.name}>
              {pool.name} ({pool.type})
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Token Selection */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Bribe Token</InputLabel>
        <Select
          value={formData.token?.address || ''}
          onChange={handleTokenChange}
          label="Bribe Token"
          disabled={!isConnected || !formData.pool}
        >
          {whitelistedTokens.map((token) => (
            <MenuItem key={token.address} value={token.address}>
              {token.symbol} - {token.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Amount Input */}
      <TextField
        fullWidth
        label="Bribe Amount"
        type="number"
        value={formData.amountFormatted}
        onChange={handleAmountChange}
        disabled={!isConnected || !formData.token}
        InputProps={{
          endAdornment: formData.token && (
            <InputAdornment position="end">{formData.token.symbol}</InputAdornment>
          ),
        }}
        sx={{ mb: 3 }}
        helperText={formData.token ? `Enter amount in ${formData.token.symbol}` : 'Select a token first'}
      />

      {/* Fee Breakdown */}
      {formData.amount > 0n && formData.token && (
        <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(255, 152, 0, 0.05)', borderRadius: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Fee Breakdown
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">Total Amount:</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {parseFloat(formData.amountFormatted).toFixed(4)} {formData.token.symbol}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Platform Fee (2%):
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {parseFloat(platformFee.formatted).toFixed(4)} {formData.token.symbol}
            </Typography>
          </Box>

          <Divider sx={{ my: 1 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>
              Net Bribe Amount (98%):
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 700, color: 'primary.main' }}>
              {parseFloat(netAmount.formatted).toFixed(4)} {formData.token.symbol}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Validation Error */}
      {!validation.isValid && validation.error && formData.amount > 0n && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {validation.error}
        </Alert>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        {/* Approve Button */}
        {needsApproval && formData.amount > 0n && formData.token && (
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleApprove}
            disabled={!validation.isValid || state === BribeMarketplaceState.CREATING}
            sx={{
              borderRadius: BRIBES_DESIGN_TOKENS.RADIUS_PILL,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '1rem',
              py: 1.5,
              background: 'linear-gradient(135deg, #FF9800 0%, #FF5722 100%)',
              boxShadow: BRIBES_DESIGN_TOKENS.SHADOW_BUTTON,
              '&:hover': {
                background: 'linear-gradient(135deg, #FB8C00 0%, #F4511E 100%)',
              },
            }}
          >
            {getApproveButtonText()}
          </Button>
        )}

        {/* Create Bribe Button */}
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={handleSubmit}
          disabled={isCreateDisabled}
          sx={{
            borderRadius: BRIBES_DESIGN_TOKENS.RADIUS_PILL,
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '1rem',
            py: 1.5,
            background: isCreateDisabled
              ? undefined
              : 'linear-gradient(135deg, #FF9800 0%, #FF5722 100%)',
            boxShadow: isCreateDisabled ? undefined : BRIBES_DESIGN_TOKENS.SHADOW_BUTTON,
            '&:hover': {
              background: isCreateDisabled
                ? undefined
                : 'linear-gradient(135deg, #FB8C00 0%, #F4511E 100%)',
            },
          }}
        >
          {getCreateButtonText()}
        </Button>
      </Box>

      {/* Success Message */}
      {state === BribeMarketplaceState.SUCCESS && (
        <Alert severity="success" sx={{ mt: 3 }}>
          Bribe created successfully! Voters can now claim rewards.
        </Alert>
      )}
    </Card>
  );
};
