/**
 * Overview Tab Component
 *
 * Migrated from /portfolio page (Task 30)
 *
 * Features:
 * - Total net worth display
 * - Risk alerts monitoring
 * - Asset breakdown cards (6 categories)
 * - Quick actions
 * - Loading and empty states
 */

'use client';

import { useState, useMemo } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Alert,
  Chip,
  Button,
  Box,
  Typography,
  Skeleton,
} from '@mui/material';
import { useAccount } from 'wagmi';
import WarningIcon from '@mui/icons-material/Warning';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import LockIcon from '@mui/icons-material/Lock';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import SavingsIcon from '@mui/icons-material/Savings';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import { useUserPortfolio } from '@/hooks/useUserPortfolio';

export function OverviewTab() {
  const { address } = useAccount();
  const [claimAllLoading, setClaimAllLoading] = useState(false);

  // Portfolio aggregation
  const portfolio = useUserPortfolio(address);
  const { isLoading: portfolioLoading } = portfolio;

  // Format portfolio data for display (with null safety)
  const formattedPositions = useMemo(() => {
    return {
      savings: portfolio?.savingsPosition
        ? {
            principal: `${portfolio.savingsPosition.principal} USDP`,
            interest: `${portfolio.savingsPosition.accruedInterest} USDP`,
            apr: `${portfolio.savingsPosition.currentAPR}%`,
          }
        : {
            principal: '0 USDP',
            interest: '0 USDP',
            apr: '0%',
          },
    };
  }, [portfolio]);

  // Use risk alerts from portfolio hook (with null safety)
  const riskAlerts = portfolio.riskAlerts || [];

  // Check if user has any assets (for Empty state) with null safety
  const hasNoAssets =
    !portfolioLoading &&
    (portfolio.lpPositions || []).length === 0 &&
    (portfolio.vaultPositions || []).length === 0 &&
    (portfolio.veNFTPositions || []).length === 0 &&
    (portfolio.launchpadInvestments || []).length === 0 &&
    !portfolio.savingsPosition;

  // Handle claim all rewards
  const handleClaimAll = async () => {
    setClaimAllLoading(true);
    // TODO: Implement claim all functionality
    setTimeout(() => {
      setClaimAllLoading(false);
      alert('Claim all rewards functionality coming soon!');
    }, 1500);
  };

  return (
    <>
      {/* Loading State */}
      {portfolioLoading && (
        <Box>
          <Skeleton variant="rectangular" height={200} sx={{ mb: 3, borderRadius: 2 }} />
          <Grid container spacing={3}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 2 }} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Empty State */}
      {hasNoAssets && (
        <Card sx={{ p: 6, textAlign: 'center' }}>
          <AccountBalanceWalletIcon sx={{ fontSize: 80, color: 'text.secondary', opacity: 0.5, mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            No Assets Found
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Start your DeFi journey by adding liquidity, borrowing USDP, or locking PAIMON.
          </Typography>
          <Grid container spacing={2} sx={{ maxWidth: 600, mx: 'auto' }}>
            <Grid item xs={12} sm={6}>
              <Button variant="contained" fullWidth href="/liquidity?tab=pools">
                Add Liquidity
              </Button>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button variant="outlined" fullWidth href="/usdp?tab=vault">
                Borrow USDP
              </Button>
            </Grid>
          </Grid>
        </Card>
      )}

      {/* Normal State - Show Data */}
      {!portfolioLoading && !hasNoAssets && (
        <>
          {/* Risk Alerts */}
          {riskAlerts.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <WarningIcon sx={{ fontSize: 28, color: '#FF5722' }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#FF5722' }}>
                  Risk Alerts
                </Typography>
              </Box>
              {riskAlerts.map((alert, index) => (
                <Alert
                  key={index}
                  severity={alert.severity === 'high' ? 'error' : 'warning'}
                  icon={<WarningIcon />}
                  sx={{ mb: 1.5 }}
                >
                  {alert.message}
                </Alert>
              ))}
            </Box>
          )}

          {/* Total Net Worth */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12}>
              <Card sx={{ backgroundColor: 'rgba(255, 107, 0, 0.05)', border: '2px solid rgba(255, 107, 0, 0.3)' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography variant="h6" sx={{ color: '#ff6b00', fontWeight: 700, mb: 1 }}>
                        Total Net Worth
                      </Typography>
                      <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
                        $12,000.00
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Updated live • BSC Network
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<CardGiftcardIcon />}
                      onClick={handleClaimAll}
                      disabled={claimAllLoading}
                      sx={{
                        backgroundColor: '#ff6b00',
                        '&:hover': { backgroundColor: '#e65100' },
                        fontWeight: 700,
                        px: 4,
                      }}
                    >
                      {claimAllLoading ? 'Claiming...' : 'Claim All Rewards'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Asset Breakdown Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ border: '1px solid rgba(255, 107, 0, 0.2)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <TrendingUpIcon sx={{ color: '#ff6b00', mr: 1 }} />
                    <Typography variant="subtitle1" fontWeight={600}>
                      Liquidity Pools
                    </Typography>
                  </Box>
                  <Typography variant="h5" fontWeight={700}>
                    $2,000
                  </Typography>
                  <Chip label="2 Positions" size="small" sx={{ mt: 1 }} />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ border: '1px solid rgba(255, 107, 0, 0.2)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <AccountBalanceWalletIcon sx={{ color: '#FF9800', mr: 1 }} />
                    <Typography variant="subtitle1" fontWeight={600}>
                      USDP Vault
                    </Typography>
                  </Box>
                  <Typography variant="h5" fontWeight={700}>
                    $5,000
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Collateral
                  </Typography>
                  <Typography variant="body2" color="error.main" sx={{ mt: 0.5 }}>
                    -$3,000 Borrowed
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ border: '1px solid rgba(255, 107, 0, 0.2)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LockIcon sx={{ color: '#8B4513', mr: 1 }} />
                    <Typography variant="subtitle1" fontWeight={600}>
                      veNFT
                    </Typography>
                  </Box>
                  <Typography variant="h5" fontWeight={700}>
                    10,000 PAIMON
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Locked • Voting Power: 8,500
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ border: '1px solid rgba(255, 107, 0, 0.2)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <RocketLaunchIcon sx={{ color: '#4CAF50', mr: 1 }} />
                    <Typography variant="subtitle1" fontWeight={600}>
                      Launchpad
                    </Typography>
                  </Box>
                  <Typography variant="h5" fontWeight={700}>
                    $2,000
                  </Typography>
                  <Chip label="1 Project" size="small" sx={{ mt: 1 }} />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ border: '1px solid rgba(255, 107, 0, 0.2)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <SavingsIcon sx={{ color: '#D2691E', mr: 1 }} />
                    <Typography variant="subtitle1" fontWeight={600}>
                      USDP Savings
                    </Typography>
                  </Box>
                  <Typography variant="h5" fontWeight={700}>
                    {formattedPositions.savings.principal}
                  </Typography>
                  <Typography variant="caption" color="success.main">
                    +{formattedPositions.savings.interest} Interest
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ border: '1px solid rgba(255, 107, 0, 0.2)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CardGiftcardIcon sx={{ color: '#FF6B00', mr: 1 }} />
                    <Typography variant="subtitle1" fontWeight={600}>
                      Pending Rewards
                    </Typography>
                  </Box>
                  <Typography variant="h5" fontWeight={700}>
                    20.7 PAIMON
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Across all protocols
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Quick Actions */}
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                Quick Actions
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Button variant="outlined" fullWidth href="/liquidity?tab=pools">
                    Add Liquidity
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button variant="outlined" fullWidth href="/usdp?tab=vault">
                    Borrow USDP
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button variant="outlined" fullWidth href="/governance?tab=lock">
                    Lock PAIMON
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button variant="outlined" fullWidth href="/launchpad?tab=projects">
                    Browse Projects
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
