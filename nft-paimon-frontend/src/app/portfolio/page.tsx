/**
 * Portfolio Page (V3 - 扁平化架构)
 *
 * 功能: 个人资产管理中心
 * 路由: /portfolio
 * Tabs: Overview (资产总览) | Rewards (奖励管理) | Savings (储蓄理财)
 *
 * 设计理念:
 * - Overview: 一目了然的资产仪表板
 * - Rewards: 合并Convert(esPaimon归属) + Boost(质押倍数) + 奖励领取
 * - Savings: USDP储蓄利率
 * - 统一入口: 个人资产全景视图，减少页面跳转
 */

'use client';

import { useState, useMemo } from 'react';
import { Container, Typography, Box, Grid, Card, CardContent, Alert } from '@mui/material';
import { useAccount } from 'wagmi';
import { Navigation } from '@/components/layout/Navigation';
import { SubNavigation, useTabState } from '@/components/layout/SubNavigation';

// Rewards Tab components
import { RewardsDashboard } from '@/components/rewards/RewardsDashboard';
import { VestingProgressBar } from '@/components/convert';
import { ClaimVestedButton } from '@/components/convert';
import { BoostStakingCard, BoostStakeModal, BoostUnstakeButton, BoostCalculator, BoostHistory } from '@/components/boost';
import { useVestingPosition } from '@/hooks/useVestingPosition';

