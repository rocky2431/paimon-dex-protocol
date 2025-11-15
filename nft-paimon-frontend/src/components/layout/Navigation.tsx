'use client';

import { Container, Typography, Box, Stack } from '@mui/material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { getNavigationColumns, getActiveColumn, type NavColumn } from '@/config/navigation';
import { MobileNavigation } from './MobileNavigation';
import { UserMenu } from './UserMenu';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

// TypeScript declaration for Reown AppKit web component
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'w3m-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

// Fitts' Law compliance: Minimum touch target size (gap-4.1.1)
const MIN_HOT_ZONE_SIZE = 44;
const ACTIVE_INDICATOR_HEIGHT = 3;

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
 * Changes from V3 (gap-4.1.1):
 * - Expanded hot zones to ≥44px for Fitts' Law compliance
 * - Better touch target usability on mobile and desktop
 * - Improved clickable area beyond text bounds
 *
 * Features:
 * - Configuration-driven (src/config/navigation.ts)
 * - Feature flags auto-filtering
 * - Active state highlighting
 * - Responsive design (desktop ≥1024px, mobile <1024px)
 * - Accessibility-friendly hot zones (≥44x44px)
 */
export function Navigation() {
  const pathname = usePathname();
  const columns = getNavigationColumns();
  const activeColumnId = getActiveColumn(pathname);
  const prefersReducedMotion = usePrefersReducedMotion();

  // V3: Simplified - All entries are direct links (no dropdown menus)
  // Updated (gap-4.1.1): Expanded hot zones to ≥44px for Fitts' Law compliance
  const renderNavLink = (column: NavColumn) => {
    const isActive = activeColumnId === column.id;

    return (
      <Link key={column.id} href={column.href} style={{ textDecoration: 'none' }}>
        <Box
          sx={{
            minHeight: MIN_HOT_ZONE_SIZE,
            minWidth: MIN_HOT_ZONE_SIZE,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            position: 'relative',
            transition: prefersReducedMotion ? 'none' : 'all 0.3s',
            '&:hover': {
              '& .nav-text': {
                color: 'primary.main',
              },
            },
            // Active indicator underline
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: ACTIVE_INDICATOR_HEIGHT,
              backgroundColor: 'primary.main',
              borderRadius: '3px 3px 0 0',
              opacity: isActive ? 1 : 0,
              transition: prefersReducedMotion ? 'none' : 'opacity 0.3s',
            },
          }}
        >
          <Typography
            className="nav-text"
            variant="body1"
            fontWeight={600}
            sx={{
              color: isActive ? 'primary.main' : 'text.secondary',
              transition: prefersReducedMotion ? 'none' : 'color 0.3s',
              whiteSpace: 'nowrap',
            }}
          >
            {column.label}
          </Typography>
        </Box>
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

            {/* User Menu - Task 33 */}
            <UserMenu />
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

            {/* User Menu - Task 33 */}
            <UserMenu />
          </Stack>
        </Container>
      </Box>
    </>
  );
}
