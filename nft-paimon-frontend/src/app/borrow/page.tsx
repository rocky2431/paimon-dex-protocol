/**
 * Borrow Page (V3 - 扁平化架构)
 *
 * 功能: RWA借贷 + 稳定池统一入口
 * 路由: /borrow
 * Tabs: Dashboard (RWA存款+USDP铸造+持仓监控) | Stability Pool (USDP质押赚取清算奖励)
 *
 * 设计理念:
 * - Dashboard: 用户主动借贷 (存RWA→铸USDP)
 * - Stability Pool: 被动收益 (存USDP→赚清算奖励)
 * - 合并原因: 都是围绕USDP的借贷生态，统一入口更清晰
 */

'use client';

import { Container, Typography, Box, Grid } from '@mui/material';
import { Navigation } from '@/components/layout/Navigation';
import { SubNavigation, useTabState } from '@/components/layout/SubNavigation';
import { DepositForm } from '@/components/treasury/DepositForm';
import { PositionList } from '@/components/treasury/PositionList';
import { StabilityPoolOverview } from '@/components/stability-pool/StabilityPoolOverview';
import { DepositWithdrawForm } from '@/components/stability-pool/DepositWithdrawForm';
import { LiquidationRewardsPanel } from '@/components/stability-pool/LiquidationRewardsPanel';
import { LiquidationHistory } from '@/components/stability-pool/LiquidationHistory';
import { TREASURY_THEME } from '@/components/treasury/constants';

export default function BorrowPage() {
  const [currentTab, setCurrentTab] = useTabState('dashboard');

  const BORROW_TABS = [
    { value: 'dashboard', label: 'Dashboard' },
    { value: 'stability-pool', label: 'Stability Pool' },
  ];

  // TODO: Add locale support via next-intl
  const locale = 'en';

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Top navigation bar */}
      <Navigation />

      {/* Main content area */}
      <Container
        maxWidth="xl"
        sx={{
          pt: 12, // Account for fixed navbar
          pb: 8,
          px: {
            xs: 2,
            sm: 3,
          },
          minHeight: '100vh',
        }}
      >
        {/* Huge whitespace (OlympusDAO style) */}
        <Box sx={{ height: { xs: 40, sm: 60 } }} />

        {/* Sub-navigation tabs */}
        <SubNavigation
          tabs={BORROW_TABS}
          currentTab={currentTab}
          onChange={setCurrentTab}
          variant="standard"
        />

        {/* Dashboard Tab Content */}
        {currentTab === 'dashboard' && (
          <>
            {/* Header section */}
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 800,
                  color: TREASURY_THEME.TITLE,
                  mb: 2,
                  fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                }}
              >
                Borrow Dashboard
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: TREASURY_THEME.SUBTITLE,
                  maxWidth: 700,
                  mx: 'auto',
                  fontSize: { xs: '1rem', sm: '1.125rem' },
                }}
              >
                Deposit RWA collateral to mint USDP stablecoins
              </Typography>
            </Box>

            {/* Deposit Form */}
            <Box sx={{ mb: 6 }}>
              <DepositForm />
            </Box>

            {/* User Positions */}
            <Box sx={{ mb: 4 }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  color: TREASURY_THEME.TITLE,
                  mb: 3,
                  textAlign: 'center',
                }}
              >
                Your Positions
              </Typography>
              <PositionList />
            </Box>

            {/* Info section */}
            <Box
              sx={{
                mt: 6,
                p: 3,
                backgroundColor: TREASURY_THEME.CARD_BG,
                borderRadius: 2,
                border: `1px solid ${TREASURY_THEME.PRIMARY}`,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  color: TREASURY_THEME.TITLE,
                  mb: 2,
                }}
              >
                How it works
              </Typography>
              <Box component="ul" sx={{ pl: 2, m: 0 }}>
                <Typography component="li" variant="body2" sx={{ mb: 1, color: TREASURY_THEME.SUBTITLE }}>
                  <strong>Step 1:</strong> Select an RWA asset from the dropdown (T1, T2, or T3 tier)
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1, color: TREASURY_THEME.SUBTITLE }}>
                  <strong>Step 2:</strong> Enter the amount you want to deposit as collateral
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1, color: TREASURY_THEME.SUBTITLE }}>
                  <strong>Step 3:</strong> Approve the Treasury contract to spend your RWA tokens
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1, color: TREASURY_THEME.SUBTITLE }}>
                  <strong>Step 4:</strong> Deposit your RWA tokens and receive USDP stablecoins
                </Typography>
              </Box>

              <Box sx={{ mt: 3 }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 700,
                    color: TREASURY_THEME.EMPHASIS,
                    mb: 1,
                  }}
                >
                  Important Notes:
                </Typography>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  <Typography component="li" variant="caption" sx={{ mb: 0.5, color: TREASURY_THEME.CAPTION }}>
                    Higher tier assets (T1) have higher LTV ratios (60%) compared to T3 (40%)
                  </Typography>
                  <Typography component="li" variant="caption" sx={{ mb: 0.5, color: TREASURY_THEME.CAPTION }}>
                    Maintain your Health Factor above 115% to avoid liquidation
                  </Typography>
                  <Typography component="li" variant="caption" sx={{ mb: 0.5, color: TREASURY_THEME.CAPTION }}>
                    There is a 7-day cooldown period before you can redeem your collateral
                  </Typography>
                  <Typography component="li" variant="caption" sx={{ color: TREASURY_THEME.CAPTION }}>
                    A 0.5% redemption fee applies when withdrawing your collateral
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Footer info */}
            <Typography
              variant="body2"
              sx={{
                mt: 4,
                textAlign: 'center',
                fontSize: '0.875rem',
                color: TREASURY_THEME.CAPTION,
              }}
            >
              RWA Treasury • Deposit & Mint USDP • BSC Network
            </Typography>
          </>
        )}

        {/* Stability Pool Tab Content */}
        {currentTab === 'stability-pool' && (
          <>
            {/* Header section */}
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
                USDP Stability Pool
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
                Deposit USDP to earn liquidation rewards. Help maintain system stability and earn
                collateral from liquidated vaults.
              </Typography>
            </Box>

            {/* Main Content Grid */}
            <Grid container spacing={3}>
              {/* Overview Card */}
              <Grid item xs={12}>
                <StabilityPoolOverview locale={locale} />
              </Grid>

              {/* Deposit/Withdraw Form */}
              <Grid item xs={12} md={6}>
                <DepositWithdrawForm locale={locale} />
              </Grid>

              {/* Liquidation Rewards Panel */}
              <Grid item xs={12} md={6}>
                <LiquidationRewardsPanel locale={locale} />
              </Grid>

              {/* Liquidation History */}
              <Grid item xs={12}>
                <LiquidationHistory locale={locale} />
              </Grid>
            </Grid>

            {/* Footer info */}
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 6,
                textAlign: 'center',
                fontSize: '0.875rem',
              }}
            >
              USDP Stability Pool • Earn Liquidation Rewards • BSC Network
            </Typography>
          </>
        )}

        {/* Huge whitespace (OlympusDAO style) */}
        <Box sx={{ height: { xs: 40, sm: 60 } }} />
      </Container>
    </Box>
  );
}
