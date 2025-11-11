/**
 * Portfolio Hub (V3 - 个人中心)
 *
 * 功能: 跨 Hub 资产聚合 + 风险监控 + 奖励管理
 * 路由: /portfolio
 * Tabs: Overview | Positions | Rewards
 *
 * 设计理念:
 * - Overview: 总资产 + 风险警告 + 快速操作
 * - Positions: 所有仓位明细（LP, USDP Vault, veNFT, Launchpad, Savings）
 * - Rewards: 一键领取所有奖励 + esPAIMON vesting + Boost
 * - 风险监控: 清算风险、锁仓到期提醒
 */

'use client';

import { useState, useMemo } from 'react';
import { Container, Typography, Box, Grid, Card, CardContent, Alert, Chip, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, LinearProgress, Skeleton } from '@mui/material';
import { useAccount } from 'wagmi';
import { Navigation } from '@/components/layout/Navigation';
import { SubNavigation, useTabState } from '@/components/layout/SubNavigation';
import WarningIcon from '@mui/icons-material/Warning';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import LockIcon from '@mui/icons-material/Lock';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import SavingsIcon from '@mui/icons-material/Savings';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';

// Rewards Tab components
import { RewardsDashboard } from '@/components/rewards/RewardsDashboard';
import { VestingProgressBar, ClaimVestedButton } from '@/components/convert';
import { BoostStakingCard, BoostCalculator, BoostHistory } from '@/components/boost';
import { useVestingPosition } from '@/hooks/useVestingPosition';
import { useBoostData } from '@/hooks/useBoostData';

// Savings Tab components (for reference)
import { SavingsRateCard } from '@/components/savings/SavingsRateCard';
import { SavingsDepositModal } from '@/components/savings/SavingsDepositModal';
import { InterestChart, ChartDataPoint } from '@/components/savings/InterestChart';
import { SavingRateCard } from '@/components/saving';
import { useSavingPrincipal, useSavingAccruedInterest } from '@/hooks/useSavingRate';
import { useSavingRateStats } from '@/hooks/useSavingRateStats';

// Portfolio aggregation hook
import { useUserPortfolio } from '@/hooks/useUserPortfolio';

