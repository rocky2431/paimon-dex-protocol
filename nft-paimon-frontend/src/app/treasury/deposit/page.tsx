/**
 * Treasury Deposit Page
 * RWA collateral deposit interface with HYD minting preview
 */

'use client';

import { Container, Typography, Box } from '@mui/material';
import { Navigation } from '@/components/layout/Navigation';
import { DepositForm } from '@/components/treasury/DepositForm';
import { TREASURY_THEME } from '@/components/treasury/constants';

export default function TreasuryDepositPage() {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Top navigation bar */}
      <Navigation activePage="treasury" />

      {/* Main content area */}
      <Container
        maxWidth="lg"
        sx={{
          pt: 10, // Account for fixed navbar (reduced from 12)
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
            Treasury Deposit
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
            Deposit RWA collateral to mint HYD stablecoins
          </Typography>
        </Box>

        {/* Deposit form */}
        <DepositForm />

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
              <strong>Step 4:</strong> Deposit your RWA tokens and receive HYD stablecoins
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
          RWA Treasury • BSC Network
        </Typography>
      </Container>
    </Box>
  );
}
