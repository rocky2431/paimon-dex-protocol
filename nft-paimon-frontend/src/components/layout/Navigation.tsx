'use client';

import { Container, Typography, Box, Stack } from '@mui/material';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { getNavigationColumns, getActiveColumn, type NavColumn } from '@/config/navigation';
import { MobileNavigation } from './MobileNavigation';

/**
 * Navigation Component (V3 - Flat Structure)
 *
 * New 6-entry flat structure: Swap | Borrow | Liquidity | Vote | RWA | Portfolio
 *
 * Changes from V2:
 * - Removed dropdown menus (all entries are direct links)
 * - Tab navigation handled in pages, not in top nav
 * - Simplified active state logic
 * - Improved mobile responsiveness
 *
 * Features:
 * - Configuration-driven (src/config/navigation.ts)
 * - Feature flags auto-filtering
 * - Active state highlighting
 * - Responsive design (desktop ≥1024px, mobile <1024px)
 */
export function Navigation() {
  const pathname = usePathname();
  const columns = getNavigationColumns();
  const activeColumnId = getActiveColumn(pathname);

  // V3: Simplified - All entries are direct links (no dropdown menus)
  const renderNavLink = (column: NavColumn) => {
    const isActive = activeColumnId === column.id;

    return (
      <Link key={column.id} href={column.href} style={{ textDecoration: 'none' }}>
        <Typography
          variant="body1"
          fontWeight={600}
          sx={{
            color: isActive ? 'primary.main' : 'text.secondary',
            cursor: 'pointer',
            transition: 'color 0.3s',
            whiteSpace: 'nowrap',
            position: 'relative',
            '&:hover': {
              color: 'primary.main',
            },
            // Active indicator underline
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: -8,
              left: 0,
              right: 0,
              height: 3,
              backgroundColor: 'primary.main',
              borderRadius: '3px 3px 0 0',
              opacity: isActive ? 1 : 0,
              transition: 'opacity 0.3s',
            },
          }}
        >
          {column.label}
        </Typography>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Navigation - shows below lg breakpoint (<1024px) */}
      <Box
        component="nav"
        sx={{
          display: { xs: 'block', lg: 'none' },
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          backgroundColor: 'background.paper',
          borderBottom: 'none',
          boxShadow: 'inset 0 -1px 0 0 rgba(255, 152, 0, 0.1)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Container maxWidth="xl">
          <Stack
            direction="row"
            alignItems="center"
            sx={{ py: 2, gap: 2 }}
          >
            {/* Hamburger Menu */}
            <MobileNavigation />

            {/* Logo / Brand */}
            <Link href="/" style={{ textDecoration: 'none' }}>
              <Typography
                variant="h6"
                component="h1"
                fontWeight={700}
                color="primary"
                sx={{ fontSize: '1.5rem', cursor: 'pointer', flexShrink: 0 }}
              >
                Paimon DEX
              </Typography>
            </Link>

            {/* Spacer - pushes wallet button to far right */}
            <Box sx={{ flexGrow: 1 }} />

            {/* Connect Wallet Button */}
            <Box sx={{ flexShrink: 0 }}>
              <ConnectButton />
            </Box>
          </Stack>
        </Container>
      </Box>

      {/* Desktop Navigation - shows at lg breakpoint and above (≥1024px) */}
      <Box
        component="nav"
        sx={{
          display: { xs: 'none', lg: 'block' },
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          backgroundColor: 'background.paper',
          borderBottom: 'none',
          boxShadow: 'inset 0 -1px 0 0 rgba(255, 152, 0, 0.1)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Container maxWidth="xl">
          <Stack
            direction="row"
            alignItems="center"
            sx={{ py: 2, gap: 4 }}
          >
            {/* Logo / Brand */}
            <Link href="/" style={{ textDecoration: 'none' }}>
              <Typography
                variant="h6"
                component="h1"
                fontWeight={700}
                color="primary"
                sx={{ fontSize: '1.5rem', cursor: 'pointer', flexShrink: 0 }}
              >
                Paimon DEX
              </Typography>
            </Link>

            {/* Navigation Links (6 flat entries) */}
            <Stack direction="row" spacing={4} alignItems="center" sx={{ flexGrow: 0 }}>
              {columns.map((column) => renderNavLink(column))}
            </Stack>

            {/* Spacer - pushes wallet button to far right */}
            <Box sx={{ flexGrow: 1 }} />

            {/* Connect Wallet Button */}
            <Box sx={{ flexShrink: 0 }}>
              <ConnectButton />
            </Box>
          </Stack>
        </Container>
      </Box>
    </>
  );
}