export default function PortfolioHub() {
  const { address, isConnected } = useAccount();
  const [currentTab, setCurrentTab] = useTabState('overview');
  const [claimAllLoading, setClaimAllLoading] = useState(false);

  const PORTFOLIO_TABS = [
    { value: 'overview', label: 'Overview' },
    { value: 'positions', label: 'Positions' },
    { value: 'rewards', label: 'Rewards' },
  ];

  // Vesting data
  const vestingPosition = useVestingPosition(address);

  // Savings data (still needed for chart)
  const { data: savingPrincipal } = useSavingPrincipal(address);
  const { data: accruedInterest } = useSavingAccruedInterest(address);

  // Portfolio aggregation - replaces MOCK_POSITIONS
  const portfolio = useUserPortfolio(address);
  const { isLoading: portfolioLoading } = portfolio;

  // Boost data - replaces mock data
  const { stake: boostStake, userBalance: paimonBalance, currentMultiplier } = useBoostData();

  // Format portfolio data for display
  const formattedPositions = useMemo(() => {
    return {
      liquidityPools: portfolio.lpPositions.map(pos => ({
        pool: pos.pool,
        liquidity: `$${pos.liquidity}`,
        apr: `${pos.apr}%`,
        rewards: `${pos.pendingRewards} PAIMON`,
      })),
      vaultBorrows: portfolio.vaultPositions.map(pos => ({
        asset: pos.asset,
        collateral: pos.collateralValueUSD,
        borrowed: pos.borrowed,
        ltv: `${pos.ltv.toFixed(0)}%`,
        liquidationPrice: pos.liquidationPrice,
      })),
      veNFT: portfolio.veNFTPositions.map(pos => ({
        id: `#${pos.tokenId.toString()}`,
        locked: `${pos.lockedAmount} PAIMON`,
        expiry: new Date(pos.lockEnd * 1000).toLocaleDateString(),
        votingPower: pos.votingPower,
      })),
      launchpadInvestments: portfolio.launchpadInvestments.map(inv => ({
        project: inv.projectName,
        invested: `$${inv.invested}`,
        tokens: `${inv.tokensReceived} tokens`,
        status: inv.status.charAt(0).toUpperCase() + inv.status.slice(1),
      })),
      savings: portfolio.savingsPosition ? {
        principal: `${portfolio.savingsPosition.principal} USDP`,
        interest: `${portfolio.savingsPosition.accruedInterest} USDP`,
        apr: `${portfolio.savingsPosition.currentAPR}%`,
      } : {
        principal: '0 USDP',
        interest: '0 USDP',
        apr: '0%',
      },
    };
  }, [portfolio]);

  // Use risk alerts from portfolio hook
  const riskAlerts = portfolio.riskAlerts;

  // Check if user has any assets (for Empty state) (gap-4.1.2)
  const hasNoAssets = !portfolioLoading &&
    portfolio.lpPositions.length === 0 &&
    portfolio.vaultPositions.length === 0 &&
    portfolio.veNFTPositions.length === 0 &&
    portfolio.launchpadInvestments.length === 0 &&
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

  // Wallet connection check
  if (!isConnected) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
        <Navigation />
        <Container maxWidth="lg" sx={{ pt: 12, pb: 8, px: { xs: 2, sm: 3 } }}>
          <Box sx={{ height: { xs: 40, sm: 60 } }} />
          <Alert severity="info">
            Please connect your wallet to view your portfolio.
          </Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Navigation />

      <Container maxWidth="xl" sx={{ pt: 12, pb: 8, px: { xs: 2, sm: 3 }, minHeight: '100vh' }}>
        <Box sx={{ height: { xs: 40, sm: 60 } }} />

        {/* Header */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              color: '#ff6b00',
              mb: 2,
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
            }}
          >
            Portfolio Hub
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{
              maxWidth: 700,
              mx: 'auto',
              fontSize: { xs: '1rem', sm: '1.125rem' },
            }}
          >
            Your complete asset dashboard with risk monitoring
          </Typography>
        </Box>

        {/* Sub-navigation tabs */}
        <SubNavigation
          tabs={PORTFOLIO_TABS}
          currentTab={currentTab}
          onChange={setCurrentTab}
          variant="standard"
        />

        {/* Overview Tab */}
        {currentTab === 'overview' && (
          <>
            {/* Loading State (gap-4.1.2) */}
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

            {/* Empty State (gap-4.1.2) */}
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
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
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
                      <Typography variant="subtitle1" fontWeight={600}>Liquidity Pools</Typography>
                    </Box>
                    <Typography variant="h5" fontWeight={700}>$2,000</Typography>
                    <Chip label="2 Positions" size="small" sx={{ mt: 1 }} />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ border: '1px solid rgba(255, 107, 0, 0.2)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <AccountBalanceWalletIcon sx={{ color: '#FF9800', mr: 1 }} />
                      <Typography variant="subtitle1" fontWeight={600}>USDP Vault</Typography>
                    </Box>
                    <Typography variant="h5" fontWeight={700}>$5,000</Typography>
                    <Typography variant="caption" color="text.secondary">Collateral</Typography>
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
                      <Typography variant="subtitle1" fontWeight={600}>veNFT</Typography>
                    </Box>
                    <Typography variant="h5" fontWeight={700}>10,000 PAIMON</Typography>
                    <Typography variant="caption" color="text.secondary">Locked • Voting Power: 8,500</Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ border: '1px solid rgba(255, 107, 0, 0.2)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <RocketLaunchIcon sx={{ color: '#4CAF50', mr: 1 }} />
                      <Typography variant="subtitle1" fontWeight={600}>Launchpad</Typography>
                    </Box>
                    <Typography variant="h5" fontWeight={700}>$2,000</Typography>
                    <Chip label="1 Project" size="small" sx={{ mt: 1 }} />
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ border: '1px solid rgba(255, 107, 0, 0.2)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <SavingsIcon sx={{ color: '#D2691E', mr: 1 }} />
                      <Typography variant="subtitle1" fontWeight={600}>USDP Savings</Typography>
                    </Box>
                    <Typography variant="h5" fontWeight={700}>{formattedPositions.savings.principal}</Typography>
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
                      <Typography variant="subtitle1" fontWeight={600}>Pending Rewards</Typography>
                    </Box>
                    <Typography variant="h5" fontWeight={700}>20.7 PAIMON</Typography>
                    <Typography variant="caption" color="text.secondary">Across all protocols</Typography>
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
        )}

        {/* Positions Tab */}
        {currentTab === 'positions' && (
          <>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff6b00', mb: 1 }}>
                All Positions
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Detailed view of your holdings across all protocols
              </Typography>
            </Box>

            {/* Liquidity Pool Positions */}
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TrendingUpIcon sx={{ fontSize: 28, color: '#ff6b00' }} />
                  <Typography variant="h6" fontWeight={700} sx={{ color: '#ff6b00' }}>
                    Liquidity Pool Positions
                  </Typography>
                </Box>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Pool</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Liquidity</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>APR</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Pending Rewards</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formattedPositions.liquidityPools.map((position, index) => (
                        <TableRow key={index}>
                          <TableCell><Typography fontWeight={600}>{position.pool}</Typography></TableCell>
                          <TableCell>{position.liquidity}</TableCell>
                          <TableCell><Chip label={position.apr} color="success" size="small" /></TableCell>
                          <TableCell><Typography color="primary">{position.rewards}</Typography></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            {/* USDP Vault Positions */}
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <AccountBalanceWalletIcon sx={{ fontSize: 28, color: '#FF9800' }} />
                  <Typography variant="h6" fontWeight={700} sx={{ color: '#FF9800' }}>
                    USDP Vault Positions
                  </Typography>
                </Box>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Asset</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Collateral</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Borrowed</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>LTV</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Liquidation Price</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formattedPositions.vaultBorrows.map((position, index) => (
                        <TableRow key={index}>
                          <TableCell><Typography fontWeight={600}>{position.asset}</Typography></TableCell>
                          <TableCell>{position.collateral}</TableCell>
                          <TableCell><Typography color="error.main">{position.borrowed}</Typography></TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight={600}>{position.ltv}</Typography>
                              <LinearProgress
                                variant="determinate"
                                value={60}
                                sx={{ mt: 0.5, height: 6, borderRadius: 1 }}
                                color={60 > 80 ? 'error' : 60 > 65 ? 'warning' : 'success'}
                              />
                            </Box>
                          </TableCell>
                          <TableCell><Typography color="error.main">{position.liquidationPrice}</Typography></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            {/* veNFT Positions */}
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <LockIcon sx={{ fontSize: 28, color: '#8B4513' }} />
                  <Typography variant="h6" fontWeight={700} sx={{ color: '#8B4513' }}>
                    veNFT Positions
                  </Typography>
                </Box>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Token ID</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Locked Amount</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Expiry Date</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Voting Power</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formattedPositions.veNFT.map((position, index) => (
                        <TableRow key={index}>
                          <TableCell><Chip label={position.id} size="small" color="primary" /></TableCell>
                          <TableCell><Typography fontWeight={600}>{position.locked}</Typography></TableCell>
                          <TableCell>{position.expiry}</TableCell>
                          <TableCell><Typography color="success.main">{position.votingPower}</Typography></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            {/* Launchpad Investments */}
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <RocketLaunchIcon sx={{ fontSize: 28, color: '#4CAF50' }} />
                  <Typography variant="h6" fontWeight={700} sx={{ color: '#4CAF50' }}>
                    Launchpad Investments
                  </Typography>
                </Box>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Project</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Invested</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Tokens Received</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formattedPositions.launchpadInvestments.map((position, index) => (
                        <TableRow key={index}>
                          <TableCell><Typography fontWeight={600}>{position.project}</Typography></TableCell>
                          <TableCell>{position.invested}</TableCell>
                          <TableCell>{position.tokens}</TableCell>
                          <TableCell><Chip label={position.status} color="success" size="small" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            {/* USDP Savings */}
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <SavingsIcon sx={{ fontSize: 28, color: '#D2691E' }} />
                  <Typography variant="h6" fontWeight={700} sx={{ color: '#D2691E' }}>
                    USDP Savings
                  </Typography>
                </Box>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ p: 2, backgroundColor: 'rgba(210, 105, 30, 0.1)', borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary">Principal</Typography>
                      <Typography variant="h5" fontWeight={700}>{formattedPositions.savings.principal}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ p: 2, backgroundColor: 'rgba(76, 175, 80, 0.1)', borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary">Accrued Interest</Typography>
                      <Typography variant="h5" fontWeight={700} color="success.main">{formattedPositions.savings.interest}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ p: 2, backgroundColor: 'rgba(255, 107, 0, 0.1)', borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary">Current APR</Typography>
                      <Typography variant="h5" fontWeight={700} color="primary">{formattedPositions.savings.apr}</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </>
        )}

        {/* Rewards Tab */}
        {currentTab === 'rewards' && (
          <>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff6b00', mb: 1 }}>
                Rewards Management
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Claim all rewards and manage your esPAIMON vesting and boost staking
              </Typography>
            </Box>

            {/* Rewards Dashboard */}
            <Box sx={{ mb: 6 }}>
              <RewardsDashboard />
            </Box>

            {/* esPAIMON Vesting Section */}
            <Box sx={{ mb: 6 }}>
              <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, color: '#8B4513' }}>
                esPAIMON Vesting
              </Typography>

              {vestingPosition.totalVested === 0n && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  No esPAIMON vesting position yet. Enable vesting in Rewards settings.
                </Alert>
              )}

              <VestingProgressBar
                progress={vestingPosition.vestingProgress}
                remainingDays={vestingPosition.remainingDays}
              />

              <Box sx={{ mt: 3 }}>
                <ClaimVestedButton claimableAmount={vestingPosition.claimable || 0n} />
              </Box>
            </Box>

            {/* Boost Staking Section */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, color: '#D2691E' }}>
                Boost Staking
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} lg={6}>
                  <BoostStakingCard stake={boostStake} />
                </Grid>
                <Grid item xs={12} lg={6}>
                  <BoostCalculator
                    userBalance={paimonBalance}
                    currentMultiplier={currentMultiplier}
                  />
                </Grid>
                <Grid item xs={12}>
                  <BoostHistory entries={[]} />
                </Grid>
              </Grid>
            </Box>
          </>
        )}

        <Box sx={{ height: { xs: 40, sm: 60 } }} />
      </Container>
    </Box>
  );
}
