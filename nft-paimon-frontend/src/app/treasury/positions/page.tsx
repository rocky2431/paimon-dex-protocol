/**
 * Treasury Positions Page
 * Position monitoring dashboard with health factor tracking and auto-refresh
 */

'use client';

import { Container, Typography, Box } from '@mui/material';
import { Navigation } from '@/components/layout/Navigation';
import { PositionList } from '@/components/treasury/PositionList';
import { TREASURY_THEME } from '@/components/treasury/constants';

export default function TreasuryPositionsPage() {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Top navigation bar */}
      <Navigation />

      {/* Main content area */}
      <Container
        maxWidth="xl"
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
            Position Monitoring
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
            Monitor your RWA collateral positions and health factors
          </Typography>
        </Box>

        {/* Position list */}
        <PositionList />

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
            Understanding Health Factor
          </Typography>
          <Box component="ul" sx={{ pl: 2, m: 0 }}>
            <Typography component="li" variant="body2" sx={{ mb: 1, color: TREASURY_THEME.SUBTITLE }}>
              <strong>Healthy (Green, &gt;150%):</strong> Your position is safe with plenty of buffer
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1, color: TREASURY_THEME.SUBTITLE }}>
              <strong>Warning (Yellow, 115-150%):</strong> Consider adding collateral to improve safety
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 1, color: TREASURY_THEME.SUBTITLE }}>
              <strong>At Risk (Red, &lt;115%):</strong> Position may be liquidated. Add collateral immediately
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
              Position Actions:
            </Typography>
            <Box component="ul" sx={{ pl: 2, m: 0 }}>
              <Typography component="li" variant="caption" sx={{ mb: 0.5, color: TREASURY_THEME.CAPTION }}>
                <strong>Redeem Collateral:</strong> Withdraw your RWA assets after 7-day cooldown period
              </Typography>
              <Typography component="li" variant="caption" sx={{ mb: 0.5, color: TREASURY_THEME.CAPTION }}>
                <strong>Add Collateral:</strong> Deposit more RWA to improve your health factor
              </Typography>
              <Typography component="li" variant="caption" sx={{ mb: 0.5, color: TREASURY_THEME.CAPTION }}>
                <strong>Auto-Refresh:</strong> Positions automatically update every 60 seconds
              </Typography>
              <Typography component="li" variant="caption" sx={{ color: TREASURY_THEME.CAPTION }}>
                <strong>Export CSV:</strong> Download your position history for record keeping
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
          RWA Treasury • BSC Network • Real-time Monitoring
        </Typography>
      </Container>
    </Box>
  );
}
