/**
 * USDP Hub (V3 - 稳定币中心)
 *
 * 功能: USDP 全流程管理中心
 * 路由: /usdp
 * Tabs: Vault | PSM | Stability | Savings
 *
 * 设计理念:
 * - Vault: 存入 RWA → 借出 USDP (核心流程)
 * - PSM: USDC ↔ USDP 1:1 兑换 (便捷入口)
 * - Stability: 稳定池存款 → 赚取清算收益
 * - Savings: USDP 储蓄 → 赚取 RWA 利息
 * - 侧栏固定: Debt Mining APR, Tier & LTV 表, 清算风险
 */

'use client';

import { Container, Typography, Box, Grid, Card, CardContent, Alert, Chip } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { Navigation } from '@/components/layout/Navigation';
import { SubNavigation, useTabState } from '@/components/layout/SubNavigation';

// Vault Tab components
import { DepositForm } from '@/components/treasury/DepositForm';
import { USDPMintPreview } from '@/components/treasury/USDPMintPreview';
import { PositionList } from '@/components/treasury/PositionList';

// PSM Tab components
import { PSMSwapCard } from '@/components/swap/PSMSwapCard';

// Stability Tab components
import { StabilityPoolOverview } from '@/components/stability-pool/StabilityPoolOverview';
import { DepositWithdrawForm } from '@/components/stability-pool/DepositWithdrawForm';
import { LiquidationHistory } from '@/components/stability-pool/LiquidationHistory';

// Savings Tab components
import { SavingsRateCard } from '@/components/savings/SavingsRateCard';
import { SavingRateCard } from '@/components/saving';
import { InterestChart } from '@/components/savings/InterestChart';
import { SavingsDepositModal } from '@/components/savings/SavingsDepositModal';
import { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useSavingPrincipal, useSavingAccruedInterest } from '@/hooks/useSavingRate';
import { useSavingRateStats } from '@/hooks/useSavingRateStats';
import { useSystemMetrics } from '@/hooks/useSystemMetrics';

