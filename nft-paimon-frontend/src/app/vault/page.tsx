'use client';

import { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  CircularProgress,
} from '@mui/material';
import { Navigation } from '@/components/layout/Navigation';
import { HealthFactorIndicator } from '@/components/vault/HealthFactorIndicator';
import { useAccount } from 'wagmi';
import { useVaultPosition } from '@/hooks/useVaultPosition';
import { testnet } from '@/config/chains/testnet';
import Link from 'next/link';
import { formatEther } from 'viem';

/**
 * Vault Main Page
 * Display user's vault position and provide quick actions
 *
 * Features:
 * - Position overview (collateral, debt, health factor)
 * - Quick actions (deposit, withdraw, borrow, repay)
 * - Health factor monitoring with risk indicators
 */
export default function VaultPage() {
  const { address, isConnected } = useAccount();

  // For MVP, using a default collateral address (TODO: Add collateral selector)
  // This should be the address of a supported RWA token
  const defaultCollateral = testnet.tokens.usdc; // Placeholder

  const position = useVaultPosition(address, defaultCollateral);

  if (!isConnected) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
        <Navigation />
        <Container maxWidth="lg" sx={{ py: 8 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h5" gutterBottom>
                Connect Your Wallet
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Please connect your wallet to view your vault position
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

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h3" sx={{ mb: 4, fontWeight: 'bold' }}>
          Vault Position
        </Typography>

        <Grid container spacing={3}>
          {/* Position Overview Card */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Position Overview
                </Typography>

                {position.isLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        Collateral Balance
                      </Typography>
                      <Typography variant="h5" sx={{ color: '#FF6B35' }}>
                        {position.collateralBalance
                          ? formatEther(position.collateralBalance)
                          : '0.00'}{' '}
                        RWA
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        Collateral Value (USD)
                      </Typography>
                      <Typography variant="h5" sx={{ color: '#FFA500' }}>
                        $
                        {position.collateralValueUSD
                          ? (Number(position.collateralValueUSD) / 1e6).toFixed(2)
                          : '0.00'}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        Debt (USDP)
                      </Typography>
                      <Typography variant="h5" sx={{ color: '#FF4500' }}>
                        {position.debt ? formatEther(position.debt) : '0.00'} USDP
                      </Typography>
                    </Box>

                    {position.debt && position.debt > BigInt(0) && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Available to Borrow
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#32CD32' }}>
                          {position.collateralValueUSD && position.debt
                            ? (
                                Number(position.collateralValueUSD) * 0.8 -
                                Number(position.debt) / 1e12
                              ).toFixed(2)
                            : '0.00'}{' '}
                          USDP
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Based on 80% LTV
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Health Factor Card */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Health Factor
                </Typography>
                <HealthFactorIndicator
                  healthFactor={position.healthFactor}
                  isLoading={position.isLoading}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Quick Actions */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={6} sm={3}>
                    <Button
                      variant="contained"
                      fullWidth
                      sx={{
                        backgroundColor: '#FF6B35',
                        '&:hover': { backgroundColor: '#E85A2A' },
                      }}
                      disabled
                    >
                      Deposit
                    </Button>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Button
                      variant="outlined"
                      fullWidth
                      sx={{
                        borderColor: '#FF6B35',
                        color: '#FF6B35',
                        '&:hover': {
                          borderColor: '#E85A2A',
                          backgroundColor: 'rgba(255, 107, 53, 0.04)',
                        },
                      }}
                      disabled
                    >
                      Withdraw
                    </Button>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Link href="/vault/borrow" passHref style={{ textDecoration: 'none' }}>
                      <Button
                        variant="contained"
                        fullWidth
                        sx={{
                          backgroundColor: '#FFA500',
                          '&:hover': { backgroundColor: '#E89400' },
                        }}
                      >
                        Borrow
                      </Button>
                    </Link>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Link href="/vault/repay" passHref style={{ textDecoration: 'none' }}>
                      <Button
                        variant="outlined"
                        fullWidth
                        sx={{
                          borderColor: '#FFA500',
                          color: '#FFA500',
                          '&:hover': {
                            borderColor: '#E89400',
                            backgroundColor: 'rgba(255, 165, 0, 0.04)',
                          },
                        }}
                      >
                        Repay
                      </Button>
                    </Link>
                  </Grid>
                </Grid>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                  Note: Deposit/Withdraw functionality coming soon. Borrow and Repay are available.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
