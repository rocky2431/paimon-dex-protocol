/**
 * Liquidity Page (V3 - 扁平化架构)
 *
 * 功能: 流动性管理统一入口
 * 路由: /liquidity
 * Tabs: Pools (添加/移除流动性) | My Liquidity (质押管理)
 *
 * 设计理念:
 * - Pools: 浏览池子，添加/移除流动性
 * - My Liquidity: 用户LP持仓，质押赚取奖励
 * - 统一入口: 流动性操作全景视图，减少页面跳转
 */

'use client';

import { Container, Typography, Box, Grid, Alert } from '@mui/material';
import { Navigation } from '@/components/layout/Navigation';
import { SubNavigation, useTabState } from '@/components/layout/SubNavigation';
import { AddLiquidityCard } from '@/components/liquidity/AddLiquidityCard';
import { RemoveLiquidityCard } from '@/components/liquidity/RemoveLiquidityCard';
import { StakingCard } from '@/components/liquidity/StakingCard';

export default function LiquidityPage() {
  const [currentTab, setCurrentTab] = useTabState('pools');

  const LIQUIDITY_TABS = [
    { value: 'pools', label: 'Pools' },
    { value: 'my-liquidity', label: 'My Liquidity' },
  ];

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
          tabs={LIQUIDITY_TABS}
          currentTab={currentTab}
          onChange={setCurrentTab}
          variant="standard"
        />

        {/* Pools Tab Content */}
        {currentTab === 'pools' && (
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
                Liquidity Pools
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
                Add or remove liquidity from pools to earn trading fees
              </Typography>
            </Box>

            {/* Add/Remove Liquidity Grid */}
            <Grid container spacing={3}>
              {/* Add Liquidity Card */}
              <Grid item xs={12} lg={6}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    color: '#FF9800',
                    mb: 3,
                  }}
                >
                  Add Liquidity
                </Typography>
                <AddLiquidityCard />
              </Grid>

              {/* Remove Liquidity Card */}
              <Grid item xs={12} lg={6}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    color: '#FF5722',
                    mb: 3,
                  }}
                >
                  Remove Liquidity
                </Typography>
                <RemoveLiquidityCard />
              </Grid>
            </Grid>

            {/* Info section */}
            <Box
              sx={{
                mt: 6,
                p: 3,
                backgroundColor: 'rgba(255, 152, 0, 0.05)',
                borderRadius: 2,
                border: '1px solid rgba(255, 152, 0, 0.2)',
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  color: '#ff6b00',
                  mb: 2,
                }}
              >
                How it works
              </Typography>
              <Box component="ul" sx={{ pl: 2, m: 0 }}>
                <Typography component="li" variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                  <strong>Step 1:</strong> Select a trading pair from the pool selector
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                  <strong>Step 2:</strong> Enter the amount of tokens you want to add or remove
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                  <strong>Step 3:</strong> Approve the contract to spend your tokens
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                  <strong>Step 4:</strong> Confirm the transaction and receive LP tokens (for adding)
                </Typography>
              </Box>

              <Box sx={{ mt: 3 }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 700,
                    color: '#FF9800',
                    mb: 1,
                  }}
                >
                  Important Notes:
                </Typography>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  <Typography component="li" variant="caption" sx={{ mb: 0.5, color: 'text.disabled' }}>
                    You earn 0.175% of all trades on this pair proportional to your share of the pool
                  </Typography>
                  <Typography component="li" variant="caption" sx={{ mb: 0.5, color: 'text.disabled' }}>
                    Fees are added to the pool and accrue in real time
                  </Typography>
                  <Typography component="li" variant="caption" sx={{ mb: 0.5, color: 'text.disabled' }}>
                    Removing liquidity will return your share of tokens plus accumulated fees
                  </Typography>
                  <Typography component="li" variant="caption" sx={{ color: 'text.disabled' }}>
                    LP tokens can be staked in gauges to earn additional PAIMON rewards
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Footer info */}
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 4,
                textAlign: 'center',
                fontSize: '0.875rem',
              }}
            >
              Liquidity Pools • Earn Trading Fees • ve33 DEX
            </Typography>
          </>
        )}

        {/* My Liquidity Tab Content */}
        {currentTab === 'my-liquidity' && (
          <>
            {/* Header section */}
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #FF9800 0%, #FF5722 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  mb: 2,
                  fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                }}
              >
                My Liquidity & Staking
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
                Stake your LP tokens to earn PAIMON rewards
              </Typography>
            </Box>

            {/* Staking Card */}
            <Box sx={{ mb: 6 }}>
              <StakingCard />
            </Box>

            {/* How Liquidity Mining Works */}
            <Box
              sx={{
                textAlign: 'center',
                p: 4,
                borderRadius: 3,
                backgroundColor: 'rgba(255, 152, 0, 0.05)',
                border: '1px solid',
                borderColor: 'rgba(255, 152, 0, 0.1)',
              }}
            >
              <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ mb: 2 }}>
                How Liquidity Mining Works
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ maxWidth: 800, mx: 'auto', mb: 3 }}
              >
                Stake your LP tokens in liquidity mining gauges to earn PAIMON rewards. The longer
                you stake, the more rewards you accumulate. You can unstake and claim your rewards
                at any time.
              </Typography>

              <Grid container spacing={3} justifyContent="center" sx={{ mt: 2 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.disabled" fontSize="0.75rem">
                    Step 1
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="text.primary">
                    Select Pool
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.disabled" fontSize="0.75rem">
                    Step 2
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="text.primary">
                    Stake LP Tokens
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.disabled" fontSize="0.75rem">
                    Step 3
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="text.primary">
                    Earn PAIMON
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.disabled" fontSize="0.75rem">
                    Step 4
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="text.primary">
                    Claim Rewards
                  </Typography>
                </Grid>
              </Grid>
            </Box>

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
              Liquidity Mining • Stake LP Tokens • Earn PAIMON Rewards
            </Typography>
          </>
        )}

        {/* Huge whitespace (OlympusDAO style) */}
        <Box sx={{ height: { xs: 40, sm: 60 } }} />
      </Container>
    </Box>
  );
}
