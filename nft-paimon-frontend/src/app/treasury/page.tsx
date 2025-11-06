/**
 * Treasury Overview Page
 * Main dashboard showing USDP accrual index history and savings integration
 *
 * Features:
 * - AccrualIndexChart: Historical accrualIndex curve with growth stats
 * - SavingsRateCard: USDP savings rate and user deposits
 * - Quick links to /treasury/deposit and /treasury/positions
 * - Responsive Grid layout (Material Design 3)
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Button,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import {
  AccountBalance as AccountBalanceIcon,
  ShowChart as ShowChartIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/layout/Navigation';
import { AccrualIndexChart, ChartDataPoint } from '@/components/treasury/AccrualIndexChart';
import { SavingsRateCard } from '@/components/savings/SavingsRateCard';
import { SavingsDepositModal } from '@/components/savings/SavingsDepositModal';
import { TREASURY_THEME } from '@/components/treasury/constants';

/**
 * Generate mock historical accrualIndex data
 * TODO: Replace with real contract data from USDP.accrualIndex()
 */
function generateMockAccrualData(days: number = 30): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  const baseIndex = 1e18; // Start at 1.0
  const now = Date.now();

  for (let i = 0; i < days; i++) {
    const timestamp = now - (days - i) * 24 * 60 * 60 * 1000;
    // Simulate 0.02% daily growth (7.3% APR)
    const index = baseIndex * Math.pow(1.0002, i);
    const dailyGrowth = i > 0 ? 0.0002 : 0;

    data.push({
      timestamp,
      index,
      dailyGrowth,
    });
  }

  return data;
}

export default function TreasuryOverviewPage() {
  const router = useRouter();
  const [depositModalOpen, setDepositModalOpen] = useState(false);

  // Mock data - replace with real contract reads
  const accrualData = useMemo(() => generateMockAccrualData(30), []);

  const handleDepositClick = () => {
    setDepositModalOpen(true);
  };

  const handleDepositClose = () => {
    setDepositModalOpen(false);
  };

  const handleNavigateToDeposit = () => {
    router.push('/treasury/deposit');
  };

  const handleNavigateToPositions = () => {
    router.push('/treasury/positions');
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Top navigation bar */}
      <Navigation />

      {/* Main content area */}
      <Container
        maxWidth="xl"
        sx={{
          pt: 10, // Account for fixed navbar
          pb: 8,
          px: {
            xs: 2,
            sm: 3,
          },
          minHeight: '100vh',
        }}
      >
        {/* Header section */}
        <Box
          sx={{
            mb: 4,
            textAlign: 'center',
            pt: { xs: 2, sm: 3 },
          }}
        >
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              color: TREASURY_THEME.TITLE,
              mb: 2,
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
            }}
          >
            Treasury Overview
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: TREASURY_THEME.SUBTITLE,
              maxWidth: 800,
              mx: 'auto',
              fontSize: { xs: '1rem', sm: '1.125rem' },
            }}
          >
            Monitor USDP accrual index growth and manage your savings
          </Typography>
        </Box>

        {/* Quick Actions */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                borderRadius: '16px',
                border: '1px solid rgba(255,107,0,0.3)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(255,107,0,0.2)',
                },
              }}
              onClick={handleNavigateToDeposit}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <AddIcon sx={{ fontSize: 40, color: '#ff6b00' }} />
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      Deposit RWA Assets
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Mint USDP using RWA collateral
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card
              sx={{
                borderRadius: '16px',
                border: '1px solid rgba(255,107,0,0.3)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(255,107,0,0.2)',
                },
              }}
              onClick={handleNavigateToPositions}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <VisibilityIcon sx={{ fontSize: 40, color: '#ff6b00' }} />
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      View Positions
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Monitor your collateral positions
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Main content: AccrualIndexChart + SavingsRateCard */}
        <Grid container spacing={3}>
          {/* Accrual Index Chart */}
          <Grid item xs={12} lg={7}>
            <AccrualIndexChart data={accrualData} locale="en" />
          </Grid>

          {/* Savings Rate Card */}
          <Grid item xs={12} lg={5}>
            <SavingsRateCard locale="en" onDepositClick={handleDepositClick} />
          </Grid>
        </Grid>

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
            About USDP Accrual Index
          </Typography>
          <Box component="ul" sx={{ pl: 2, m: 0 }}>
            <Typography component="li" variant="body2" sx={{ mb: 1, color: TREASURY_THEME.SUBTITLE }}>
              <strong>Accrual Index:</strong> Tracks the cumulative value growth of USDP from RWA yield distribution (2% of treasury revenue)
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1, color: TREASURY_THEME.SUBTITLE }}>
              <strong>Share-based Model:</strong> Your USDP balance automatically increases as the accrual index grows
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1, color: TREASURY_THEME.SUBTITLE }}>
              <strong>Daily Accrual:</strong> Interest compounds daily based on the annual rate (typically ~2% APR)
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1, color: TREASURY_THEME.SUBTITLE }}>
              <strong>No Action Required:</strong> You earn interest automatically - no need to claim or stake
            </Typography>
          </Box>

          <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid rgba(255,107,0,0.2)' }}>
            <Typography variant="caption" color="text.secondary">
              ℹ️ The accrual index starts at 1.0 and increases over time. Your effective USDP balance = shares × accrualIndex / 1e18.
            </Typography>
          </Box>
        </Box>
      </Container>

      {/* Savings Deposit Modal */}
      <SavingsDepositModal
        open={depositModalOpen}
        onClose={handleDepositClose}
        locale="en"
      />
    </Box>
  );
}
