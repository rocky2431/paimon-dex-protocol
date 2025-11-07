/**
 * Landing Page (V3 - 首页中心) - 统一配色和排版
 *
 * 功能: 系统总览 + 快速入口 + 飞轮可视化
 * 路由: /
 */

'use client';

import { Container, Typography, Box, Grid, Card, CardContent, Button, Chip, Alert } from '@mui/material';
import { Navigation } from '@/components/layout/Navigation';
import Link from 'next/link';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CampaignIcon from '@mui/icons-material/Campaign';
import DiamondIcon from '@mui/icons-material/Diamond';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import InfoIcon from '@mui/icons-material/Info';

// 统一的卡片样式 - 橙色系
const unifiedCardStyle = {
  background: 'linear-gradient(135deg, rgba(255, 107, 0, 0.08) 0%, rgba(255, 152, 0, 0.05) 100%)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 107, 0, 0.2)',
  borderRadius: '16px',
  boxShadow: '0 8px 32px 0 rgba(255, 107, 0, 0.12)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  minHeight: '200px',
  display: 'flex',
  flexDirection: 'column',
  '&:hover': {
    boxShadow: '0 12px 48px 0 rgba(255, 107, 0, 0.18)',
    transform: 'translateY(-2px)',
  },
};

// 交互式卡片样式
const actionCardStyle = {
  ...unifiedCardStyle,
  border: '2px solid rgba(255, 107, 0, 0.3)',
  borderRadius: '20px',
  cursor: 'pointer',
  '&:hover': {
    transform: 'translateY(-6px) scale(1.02)',
    boxShadow: '0 16px 56px 0 rgba(255, 107, 0, 0.25)',
    border: '2px solid rgba(255, 107, 0, 0.5)',
  },
};

// KPI指标卡片 - 统一高度
const metricCardStyle = {
  ...unifiedCardStyle,
  minHeight: '160px',
};