export default function USDPHub() {
  const { address, isConnected } = useAccount();
  const [currentTab, setCurrentTab] = useTabState('vault');
  const [savingsModalOpen, setSavingsModalOpen] = useState(false);

  // System metrics for global USDP stats
  const metrics = useSystemMetrics();

  const USDP_TABS = [
    { value: 'vault', label: 'Vault' },
    { value: 'psm', label: 'PSM' },
    { value: 'stability', label: 'Stability' },
    { value: 'savings', label: 'Savings' },
  ];

  // Savings data
  const { data: savingPrincipal } = useSavingPrincipal(address);
  const { data: accruedInterest } = useSavingAccruedInterest(address);
  const savingRateStats = useSavingRateStats();

  const savingsHistoricalData = useMemo(() => {
    const now = Date.now();
    const data: any[] = [];
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
            USDP Hub
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
            Complete USDP management: Borrow, Swap, Earn, and Stabilize
          </Typography>
        </Box>

        {/* Global USDP Metrics */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ backgroundColor: 'rgba(255, 107, 0, 0.05)', border: '1px solid rgba(255, 107, 0, 0.2)' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">USDP Supply</Typography>
                <Typography variant="h5" fontWeight={700}>${metrics.usdpTotalSupply}</Typography>
                <Chip label="+0.00%" size="small" color="success" sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ backgroundColor: 'rgba(255, 107, 0, 0.05)', border: '1px solid rgba(255, 107, 0, 0.2)' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Vault TVL</Typography>
                <Typography variant="h5" fontWeight={700}>${metrics.usdpVaultTVL}</Typography>
                <Chip label="Tier 1-3" size="small" sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ backgroundColor: 'rgba(255, 107, 0, 0.05)', border: '1px solid rgba(255, 107, 0, 0.2)' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Debt Mining APR</Typography>
                <Typography variant="h5" fontWeight={700} color="primary">
                  {metrics.weeklyEmission !== '0'
                    ? ((parseFloat(metrics.weeklyEmission) * 52 / parseFloat(metrics.usdpTotalSupply || '1')) * 100).toFixed(2)
                    : '0.00'}%
                </Typography>
                <Typography variant="caption" color="text.disabled">Earn esPAIMON</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ backgroundColor: 'rgba(255, 107, 0, 0.05)', border: '1px solid rgba(255, 107, 0, 0.2)' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">PSM Buffer</Typography>
                <Typography variant="h5" fontWeight={700}>${metrics.usdpTotalSupply}</Typography>
                <Typography variant="caption" color="text.disabled">USDC Available</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Sub-navigation tabs */}
        <SubNavigation
          tabs={USDP_TABS}
          currentTab={currentTab}
          onChange={setCurrentTab}
          variant="standard"
        />

        {/* Vault Tab */}
        {currentTab === 'vault' && (
          <>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff6b00', mb: 1 }}>
                Vault - Borrow USDP with RWA Collateral
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Deposit Tier 1-3 RWA assets, borrow USDP at LTV ratios (50%-80%)
              </Typography>
            </Box>

            {/* DepositForm handles its own left-right layout internally */}
            <Box sx={{ mb: 4 }}>
              <DepositForm />
            </Box>

            {/* Position List */}
            <PositionList />

            {/* Tier & LTV Table */}
            <Card sx={{ mt: 4, backgroundColor: 'rgba(255, 152, 0, 0.05)', border: '1px solid rgba(255, 152, 0, 0.2)' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} color="primary" sx={{ mb: 2 }}>
                  RWA Collateral Tiers & LTV
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ p: 2, backgroundColor: 'background.paper', borderRadius: 2 }}>
                      <Chip label="Tier 1" color="success" size="small" sx={{ mb: 1 }} />
                      <Typography variant="body2" fontWeight={600}>US Treasuries</Typography>
                      <Typography variant="h5" fontWeight={700} color="success.main">80% LTV</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ p: 2, backgroundColor: 'background.paper', borderRadius: 2 }}>
                      <Chip label="Tier 2" color="warning" size="small" sx={{ mb: 1 }} />
                      <Typography variant="body2" fontWeight={600}>Investment Grade Credit</Typography>
                      <Typography variant="h5" fontWeight={700} color="warning.main">65% LTV</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ p: 2, backgroundColor: 'background.paper', borderRadius: 2 }}>
                      <Chip label="Tier 3" color="error" size="small" sx={{ mb: 1 }} />
                      <Typography variant="body2" fontWeight={600}>RWA Revenue Pools</Typography>
                      <Typography variant="h5" fontWeight={700} color="error.main">50% LTV</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </>
        )}

        {/* PSM Tab */}
        {currentTab === 'psm' && (
          <>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff6b00', mb: 1 }}>
                PSM - Peg Stability Module
              </Typography>
              <Typography variant="body1" color="text.secondary">
                1:1 swap between USDC and USDP with 0.1% fee
              </Typography>
            </Box>

            <Grid container spacing={3} justifyContent="center">
              <Grid item xs={12} lg={8}>
                <PSMSwapCard />
              </Grid>
            </Grid>

            <Alert severity="info" icon={<InfoIcon />} sx={{ mt: 4 }}>
              PSM ensures USDP maintains $1 peg by allowing arbitrage between USDC and USDP
            </Alert>
          </>
        )}

        {/* Stability Tab */}
        {currentTab === 'stability' && (
          <>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff6b00', mb: 1 }}>
                Stability Pool - Earn Liquidation Rewards
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Deposit USDP to absorb liquidated debt and earn RWA collateral
              </Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <StabilityPoolOverview />
              </Grid>
              <Grid item xs={12} lg={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                      Deposit / Withdraw USDP
                    </Typography>
                    <DepositWithdrawForm />
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} lg={6}>
                <LiquidationHistory locale="en" />
              </Grid>
            </Grid>
          </>
        )}

        {/* Savings Tab */}
        {currentTab === 'savings' && (
          <>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff6b00', mb: 1 }}>
                USDP Savings - Earn RWA Yield
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Deposit USDP and earn 2% of treasury RWA revenue distribution
              </Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <SavingsRateCard locale="en" onDepositClick={() => setSavingsModalOpen(true)} />
              </Grid>
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
              <Grid item xs={12}>
                <InterestChart data={savingsHistoricalData} locale="en" />
              </Grid>
            </Grid>
          </>
        )}

        <Box sx={{ height: { xs: 40, sm: 60 } }} />
      </Container>

      {/* Savings Modal */}
      <SavingsDepositModal
        open={savingsModalOpen}
        onClose={() => setSavingsModalOpen(false)}
        onSuccess={() => setSavingsModalOpen(false)}
        locale="en"
      />
    </Box>
  );
}
