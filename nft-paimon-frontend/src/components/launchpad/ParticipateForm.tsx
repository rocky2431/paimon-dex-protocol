'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Divider,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { RWAProject } from '@/types/launchpad';

interface ParticipateFormProps {
  project: RWAProject;
}

/**
 * ParticipateForm Component
 *
 * Investment form with USDC balance check and transaction preview
 *
 * Features:
 * - USDC input with balance display
 * - Min/max contribution validation
 * - Real-time transaction preview
 * - Expected RWA token calculation
 * - Transaction fee estimation
 * - Connect wallet prompt
 * - Loading states for blockchain transactions
 *
 * TODO: Integration points for wagmi hooks:
 * - useAccount() - for wallet connection status
 * - useBalance() - for USDC balance
 * - useReadContract() - for min/max contribution limits
 * - useWriteContract() - for participate() transaction
 */
export function ParticipateForm({ project }: ParticipateFormProps) {
  const [amount, setAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // TODO: Replace with actual wagmi hooks
  // const { address, isConnected } = useAccount();
  // const { data: usdcBalance } = useBalance({ address, token: USDC_ADDRESS });
  // const { data: saleData } = useReadContract({ contract: IssuanceController, function: 'getSale' });
  const isConnected = false; // Mock: wallet not connected
  const usdcBalance = BigInt('10000000000'); // Mock: 10,000 USDC balance (6 decimals)
  const minContribution = BigInt('100000000'); // Mock: 100 USDC min
  const maxContribution = BigInt('50000000000'); // Mock: 50,000 USDC max

  const formatAmount = (value: bigint): string => {
    const usdcAmount = Number(value) / 1_000_000;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(usdcAmount);
  };

  const parseAmount = (value: string): bigint | null => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) return null;
    return BigInt(Math.floor(numValue * 1_000_000));
  };

  const amountBigInt = parseAmount(amount);
  const isValidAmount =
    amountBigInt !== null &&
    amountBigInt >= minContribution &&
    amountBigInt <= maxContribution &&
    amountBigInt <= usdcBalance;

  // Calculate expected RWA tokens (simplified 1:1 ratio for demo)
  // TODO: Replace with actual price oracle calculation
  const expectedRWATokens = amountBigInt ? amountBigInt : BigInt(0);

  // Estimate transaction fee (mock data)
  const estimatedGasFee = '~$5'; // TODO: Get real gas estimation

  const handleMaxClick = () => {
    const maxAmount = usdcBalance < maxContribution ? usdcBalance : maxContribution;
    setAmount((Number(maxAmount) / 1_000_000).toString());
  };

  const handleParticipate = async () => {
    if (!isValidAmount || !amountBigInt) return;

    setIsProcessing(true);
    try {
      // TODO: Implement actual transaction with wagmi
      // const { hash } = await writeContract({
      //   address: ISSUANCE_CONTROLLER_ADDRESS,
      //   abi: IssuanceControllerABI,
      //   functionName: 'participate',
      //   args: [project.id, amountBigInt],
      // });
      // await waitForTransaction({ hash });

      // Mock delay for demo
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setAmount('');
      alert('Participation successful! Transaction submitted.');
    } catch (error) {
      console.error('Participation failed:', error);
      alert('Transaction failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isConnected) {
    return (
      <Card
        sx={{
          borderRadius: 2,
          border: '2px solid #FF6B35',
          backgroundColor: '#FFF8F0',
        }}
      >
        <CardContent>
          <Box textAlign="center" py={3}>
            <AccountBalanceWalletIcon
              sx={{ fontSize: 48, color: '#FF6B35', mb: 2 }}
            />
            <Typography variant="h6" fontWeight="bold" color="#FF6B35" mb={1}>
              Connect Your Wallet
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Connect your wallet to participate in this project
            </Typography>
            <Button
              variant="contained"
              fullWidth
              sx={{
                backgroundColor: '#FF6B35',
                color: 'white',
                fontWeight: 'bold',
                '&:hover': { backgroundColor: '#FF8A65' },
              }}
              onClick={() => {
                // TODO: Trigger wallet connection
              }}
            >
              Connect Wallet
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        borderRadius: 2,
        border: '2px solid #FF6B35',
        backgroundColor: '#FFFFFF',
      }}
    >
      <CardContent>
        <Typography variant="h6" fontWeight="bold" color="#FF6B35" mb={3}>
          Participate in Project
        </Typography>

        {/* Balance Display */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
          p={2}
          sx={{
            backgroundColor: '#FFF8F0',
            borderRadius: 2,
            border: '1px solid #FFE0B2',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Your USDC Balance
          </Typography>
          <Typography variant="body1" fontWeight="bold" color="#FF6B35">
            {formatAmount(usdcBalance)}
          </Typography>
        </Box>

        {/* Amount Input */}
        <TextField
          fullWidth
          label="Investment Amount"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Typography color="text.secondary">USDC</Typography>
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Button
                  size="small"
                  onClick={handleMaxClick}
                  sx={{
                    color: '#FF6B35',
                    fontWeight: 'bold',
                    minWidth: 'auto',
                  }}
                >
                  MAX
                </Button>
              </InputAdornment>
            ),
          }}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              '&.Mui-focused fieldset': {
                borderColor: '#FF6B35',
              },
            },
          }}
        />

        {/* Min/Max Info */}
        <Alert
          severity="info"
          icon={<InfoOutlinedIcon />}
          sx={{ mb: 3, backgroundColor: '#FFF8F0', color: 'text.primary' }}
        >
          Min: {formatAmount(minContribution)} • Max: {formatAmount(maxContribution)}
        </Alert>

        {/* Validation Errors */}
        {amount && amountBigInt && amountBigInt < minContribution && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Amount is below minimum contribution of {formatAmount(minContribution)}
          </Alert>
        )}
        {amount && amountBigInt && amountBigInt > maxContribution && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Amount exceeds maximum contribution of {formatAmount(maxContribution)}
          </Alert>
        )}
        {amount && amountBigInt && amountBigInt > usdcBalance && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Insufficient USDC balance
          </Alert>
        )}

        <Divider sx={{ my: 3, borderColor: '#FFE0B2' }} />

        {/* Transaction Preview */}
        <Typography variant="subtitle2" fontWeight="bold" color="text.primary" mb={2}>
          Transaction Preview
        </Typography>

        <Box mb={3}>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2" color="text.secondary">
              You pay
            </Typography>
            <Typography variant="body2" fontWeight="600">
              {amountBigInt ? formatAmount(amountBigInt) : '$0'}
            </Typography>
          </Box>

          <Box display="flex" justifyContent="center" my={1}>
            <SwapHorizIcon sx={{ color: '#FFB74D' }} />
          </Box>

          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2" color="text.secondary">
              You receive (estimated)
            </Typography>
            <Typography variant="body2" fontWeight="600" color="#FF6B35">
              {expectedRWATokens ? (Number(expectedRWATokens) / 1e6).toFixed(2) : '0'} RWA
            </Typography>
          </Box>

          <Box display="flex" justifyContent="space-between" mt={2}>
            <Typography variant="caption" color="text.secondary">
              Estimated gas fee
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {estimatedGasFee}
            </Typography>
          </Box>
        </Box>

        {/* Participate Button */}
        <Button
          variant="contained"
          fullWidth
          disabled={!isValidAmount || isProcessing}
          onClick={handleParticipate}
          sx={{
            backgroundColor: '#FF6B35',
            color: 'white',
            fontWeight: 'bold',
            py: 1.5,
            '&:hover': { backgroundColor: '#FF8A65' },
            '&:disabled': {
              backgroundColor: '#E0E0E0',
              color: '#9E9E9E',
            },
          }}
        >
          {isProcessing ? (
            <CircularProgress size={24} sx={{ color: 'white' }} />
          ) : (
            'Participate Now'
          )}
        </Button>

        {/* Disclaimer */}
        <Alert
          severity="warning"
          icon={<InfoOutlinedIcon />}
          sx={{ mt: 3, backgroundColor: '#FFF8F0' }}
        >
          <Typography variant="caption">
            Please review all compliance documents before participating. Participation
            is subject to eligibility requirements and regulatory compliance.
          </Typography>
        </Alert>
      </CardContent>
    </Card>
  );
}
