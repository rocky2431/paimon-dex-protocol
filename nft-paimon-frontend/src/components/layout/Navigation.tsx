'use client';

import { Container, Typography, Box, Stack, Menu, MenuItem, Chip } from '@mui/material';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import * as Icons from '@mui/icons-material';

import { getNavigationColumns, getActiveColumn, type NavColumn, type NavItem } from '@/config/navigation';

/**
 * Navigation Component (V2 - Config-Driven)
 *
 * 6-column structure: Trade | Earn | Borrow | Governance | Launch | Analytics
 *
 * Features:
 * - Configuration-driven (src/config/navigation.ts)
 * - Feature flags auto-filtering
 * - Active state highlighting
 * - Hover dropdown menus
 * - Badge support (NEW, BETA, HOT)
 * - Nested submenus support
 */
export function Navigation() {
  const pathname = usePathname();
  const columns = getNavigationColumns();
  const activeColumnId = getActiveColumn(pathname);

  const [anchorEls, setAnchorEls] = useState<Record<string, HTMLElement | null>>({});

  const handleMenuOpen = (columnId: string, event: React.MouseEvent<HTMLElement>) => {
    setAnchorEls(prev => ({ ...prev, [columnId]: event.currentTarget }));
  };

  const handleMenuClose = (columnId: string) => {
    setAnchorEls(prev => ({ ...prev, [columnId]: null }));
  };

  // Helper function to get Material-UI icon component by name
  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent sx={{ mr: 1.5, color: 'primary.main', fontSize: 20 }} /> : null;
  };

  // Render a single navigation column
  const renderColumn = (column: NavColumn) => {
    const isActive = activeColumnId === column.id;
    const isMenuOpen = Boolean(anchorEls[column.id]);

    // If column has direct href (e.g., Analytics), render as simple link
    if (column.href) {
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
              '&:hover': {
                color: 'primary.main',
              },
            }}
          >
            {column.label}
          </Typography>
        </Link>
      );
    }

    // Column with dropdown menu
    return (
      <Box key={column.id}>
        <Box
          onClick={(e) => handleMenuOpen(column.id, e)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
          }}
        >
          <Typography
            variant="body1"
            fontWeight={600}
            sx={{
              color: isActive ? 'primary.main' : 'text.secondary',
              transition: 'color 0.3s',
              whiteSpace: 'nowrap',
              '&:hover': {
                color: 'primary.main',
              },
            }}
          >
            {column.label}
          </Typography>
          {column.items && (
            <ArrowDropDownIcon
              sx={{
                color: isActive ? 'primary.main' : 'text.secondary',
                transition: 'transform 0.3s',
                transform: isMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          )}
        </Box>

        {column.items && (
          <Menu
            anchorEl={anchorEls[column.id]}
            open={isMenuOpen}
            onClose={() => handleMenuClose(column.id)}
            disableScrollLock
            sx={{
              '& .MuiPaper-root': {
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                mt: 1,
                minWidth: 220,
              },
            }}
          >
            {column.items.map((item) => renderMenuItem(item, column.id))}
          </Menu>
        )}
      </Box>
    );
  };

  // Render a menu item (supports nested children)
  const renderMenuItem = (item: NavItem, parentColumnId: string) => {
    // If item has children, render as submenu header
    if (item.children && item.children.length > 0) {
      return (
        <Box key={item.id}>
          {/* Submenu header */}
          <MenuItem
            disabled
            sx={{
              py: 1,
              px: 2,
              opacity: 1,
              cursor: 'default',
              '&:hover': {
                backgroundColor: 'transparent',
              },
            }}
          >
            {getIcon(item.icon)}
            <Typography variant="body2" fontWeight={700} color="text.primary">
              {item.label}
            </Typography>
          </MenuItem>

          {/* Submenu items */}
          {item.children.map((child) => (
            <MenuItem
              key={child.id}
              component={Link}
              href={child.href!}
              onClick={() => handleMenuClose(parentColumnId)}
              sx={{
                py: 1.5,
                px: 2,
                pl: 5, // Indent child items
                '&:hover': {
                  backgroundColor: 'rgba(255, 152, 0, 0.08)',
                },
              }}
            >
              {getIcon(child.icon)}
              <Typography variant="body2" fontWeight={600}>
                {child.label}
              </Typography>
            </MenuItem>
          ))}
        </Box>
      );
    }

    // Regular menu item with optional badge
    return (
      <MenuItem
        key={item.id}
        component={Link}
        href={item.href!}
        onClick={() => handleMenuClose(parentColumnId)}
        sx={{
          py: 1.5,
          px: 2,
          '&:hover': {
            backgroundColor: 'rgba(255, 152, 0, 0.08)',
          },
        }}
      >
        {getIcon(item.icon)}
        <Typography variant="body2" fontWeight={600} sx={{ flexGrow: 1 }}>
          {item.label}
        </Typography>
        {item.badge && (
          <Chip
            label={item.badge}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.65rem',
              fontWeight: 700,
              ml: 1,
              bgcolor: item.badge === 'HOT' ? 'error.main' : 'info.main',
              color: 'white',
            }}
          />
        )}
      </MenuItem>
    );
  };

  return (
    <Box
      component="nav"
      sx={{
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

          {/* Navigation Columns (6-column structure) */}
          <Stack direction="row" spacing={3} alignItems="center" sx={{ flexGrow: 0 }}>
            {columns.map((column) => renderColumn(column))}
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
  );
}
