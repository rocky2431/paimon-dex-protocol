'use client';

import { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Navigation } from '@/components/layout/Navigation';
import { HealthFactorIndicator } from '@/components/vault/HealthFactorIndicator';
import { useAccount } from 'wagmi';
import { useVaultBorrow } from '@/hooks/useVault';
import { useVaultPosition } from '@/hooks/useVaultPosition';
import { testnet } from '@/config/chains/testnet';
import { parseEther } from 'viem';
import { VAULT_ABI } from '@/config/contracts/vault';
import Link from 'next/link';

/**
 * Borrow USDP Page
 * Allow users to borrow USDP against their collateral
 */
export default function BorrowPage() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const defaultCollateral = testnet.tokens.usdc;
  const position = useVaultPosition(address, defaultCollateral);
  const { writeContract, isPending, isSuccess, isError } = useVaultBorrow();

  // Calculate max borrow amount based on LTV
  const maxBorrowAmount = position.collateralValueUSD && position.debt
    ? (Number(position.collateralValueUSD) * 0.8 - Number(position.debt) / 1e12) / 1e6
    : 0;

  const handleBorrow = async () => {
    try {
      setError('');

      if (!amount || parseFloat(amount) <= 0) {
        setError('Please enter a valid amount');
        return;
      }

      const borrowAmount = parseEther(amount);

      if (parseFloat(amount) > maxBorrowAmount) {
        setError(`Cannot borrow more than ${maxBorrowAmount.toFixed(2)} USDP`);
        return;
      }

      writeContract({
        address: testnet.tokens.vault,
        abi: VAULT_ABI,
        functionName: 'borrow',
        args: [borrowAmount],
      });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleMaxClick = () => {
    setAmount(maxBorrowAmount.toFixed(2));
  };

  if (!isConnected) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
        <Navigation />
        <Container maxWidth="md" sx={{ py: 8 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h5" gutterBottom>
                Connect Your Wallet
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Please connect your wallet to borrow USDP
              </Typography>
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Navigation />

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ mb: 2 }}>
          <Link href="/vault" style={{ textDecoration: 'none', color: '#FF6B35' }}>
            ← Back to Vault
          </Link>
        </Box>

        <Typography variant="h3" sx={{ mb: 4, fontWeight: 'bold' }}>
          Borrow USDP
        </Typography>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Your Position
            </Typography>
            <HealthFactorIndicator
              healthFactor={position.healthFactor}
              isLoading={position.isLoading}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Borrow Amount
            </Typography>

            {position.isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Available to borrow: {maxBorrowAmount.toFixed(2)} USDP
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Based on 80% LTV ratio
                  </Typography>
                </Box>

                <TextField
                  fullWidth
                  label="Amount (USDP)"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  InputProps={{
                    endAdornment: (
                      <Button
                        size="small"
                        onClick={handleMaxClick}
                        sx={{ color: '#FF6B35' }}
                      >
                        MAX
                      </Button>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />

                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                {isSuccess && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Successfully borrowed {amount} USDP!
                  </Alert>
                )}

                {isError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    Transaction failed. Please try again.
                  </Alert>
                )}

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={handleBorrow}
                  disabled={isPending || !amount}
                  sx={{
                    backgroundColor: '#FFA500',
                    '&:hover': { backgroundColor: '#E89400' },
                    py: 1.5,
                  }}
                >
                  {isPending ? <CircularProgress size={24} /> : 'Borrow USDP'}
                </Button>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                  Borrowing USDP will decrease your health factor. Make sure to maintain a healthy
                  position above 1.5.
                </Typography>
              </>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