// Savings Tab components
import { SavingsRateCard } from '@/components/savings/SavingsRateCard';
import { SavingsDepositModal } from '@/components/savings/SavingsDepositModal';
import { InterestChart, ChartDataPoint } from '@/components/savings/InterestChart';
import { SavingRateCard } from '@/components/saving';
import { useSavingPrincipal, useSavingAccruedInterest } from '@/hooks/useSavingRate';
import { useSavingRateStats } from '@/hooks/useSavingRateStats';

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const [currentTab, setCurrentTab] = useTabState('overview');
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [boostStakeModalOpen, setBoostStakeModalOpen] = useState(false);

  const PORTFOLIO_TABS = [
    { value: 'overview', label: 'Overview' },
    { value: 'rewards', label: 'Rewards' },
    { value: 'savings', label: 'Savings' },
  ];

  // Rewards Tab - Vesting data
  const vestingPosition = useVestingPosition(address);

  // Savings Tab - Data
  const { data: savingPrincipal } = useSavingPrincipal(address);
  const { data: accruedInterest } = useSavingAccruedInterest(address);
  const savingRateStats = useSavingRateStats();

  // Generate mock savings historical data
  const savingsHistoricalData = useMemo<ChartDataPoint[]>(() => {
    const now = Date.now();
    const data: ChartDataPoint[] = [];
    for (let i = 29; i >= 0; i--) {
      const timestamp = now - i * 24 * 60 * 60 * 1000;
      const apr = 2.3 + Math.sin(i / 5) * 0.3 + Math.random() * 0.1;
      const daysSinceStart = 29 - i;
      const dailyRate = apr / 100 / 365;
      const principalAmount = savingPrincipal ? Number(savingPrincipal) / 1e18 : 1000;
      const interest = principalAmount * dailyRate * (daysSinceStart + 1);
      data.push({
        timestamp,
        apr: Number(apr.toFixed(2)),
        interest: Number(interest.toFixed(2)),
      });
    }
    return data;
  }, [savingPrincipal]);

  const handleSavingsDepositClick = () => {
    setDepositModalOpen(true);
  };

  const handleBoostStakeClick = () => {
    setBoostStakeModalOpen(true);
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

      <Container
        maxWidth="xl"
        sx={{
          pt: 12,
          pb: 8,
          px: { xs: 2, sm: 3 },
          minHeight: '100vh',
        }}
      >
        <Box sx={{ height: { xs: 40, sm: 60 } }} />

        {/* Sub-navigation tabs */}
        <SubNavigation
          tabs={PORTFOLIO_TABS}
          currentTab={currentTab}
          onChange={setCurrentTab}
          variant="standard"
        />

        {/* Overview Tab Content */}
        {currentTab === 'overview' && (
          <>
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
                Portfolio Overview
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
                Your complete asset dashboard
              </Typography>
            </Box>

            <Grid container spacing={3}>
              {/* Total Net Worth Card */}
              <Grid item xs={12}>
                <Card sx={{ borderRadius: 2, border: '1px solid rgba(255,107,0,0.3)' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, color: '#ff6b00', fontWeight: 700 }}>
                      Total Net Worth
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      $0.00
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Updated live • BSC Network
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Asset Breakdown */}
              <Grid item xs={12} md={4}>
                <Card sx={{ borderRadius: 2, border: '1px solid rgba(255,107,0,0.2)' }}>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                      Liquidity Positions
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      $0.00
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card sx={{ borderRadius: 2, border: '1px solid rgba(255,107,0,0.2)' }}>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                      Borrowing Positions
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      $0.00
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card sx={{ borderRadius: 2, border: '1px solid rgba(255,107,0,0.2)' }}>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                      Pending Rewards
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      $0.00
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Alert severity="info" sx={{ mt: 4 }}>
              📊 Portfolio Overview is under construction. Full analytics dashboard coming soon!
            </Alert>
          </>
        )}

        {/* Rewards Tab Content */}
        {currentTab === 'rewards' && (
          <>
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
                Rewards Management
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
                Claim rewards, convert esPAIMON, and boost earnings
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
                  You don&apos;t have any esPAIMON vesting position yet. Enable vesting in Rewards settings.
                </Alert>
              )}

              <VestingProgressBar
                progress={vestingPosition.vestingProgress}
                remainingDays={vestingPosition.remainingDays}
              />

              <Box sx={{ mt: 3 }}>
                <ClaimVestedButton />
              </Box>
            </Box>

            {/* Boost Staking Section */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, color: '#D2691E' }}>
                Boost Staking
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} lg={6}>
                  <BoostStakingCard onStakeClick={handleBoostStakeClick} />
                </Grid>
                <Grid item xs={12} lg={6}>
                  <BoostCalculator />
                </Grid>
                <Grid item xs={12}>
                  <BoostHistory />
                </Grid>
              </Grid>
            </Box>
          </>
        )}

        {/* Savings Tab Content */}
        {currentTab === 'savings' && (
          <>
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
                USDP Savings
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
                Earn interest on your USDP deposits. Interest comes from RWA yield distribution
                (2% of treasury revenue).
              </Typography>
            </Box>

            <Grid container spacing={3}>
              {/* Savings Rate Card (User Deposits) */}
              <Grid item xs={12} md={6}>
                <SavingsRateCard locale="en" onDepositClick={handleSavingsDepositClick} />
              </Grid>

              {/* Saving Rate Card (Treasury Funding Status) */}
              <Grid item xs={12} md={6}>
                <SavingRateCard
                  stats={{
                    totalFunded: savingRateStats.totalFunded,
                    annualRate: savingRateStats.annualRate,
                    lastRateUpdateTime: savingRateStats.lastRateUpdateTime,
                    weekStartRate: savingRateStats.weekStartRate,
                  }}
                  isLoading={savingRateStats.isLoading}
                />
              </Grid>

              {/* Interest Chart */}
              <Grid item xs={12}>
                <InterestChart data={savingsHistoricalData} locale="en" />
              </Grid>
            </Grid>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 6, textAlign: 'center', fontSize: '0.875rem' }}
            >
              USDP Savings • Backed by Real World Assets • BSC Network
            </Typography>
          </>
        )}

        <Box sx={{ height: { xs: 40, sm: 60 } }} />
      </Container>

      {/* Savings Deposit/Withdraw Modal */}
      <SavingsDepositModal
        open={depositModalOpen}
        onClose={() => setDepositModalOpen(false)}
        onSuccess={() => setDepositModalOpen(false)}
        locale="en"
      />

      {/* Boost Stake Modal */}
      <BoostStakeModal
        open={boostStakeModalOpen}
        onClose={() => setBoostStakeModalOpen(false)}
      />
    </Box>
  );
}
