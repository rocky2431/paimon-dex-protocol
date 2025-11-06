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
import { useVaultRepay } from '@/hooks/useVault';
import { useVaultPosition } from '@/hooks/useVaultPosition';
import { testnet } from '@/config/chains/testnet';
import { parseEther, formatEther } from 'viem';
import { VAULT_ABI } from '@/config/contracts/vault';
import Link from 'next/link';

/**
 * Repay USDP Page
 * Allow users to repay their USDP debt
 */
export default function RepayPage() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const defaultCollateral = testnet.tokens.usdc;
  const position = useVaultPosition(address, defaultCollateral);
  const { writeContract, isPending, isSuccess, isError } = useVaultRepay();

  // Get current debt amount
  const currentDebt = position.debt ? Number(formatEther(position.debt)) : 0;

  const handleRepay = async () => {
    try {
      setError('');

      if (!amount || parseFloat(amount) <= 0) {
        setError('Please enter a valid amount');
        return;
      }

      const repayAmount = parseEther(amount);

      if (parseFloat(amount) > currentDebt) {
        setError(`Cannot repay more than current debt: ${currentDebt.toFixed(2)} USDP`);
        return;
      }

      writeContract({
        address: testnet.tokens.vault,
        abi: VAULT_ABI,
        functionName: 'repay',
        args: [repayAmount],
      });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleMaxClick = () => {
    setAmount(currentDebt.toFixed(2));
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
                Please connect your wallet to repay USDP debt
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
          Repay USDP Debt
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
              Repayment Amount
            </Typography>

            {position.isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Current debt: {currentDebt.toFixed(2)} USDP
                  </Typography>
                  {currentDebt === 0 && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      You have no outstanding debt to repay.
                    </Alert>
                  )}
                </Box>

                {currentDebt > 0 && (
                  <>
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
                        Successfully repaid {amount} USDP!
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
                      onClick={handleRepay}
                      disabled={isPending || !amount}
                      sx={{
                        backgroundColor: '#FFA500',
                        '&:hover': { backgroundColor: '#E89400' },
                        py: 1.5,
                      }}
                    >
                      {isPending ? <CircularProgress size={24} /> : 'Repay USDP'}
                    </Button>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mt: 2 }}
                    >
                      Repaying USDP will increase your health factor and reduce liquidation risk.
                    </Typography>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