export default function LandingPage() {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Navigation />

      <Container maxWidth="xl" sx={{ pt: 12, pb: 8, px: { xs: 2, sm: 3 }, minHeight: '100vh' }}>
        <Box sx={{ height: { xs: 40, sm: 60 } }} />

        {/* Hero Section */}
        <Box sx={{ mb: 6, textAlign: 'center' }}>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 900,
              background: 'linear-gradient(135deg, #ff6b00 0%, #ff9800 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2,
              fontSize: { xs: '2.5rem', sm: '3rem', md: '3.5rem' },
            }}
          >
            Paimon.dex
          </Typography>
          <Typography
            variant="h5"
            color="text.secondary"
            sx={{
              maxWidth: 800,
              mx: 'auto',
              mb: 1,
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
            }}
          >
            RWA-Backed DeFi Protocol
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              maxWidth: 800,
              mx: 'auto',
              fontSize: { xs: '1rem', sm: '1.125rem' },
            }}
          >
            Real World Assets meet Decentralized Finance. Mint USDP with treasury-backed RWA collateral, earn yield through vePAIMON governance.
          </Typography>
        </Box>

        {/* Main Content Grid */}
        <Grid container spacing={3} sx={{ mb: 6 }}>
          {/* Left Column: Quick Actions */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Card sx={actionCardStyle} component={Link} href="/liquidity?tab=swap">
                <CardContent sx={{ textAlign: 'center', py: 4, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <SwapHorizIcon sx={{ fontSize: 56, color: '#ff6b00', mb: 2 }} />
                  <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
                    DEX Swap
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Trade tokens with low fees (0.25%)
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    endIcon={<ArrowForwardIcon />}
                    sx={{ fontWeight: 700, mt: 'auto' }}
                  >
                    Start Trading
                  </Button>
                </CardContent>
              </Card>

              <Card sx={actionCardStyle} component={Link} href="/usdp?tab=psm">
                <CardContent sx={{ textAlign: 'center', py: 4, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <AccountBalanceIcon sx={{ fontSize: 56, color: '#ff9800', mb: 2 }} />
                  <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
                    PSM Swap
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    1:1 USDC ↔ USDP exchange (0.1% fee)
                  </Typography>
                  <Button
                    variant="contained"
                    sx={{
                      fontWeight: 700,
                      mt: 'auto',
                      backgroundColor: '#ff9800',
                      '&:hover': { backgroundColor: '#f57c00' },
                    }}
                    endIcon={<ArrowForwardIcon />}
                  >
                    Quick Swap
                  </Button>
                </CardContent>
              </Card>

              <Card sx={unifiedCardStyle}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <InfoIcon sx={{ color: '#ff6b00', fontSize: 28 }} />
                    <Typography variant="h6" fontWeight={700} sx={{ color: '#ff6b00' }}>
                      New to Paimon?
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Button
                      variant="outlined"
                      fullWidth
                      component={Link}
                      href="/launchpad"
                      startIcon={<RocketLaunchIcon />}
                      sx={{ justifyContent: 'flex-start', borderColor: '#ff6b00', color: '#ff6b00' }}
                    >
                      Explore RWA Projects
                    </Button>
                    <Button
                      variant="outlined"
                      fullWidth
                      component={Link}
                      href="/usdp?tab=vault"
                      startIcon={<AccountBalanceIcon />}
                      sx={{ justifyContent: 'flex-start', borderColor: '#ff6b00', color: '#ff6b00' }}
                    >
                      Mint USDP with RWA
                    </Button>
                    <Button
                      variant="outlined"
                      fullWidth
                      component={Link}
                      href="/governance?tab=lock"
                      startIcon={<TrendingUpIcon />}
                      sx={{ justifyContent: 'flex-start', borderColor: '#ff6b00', color: '#ff6b00' }}
                    >
                      Earn Governance Power
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Grid>

          {/* Middle Column: System KPI */}
          <Grid item xs={12} md={4}>
            <Box sx={{ mb: 3, textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={700} sx={{
                background: 'linear-gradient(135deg, #ff6b00 0%, #ff9800 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                System Overview
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Updated live • BSC Network
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Card sx={metricCardStyle}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    USDP Total Supply
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ my: 1, color: '#ff6b00' }}>
                    $0.00
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label="+0.00%" size="small" sx={{ backgroundColor: 'rgba(76, 175, 80, 0.2)', color: '#4CAF50' }} />
                    <Typography variant="caption" color="text.disabled">
                      Last 7 days
                    </Typography>
                  </Box>
                </CardContent>
              </Card>

              <Card sx={metricCardStyle}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Treasury Vault TVL
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ my: 1, color: '#ff6b00' }}>
                    $0.00
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label="Tier 1-3" size="small" sx={{ backgroundColor: 'rgba(255, 107, 0, 0.2)', color: '#ff6b00' }} />
                    <Typography variant="caption" color="text.disabled">
                      RWA Collateral
                    </Typography>
                  </Box>
                </CardContent>
              </Card>

              <Card sx={metricCardStyle}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Weekly Emission
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ my: 1, color: '#ff6b00' }}>
                    0 PAIMON
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    Distributed across 4 channels
                  </Typography>
                </CardContent>
              </Card>

              <Card sx={metricCardStyle}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Debt Mining APR
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ my: 1, color: '#ff6b00' }}>
                    0.00%
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    Earn esPAIMON rewards
                  </Typography>
                </CardContent>
              </Card>

              <Card sx={metricCardStyle}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Total Value Locked
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ my: 1, color: '#ff6b00' }}>
                    $0.00
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    DEX + Vault + Stability Pool
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Grid>

          {/* Right Column: Flywheel Diagram */}
          <Grid item xs={12} md={4}>
            <Box sx={{ mb: 3, textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={700} sx={{
                background: 'linear-gradient(135deg, #ff6b00 0%, #ff9800 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                Protocol Flywheel
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Value creation loop
              </Typography>
            </Box>

            <Card sx={{
              background: 'linear-gradient(135deg, rgba(255, 107, 0, 0.05) 0%, rgba(255, 152, 0, 0.03) 100%)',
              backdropFilter: 'blur(8px)',
              border: '2px dashed rgba(255, 107, 0, 0.3)',
              borderRadius: '16px',
              minHeight: '400px',
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Step 1: Launchpad */}
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: '16px',
                      backgroundColor: 'rgba(255, 107, 0, 0.1)',
                      border: '1.5px solid rgba(255, 107, 0, 0.3)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        transform: 'translateX(4px)',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <RocketLaunchIcon sx={{ color: '#ff6b00', fontSize: 20 }} />
                      <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#ff6b00' }}>
                        1. Launchpad
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      RWA projects listed → Users purchase tokenized assets
                    </Typography>
                  </Box>

                  <Box sx={{ textAlign: 'center' }}>
                    <ArrowForwardIcon sx={{ transform: 'rotate(90deg)', color: '#ff6b00', fontSize: 32 }} />
                  </Box>

                  {/* Step 2: Vault */}
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: '16px',
                      backgroundColor: 'rgba(255, 152, 0, 0.1)',
                      border: '1.5px solid rgba(255, 152, 0, 0.3)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        transform: 'translateX(4px)',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <AccountBalanceIcon sx={{ color: '#ff9800', fontSize: 20 }} />
                      <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#ff9800' }}>
                        2. Vault
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Deposit RWA → Mint USDP → Earn Debt Mining rewards
                    </Typography>
                  </Box>

                  <Box sx={{ textAlign: 'center' }}>
                    <ArrowForwardIcon sx={{ transform: 'rotate(90deg)', color: '#ff9800', fontSize: 32 }} />
                  </Box>

                  {/* Step 3: Emission */}
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: '16px',
                      backgroundColor: 'rgba(255, 193, 7, 0.1)',
                      border: '1.5px solid rgba(255, 193, 7, 0.3)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        transform: 'translateX(4px)',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <TrendingUpIcon sx={{ color: '#FFC107', fontSize: 20 }} />
                      <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#FFC107' }}>
                        3. Emission
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Lock PAIMON → Get veNFT → Vote on gauge weights
                    </Typography>
                  </Box>

                  <Box sx={{ textAlign: 'center' }}>
                    <ArrowForwardIcon sx={{ transform: 'rotate(90deg)', color: '#FFC107', fontSize: 32 }} />
                  </Box>

                  {/* Step 4: veVote */}
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: '16px',
                      backgroundColor: 'rgba(255, 87, 34, 0.1)',
                      border: '1.5px solid rgba(255, 87, 34, 0.3)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        transform: 'translateX(4px)',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <DiamondIcon sx={{ color: '#FF5722', fontSize: 20 }} />
                      <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#FF5722' }}>
                        4. veVote
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Govern liquidity → Earn bribes + gauge rewards
                    </Typography>
                  </Box>

                  <Box sx={{ textAlign: 'center' }}>
                    <ArrowForwardIcon sx={{ transform: 'rotate(90deg)', color: '#FF5722', fontSize: 32 }} />
                  </Box>

                  {/* Step 5: Stability Pool */}
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: '16px',
                      backgroundColor: 'rgba(121, 85, 72, 0.1)',
                      border: '1.5px solid rgba(121, 85, 72, 0.3)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        transform: 'translateX(4px)',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <AccountBalanceIcon sx={{ color: '#8D6E63', fontSize: 20 }} />
                      <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#8D6E63' }}>
                        5. Stability
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      USDP stakers absorb liquidations → Earn RWA collateral
                    </Typography>
                  </Box>

                  <Box sx={{ textAlign: 'center', mt: 2 }}>
                    <Typography variant="caption" sx={{
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #ff6b00 0%, #ff9800 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}>
                      ↻ Loop restarts with protocol revenue
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Announcements / Latest Updates */}
        <Card sx={{
          ...unifiedCardStyle,
          minHeight: 'auto',
        }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <CampaignIcon sx={{ color: '#ff6b00', fontSize: 28 }} />
              <Typography variant="h6" fontWeight={700} sx={{ color: '#ff6b00' }}>
                Latest Updates
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Alert
                severity="info"
                icon={<RocketLaunchIcon />}
                sx={{
                  backgroundColor: 'rgba(255, 152, 0, 0.1)',
                  border: '1px solid rgba(255, 152, 0, 0.2)',
                  '& .MuiAlert-icon': { color: '#ff9800' }
                }}
              >
                <Typography variant="body2" fontWeight={600}>
                  New Launchpad Project: Coming Soon - Real estate-backed RWA token launch
                </Typography>
              </Alert>

              <Alert
                severity="success"
                icon={<DiamondIcon />}
                sx={{
                  backgroundColor: 'rgba(76, 175, 80, 0.1)',
                  border: '1px solid rgba(76, 175, 80, 0.2)',
                  '& .MuiAlert-icon': { color: '#4CAF50' }
                }}
              >
                <Typography variant="body2" fontWeight={600}>
                  Nitro Pool Active: 2x boost on USDP/USDC LP for 7 days
                </Typography>
              </Alert>

              <Alert
                severity="warning"
                icon={<MonetizationOnIcon />}
                sx={{
                  backgroundColor: 'rgba(255, 193, 7, 0.1)',
                  border: '1px solid rgba(255, 193, 7, 0.2)',
                  '& .MuiAlert-icon': { color: '#FFC107' }
                }}
              >
                <Typography variant="body2" fontWeight={600}>
                  Bribe Market: $12,000 in bribes available for next epoch voting
                </Typography>
              </Alert>
            </Box>
          </CardContent>
        </Card>

        {/* Footer Stats */}
        <Box sx={{ textAlign: 'center', py: 4, mt: 4 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Paimon.dex • RWA-Backed DeFi Protocol • BSC Network
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
            <Typography variant="caption" color="text.disabled">
              Audited by CertiK
            </Typography>
            <Typography variant="caption" color="text.disabled">
              •
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Treasury Multi-sig: 3-of-5
            </Typography>
            <Typography variant="caption" color="text.disabled">
              •
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Immutable Contracts
            </Typography>
          </Box>
        </Box>

        <Box sx={{ height: { xs: 40, sm: 60 } }} />
      </Container>
    </Box>
  );
}
